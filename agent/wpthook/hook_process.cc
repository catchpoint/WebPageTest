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

// hook_process.cc - Code for intercepting process creation

#include "StdAfx.h"
#include "hook_process.h"
#include "test_server.h"

extern "C" BOOL WINAPI InstallHook(HANDLE process);
static ProcessHook * g_hook = NULL;

/******************************************************************************
*******************************************************************************
**															                                    				 **
**								                  Stub Functions		          						 **
**													                                    						 **
*******************************************************************************
******************************************************************************/

BOOL __stdcall CreateProcessW_Hook(
    LPCWSTR lpApplicationName,
    LPWSTR lpCommandLine,
    LPSECURITY_ATTRIBUTES lpProcessAttributes,
    LPSECURITY_ATTRIBUTES lpThreadAttributes,
    BOOL bInheritHandles,
    DWORD dwCreationFlags,
    LPVOID lpEnvironment,
    LPCWSTR lpCurrentDirectory,
    LPSTARTUPINFOW lpStartupInfo,
    LPPROCESS_INFORMATION lpProcessInformation) {
  BOOL ret = FALSE;
  if (g_hook) {
    ret = g_hook->CreateProcessW(lpApplicationName, lpCommandLine, 
      lpProcessAttributes, lpThreadAttributes, bInheritHandles, 
      dwCreationFlags, lpEnvironment, lpCurrentDirectory, lpStartupInfo,
      lpProcessInformation);
  }
  return ret;
}


/******************************************************************************
*******************************************************************************
**													                                    						 **
**			            					CProcessHook Class				                  				 **
**															                                    				 **
*******************************************************************************
******************************************************************************/

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
ProcessHook::ProcessHook(TestServer& web_server):
  _web_server(web_server) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void ProcessHook::Init() {
  if (!g_hook)
    g_hook = this;

  _CreateProcessW = hook.createHookByName("kernel32.dll", "CreateProcessW", 
                                            CreateProcessW_Hook);
}

/*-----------------------------------------------------------------------------
  If we are spawning a child firefox process, we need to:
  - inject the hooks into the child process
  - stop the web server in our current process
  - wait for it to exit
-----------------------------------------------------------------------------*/
ProcessHook::~ProcessHook(void) {
}

BOOL ProcessHook::CreateProcessW(
  LPCWSTR lpApplicationName,
  LPWSTR lpCommandLine,
  LPSECURITY_ATTRIBUTES lpProcessAttributes,
  LPSECURITY_ATTRIBUTES lpThreadAttributes,
  BOOL bInheritHandles,
  DWORD dwCreationFlags,
  LPVOID lpEnvironment,
  LPCWSTR lpCurrentDirectory,
  LPSTARTUPINFOW lpStartupInfo,
  LPPROCESS_INFORMATION pi) {
  BOOL ret = FALSE;
  if (_CreateProcessW) {
    ret = _CreateProcessW(lpApplicationName, lpCommandLine, 
      lpProcessAttributes, lpThreadAttributes, bInheritHandles, 
      dwCreationFlags, lpEnvironment, lpCurrentDirectory, lpStartupInfo,
      pi);
  }
  if (ret && lpCommandLine && pi) {
    CString cmd(lpCommandLine);
    cmd.MakeLower();
    if (cmd.Find(_T("firefox.exe")) >= 0) {
      if (WaitForInputIdle(pi->hProcess, 120000) == 0) {
        bool ok = false;
        SuspendThread(pi->hThread);
        if (InstallHook(pi->hProcess)) {
          _web_server.Stop();
          ok = true;
        }
        ResumeThread(pi->hThread);
        if (ok)
          WaitForSingleObject(pi->hProcess, INFINITE);
      }
    }
  }
  return ret;
}
