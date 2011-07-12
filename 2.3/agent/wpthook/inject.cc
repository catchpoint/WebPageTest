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

#include "stdafx.h"
#include "wpthook.h"
#include "shared_mem.h"
#include <Tlhelp32.h>

HINSTANCE global_dll_handle = NULL; // DLL handle
extern WptHook * global_hook;

extern "C" {
__declspec( dllexport ) void __stdcall InstallHook(HANDLE process);
__declspec( dllexport ) DWORD __stdcall RemoteThreadProc(void * thread_data);
}

/*-----------------------------------------------------------------------------
    Injected initialization routine
-----------------------------------------------------------------------------*/
void __stdcall Initialize(void) {
  OutputDebugString(_T("[wpthook] Initialize()\n"));
  #ifdef DEBUG
  //MessageBox(NULL, _T("Attach"), _T("Debugger"), MB_SYSTEMMODAL | MB_OK);
  #endif

  if( !global_hook ){
    global_hook = new WptHook;
    global_hook->Init();
  }
}

/*-----------------------------------------------------------------------------
  Code injected into the remote process
-----------------------------------------------------------------------------*/
DWORD __stdcall RemoteThreadProc(void * thread_data) {
  Initialize();
  return 0;
}

/*-----------------------------------------------------------------------------
  Find the base address where the given dll is loaded
-----------------------------------------------------------------------------*/
LPBYTE GetDllBaseAddress(HANDLE process, TCHAR * dll) {
  LPBYTE base_address = NULL;
  HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE, 
                                                        GetProcessId(process));
  if (snap != INVALID_HANDLE_VALUE) {
    // loop until we find the dll
    MODULEENTRY32 module;
    module.dwSize = sizeof(module);
    if (Module32First(snap, &module)) {
      do {
        if (!lstrcmpi(module.szModule, dll))
          base_address = module.modBaseAddr;
      } while(!base_address && Module32Next(snap, &module));
    }
    CloseHandle(snap);
  }

  return base_address;
}

/*-----------------------------------------------------------------------------
  Figure out the address of the given function in the remote process
-----------------------------------------------------------------------------*/
LPBYTE GetRemoteFunction(HANDLE process, TCHAR * dll, TCHAR * fn){
  LPBYTE remote_function = NULL;

  // first, get the offset of the function from the dll base address in the 
  // current process
  HMODULE module = LoadLibrary(dll);
  if (module) {
    LPBYTE base = GetDllBaseAddress(GetCurrentProcess(), dll);
    if (base) {
      LPBYTE addr = (LPBYTE)GetProcAddress(module, CT2A(fn));
      if (addr > base) {
        unsigned __int64 offset = addr - base;

        // now find the base address of the dll in the remote process
        LPBYTE remote_base = GetDllBaseAddress(process, dll);
        if (remote_base)
          remote_function = remote_base + offset;
      }
    }

    FreeLibrary(module);
  }

  return remote_function;
}

/*-----------------------------------------------------------------------------
  Load the DLL into the remote process
-----------------------------------------------------------------------------*/
bool LoadRemoteDll(HANDLE process) {
  bool ret = false;

  // get the addresses of the functions we need in the remote process
  LPBYTE fn_LoadLibraryW = GetRemoteFunction(process, _T("kernel32.dll"), 
                                                _T("LoadLibraryW"));

  // copy the dll path to the remote process memory
  TCHAR dll_path[MAX_PATH];
  if (GetModuleFileNameW(global_dll_handle, dll_path, _countof(dll_path))) {
    WCHAR * remote_path = (WCHAR *)VirtualAllocEx(process, NULL, 
                                 sizeof(dll_path), MEM_COMMIT, PAGE_READWRITE);
    if (remote_path) {
      if (WriteProcessMemory(process, remote_path, dll_path, 
                                sizeof(dll_path), NULL) ) {
        // Load the DLL
        HANDLE thread_handle = CreateRemoteThread(process, NULL, 0, 
               (LPTHREAD_START_ROUTINE)fn_LoadLibraryW, remote_path, 0 , NULL);
        if (thread_handle) {
          WaitForSingleObject(thread_handle, 120000);
          CloseHandle(thread_handle);
          ret = true;
        }
      }
      VirtualFreeEx(process, remote_path, sizeof(dll_path), MEM_RELEASE);
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
  Inject our dll into the browser process
-----------------------------------------------------------------------------*/
void WINAPI InstallHook(HANDLE process) {
  if (LoadRemoteDll(process)) {
    // code is loaded remotely, figure out the function offset and run the init
    LPBYTE fn_RemoteThreadProc = GetRemoteFunction(process, _T("wpthook.dll"), 
                                                  _T("_RemoteThreadProc@4"));
    if (fn_RemoteThreadProc) {
      HANDLE thread_handle = CreateRemoteThread(process, NULL, 0, 
              (LPTHREAD_START_ROUTINE)fn_RemoteThreadProc, NULL, 0 , NULL);
      if (thread_handle) {
        WaitForSingleObject(thread_handle, 120000);
        CloseHandle(thread_handle);
      }
    }
  }
}

