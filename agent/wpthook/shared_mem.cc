#include "stdafx.h"
#include "shared_mem.h"

#pragma once
#pragma data_seg (".shared")
HHOOK	shared_hook_handle = 0;
WCHAR  shared_results_file_base[MAX_PATH] = {NULL};
DWORD  shared_test_timeout = 120000;
bool   shared_test_force_on_load = false;
bool   shared_cleared_cache = false;
WCHAR  shared_frame_window[200] = {NULL};
WCHAR  shared_browser_window[200] = {NULL};
#pragma data_seg ()

#pragma comment(linker,"/SECTION:.shared,RWS")

extern "C" {
__declspec( dllexport ) void WINAPI SetResultsFileBase(const WCHAR * file_base);
__declspec( dllexport ) void WINAPI SetTestTimeout(DWORD timeout);
__declspec( dllexport ) void WINAPI SetForceDocComplete(bool force);
__declspec( dllexport ) void WINAPI SetClearedCache(bool cleared_cache);
__declspec( dllexport ) void WINAPI SetBrowserFrame(const WCHAR * 
                                                                 frame_window);
__declspec( dllexport ) void WINAPI SetBrowserWindow(const WCHAR * 
                                                               browser_window);
}

/*-----------------------------------------------------------------------------
  Set the base file name to use for results files
-----------------------------------------------------------------------------*/
void WINAPI SetResultsFileBase(const WCHAR * file_base){
  lstrcpyW(shared_results_file_base, file_base);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WINAPI SetTestTimeout(DWORD timeout){
  shared_test_timeout = timeout;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WINAPI SetForceDocComplete(bool force){
  shared_test_force_on_load = force;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WINAPI SetClearedCache(bool cleared_cache) {
  shared_cleared_cache = cleared_cache;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WINAPI SetBrowserFrame(const WCHAR * frame_window) {
  lstrcpyW(shared_frame_window, frame_window);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WINAPI SetBrowserWindow(const WCHAR * browser_window) {
  lstrcpyW(shared_browser_window, browser_window);
}
