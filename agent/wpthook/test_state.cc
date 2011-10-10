/******************************************************************************
Copyright (c) 2010, Google Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without 
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, 
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of the <ORGANIZATION> nor the names of its contributors 
    may be used to endorse or promote products derived from this software 
    without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE 
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL 
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER 
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, 
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
******************************************************************************/

#include "StdAfx.h"
#include "test_state.h"
#include "results.h"
#include "screen_capture.h"
#include "shared_mem.h"
#include "../wptdriver/util.h"
#include "cximage/ximage.h"
#include <Mmsystem.h>
#include "wpt_test_hook.h"

static const DWORD ACTIVITY_TIMEOUT = 2000;
// TODO: Keep the test running till aft timeout.
static const DWORD AFT_TIMEOUT = 10 * 1000;
static const DWORD ON_LOAD_GRACE_PERIOD = 1000;
static const DWORD SCREEN_CAPTURE_INCREMENTS = 20;
static const DWORD DATA_COLLECTION_INTERVAL = 100;
static const DWORD START_RENDER_MARGIN = 30;
static const DWORD MS_IN_SEC = 1000;
static const DWORD SCRIPT_TIMEOUT_MULTIPLIER = 10;

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
TestState::TestState(Results& results, ScreenCapture& screen_capture, 
                      WptTestHook &test):
  _results(results)
  ,_screen_capture(screen_capture)
  ,_frame_window(NULL)
  ,_document_window(NULL)
  ,_render_check_thread(NULL)
  ,_exit(false)
  ,_data_timer(NULL)
  ,_test(test) {
  QueryPerformanceFrequency(&_ms_frequency);
  _ms_frequency.QuadPart = _ms_frequency.QuadPart / 1000;
  _check_render_event = CreateEvent(NULL, FALSE, FALSE, NULL);
  InitializeCriticalSection(&_data_cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
TestState::~TestState(void) {
  Done(true);
  DeleteCriticalSection(&_data_cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::Init() {
  Reset(false);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::Reset(bool cascade) {
  EnterCriticalSection(&_data_cs);
  if (cascade && _test._combine_steps) {
    LARGE_INTEGER now;
    QueryPerformanceCounter(&now);
    _last_activity.QuadPart = now.QuadPart;
    _on_load.QuadPart = 0;
    _step_start.QuadPart = 0;
  } else {
    _active = false;
    _capturing_aft = false;
    _next_document = 1;
    _current_document = 0;
    _doc_requests = 0;
    _requests = 0;
    _doc_bytes_in = 0;
    _bytes_in = 0;
    _doc_bytes_out = 0;
    _bytes_out = 0;
    _last_bytes_in = 0;
    _screen_updated = false;
    _last_data_ms = 0;
    _video_capture_count = 0;
    _start.QuadPart = 0;
    _step_start.QuadPart = 0;
    _first_navigate.QuadPart = 0;
    _on_load.QuadPart = 0;
    _dom_elements_time.QuadPart = 0;
    _render_start.QuadPart = 0;
    _first_activity.QuadPart = 0;
    _last_activity.QuadPart = 0;
    _first_byte.QuadPart = 0;
    _last_video_time.QuadPart = 0;
    _last_cpu_idle.QuadPart = 0;
    _last_cpu_kernel.QuadPart = 0;
    _last_cpu_user.QuadPart = 0;
    _progress_data.RemoveAll();
    _test_result = 0;
    _title_time.QuadPart = 0;
    _aft_time_ms = 0;
    _title.Empty();
    GetSystemTime(&_start_time);
  }
  LeaveCriticalSection(&_data_cs);

  if (cascade && !_test._combine_steps)
    _results.Reset();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
static unsigned __stdcall RenderCheckThread( void* arg ) {
  TestState * test_state = (TestState *)arg;
  if( test_state )
    test_state->RenderCheckThread();
    
  return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void __stdcall CollectData(PVOID lpParameter, BOOLEAN TimerOrWaitFired) {
  if( lpParameter )
    ((TestState *)lpParameter)->CollectData();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::Start() {
  WptTrace(loglevel::kFunction, _T("[wpthook] TestState::Start()\n"));
  Reset();
  QueryPerformanceCounter(&_step_start);
  GetSystemTime(&_start_time);
  if (!_start.QuadPart)
    _start.QuadPart = _step_start.QuadPart;
  _active = true;
  if( _test._aft )
    _capturing_aft = true;
  _current_document = _next_document;
  _next_document++;
  FindBrowserWindow(true);  // the document window may not be available yet

  // position the browser window
  if (_frame_window) {
    ::ShowWindow(_frame_window, SW_RESTORE);
    ::SetWindowPos(_frame_window, HWND_TOPMOST, 0, 0, 1024, 768, SWP_NOACTIVATE);
    ::UpdateWindow(_frame_window);
    FindViewport();
  }

  if (!_render_check_thread) {
    _exit = false;
    ResetEvent(_check_render_event);
    _render_check_thread = (HANDLE)_beginthreadex(0, 0, ::RenderCheckThread, 
                                                                   this, 0, 0);
  }

  if (!_data_timer) {
    timeBeginPeriod(1);
    CreateTimerQueueTimer(&_data_timer, NULL, ::CollectData, this, 
        DATA_COLLECTION_INTERVAL, DATA_COLLECTION_INTERVAL, WT_EXECUTEDEFAULT);
  }
  CollectData();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::ActivityDetected() {
  if (_active) {
    WptTrace(loglevel::kFunction, _T("[wpthook] TestState::ActivityDetected()\n"));
    QueryPerformanceCounter(&_last_activity);
    if (!_first_activity.QuadPart)
      _first_activity.QuadPart = _last_activity.QuadPart;
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::OnNavigate() {
  if (_active) {
    WptTrace(loglevel::kFunction, _T("[wpthook] TestState::OnNavigate()\n"));
    FindBrowserWindow(true);
    GrabVideoFrame(true);
    _on_load.QuadPart = 0;
    _dom_elements_time.QuadPart = 0;
    if (!_current_document) {
      _current_document = _next_document;
      _next_document++;
    }
    if (!_first_navigate.QuadPart)
      QueryPerformanceCounter(&_first_navigate);
  }
}

/*-----------------------------------------------------------------------------
  Notification from the extension that the page has finished loading.
  We need to do some sanity checking here to make sure the value reported 
  from the extension is sane
-----------------------------------------------------------------------------*/
void TestState::OnLoad(DWORD load_time) {
  if (_active) {
    WptTrace(loglevel::kFunction, 
              _T("[wpthook] TestState::OnLoad() - %dms\n"), load_time);
    QueryPerformanceCounter(&_on_load);
    DWORD elapsed_test = 0;
    if (_step_start.QuadPart && _on_load.QuadPart >= _step_start.QuadPart)
      elapsed_test = (DWORD)((_on_load.QuadPart - _step_start.QuadPart) 
                            / _ms_frequency.QuadPart);
    if (load_time && load_time <= elapsed_test) {
      WptTrace(loglevel::kFrequentEvent, 
              _T("[wpthook] - _on_load calculated based on load_time\n"));
      _on_load.QuadPart = _step_start.QuadPart + 
                          (_ms_frequency.QuadPart * load_time);
    } else {
      WptTrace(loglevel::kFrequentEvent,_T("[wpthook] - _on_load recorded\n"));
      FindBrowserWindow();
      _screen_capture.Capture(_document_window, 
                                    CapturedImage::DOCUMENT_COMPLETE);
    }
    _current_document = 0;
  }
}

/*-----------------------------------------------------------------------------
  Notification from the extension that all dom elements are loaded.
  We need to do some sanity checking here to make sure the value reported 
  from the extension is sane
-----------------------------------------------------------------------------*/
void TestState::OnAllDOMElementsLoaded(DWORD load_time) {
  if (_active) {
    QueryPerformanceCounter(&_dom_elements_time);
    DWORD elapsed_test = 0;
    if (_step_start.QuadPart && _dom_elements_time.QuadPart >= _step_start.QuadPart)
      elapsed_test = (DWORD)((_dom_elements_time.QuadPart - _step_start.QuadPart) 
                            / _ms_frequency.QuadPart);
    if (load_time && load_time <= elapsed_test) {
      _dom_elements_time.QuadPart = _step_start.QuadPart + 
                          (_ms_frequency.QuadPart * load_time);
      WptTrace(loglevel::kFrequentEvent, 
        _T("[wpthook] TestState::OnAllDOMElementsLoaded() from extension %dms\n"),
        _dom_elements_time);

    } else {
      WptTrace(loglevel::kFrequentEvent, 
        _T("[wpthook] TestState::OnAllDOMElementsLoaded() recorded in hook. %ldms\n"),
        _dom_elements_time);
    }
    _test._dom_element_check = false;
    WptTrace(loglevel::kFrequentEvent, 
      _T("[wpthook] - TestState::OnAllDOMElementsLoaded() Resetting dom element check state. "));
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool TestState::IsDone() {
  bool page_load_done = false;
  bool aft_timed_out = false;

  if (_active || _capturing_aft){
    LARGE_INTEGER now;
    QueryPerformanceCounter(&now);
    DWORD elapsed_test = 0;
    DWORD elapsed_doc = 0;
    DWORD elapsed_activity = 0;

    // calculate the varous elapsed times
    if (_step_start.QuadPart && now.QuadPart >= _step_start.QuadPart)
      elapsed_test = (DWORD)((now.QuadPart - _step_start.QuadPart) 
                            / _ms_frequency.QuadPart);

    if (_on_load.QuadPart && now.QuadPart >= _on_load.QuadPart)
      elapsed_doc = (DWORD)((now.QuadPart - _on_load.QuadPart) 
                              / _ms_frequency.QuadPart);

    if (_last_activity.QuadPart && now.QuadPart >= _last_activity.QuadPart)
      elapsed_activity = (DWORD)((now.QuadPart - _last_activity.QuadPart)
                                  / _ms_frequency.QuadPart);

    WptTrace(loglevel::kFunction, 
      _T("[wpthook] - TestState::IsDone() test: %d ms, ") 
      _T("doc: %d ms, activity: %d ms, measurement timeout:%d\n"),
      elapsed_test, elapsed_doc, elapsed_activity, _test._measurement_timeout);

    // Check for AFT timeout first.
    if (_capturing_aft && (int)elapsed_test > AFT_TIMEOUT) {
      aft_timed_out = true;
      WptTrace(loglevel::kFrequentEvent, 
        _T("[wpthook] - TestState::IsDone() -> true; AFT timed out."));
    } else if (_active) { 
      if ((int)elapsed_test > _test._measurement_timeout) {
        // the test timed out
        _test_result = TEST_RESULT_TIMEOUT;
        page_load_done = true;
        WptTrace(loglevel::kFrequentEvent, 
          _T("[wpthook] - TestState::IsDone() -> true; Test timed out."));
      } else if (!_current_document && !_test._dom_element_check && 
                  _test._doc_complete && elapsed_doc && 
                  elapsed_doc > ON_LOAD_GRACE_PERIOD){
        // end 1 second after onLoad regardless of activity
        page_load_done = true;
        WptTrace(loglevel::kFrequentEvent, 
          _T("[wpthook] - TestState::IsDone() -> true; 1 second after onLoad"));
      } else if (!_current_document && !_test._dom_element_check && 
                  !_test._doc_complete && 
                  elapsed_doc && elapsed_doc > ON_LOAD_GRACE_PERIOD &&
                  elapsed_activity && elapsed_activity > ACTIVITY_TIMEOUT){
        // the normal mode of waiting for 2 seconds of no network activity after
        // onLoad
        page_load_done = true;
        WptTrace(loglevel::kFrequentEvent, 
          _T("[wpthook] - TestState::IsDone() -> true; 2 seconds no activity"));
      }
    }

    // AFT timed-out, then mark the page as done.
    if (aft_timed_out) {
      Done();
    }
    else if (_active && page_load_done) {
      // Page load is done normally. If we are not capturing AFT, mark it as 
      // done. Else, just mark active as false to continue video capturing.
      if (!_capturing_aft)
        Done();
      else
        _active = false;
    }
  }
  return aft_timed_out || (!_capturing_aft && page_load_done);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::Done(bool force) {
  WptTrace(loglevel::kFunction, _T("[wpthook] - **** TestState::Done()\n"));
  if (_active || _capturing_aft) {
    _screen_capture.Capture(_document_window, CapturedImage::FULLY_LOADED);

    if (force || !_test._combine_steps) {
      // kill the timer that was collecting periodic data (cpu, video, etc)
      if (_data_timer) {
        DeleteTimerQueueTimer(NULL, _data_timer, NULL);
        _data_timer = NULL;
        timeEndPeriod(1);
      }

      // clean up the background thread that was doing the timer checks
      if (_render_check_thread) {
        _exit = true;
        SetEvent(_check_render_event);
        WaitForSingleObject(_render_check_thread, INFINITE);
        CloseHandle(_render_check_thread);
        _render_check_thread = NULL;
      }
    }

    _active = false;
    _capturing_aft = false;
  }
}

/*-----------------------------------------------------------------------------
    Find the browser window that we are going to capture
-----------------------------------------------------------------------------*/
void TestState::FindBrowserWindow(bool force) {
  bool update = force;
  if (!force) {
    if (!_frame_window || !_document_window)
      update = true;
    else if (!IsWindow(_frame_window) || !IsWindow(_document_window))
      update = true;
  }
  if (update) {
    DWORD browser_process_id = GetCurrentProcessId();
    if (::FindBrowserWindow(browser_process_id, _frame_window, 
                            _document_window)) {
      WptTrace(loglevel::kFunction, 
                _T("[wpthook] - Frame Window: %08X, Document Window: %08X\n"), 
                _frame_window, _document_window);
      if (!_document_window)
        _document_window = _frame_window;
    }
  }
}

/*-----------------------------------------------------------------------------
    Grab a video frame if it is appropriate
-----------------------------------------------------------------------------*/
void TestState::GrabVideoFrame(bool force) {
  if ((_active || _capturing_aft) && _document_window && _test._video) {
    if (force || (_screen_updated && _render_start.QuadPart)) {
      // use a falloff on the resolution with which we capture video
      bool grab_video = false;
      LARGE_INTEGER now;
      QueryPerformanceCounter(&now);
      if (!_last_video_time.QuadPart)
        grab_video = true;
      else {
        DWORD interval = DATA_COLLECTION_INTERVAL;
        if (_video_capture_count > SCREEN_CAPTURE_INCREMENTS * 2)
          interval *= 50;
        else if (_video_capture_count > SCREEN_CAPTURE_INCREMENTS)
          interval *= 10;
        LARGE_INTEGER min_time;
        min_time.QuadPart = _last_video_time.QuadPart + 
                              (interval * _ms_frequency.QuadPart);
        if (now.QuadPart >= min_time.QuadPart)
          grab_video = true;
      }
      if (grab_video) {
        _screen_updated = false;
        _last_video_time.QuadPart = now.QuadPart;
        _video_capture_count++;
        FindBrowserWindow();
        _screen_capture.Capture(_document_window, CapturedImage::VIDEO);
      }
    }
  }
}

/*-----------------------------------------------------------------------------
    See if anything has been rendered to the screen
-----------------------------------------------------------------------------*/
void TestState::CheckStartRender() {
  if (!_render_start.QuadPart && _screen_updated && _document_window)
    SetEvent(_check_render_event);
}

/*-----------------------------------------------------------------------------
    Background thread to check to see if rendering has started
    (this way we don't block the browser itself)
-----------------------------------------------------------------------------*/
void TestState::RenderCheckThread() {
  while (!_render_start.QuadPart && !_exit) {
    WaitForSingleObject(_check_render_event, INFINITE);
    if (!_exit) {
      _screen_capture.Lock();
      _screen_updated = false;
      LARGE_INTEGER now;
      QueryPerformanceCounter((LARGE_INTEGER *)&now);

      // grab a screen shot
      bool found = false;
      FindBrowserWindow();
      CapturedImage captured_img = _screen_capture.CaptureImage(
                                _document_window, CapturedImage::START_RENDER);
      CxImage img;
      if (captured_img.Get(img) && 
          img.GetWidth() > START_RENDER_MARGIN * 2 &&
          img.GetHeight() > START_RENDER_MARGIN * 2) {
        int bpp = img.GetBpp();
        if (bpp >= 15) {
          int height = img.GetHeight();
          int width = img.GetWidth();
          // 24-bit gets a fast-path where we can just compare full rows
          if (bpp <= 24 ) {
            DWORD row_bytes = img.GetEffWidth();
            DWORD compare_bytes = (bpp>>3) * (width-(START_RENDER_MARGIN * 2));
            char * background = (char *)malloc(compare_bytes);
            if (background) {
              char * image_bytes = (char *)img.GetBits(START_RENDER_MARGIN)
                                     + START_RENDER_MARGIN * (bpp >> 3);
              memcpy(background, image_bytes, compare_bytes);
              for (DWORD row = START_RENDER_MARGIN; 
                    row < height - START_RENDER_MARGIN && !found; row++) {
                if (memcmp(image_bytes, background, compare_bytes))
                  found = true;
                else
                  image_bytes += row_bytes;
              }
              free (background);
            }
          } else {
            for (DWORD row = START_RENDER_MARGIN; 
                    row < height - START_RENDER_MARGIN && !found; row++) {
              for (DWORD x = START_RENDER_MARGIN; 
                    x < width - START_RENDER_MARGIN && !found; x++) {
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

      _screen_capture.Unlock();
    }
  }
}

/*-----------------------------------------------------------------------------
    Collect the periodic system stats like cpu/memory/bandwidth.
-----------------------------------------------------------------------------*/
void TestState::CollectSystemStats(DWORD ms_from_start) {
  CProgressData data;
  data.ms = ms_from_start;
  DWORD msElapsed = 0;
  if( data.ms > _last_data_ms )
    msElapsed = data.ms - _last_data_ms;

  // figure out the bandwidth
  if (msElapsed) {
    double bits = (_bytes_in - _last_bytes_in) * 8;
    double sec = (double)msElapsed / (double)MS_IN_SEC;
    data.bpsIn = (DWORD)(bits / sec);
  }
  _last_bytes_in = _bytes_in;

  // calculate CPU utilization
  FILETIME idle_time, kernel_time, user_time;
  if (GetSystemTimes(&idle_time, &kernel_time, &user_time)) {
    ULARGE_INTEGER k, u, i;
    k.LowPart = kernel_time.dwLowDateTime;
    k.HighPart = kernel_time.dwHighDateTime;
    u.LowPart = user_time.dwLowDateTime;
    u.HighPart = user_time.dwHighDateTime;
    i.LowPart = idle_time.dwLowDateTime;
    i.HighPart = idle_time.dwHighDateTime;
    if(_last_cpu_idle.QuadPart && _last_cpu_kernel.QuadPart && 
      _last_cpu_user.QuadPart) {
      __int64 idle = i.QuadPart - _last_cpu_idle.QuadPart;
      __int64 kernel = k.QuadPart - _last_cpu_kernel.QuadPart;
      __int64 user = u.QuadPart - _last_cpu_user.QuadPart;
      int cpu_utilization = (int)((((kernel + user) - idle) * 100) 
                                    / (kernel + user));
      data.cpu = max(min(cpu_utilization, 100), 0);
    }
    _last_cpu_idle.QuadPart = i.QuadPart;
    _last_cpu_kernel.QuadPart = k.QuadPart;
    _last_cpu_user.QuadPart = u.QuadPart;
  }

  // get the memory use (working set - task-manager style)
  PROCESS_MEMORY_COUNTERS mem;
  mem.cb = sizeof(mem);
  if( GetProcessMemoryInfo(GetCurrentProcess(), &mem, sizeof(mem)) )
    data.mem = mem.WorkingSetSize / 1024;

  // interpolate across multiple time periods
  if( msElapsed > 100 )
  {
    DWORD chunks = msElapsed / 100;
    for( DWORD i = 1; i < chunks; i++ )
    {
      CProgressData d;
      d.ms = _last_data_ms + (i * 100);
      d.cpu = data.cpu;
      d.bpsIn = data.bpsIn;
      d.mem = data.mem;
      _progress_data.AddTail(d);
    }
  }
  _progress_data.AddTail(data);
}

/*-----------------------------------------------------------------------------
  Collect various performance data and screen capture.
    - See if anything has been rendered to the screen
    - Collect the CPU/memory/BW information
-----------------------------------------------------------------------------*/
void TestState::CollectData() {
  EnterCriticalSection(&_data_cs);
  if (_active) {
    LARGE_INTEGER now;
    QueryPerformanceCounter(&now);
    DWORD ms = 0;
    if (now.QuadPart > _start.QuadPart)
      ms = (DWORD)((now.QuadPart - _start.QuadPart) / _ms_frequency.QuadPart);
    // round it to the closest interval
    ms = ((DWORD)((ms + (DATA_COLLECTION_INTERVAL / 2)) / 
                  DATA_COLLECTION_INTERVAL)) * DATA_COLLECTION_INTERVAL;
    if (ms != _last_data_ms || !_last_data_ms) {
      GrabVideoFrame();
      CollectSystemStats(ms);
      _last_data_ms = ms;
    }
  }
  LeaveCriticalSection(&_data_cs);
}

/*-----------------------------------------------------------------------------
  Keep track of the page title and when it was first set (first title only)
-----------------------------------------------------------------------------*/
void TestState::TitleSet(CString title) {
  if (_active && !_title_time.QuadPart) {
    QueryPerformanceCounter(&_title_time);
    _title = title.Trim();
    // trim the browser off of the title ( - Chrome, etc)
    int pos = _title.ReverseFind(_T('-'));
    if (pos > 0)
      _title = _title.Left(pos).Trim();
    WptTrace(loglevel::kFunction, _T("[wpthook] TestState::TitleSet(%s)\n"),
              _title);
  }
}

/*-----------------------------------------------------------------------------
  Find the portion of the document window that represents the document
-----------------------------------------------------------------------------*/
void TestState::FindViewport() {
  if (_document_window == _frame_window && !_screen_capture.IsViewportSet()) {
    CapturedImage captured = _screen_capture.CaptureImage(_document_window);
    CxImage image;
    if (captured.Get(image)) {
      // start in the middle of the image and go in each direction 
      // until we get a pixel of a different color
      DWORD width = image.GetWidth();
      DWORD height = image.GetHeight();
      if (width > 100 && height > 100) {
        DWORD x = width / 2;
        DWORD y = height / 2;
        RECT viewport = {0,0,0,0}; 
        viewport.right = width - 1;
        DWORD row_bytes = image.GetEffWidth();
        unsigned char * middle = image.GetBits(y);
        if (middle) {
          middle += row_bytes / 2;
          unsigned char background[3];
          memcpy(background, middle, 3);
          // find the top
          unsigned char * pixel = middle;
          while (y < height - 1 && !viewport.top) {
            if (memcmp(background, pixel, 3))
              viewport.top = height - y;
            pixel += row_bytes;
            y++;
          }
          // find the top
          y = height / 2;
          pixel = middle;
          while (y && !viewport.bottom) {
            if (memcmp(background, pixel, 3))
              viewport.bottom = height - y;
            pixel -= row_bytes;
            y--;
          }
          if (!viewport.bottom)
            viewport.bottom = height - 1;
        }
        if (viewport.right - viewport.left > (long)width / 2 &&
          viewport.bottom - viewport.top > (long)height / 2) {
          _screen_capture.SetViewport(viewport);
        }
      }
    }
    captured.Free();
  }
}