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
#include <WtsApi32.h>
#include "wpt_test_hook.h"
#include "trace.h"

static const DWORD ON_LOAD_GRACE_PERIOD = 100;
static const DWORD SCREEN_CAPTURE_INCREMENTS = 200;
static const DWORD DATA_COLLECTION_INTERVAL = 100;
static const DWORD MS_IN_SEC = 1000;
static const DWORD SCRIPT_TIMEOUT_MULTIPLIER = 10;
static const DWORD RESPONSIVE_BROWSER_WIDTH = 480;

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
TestState::TestState(Results& results, ScreenCapture& screen_capture, 
                      WptTestHook &test, Trace& trace):
  _results(results)
  ,_screen_capture(screen_capture)
  ,_frame_window(NULL)
  ,_exit(false)
  ,_data_timer(NULL)
  ,_test(test)
  ,_trace(trace)
  ,no_gdi_(false)
  ,gdi_only_(false)
  ,navigated_(false)
  ,_started(false)
  ,received_data_(false) {
  QueryPerformanceCounter(&_launch);
  QueryPerformanceFrequency(&_ms_frequency);
  _ms_frequency.QuadPart = _ms_frequency.QuadPart / 1000;
  InitializeCriticalSection(&_data_cs);
  FindBrowserNameAndVersion();
  paint_msg_ = RegisterWindowMessage(_T("WPT Browser Paint"));
  _timeout_start_time.QuadPart = 0;
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
  _step_start.QuadPart = 0;
  _dom_interactive = 0;
  _dom_content_loaded_event_start = 0;
  _dom_content_loaded_event_end = 0;
  _load_event_start = 0;
  _load_event_end = 0;
  _first_paint = 0;
  _on_load.QuadPart = 0;
  _fixed_viewport = -1;
  _dom_element_count = 0;
  _is_responsive = -1;
  _viewport_specified = -1;
  if (cascade && _test._combine_steps) {
    LARGE_INTEGER now;
    QueryPerformanceCounter(&now);
    _last_activity.QuadPart = now.QuadPart;
  } else {
    _active = false;
    _next_document = 1;
    _current_document = 0;
    _doc_requests = 0;
    _requests = 0;
    _doc_bytes_in = 0;
    _bytes_in = 0;
    _bytes_in_bandwidth = 0;
    _doc_bytes_out = 0;
    _bytes_out = 0;
    _last_bytes_in = 0;
    _last_data.QuadPart = 0;
    _video_capture_count = 0;
    _start.QuadPart = 0;
    _on_load.QuadPart = 0;
    _dom_interactive = 0;
    _dom_content_loaded_event_start = 0;
    _dom_content_loaded_event_end = 0;
    _load_event_start = 0;
    _load_event_end = 0;
    _first_paint = 0;
    _first_navigate.QuadPart = 0;
    _dom_elements_time.QuadPart = 0;
    _render_start.QuadPart = 0;
    _first_activity.QuadPart = 0;
    _last_activity.QuadPart = 0;
    _first_byte.QuadPart = 0;
    _last_video_time.QuadPart = 0;
    _last_cpu_idle.QuadPart = 0;
    _last_cpu_kernel.QuadPart = 0;
    _last_cpu_user.QuadPart = 0;
    _start_cpu_time.dwHighDateTime = _start_cpu_time.dwLowDateTime = 0;
    _doc_cpu_time.dwHighDateTime = _doc_cpu_time.dwLowDateTime = 0;
    _end_cpu_time.dwHighDateTime = _end_cpu_time.dwLowDateTime = 0;
    _start_total_time.dwHighDateTime = _start_total_time.dwLowDateTime = 0;
    _end_total_time.dwHighDateTime = _end_total_time.dwLowDateTime = 0;
    _working_set_main_proc = 0;
    _working_set_child_procs = 0;
    _process_count = 0;
    _progress_data.RemoveAll();
    _test_result = 0;
    _title_time.QuadPart = 0;
    _title.Empty();
    _user_agent = _T("WebPagetest");
    _console_log_messages.RemoveAll();
    _timed_events.RemoveAll();
    _custom_metrics.Empty();
    _user_timing.Empty();
    navigating_ = false;
    _first_request_sent = false;
    GetSystemTime(&_start_time);
  }
  LeaveCriticalSection(&_data_cs);

  if (cascade && !_test._combine_steps)
    _results.Reset();
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

  //This is only called once, on the first navigate
  if (!_timeout_start_time.QuadPart)
    _timeout_start_time.QuadPart = _step_start.QuadPart;

  GetCPUTime(_start_cpu_time, _start_total_time);
  _active = true;
  UpdateBrowserWindow();  // the document window may not be available yet
  if (!_started) {
    FindViewport(true);
    _started = true;
  }

  if (!_data_timer) {
    // for repeat view start capturing video immediately
    if (!shared_cleared_cache)
      received_data_ = true;
      
    timeBeginPeriod(1);
    CreateTimerQueueTimer(&_data_timer, NULL, ::CollectData, this, 
        DATA_COLLECTION_INTERVAL, DATA_COLLECTION_INTERVAL, WT_EXECUTEDEFAULT);
  }
  GrabVideoFrame(true);
  CollectData();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::ActivityDetected() {
  if (_active) {
    WptTrace(loglevel::kFunction,
             _T("[wpthook] TestState::ActivityDetected()\n"));
    QueryPerformanceCounter(&_last_activity);
    if (!_first_activity.QuadPart)
      _first_activity.QuadPart = _last_activity.QuadPart;
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::OnNavigate() {
  if (_active) {
    WptTrace(loglevel::kFunction,
             _T("[wpthook] TestState::OnNavigate()\n"));
    UpdateBrowserWindow();
    _dom_interactive = 0;
    _dom_content_loaded_event_start = 0;
    _dom_content_loaded_event_end = 0;
    _load_event_start = 0;
    _load_event_end = 0;
    _first_paint = 0;
    _dom_elements_time.QuadPart = 0;
    _on_load.QuadPart = 0;
    navigating_ = true;
    if (!_current_document) {
      _current_document = _next_document;
      _next_document++;
    }
    if (!_first_navigate.QuadPart)
      QueryPerformanceCounter(&_first_navigate);
    ActivityDetected();
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::SendingRequest() {
  EnterCriticalSection(&_data_cs);
  if (_active && navigating_ && !_first_request_sent) {
    _first_request_sent = true;
    // fix up the navigation start time to match when the first event was sent
    QueryPerformanceCounter(&_first_navigate);
  }
  LeaveCriticalSection(&_data_cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::OnNavigateComplete() {
  // force an onload if one didn't already fire
  if (navigating_)
    OnLoad();
}

/*-----------------------------------------------------------------------------
  We do some sanity checking here to make sure the value reported 
  from the extension is sane.
-----------------------------------------------------------------------------*/
void TestState::RecordTime(CString name, DWORD time, LARGE_INTEGER *out_time) {
  QueryPerformanceCounter(out_time);
  DWORD elapsed_time = 0;
  if (_step_start.QuadPart && out_time->QuadPart >= _step_start.QuadPart) {
    elapsed_time = (DWORD)((out_time->QuadPart - _step_start.QuadPart) /
                           _ms_frequency.QuadPart);
  }
  if (time > 0 && time <= elapsed_time) {
    WptTrace(loglevel::kFrequentEvent, 
             _T("[wpthook] - Record %s from extension: %dms\n"), name, time);
    out_time->QuadPart = _step_start.QuadPart;
    out_time->QuadPart += _ms_frequency.QuadPart * time;
  } else {
    WptTrace(loglevel::kFrequentEvent,
             _T("[wpthook] - Record %s from hook: %dms (instead of %dms)\n"),
             name, elapsed_time, time);
  }
}

/*-----------------------------------------------------------------------------
  Save web timings for DOMInteractive event.
-----------------------------------------------------------------------------*/
void TestState::SetDomInteractiveEvent(DWORD domInteractive) {
  _dom_interactive = domInteractive;
}

/*-----------------------------------------------------------------------------
  Save web timings for DOMContentLoaded event.
-----------------------------------------------------------------------------*/
void TestState::SetDomContentLoadedEvent(DWORD start, DWORD end) {
  _dom_content_loaded_event_start = start;
  _dom_content_loaded_event_end = end;
}

/*-----------------------------------------------------------------------------
  Save web timings for load event.
-----------------------------------------------------------------------------*/
void TestState::SetLoadEvent(DWORD start, DWORD end) {
  _load_event_start = start;
  _load_event_end = end;
}

/*-----------------------------------------------------------------------------
  Save web timings for msFirstPaint.
-----------------------------------------------------------------------------*/
void TestState::SetFirstPaint(DWORD first_paint) {
  _first_paint = first_paint;
}

/*-----------------------------------------------------------------------------
  Notification from the extension that the page has finished loading.
-----------------------------------------------------------------------------*/
void TestState::OnLoad() {
  if (_active) {
    navigated_ = true;
    navigating_ = false;
    QueryPerformanceCounter(&_on_load);
    GetCPUTime(_doc_cpu_time, _doc_total_time);
    ActivityDetected();
    _screen_capture.Capture(_frame_window,
                            CapturedImage::DOCUMENT_COMPLETE);
    _current_document = 0;
  }
}

/*-----------------------------------------------------------------------------
  Notification from the extension that all dom elements are loaded.
-----------------------------------------------------------------------------*/
void TestState::OnAllDOMElementsLoaded(DWORD load_time) {
  if (_active) {
    QueryPerformanceCounter(&_dom_elements_time);
    RecordTime(_T("_dom_elements_time"), load_time, &_dom_elements_time);
    _test._dom_element_check = false;
    WptTrace(loglevel::kFrequentEvent, 
      _T("[wpthook] - TestState::OnAllDOMElementsLoaded() Resetting dom element check state. "));
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool TestState::IsDone() {
  bool is_done = false;
  LARGE_INTEGER now;
  QueryPerformanceCounter(&now);
  DWORD test_ms = ElapsedMs(_step_start, now);
  if (_active) {
    bool is_page_done = false;
    CString done_reason;
    DWORD elapsed_timeout_ms = ElapsedMs(_timeout_start_time, now);
    if (elapsed_timeout_ms > _test._test_timeout) {
      _test_result = TEST_RESULT_TIMEOUT;
      is_page_done = true;
      done_reason = _T("Test timed out.");
      _test._has_test_timed_out = true;
    } else if (test_ms >= _test._minimum_duration) {
      DWORD load_ms = ElapsedMs(_on_load, now);
      DWORD inactive_ms = ElapsedMs(_last_activity, now);
      DWORD navigated = navigated_ ? 1:0;
      DWORD navigating = navigating_ ? 1:0;
      WptTrace(loglevel::kFunction,
               _T("[wpthook] - TestState::IsDone() ")
               _T("Test: %dms, load: %dms, inactive: %dms, test timeout:%d,")
               _T(" navigating:%d, navigated: %d\n"),
               test_ms, load_ms, inactive_ms, _test._measurement_timeout,
               navigating, navigated);
      bool is_loaded = (navigated_ &&
                        !navigating_ &&
                        //load_ms > ON_LOAD_GRACE_PERIOD && 
                        !_test._dom_element_check);
      if (_test_result) {
        is_page_done = true;
        done_reason = _T("Page Error");
      } else if (is_loaded && _test._doc_complete) {
        is_page_done = true;
        done_reason = _T("Stop at document complete (i.e. onload).");
      } else if (is_loaded && inactive_ms > _test._activity_timeout) {
        // This is the default done criteria: onload is done and at least
        // 2 more seconds have elapsed since the last network activity.
        is_page_done = true;
        done_reason = _T("No network activity detected.");
      } else if (test_ms > _test._measurement_timeout) {
        _test_result = TEST_RESULT_TIMEOUT;
        is_page_done = true;
        done_reason = _T("Meaurement timed out.");
      }
    }
    if (is_page_done) {
      WptTrace(loglevel::kFrequentEvent,
                _T("[wpthook] - TestState::IsDone() -> true; %s"),
                done_reason);
      Done();
      is_done = true;
    }
  }
  return is_done;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::Done(bool force) {
  WptTrace(loglevel::kFunction, _T("[wpthook] - **** TestState::Done()\n"));
  if (_active) {
    GetCPUTime(_end_cpu_time, _end_total_time);
    _screen_capture.Capture(_frame_window, CapturedImage::FULLY_LOADED);
    CollectMemoryStats();
    if (force || !_test._combine_steps) {
      // kill the timer that was collecting periodic data (cpu, video, etc)
      if (_data_timer) {
        DeleteTimerQueueTimer(NULL, _data_timer, NULL);
        _data_timer = NULL;
        timeEndPeriod(1);
      }
    }

    _active = false;
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL CALLBACK MakeTopmost(HWND hwnd, LPARAM lParam) {
  TCHAR class_name[1024];
  if (IsWindowVisible(hwnd) && 
    GetClassName(hwnd, class_name, _countof(class_name))) {
    _tcslwr(class_name);
    if (_tcsstr(class_name, _T("chrome")) || 
        _tcsstr(class_name, _T("mozilla"))) {
      ::SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, 
          SWP_NOACTIVATE | SWP_NOSIZE | SWP_NOMOVE);
      ::UpdateWindow(hwnd);
    }
  }
  return TRUE;
}

/*-----------------------------------------------------------------------------
    Find the browser window that we are going to capture
-----------------------------------------------------------------------------*/
void TestState::UpdateBrowserWindow() {
  if (!_started) {
    DWORD browser_process_id = GetCurrentProcessId();
    if (no_gdi_)
      browser_process_id = GetParentProcessId(browser_process_id);
    HWND old_frame = _frame_window;
    if (::FindBrowserWindow(browser_process_id, _frame_window)) {
      WptTrace(loglevel::kFunction, 
                _T("[wpthook] - Frame Window: %08X\n"), _frame_window);
    }
    // position the browser window
    if (_frame_window && old_frame != _frame_window) {
      DWORD browser_width = _test._browser_width;
      DWORD browser_height = _test._browser_height;
      ::ShowWindow(_frame_window, SW_RESTORE);
      if (_test._viewport_width && _test._viewport_height) {
        ::UpdateWindow(_frame_window);
        FindViewport();
        RECT browser;
        GetWindowRect(_frame_window, &browser);
        RECT viewport = {0,0,0,0};
        if (_screen_capture.IsViewportSet())
          memcpy(&viewport, &_screen_capture._viewport, sizeof(RECT));
        int vp_width = abs(viewport.right - viewport.left);
        int vp_height = abs(viewport.top - viewport.bottom);
        int br_width = abs(browser.right - browser.left);
        int br_height = abs(browser.top - browser.bottom);
        if (vp_width && vp_height && br_width && br_height && 
          br_width >= vp_width && br_height >= vp_height) {
          browser_width = _test._viewport_width + (br_width - vp_width);
          browser_height = _test._viewport_height + (br_height - vp_height);
        }
        _screen_capture.ClearViewport();
      }
      ::SetWindowPos(_frame_window, HWND_TOPMOST, 0, 0, 
                      browser_width, browser_height, SWP_NOACTIVATE);
      ::UpdateWindow(_frame_window);
      EnumWindows(::MakeTopmost, (LPARAM)this);
      FindViewport();
    }
  }
}

/*-----------------------------------------------------------------------------
    Grab a video frame if it is appropriate
-----------------------------------------------------------------------------*/
void TestState::GrabVideoFrame(bool force) {
  if (_active && _frame_window && (force || received_data_)) {
    // use a falloff on the resolution with which we capture video
    bool grab_video = false;
    LARGE_INTEGER now;
    QueryPerformanceCounter(&now);
    if (!_last_video_time.QuadPart || _test._continuous_video) {
      grab_video = true;
    } else {
      DWORD interval = DATA_COLLECTION_INTERVAL;
      if (_video_capture_count > SCREEN_CAPTURE_INCREMENTS * 2)
        interval *= 20;
      else if (_video_capture_count > SCREEN_CAPTURE_INCREMENTS)
        interval *= 5;
      LARGE_INTEGER min_time;
      min_time.QuadPart = _last_video_time.QuadPart + 
                            (interval * _ms_frequency.QuadPart);
      if (now.QuadPart >= min_time.QuadPart)
        grab_video = true;
    }
    if (grab_video) {
      _last_video_time.QuadPart = now.QuadPart;
      _video_capture_count++;
      _screen_capture.Capture(_frame_window, CapturedImage::VIDEO);
    }
  }
}

/*-----------------------------------------------------------------------------
    Collect the periodic system stats like cpu/memory/bandwidth.
-----------------------------------------------------------------------------*/
void TestState::CollectSystemStats(LARGE_INTEGER &now) {
  ProgressData data;
  data._time.QuadPart = now.QuadPart;
  DWORD msElapsed = 0;
  if (_last_data.QuadPart) {
    msElapsed = (DWORD)((now.QuadPart - _last_data.QuadPart) / 
                            _ms_frequency.QuadPart);
  }

  // figure out the bandwidth
  if (msElapsed) {
    double bits = (_bytes_in_bandwidth - _last_bytes_in) * 8;
    double sec = (double)msElapsed / (double)MS_IN_SEC;
    data._bpsIn = (DWORD)(bits / sec);
  }
  _last_bytes_in = _bytes_in_bandwidth;

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
    if(_last_cpu_idle.QuadPart || _last_cpu_kernel.QuadPart || 
      _last_cpu_user.QuadPart) {
      __int64 idle = i.QuadPart - _last_cpu_idle.QuadPart;
      __int64 kernel = k.QuadPart - _last_cpu_kernel.QuadPart;
      __int64 user = u.QuadPart - _last_cpu_user.QuadPart;
      if (kernel || user) {
        int cpu_utilization = (int)((((kernel + user) - idle) * 100) 
                                      / (kernel + user));
        data._cpu = max(min(cpu_utilization, 100), 0);
      }
    }
    _last_cpu_idle.QuadPart = i.QuadPart;
    _last_cpu_kernel.QuadPart = k.QuadPart;
    _last_cpu_user.QuadPart = u.QuadPart;
  }

  if (msElapsed)
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
    if (now.QuadPart > _last_data.QuadPart || !_last_data.QuadPart) {
      CheckTitle();
      GrabVideoFrame();
      CollectSystemStats(now);
      _last_data.QuadPart = now.QuadPart;
    }
  }
  LeaveCriticalSection(&_data_cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::CheckTitle() {
  if (_active && _frame_window && received_data_) {
    TCHAR title[4096];
    if (GetWindowText(_frame_window, title, _countof(title))) {
      if (last_title_.Compare(title)) {
        last_title_ = title;
        if (last_title_.Left(5).Compare(_T("Blank")))
          TitleSet(title);
      }
    }
  }
}

/*-----------------------------------------------------------------------------
  Keep track of the page title and when it was first set (first title only)
-----------------------------------------------------------------------------*/
void TestState::TitleSet(CString title) {
  if (_active) {
    CString new_title = title.Trim();
    // trim the browser off of the title ( - Chrome, etc)
    int pos = new_title.ReverseFind(_T('-'));
    if (pos > 0)
      new_title = new_title.Left(pos).Trim();
    if (!_title_time.QuadPart || new_title.Compare(_title)) {
      QueryPerformanceCounter(&_title_time);
      _title = new_title;
      WptTrace(loglevel::kFunction, _T("[wpthook] TestState::TitleSet(%s)\n"),
                _title);
    }
  }
}

/*-----------------------------------------------------------------------------
  Find the portion of the document window that represents the document
-----------------------------------------------------------------------------*/
void TestState::FindViewport(bool force) {
  if (_frame_window && (force || !_screen_capture.IsViewportSet())) {
    _screen_capture.ClearViewport();
    CapturedImage captured = _screen_capture.CaptureImage(_frame_window);
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
        DWORD row_bytes = image.GetEffWidth();
        DWORD pixel_bytes = row_bytes / width;
        unsigned char * middle = image.GetBits(y);
        if (middle) {
          middle += x * pixel_bytes;
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
          // find the bottom
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
          // find the left
          pixel = middle;
          while (x && !viewport.left) {
            if (memcmp(background, pixel, 3))
              viewport.left = x + 1;
            pixel -= pixel_bytes;
            x--;
          }
          // find the right
          x = width / 2;
          pixel = middle;
          while (x < width && !viewport.right) {
            if (memcmp(background, pixel, 3))
              viewport.right = x - 1;
            pixel += pixel_bytes;
            x++;
          }
          if (!viewport.right)
            viewport.right = width - 1;
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

/*-----------------------------------------------------------------------------
  Browser status message
-----------------------------------------------------------------------------*/
void TestState::OnStatusMessage(CString status) {
  StatusMessage stat(status);
  EnterCriticalSection(&_data_cs);
  _status_messages.AddTail(stat);
  LeaveCriticalSection(&_data_cs);
}

/*-----------------------------------------------------------------------------
  Convert |time| to the number of milliseconds since the start.
-----------------------------------------------------------------------------*/
DWORD TestState::ElapsedMsFromStart(LARGE_INTEGER end) const {
  return ElapsedMs(_start, end);
}

DWORD TestState::ElapsedMsFromLaunch(LARGE_INTEGER end) const {
  return ElapsedMs(_launch, end);
}

DWORD TestState::ElapsedMs(LARGE_INTEGER start, LARGE_INTEGER end) const {
  DWORD elapsed_ms = 0;
  if (start.QuadPart && end.QuadPart > start.QuadPart) {
    elapsed_ms = static_cast<DWORD>(
        (end.QuadPart - start.QuadPart) / _ms_frequency.QuadPart);
  }
  return elapsed_ms;
}

/*-----------------------------------------------------------------------------
  Find the browser name and version.
-----------------------------------------------------------------------------*/
void TestState::FindBrowserNameAndVersion() {
  TCHAR file_name[MAX_PATH];
  if (GetModuleFileName(NULL, file_name, _countof(file_name))) {
    CString exe(file_name);
    exe.MakeLower();
    if (exe.Find(_T("webkit2webprocess.exe")) >= 0) {
      no_gdi_ = true;
      _browser_name = _T("Safari");
    } else if (exe.Find(_T("safari.exe")) >= 0) {
      gdi_only_ = true;
    }
    DWORD unused;
    DWORD info_size = GetFileVersionInfoSize(file_name, &unused);
    if (info_size) {
      LPBYTE version_info = new BYTE[info_size];
      if (GetFileVersionInfo(file_name, 0, info_size, version_info)) {
        VS_FIXEDFILEINFO *file_info = NULL;
        UINT size = 0;
        if (VerQueryValue(version_info, _T("\\"), (LPVOID*)&file_info, &size) &&
            file_info) {
          _browser_version.Format(_T("%d.%d.%d.%d"),
                                  HIWORD(file_info->dwFileVersionMS),
                                  LOWORD(file_info->dwFileVersionMS),
                                  HIWORD(file_info->dwFileVersionLS),
                                  LOWORD(file_info->dwFileVersionLS));
        }

        // Structure used to store enumerated languages and code pages.
        struct LANGANDCODEPAGE {
          WORD language;
          WORD code_page;
        } *translate;
        // Read the list of languages and code pages.
        if (_browser_name.IsEmpty() &&
            VerQueryValue(version_info, TEXT("\\VarFileInfo\\Translation"),
                          (LPVOID*)&translate, &size)) {
          // Use the first language/code page.
          CString key;
          key.Format(_T("\\StringFileInfo\\%04x%04x\\FileDescription"),
                     translate[0].language, translate[0].code_page);
          LPTSTR file_desc = NULL;
          if (VerQueryValue(version_info, key, (LPVOID*)&file_desc, &size)) {
            _browser_name = file_desc;
          }
        }
      }
      delete[] version_info;
    }
    if (_browser_name.IsEmpty()) {
      PathRemoveExtension(file_name);
      PathStripPath(file_name);
      _browser_name = file_name;
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::AddConsoleLogMessage(CString message) {
  EnterCriticalSection(&_data_cs);
  _console_log_messages.AddTail(message);
  LeaveCriticalSection(&_data_cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::AddTimedEvent(CString timed_event) {
  EnterCriticalSection(&_data_cs);
  _timed_events.AddTail(timed_event);
  LeaveCriticalSection(&_data_cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::SetCustomMetrics(CString custom_metrics) {
  EnterCriticalSection(&_data_cs);
  _custom_metrics = custom_metrics;
  LeaveCriticalSection(&_data_cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::SetUserTiming(CString user_timing) {
  EnterCriticalSection(&_data_cs);
  _user_timing = user_timing;
  LeaveCriticalSection(&_data_cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CString TestState::GetConsoleLogJSON() {
  CString ret;
  EnterCriticalSection(&_data_cs);
  if (!_console_log_messages.IsEmpty()) {
    ret = _T("[");
    bool first = true;
    POSITION pos = _console_log_messages.GetHeadPosition();
    while (pos) {
      CString entry = _console_log_messages.GetNext(pos);
      if (entry.GetLength()) {
        if (!first)
          ret += _T(",");
        ret += entry;
        first = false;
      }
    }
    ret += _T("]");
  }
  LeaveCriticalSection(&_data_cs);
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CString TestState::GetTimedEventsJSON() {
  CString ret;
  EnterCriticalSection(&_data_cs);
  if (!_timed_events.IsEmpty()) {
    ret = _T("[");
    bool first = true;
    POSITION pos = _timed_events.GetHeadPosition();
    while (pos) {
      CString entry = _timed_events.GetNext(pos);
      if (entry.GetLength()) {
        if (!first)
          ret += _T(",");
        ret += entry;
        first = false;
      }
    }
    ret += _T("]");
  }
  LeaveCriticalSection(&_data_cs);
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::GetCPUTime(FILETIME &cpu_time, FILETIME &total_time) {
  FILETIME idle_time, kernel_time, user_time;
  if (GetSystemTimes(&idle_time, &kernel_time, &user_time)) {
    ULARGE_INTEGER k, u, i, combined, total;
    k.LowPart = kernel_time.dwLowDateTime;
    k.HighPart = kernel_time.dwHighDateTime;
    u.LowPart = user_time.dwLowDateTime;
    u.HighPart = user_time.dwHighDateTime;
    i.LowPart = idle_time.dwLowDateTime;
    i.HighPart = idle_time.dwHighDateTime;
    total.QuadPart = (k.QuadPart + u.QuadPart);
    combined.QuadPart = total.QuadPart - i.QuadPart;
    cpu_time.dwHighDateTime = combined.HighPart;
    cpu_time.dwLowDateTime = combined.LowPart;
    total_time.dwHighDateTime = total.HighPart;
    total_time.dwLowDateTime = total.LowPart;
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
double TestState::GetElapsedMilliseconds(FILETIME &start, FILETIME &end) {
  double elapsed = 0;
  ULARGE_INTEGER s, e;
  s.LowPart = start.dwLowDateTime;
  s.HighPart = start.dwHighDateTime;
  e.LowPart = end.dwLowDateTime;
  e.HighPart = end.dwHighDateTime;
  if (e.QuadPart > s.QuadPart)
    elapsed = (double)(e.QuadPart - s.QuadPart) / 10000.0;

  return elapsed;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::GetElapsedCPUTimes(double &doc, double &end,
                                   double &doc_total, double &end_total) {
  doc = GetElapsedMilliseconds(_start_cpu_time, _doc_cpu_time);
  end = GetElapsedMilliseconds(_start_cpu_time, _end_cpu_time);
  doc_total = GetElapsedMilliseconds(_start_total_time, _doc_total_time);
  end_total = GetElapsedMilliseconds(_start_total_time, _end_total_time);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::Lock() {
  EnterCriticalSection(&_data_cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestState::UnLock() {
  LeaveCriticalSection(&_data_cs);
}

/*-----------------------------------------------------------------------------
    Resize the browser window to a narrow width for checking to see if the
    site is responsive
-----------------------------------------------------------------------------*/
void TestState::ResizeBrowserForResponsiveTest() {
  RECT rect;
  if (_frame_window && ::GetWindowRect(_frame_window, &rect)) {
    int height = abs(rect.top - rect.bottom);
    ::SetWindowPos(_frame_window, HWND_TOPMOST, 0, 0, 
                    RESPONSIVE_BROWSER_WIDTH, height, SWP_NOACTIVATE);
    ::UpdateWindow(_frame_window);
  }
}

/*-----------------------------------------------------------------------------
  We are just going to grab a screen shot - the actual check is done in the
  browser-specific extensions
-----------------------------------------------------------------------------*/
void TestState::CheckResponsive() {
  if (_frame_window) {
    _screen_capture.Capture(_frame_window, CapturedImage::RESPONSIVE_CHECK,
                            false);
  }
}

/*-----------------------------------------------------------------------------
  Collect the memory stats for the top-level process and all child processes
-----------------------------------------------------------------------------*/
void TestState::CollectMemoryStats() {
  // Build a list of all of the processes involved
  DWORD main_proc = GetCurrentProcessId();
  CAtlList<DWORD> procs;
  HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
  if (snap != INVALID_HANDLE_VALUE) {
    PROCESSENTRY32 proc;
    proc.dwSize = sizeof(proc);
    procs.AddHead(main_proc);
    CAtlList<DWORD> new_procs;
    do {
      new_procs.RemoveAll();
      if (Process32First(snap, &proc)) {
        do {
          if (procs.Find(proc.th32ProcessID) &&
              proc.th32ParentProcessID &&
              !procs.Find(proc.th32ParentProcessID) &&
              StrStrI(proc.szExeFile, _T("wptdriver.exe"))) {
            procs.AddHead(proc.th32ParentProcessID);
          }
          if (!procs.Find(proc.th32ProcessID) && procs.Find(proc.th32ParentProcessID))
            new_procs.AddTail(proc.th32ProcessID);
        } while (Process32Next(snap, &proc));
      }
      if (!new_procs.IsEmpty()) {
        POSITION pos = new_procs.GetHeadPosition();
        while (pos)
          procs.AddTail(new_procs.GetNext(pos));
      }
    } while(!new_procs.IsEmpty());
    CloseHandle(snap);
  }

  // Get the full working set for the main process
  _working_set_main_proc = 0;
  if (main_proc) {
    HANDLE hProc = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, main_proc);
    if (hProc) {
      PROCESS_MEMORY_COUNTERS mem;
      memset(&mem, 0, sizeof(mem));
      mem.cb = sizeof(mem);
      if (GetProcessMemoryInfo(hProc, &mem, sizeof(mem))) {
        // keep track in KB which will limit us to 4TB in a DWORD
        _working_set_main_proc = mem.WorkingSetSize / 1024;
      }
      CloseHandle(hProc);
    }
  }

  // Add up the private working sets for all the child procs
  _working_set_child_procs = 0;
  _process_count = procs.GetCount();
  if (!procs.IsEmpty()) {
    // This will limit us to 4GB which is fin
    DWORD len = sizeof(ULONG_PTR) + 1000000 * sizeof(PSAPI_WORKING_SET_BLOCK);
    PSAPI_WORKING_SET_INFORMATION * mem = (PSAPI_WORKING_SET_INFORMATION *)malloc(len);
    if (mem) {
      POSITION pos = procs.GetHeadPosition();
      while (pos) {
        DWORD pid = procs.GetNext(pos);
        if (pid != main_proc) {
          HANDLE hProc = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, pid);
          if (hProc) {
            if (QueryWorkingSet(hProc, mem, len)) {
              DWORD count = 0;
              for (ULONG_PTR i = 0; i < mem->NumberOfEntries; i++) {
                if (!mem->WorkingSetInfo[i].Shared)
                  count++;
              }
              // Each page is 4kb for x86/amd64
              DWORD ws = count * 4;
              _working_set_child_procs += ws;
            }
            CloseHandle(hProc);
          }
        }
      }
      free(mem);
    }
  }
}
