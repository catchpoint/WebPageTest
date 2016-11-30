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
#include "wpthook.h"
#include "window_messages.h"
#include "MinHook.h"

WptHook * global_hook = NULL;
extern HINSTANCE global_dll_handle;

static const UINT_PTR TIMER_DONE = 1;
static const UINT_PTR TIMER_FORCE_REPORT = 2;
static const DWORD TIMER_DONE_INTERVAL = 100;
static const DWORD INIT_TIMEOUT = 30000;
static const DWORD TIMER_FORCE_REPORT_INTERVAL = 60000;

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptHook::WptHook(void):
  background_thread_(NULL)
  ,background_thread_started_(NULL)
  ,message_window_(NULL)
  ,test_state_(results_, screen_capture_, test_, trace_)
  ,winsock_hook_(dns_, sockets_, test_state_)
  ,nspr_hook_(sockets_, test_state_, test_)
  ,schannel_hook_(sockets_, test_state_, test_)
  ,wininet_hook_(sockets_, test_state_, test_)
  ,chrome_ssl_hook_(sockets_, test_state_, test_)
  ,file_hook_(sockets_, test_state_)
  ,sockets_(requests_, test_state_, test_)
  ,requests_(test_state_, sockets_, dns_, test_)
  ,results_(test_state_, test_, requests_, sockets_, dns_, screen_capture_,
            trace_)
  ,dns_(test_state_, test_)
  ,done_(false)
  ,test_server_(*this, test_, test_state_, requests_, trace_)
  ,test_(*this, test_state_, 120000)
  ,late_initialized_(false) {

  test_._test_timeout = test_state_.shared_.TestTimeout();
  test_._measurement_timeout = test_._test_timeout;
  file_base_ = test_state_.shared_.ResultsFileBase();
  background_thread_started_ = CreateEvent(NULL, TRUE, FALSE, NULL);
  report_message_ = RegisterWindowMessage(_T("WPT Report Data"));

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
  ATLTRACE("[wpthook] Init()");
#ifdef DEBUG
  //MessageBox(NULL, L"Attach Debugger", L"Attach Debugger", MB_OK);
#endif
  test_.LoadFromFile();

  // Initialize the API hooking library
  MH_Initialize();

  if (!test_state_.gdi_only_) {
    file_hook_.Init();
    winsock_hook_.Init();
    nspr_hook_.Init();
    schannel_hook_.Init();
    wininet_hook_.Init();
    chrome_ssl_hook_.Init();
  }
  test_state_.Init();
  ResetEvent(background_thread_started_);
  background_thread_ = (HANDLE)_beginthreadex(0, 0, ::ThreadProc, this, 0, 0);
  if (background_thread_started_ &&
      WaitForSingleObject(background_thread_started_, INIT_TIMEOUT) 
      == WAIT_OBJECT_0) {
    ATLTRACE("[wpthook] Init() Completed");
  } else {
    ATLTRACE("[wpthook] Init() Timed out");
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::LateInit(){
  if (!late_initialized_) {
    late_initialized_ = true;
    chrome_ssl_hook_.Init();
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::Start() {
  if (!test_state_.gdi_only_) {
    chrome_ssl_hook_.Init();
  }
  reported_ = false;
  test_state_.Start();
  SetTimer(message_window_, TIMER_DONE, TIMER_DONE_INTERVAL, NULL);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::SetDomInteractiveEvent(DWORD domInteractive) {
  test_state_.SetDomInteractiveEvent(domInteractive);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::SetDomLoadingEvent(DWORD domLoading) {
  test_state_.SetDomLoadingEvent(domLoading);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::SetDomContentLoadedEvent(DWORD start, DWORD end) {
  test_state_.SetDomContentLoadedEvent(start, end);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::SetLoadEvent(DWORD start, DWORD end) {
  test_state_.SetLoadEvent(start, end);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::SetFirstPaint(DWORD first_paint) {
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

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::OnReport() {
  KillTimer(message_window_, TIMER_FORCE_REPORT);
  if (!reported_) {
    reported_ = true;
    if (!test_._combine_steps)
      results_.Save();
    test_.CollectDataDone();
    if (test_.Done()) {
      ATLTRACE("[wpthook] - (%d) Shutting down...", GetCurrentThreadId());
      results_.Save();
      test_state_._exit = true;
      ATLTRACE("[wpthook] - (%d) Stopping server...", GetCurrentThreadId());
      test_server_.Stop();
      done_ = true;
      if (test_state_._frame_window) {
        ATLTRACE("[wpthook] - **** Exiting Hooked Browser");
        ::SendMessage(test_state_._frame_window, WM_CLOSE, 0, 0);
      }
    }
  }
  test_.Unlock();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::Report() {
  if (message_window_ && report_message_) {
    test_.Lock();
    PostMessage(message_window_, report_message_, 0, 0);
  }
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
                  test_.CollectData();
                  test_.Done();
                  SetTimer(message_window_, TIMER_FORCE_REPORT,
                           TIMER_FORCE_REPORT_INTERVAL, NULL);
                }
                break;
            case TIMER_FORCE_REPORT:
                OnReport();
                break;
        }
    }
    default:
        if (message == report_message_) {
          OnReport();
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
  ATLTRACE("[wpthook] BackgroundThread()");

  if (!test_state_.gdi_only_) {
    chrome_ssl_hook_.Init();
    test_server_.Start();
  }

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
  ATLTRACE("[wpthook] BackgroundThread() Stopped");
}
