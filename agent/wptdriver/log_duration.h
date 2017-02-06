/******************************************************************************
Copyright (c) 2017, Google Inc.
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
class LogDuration {
  public:
  LogDuration(LPCTSTR log_file, LPCSTR event_name):
    log_file_(log_file),
    event_name_(event_name) {
    QueryPerformanceCounter(&start_);
  }
  ~LogDuration() {Stop();}
  void Start() {
    QueryPerformanceCounter(&start_);
  }
  void Stop() {
    if (start_.QuadPart && !log_file_.IsEmpty() && !event_name_.IsEmpty()) {
      LARGE_INTEGER end, freq;
      QueryPerformanceCounter(&end);
      QueryPerformanceFrequency(&freq);
      DWORD elapsed_ms = (DWORD)((double)(end.QuadPart - start_.QuadPart) / ((double)freq.QuadPart / 1000.0));
      CStringA ms;
      ms.Format("%d", elapsed_ms);
      CStringA entry = event_name_ + "=" + ms + "\n";
      HANDLE hFile = CreateFile(log_file_, GENERIC_WRITE, FILE_SHARE_READ, 0, OPEN_ALWAYS, 0, 0);
      if (hFile != INVALID_HANDLE_VALUE) {
        SetFilePointer(hFile, 0, 0, FILE_END);
        DWORD written = 0;
        WriteFile(hFile, (LPCSTR)entry, entry.GetLength(), &written, 0);
        CloseHandle(hFile);
      }
    }
    start_.QuadPart = 0;
  }

 private:
  CString log_file_;
  CStringA event_name_;
  LARGE_INTEGER start_;
};

