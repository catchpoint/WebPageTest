
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
#include "ssl_stream.h"
#include "../wptdriver/wpt_test.h"
#include <nghttp2/nghttp2.h>

const DWORD LOCALHOST = 0x0100007F; // 127.0.0.1
const DWORD LINK_LOCAL_MASK = 0x0000FFFF;
const DWORD LINK_LOCAL = 0x0000FEA9; // 169.254.x.x

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SocketInfo::SocketInfo():
  _id(0)
  , _accounted_for(false)
  , _during_test(false)
  , _ssl_checked(false)
  , _is_ssl(false)
  , _is_ssl_handshake_complete(false)
  , _local_port(0)
  , _protocol(PROTO_NOT_CHECKED)
  , _h2_in(NULL)
  , _h2_out(NULL)
  , _ssl_in(NULL)
  , _ssl_out(NULL) {
  memset(&_addr, 0, sizeof(_addr));
  _connect_start.QuadPart = 0;
  _connect_end.QuadPart = 0;
  _ssl_start.QuadPart = 0;
  _ssl_end.QuadPart = 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SocketInfo::~SocketInfo(void) {
  if (_h2_in) {
    if (_h2_in->session)
      nghttp2_session_del(_h2_in->session);
    delete _h2_in;
  }
  if (_h2_out) {
    if (_h2_out->session)
      nghttp2_session_del(_h2_out->session);
    delete _h2_out;
  }
  if (_ssl_in)
    delete _ssl_in;
  if (_ssl_out)
    delete _ssl_out;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool SocketInfo::IsLocalhost() {
  return _addr.sin_addr.S_un.S_addr == LOCALHOST;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool SocketInfo::IsLinkLocal() {
  return (_addr.sin_addr.S_un.S_addr & LINK_LOCAL_MASK) == LINK_LOCAL;
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
bool TrackSockets::Connect(SOCKET s, const struct sockaddr FAR * name, 
                            int namelen) {
  bool allowed = true;

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
    info->_addr.sin_port = ntohs(info->_addr.sin_port);
    QueryPerformanceCounter(&info->_connect_start);
    localhost = info->IsLocalhost();
    allowed = !info->IsLinkLocal();
    LeaveCriticalSection(&cs);

    if (!localhost) {
      _test.OverridePort(name, namelen);
      _test_state.ActivityDetected();
    }
  }
  return allowed;
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
  Sniff for H2/SPDY/HTTP1 on encrypted connections
-----------------------------------------------------------------------------*/
void TrackSockets::SniffProtocol(SocketInfo* info, DataChunk& chunk) {
  if (info->_is_ssl &&
      !info->IsLocalhost() &&
      info->_protocol == PROTO_NOT_CHECKED) {
    const char * data = chunk.GetData();
    DWORD len = chunk.GetLength();
    DWORD socket_id = info->_id;

    info->_protocol = PROTO_UNKNOWN;

    const char * HTTP2_HEADER = "PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n";
    if (info->_protocol == PROTO_UNKNOWN &&
        len >= (DWORD)lstrlenA(HTTP2_HEADER) &&
        !memcmp(data, HTTP2_HEADER, lstrlenA(HTTP2_HEADER))) {
      ATLTRACE(_T("[%d] ********* HTTP 2 Connection detected"), socket_id);
      info->_protocol = PROTO_H2;
      info->_h2_in = NewHttp2Session(socket_id, DATA_IN);
      info->_h2_out = NewHttp2Session(socket_id, DATA_OUT);
    }

    if (info->_protocol == PROTO_UNKNOWN) {
      const char * HTTP_METHODS[] = {"GET ", "HEAD ", "POST ", "PUT ",
          "OPTIONS ", "DELETE ", "TRACE ", "CONNECT ", "PATCH "};
      for (int i = 0; i < _countof(HTTP_METHODS); i++) {
        const char * method = HTTP_METHODS[i];
        unsigned long method_len = strlen(method);
        if (len >= method_len && !memcmp(data, method, method_len)) {
          ATLTRACE(_T("[%d] ********* HTTP 1 Connection detected"),
                    socket_id);
          info->_protocol = PROTO_HTTP;
          break;
        }
      }
    }

    if (info->_protocol == PROTO_UNKNOWN && len >= 8 &&
        data[0] == '\x80' && data[1] == '\x02') {
      ATLTRACE(_T("[%d] ********* SPDY Connection detected"), socket_id);
      info->_protocol = PROTO_SPDY;
    }

    if (info->_protocol == PROTO_UNKNOWN) {
      ATLTRACE(_T("[%d] ********* Unknown connection protocol"), socket_id);
    }
  }
}

/*-----------------------------------------------------------------------------
  Allow data to be modified.
-----------------------------------------------------------------------------*/
bool TrackSockets::ModifyDataOut(SOCKET s, DataChunk& chunk,
                                 bool is_unencrypted) {
  bool is_modified = false;
  DWORD len = chunk.GetLength();
  if (len > 0) {
    EnterCriticalSection(&cs);
    SocketInfo* info = GetSocketInfo(s);
    DWORD socket_id = info->_id;
    if (is_unencrypted)
      SniffProtocol(info, chunk);

    if (!info->IsLocalhost() &&
        ((is_unencrypted && info->_protocol == PROTO_HTTP) || !info->_is_ssl)) {
      is_modified = _requests.ModifyDataOut(socket_id, chunk);
    }

    LeaveCriticalSection(&cs);
  }
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
    _test_state.ActivityDetected();
    if (is_unencrypted)
      SniffProtocol(info, chunk);
    if (_test_state._active && !is_unencrypted) {
      _test_state._bytes_out += chunk.GetLength();
      if (!_test_state._on_load.QuadPart)
        _test_state._doc_bytes_out += chunk.GetLength();
    }
    if (is_unencrypted || !info->_is_ssl) {
      if (info->_protocol == PROTO_H2) {
        size_t len = chunk.GetLength();
        const uint8_t * buff = (const uint8_t *)chunk.GetData();
        if (buff && len && info->_h2_out && info->_h2_out->session) {
          int r = nghttp2_session_mem_recv(info->_h2_out->session, buff, len);
          if (r < 0) {
            ATLTRACE("nghttp2_session_mem_recv - DataOut Error %d", r);
          }
        }
      } else {
        _requests.DataOut(socket_id, chunk);
      }
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
    _test_state.ActivityDetected();
    if (_test_state._active && !is_unencrypted) {
      _test_state._bytes_in_bandwidth += chunk.GetLength();
      if (!_test_state.received_data_ && !IsSSLHandshake(chunk))
        _test_state.received_data_ = true;
      _test_state._bytes_in += chunk.GetLength();
      if (!_test_state._on_load.QuadPart)
        _test_state._doc_bytes_in += chunk.GetLength();
    }
    if (is_unencrypted || !info->_is_ssl) {
      if (info->_protocol == PROTO_H2) {
        size_t len = chunk.GetLength();
        const uint8_t * buff = (const uint8_t *)chunk.GetData();
        if (buff && len && info->_h2_in && info->_h2_in->session) {
          int r = nghttp2_session_mem_recv(info->_h2_in->session, buff, len);
          if (r < 0) {
            ATLTRACE("nghttp2_session_mem_recv - DataIn Error %d", r);
          }
        }
      } else {
        _requests.DataIn(socket_id, chunk);
      }
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
bool TrackSockets::Find(ULONG server_addr, USHORT server_port,
                        USHORT client_port,
                        LARGE_INTEGER &match_connect_start,
                        LARGE_INTEGER &match_connect_end) {
  bool found = false;
  EnterCriticalSection(&cs);
  POSITION pos = _socketInfo.GetStartPosition();
  while (pos) {
    SocketInfo * info = NULL;
    DWORD key = 0;
    _socketInfo.GetNextAssoc(pos, key, info);
    if (info &&
        info->_addr.sin_addr.S_un.S_addr == server_addr &&
        info->_addr.sin_port == server_port &&
        info->_local_port == client_port) {
      if (info->_connect_start.QuadPart) {
        found = true;
        match_connect_start.QuadPart = info->_connect_start.QuadPart;
        match_connect_end.QuadPart = info->_connect_end.QuadPart;
      }
      break;
    }
  }
  LeaveCriticalSection(&cs);
  return found;
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
void TrackSockets::SniffSSL(SOCKET s, DataChunk& chunk) {
  if (chunk.GetLength() > 0) {
    EnterCriticalSection(&cs);
    SocketInfo* info = GetSocketInfo(s);
    if (!info->IsLocalhost() && !info->_ssl_checked) {
      info->_ssl_checked = true;
      if (IsSSLHandshake(chunk))
        EnableSsl(info);
    }
    LeaveCriticalSection(&cs);
  }
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
void TrackSockets::SetSslFd(void* ssl) {
  EnterCriticalSection(&cs);
  _ssl_sockets.RemoveKey(ssl);
  _last_ssl_fd.SetAt(GetCurrentThreadId(), ssl);
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
  Drop the fd to SOCKET mapping (called from NsprHook::PR_Close).
-----------------------------------------------------------------------------*/
void TrackSockets::ClearSslFd(void* ssl) {
  EnterCriticalSection(&cs);
  _ssl_sockets.RemoveKey(ssl);
  _last_ssl_fd.RemoveKey(GetCurrentThreadId());
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackSockets::ClaimSslFd(SOCKET s) {
  DWORD thread_id = GetCurrentThreadId();
  EnterCriticalSection(&cs);
  void * ssl = NULL;
  if (_last_ssl_fd.Lookup(thread_id, ssl) && ssl 
        && s != INVALID_SOCKET) {
    _ssl_sockets.SetAt(ssl, s);
    SocketInfo* info = GetSocketInfo(s);
    EnableSsl(info);
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
  void * ssl = NULL;
  _openSockets.Lookup(s, socket_id);
  _last_ssl_fd.Lookup(thread_id, ssl);
  if (ssl && s != INVALID_SOCKET &&
      !_ssl_sockets.Lookup(ssl, lookup_socket) &&
      (!socket_id || !_requests.HasActiveRequest(socket_id, 0))) {
    _ssl_sockets.SetAt(ssl, s);
    SocketInfo* info = GetSocketInfo(s);
    EnableSsl(info);
  }
  _last_ssl_fd.RemoveKey(thread_id);
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool TrackSockets::SslSocketLookup(void* ssl, SOCKET& s) {
  EnterCriticalSection(&cs);
  _last_ssl_fd.RemoveKey(GetCurrentThreadId());
  bool ret = _ssl_sockets.Lookup(ssl, s);
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
  Call from within critical section.
-----------------------------------------------------------------------------*/
void TrackSockets::SslDataOut(SocketInfo* info, const DataChunk& chunk) {
  info->_ssl_out->Append(chunk);
}

/*-----------------------------------------------------------------------------
  Call from within critical section.
-----------------------------------------------------------------------------*/
void TrackSockets::SslDataIn(SocketInfo* info, const DataChunk& chunk) {
  info->_ssl_in->Append(chunk);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackSockets::EnableSsl(SocketInfo *info) {
  info->_is_ssl = true;
  info->_ssl_in = new SSLStream(*this, info, SSL_IN);
  info->_ssl_out = new SSLStream(*this, info, SSL_OUT);
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

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackSockets::H2BeginHeaders(DATA_DIRECTION direction, DWORD socket_id,
                                  int stream_id) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackSockets::H2CloseStream(DATA_DIRECTION direction, DWORD socket_id,
                                 int stream_id) {
  _requests.StreamClosed(socket_id, stream_id);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackSockets::H2Header(DATA_DIRECTION direction, DWORD socket_id,
    int stream_id, const char * header, const char * value, bool pushed) {
  if (direction == DATA_IN)
    _requests.HeaderIn(socket_id, stream_id, header, value, pushed);
  else
    _requests.HeaderOut(socket_id, stream_id, header, value, pushed);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackSockets::H2Data(DATA_DIRECTION direction, DWORD socket_id,
    int stream_id, size_t len, const char * data) {
  DataChunk chunk(data, len);
  if (direction == DATA_IN)
    _requests.ObjectDataIn(socket_id, stream_id, chunk);
  else
    _requests.ObjectDataOut(socket_id, stream_id, chunk);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackSockets::H2Bytes(DATA_DIRECTION direction, DWORD socket_id, int stream_id,
              size_t len) {
  if (direction == DATA_IN)
    _requests.BytesIn(socket_id, stream_id, len);
  else
    _requests.BytesOut(socket_id, stream_id, len);
}

/******************************************************************************
  nghttp2 c-interface callbacks (trampoline back to TrackSockets callbacks)
*******************************************************************************/
ssize_t h2_send_callback(nghttp2_session *session, const uint8_t *data,
                          size_t length, int flags, void *user_data) {
  return length;
}

const char * h2_frame_type(int type) {
  switch (type) {
    case NGHTTP2_DATA: return "DATA";
    case NGHTTP2_HEADERS: return "HEADERS";
    case NGHTTP2_PRIORITY: return "PRIORITY";
    case NGHTTP2_RST_STREAM: return "RST_STREAM";
    case NGHTTP2_SETTINGS: return "SETTINGS";
    case NGHTTP2_PUSH_PROMISE: return "PUSH_PROMISE";
    case NGHTTP2_PING: return "PING";
    case NGHTTP2_GOAWAY: return "GOAWAY";
    case NGHTTP2_WINDOW_UPDATE: return "WINDOW_UPDATE";
    case NGHTTP2_CONTINUATION: return "CONTINUATION";
    default: return "UNKNOWN";
  }
}

int h2_on_begin_frame_callback(nghttp2_session *session,
                               const nghttp2_frame_hd *hd, void *user_data) {
  ATLTRACE("h2_on_begin_frame_callback [%s] - stream %d, %d bytes",
           h2_frame_type(hd->type), hd->stream_id, hd->length);
  return 0;
}

int h2_on_frame_recv_callback(nghttp2_session *session,
                              const nghttp2_frame *frame, void *user_data) {
  ATLTRACE("h2_on_frame_recv_callback [%s] - stream %d, %d bytes",
           h2_frame_type(frame->hd.type), frame->hd.stream_id,
           frame->hd.length);
  // Keep track of the bytes-in for headers by looking at the frame
  if (user_data && frame->hd.type == NGHTTP2_HEADERS) {
    H2_USER_DATA * u = (H2_USER_DATA *)user_data;
    if (u->connection) {
      TrackSockets * c = (TrackSockets *)u->connection;
      c->H2Bytes(u->direction, u->socket_id, frame->hd.stream_id,
                 frame->hd.length);
    }
  }
  return 0;
}

int h2_on_data_chunk_recv_callback(nghttp2_session *session, uint8_t flags,
                                   int32_t stream_id, const uint8_t *data,
                                   size_t len, void *user_data) {
  ATLTRACE("h2_on_data_chunk_recv_callback - stream %d, %d bytes", stream_id, len);
  if (user_data) {
    H2_USER_DATA * u = (H2_USER_DATA *)user_data;
    if (u->connection) {
      TrackSockets * c = (TrackSockets *)u->connection;
      c->H2Data(u->direction, u->socket_id, stream_id, len, (const char *)data);
      c->H2Bytes(u->direction, u->socket_id, stream_id, len);
    }
  }
  return 0;
}

int h2_on_stream_close_callback(nghttp2_session *session, int32_t stream_id,
                                uint32_t error_code, void *user_data) {
  ATLTRACE("h2_on_stream_close_callback - stream %d", stream_id);
  if (user_data) {
    H2_USER_DATA * u = (H2_USER_DATA *)user_data;
    if (u->connection) {
      TrackSockets * c = (TrackSockets *)u->connection;
      c->H2CloseStream(u->direction, u->socket_id, stream_id);
    }
  }
  return 0;
}

int h2_on_begin_headers_callback(nghttp2_session *session,
                                 const nghttp2_frame *frame, void *user_data) {
  ATLTRACE("h2_on_begin_headers_callback - stream %d, %d bytes", frame->hd.stream_id, frame->hd.length);
  if (user_data) {
    H2_USER_DATA * u = (H2_USER_DATA *)user_data;
    if (u->connection) {
      TrackSockets * c = (TrackSockets *)u->connection;
      c->H2BeginHeaders(u->direction, u->socket_id, frame->hd.stream_id);
    }
  }
  return 0;
}

int h2_on_header_callback(nghttp2_session *session, const nghttp2_frame *frame,
                          const uint8_t *name, size_t namelen,
                          const uint8_t *value, size_t valuelen,
                          uint8_t flags, void *user_data) {
  int32_t stream_id = frame->hd.stream_id;
  if (frame->hd.type == NGHTTP2_PUSH_PROMISE)
    stream_id = frame->push_promise.promised_stream_id;

  if (user_data && name && value) {
    ATLTRACE("h2_on_header_callback - stream %d '%S' : '%S'",
             stream_id, name, value);
    H2_USER_DATA * u = (H2_USER_DATA *)user_data;
    if (u->connection) {
      DATA_DIRECTION direction = u->direction;
      // if we are processing a PUSH_PROMISE, flip the header direction
      bool pushed = false;
      if (frame->hd.type == NGHTTP2_PUSH_PROMISE) {
        direction = u->direction == DATA_IN ? DATA_OUT : DATA_IN;
        pushed = true;
      }
      TrackSockets * c = (TrackSockets *)u->connection;
      c->H2Header(direction, u->socket_id, stream_id,
                  (const char *)name, (const char *)value, pushed);
    }
  }
  return 0;
}

/*-----------------------------------------------------------------------------
  Create a new HTTP2 session 
-----------------------------------------------------------------------------*/
H2_USER_DATA * TrackSockets::NewHttp2Session(DWORD socket_id,
                                             DATA_DIRECTION direction) {
  H2_USER_DATA * user_data = NULL;
  nghttp2_session_callbacks * cb = NULL;
  if (!nghttp2_session_callbacks_new(&cb) && cb) {
    nghttp2_session_callbacks_set_send_callback(cb, h2_send_callback);
    nghttp2_session_callbacks_set_on_begin_frame_callback(
        cb, h2_on_begin_frame_callback);
    nghttp2_session_callbacks_set_on_frame_recv_callback(
        cb, h2_on_frame_recv_callback);
    nghttp2_session_callbacks_set_on_data_chunk_recv_callback(
        cb, h2_on_data_chunk_recv_callback);
    nghttp2_session_callbacks_set_on_stream_close_callback(
        cb, h2_on_stream_close_callback);
    nghttp2_session_callbacks_set_on_begin_headers_callback(
        cb, h2_on_begin_headers_callback);
    nghttp2_session_callbacks_set_on_header_callback(
        cb, h2_on_header_callback);


    nghttp2_option * options = NULL;
    if (!nghttp2_option_new(&options) && options) {
      nghttp2_option_set_no_auto_window_update(options, 1);
      nghttp2_option_set_no_http_messaging(options, 1);

      user_data = new H2_USER_DATA;
      user_data->direction = direction;
      user_data->connection = this;
      user_data->socket_id = socket_id;
      bool ok = false;
      if (direction == DATA_OUT) {
        ok = !nghttp2_session_server_new2(&user_data->session, cb, user_data, options);
      } else {
        ok = !nghttp2_session_client_new2(&user_data->session, cb, user_data, options);
      }
      if (!ok) {
        delete user_data;
        user_data = NULL;
      }
      nghttp2_option_del(options);
    }
    nghttp2_session_callbacks_del(cb);
  }
  return user_data;
}
