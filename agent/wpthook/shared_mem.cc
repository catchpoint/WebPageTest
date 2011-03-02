#include "stdafx.h"
#include "shared_mem.h"

#pragma once
#pragma data_seg (".shared")
HHOOK	shared_hook_handle = 0;
WCHAR  shared_results_file_base[MAX_PATH] = {NULL};
DWORD  shared_test_timeout = 120000;
bool   shared_test_force_on_load = false;
#pragma data_seg ()

#pragma comment(linker,"/SECTION:.shared,RWS")

extern "C" {
__declspec( dllexport ) void WINAPI SetResultsFileBase(const WCHAR * file_base);
__declspec( dllexport ) void WINAPI SetTestTimeout(DWORD timeout);
__declspec( dllexport ) void WINAPI SetForceDocComplete(bool force);
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
