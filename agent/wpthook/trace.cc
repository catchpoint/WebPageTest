/******************************************************************************
Copyright (c) 2013, Google Inc.
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
#include "StdAfx.h"
#include "trace.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Trace::Trace(void) {
  InitializeCriticalSection(&cs_);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Trace::~Trace(void) {
  DeleteCriticalSection(&cs_);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Trace::Reset() {
  EnterCriticalSection(&cs_);
  events_.RemoveAll();
  LeaveCriticalSection(&cs_);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool Trace::Write(CString file) {
  bool ok = false;
  EnterCriticalSection(&cs_);
  if (!events_.IsEmpty()) {
    HANDLE file_handle = CreateFile(file, GENERIC_WRITE, 0, 0,
                                    CREATE_ALWAYS, 0, 0);
    if (file_handle != INVALID_HANDLE_VALUE) {
      DWORD bytes_written;
      ok = true;
      bool first = true;
      CStringA event_string = "{\"traceEvents\": [";
      WriteFile(file_handle, (LPCSTR)event_string, event_string.GetLength(), &bytes_written, 0);
      POSITION pos = events_.GetHeadPosition();
      while (pos) {
        event_string = events_.GetNext(pos);
        event_string.Trim("[]");
        if (event_string.GetLength()) {
          if (first)
            first = false;
          else
            event_string = CStringA(",") + event_string;
          WriteFile(file_handle, (LPCSTR)event_string,
                    event_string.GetLength(), &bytes_written, 0);
        }
      }
      event_string = "]}";
      WriteFile(file_handle, (LPCSTR)event_string, event_string.GetLength(), &bytes_written, 0);
      CloseHandle(file_handle);
    }
  }
  LeaveCriticalSection(&cs_);
  return ok;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Trace::AddEvents(CStringA data) {
  EnterCriticalSection(&cs_);
  events_.AddTail(data);
  LeaveCriticalSection(&cs_);
}
