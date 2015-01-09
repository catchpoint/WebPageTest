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
#include "dev_tools.h"

static const char * kTimelineEvent = "Timeline.eventRecorded";
static const char * kNetworkRequestStart = "Network.requestWillBeSent";

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
DevTools::DevTools(void):using_raw_events_(false) {
  InitializeCriticalSection(&cs_);
  QueryPerformanceCounter(&start_time_);
  LARGE_INTEGER freq;
  QueryPerformanceFrequency(&freq);
  counters_per_ms_ = (long double)freq.QuadPart / (long double)1000.0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
DevTools::~DevTools(void) {
  DeleteCriticalSection(&cs_);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void DevTools::Reset() {
  EnterCriticalSection(&cs_);
  events_.RemoveAll();
  LeaveCriticalSection(&cs_);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CStringA DevTools::GetTime() {
  CStringA ret = "";
  LARGE_INTEGER now;
  QueryPerformanceCounter(&now);
  if (now.QuadPart >= start_time_.QuadPart &&
      counters_per_ms_ > 0) {
    long double seconds = (long double)(now.QuadPart - start_time_.QuadPart) /
                          counters_per_ms_;
    ret.Format("%0.4lf", seconds);
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CStringA DevTools::GetUsedHeap() {
  CStringA ret = "";
  PROCESS_MEMORY_COUNTERS mem;
  if (GetProcessMemoryInfo(GetCurrentProcess(), &mem, sizeof(mem))) {
    DWORD used = (DWORD)mem.PagefileUsage;
    ret.Format("%lu", used);
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool DevTools::Write(CString file) {
  bool ok = false;
  EnterCriticalSection(&cs_);
  if (!events_.IsEmpty()) {
    HANDLE file_handle = CreateFile(file, GENERIC_WRITE, 0, 0,
                                    CREATE_ALWAYS, 0, 0);
    if (file_handle != INVALID_HANDLE_VALUE) {
      DWORD bytes_written;
      ok = true;
      bool first = true;
      WriteFile(file_handle, "[", 1, &bytes_written, 0);
      POSITION pos = events_.GetHeadPosition();
      while (pos) {
        CStringA event_string = events_.GetNext(pos);
        if (event_string.GetLength()) {
          if (!first)
            WriteFile(file_handle, ",", 1, &bytes_written, 0);
          WriteFile(file_handle, (LPCSTR)event_string,
                    event_string.GetLength(), &bytes_written, 0);
          first = false;
        }
      }
      WriteFile(file_handle, "]", 1, &bytes_written, 0);
      CloseHandle(file_handle);
    }
  }
  LeaveCriticalSection(&cs_);
  return ok;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void DevTools::AddEvent(LPCSTR method, CStringA data, bool at_head) {
  EnterCriticalSection(&cs_);
  if (!using_raw_events_) {
    CStringA event_string = "{\"method\":\"";
    event_string += method;
    event_string += "\",\"params\":";
    event_string += data;
    event_string += "}";
    if (at_head)
      events_.AddHead(event_string);
    else
      events_.AddTail(event_string);
  }
  LeaveCriticalSection(&cs_);
}

/*-----------------------------------------------------------------------------
  Put an empty event at the beginning of the event stream to set a baseline
  start time.
-----------------------------------------------------------------------------*/
void DevTools::SetStartTime(LARGE_INTEGER &start_time) {
  if (!using_raw_events_) {
    if (start_time.QuadPart >= start_time_.QuadPart &&
        counters_per_ms_ > 0) {
      long double seconds = (long double)(start_time.QuadPart -
                                          start_time_.QuadPart) /
                            counters_per_ms_;
      CStringA timestamp;
      timestamp.Format("%0.4lf", seconds);
      CStringA event_string = "{\"record\":{\"startTime\":";
      event_string += timestamp;
      event_string += ",\"data\":{},\"children\":[],\"endTime\":";
      event_string += timestamp;
      event_string += ",\"type\":\"Program\"}}";
      AddEvent(kTimelineEvent, event_string, true);
    }
  }
}

/*-----------------------------------------------------------------------------
  Request start should generate 2 events:
  - a timeline ResourceSendRequest
  - a network requestWillBeSent event
-----------------------------------------------------------------------------*/
void DevTools::RequestStart(double id, CStringA pageUrl, CStringA url,
                            CStringA method, CAtlArray<CString> &headers) {
  if (!using_raw_events_) {
    CStringA timestamp = GetTime();
    CStringA event_string;
    event_string.Format("{\"requestId\":\"%0.1f\",\"frameId\":\"0\",", id);
    event_string += "\"documentURL\":\"";
    event_string += JSONEscapeA(pageUrl);
    event_string += "\",\"request\":{\"url\":\"";
    event_string += JSONEscapeA(url);
    event_string += "\",\"method\":\"";
    event_string += JSONEscapeA(method);
    event_string += "\"";
    if (!headers.IsEmpty()) {
      event_string += ",\"headers\":{";
      // TODO: add header processing
      event_string += "}";
    }
    event_string += "},\"timestamp\":";
    event_string += timestamp;
    event_string += ",\"initiator\":{\"type\":\"other\"}}";
    AddEvent(kNetworkRequestStart, event_string);
  }
}

/*-----------------------------------------------------------------------------
  Add raw dev tools events from a webkit browser that supports them.
  This disables the synthetic events and just records whatever the browser
  provides;
-----------------------------------------------------------------------------*/
void DevTools::AddRawEvents(CStringA data) {
  EnterCriticalSection(&cs_);
  if (!using_raw_events_) {
    events_.RemoveAll();
    using_raw_events_ = true;
  }
  events_.AddTail(data);
  LeaveCriticalSection(&cs_);
}