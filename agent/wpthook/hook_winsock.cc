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

// WsHook.cpp - Code for intercepting winsock API calls

#include "StdAfx.h"
#include "hook_winsock.h"
#include "request.h"
#include "track_dns.h"
#include "track_sockets.h"
#include "test_state.h"

static CWsHook * pHook = NULL;

/******************************************************************************
*******************************************************************************
**															                                    				 **
**								                  Stub Functions		          						 **
**													                                    						 **
*******************************************************************************
******************************************************************************/

SOCKET WSAAPI WSASocketW_Hook(int af, int type, int protocol, 
                  LPWSAPROTOCOL_INFOW lpProtocolInfo, GROUP g, DWORD dwFlags) {
  SOCKET ret = SOCKET_ERROR;
  if (pHook)
    ret = pHook->WSASocketW(af, type, protocol, lpProtocolInfo, g, dwFlags);
  return ret;
}

int WSAAPI closesocket_Hook(SOCKET s) {
  int ret = SOCKET_ERROR;
  if (pHook)
    ret = pHook->closesocket(s);
  return ret;
}

int WSAAPI connect_Hook(IN SOCKET s, const struct sockaddr FAR * name, 
                                                              IN int namelen) {
  int ret = SOCKET_ERROR;
  if (pHook)
    ret = pHook->connect(s, name, namelen);
  return ret;
}

int WSAAPI recv_Hook(SOCKET s, char FAR * buf, int len, int flags) {
  int ret = SOCKET_ERROR;
  if (pHook)
    ret = pHook->recv(s, buf, len, flags);
  return ret;
}

int WSAAPI select_Hook(int nfds, fd_set FAR * readfds, fd_set FAR * writefds,
              fd_set FAR * exceptfds, const struct timeval FAR * timeout) {
  int ret = SOCKET_ERROR;
  if (pHook)
    ret = pHook->select(nfds, readfds, writefds, exceptfds, timeout);
  return ret;
}

int WSAAPI send_Hook(SOCKET s, const char FAR * buf, int len, int flags) {
  int ret = SOCKET_ERROR;
  if (pHook)
    ret = pHook->send(s, buf, len, flags);
  return ret;
}

int WSAAPI getaddrinfo_Hook(PCSTR pNodeName, PCSTR pServiceName, 
                             const ADDRINFOA * pHints, PADDRINFOA * ppResult) {
  int ret = WSAEINVAL;
  if (pHook)
    ret = pHook->getaddrinfo(pNodeName, pServiceName, pHints, ppResult);
  return ret;
}

int WSAAPI GetAddrInfoW_Hook(PCWSTR pNodeName, PCWSTR pServiceName, 
                             const ADDRINFOW * pHints, PADDRINFOW * ppResult) {
  int ret = WSAEINVAL;
  if (pHook)
    ret = pHook->GetAddrInfoW(pNodeName, pServiceName, pHints, ppResult);
  return ret;
}

struct hostent * WSAAPI gethostbyname_Hook(const char * name) {
  struct hostent * ret = NULL;
  if (pHook)
    ret = pHook->gethostbyname(name);
  return ret;
}

void WSAAPI freeaddrinfo_Hook(PADDRINFOA pAddrInfo) {
  if (pHook)
    pHook->freeaddrinfo(pAddrInfo);
}

void WSAAPI FreeAddrInfoW_Hook(PADDRINFOW pAddrInfo) {
  if (pHook)
    pHook->FreeAddrInfoW(pAddrInfo);
}

int WSAAPI WSARecv_Hook(SOCKET s, LPWSABUF lpBuffers, DWORD dwBufferCount, 
                        LPDWORD lpNumberOfBytesRecvd, LPDWORD lpFlags, 
                        LPWSAOVERLAPPED lpOverlapped, 
                      LPWSAOVERLAPPED_COMPLETION_ROUTINE lpCompletionRoutine) {
  int ret = SOCKET_ERROR;
  if (pHook)
    ret = pHook->WSARecv(s, lpBuffers, dwBufferCount, lpNumberOfBytesRecvd, 
                                  lpFlags, lpOverlapped, lpCompletionRoutine);
  return ret;
}

int WSAAPI WSASend_Hook(SOCKET s, LPWSABUF lpBuffers, DWORD dwBufferCount,
              LPDWORD lpNumberOfBytesSent, DWORD dwFlags, 
              LPWSAOVERLAPPED lpOverlapped,
              LPWSAOVERLAPPED_COMPLETION_ROUTINE lpCompletionRoutine) {
  int ret = SOCKET_ERROR;
  if (pHook)
    ret = pHook->WSASend(s, lpBuffers, dwBufferCount, lpNumberOfBytesSent, 
                          dwFlags, lpOverlapped, lpCompletionRoutine);
  return ret;
}

BOOL WSAAPI WSAGetOverlappedResult_Hook(SOCKET s, LPWSAOVERLAPPED lpOverlapped,
              LPDWORD lpcbTransfer, BOOL fWait, LPDWORD lpdwFlags) {
  BOOL ret = FALSE;
  if (pHook)
    ret = pHook->WSAGetOverlappedResult(s, lpOverlapped, lpcbTransfer, fWait,
                                        lpdwFlags);
  return ret;
}

int WSAAPI WSAEventSelect_Hook(SOCKET s, WSAEVENT hEventObject, 
                                long lNetworkEvents) {
  int ret = SOCKET_ERROR;
  if (pHook)
    ret = pHook->WSAEventSelect(s, hEventObject, lNetworkEvents);
  return ret;
}

int WSAAPI WSAEnumNetworkEvents_Hook(SOCKET s, WSAEVENT hEventObject, 
                            LPWSANETWORKEVENTS lpNetworkEvents) {
  int ret = SOCKET_ERROR;
  if (pHook)
    ret = pHook->WSAEnumNetworkEvents(s, hEventObject, lpNetworkEvents);
  return ret;
}


/******************************************************************************
*******************************************************************************
**													                                    						 **
**			            					CWSHook Class				                  				 **
**															                                    				 **
*******************************************************************************
******************************************************************************/

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CWsHook::CWsHook(TrackDns& dns, TrackSockets& sockets, TestState& test_state):
  _getaddrinfo(NULL)
  , _freeaddrinfo(NULL)
  , _dns(dns)
  , _sockets(sockets)
  , _test_state(test_state) {
  dns_override.InitHashTable(257);
  recv_buffers.InitHashTable(257);
  _connecting.InitHashTable(257);
  InitializeCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWsHook::Init() {
  if (!pHook)
    pHook = this;

  // install the code hooks
  _WSASocketW = hook.createHookByName("ws2_32.dll", "WSASocketW", 
                                                              WSASocketW_Hook);
  _closesocket = hook.createHookByName("ws2_32.dll", "closesocket", 
                                                             closesocket_Hook);
  _connect = hook.createHookByName("ws2_32.dll", "connect", connect_Hook);
  _recv = hook.createHookByName("ws2_32.dll", "recv", recv_Hook);
  _send = hook.createHookByName("ws2_32.dll", "send", send_Hook);
  _select = hook.createHookByName("ws2_32.dll", "select", select_Hook);
  _GetAddrInfoW = hook.createHookByName("ws2_32.dll", "GetAddrInfoW", 
                                                            GetAddrInfoW_Hook);
  _gethostbyname = hook.createHookByName("ws2_32.dll", "gethostbyname", 
                                                            gethostbyname_Hook);
  _FreeAddrInfoW = hook.createHookByName("ws2_32.dll", "FreeAddrInfoW", 
                                                           FreeAddrInfoW_Hook);
  _WSARecv = hook.createHookByName("ws2_32.dll", "WSARecv", WSARecv_Hook);
  _WSASend = hook.createHookByName("ws2_32.dll", "WSASend", WSASend_Hook);
  _WSAGetOverlappedResult = hook.createHookByName("ws2_32.dll", 
                        "WSAGetOverlappedResult", WSAGetOverlappedResult_Hook);
  _WSAEventSelect = hook.createHookByName("ws2_32.dll", 
                        "WSAEventSelect", WSAEventSelect_Hook);
  _WSAEnumNetworkEvents = hook.createHookByName("ws2_32.dll", 
                        "WSAEnumNetworkEvents", WSAEnumNetworkEvents_Hook);

  // only hook the A version if the W version wasn't present (XP SP1 or below)
  if (!_GetAddrInfoW)
    _getaddrinfo = hook.createHookByName("ws2_32.dll", "getaddrinfo", 
                                                             getaddrinfo_Hook);
  if (!_FreeAddrInfoW)
    _freeaddrinfo = hook.createHookByName("ws2_32.dll", "freeaddrinfo", 
                                                            freeaddrinfo_Hook);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CWsHook::~CWsHook(void) {
  if( pHook == this )
    pHook = NULL;

  DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SOCKET CWsHook::WSASocketW(int af, int type, int protocol, 
                  LPWSAPROTOCOL_INFOW lpProtocolInfo, GROUP g, DWORD dwFlags) {
  SOCKET ret = INVALID_SOCKET;
  if (_WSASocketW) {
    ret = _WSASocketW(af, type, protocol, lpProtocolInfo, g, dwFlags);
    if( ret != INVALID_SOCKET && !_test_state._exit )
      _sockets.Create(ret);
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int CWsHook::closesocket(SOCKET s) {
  int ret = SOCKET_ERROR;
  EnterCriticalSection(&cs);
  _connecting.RemoveKey(s);
  LeaveCriticalSection(&cs);
  if (!_test_state._exit)
    _sockets.Close(s);
  if (_closesocket)
    ret = _closesocket(s);
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int CWsHook::connect(IN SOCKET s, const struct sockaddr FAR * name, 
                                                              IN int namelen) {
  int ret = SOCKET_ERROR;
  if (!_test_state._exit)
    _sockets.Connect(s, name, namelen);
  if (_connect)
    ret = _connect(s, name, namelen);
  if (!ret)
    _sockets.Connected(s);
  else if(ret == SOCKET_ERROR && WSAGetLastError() == WSAEWOULDBLOCK) {
    EnterCriticalSection(&cs);
    _connecting.SetAt(s,s);
    LeaveCriticalSection(&cs);
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int	CWsHook::recv(SOCKET s, char FAR * buf, int len, int flags) {
  int ret = SOCKET_ERROR;
  if (_recv) {
    ret = _recv(s, buf, len, flags);
  }
  if (!_test_state._exit) {
    if (_sockets.IsSsl(s)) {
      if (ret > 0) {
        _sockets.SslRecvActivity(s);
      }
    } else if (ret == SOCKET_ERROR && len == 1) {
      _sockets.SetSslSocket(s);
    } else if (ret > 0 && !flags && buf && len) {
      _sockets.DataIn(s, DataChunk(buf, ret));
    }
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int	CWsHook::WSARecv(SOCKET s, LPWSABUF lpBuffers, DWORD dwBufferCount, 
                     LPDWORD lpNumberOfBytesRecvd, LPDWORD lpFlags, 
                     LPWSAOVERLAPPED lpOverlapped, 
                     LPWSAOVERLAPPED_COMPLETION_ROUTINE lpCompletionRoutine) {
  int ret = SOCKET_ERROR;
  if (_WSARecv) {
    ret = _WSARecv(s, lpBuffers, dwBufferCount, lpNumberOfBytesRecvd, lpFlags, 
                                            lpOverlapped, lpCompletionRoutine);
  }
  if (!_test_state._exit) {
    if (_sockets.IsSsl(s)) {
      if (ret == 0) {
        _sockets.SslRecvActivity(s);
      }
    } else if (ret == 0 && lpBuffers && dwBufferCount &&
               lpNumberOfBytesRecvd && *lpNumberOfBytesRecvd) {
      DWORD num_bytes = *lpNumberOfBytesRecvd;
      for (DWORD i = 0; i < dwBufferCount && num_bytes > 0; ++i) {
        DWORD buffer_size = min(lpBuffers[i].len, num_bytes);
        if (buffer_size) {
          if (lpBuffers[i].buf) {
            _sockets.DataIn(s, DataChunk(lpBuffers[i].buf, buffer_size));
          }
          num_bytes -= buffer_size;
        }
      }
    } else if (ret == SOCKET_ERROR && lpBuffers && dwBufferCount &&
               lpOverlapped) {
      WsaBuffTracker buff(lpBuffers, dwBufferCount);
      recv_buffers.SetAt(lpOverlapped, buff);
    }
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int CWsHook::send(SOCKET s, const char FAR * buf, int len, int flags) {
  int ret = SOCKET_ERROR;
  if (_send) {
    DataChunk chunk(buf, len);
    int original_len = len;
    bool is_ssl = _sockets.IsSsl(s);
    if (len && !_test_state._exit && !is_ssl) {
      _sockets.ModifyDataOut(s, chunk);
      _sockets.DataOut(s, chunk);
    }
    ret = _send(s, chunk.GetData(), chunk.GetLength(), flags);
    if (!_test_state._exit && is_ssl && ret > 0) {
      _sockets.SslSendActivity(s);
    }
    ret = original_len;
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int CWsHook::WSASend(SOCKET s, LPWSABUF lpBuffers, DWORD dwBufferCount,
              LPDWORD lpNumberOfBytesSent, DWORD dwFlags, 
              LPWSAOVERLAPPED lpOverlapped,
              LPWSAOVERLAPPED_COMPLETION_ROUTINE lpCompletionRoutine) {
  int ret = SOCKET_ERROR;
  if (_WSASend) {
    bool is_modified = 0;
    unsigned original_len = 0;
    DataChunk chunk;
    bool is_ssl = _sockets.IsSsl(s);
    if (!_test_state._exit && !is_ssl) {
      for (DWORD i = 0; i < dwBufferCount; i++) {
        original_len += lpBuffers[i].len;
      }
      // Concatenate all the buffers together.
      LPSTR data = chunk.AllocateLength(original_len);
      for (DWORD i = 0; i < dwBufferCount; i++) {
        DWORD buffer_len = lpBuffers[i].len;
        if (buffer_len && lpBuffers[i].buf) {
          memcpy(data, lpBuffers[i].buf, buffer_len);
        }
        data += buffer_len;
      }
      is_modified = _sockets.ModifyDataOut(s, chunk);
      _sockets.DataOut(s, chunk);
    }
    if (is_modified) {
      WSABUF out;
      out.buf = (char *)chunk.GetData();
      out.len = chunk.GetLength();
      ret = _WSASend(s, &out, 1, lpNumberOfBytesSent, dwFlags, lpOverlapped,
                     lpCompletionRoutine);
      // Respond with the number of bytes the sending app was expecting
      // to be written.  It can get confused if you write more data than
      // they provided.
      if (lpNumberOfBytesSent)
        *lpNumberOfBytesSent = original_len;
      if (WSAGetLastError() == WSA_IO_PENDING) {
        // TODO: figure out how to delete the buffer later and return the real
        // number of bytes transmitted to the calling app
      }
    } else {
      ret = _WSASend(s, lpBuffers, dwBufferCount, lpNumberOfBytesSent,
                     dwFlags, lpOverlapped, lpCompletionRoutine);
    }
    if (!_test_state._exit && is_ssl && ret == 0) {
      _sockets.SslSendActivity(s);
    }
  }
  return ret;
}

/*-----------------------------------------------------------------------------
  Check for completion of an async connect
-----------------------------------------------------------------------------*/
int CWsHook::select(int nfds, fd_set FAR * readfds, fd_set FAR * writefds,
              fd_set FAR * exceptfds, const struct timeval FAR * timeout) {
  int ret = SOCKET_ERROR;
  if (_select)
    ret = _select(nfds, readfds, writefds, exceptfds, timeout);
  if (ret > 0 && writefds && writefds->fd_count && !_connecting.IsEmpty()) {
    EnterCriticalSection(&cs);
    for (u_int i = 0; i < writefds->fd_count; i++) {
      SOCKET s = writefds->fd_array[i];
      if (_connecting.RemoveKey(s))
        _sockets.Connected(s);
    }
    LeaveCriticalSection(&cs);
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int	CWsHook::getaddrinfo(PCSTR pNodeName, PCSTR pServiceName, 
                             const ADDRINFOA * pHints, PADDRINFOA * ppResult) {
  int ret = WSAEINVAL;
  void * context = NULL;
  CString name = CA2T(pNodeName);
  if (!_test_state._exit)
    context = _dns.LookupStart(name);

  if (_getaddrinfo)
    ret = _getaddrinfo(CT2A((LPCTSTR)name), pServiceName, pHints, ppResult);

  if (!ret && !_test_state._exit) {
    PADDRINFOA addr = *ppResult;
    while (addr) {
      if (addr->ai_addrlen >= sizeof(struct sockaddr_in) && 
          addr->ai_family == AF_INET) {
        struct sockaddr_in * ipName = (struct sockaddr_in *)addr->ai_addr;
        _dns.LookupAddress(context, ipName->sin_addr.S_un.S_addr);
      }
      addr = addr->ai_next;
    }
  }

  if (context && !_test_state._exit)
    _dns.LookupDone(context, ret);

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int	CWsHook::GetAddrInfoW(PCWSTR pNodeName, PCWSTR pServiceName, 
                             const ADDRINFOW * pHints, PADDRINFOW * ppResult) {
  int ret = WSAEINVAL;
  void * context = NULL;
  CString name = CW2T(pNodeName);
  if (!_test_state._exit)
      context = _dns.LookupStart(name);

  if (_GetAddrInfoW)
    ret = _GetAddrInfoW(CT2W((LPCWSTR)name), pServiceName, pHints, ppResult);

  if (!ret && !_test_state._exit) {
    PADDRINFOA addr = (PADDRINFOA)*ppResult;
    while (addr) {
      if (addr->ai_addrlen >= sizeof(struct sockaddr_in) && 
          addr->ai_family == AF_INET) {
        struct sockaddr_in * ipName = (struct sockaddr_in *)addr->ai_addr;
        _dns.LookupAddress(context, ipName->sin_addr.S_un.S_addr);
      }
      addr = addr->ai_next;
    }
  }

  if (context)
    _dns.LookupDone(context, ret);

  return ret;
}

/*-----------------------------------------------------------------------------
  Firefox falls back to gethostbyname if ipv6 isn't detected on the machine
-----------------------------------------------------------------------------*/
struct hostent * CWsHook::gethostbyname(const char * pNodeName) {
  struct hostent * ret = NULL;

  void * context = NULL;
  CString name = CA2T(pNodeName);
  if (!_test_state._exit)
      context = _dns.LookupStart(name);

  if (_gethostbyname)
    ret = _gethostbyname((LPCSTR)CT2A(name));

  if (ret && !_test_state._exit) {
    int i = 0;
    while (ret->h_addr_list[i] != 0) {
      _dns.LookupAddress(context, *(u_long *)ret->h_addr_list[i]);
      i++;
    }
  }

  int err = WSAHOST_NOT_FOUND;
  if (ret)
    err = 0;
  if (context)
    _dns.LookupDone(context, err);

  return ret;
}

/*-----------------------------------------------------------------------------
  Free the descriptor if it is one that we allocated, otherwise pass it through
-----------------------------------------------------------------------------*/
void CWsHook::freeaddrinfo(PADDRINFOA pAddrInfo) {
  void * mem = NULL;
  EnterCriticalSection(&cs);
  if (dns_override.Lookup(pAddrInfo, mem))
    dns_override.RemoveKey(pAddrInfo);
  LeaveCriticalSection(&cs);

  if( mem )
    free(mem);
  else if(_freeaddrinfo)
    _freeaddrinfo(pAddrInfo);
}

/*-----------------------------------------------------------------------------
  Free the descriptor if it is one that we allocated, otherwise pass it through
-----------------------------------------------------------------------------*/
void CWsHook::FreeAddrInfoW(PADDRINFOW pAddrInfo) {
  void * mem = NULL;
  EnterCriticalSection(&cs);
  if (dns_override.Lookup(pAddrInfo, mem))
    dns_override.RemoveKey(pAddrInfo);
  LeaveCriticalSection(&cs);

  if( mem )
    free(mem);
  else if(_FreeAddrInfoW)
    _FreeAddrInfoW(pAddrInfo);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL CWsHook::WSAGetOverlappedResult(SOCKET s, LPWSAOVERLAPPED lpOverlapped,
              LPDWORD lpcbTransfer, BOOL fWait, LPDWORD lpdwFlags) {
  BOOL ret = false;

  if (_WSAGetOverlappedResult)
    ret = _WSAGetOverlappedResult(s, lpOverlapped, lpcbTransfer, fWait, 
                                  lpdwFlags);

  if (ret && lpcbTransfer && !_test_state._exit) {
    WsaBuffTracker buff;
    if (recv_buffers.Lookup(lpOverlapped, buff)) {
      DWORD bytes = *lpcbTransfer;
      for (DWORD i = 0; i < buff._buffer_count && bytes; i++) {
        DWORD data_bytes = min(bytes, buff._buffers[i].len);
        if (data_bytes && buff._buffers[i].buf) {
          _sockets.DataIn(s, DataChunk(buff._buffers[i].buf, data_bytes));
          bytes -= data_bytes;
        }
      }
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int CWsHook::WSAEventSelect(SOCKET s, WSAEVENT hEventObject, 
                                long lNetworkEvents) {
  int ret = SOCKET_ERROR;
  if (_WSAEventSelect)
    ret = _WSAEventSelect(s, hEventObject, lNetworkEvents);
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int CWsHook::WSAEnumNetworkEvents(SOCKET s, WSAEVENT hEventObject, 
                            LPWSANETWORKEVENTS lpNetworkEvents) {
  int ret = SOCKET_ERROR;

  if (_WSAEnumNetworkEvents)
    ret = _WSAEnumNetworkEvents(s, hEventObject, lpNetworkEvents);

  if (!ret && !_test_state._exit && 
      lpNetworkEvents && lpNetworkEvents->lNetworkEvents & FD_CONNECT)
    _sockets.Connected(s);

  return ret;
}
