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

static const UINT_PTR TIMER_DONE = 1;
static const DWORD TIMER_DONE_INTERVAL = 100;

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptHook::WptHook(void):
  _background_thread(NULL)
  ,_message_window(NULL)
  ,_test_state(shared_test_timeout, shared_test_force_on_load, _results,
                _screen_capture)
  ,_winsock_hook(_dns, _sockets, _test_state)
  ,_gdi_hook(_test_state)
  ,_sockets(_requests, _test_state)
  ,_requests(_test_state, _sockets, _dns)
  ,_results(_test_state, _requests, _sockets, _screen_capture)
  ,_dns(_test_state) {
  _file_base = shared_results_file_base;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptHook::~WptHook(void) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptHook::OnMessage(UINT message, WPARAM wParam, LPARAM lParam) {
  bool ret = true;

  switch (message){
    case WPT_INIT:
        ATLTRACE2(_T("[wpthook] WptHookWindowProc() - WPT_INIT\n"));
        break;

    case WPT_START:
        _test_state.Start();
        SetTimer(_message_window, TIMER_DONE, 
                                TIMER_DONE_INTERVAL, NULL);
        break;

    case WPT_STOP:
        ATLTRACE2(_T("[wpthook] WptHookWindowProc() - WPT_STOP\n"));
        break;

    case WPT_ON_NAVIGATE:
        _test_state.OnNavigate();
        break;

    case WPT_ON_LOAD:
        _test_state.OnLoad();
        break;

    case WM_TIMER:
        if (_test_state.IsDone()) {
          KillTimer(_message_window, TIMER_DONE);
          _results.Save();
          _driver.Done();
        }

    default:
        ret = false;
        break;
  }

  return ret;
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
  ATLTRACE2(_T("[wpthook] Init()\n"));
  _background_thread = (HANDLE)_beginthreadex(0, 0, ::ThreadProc, this, 0, 0);
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
  ATLTRACE2(_T("[wpthook] BackgroundThread()\n"));

  // connect to the server
  _driver.Connect();

  // create a hidden window for processing messages from wptdriver
  WNDCLASS wndClass;
  memset(&wndClass, 0, sizeof(wndClass));
  wndClass.lpszClassName = wpthook_window_class;
  wndClass.lpfnWndProc = WptHookWindowProc;
  wndClass.hInstance = global_dll_handle;
  if (RegisterClass(&wndClass)) {
    _message_window = CreateWindow(wpthook_window_class, wpthook_window_class, 
                                    WS_POPUP, 0, 0, 0, 
                                    0, NULL, NULL, global_dll_handle, NULL);
    if (_message_window) {
      PostMessage( _message_window, WPT_INIT, 0, 0);

      MSG msg;
      BOOL bRet;
      while ((bRet = GetMessage(&msg, _message_window, 0, 0)) != 0) {
        if (bRet != -1) {
          TranslateMessage(&msg);
          DispatchMessage(&msg);
        }
      }
    }
  }
}
