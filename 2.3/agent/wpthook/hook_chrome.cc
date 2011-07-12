#include "StdAfx.h"
#include "hook_chrome.h"
#include <Tlhelp32.h>
#include "../wptdriver/dbghelp/dbghelp.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HookChrome::HookChrome(void):
  hooked(false) {
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HookChrome::~HookChrome(void) {
}

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
-----------------------------------------------------------------------------*/
void HookChrome::InstallHooks(void) {
  return;
  if (!hooked) {
    WptTrace(loglevel::kFunction,_T("[wpthook] - HookChrome::InstallHooks\n"));

    bool dll_loaded = false;
    MODULEENTRY32 dll;
    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE, 
                                                GetCurrentProcessId());
    if (snap != INVALID_HANDLE_VALUE) {
      MODULEENTRY32 module;
      module.dwSize = sizeof(module);
      if (Module32First(snap, &module)) {
        do {
          if (!lstrcmpi(module.szModule, _T("chrome.dll"))) {
            dll_loaded = true;
            memcpy(&dll, &module, sizeof(dll));
          }
        } while(!dll_loaded && Module32Next(snap, &module));
      }
      CloseHandle(snap);
    }

    if (dll_loaded) {
      DWORD64 mod = SymLoadModuleEx(GetCurrentProcess(), NULL, 
                        CT2A(dll.szExePath), NULL, 
                        (DWORD64)dll.modBaseAddr, dll.modBaseSize, NULL, 0);
      if (mod) {
        hooked = true;
        // just dump all of the symbols for testing :-)
/*        if (SymEnumSymbols(GetCurrentProcess(), mod, "*", EnumSymProc, NULL)) {
          WptTrace(_T("[wpthook] - done enumerating symbols\n"));
        } else {
          WptTrace(_T("[wpthook] - Error enumerating symbols: 0x%08X\n"), GetLastError());
        }
*/

        SymUnloadModule64(GetCurrentProcess(), mod);
      } else {
        WptTrace(loglevel::kError, 
                    _T("[wpthook] - error loading symbols for chrome.dll\n"));
      }
    } else {
      WptTrace(loglevel::kError, _T("[wpthook] - Chrome.dll not loaded\n"));
    }

    WptTrace(loglevel::kFunction, _T("[wpthook] - HookChrome::InstallHooks done\n"));
  }
}