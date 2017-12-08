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

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SharedMem::SharedMem(bool create):
  file_mapping_(NULL)
  , shared_(NULL) {
  LPCTSTR MAP_FILE_NAME = _T("Local\\WebPageTestSharedMemory");
  if (create) {
    file_mapping_ = CreateFileMapping(INVALID_HANDLE_VALUE, NULL,
                                      PAGE_READWRITE, 0, sizeof(WPT_SHARED_MEM),
                                      MAP_FILE_NAME);
    if (file_mapping_) {
      shared_ = (WPT_SHARED_MEM *)MapViewOfFile(file_mapping_,
                                                FILE_MAP_ALL_ACCESS, 0, 0,
                                                sizeof(WPT_SHARED_MEM));
      if (shared_) {
        // Initialize all of the values
        shared_->results_file_base[0] = NULL;
        shared_->test_timeout = 120000;
        shared_->cleared_cache = false;
        shared_->current_run = 0;
        shared_->cpu_utilization = 0;
        shared_->has_gpu = false;
        shared_->result = -1;
        shared_->browser_exe[0] = NULL;
        shared_->browser_process_id = 0;
        shared_->overrode_ua_string = false;
      }
    }
  } else {
    file_mapping_ = OpenFileMapping(FILE_MAP_ALL_ACCESS, FALSE, MAP_FILE_NAME);
    if (file_mapping_) {
      shared_ = (WPT_SHARED_MEM *)MapViewOfFile(file_mapping_,
                                                FILE_MAP_ALL_ACCESS, 0, 0,
                                                sizeof(WPT_SHARED_MEM));
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SharedMem::~SharedMem() {
  if (shared_)
    UnmapViewOfFile(shared_);
  if (file_mapping_)
    CloseHandle(file_mapping_);
}

