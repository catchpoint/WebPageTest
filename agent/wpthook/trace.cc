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
#include "rapidjson/document.h"
#include <zlib.h>

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Trace::Trace(void) {
  InitializeCriticalSection(&cs_);
  Reset();
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
  processed_ = false;
  LeaveCriticalSection(&cs_);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool Trace::Write(CString file) {
  bool ok = false;
  EnterCriticalSection(&cs_);
  if (!events_.IsEmpty()) {
    gzFile dst = gzopen((LPCSTR)CT2A(file + _T(".gz")), "wb9");
    if (dst) {
      ok = true;
      bool first = true;
      CStringA event_string = "{\"traceEvents\": [\n";
      gzwrite(dst, (voidpc)(LPCSTR)event_string, (unsigned int)event_string.GetLength());
      POSITION pos = events_.GetHeadPosition();
      while (pos) {
        event_string = events_.GetNext(pos);
        event_string.Trim("[],\n");
        if (event_string.GetLength()) {
          if (!first)
            event_string = CStringA(",\n") + event_string;
          first = false;
          gzwrite(dst, (voidpc)(LPCSTR)event_string, (unsigned int)event_string.GetLength());
        }
      }
      event_string = "\n]}";
      gzwrite(dst, (voidpc)(LPCSTR)event_string, (unsigned int)event_string.GetLength());
      gzclose(dst);
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
