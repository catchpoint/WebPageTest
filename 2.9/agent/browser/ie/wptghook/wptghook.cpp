// wptghook.cpp : Defines the exported functions for the DLL application.
//

#include "stdafx.h"
#include "hook_gdi.h"
#include <Shlwapi.h>

#pragma data_seg (".shared")
HWND  gdi_window = NULL;
bool  gdi_window_updated = false;
HWND  gdi_notify = NULL;
UINT  gdi_notify_msg = 0;
#pragma data_seg ()

HMODULE hDll = NULL;
HHOOK   hHook = NULL;
CGDIHook * gdiHook = NULL;
bool hooked = false;

#pragma comment(linker,"/SECTION:.shared,RWS")

extern "C" {
__declspec( dllexport ) void WINAPI InstallHook(void);
__declspec( dllexport ) void WINAPI RemoveHook(void);
__declspec( dllexport ) void WINAPI SetGDIWindow(HWND hWnd, HWND hNotify, UINT msgNotify);
__declspec( dllexport ) void WINAPI SetGDIWindowUpdated(bool updated);
__declspec( dllexport ) bool WINAPI GDIWindowUpdated(void);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LRESULT CALLBACK HookProc(int nCode, WPARAM wParam, LPARAM lParam) {
  if (!hooked) {
    hooked = true;

    // see if we actually want to inject into this process
    wchar_t process[MAX_PATH];
    if (GetModuleFileName(NULL, process, MAX_PATH)) {
      wchar_t * proc = PathFindFileName(process);
      if (!lstrcmpi(proc, L"chrome.exe")) {
        gdiHook = new CGDIHook;
      }
    }
  }

  return CallNextHookEx(NULL, nCode, wParam, lParam);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WINAPI InstallHook(void) {
  hHook = SetWindowsHookEx(WH_CALLWNDPROC, HookProc, hDll, 0);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WINAPI RemoveHook(void) {
  if (hHook)
    UnhookWindowsHookEx(hHook);
  hHook = NULL;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WINAPI SetGDIWindow(HWND hWnd, HWND hNotify, UINT msgNotify) {
  gdi_window = hWnd;
  gdi_notify = hNotify;
  gdi_notify_msg = msgNotify;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WINAPI SetGDIWindowUpdated(bool updated) {
  gdi_window_updated = updated;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WINAPI GDIWindowUpdated(void) {
  return gdi_window_updated;
}
