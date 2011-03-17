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
#include "web_browser.h"

typedef void(__stdcall * LPINSTALLHOOK)(DWORD thread_id);

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WebBrowser::WebBrowser(WptSettings& settings, WptTest& test, WptStatus &status,
                        WptHook& hook, BrowserSettings& browser):
  _settings(settings)
  ,_test(test)
  ,_status(status)
  ,_browser_process(NULL)
  ,_hook(hook)
  ,_browser(browser) {

  InitializeCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WebBrowser::~WebBrowser(void) {
  DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WebBrowser::RunAndWait() {
  bool ret = false;

  if (_test.Start(&_browser)) {
    if (_browser._exe.GetLength()) {
      HMODULE hook_dll = NULL;
      TCHAR cmdLine[4096];
      lstrcpy( cmdLine, CString(_T("\"")) + _browser._exe + _T("\"") );
      if (_browser._options.GetLength() )
        lstrcat( cmdLine, CString(_T(" ")) + _browser._options );
      lstrcat ( cmdLine, _T(" about:blank"));

      _status.Set(_T("[wptdriver] Launching: %s\n"), cmdLine);

      STARTUPINFO si;
      PROCESS_INFORMATION pi;
      memset( &si, 0, sizeof(si) );
      si.cb = sizeof(si);
      si.dwX = 0;
      si.dwY = 0;
      si.dwXSize = 1024;
      si.dwYSize = 768;
      si.wShowWindow = SW_SHOWNORMAL;
      si.dwFlags = STARTF_USEPOSITION | STARTF_USESIZE | STARTF_USESHOWWINDOW;

      EnterCriticalSection(&cs);
      _browser_process = NULL;
      if (CreateProcess(NULL, cmdLine, NULL, NULL, FALSE, CREATE_SUSPENDED, 
                        NULL, NULL, &si, &pi)) {
        _browser_process = pi.hProcess;

        ResumeThread(pi.hThread);
        WaitForInputIdle(pi.hProcess, 120000);
        SuspendThread(pi.hThread);

        InstallHook(pi.hProcess);

        SetPriorityClass(pi.hProcess, ABOVE_NORMAL_PRIORITY_CLASS);
        ResumeThread(pi.hThread);
        CloseHandle(pi.hThread);
      }
      LeaveCriticalSection(&cs);

      // wait for the browser to finish (infinite timeout if we are debugging)
      #ifdef DEBUG
      if( _browser_process && 
          WaitForSingleObject(_browser_process, INFINITE ) == WAIT_OBJECT_0 ){
        ret = true;
      }
      #else
      if( _browser_process && 
          WaitForSingleObject(_browser_process, _settings._timeout * 2 *
          SECONDS_TO_MS ) == WAIT_OBJECT_0 ){
        ret = true;
      }
      #endif

      // kill the browser if it is still running
      EnterCriticalSection(&cs);
      _hook.Disconnect();

      if (_browser_process) {
        DWORD exit_code;
        if( GetExitCodeProcess(_browser_process, &exit_code) == STILL_ACTIVE )
          TerminateProcess(_browser_process, 0);
        CloseHandle(_browser_process);
      }

      if (hook_dll) {
        FreeLibrary(hook_dll);
      }
      LeaveCriticalSection(&cs);
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WebBrowser::Close(){
  bool ret = false;

  EnterCriticalSection(&cs);

  // send close messages to all of the top-level windows associated with the
  // browser process
  if (_browser_process) {
    DWORD browser_process_id = GetProcessId(_browser_process);
    HWND frame_window, document_window;
    if (FindBrowserWindow(browser_process_id, frame_window, document_window)) {
      ::PostMessage(frame_window,WM_CLOSE,0,0);
    }
  }
  LeaveCriticalSection(&cs);

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WebBrowser::ClearCache() {
  if (_browser._cache.GetLength()) {
    DeleteDirectory(_browser._cache, false);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WebBrowser::PositionWindow() {
  EnterCriticalSection(&cs);
  if (_browser_process) {
    DWORD browser_process_id = GetProcessId(_browser_process);
    HWND frame_window, document_window;
    if (FindBrowserWindow(browser_process_id, frame_window, document_window)) {
      ::ShowWindow(frame_window, SW_RESTORE);
      ::SetWindowPos(frame_window, HWND_TOPMOST, 0, 0, 1024, 768, 
                      SWP_NOACTIVATE);
    }
  }
  LeaveCriticalSection(&cs);
}
