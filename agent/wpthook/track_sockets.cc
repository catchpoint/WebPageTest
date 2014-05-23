
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
#include "track_sockets.h"
#include "requests.h"
#include "test_state.h"
#include "../wptdriver/wpt_test.h"

const DWORD LOCALHOST = 0x0100007F; // 127.0.0.1

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool SocketInfo::IsLocalhost() {
  return _addr.sin_addr.S_un.S_addr == LOCALHOST;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
TrackSockets::TrackSockets(Requests& requests,
    TestState& test_state, WptTest& test):
  _nextSocketId(1)
  , _requests(requests)
  , _test_state(test_state)
  , _test(test) {
  InitializeCriticalSection(&cs);
  _openSockets.InitHashTable(257);
  _socketInfo.InitHashTable(257);
  _ssl_sockets.InitHashTable(257);
  _last_ssl_fd.InitHashTable(257);
  ipv4_rtt_.InitHashTable(257);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
TrackSockets::~TrackSockets(void) {
  Reset();
  DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackSockets::Create(SOCKET s) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackSockets::Close(SOCKET s) {
  DWORD socket_id = 0;

  EnterCriticalSection(&cs);
  _openSockets.Lookup(s, socket_id);
  _openSockets.RemoveKey(s);
  LeaveCriticalSection(&cs);

  if (socket_id)
    _requests.SocketClosed(socket_id);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackSockets::Connect(SOCKET s, const struct sockaddr FAR * name, 
                            int namelen) {
  WptTrace(loglevel::kFunction, 
            _T("[wpthook] - TrackSockets::Connect(%d)\n"), s);

  // We only care about IP sockets at this point.
  if (name->sa_family == AF_INET6) {
    WptTrace(
        loglevel::kFunction, 
        _T("[wpthook] - TrackSockets::Connect: Warning: IPv6 unsupported!\n"));
  }
  if (namelen >= sizeof(struct sockaddr_in) && name->sa_family == AF_INET) {
    struct sockaddr_in* ip_name = (struct sockaddr_in *)name;
    bool localhost = false;

    EnterCriticalSection(&cs);
    SocketInfo* info = GetSocketInfo(s, false);
    memcpy(&info->_addr, ip_name, sizeof(struct sockaddr_in));
    QueryPerformanceCounter(&info->_connect_start);
    localhost = info->IsLocalhost();
    LeaveCriticalSection(&cs);

    if (!localhost) {
      _test.OverridePort(name, namelen);
      _test_state.ActivityDetected();
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackSockets::Connected(SOCKET s) {
  DWORD socket_id = 0;
  _openSockets.Lookup(s, socket_id);
  if (socket_id) {
    bool localhost = false;
    struct sockaddr_in client;
    int addrlen = sizeof(client);
    int local_port = 0;
    if(getsockname(s, (struct sockaddr *)&client, &addrlen) == 0 &&
        client.sin_family == AF_INET &&
        addrlen == sizeof(client))
      local_port = ntohs(client.sin_port);

    WptTrace(loglevel::kFunction, 
              _T("[wpthook] - TrackSockets::Connected(%d) - Client port: %d\n"),
                 s, local_port);

    EnterCriticalSection(&cs);
    SocketInfo* info = GetSocketInfo(s);
    QueryPerformanceCounter(&info->_connect_end);
    if (info->_connect_start.QuadPart && 
        info->_connect_end.QuadPart && 
        info->_connect_end.QuadPart >= info->_connect_start.QuadPart) {
      DWORD elapsed = (DWORD)((info->_connect_end.QuadPart - 
                               info->_connect_start.QuadPart) / 
                               _test_state._ms_frequency.QuadPart);
      DWORD addr = info->_addr.sin_addr.S_un.S_addr;
      DWORD ms = -1;
      if (ipv4_rtt_.Lookup(addr, ms)) {
        if (elapsed < ms)
          ipv4_rtt_.SetAt(addr, elapsed);
      } else {
        ipv4_rtt_.SetAt(addr, elapsed);
      }
    }
    info->_local_port = local_port;
    localhost = info->IsLocalhost();
    LeaveCriticalSection(&cs);

    if (!localhost)
      _test_state.ActivityDetected();
  }
}

/*-----------------------------------------------------------------------------
  Allow data to be modified.
-----------------------------------------------------------------------------*/
bool TrackSockets::ModifyDataOut(SOCKET s, DataChunk& chunk,
                                 bool is_unencrypted) {
  bool is_modified = false;
  EnterCriticalSection(&cs);
  SocketInfo* info = GetSocketInfo(s);
  DWORD socket_id = info->_id;
  if (!info->IsLocalhost() && (is_unencrypted || !info->_is_ssl)) {
    is_modified = _requests.ModifyDataOut(socket_id, chunk);
  }
  LeaveCriticalSection(&cs);
  return is_modified;
}

/*-----------------------------------------------------------------------------
  Look up the socket ID (or create one if it doesn't already exist)
  and pass the data on to the request tracker
-----------------------------------------------------------------------------*/
void TrackSockets::DataOut(SOCKET s, DataChunk& chunk, bool is_unencrypted) {
  EnterCriticalSection(&cs);
  SocketInfo* info = GetSocketInfo(s);
  if (info->_connect_start.QuadPart && !info->_connect_end.QuadPart) {
    QueryPerformanceCounter(&info->_connect_end);
  }
  DWORD socket_id = info->_id;
  if (!info->IsLocalhost()) {
    if (_test_state._active && !is_unencrypted) {
      _test_state._bytes_out += chunk.GetLength();
      if (!_test_state._on_load.QuadPart)
        _test_state._doc_bytes_out += chunk.GetLength();
    }
    if (is_unencrypted || !info->_is_ssl) {
      _requests.DataOut(socket_id, chunk);
    } else {
      SslDataOut(info, chunk);
    }
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
  Look up the socket ID (or create one if it doesn't already exist)
  and pass the data on to the request tracker
-----------------------------------------------------------------------------*/
void TrackSockets::DataIn(SOCKET s, DataChunk& chunk, bool is_unencrypted) {
  EnterCriticalSection(&cs);
  SocketInfo* info = GetSocketInfo(s);
  DWORD socket_id = info->_id;
  if (!info->IsLocalhost()) {
    if (_test_state._active && !is_unencrypted) {
      _test_state._bytes_in_bandwidth += chunk.GetLength();
      if (!_test_state.received_data_ && !IsSSLHandshake(chunk))
        _test_state.received_data_ = true;
      _test_state._bytes_in += chunk.GetLength();
      if (!_test_state._on_load.QuadPart)
        _test_state._doc_bytes_in += chunk.GetLength();
    }
    if (is_unencrypted || !info->_is_ssl) {
      _requests.DataIn(socket_id, chunk);
    } else {
      SslDataIn(info, chunk);
    }
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackSockets::Reset() {
  EnterCriticalSection(&cs);
  POSITION pos = _socketInfo.GetStartPosition();
  while (pos) {
    DWORD id = 0;
    SocketInfo* info = NULL;
    _socketInfo.GetNextAssoc(pos, id, info);
    if (info)
      delete info;
  }
  _socketInfo.RemoveAll();
  _ssl_sockets.RemoveAll();
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
  Claim ownership of a connection (associate it with a request)
-----------------------------------------------------------------------------*/
bool TrackSockets::ClaimConnect(DWORD socket_id, LARGE_INTEGER before, 
                                LARGE_INTEGER& start, LARGE_INTEGER& end,
                                LARGE_INTEGER& ssl_start, LARGE_INTEGER& ssl_end) {
  bool is_claimed = false;
  EnterCriticalSection(&cs);
  SocketInfo * info = NULL;
  if (_socketInfo.Lookup(socket_id, info) && info) {
    if (!info->_accounted_for &&
        info->_connect_start.QuadPart <= before.QuadPart && 
        info->_connect_end.QuadPart <= before.QuadPart) {
      is_claimed = true;
      info->_accounted_for = true;
      start = info->_connect_start;
      end = info->_connect_end;
      ssl_start = info->_ssl_start;
      ssl_end = info->_ssl_end;
    }
  }
  LeaveCriticalSection(&cs);
  return is_claimed;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackSockets::ClaimAll() {
  EnterCriticalSection(&cs);
  POSITION pos = _socketInfo.GetStartPosition();
  while (pos) {
    SocketInfo * info = NULL;
    DWORD key = 0;
    _socketInfo.GetNextAssoc(pos, key, info);
    if (info)
      info->_accounted_for = true;
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
ULONG TrackSockets::GetPeerAddress(DWORD socket_id) {
  ULONG peer_address = 0;
  EnterCriticalSection(&cs);
  SocketInfo * info = NULL;
  if (_socketInfo.Lookup(socket_id, info) && info)
    peer_address = info->_addr.sin_addr.S_un.S_addr;
  LeaveCriticalSection(&cs);
  return peer_address;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int TrackSockets::GetLocalPort(DWORD socket_id) {
  int local_port = 0;
  EnterCriticalSection(&cs);
  SocketInfo * info = NULL;
  if (_socketInfo.Lookup(socket_id, info) && info)
    local_port = info->_local_port;
  LeaveCriticalSection(&cs);
  return local_port;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool TrackSockets::IsSsl(SOCKET s) {
  EnterCriticalSection(&cs);
  SocketInfo* info = GetSocketInfo(s);
  bool is_ssl = info->_is_ssl;
  LeaveCriticalSection(&cs);
  return is_ssl;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool TrackSockets::IsSslById(DWORD socket_id) {
  EnterCriticalSection(&cs);
  SocketInfo* info = GetSocketInfoById(socket_id);
  bool is_ssl = false;
  if (info != NULL) {
    is_ssl = info->_is_ssl;
  }
  LeaveCriticalSection(&cs);
  return is_ssl;
}

/*-----------------------------------------------------------------------------
  Save the fd as the last one seen.
  Chrome uses this (from NsprHook::SSL_ImportFD) to map the fd to a SOCKET.
  The SOCKET is set when Chrome calls CWsHook::recv to check the SOCKET.
-----------------------------------------------------------------------------*/
void TrackSockets::SetSslFd(PRFileDesc* fd) {
  EnterCriticalSection(&cs);
  _ssl_sockets.RemoveKey(fd);
  _last_ssl_fd.SetAt(GetCurrentThreadId(), fd);
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
  Drop the fd to SOCKET mapping (called from NsprHook::PR_Close).
-----------------------------------------------------------------------------*/
void TrackSockets::ClearSslFd(PRFileDesc* fd) {
  EnterCriticalSection(&cs);
  _ssl_sockets.RemoveKey(fd);
  _last_ssl_fd.RemoveKey(GetCurrentThreadId());
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackSockets::ClaimSslFd(SOCKET s) {
  DWORD thread_id = GetCurrentThreadId();
  EnterCriticalSection(&cs);
  PRFileDesc * fd = NULL;
  if (_last_ssl_fd.Lookup(thread_id, fd) && fd 
        && s != INVALID_SOCKET) {
    _ssl_sockets.SetAt(fd, s);
    SocketInfo* info = GetSocketInfo(s);
    info->_is_ssl = true;
  }
  _last_ssl_fd.RemoveKey(thread_id);
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackSockets::ResetSslFd() {
  EnterCriticalSection(&cs);
  _last_ssl_fd.RemoveKey(GetCurrentThreadId());
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
  Map a SOCKET to the previously set PRFileDesc if that socket has not
  had any activity.
-----------------------------------------------------------------------------*/
void TrackSockets::SetSslSocket(SOCKET s) {
  DWORD thread_id = GetCurrentThreadId();
  EnterCriticalSection(&cs);
  SOCKET lookup_socket;
  DWORD socket_id = 0;
  PRFileDesc * fd = NULL;
  _openSockets.Lookup(s, socket_id);
  _last_ssl_fd.Lookup(thread_id, fd);
  if (fd && s != INVALID_SOCKET &&
      !_ssl_sockets.Lookup(fd, lookup_socket) &&
      (!socket_id || !_requests.HasActiveRequest(socket_id))) {
    _ssl_sockets.SetAt(fd, s);
    SocketInfo* info = GetSocketInfo(s);
    info->_is_ssl = true;
  }
  _last_ssl_fd.RemoveKey(thread_id);
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool TrackSockets::SslSocketLookup(PRFileDesc* fd, SOCKET& s) {
  EnterCriticalSection(&cs);
  _last_ssl_fd.RemoveKey(GetCurrentThreadId());
  bool ret = _ssl_sockets.Lookup(fd, s);
  LeaveCriticalSection(&cs);
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool TrackSockets::IsSSLHandshake(const DataChunk& chunk) {
  bool is_handshake = false;
  const char *buf = chunk.GetData();
  DWORD len = chunk.GetLength();
  if (len > 3 && buf[0] == 0x16)
    is_handshake = true;
  return is_handshake;
}

/*-----------------------------------------------------------------------------
  Track the SSL handshake.
  http://en.wikipedia.org/wiki/Transport_Layer_Security#Handshake_protocol
  Call from within critical section.
  -----------------------------------------------------------------------------*/
void TrackSockets::SslDataOut(SocketInfo* info, const DataChunk& chunk) {
  const char *buf = chunk.GetData();
  DWORD len = chunk.GetLength();
  if (info->_is_ssl && !info->_is_ssl_handshake_complete && len > 3) {
    bool is_handshake = (
        buf[0] == 0x16 && buf[1] == 3 && buf[2] >= 0 && buf[2] <= 3);
    bool is_application_data = (
        buf[0] == 0x17 && buf[1] == 3 && buf[2] >= 0 && buf[2] <= 3);
      // Handshake data starts with 0x16, then major/minor version.
    if (is_handshake) {
      if (!info->_ssl_start.QuadPart) {
        QueryPerformanceCounter(&info->_ssl_start);
        WptTrace(loglevel::kProcess, _T(
            "handshake start(socket_id=%d)"), info->_id);
      } else {
        QueryPerformanceCounter(&info->_ssl_end);
        WptTrace(loglevel::kProcess, _T(
            "handshake end updated(socket_id=%d)"), info->_id);
        // TODO: search for 14 (cipher) or 17 (app data) to end handshake
        // Chrome makes the initial HTTP request when finishing the handshake.
      }
    } else if (is_application_data) {
      WptTrace(loglevel::kProcess, _T(
          "handshake complete(socket_id=%d)"), info->_id);
      info->_is_ssl_handshake_complete = true;
    }
  }
}

/*-----------------------------------------------------------------------------
  Track the SSL handshake.
  http://en.wikipedia.org/wiki/Transport_Layer_Security#Handshake_protocol
  Call from within critical section.

  TODO: search for 14 (change cipher) or 17 (app data) to end handshake
  TODO: Save SSL version chosen by server. w
-----------------------------------------------------------------------------*/
void TrackSockets::SslDataIn(SocketInfo* info, const DataChunk& chunk) {
  SslDataOut(info, chunk);
}

/*-----------------------------------------------------------------------------
  This must always be called from within a critical section.
-----------------------------------------------------------------------------*/
SocketInfo* TrackSockets::GetSocketInfo(SOCKET s, bool lookup_peer) {
  DWORD socket_id = 0;
  _openSockets.Lookup(s, socket_id);
  SocketInfo* info = NULL;
  if (!socket_id) {
    socket_id = _nextSocketId;
    _openSockets.SetAt(s, socket_id);
    _nextSocketId++;
  } else {
    _socketInfo.Lookup(socket_id, info);
  }
  if (!info) {
    info = new SocketInfo;
    info->_id = socket_id;
    info->_during_test = _test_state._active;
    _socketInfo.SetAt(socket_id, info);
  }
  if (lookup_peer && info->_addr.sin_addr.S_un.S_addr == 0) {
    int addr_len = sizeof(info->_addr);
    getpeername(s, (sockaddr *)&info->_addr, &addr_len);
  }
  return info;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SocketInfo* TrackSockets::GetSocketInfoById(DWORD socket_id) {
  SocketInfo* info = NULL;
  _socketInfo.Lookup(socket_id, info);
  return info;
}

/*-----------------------------------------------------------------------------
  Find the earliest start time for a socket connect after the given time
-----------------------------------------------------------------------------*/
LONGLONG TrackSockets::GetEarliest(LONGLONG& after) {
  LONGLONG earliest = 0;
  EnterCriticalSection(&cs);
  POSITION pos = _socketInfo.GetStartPosition();
  while (pos) {
    SocketInfo * info = NULL;
    DWORD key = 0;
    _socketInfo.GetNextAssoc(pos, key, info);
    if (info && info->_connect_start.QuadPart && 
        info->_connect_start.QuadPart >= after && 
        (!earliest || info->_connect_start.QuadPart <= earliest)) {
      earliest = info->_connect_start.QuadPart;
    }
  }
  LeaveCriticalSection(&cs);
  return earliest;
}

/*-----------------------------------------------------------------------------
  Return the estimated RTT for the given IPV4 server as a string
-----------------------------------------------------------------------------*/
CStringA TrackSockets::GetRTT(DWORD ipv4_address) {
  CStringA ret;
  DWORD ms = -1;
  if (ipv4_rtt_.Lookup(ipv4_address, ms)) {
    ret.Format("%d", ms);
  }
  return ret;
}
