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
#include "hook_gdi.h"
#include "hook_chrome.h"
#include "requests.h"
#include "track_dns.h"
#include "track_sockets.h"
#include "test_state.h"
#include "results.h"
#include "screen_capture.h"
#include "test_server.h"
#include "wpt_test_hook.h"

extern HINSTANCE global_dll_handle; // DLL handle

class WptHook {
public:
  WptHook(void);
  ~WptHook(void);

  void Init();
  void BackgroundThread();
  bool OnMessage(UINT message, WPARAM wParam, LPARAM lParam);

  // extension actions
  void Start();
  void OnLoad(DWORD load_time);
  void OnNavigate();

private:
  CGDIHook  _gdi_hook;
  CWsHook   _winsock_hook;
  NsprHook   _nspr_hook;
  HookChrome  _chrome_hook;
  HANDLE    _background_thread;
  HWND      _message_window;
  CString   _file_base;
  bool      _done;

  // winsock event tracking
  TrackDns      _dns;
  TrackSockets  _sockets;
  Requests      _requests;

  TestState     _test_state;
  Results       _results;
  ScreenCapture _screen_capture;
  TestServer    _test_server;
  WptTestHook   _test;
};
