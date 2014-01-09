// wptglobal.cpp : Defines the exported functions for the DLL application.
//

#include "stdafx.h"
#include "wptglobal_dll.h"
#include "wptglobal.h"
#include "hook_angle.h"
#include "hook_dx9.h"

HINSTANCE global_dll_handle = NULL; // DLL handle
AngleHook * g_angle_hook = NULL;
Dx9Hook * g_dx9_hook = NULL;

/*-----------------------------------------------------------------------------
  Install the global hook
-----------------------------------------------------------------------------*/
BOOL WINAPI InstallGlobalHook() {
  BOOL ret = FALSE;
  TCHAR path[MAX_PATH];
  if (GetModuleFileName(global_dll_handle, path, _countof(path))) {
    TCHAR short_path[MAX_PATH];
    if (GetShortPathName(path, short_path, _countof(short_path))) {
      HKEY hKey;
		  if (RegCreateKeyEx(HKEY_LOCAL_MACHINE,
                         _T("SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion")
                         _T("\\Windows"),
                         0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS ) {
			  DWORD val = 1;
			  RegSetValueEx(hKey, _T("LoadAppInit_DLLs"), 0, REG_DWORD,
                      (const LPBYTE)&val, sizeof(val));
			  val = 0;
			  RegSetValueEx(hKey, _T("RequireSignedAppInit_DLLs"), 0, REG_DWORD,
                      (const LPBYTE)&val, sizeof(val));
			  RegSetValueEx(hKey, _T("AppInit_DLLs"), 0, REG_SZ,
                      (const LPBYTE)short_path,
                      (lstrlen(short_path) + 1) * sizeof(TCHAR));
        RegCloseKey(hKey);
        ret = TRUE;
      }
    }
  }
  return ret;
}

/*-----------------------------------------------------------------------------
  Remove the global hook
-----------------------------------------------------------------------------*/
BOOL WINAPI RemoveGlobalHook() {
  BOOL ret = FALSE;
  HKEY hKey;
	if (RegCreateKeyEx(HKEY_LOCAL_MACHINE,
                      _T("SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion")
                      _T("\\Windows"),
                      0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS ) {
    const TCHAR *short_path = _T("");
		RegSetValueEx(hKey, _T("AppInit_DLLs"), 0, REG_SZ,
                  (const LPBYTE)short_path,
                  (lstrlen(short_path) + 1) * sizeof(TCHAR));
    RegCloseKey(hKey);
    ret = TRUE;
  }
  return ret;
}

/*-----------------------------------------------------------------------------
  See if we need to start hooking
-----------------------------------------------------------------------------*/
bool Initialize() {
  bool should_load = false;
  static bool initialized = false;
  if (!initialized) {
    initialized = true;
    TCHAR exe[MAX_PATH];
    GetModuleFileName(NULL, exe, _countof(exe));
    _tcslwr_s(exe, _countof(exe));
    if (_tcsstr(exe, _T("chrome.exe")) &&
        _tcsstr(GetCommandLine(), _T("--type=gpu-process"))) {
      should_load = true;
      if (!g_angle_hook) {
        g_angle_hook = new AngleHook;
        g_angle_hook->Init();
      }
      if (!g_dx9_hook) {
        g_dx9_hook = new Dx9Hook;
        g_dx9_hook->Init();
      }
    } else if (_tcsstr(exe, _T("wptdriver.exe"))) {
      should_load = true;
    }
  }
  return should_load;
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
  if (g_dx9_hook) {
    g_dx9_hook->Unload();
    delete g_dx9_hook;
    g_dx9_hook = NULL;
  }
}
