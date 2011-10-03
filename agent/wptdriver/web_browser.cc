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
#include "dbghelp/dbghelp.h"
#include "util.h"
#include "web_browser.h"

typedef void(__stdcall * LPINSTALLHOOK)(DWORD thread_id);
const int PIPE_IN = 1;
const int PIPE_OUT = 2;

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
      bool ok = true;
      if (CreateProcess(NULL, cmdLine, NULL, NULL, FALSE, CREATE_SUSPENDED, 
                        NULL, NULL, &si, &pi)) {
        _browser_process = pi.hProcess;

        ResumeThread(pi.hThread);
        if (WaitForInputIdle(pi.hProcess, 120000) != 0) {
          ok = false;
          _status.Set(_T("Error waiting for browser to launch\n"));
        }
        SuspendThread(pi.hThread);

        FindHookFunctions(pi.hProcess);
        if (ok && !InstallHook(pi.hProcess)) {
          ok = false;
          _status.Set(_T("Error instrumenting browser\n"));
        }

        SetPriorityClass(pi.hProcess, ABOVE_NORMAL_PRIORITY_CLASS);
        if (!ConfigureIpfw(_test))
            ok = false;
        ResumeThread(pi.hThread);
        CloseHandle(pi.hThread);
      } else {
        _status.Set(_T("Error Launching: %s\n"), cmdLine);
      }
      LeaveCriticalSection(&cs);

      // wait for the browser to finish (infinite timeout if we are debugging)
      if (_browser_process && ok) {
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
      LeaveCriticalSection(&cs);
      ResetIpfw();
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WebBrowser::ClearUserData() {
  _browser.ResetProfile();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL CALLBACK EnumSymProc(PSYMBOL_INFO sym, ULONG SymbolSize, PVOID offset) {
  if (sym->Address && sym->ModBase) {
    *static_cast<DWORD64 *>(offset) = sym->Address - sym->ModBase;
  }
  return TRUE;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool GetOffsetsFromSymbols(HANDLE process, LPCTSTR app_data_dir,
                           const MODULEENTRY32& module,
                           const HookSymbolNames& symbol_names,
                           HookOffsets * offsets) {
  bool is_loaded = false;
  TCHAR symbols_dir[MAX_PATH];
  lstrcpy(symbols_dir, app_data_dir);
  lstrcat(symbols_dir, _T("\\symbols"));
  CreateDirectory(symbols_dir, NULL);

  SymSetOptions(SYMOPT_DEBUG | SYMOPT_FAVOR_COMPRESSED |
                SYMOPT_IGNORE_NT_SYMPATH |
                SYMOPT_INCLUDE_32BIT_MODULES | SYMOPT_NO_PROMPTS);
  char symbols_search_path[1024];
  wsprintfA(symbols_search_path,
      "SRV*%S*http://chromium-browser-symsrv.commondatastorage.googleapis.com",
      symbols_dir);
  if (SymInitialize(process, symbols_search_path, FALSE)) {
    DWORD64 module_base_addr = SymLoadModuleEx(
        process, NULL, CT2A(module.szExePath), NULL, 
        (DWORD64)module.modBaseAddr, module.modBaseSize, NULL, 0);
    if (module_base_addr) {
      // Find the offsets for the functions we want to hook.
      POSITION pos = symbol_names.GetHeadPosition();
      while (pos != NULL) {      
        CStringA name = symbol_names.GetNext(pos);
        DWORD64 offset = 0;
        SymEnumSymbols(process, module_base_addr, name, EnumSymProc, &offset);
        offsets->SetAt(name, offset);
      }
      is_loaded = true;
      SymUnloadModule64(process, module_base_addr);
    }
    SymCleanup(process);
  }
  //DeleteDirectory(symbols_dir);
  return is_loaded;
}

/*-----------------------------------------------------------------------------
  Find the addresses of functions we care about inside of the browser
  (this is just for chrome where we need debug symbols)
-----------------------------------------------------------------------------*/
void WebBrowser::FindHookFunctions(HANDLE process) {
  // TODO: Update offsets cache when wptdriver starts.
  CString data_dir = CreateAppDataDir();
  MODULEENTRY32 module;
  if (GetModuleByName(process, _T("chrome.dll"), &module)) {
    CString exe_path(module.szExePath);
    CString offsets_filename = GetHookOffsetsFileName(data_dir, exe_path);
    if (!PathFileExists(offsets_filename)) {
      HookSymbolNames hook_names;
      GetHookSymbolNames(&hook_names);
      HookOffsets hook_offsets;
      if (GetOffsetsFromSymbols(process, data_dir, module, hook_names,
                                &hook_offsets)) {
        SaveHookOffsets(offsets_filename, hook_offsets);
      }
    }
  }
}

/*-----------------------------------------------------------------------------
  Set up bandwidth throttling
-----------------------------------------------------------------------------*/
bool WebBrowser::ConfigureIpfw(WptTestDriver& test) {
  bool ret = false;
  if (test._bwIn && test._bwOut) {
    // split the latency across directions
    DWORD latency = test._latency / 2;

    CString buff;
    buff.Format(_T("[urlblast] - Throttling: %d Kbps in, %d Kbps out, ")
                _T("%d ms latency, %0.2f plr"), test._bwIn, test._bwOut, 
                test._latency, test._plr );
    OutputDebugString(buff);

    if (_ipfw.CreatePipe(PIPE_IN, test._bwIn*1000, latency,test._plr/100.0)) {
      // make up for odd values
      if( test._latency % 2 )
        latency++;

      if (_ipfw.CreatePipe(PIPE_OUT, test._bwOut*1000,latency,test._plr/100.0))
        ret = true;
      else
        _ipfw.CreatePipe(PIPE_IN, 0, 0, 0);
    }
  }
  else
    ret = true;
  return ret;
}

/*-----------------------------------------------------------------------------
  Remove the bandwidth throttling
-----------------------------------------------------------------------------*/
void WebBrowser::ResetIpfw(void) {
  _ipfw.CreatePipe(PIPE_IN, 0, 0, 0);
  _ipfw.CreatePipe(PIPE_OUT, 0, 0, 0);
}
