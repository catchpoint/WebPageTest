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
#include "shared_mem.h"
#include "wpthook_dll.h"

#pragma once
#pragma data_seg (".shared")
HHOOK shared_hook_handle = 0;
WCHAR shared_results_file_base[MAX_PATH] = {NULL};
DWORD shared_test_timeout = 120000;
bool  shared_cleared_cache = false;
DWORD shared_current_run = 0;
WCHAR shared_log_file[MAX_PATH] = {NULL};
int   shared_debug_level = 0;
int   shared_cpu_utilization = 0;
bool  shared_has_gpu = false;
int   shared_result = -1;
WCHAR shared_browser_exe[MAX_PATH] = {NULL};
DWORD shared_browser_process_id = 0;
bool  shared_overrode_ua_string = false;
#pragma data_seg ()

#pragma comment(linker,"/SECTION:.shared,RWS")

/*-----------------------------------------------------------------------------
  Set the base file name to use for results files
-----------------------------------------------------------------------------*/
void WINAPI SetResultsFileBase(const WCHAR * file_base) {
  lstrcpyW(shared_results_file_base, file_base);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WINAPI SetTestTimeout(DWORD timeout) {
  shared_test_timeout = timeout;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WINAPI SetClearedCache(bool cleared_cache) {
  shared_cleared_cache = cleared_cache;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WINAPI GetClearedCache() {
  return shared_cleared_cache;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WINAPI SetCurrentRun(DWORD run) {
  shared_current_run = run;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WINAPI SetHasGPU(bool has_gpu) {
  shared_has_gpu = has_gpu;
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WINAPI SetDebugLevel(int level, const WCHAR * log_file) {
  shared_debug_level = level;
  lstrcpyW(shared_log_file, log_file);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int WINAPI GetCPUUtilization() {
  return shared_cpu_utilization;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WINAPI SetCPUUtilization(int utilization) {
  shared_cpu_utilization = utilization;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WINAPI ResetTestResult() {
  shared_result = -1;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int WINAPI GetTestResult() {
  return shared_result;
}

/*-----------------------------------------------------------------------------
  Set the exe name for the browser we are currently using
-----------------------------------------------------------------------------*/
void WINAPI SetBrowserExe(const WCHAR * exe) {
  if (exe)
    lstrcpyW(shared_browser_exe, exe);
  else
    lstrcpyW(shared_browser_exe, L"");
  shared_browser_process_id = 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
DWORD WINAPI GetBrowserProcessId() {
  return shared_browser_process_id;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WINAPI SetOverrodeUAString(bool overrode_ua_string) {
  shared_overrode_ua_string = overrode_ua_string;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WINAPI GetOverrodeUAString() {
  return shared_overrode_ua_string;
}

