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
#include <Tlhelp32.h>
#include "dbghelp/dbghelp.h"

typedef void(__stdcall * LPINSTALLHOOK)(DWORD thread_id);

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WebBrowser::WebBrowser(WptSettings& settings, WptTestDriver& test, 
                        WptStatus &status, BrowserSettings& browser):
  _settings(settings)
  ,_test(test)
  ,_status(status)
  ,_browser_process(NULL)
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

  if (_test.Start()) {
    if (_browser._exe.GetLength()) {
      HMODULE hook_dll = NULL;
      TCHAR cmdLine[4096];
      lstrcpy( cmdLine, CString(_T("\"")) + _browser._exe + _T("\"") );
      if (_browser._options.GetLength() )
        lstrcat( cmdLine, CString(_T(" ")) + _browser._options );
      lstrcat ( cmdLine, _T(" about:blank"));

      _status.Set(_T("Launching: %s\n"), cmdLine);

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

        //FindHookFunctions(pi.hProcess);
        InstallHook(pi.hProcess);

        SetPriorityClass(pi.hProcess, ABOVE_NORMAL_PRIORITY_CLASS);
        ResumeThread(pi.hThread);
        CloseHandle(pi.hThread);
      }
      LeaveCriticalSection(&cs);

      // wait for the browser to finish (infinite timeout if we are debugging)
      if (_browser_process) {
        _status.Set(_T("Waiting up to %d seconds for the test to complete\n"), 
                    (_test._test_timeout / SECONDS_TO_MS) * 2);
        #ifdef DEBUG
        if (WaitForSingleObject(_browser_process, INFINITE )==WAIT_OBJECT_0 ) {
          ret = true;
        }
        #else
        if (WaitForSingleObject(_browser_process, _test._test_timeout * 2) == 
            WAIT_OBJECT_0 ) {
          ret = true;
        }
        #endif
      }

      // kill the browser if it is still running
      EnterCriticalSection(&cs);
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
void WebBrowser::ClearUserData() {
  _browser.ResetProfile();
}

// dump all of the symbols to the debugger
BOOL CALLBACK EnumSymProc(PSYMBOL_INFO sym, ULONG SymbolSize, PVOID ctx) {
  if( sym->NameLen && sym->Name ) {
    CStringA buff;
    DWORD address = (DWORD)sym->Address;
    buff.Format("(0x%08X) 0x%08X - %s\n", sym->Flags, address, sym->Name);
    OutputDebugStringA(buff);
  }
  return TRUE;
}

/*-----------------------------------------------------------------------------
  Find the addresses of functions we care about inside of the browser
  (this is just for chrome where we need debug symbols)
-----------------------------------------------------------------------------*/
void WebBrowser::FindHookFunctions(HANDLE process) {
  // figure out the name of the ini file where we cache the offsets
  TCHAR ini_file[MAX_PATH];
  TCHAR sym_cache[MAX_PATH];
  if( SUCCEEDED(SHGetFolderPath(NULL, CSIDL_APPDATA | CSIDL_FLAG_CREATE,
                                NULL, SHGFP_TYPE_CURRENT, ini_file)) ) {
    PathAppend(ini_file, _T("webpagetest_data"));
    CreateDirectory(ini_file, NULL);
    lstrcpy(sym_cache, ini_file);
    lstrcat(sym_cache, _T("\\symbols"));
    CreateDirectory(sym_cache, NULL);
    lstrcat(ini_file, _T("\\offsets.dat"));
    // find the chrome dll
    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE, 
                                                        GetProcessId(process));
    if (snap != INVALID_HANDLE_VALUE) {
      bool found = false;
      MODULEENTRY32 module;
      module.dwSize = sizeof(module);
      if (Module32First(snap, &module)) {
        do {
          if (!lstrcmpi(module.szModule, _T("chrome.dll"))) {
            found = true;
          }
        } while(!found && Module32Next(snap, &module));
      }
      if (found) {
        // generate a md5 hash of the dll
        CString hash;
        if (HashFile(module.szExePath, hash)) {
          SymSetOptions(SYMOPT_DEBUG | SYMOPT_FAVOR_COMPRESSED |
                        SYMOPT_IGNORE_NT_SYMPATH | SYMOPT_INCLUDE_32BIT_MODULES |
                        SYMOPT_NO_PROMPTS);
          char sympath[1024];
          wsprintfA(sympath,"SRV*%S*"
            "http://chromium-browser-symsrv.commondatastorage.googleapis.com",
            sym_cache);
          if (SymInitialize(process, sympath, FALSE)) {
            DWORD64 mod = SymLoadModuleEx(process, NULL, 
                            CT2A(module.szExePath), NULL, 
                            (DWORD64)module.modBaseAddr, module.modBaseSize, 
                            NULL, 0);
            if (mod) {
              SymEnumSymbols(process, mod, "ssl_*", EnumSymProc, this);
              //SymEnumSymbols(process, mod, "*", EnumSymProc, NULL);
              // find the NSS routines

              SymUnloadModule64(process, mod);
            }
            SymCleanup(process);
            //DeleteDirectory(sym_cache);
          }
        }
      }
      CloseHandle(snap);
    }
  }
}