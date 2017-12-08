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

// dllmain.cpp : Defines the entry point for the DLL application.
#include "stdafx.h"
#include "wpthook.h"

HINSTANCE global_dll_handle = NULL; // DLL handle
extern WptHook * global_hook;

bool IsCorrectBrowserProcess(LPCTSTR exe);

extern "C" {
__declspec( dllexport ) void __stdcall InstallHook(void);
}

static DWORD WINAPI HookThreadProc(void* arg) {
  SetPriorityClass(GetCurrentProcess(), ABOVE_NORMAL_PRIORITY_CLASS);

  // actually do the startup work
  global_hook = new WptHook;
  global_hook->Init();

  return 0;
}

void WINAPI InstallHook(void) {
  static bool started = false;
  if (!started) {
    started = true;
    HANDLE thread_handle = CreateThread(NULL, 0, ::HookThreadProc, 0, 0, NULL);
    if (thread_handle)
      CloseHandle(thread_handle);
  }
}

BOOL APIENTRY DllMain( HMODULE hModule,
                       DWORD  ul_reason_for_call,
                       LPVOID lpReserved) {
  BOOL ok = TRUE;
  switch (ul_reason_for_call) {
    case DLL_PROCESS_ATTACH: {
        // This is called VERY early in a process - only use kernel32.dll
        // functions.
        ok = FALSE; // Don't load by default, only if we are actively testing and only on win32
        TCHAR path[MAX_PATH];
        if (GetModuleFileName(NULL, path, _countof(path))) {
          TCHAR exe[MAX_PATH];
          lstrcpy(exe, path);
          TCHAR * token = _tcstok(path, _T("\\"));
          while (token != NULL) {
            if (lstrlen(token))
              lstrcpy(exe, token);
            token = _tcstok(NULL, _T("\\"));
          }
          // Only inject into a known-browser
          bool is_browser = false;
          const TCHAR * BROWSERS[] = {
            _T("chrome.exe"),
            _T("firefox.exe"),
            _T("iexplore.exe"),
            _T("plugin-container.exe"),
            _T("safari.exe"),
            _T("WebKit2WebProcess.exe")
          };
          DWORD count = _countof(BROWSERS);
          for (DWORD i = 0; i < count && !is_browser; i++) {
            if (!lstrcmpi(BROWSERS[i], exe))
              is_browser = true;
          }
          if (is_browser) {
            if(IsCorrectBrowserProcess(exe)) {
              ok = TRUE;
              global_dll_handle = (HINSTANCE)hModule;

              // IE gets instrumented from the BHO so don't start the actual
              // hooking, just let the DLL load
              if (lstrcmpi(exe, _T("iexplore.exe")))
                InstallHook();
            }
          }
        }
      } break;
    case DLL_THREAD_ATTACH:
    case DLL_THREAD_DETACH:
    case DLL_PROCESS_DETACH:
      break;
  }
  return ok;
}

/*-----------------------------------------------------------------------------
    See if this is the browser process we're actually interested in
    instrumenting (for browsers that have multi-process architectures)
-----------------------------------------------------------------------------*/
bool IsCorrectBrowserProcess(LPCTSTR exe) {
  bool ok = false;
  SharedMem shared(false);
  if (lstrlen(shared.BrowserExe()) && !lstrcmpi(exe, shared.BrowserExe())) {
    LPTSTR cmdline = GetCommandLine();
    if (!lstrcmpi(exe, _T("chrome.exe"))) {
      if (_tcsstr(cmdline, _T("http://127.0.0.1:8888/blank.html")))
        ok = true;
    } else if (!lstrcmpi(exe, _T("firefox.exe"))) {
      if (_tcsstr(cmdline, _T("http://127.0.0.1:8888/blank.html")))
        ok = true;
    } else if (!lstrcmpi(exe, _T("iexplore.exe"))) {
      ok = true;
    }
  } else if (!lstrcmpi(_T("safari.exe"), shared.BrowserExe()) &&
             !lstrcmpi(exe, _T("WebKit2WebProcess.exe"))) {
      ok = true;
  }

  return ok;
}
