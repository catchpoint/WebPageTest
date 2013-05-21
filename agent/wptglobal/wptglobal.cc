// wptglobal.cpp : Defines the exported functions for the DLL application.
//

#include "stdafx.h"
#include "wptglobal_dll.h"
#include "wptglobal.h"
#include "hook_angle.h"

HINSTANCE global_dll_handle = NULL; // DLL handle
HHOOK     global_hook = NULL;
AngleHook * g_angle_hook = NULL;

/*-----------------------------------------------------------------------------
  Dummy hook proc (pass-through) since we don't care about actually hooking
  messages.
-----------------------------------------------------------------------------*/
LRESULT CALLBACK HookProc(int code, WPARAM wParam, LPARAM lParam) {
  return CallNextHookEx(global_hook, code, wParam, lParam);
}

/*-----------------------------------------------------------------------------
  Install the global message hook
-----------------------------------------------------------------------------*/
BOOL WINAPI InstallGlobalHook() {
  BOOL ret = FALSE;
  if (!global_hook)
    global_hook = SetWindowsHookEx(WH_CBT, HookProc,
                                   global_dll_handle, 0);
  return (global_hook != NULL);
}

/*-----------------------------------------------------------------------------
  Remove the global message hook
-----------------------------------------------------------------------------*/
BOOL WINAPI RemoveGlobalHook() {
  BOOL ret = FALSE;
  if (global_hook)
    ret = UnhookWindowsHookEx(global_hook);
  global_hook = NULL;
  return ret;
}

/*-----------------------------------------------------------------------------
  See if we need to start hooking
-----------------------------------------------------------------------------*/
void Initialize() {
  static bool initialized = false;
  if (!initialized) {
    initialized = true;
    TCHAR exe[MAX_PATH];
    GetModuleFileName(NULL, exe, _countof(exe));
    _tcslwr_s(exe, _countof(exe));
    if (_tcsstr(exe, _T("chrome.exe")) &&
        _tcsstr(GetCommandLine(), _T("--type=gpu-process"))) {
      if (!g_angle_hook) {
        g_angle_hook = new AngleHook;
        g_angle_hook->Init();
      }
    }
  }
}

/*-----------------------------------------------------------------------------
  See if we need to remove our hooks
-----------------------------------------------------------------------------*/
void Unload() {
  if (g_angle_hook) {
    g_angle_hook->Unload();
    delete g_angle_hook;
    g_angle_hook = NULL;
  }
}
