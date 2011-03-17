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

#include "ncodehook/NCodeHookInstantiation.h"

class TrackDns;
class TrackSockets;
class TestState;

class WsaBuffTracker {
public:
  WsaBuffTracker():_buffers(NULL),_buffer_count(0){}
  WsaBuffTracker(LPWSABUF buffers, DWORD buffer_count):
      _buffers(buffers),_buffer_count(buffer_count){}
  WsaBuffTracker(const WsaBuffTracker& src){*this = src;}
  ~WsaBuffTracker(){}
  const WsaBuffTracker& operator =(const WsaBuffTracker& src) {
    _buffers = src._buffers;
    _buffer_count = src._buffer_count;
    return src;
  }
  LPWSABUF _buffers;
  DWORD    _buffer_count;
};

class CWsHook {
public:
  CWsHook(TrackDns& dns, TrackSockets& sockets, TestState& test_state);
  virtual ~CWsHook(void);

  // straight winsock hooks
  SOCKET	WSASocketW(int af, int type, int protocol, 
                   LPWSAPROTOCOL_INFOW lpProtocolInfo, GROUP g, DWORD dwFlags);
  int		closesocket(SOCKET s);
  int		connect(IN SOCKET s, const struct sockaddr FAR * name, IN int namelen);
  int		recv(SOCKET s, char FAR * buf, int len, int flags);
  int		send(SOCKET s, const char FAR * buf, int len, int flags);
  int   select(int nfds, fd_set FAR * readfds, fd_set FAR * writefds,
                fd_set FAR * exceptfds, const struct timeval FAR * timeout);
  int		getaddrinfo(PCSTR pNodeName, PCSTR pServiceName, 
                              const ADDRINFOA * pHints, PADDRINFOA * ppResult);
  int		GetAddrInfoW(PCWSTR pNodeName, PCWSTR pServiceName, 
                              const ADDRINFOW * pHints, PADDRINFOW * ppResult);
  void	freeaddrinfo(PADDRINFOA pAddrInfo);
  void	FreeAddrInfoW(PADDRINFOW pAddrInfo);
  int		WSARecv(SOCKET s, LPWSABUF lpBuffers, DWORD dwBufferCount, 
                LPDWORD lpNumberOfBytesRecvd, LPDWORD lpFlags, 
                LPWSAOVERLAPPED lpOverlapped, 
                LPWSAOVERLAPPED_COMPLETION_ROUTINE lpCompletionRoutine);
  int   WSASend(SOCKET s, LPWSABUF lpBuffers, DWORD dwBufferCount,
                LPDWORD lpNumberOfBytesSent, DWORD dwFlags, 
                LPWSAOVERLAPPED lpOverlapped,
                LPWSAOVERLAPPED_COMPLETION_ROUTINE lpCompletionRoutine);
  BOOL  WSAGetOverlappedResult(SOCKET s, LPWSAOVERLAPPED lpOverlapped,
                LPDWORD lpcbTransfer, BOOL fWait, LPDWORD lpdwFlags);
  int   WSAEventSelect(SOCKET s, WSAEVENT hEventObject, long lNetworkEvents);
  int   WSAEnumNetworkEvents(SOCKET s, WSAEVENT hEventObject, 
                              LPWSANETWORKEVENTS lpNetworkEvents);

private:
  TestState&        _test_state;
  NCodeHookIA32		  hook;
  CRITICAL_SECTION	cs;

  // addresses that WE have alocated in case of DNS overrides
  CAtlMap<void *, void *>	dns_override; 

  // memory buffers for overlapped receive operations
  CAtlMap<LPWSAOVERLAPPED, WsaBuffTracker>  recv_buffers;

  // winsock event tracking
  TrackDns&      _dns;
  TrackSockets&  _sockets;

  // pointers to the original implementations
  LPFN_WSASOCKETW		  _WSASocketW;
  LPFN_CLOSESOCKET	  _closesocket;
  LPFN_CONNECT		    _connect;
  LPFN_RECV			      _recv;
  LPFN_SEND			      _send;
  LPFN_SELECT         _select;
  LPFN_GETADDRINFO	  _getaddrinfo;
  LPFN_GETADDRINFOW	  _GetAddrInfoW;
  LPFN_FREEADDRINFO	  _freeaddrinfo;
  LPFN_FREEADDRINFOW	_FreeAddrInfoW;
  LPFN_WSARECV		    _WSARecv;
  LPFN_WSASEND        _WSASend;
  LPFN_WSAGETOVERLAPPEDRESULT _WSAGetOverlappedResult;
  LPFN_WSAEVENTSELECT _WSAEventSelect;
  LPFN_WSAENUMNETWORKEVENTS _WSAEnumNetworkEvents;
};
