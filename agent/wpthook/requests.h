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
#include "request.h"

class TestState;
class TrackSockets;
class TrackDns;
class WptTest;

class Requests {
public:
  Requests(TestState& test_state, TrackSockets& sockets, TrackDns& dns,
            WptTest& test);
  ~Requests(void);

  void SocketClosed(DWORD socket_id);
  void DataIn(DWORD socket_id, DataChunk& chunk);
  bool ModifyDataOut(DWORD socket_id, DataChunk& chunk);
  void DataOut(DWORD socket_id, DataChunk& chunk);
  bool HasActiveRequest(DWORD socket_id);
  void Lock();
  void Unlock();
  void Reset();

  CAtlList<Request *>       _requests;        // all requests
  CAtlMap<DWORD, Request *> _active_requests; // requests indexed by socket

private:
  CRITICAL_SECTION  cs;
  TestState&        _test_state;
  TrackSockets&     _sockets;
  TrackDns&         _dns;
  WptTest&          _test;

  bool IsHttpRequest(const DataChunk& chunk) const;
  bool IsSpdyRequest(const DataChunk& chunk) const;

  // GetOrCreateRequest must be called within a critical section.
  Request * GetOrCreateRequest(DWORD socket_id, const DataChunk& chunk);
  Request * NewRequest(DWORD socket_id, bool is_spdy);
  Request * GetActiveRequest(DWORD socket_id);
};
