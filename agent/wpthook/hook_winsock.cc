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

//#define TRACE_WINSOCK 1

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

BOOL PASCAL ConnectEx_Hook(SOCKET s, const struct sockaddr FAR *name,
    int namelen, PVOID lpSendBuffer, DWORD dwSendDataLength,
    LPDWORD lpdwBytesSent, LPOVERLAPPED lpOverlapped) {
  BOOL ret = FALSE;
  if (pHook)
    pHook->ConnectEx(s, name, namelen, lpSendBuffer, dwSendDataLength,
                     lpdwBytesSent, lpOverlapped);
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
    ret = pHook->getaddrinfo(pNodeName, pServiceName, 
                             (ADDRINFOA *)pHints, ppResult);
  return ret;
}

int WSAAPI GetAddrInfoW_Hook(PCWSTR pNodeName, PCWSTR pServiceName, 
                             const ADDRINFOW * pHints, PADDRINFOW * ppResult) {
  int ret = WSAEINVAL;
  if (pHook)
    ret = pHook->GetAddrInfoW(pNodeName, pServiceName, 
                              (ADDRINFOW *)pHints, ppResult);
  return ret;
}

struct hostent * WSAAPI gethostbyname_Hook(const char * name) {
  struct hostent * ret = NULL;
  if (pHook)
    ret = pHook->gethostbyname(name);
  return ret;
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

int WSAAPI GetAddrInfoExA_Hook(PCSTR pName, PCSTR pServiceName, DWORD dwNameSpace,
    LPGUID lpNspId, const ADDRINFOEXA *hints, PADDRINFOEXA *ppResult,
    struct timeval *timeout, LPOVERLAPPED lpOverlapped,
    LPLOOKUPSERVICE_COMPLETION_ROUTINE lpCompletionRoutine,
    LPHANDLE lpNameHandle) {
  int ret = EAI_FAIL;
  if (pHook)
    ret = pHook->GetAddrInfoExA(pName, pServiceName, dwNameSpace, lpNspId,
        (ADDRINFOEXA *)hints, ppResult, timeout, lpOverlapped,
        lpCompletionRoutine, lpNameHandle);
  return ret;
}

int WSAAPI GetAddrInfoExW_Hook(PCWSTR pName, PCWSTR pServiceName, DWORD dwNameSpace,
    LPGUID lpNspId, const ADDRINFOEXW *hints, PADDRINFOEXW *ppResult,
    struct timeval *timeout, LPOVERLAPPED lpOverlapped,
    LPLOOKUPSERVICE_COMPLETION_ROUTINE lpCompletionRoutine,
    LPHANDLE lpHandle) {
  int ret = EAI_FAIL;
  if (pHook)
    ret = pHook->GetAddrInfoExW(pName, pServiceName, dwNameSpace, lpNspId,
        (ADDRINFOEXW *)hints, ppResult, timeout, lpOverlapped,
        lpCompletionRoutine, lpHandle);
  return ret;
}

PTP_IO WINAPI CreateThreadpoolIo_Hook(HANDLE fl,
    PTP_WIN32_IO_CALLBACK_WPT pfnio, PVOID pv, PTP_CALLBACK_ENVIRON pcbe) {
  PTP_IO ret = NULL;
  if (pHook)
    ret = pHook->CreateThreadpoolIo(fl, pfnio, pv, pcbe, false);
  return ret;
}

PTP_IO WINAPI CreateThreadpoolIo_base_Hook(HANDLE fl,
    PTP_WIN32_IO_CALLBACK_WPT pfnio, PVOID pv, PTP_CALLBACK_ENVIRON pcbe) {
  PTP_IO ret = NULL;
  if (pHook)
    ret = pHook->CreateThreadpoolIo(fl, pfnio, pv, pcbe, true);
  return ret;
}

void WINAPI CloseThreadpoolIo_Hook(PTP_IO pio) {
  if (pHook)
    pHook->CloseThreadpoolIo(pio, false);
}

void WINAPI CloseThreadpoolIo_base_Hook(PTP_IO pio) {
  if (pHook)
    pHook->CloseThreadpoolIo(pio, true);
}

void WINAPI StartThreadpoolIo_Hook(PTP_IO pio) {
  if (pHook)
    pHook->StartThreadpoolIo(pio, false);
}

void WINAPI StartThreadpoolIo_base_Hook(PTP_IO pio) {
  if (pHook)
    pHook->StartThreadpoolIo(pio, true);
}

int WSAAPI WSAIoctl_Hook(SOCKET s, DWORD dwIoControlCode, LPVOID lpvInBuffer,
  DWORD cbInBuffer, LPVOID lpvOutBuffer, DWORD cbOutBuffer,
  LPDWORD lpcbBytesReturned, LPWSAOVERLAPPED lpOverlapped,
  LPWSAOVERLAPPED_COMPLETION_ROUTINE lpCompletionRoutine) {
  int ret = SOCKET_ERROR;
  if (pHook)
    ret = pHook->WSAIoctl(s, dwIoControlCode, lpvInBuffer, cbInBuffer,
                          lpvOutBuffer, cbOutBuffer, lpcbBytesReturned,
                          lpOverlapped, lpCompletionRoutine);
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
  , _dns(dns)
  , _sockets(sockets)
  , _test_state(test_state) {
  _recv_buffers.InitHashTable(257);
  _send_buffers.InitHashTable(257);
  _send_buffer_original_length.InitHashTable(257);
  _threadpool_callbacks.InitHashTable(257);
  _threadpool_sockets.InitHashTable(257);
  _connecting.InitHashTable(257);
  _connectex_functions.InitHashTable(257);
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
  _GetAddrInfoExA = hook.createHookByName("ws2_32.dll", "GetAddrInfoExA", 
                                          GetAddrInfoExA_Hook);
  _GetAddrInfoExW = hook.createHookByName("ws2_32.dll", "GetAddrInfoExW", 
                                          GetAddrInfoExW_Hook);
  _WSARecv = hook.createHookByName("ws2_32.dll", "WSARecv", WSARecv_Hook);
  _WSASend = hook.createHookByName("ws2_32.dll", "WSASend", WSASend_Hook);
  _WSAGetOverlappedResult = hook.createHookByName("ws2_32.dll", 
      "WSAGetOverlappedResult", WSAGetOverlappedResult_Hook);
  _WSAEventSelect = hook.createHookByName("ws2_32.dll", "WSAEventSelect",
                                          WSAEventSelect_Hook);
  _WSAEnumNetworkEvents = hook.createHookByName("ws2_32.dll",
      "WSAEnumNetworkEvents", WSAEnumNetworkEvents_Hook);
  _CreateThreadpoolIo = hook.createHookByName("kernel32.dll",
      "CreateThreadpoolIo", CreateThreadpoolIo_Hook);
  _CreateThreadpoolIo_base = hook.createHookByName("kernelbase.dll",
      "CreateThreadpoolIo", CreateThreadpoolIo_base_Hook);
  _CloseThreadpoolIo = hook.createHookByName("kernelbase.dll",
      "CloseThreadpoolIo", CloseThreadpoolIo_Hook);
  _CloseThreadpoolIo_base = hook.createHookByName("kernel32.dll",
      "CloseThreadpoolIo", CloseThreadpoolIo_base_Hook);
  _StartThreadpoolIo = hook.createHookByName("kernelbase.dll",
      "StartThreadpoolIo", StartThreadpoolIo_Hook);
  _StartThreadpoolIo_base = hook.createHookByName("kernel32.dll",
      "StartThreadpoolIo", StartThreadpoolIo_base_Hook);
  _WSAIoctl = hook.createHookByName("ws2_32.dll", "WSAIoctl", WSAIoctl_Hook);

  // only hook the A version if the W version wasn't present (XP SP1 or below)
  if (!_GetAddrInfoW)
    _getaddrinfo = hook.createHookByName("ws2_32.dll", "getaddrinfo", 
                                         getaddrinfo_Hook);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CWsHook::~CWsHook(void) {
  if( pHook == this )
    pHook = NULL;

  EnterCriticalSection(&cs);
  _send_buffers.RemoveAll();
  _send_buffer_original_length.RemoveAll();
  LeaveCriticalSection(&cs);

  DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SOCKET CWsHook::WSASocketW(int af, int type, int protocol, 
                  LPWSAPROTOCOL_INFOW lpProtocolInfo, GROUP g, DWORD dwFlags) {
  SOCKET ret = INVALID_SOCKET;
  _sockets.ResetSslFd();
  if (_WSASocketW) {
    ret = _WSASocketW(af, type, protocol, lpProtocolInfo, g, dwFlags);
    if( ret != INVALID_SOCKET && !_test_state._exit )
      _sockets.Create(ret);
    }
#ifdef TRACE_WINSOCK
  ATLTRACE(_T("%d - WSASocketW, socket created"), ret);
#endif
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int CWsHook::closesocket(SOCKET s) {
#ifdef TRACE_WINSOCK
  ATLTRACE(_T("%d - closesocket"), s);
#endif
  int ret = SOCKET_ERROR;
  _sockets.ResetSslFd();
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
#ifdef TRACE_WINSOCK
  if (namelen >= sizeof(struct sockaddr_in) && name->sa_family == AF_INET) {
    struct sockaddr_in* ip_name = (struct sockaddr_in *)name;
    ATLTRACE(_T("%d - connect started to %d.%d.%d.%d"), s,
             ip_name->sin_addr.S_un.S_un_b.s_b1,
             ip_name->sin_addr.S_un.S_un_b.s_b2,
             ip_name->sin_addr.S_un.S_un_b.s_b3,
             ip_name->sin_addr.S_un.S_un_b.s_b4);
  } else {
    ATLTRACE(_T("%d - connect started, unsupported protocol"), s);
  }
#endif
  int ret = SOCKET_ERROR;
  bool allowed = true;
  _sockets.ResetSslFd();
  if (!_test_state._exit)
    allowed = _sockets.Connect(s, name, namelen);
  if (allowed && _connect)
    ret = _connect(s, name, namelen);
  if (!ret) {
    _sockets.Connected(s);
#ifdef TRACE_WINSOCK
  ATLTRACE(_T("%d - connected synchronously"), s);
#endif
  } else if(ret == SOCKET_ERROR && WSAGetLastError() == WSAEWOULDBLOCK) {
    EnterCriticalSection(&cs);
    _connecting.SetAt(s,s);
    LeaveCriticalSection(&cs);
#ifdef TRACE_WINSOCK
  ATLTRACE(_T("%d - async connect started"), s);
#endif
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL CWsHook::ConnectEx(SOCKET s, const struct sockaddr FAR *name, int namelen,
    PVOID lpSendBuffer, DWORD dwSendDataLength, LPDWORD lpdwBytesSent,
    LPOVERLAPPED lpOverlapped) {
#ifdef TRACE_WINSOCK
  if (namelen >= sizeof(struct sockaddr_in) && name->sa_family == AF_INET) {
    struct sockaddr_in* ip_name = (struct sockaddr_in *)name;
    ATLTRACE(_T("%d - ConnectEx started to %d.%d.%d.%d"), s,
             ip_name->sin_addr.S_un.S_un_b.s_b1,
             ip_name->sin_addr.S_un.S_un_b.s_b2,
             ip_name->sin_addr.S_un.S_un_b.s_b3,
             ip_name->sin_addr.S_un.S_un_b.s_b4);
  } else {
    ATLTRACE(_T("%d - ConnectEx started, unsupported protocol"), s);
  }
#endif
  BOOL ret = FALSE;
  bool allowed = true;
  _sockets.ResetSslFd();
  if (!_test_state._exit)
    allowed = _sockets.Connect(s, name, namelen);
  if (allowed) {
    LPFN_CONNECTEX_WPT connect_ex = NULL;
    EnterCriticalSection(&cs);
    _connectex_functions.Lookup(s, connect_ex);
    LeaveCriticalSection(&cs);
    if (connect_ex)
      ret = connect_ex(s, name, namelen, lpSendBuffer, dwSendDataLength,
                       lpdwBytesSent, lpOverlapped);
    if (ret) {
      _sockets.Connected(s);
#ifdef TRACE_WINSOCK
    ATLTRACE(_T("%d - ConnectEx connected synchronously"), s);
#endif
    } else if (WSAGetLastError() == ERROR_IO_PENDING) {
      EnterCriticalSection(&cs);
      _connecting.SetAt(s,s);
      LeaveCriticalSection(&cs);
#ifdef TRACE_WINSOCK
    ATLTRACE(_T("%d - ConnectEx async connect started"), s);
#endif
    }
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int	CWsHook::recv(SOCKET s, char FAR * buf, int len, int flags) {
  int ret = SOCKET_ERROR;
  if (_recv)
    ret = _recv(s, buf, len, flags);
  if (!_test_state._exit) {
    if (ret == SOCKET_ERROR && len == 1) {
      _sockets.SetSslSocket(s);
    } else if (ret > 0 && !flags && buf && len) {
      DataChunk chunk(buf, ret);
      _sockets.DataIn(s, chunk, false);
    }
  }
#ifdef TRACE_WINSOCK
  ATLTRACE(_T("%d - recv, %d byte buffer returned %d"), s, len, ret);
#endif
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int	CWsHook::WSARecv(SOCKET s, LPWSABUF lpBuffers, DWORD dwBufferCount, 
                     LPDWORD lpNumberOfBytesRecvd, LPDWORD lpFlags, 
                     LPWSAOVERLAPPED lpOverlapped, 
                     LPWSAOVERLAPPED_COMPLETION_ROUTINE lpCompletionRoutine) {
  int ret = SOCKET_ERROR;
  if (_WSARecv)
    ret = _WSARecv(s, lpBuffers, dwBufferCount, lpNumberOfBytesRecvd, lpFlags, 
                                            lpOverlapped, lpCompletionRoutine);

  if (!_test_state._exit && lpBuffers && dwBufferCount) {
    if (ret == 0 && lpNumberOfBytesRecvd && *lpNumberOfBytesRecvd) {
      DWORD num_bytes = *lpNumberOfBytesRecvd;
      for (DWORD i = 0; i < dwBufferCount && num_bytes > 0; ++i) {
        DWORD buffer_size = min(lpBuffers[i].len, num_bytes);
        if (buffer_size) {
          if (lpBuffers[i].buf) {
            DataChunk chunk(lpBuffers[i].buf, buffer_size);
            _sockets.DataIn(s, chunk, false);
          }
          num_bytes -= buffer_size;
        }
      }
    } else if (ret == SOCKET_ERROR && lpOverlapped) {
      WsaBuffTracker buff(lpBuffers, dwBufferCount);
      _recv_buffers.SetAt(lpOverlapped, buff);
    }
  }
  _sockets.ResetSslFd();
#ifdef TRACE_WINSOCK
  ATLTRACE(_T("%d - WSARecv returned %d"), s, ret);
#endif
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int CWsHook::send(SOCKET s, const char FAR * buf, int len, int flags) {
  int ret = SOCKET_ERROR;
#ifdef TRACE_WINSOCK
  ATLTRACE(_T("%d - send %d bytes"), s, len);
#endif
  if (_send) {
    _sockets.ClaimSslFd(s);
    DataChunk chunk(buf, len);
    int original_len = len;
    if (len && !_test_state._exit) {
      _sockets.SniffSSL(s, chunk);
      _sockets.ModifyDataOut(s, chunk, false);
      _sockets.DataOut(s, chunk, false);
    }
    ret = _send(s, chunk.GetData(), chunk.GetLength(), flags);
    if (ret != SOCKET_ERROR) {
        ret = original_len;
    }
  }
  _sockets.ResetSslFd();
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int CWsHook::WSASend(SOCKET s, LPWSABUF lpBuffers, DWORD dwBufferCount,
              LPDWORD lpNumberOfBytesSent, DWORD dwFlags, 
              LPWSAOVERLAPPED lpOverlapped,
              LPWSAOVERLAPPED_COMPLETION_ROUTINE lpCompletionRoutine) {
  int ret = SOCKET_ERROR;
#ifdef TRACE_WINSOCK
  ATLTRACE(_T("%d - WSASend %d buffers"), s, dwBufferCount);
#endif
  if (_WSASend) {
    _sockets.ClaimSslFd(s);
    bool is_modified = 0;
    unsigned original_len = 0;
    DataChunk chunk;
    if (!_test_state._exit) {
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
      _sockets.SniffSSL(s, chunk);
      is_modified = _sockets.ModifyDataOut(s, chunk, false);
      _sockets.DataOut(s, chunk, false);
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
      if (!ret) {
        if (lpNumberOfBytesSent && *lpNumberOfBytesSent == out.len) {
          *lpNumberOfBytesSent = original_len;
        }
      } else if (WSAGetLastError() == WSA_IO_PENDING) {
        _send_buffers.SetAt(lpOverlapped, chunk);
      }
    } else {
      ret = _WSASend(s, lpBuffers, dwBufferCount, lpNumberOfBytesSent,
                     dwFlags, lpOverlapped, lpCompletionRoutine);
    }
  }
  _sockets.ResetSslFd();
  return ret;
}

/*-----------------------------------------------------------------------------
  Check for completion of an async connect
-----------------------------------------------------------------------------*/
int CWsHook::select(int nfds, fd_set FAR * readfds, fd_set FAR * writefds,
              fd_set FAR * exceptfds, const struct timeval FAR * timeout) {
  int ret = SOCKET_ERROR;
  _sockets.ResetSslFd();
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
#ifdef TRACE_WINSOCK
  ATLTRACE(_T("select returned %d"), ret);
#endif
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int	CWsHook::getaddrinfo(PCSTR pNodeName, PCSTR pServiceName, 
                         ADDRINFOA * pHints, PADDRINFOA * ppResult) {
  int ret = WSAEINVAL;
  _sockets.ResetSslFd();
  void * context = NULL;
  CString name = CA2T(pNodeName, CP_UTF8);
  if (!_dns.BlockLookup(name)) {
    if (!_test_state._exit)
      context = _dns.LookupStart(name);
    if (pHints)
      pHints->ai_flags |= AI_CANONNAME;

    if (_getaddrinfo)
      ret = _getaddrinfo(CT2A((LPCTSTR)name), pServiceName, pHints, ppResult);

    if (!ret && !_test_state._exit) {
      PADDRINFOA addr = *ppResult;
      int count = 0;
      while (addr && count < 100) {
        count++;
        if (addr->ai_canonname)
          _dns.LookupAlias(name, (LPCTSTR)CA2T(addr->ai_canonname, CP_UTF8));
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
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int	CWsHook::GetAddrInfoW(PCWSTR pNodeName, PCWSTR pServiceName, 
                          ADDRINFOW * pHints, PADDRINFOW * ppResult) {
  int ret = WSAEINVAL;
  _sockets.ResetSslFd();
  void * context = NULL;
  CString name = CW2T(pNodeName);
  if (!_dns.BlockLookup(name)) {
    if (!_test_state._exit)
        context = _dns.LookupStart(name);
    if (pHints && !(pHints->ai_flags & AI_FQDN))
      pHints->ai_flags |= AI_CANONNAME;

    if (_GetAddrInfoW)
      ret = _GetAddrInfoW(CT2W((LPCWSTR)name), pServiceName, pHints, ppResult);

    if (!ret && !_test_state._exit) {
      PADDRINFOW addr = (PADDRINFOW)*ppResult;
      int count = 0;
      while (addr && count < 100) {
        count++;
        if (addr->ai_canonname)
          _dns.LookupAlias(name, addr->ai_canonname);
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
  }
  return ret;
}

/*-----------------------------------------------------------------------------
  Firefox falls back to gethostbyname if ipv6 isn't detected on the machine
-----------------------------------------------------------------------------*/
struct hostent * CWsHook::gethostbyname(const char * pNodeName) {
  struct hostent * ret = NULL;
  _sockets.ResetSslFd();
  void * context = NULL;
  CString name = CA2T(pNodeName, CP_UTF8);
  if (!_dns.BlockLookup(name)) {
    if (!_test_state._exit)
        context = _dns.LookupStart(name);

    if (_gethostbyname)
      ret = _gethostbyname((LPCSTR)CT2A(name));

    if (ret && !_test_state._exit) {
      if (ret->h_name)
        _dns.LookupAlias(name, (LPCTSTR)CA2T(ret->h_name, CP_UTF8));
      char ** alias = ret->h_aliases;
      int count = 0;
      while (*alias && count < 100) {
        count++;
        _dns.LookupAlias(name, (LPCTSTR)CA2T(*alias, CP_UTF8));
        alias++;
      }    
      for (int i = 0; ret->h_addr_list[i] != 0; i++)
        _dns.LookupAddress(context, *(u_long *)ret->h_addr_list[i]);
    }

    int err = WSAHOST_NOT_FOUND;
    if (ret)
      err = 0;
    if (context)
      _dns.LookupDone(context, err);
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWsHook::ProcessOverlappedIo(SOCKET s, LPOVERLAPPED lpOverlapped,
                                  LPDWORD lpNumberOfBytesTransferred) {
  WsaBuffTracker buff;
  // handle a receive
  if (_recv_buffers.Lookup(lpOverlapped, buff)) {
    DWORD bytes = *lpNumberOfBytesTransferred;
    for (DWORD i = 0; i < buff._buffer_count && bytes; i++) {
      DWORD data_bytes = min(bytes, buff._buffers[i].len);
      if (data_bytes && buff._buffers[i].buf) {
        DataChunk chunk(buff._buffers[i].buf, data_bytes);
        _sockets.DataIn(s, chunk, false);
        bytes -= data_bytes;
      }
    }
  }
  // handle a send (where we modified the outbound headers)
  DataChunk chunk;
  if (_send_buffers.Lookup(lpOverlapped, chunk)) {
    _send_buffers.RemoveKey(lpOverlapped);
    if (lpNumberOfBytesTransferred) {
      DWORD len = *lpNumberOfBytesTransferred;
      if (_send_buffer_original_length.Lookup(lpOverlapped, len)) {
        _send_buffer_original_length.RemoveKey(lpOverlapped);
        *lpNumberOfBytesTransferred = len;
      }
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL CWsHook::WSAGetOverlappedResult(SOCKET s, LPWSAOVERLAPPED lpOverlapped,
              LPDWORD lpcbTransfer, BOOL fWait, LPDWORD lpdwFlags) {
#ifdef TRACE_WINSOCK
  ATLTRACE(_T("%d - WSAGetOverlappedResult"), s);
#endif
  BOOL ret = false;
  _sockets.ResetSslFd();
  if (_WSAGetOverlappedResult)
    ret = _WSAGetOverlappedResult(s, lpOverlapped, lpcbTransfer, fWait, 
                                  lpdwFlags);

  if (ret && lpcbTransfer && !_test_state._exit)
    ProcessOverlappedIo(s, lpOverlapped, lpcbTransfer);

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int CWsHook::WSAEventSelect(SOCKET s, WSAEVENT hEventObject, 
                                long lNetworkEvents) {
#ifdef TRACE_WINSOCK
  ATLTRACE(_T("%d - WSAEventSelect"), s);
#endif
  int ret = SOCKET_ERROR;
  _sockets.ResetSslFd();
  if (_WSAEventSelect)
    ret = _WSAEventSelect(s, hEventObject, lNetworkEvents);
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int CWsHook::WSAEnumNetworkEvents(SOCKET s, WSAEVENT hEventObject, 
                            LPWSANETWORKEVENTS lpNetworkEvents) {
#ifdef TRACE_WINSOCK
  ATLTRACE(_T("%d - WSAEnumNetworkEvents"), s);
#endif
  int ret = SOCKET_ERROR;
  _sockets.ResetSslFd();
  if (_WSAEnumNetworkEvents)
    ret = _WSAEnumNetworkEvents(s, hEventObject, lpNetworkEvents);

  if (!ret && !_test_state._exit && 
      lpNetworkEvents && lpNetworkEvents->lNetworkEvents & FD_CONNECT)
    _sockets.Connected(s);

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int CWsHook::GetAddrInfoExA(PCSTR pName, PCSTR pServiceName, DWORD dwNameSpace,
    LPGUID lpNspId, ADDRINFOEXA *hints, PADDRINFOEXA *ppResult,
    struct timeval *timeout, LPOVERLAPPED lpOverlapped,
    LPLOOKUPSERVICE_COMPLETION_ROUTINE lpCompletionRoutine,
    LPHANDLE lpNameHandle) {
#ifdef TRACE_WINSOCK
  ATLTRACE(_T("GetAddrInfoExA - %S"), pName);
#endif
  int ret = EAI_FAIL;
  _sockets.ResetSslFd();
  void * context = NULL;
  CString name = (LPCWSTR)CA2W(pName);
  if (!_dns.BlockLookup(name)) {
    if (!_test_state._exit)
        context = _dns.LookupStart(name);
    if (hints  && !(hints->ai_flags & AI_FQDN))
      hints->ai_flags |= AI_CANONNAME;

    if (_GetAddrInfoExA)
      ret = _GetAddrInfoExA((LPCSTR)CW2A(name), pServiceName, dwNameSpace,
          lpNspId, hints, ppResult, timeout, lpOverlapped, lpCompletionRoutine,
          lpNameHandle);

    int err = WSAHOST_NOT_FOUND;
    if (ret == NO_ERROR && ppResult && *ppResult) {
      PADDRINFOEXA addr = *ppResult;
      int count = 0;
      while (addr && count < 100) {
        count++;
        if (addr->ai_canonname)
          _dns.LookupAlias(name, (LPCTSTR)CA2T(addr->ai_canonname, CP_UTF8));
        if (addr->ai_addrlen >= sizeof(struct sockaddr_in) && 
            addr->ai_family == AF_INET) {
          struct sockaddr_in * ipName = (struct sockaddr_in *)addr->ai_addr;
          _dns.LookupAddress(context, ipName->sin_addr.S_un.S_addr);
        }
        addr = addr->ai_next;
      }
      err = 0;
    }
    if (context)
      _dns.LookupDone(context, err);
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int CWsHook::GetAddrInfoExW(PCWSTR pName, PCWSTR pServiceName, DWORD dwNameSpace,
    LPGUID lpNspId, ADDRINFOEXW *hints, PADDRINFOEXW *ppResult,
    struct timeval *timeout, LPOVERLAPPED lpOverlapped,
    LPLOOKUPSERVICE_COMPLETION_ROUTINE lpCompletionRoutine,
    LPHANDLE lpHandle) {
#ifdef TRACE_WINSOCK
  ATLTRACE(_T("GetAddrInfoExW - %s, overlapped = 0x%p, completion = 0x%p"),
      pName, lpOverlapped, lpCompletionRoutine);
#endif
  int ret = EAI_FAIL;
  _sockets.ResetSslFd();
  void * context = NULL;
  CString name = pName;
  if (!_dns.BlockLookup(name)) {
    if (!_test_state._exit)
        context = _dns.LookupStart(name);
    if (hints && !(hints->ai_flags & AI_FQDN))
      hints->ai_flags |= AI_CANONNAME;

    if (_GetAddrInfoExW)
      ret = _GetAddrInfoExW(LPCWSTR(name), pServiceName, dwNameSpace, lpNspId,
          hints, ppResult, timeout, lpOverlapped, lpCompletionRoutine,
          lpHandle);

    int err = WSAHOST_NOT_FOUND;
    if (ret == NO_ERROR && ppResult && *ppResult) {
      PADDRINFOEXW addr = *ppResult;
      int count = 0;
      while (addr && count < 100) {
        count++;
        if (addr->ai_canonname)
          _dns.LookupAlias(name, addr->ai_canonname);
        if (addr->ai_addrlen >= sizeof(struct sockaddr_in) && 
            addr->ai_family == AF_INET) {
          struct sockaddr_in * ipName = (struct sockaddr_in *)addr->ai_addr;
          _dns.LookupAddress(context, ipName->sin_addr.S_un.S_addr);
        }
        addr = addr->ai_next;
      }
      err = 0;
    }
    if (context)
      _dns.LookupDone(context, err);
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
VOID WINAPI ThreadpoolCallback(PTP_CALLBACK_INSTANCE Instance, PVOID Context,
    PVOID Overlapped, ULONG IoResult, ULONG_PTR NumberOfBytesTransferred,
    PTP_IO Io) {
  if (pHook)
    pHook->ThreadpoolCallback(Instance, Context, Overlapped, IoResult,
                              NumberOfBytesTransferred, Io);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWsHook::ThreadpoolCallback(PTP_CALLBACK_INSTANCE Instance, PVOID Context,
    PVOID Overlapped, ULONG IoResult, ULONG_PTR NumberOfBytesTransferred,
    PTP_IO Io) {
  PTP_WIN32_IO_CALLBACK_WPT callback = NULL;
  EnterCriticalSection(&cs);
  _threadpool_callbacks.Lookup(Io, callback);
  SOCKET s = INVALID_SOCKET;
  _threadpool_sockets.Lookup(Io, s);
  LeaveCriticalSection(&cs);
#ifdef TRACE_WINSOCK
  ATLTRACE(_T("%d: ThreadpoolCallback - %d bytes"), s,
           NumberOfBytesTransferred);
#endif
  if (s != INVALID_SOCKET && _connecting.RemoveKey(s)) {
    _sockets.Connected(s);
  }
  if (s != INVALID_SOCKET && 
      Overlapped && 
      NumberOfBytesTransferred &&
      !_test_state._exit) {
    DWORD bytes = NumberOfBytesTransferred;
    ProcessOverlappedIo(s, (LPOVERLAPPED)Overlapped, &bytes);
    NumberOfBytesTransferred = bytes;
  }
  if (callback)
    callback(Instance, Context, Overlapped, IoResult, NumberOfBytesTransferred,
             Io);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
PTP_IO CWsHook::CreateThreadpoolIo(HANDLE fl,
    PTP_WIN32_IO_CALLBACK_WPT pfnio, PVOID pv, PTP_CALLBACK_ENVIRON pcbe,
    bool kernelBase) {
  PTP_IO ret = NULL;
  if (kernelBase && _CreateThreadpoolIo_base)
    ret = _CreateThreadpoolIo_base(fl, ::ThreadpoolCallback, pv, pcbe);
  else if (!kernelBase && _CreateThreadpoolIo)
    ret = _CreateThreadpoolIo(fl, ::ThreadpoolCallback, pv, pcbe);
  EnterCriticalSection(&cs);
  if (ret && pfnio != ::ThreadpoolCallback) {
    _threadpool_callbacks.SetAt(ret, pfnio);
    _threadpool_sockets.SetAt(ret, (SOCKET)fl);
  }
  LeaveCriticalSection(&cs);
#ifdef TRACE_WINSOCK
  ATLTRACE(_T("%d: CreateThreadpoolIo (%s) - callback = 0x%p, pio = 0x%p"),
            fl, kernelBase ? _T("kernelbase") : _T("kernel32"), pfnio, ret);
#endif
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWsHook::CloseThreadpoolIo(PTP_IO pio, bool kernelBase) {
#ifdef TRACE_WINSOCK
  ATLTRACE(_T("CloseThreadpoolIo (%s) - pio = 0x%p"),
           kernelBase ? _T("kernelbase") : _T("kernel32"), pio);
#endif
  if (kernelBase && _CloseThreadpoolIo_base)
    _CloseThreadpoolIo_base(pio);
  else if (!kernelBase && _CloseThreadpoolIo)
    _CloseThreadpoolIo(pio);
  EnterCriticalSection(&cs);
  _threadpool_callbacks.RemoveKey(pio);
  _threadpool_sockets.RemoveKey(pio);
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWsHook::StartThreadpoolIo(PTP_IO pio, bool kernelBase) {
#ifdef TRACE_WINSOCK
  ATLTRACE(_T("StartThreadpoolIo (%s) - pio = 0x%p"),
           kernelBase ? _T("kernelbase") : _T("kernel32"), pio);
#endif
  if (kernelBase && _StartThreadpoolIo_base)
    _StartThreadpoolIo_base(pio);
  else if (!kernelBase && _StartThreadpoolIo)
    _StartThreadpoolIo(pio);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int CWsHook::WSAIoctl(SOCKET s, DWORD dwIoControlCode, LPVOID lpvInBuffer,
  DWORD cbInBuffer, LPVOID lpvOutBuffer, DWORD cbOutBuffer,
  LPDWORD lpcbBytesReturned, LPWSAOVERLAPPED lpOverlapped,
  LPWSAOVERLAPPED_COMPLETION_ROUTINE lpCompletionRoutine) {
#ifdef TRACE_WINSOCK
  ATLTRACE(_T("WSAIoctl - code = %d"), dwIoControlCode);
#endif
  int ret = SOCKET_ERROR;
  if (_WSAIoctl)
    ret = _WSAIoctl(s, dwIoControlCode, lpvInBuffer, cbInBuffer, lpvOutBuffer,
                    cbOutBuffer, lpcbBytesReturned, lpOverlapped,
                    lpCompletionRoutine);

  // Handle the special case where they request the address of ConnectEx.
  if (dwIoControlCode == SIO_GET_EXTENSION_FUNCTION_POINTER &&
      lpvInBuffer &&
      cbInBuffer >= sizeof(GUID) &&
      lpvOutBuffer &&
      cbOutBuffer >= sizeof(LPFN_CONNECTEX_WPT)) {
    GUID connect_ex_guid = 
        {0x25a207b9,0xddf3,0x4660,{0x8e,0xe9,0x76,0xe5,0x8c,0x74,0x06,0x3e}};
    if (!memcmp(lpvInBuffer, &connect_ex_guid, sizeof(GUID))) {
#ifdef TRACE_WINSOCK
  ATLTRACE(_T("WSAIoctl - Replaced ConnectEx"));
#endif
      LPFN_CONNECTEX_WPT connect_ex;
      memcpy(&connect_ex, lpvOutBuffer, sizeof(LPFN_CONNECTEX_WPT));
      _connectex_functions.SetAt(s, connect_ex);
      LPFN_CONNECTEX_WPT connect_ex_hook = ConnectEx_Hook;
      memcpy(lpvOutBuffer, &connect_ex_hook, sizeof(LPFN_CONNECTEX_WPT));
    }
  }
  return ret;
}
