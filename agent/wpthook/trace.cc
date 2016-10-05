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
Trace::Trace(void):gz_file_(NULL) {
  InitializeCriticalSection(&cs_);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Trace::~Trace(void) {
  DeleteCriticalSection(&cs_);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Trace::Start(CString file) {
  End();
  EnterCriticalSection(&cs_);
  file_ = file;
  LeaveCriticalSection(&cs_);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Trace::End() {
  EnterCriticalSection(&cs_);
  if (gz_file_) {
    gzwrite(gz_file_, (voidpc)"\n]}", 3);
    gzclose(gz_file_);
    gz_file_ = NULL;
  }
  file_.Empty();
  LeaveCriticalSection(&cs_);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Trace::AddEvents(CStringA data) {
  EnterCriticalSection(&cs_);
  data.Trim("[],\n");
  if (data.GetLength()) {
    bool first = false;
    if (!gz_file_ && !file_.IsEmpty()) {
      first = true;
      gz_file_ = gzopen((LPCSTR)CT2A(file_ + _T(".gz")), "wb6");
      if (gz_file_) {
        CStringA header = "{\"traceEvents\": [\n";
        gzwrite(gz_file_, (voidpc)(LPCSTR)header, (unsigned int)header.GetLength());
      }
    }
    if (gz_file_) {
      if (!first)
        gzwrite(gz_file_, (voidpc)",\n", 2);
      gzwrite(gz_file_, (voidpc)(LPCSTR)data, (unsigned int)data.GetLength());
    }
  }
  LeaveCriticalSection(&cs_);
}
