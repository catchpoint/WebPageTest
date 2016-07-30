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

#pragma once
#include "hook_winsock.h"
#include "hook_nspr.h"
#include "hook_schannel.h"
#include "hook_wininet.h"
#include "hook_chrome_ssl.h"
#include "hook_file.h"
#include "requests.h"
#include "track_dns.h"
#include "track_sockets.h"
#include "test_state.h"
#include "results.h"
#include "screen_capture.h"
#include "test_server.h"
#include "wpt_test_hook.h"
#include "trace.h"

extern HINSTANCE global_dll_handle; // DLL handle

class WptHook {
public:
  WptHook(void);
  ~WptHook(void);

  void Init();
  void LateInit();
  void BackgroundThread();
  bool OnMessage(UINT message, WPARAM wParam, LPARAM lParam);

  // extension actions
  void Start();
  void OnAllDOMElementsLoaded(DWORD load_time);
  void SetDomInteractiveEvent(DWORD domInteractive);
  void SetDomLoadingEvent(DWORD domLoading);
  void SetDomContentLoadedEvent(DWORD start, DWORD end);
  void SetLoadEvent(DWORD start, DWORD end);
  void SetFirstPaint(DWORD first_paint);
  void OnLoad();
  void OnNavigate();
  void OnNavigateComplete();
  void Report();
  void OnReport();

private:
  CWsHook   winsock_hook_;
  NsprHook  nspr_hook_;
  SchannelHook  schannel_hook_;
  WinInetHook wininet_hook_;
  ChromeSSLHook chrome_ssl_hook_;
  FileHook  file_hook_;
  HANDLE    background_thread_;
  HANDLE    background_thread_started_;
  HWND      message_window_;
  CString   file_base_;
  bool      done_;
  bool      reported_;
  UINT      report_message_;
  bool      late_initialized_;

  // winsock event tracking
  TrackDns      dns_;
  TrackSockets  sockets_;
  Requests      requests_;

  TestState     test_state_;
  Results       results_;
  ScreenCapture screen_capture_;
  TestServer    test_server_;
  WptTestHook   test_;
  Trace         trace_;
};
