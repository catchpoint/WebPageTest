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

#include "StdAfx.h"
#include "requests.h"
#include "test_state.h"
#include "track_dns.h"
#include "track_sockets.h"
#include "../wptdriver/wpt_test.h"


const char * HTTP_METHODS[] = {"GET ", "HEAD ", "POST ", "PUT ", "OPTIONS ",
                               "DELETE ", "TRACE ", "CONNECT ", "PATCH "};

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Requests::Requests(TestState& test_state, TrackSockets& sockets,
                    TrackDns& dns, WptTest& test):
  _test_state(test_state)
  , _sockets(sockets)
  , _dns(dns)
  , _test(test) {
  _active_requests.InitHashTable(257);
  InitializeCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Requests::~Requests(void) {
  Reset();

  DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Requests::Reset() {
  EnterCriticalSection(&cs);
  _active_requests.RemoveAll();
  while (!_requests.IsEmpty())
    delete _requests.RemoveHead();
  browser_request_data_.RemoveAll();
  LeaveCriticalSection(&cs);
  _sockets.Reset();
  _dns.Reset();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Requests::Lock() {
  EnterCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Requests::Unlock() {
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Requests::SocketClosed(DWORD socket_id) {
  EnterCriticalSection(&cs);
  Request * request = NULL;
  if (_active_requests.Lookup(socket_id, request) && request) {
    _test_state.ActivityDetected();
    request->SocketClosed();
    _active_requests.RemoveKey(socket_id);
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Requests::DataIn(DWORD socket_id, DataChunk& chunk) {
  if (_test_state._active) {
    _test_state.ActivityDetected();
    EnterCriticalSection(&cs);
    // See if socket maps to a known request.
    Request * request = NULL;
    if (_active_requests.Lookup(socket_id, request) && request) {
      _test_state._bytes_in_bandwidth += chunk.GetLength();
      request->DataIn(chunk);
      WptTrace(loglevel::kFunction, 
               _T("[wpthook] - Requests::DataIn(socket_id=%d, len=%d)"),
               socket_id, chunk.GetLength());
    } else {
      WptTrace(loglevel::kFrequentEvent,
               _T("[wpthook] - Requests::DataIn(socket_id=%d, len=%d)")
               _T("   not associated with a known request"),
               socket_id, chunk.GetLength());
    }
    LeaveCriticalSection(&cs);
  }
}

/*-----------------------------------------------------------------------------
  Allow data to be modified.
-----------------------------------------------------------------------------*/
bool Requests::ModifyDataOut(DWORD socket_id, DataChunk& chunk) {
  bool is_modified = false;
  if (_test_state._active) {
    _test_state.ActivityDetected();
    EnterCriticalSection(&cs);
    Request * request = GetOrCreateRequest(socket_id, chunk);
    if (request) {
      is_modified = request->ModifyDataOut(chunk);
    } else {
      is_modified = chunk.ModifyDataOut(_test);
    }
    WptTrace(loglevel::kFunction,
        _T("[wpthook] Requests::ModifyDataOut(socket_id=%d, len=%d) -> %d"),
        socket_id, chunk.GetLength(), is_modified);
    LeaveCriticalSection(&cs);
  }
  return is_modified;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Requests::DataOut(DWORD socket_id, DataChunk& chunk) {
  if (_test_state._active) {
    _test_state.ActivityDetected();
    EnterCriticalSection(&cs);
    Request * request = GetOrCreateRequest(socket_id, chunk);
    if (request) {
      request->DataOut(chunk);
      WptTrace(loglevel::kFunction, 
               _T("[wpthook] - Requests::DataOut(socket_id=%d, len=%d)"),
               socket_id, chunk.GetLength());
    } else {
      WptTrace(loglevel::kFrequentEvent, 
               _T("[wpthook] - Requests::DataOut(socket_id=%d, len=%d)")
               _T("  Non-HTTP traffic detected"),
               socket_id, chunk.GetLength());
    }
    LeaveCriticalSection(&cs);
  }
}

/*-----------------------------------------------------------------------------
  A request is "active" once it is created by calling DataOut/DataIn.
-----------------------------------------------------------------------------*/
bool Requests::HasActiveRequest(DWORD socket_id) {
  return GetActiveRequest(socket_id) != NULL;
}

/*-----------------------------------------------------------------------------
  See if the beginning of the bugger matches any known HTTP method
  TODO: See if there is a more reliable way to detect HTTP traffic
-----------------------------------------------------------------------------*/
bool Requests::IsHttpRequest(const DataChunk& chunk) const {
  bool ret = false;
  for (int i = 0; i < _countof(HTTP_METHODS) && !ret; i++) {
    const char * method = HTTP_METHODS[i];
    unsigned long method_len = strlen(method);
    if (chunk.GetLength() >= method_len &&
        !memcmp(chunk.GetData(), method, method_len)) {
      ret = true;
    }
  }
  return ret;
}

/*-----------------------------------------------------------------------------
  This must always be called from within a critical section.
-----------------------------------------------------------------------------*/
bool Requests::IsSpdyRequest(const DataChunk& chunk) const {
  bool is_spdy = false;
  const char *buf = chunk.GetData();
  if (chunk.GetLength() >= 8) {
    is_spdy = buf[0] == '\x80' && buf[1] == '\x02';  // SPDY control frame
  }
  return is_spdy;
}


 /*-----------------------------------------------------------------------------
   Find an existing request, or create a new one if appropriate.
 -----------------------------------------------------------------------------*/
Request * Requests::GetOrCreateRequest(DWORD socket_id,
                                       const DataChunk& chunk) {
  Request * request = NULL;
  if (_active_requests.Lookup(socket_id, request) && request) {
    // We have an existing request on this socket, however, if data has been
    // received already, then this may be a new request.
    if (!request->_is_spdy && request->_response_data.GetDataSize() &&
        IsHttpRequest(chunk)) {
      request = NewRequest(socket_id, false);
    }
  } else {
    bool is_spdy = IsSpdyRequest(chunk);
    if (is_spdy || IsHttpRequest(chunk)) {
      request = NewRequest(socket_id, is_spdy);
    }
  }
  return request;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Request * Requests::NewRequest(DWORD socket_id, bool is_spdy) {
  Request * request = new Request(_test_state, socket_id, _sockets, _dns,
                                  _test, is_spdy, *this);
  _active_requests.SetAt(socket_id, request);
  _requests.AddTail(request);
  return request;
}

/*-----------------------------------------------------------------------------
  A request is "active" once it is created by calling DataOut/DataIn.
-----------------------------------------------------------------------------*/
Request * Requests::GetActiveRequest(DWORD socket_id) {
  Request * request = NULL;
  _active_requests.Lookup(socket_id, request);
  return request;
}

/*-----------------------------------------------------------------------------
  Request information passed in from a browser-specific extension
  For now this is only Chrome and we only use it to get the initiator 
  information
-----------------------------------------------------------------------------*/
void Requests::ProcessBrowserRequest(CString request_data) {
  CString browser, url, initiator, initiator_line, initiator_column;
  bool processing_values = true;
  int position = 0;
  CString line = request_data.Tokenize(_T("\n"), position);
  while (position >= 0) {
    if (processing_values) {
      if (!line.Left(1).Compare(_T("["))) {
        processing_values = false;
      } else {
        int separator = line.Find(_T('='));
        if (separator > 0) {
          CString key = line.Left(separator).Trim();
          CString value = line.Mid(separator + 1).Trim();
          if (key.GetLength() && value.GetLength()) {
            if (!key.CompareNoCase(_T("browser"))) {
              browser = value;
            } else if (!key.CompareNoCase(_T("url"))) {
              url = value;
            } else if (!key.CompareNoCase(_T("initiatorUrl"))) {
              initiator = value;
            } else if (!key.CompareNoCase(_T("initiatorLineNumber"))) {
              initiator_line = value;
            } else if (!key.CompareNoCase(_T("initiatorColumnNumber"))) {
              initiator_column = value;
            }
          }
        }
      }
    }
    line = request_data.Tokenize(_T("\n"), position);
  }
  if (url.GetLength() && initiator.GetLength()) {
    BrowserRequestData data(url);
    data.initiator_ = initiator;
    data.initiator_line_ = initiator_line;
    data.initiator_column_ = initiator_column;
    EnterCriticalSection(&cs);
    browser_request_data_.AddTail(data);
    LeaveCriticalSection(&cs);
  }
}

/*-----------------------------------------------------------------------------
  Get the browser request information from the URL and optionally remove it
  from the list (claiming it)
-----------------------------------------------------------------------------*/
bool Requests::GetBrowserRequest(BrowserRequestData &data, bool remove) {
  bool found = false;

  EnterCriticalSection(&cs);
  POSITION pos = browser_request_data_.GetHeadPosition();
  while (pos && !found) {
    POSITION current_pos = pos;
    BrowserRequestData browser_data = browser_request_data_.GetNext(pos);
    if (!browser_data.url_.Compare(data.url_)) {
      found = true;
      data = browser_data;
      if (remove) {
        browser_request_data_.RemoveAt(current_pos);
      }
    }
  }
  browser_request_data_.AddTail(data);
  LeaveCriticalSection(&cs);

  return found;
}