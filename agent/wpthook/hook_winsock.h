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

class TrackDns;
class TrackSockets;
class TestState;
class DataChunk;

class WsaBuffTracker {
public:
  WsaBuffTracker():_buffers(NULL),_buffer_count(0){}
  WsaBuffTracker(const WsaBuffTracker& src):_buffers(NULL),_buffer_count(0){
    *this = src;
  }
  WsaBuffTracker(LPWSABUF buffers, ULONG_PTR buffer_count):_buffers(NULL),
    _buffer_count(0){
    Copy(buffers, buffer_count);
  }
  ~WsaBuffTracker(){Reset();}
  const WsaBuffTracker& operator =(const WsaBuffTracker& src) {
    Copy(src._buffers, src._buffer_count);
    return src;
  }
  void Copy(LPWSABUF buffers, ULONG_PTR buffer_count) {
    Reset();
    if (buffer_count && buffers) {
      _buffer_count = buffer_count;
      _buffers = (LPWSABUF)malloc(sizeof(WSABUF) * _buffer_count);
      for (ULONG_PTR i = 0; i < buffer_count; i++) {
        _buffers[i].len = buffers[i].len;
        _buffers[i].buf = buffers[i].buf;
      }
    }
  }
  void Reset(){
    if (_buffers) {
      free(_buffers);
    }
    _buffers = NULL;
    _buffer_count = 0;
  }
  LPWSABUF  _buffers;
  ULONG_PTR _buffer_count;
};

// Function declarations for hook functions
typedef VOID (WINAPI *PTP_WIN32_IO_CALLBACK_WPT)(
    PTP_CALLBACK_INSTANCE Instance, PVOID Context, PVOID Overlapped,
    ULONG IoResult, ULONG_PTR NumberOfBytesTransferred, PTP_IO Io);
typedef PTP_IO(__stdcall *LPFN_CREATETHREADPOOLIO)(HANDLE fl,
    PTP_WIN32_IO_CALLBACK_WPT pfnio, PVOID pv, PTP_CALLBACK_ENVIRON pcbe);
typedef VOID(__stdcall *LPFN_CLOSETHREADPOOLIO)(PTP_IO pio);
typedef VOID(__stdcall *LPFN_STARTTHREADPOOLIO)(PTP_IO pio);
typedef BOOL(PASCAL FAR * LPFN_CONNECTEX_WPT) (SOCKET s,
    const struct sockaddr FAR *name, int namelen, PVOID lpSendBuffer,
    DWORD dwSendDataLength, LPDWORD lpdwBytesSent, LPOVERLAPPED lpOverlapped);

class CWsHook {
public:
  CWsHook(TrackDns& dns, TrackSockets& sockets, TestState& test_state);
  virtual ~CWsHook(void);
  void Init();

  // straight winsock hooks
  SOCKET	WSASocketW(int af, int type, int protocol, 
                     LPWSAPROTOCOL_INFOW lpProtocolInfo, GROUP g,
                     DWORD dwFlags);
  int		closesocket(SOCKET s);
  int		connect(IN SOCKET s, const struct sockaddr FAR * name, IN int namelen);
  BOOL  ConnectEx(SOCKET s, const struct sockaddr FAR *name, int namelen,
                  PVOID lpSendBuffer, DWORD dwSendDataLength,
                  LPDWORD lpdwBytesSent, LPOVERLAPPED lpOverlapped);
  int		recv(SOCKET s, char FAR * buf, int len, int flags);
  int		send(SOCKET s, const char FAR * buf, int len, int flags);
  int   select(int nfds, fd_set FAR * readfds, fd_set FAR * writefds,
               fd_set FAR * exceptfds, const struct timeval FAR * timeout);
  int		getaddrinfo(PCSTR pNodeName, PCSTR pServiceName, 
                    ADDRINFOA * pHints, PADDRINFOA * ppResult);
  struct hostent * gethostbyname(const char * pNodeName);
  int		GetAddrInfoW(PCWSTR pNodeName, PCWSTR pServiceName, 
                     ADDRINFOW * pHints, PADDRINFOW * ppResult);
  int GetAddrInfoExA(PCSTR pName, PCSTR pServiceName, DWORD dwNameSpace,
      LPGUID lpNspId, ADDRINFOEXA *hints, PADDRINFOEXA *ppResult,
      struct timeval *timeout, LPOVERLAPPED lpOverlapped,
      LPLOOKUPSERVICE_COMPLETION_ROUTINE lpCompletionRoutine,
      LPHANDLE lpNameHandle);
  int GetAddrInfoExW(PCWSTR pName, PCWSTR pServiceName, DWORD dwNameSpace,
      LPGUID lpNspId, ADDRINFOEXW *hints, PADDRINFOEXW *ppResult,
      struct timeval *timeout, LPOVERLAPPED lpOverlapped,
      LPLOOKUPSERVICE_COMPLETION_ROUTINE lpCompletionRoutine,
      LPHANDLE lpHandle);
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
  void ProcessOverlappedIo(SOCKET s, LPOVERLAPPED lpOverlapped,
                           PULONG_PTR lpNumberOfBytesTransferred);
  PTP_IO CreateThreadpoolIo(HANDLE fl, PTP_WIN32_IO_CALLBACK_WPT pfnio,
                            PVOID pv, PTP_CALLBACK_ENVIRON pcbe,
                            bool kernelBase);
  void CloseThreadpoolIo(PTP_IO pio, bool kernelBase);
  void StartThreadpoolIo(PTP_IO pio, bool kernelBase);
  void ThreadpoolCallback(PTP_CALLBACK_INSTANCE Instance, PVOID Context,
    PVOID Overlapped, ULONG IoResult, ULONG_PTR NumberOfBytesTransferred,
    PTP_IO Io);
  int WSAIoctl(SOCKET s, DWORD dwIoControlCode, LPVOID lpvInBuffer,
    DWORD cbInBuffer, LPVOID lpvOutBuffer, DWORD cbOutBuffer,
    LPDWORD lpcbBytesReturned, LPWSAOVERLAPPED lpOverlapped,
    LPWSAOVERLAPPED_COMPLETION_ROUTINE lpCompletionRoutine);

private:
  TestState&        _test_state;
  CRITICAL_SECTION	cs;

  // addresses that WE have alocated in case of DNS overrides
  CAtlMap<void *, void *>	dns_override; 

  // sockets that are being connected asynchronously
  CAtlMap<SOCKET, SOCKET>	_connecting; 
  CAtlMap<SOCKET, LPFN_CONNECTEX_WPT> _connectex_functions;

  // memory buffers for overlapped operations
  CAtlMap<LPWSAOVERLAPPED, WsaBuffTracker>  _recv_buffers;
  CAtlMap<LPWSAOVERLAPPED, DataChunk>       _send_buffers;
  CAtlMap<LPWSAOVERLAPPED, ULONG_PTR>       _send_buffer_original_length;
  CAtlMap<PTP_IO, PTP_WIN32_IO_CALLBACK_WPT> _threadpool_callbacks;
  CAtlMap<PTP_IO, SOCKET>                   _threadpool_sockets;

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
  LPFN_GETADDRINFOEXA _GetAddrInfoExA;
  LPFN_GETADDRINFOEXW _GetAddrInfoExW;
  LPFN_GETHOSTBYNAME  _gethostbyname;
  LPFN_WSARECV		    _WSARecv;
  LPFN_WSASEND        _WSASend;
  LPFN_WSAGETOVERLAPPEDRESULT _WSAGetOverlappedResult;
  LPFN_WSAEVENTSELECT _WSAEventSelect;
  LPFN_WSAENUMNETWORKEVENTS _WSAEnumNetworkEvents;
  LPFN_CREATETHREADPOOLIO _CreateThreadpoolIo;
  LPFN_CREATETHREADPOOLIO _CreateThreadpoolIo_base;
  LPFN_CLOSETHREADPOOLIO _CloseThreadpoolIo;
  LPFN_CLOSETHREADPOOLIO _CloseThreadpoolIo_base;
  LPFN_STARTTHREADPOOLIO _StartThreadpoolIo;
  LPFN_STARTTHREADPOOLIO _StartThreadpoolIo_base;
  LPFN_WSAIOCTL _WSAIoctl;
};
