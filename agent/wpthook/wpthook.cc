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

// wpthook.cpp : Defines the exported functions for the DLL application.
//

#include "stdafx.h"
#include "shared_mem.h"
#include "wpthook.h"
#include "window_messages.h"

WptHook * global_hook = NULL;
HANDLE logfile_handle = NULL;
CRITICAL_SECTION *logfile_cs = NULL;

extern HINSTANCE global_dll_handle;

static const UINT_PTR TIMER_DONE = 1;
static const UINT_PTR TIMER_REPORT = 2;
static const UINT_PTR TIMER_FORCE_REPORT = 3;
static const DWORD TIMER_DONE_INTERVAL = 100;
static const DWORD INIT_TIMEOUT = 30000;
static const DWORD TIMER_REPORT_INTERVAL = 1000;
static const DWORD TIMER_FORCE_REPORT_INTERVAL = 10000;

static const TCHAR * BROWSER_DONE_EVENT = _T("Global\\wpt_browser_done");
static const TCHAR * WPTHOOK_LOG = _T("_wpthook.log");
/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptHook::WptHook(void):
  background_thread_(NULL)
  ,background_thread_started_(NULL)
  ,message_window_(NULL)
  ,test_state_(results_, screen_capture_, test_, dev_tools_, trace_,
               trace_netlog_)
  ,winsock_hook_(dns_, sockets_, test_state_)
  ,nspr_hook_(sockets_, test_state_, test_)
  ,schannel_hook_(sockets_, test_state_, test_)
  ,wininet_hook_(sockets_, test_state_, test_)
  ,sockets_(requests_, test_state_, test_)
  ,requests_(test_state_, sockets_, dns_, test_)
  ,results_(test_state_, test_, requests_, sockets_, dns_, screen_capture_,
            dev_tools_, trace_, trace_netlog_)
  ,dns_(test_state_, test_)
  ,done_(false)
  ,new_page_load_(false)
  ,hook_ready_(false)
  ,webdriver_done_(false)
  ,window_timing_received_(false)
  ,test_server_(*this, test_, test_state_, requests_, dev_tools_, trace_,
	trace_netlog_)
  ,test_(*this, test_state_, shared_test_timeout) {

  file_base_ = shared_results_file_base;
  background_thread_started_ = CreateEvent(NULL, TRUE, FALSE, NULL);
  shutdown_message_ = RegisterWindowMessage(_T("WPT Shutdown Now"));

  // grab the version number of the dll
  TCHAR file[MAX_PATH];
  if (GetModuleFileName(global_dll_handle, file, _countof(file))) {
    DWORD unused;
    DWORD infoSize = GetFileVersionInfoSize(file, &unused);
    LPBYTE pVersion = NULL;
    if (infoSize)  
      pVersion = (LPBYTE)malloc( infoSize );
    if (pVersion) {
      if (GetFileVersionInfo(file, 0, infoSize, pVersion)) {
        VS_FIXEDFILEINFO * info = NULL;
        UINT size = 0;
        if (VerQueryValue(pVersion, _T("\\"), (LPVOID*)&info, &size)) {
          if( info ) {
            test_._version = LOWORD(info->dwFileVersionLS);
          }
        }
      }
      free( pVersion );
    }
  }

  logfile_handle = CreateFile(file_base_ + WPTHOOK_LOG, GENERIC_WRITE, 0,
    NULL, OPEN_ALWAYS, 0, 0);
  if (logfile_handle == INVALID_HANDLE_VALUE) {
    WptTrace(loglevel::kFunction, _T("Failed to open log file. Error: %d"), GetLastError());
  } else {
    logfile_cs = (CRITICAL_SECTION *)malloc(sizeof(CRITICAL_SECTION));
    ZeroMemory(logfile_cs, sizeof(CRITICAL_SECTION));
    InitializeCriticalSection(logfile_cs);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptHook::~WptHook(void) {
  if (background_thread_started_)
    CloseHandle(background_thread_started_);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
static unsigned __stdcall ThreadProc( void* arg ) {
  WptHook * wpthook = (WptHook *)arg;
  if( wpthook )
    wpthook->BackgroundThread();
    
  return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::Init(){
  WptTrace(loglevel::kFunction, _T("[wpthook] Init()\n"));
#ifdef DEBUG
  //MessageBox(NULL, L"Attach Debugger", L"Attach Debugger", MB_OK);
#endif
  test_.LoadFromFile();
  if (!test_state_.gdi_only_) {
    winsock_hook_.Init();
    nspr_hook_.Init();
    schannel_hook_.Init();
    wininet_hook_.Init();
  }
  test_state_.Init();
  ResetEvent(background_thread_started_);
  background_thread_ = (HANDLE)_beginthreadex(0, 0, ::ThreadProc, this, 0, 0);
  if (background_thread_started_ &&
      WaitForSingleObject(background_thread_started_, INIT_TIMEOUT) 
      == WAIT_OBJECT_0) {
    WptTrace(loglevel::kFunction, _T("[wpthook] Init() Completed\n"));
  } else {
    WptTrace(loglevel::kFunction, _T("[wpthook] Init() Timed out\n"));
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::Start() {
  reported_ = false;
  new_page_load_ = false;
  window_timing_received_ = false;
  test_state_.Start();
  if (!shared_webdriver_mode) {
    SetTimer(message_window_, TIMER_DONE, TIMER_DONE_INTERVAL, NULL);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::SetDomContentLoadedEvent(LONGLONG start, LONGLONG end) {
  test_state_.SetDomContentLoadedEvent(start, end);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::SetLoadEvent(LONGLONG start, LONGLONG end) {
  test_state_.SetLoadEvent(start, end);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::SetFirstPaint(LONGLONG first_paint) {
  test_state_.SetFirstPaint(first_paint);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::OnLoad() {
  test_state_.OnLoad();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::OnAllDOMElementsLoaded(DWORD load_time) {
  test_state_.OnAllDOMElementsLoaded(load_time);
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::OnNavigate() {
  test_state_.OnNavigate();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::OnNavigateComplete() {
  test_state_.OnNavigateComplete();
}

void WptHook::UnregisterHooks() {
  if (!test_state_.gdi_only_) {
    winsock_hook_.Unregister();
    nspr_hook_.Unregister();
    schannel_hook_.Unregister();
    wininet_hook_.Unregister();
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::OnReport() {
  WptTrace(loglevel::kProcess, _T("[wpthook] WptHook::OnReport()\n"));

  KillTimer(message_window_, TIMER_FORCE_REPORT);
  if (!reported_) {
    // Grab session result screenshot in case this is the end of the measurement
    test_state_.GrabResultScreenshot();

    reported_ = true;
    if (test_._combine_steps) {
      results_.Save();
    }
    test_.CollectDataDone();
    if (test_.Done()) {
      test_state_._exit = true;
      test_server_.Stop();
      results_.Save();
      Cleanup();
      ShutdownNow();
    }
  }
  test_.Unlock();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::Report() {
  if (message_window_) {
    // This method is usually called after a CollectStats. We use a timer here to leave enough time
    // to the browser to report the stats.
    SetTimer(message_window_, TIMER_REPORT,
      TIMER_REPORT_INTERVAL, NULL);
  }
}

void WptHook::Save(bool merge) {
  // Grab session result screenshot in case this is the end of the measurement
  test_state_.GrabResultScreenshot();
  WptTrace(loglevel::kProcess, _T("[wpthook] WptHook::Save()\n"));

  if (!reported_) {
    reported_ = true;
    results_.Save(merge);
  }
}

void WptHook::Cleanup() {
  // Let the wptdriver know that the hook is done.
  WptTrace(loglevel::kTrace, _T("[wpthook] In Cleanup()"));
  HANDLE browser_done_event = OpenEvent(EVENT_MODIFY_STATE, FALSE,
    BROWSER_DONE_EVENT);
  if (browser_done_event) {
    WptTrace(loglevel::kTrace, _T("[wpthook] OpenEvent call succeeded!"));
    SetEvent(browser_done_event);
    WptTrace(loglevel::kTrace, _T("[wpthook] SetEvent done!"));
    CloseHandle(browser_done_event);
  } else {
    WptTrace(loglevel::kTrace, _T("[wpthook] OpenEvent call failed with error: %d"), GetLastError());
  }
  test_state_._exit = true;
  WptTrace(loglevel::kTrace, _T("[wpthook] Leaving Cleanup()"));
}

void WptHook::ShutdownNow() {
  WptTrace(loglevel::kTrace, _T("[wpthook] In ShutdownNow()"));
  done_ = true;
  test_server_.Stop();
  WptTrace(loglevel::kTrace, _T("[wpthook] Test server stopped!"));
  if (test_state_._frame_window) {
    WptTrace(loglevel::kTrace, _T("[wpthook] - **** Exiting Hooked Browser\n"));
    ::SendMessage(test_state_._frame_window, WM_CLOSE, 0, 0);
  }
  WptTrace(loglevel::kTrace, _T("[wpthook] Leaving ShutdownNow()"));
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptHook::OnMessage(UINT message, WPARAM wParam, LPARAM lParam) {
  bool ret = true;
  
  switch (message){
    case WM_TIMER:{
        switch (wParam){
            case TIMER_DONE:
              if (test_state_.IsDone()) {
                  KillTimer(message_window_, TIMER_DONE);

                  // Measurement is done, unregister all hooks and wait for the collect
                  // data info before shutting down
                  test_.Done();
                  UnregisterHooks();
                  test_.CollectData();
                  SetTimer(message_window_, TIMER_FORCE_REPORT,
                      TIMER_FORCE_REPORT_INTERVAL, NULL);
                }
                break;
            case TIMER_REPORT:
              KillTimer(message_window_, TIMER_REPORT);
              test_.Lock();
              OnReport();
            case TIMER_FORCE_REPORT:
                OnReport();
                break;
        }
    }
    default:
      if (message == shutdown_message_) {
          ShutdownNow();
      } else {
        ret = false;
      }
      break;
  }

  return ret;
}

/*-----------------------------------------------------------------------------
  WndProc for the messaging window
-----------------------------------------------------------------------------*/
static LRESULT CALLBACK WptHookWindowProc(HWND hwnd, UINT uMsg, 
                                                WPARAM wParam, LPARAM lParam) {
  LRESULT ret = 0;
  bool handled = false;
  if (global_hook)
    handled = global_hook->OnMessage(uMsg, wParam, lParam);
  if (!handled)
    ret = DefWindowProc(hwnd, uMsg, wParam, lParam);
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::BackgroundThread() {
  WptTrace(loglevel::kFunction, _T("[wpthook] BackgroundThread()\n"));

  if (!test_state_.gdi_only_)
    test_server_.Start();

  // create a hidden window for processing messages from wptdriver
  WNDCLASS wndClass;
  memset(&wndClass, 0, sizeof(wndClass));
  wndClass.lpszClassName = wpthook_window_class;
  wndClass.lpfnWndProc = WptHookWindowProc;
  wndClass.hInstance = global_dll_handle;
  if (RegisterClass(&wndClass)) {
    message_window_ = CreateWindow(wpthook_window_class, wpthook_window_class, 
                                    WS_POPUP, 0, 0, 0, 
                                    0, NULL, NULL, global_dll_handle, NULL);
    if (message_window_) {
      SetEvent(background_thread_started_);
      MSG msg;
      BOOL bRet;
      while (!done_ && (bRet = GetMessage(&msg, message_window_, 0, 0)) != 0) {
        if (bRet != -1) {
          TranslateMessage(&msg);
          DispatchMessage(&msg);
        }
      }
    }
  }

  test_server_.Stop();
  WptTrace(loglevel::kFunction, _T("[wpthook] BackgroundThread() Stopped\n"));
}

void WptHook::SetHookReady() {
  hook_ready_ = true;
}

bool WptHook::IsHookReady() {
  return hook_ready_;
}

void WptHook::ResetHookReady() {
  hook_ready_ = false;
}

void WptHook::OnWebDriverDone() {
  webdriver_done_ = true;
}

bool WptHook::IsWebDriverDone() {
  return webdriver_done_;
}

void WptHook::SetNewPageLoad() {
  new_page_load_ = true;
}

bool WptHook::IsNewPageLoad() {
  return new_page_load_;
}

void WptHook::OnWindowTimingReceived() {
  window_timing_received_ = true;
}

bool WptHook::IsWindowTimingReceived() {
  return window_timing_received_;
}
