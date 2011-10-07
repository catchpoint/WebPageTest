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

class DataChunk;
class Requests;
class TestState;
struct PRFileDesc;

class SocketInfo {
public:
  SocketInfo():
    _id(0)
    , _accounted_for(false)
    , _during_test(false)
    , _is_ssl(false) {
    memset(&_addr, 0, sizeof(_addr));
    _connect_start.QuadPart = 0;
    _connect_end.QuadPart = 0;
    _ssl_start.QuadPart = 0;
    _ssl_end.QuadPart = 0;
  }
  ~SocketInfo(void){}

  bool IsLocalhost();

  DWORD               _id;
  struct sockaddr_in  _addr;
  bool                _accounted_for;
  bool                _during_test;
  bool                _is_ssl;
  LARGE_INTEGER       _connect_start;
  LARGE_INTEGER       _connect_end;
  LARGE_INTEGER       _ssl_start;
  LARGE_INTEGER       _ssl_end;
};

class TrackSockets {
public:
  TrackSockets(Requests& requests, TestState& test_state);
  ~TrackSockets(void);

  void Create(SOCKET s);
  void Close(SOCKET s);
  void Connect(SOCKET s, const struct sockaddr FAR * name, int namelen);
  void Connected(SOCKET s);
  void Bind(SOCKET s, const struct sockaddr FAR * name, int namelen);
  void DataIn(SOCKET s, DataChunk& chunk);
  bool ModifyDataOut(SOCKET s, DataChunk& chunk);
  void DataOut(SOCKET s, DataChunk& chunk);

  bool IsSsl(SOCKET s);
  bool IsSslById(DWORD socket_id);
  void SetSslFd(PRFileDesc* fd);
  void ClearSslFd(PRFileDesc* fd);
  void SetSslSocket(SOCKET s);
  bool SslSocketLookup(PRFileDesc* fd, SOCKET& s);
  void SslSendActivity(SOCKET s);
  void SslRecvActivity(SOCKET s);

  void Reset();

  SocketInfo* GetSocketInfo(SOCKET s, bool lookup_peer = true);
  SocketInfo* GetSocketInfoById(DWORD socket_id);

  bool ClaimConnect(DWORD socket_id, LONGLONG before, LONGLONG& start,
                    LONGLONG& end, LONGLONG& ssl_start, LONGLONG& ssl_end);
  ULONG GetPeerAddress(DWORD socket_id);

private:
  CRITICAL_SECTION cs;
  Requests&                   _requests;
  TestState&                  _test_state;
  DWORD	_nextSocketId;	// ID to assign to the next socket
  CAtlMap<SOCKET, DWORD>	    _openSockets;
  CAtlMap<DWORD, SocketInfo*>  _socketInfo;

  PRFileDesc* _last_ssl_fd;
  CAtlMap<PRFileDesc*, SOCKET>   _ssl_sockets;
};
