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
#pragma once

/*-----------------------------------------------------------------------------
  Shared memory structure
-----------------------------------------------------------------------------*/
#pragma pack(push, 8)
typedef struct {
  WCHAR  results_file_base[MAX_PATH];
  DWORD  test_timeout;
  bool   cleared_cache;
  DWORD  current_run;
  long   cpu_utilization;
  bool   has_gpu;
  long   result;
  WCHAR  browser_exe[MAX_PATH];
  DWORD  browser_process_id;
  bool   overrode_ua_string;
} WPT_SHARED_MEM;
#pragma pack(pop)

class SharedMem {
public:
  SharedMem(bool create);
  ~SharedMem();

  bool connected() {return shared_ != NULL;}

  void SetResultsFileBase(const WCHAR * file_base) {
    if (shared_)
      lstrcpyW(shared_->results_file_base, file_base ? file_base : L"");
  }
  const WCHAR * ResultsFileBase() {return shared_ ? shared_->results_file_base : L"";}

  void SetTestTimeout(DWORD timeout) {
    if (shared_)
      shared_->test_timeout = timeout;
  }
  DWORD TestTimeout() {return shared_ ? shared_->test_timeout : 120000;}

  void SetClearedCache(bool cleared_cache) {
    if (shared_)
      shared_->cleared_cache = cleared_cache;
  }
  bool ClearedCache() {return shared_ ? shared_->cleared_cache : false;}

  void SetCurrentRun(DWORD run) {
    if (shared_)
      shared_->current_run = run;
  }
  DWORD CurrentRun() {return shared_ ? shared_->current_run : 0;}

  void SetHasGPU(bool has_gpu){
    if (shared_)
      shared_->has_gpu = has_gpu;
  }
  bool HasGPU() {return shared_ ? shared_->has_gpu : false;}

  void SetCPUUtilization(int utilization) {
    if (shared_)
      shared_->cpu_utilization = utilization;
  }
  int CPUUtilization() {return shared_ ? shared_->cpu_utilization : 0;}

  void SetTestResult(int result) {
    if (shared_)
      shared_->result = result;
  }
  void ResetTestResult(){SetTestResult(-1);}
  int TestResult() {return shared_ ? shared_->result : -1;}

  void SetBrowserExe(const WCHAR * exe) {
    if (shared_) {
      lstrcpyW(shared_->browser_exe, exe ? exe : L"");
      shared_->browser_process_id = 0;
    }
  }
  const WCHAR * BrowserExe() {return shared_ ? shared_->browser_exe : L"";}

  void SetBrowserProcessId(DWORD pid) {
    if (shared_)
      shared_->browser_process_id = pid;
  }
  DWORD BrowserProcessId() {return shared_ ? shared_->browser_process_id : 0;}

  void SetOverrodeUAString(bool overrode_ua_string) {
    if (shared_)
      shared_->overrode_ua_string = overrode_ua_string;
  }
  bool OverrodeUAString() {return shared_ ? shared_->overrode_ua_string : false;}

private:
  WPT_SHARED_MEM *shared_;
  HANDLE file_mapping_;
};