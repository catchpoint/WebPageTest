#include "StdAfx.h"
#include "test_state.h"
#include "results.h"
#include "screen_capture.h"
#include "shared_mem.h"
#include "../wptdriver/util.h"
#include "cximage/ximage.h"

const DWORD ACTIVITY_TIMEOUT = 2000;
const DWORD ON_LOAD_GRACE_PERIOD = 1000;

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
TestState::TestState(int test_timeout, bool end_on_load, Results& results,
                      ScreenCapture& screen_capture):
  _test_timeout(test_timeout)
  ,_active(false)
  ,_timeout(false)
  ,_next_document(1)
  ,_current_document(0)
  ,_doc_requests(0)
  ,_requests(0)
  ,_doc_bytes_in(0)
  ,_bytes_in(0)
  ,_doc_bytes_out(0)
  ,_bytes_out(0)
  ,_end_on_load(end_on_load)
  ,_results(results)
  ,_screen_capture(screen_capture)
  ,_frame_window(NULL)
  ,_document_window(NULL)
  ,_screen_updated(false) {
  _start.QuadPart = 0;
  _on_load.QuadPart = 0;
  _render_start.QuadPart = 0;
  _first_activity.QuadPart = 0;
  _last_activity.QuadPart = 0;
  _first_byte.QuadPart = 0;
  QueryPerformanceFrequency(&_ms_frequency);
  _ms_frequency.QuadPart = _ms_frequency.QuadPart / 1000;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
TestState::~TestState(void){
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::Start(){
  ATLTRACE2(_T("[wpthook] TestState::Start()\n"));
  QueryPerformanceCounter(&_start);
  _results.Reset();
  _timeout = false;
  _active = true;
  _screen_updated = false;
  _current_document = _next_document;
  _next_document++;
  FindBrowserWindow();  // the document window may not be available yet
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::ActivityDetected(){
  if (_active) {
    QueryPerformanceCounter(&_last_activity);
    if (!_first_activity.QuadPart)
      _first_activity.QuadPart = _last_activity.QuadPart;
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::OnNavigate(){
  if (_active) {
    ATLTRACE2(_T("[wpthook] TestState::OnNavigate()\n"));
    FindBrowserWindow();
    GrabVideoFrame(true);
    _on_load.QuadPart = 0;
    if (!_current_document) {
      _current_document = _next_document;
      _next_document++;
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::OnLoad(){
  if (_active) {
    ATLTRACE2(_T("[wpthook] TestState::OnLoad()\n"));
    QueryPerformanceCounter(&_on_load);
    _current_document = 0;
    _screen_capture.Capture(_document_window, 
                                  CapturedImage::DOCUMENT_COMPLETE);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool TestState::IsDone(){
  bool done = false;

  if (_active){
    LARGE_INTEGER now;
    QueryPerformanceCounter(&now);
    __int64 elapsed_test = 0;
    __int64 elapsed_doc = 0;
    __int64 elapsed_activity = 0;

    // calculate the varous elapsed times
    if (_start.QuadPart && now.QuadPart >= _start.QuadPart)
      elapsed_test = (now.QuadPart - _start.QuadPart) / _ms_frequency.QuadPart;

    if (_on_load.QuadPart && now.QuadPart >= _on_load.QuadPart)
      elapsed_doc = (now.QuadPart - _on_load.QuadPart) 
                    / _ms_frequency.QuadPart;

    if (_last_activity.QuadPart && now.QuadPart >= _last_activity.QuadPart)
      elapsed_activity = (now.QuadPart - _last_activity.QuadPart)
                         / _ms_frequency.QuadPart;

    if (elapsed_test > _test_timeout){
      // the test timed out
      _timeout = true;
      done = true;
    } else if (!_current_document && _end_on_load &&
                elapsed_doc && elapsed_doc > ON_LOAD_GRACE_PERIOD){
      // end 1 second after onLoad regardless of activity
      done = true;
    } else if (!_current_document && !_end_on_load &&
                elapsed_doc && elapsed_doc > ON_LOAD_GRACE_PERIOD &&
                elapsed_activity && elapsed_activity > ACTIVITY_TIMEOUT){
      // the normal mode of waiting for 2 seconds of no network activity after
      // onLoad
      done = true;
    }

    if (done)
      _screen_capture.Capture(_document_window, CapturedImage::FULLY_LOADED);
  }

  return done;
}

/*-----------------------------------------------------------------------------
    Find the browser window that we are going to capture
-----------------------------------------------------------------------------*/
void TestState::FindBrowserWindow(void) {
  DWORD browser_process_id = GetCurrentProcessId();
  if (::FindBrowserWindow(browser_process_id, _frame_window, 
                          _document_window)) {
    ATLTRACE(_T("[wpthook] - Frame Window: %08X, Document Window: %08X\n"), 
                    _frame_window, _document_window);
    if (!_document_window)
      _document_window = _frame_window;
  }
}

/*-----------------------------------------------------------------------------
    Grab a video frame if it is appropriate
-----------------------------------------------------------------------------*/
void TestState::GrabVideoFrame(bool force) {
  if (_active && _document_window && shared_capture_video) {
    if (force || (_screen_updated && _render_start.QuadPart))
      _screen_updated = false;
      _screen_capture.Capture(_document_window, CapturedImage::VIDEO);
  }
}

/*-----------------------------------------------------------------------------
    See if anything has been rendered to the screen
-----------------------------------------------------------------------------*/
void TestState::CheckStartRender() {
  if (!_render_start.QuadPart && _screen_updated && _document_window) {
    ATLTRACE(_T("[wpthook] TestState::CheckStartRender\n"));
    _screen_updated = false;
    LARGE_INTEGER now;
    QueryPerformanceCounter((LARGE_INTEGER *)&now);

    // grab a screen shot
    bool found = false;
    CapturedImage captured_img(_document_window, CapturedImage::START_RENDER);
    CxImage img;
    if (captured_img.Get(img)) {
      int bpp = img.GetBpp();
      if (bpp >= 15) {
        int height = img.GetHeight();
        int width = img.GetWidth();
        // 24-bit gets a fast-path where we can just compare full rows
        if (bpp <= 24 ) {
          DWORD row_bytes = 3 * width;
          char * white = (char *)malloc(row_bytes);
          if (white) {
            memset(white, 0xFFFFFFFF, row_bytes);
            for (int row = 0; row < height && !found; row++) {
              char * image_bytes = (char *)img.GetBits(row);
              if (memcmp(image_bytes, white, row_bytes))
                found = true;
            }
            free (white);
          }
        } else {
          for (int row = 0; row < height && !found; row++) {
            for (int x = 0; x < width && !found; x++) {
              RGBQUAD pixel = img.GetPixelColor(x, row, false);
              if (pixel.rgbBlue != 255 || pixel.rgbRed != 255 || 
                  pixel.rgbGreen != 255)
                found = true;
            }
          }
        }
      }
    }

    if (found) {
      _render_start.QuadPart = now.QuadPart;
      _screen_capture._captured_images.AddTail(captured_img);
    }
    else
      captured_img.Free();

    LARGE_INTEGER end;
    QueryPerformanceCounter((LARGE_INTEGER *)&end);
    DWORD elapsed = (DWORD)((end.QuadPart - now.QuadPart) / _ms_frequency.QuadPart);

    ATLTRACE(_T("[wpthook] TestState::CheckStartRender - %d ms\n"), elapsed);
  }
}