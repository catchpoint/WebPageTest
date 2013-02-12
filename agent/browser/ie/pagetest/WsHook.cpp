/*
Copyright (c) 2005-2007, AOL, LLC.

All rights reserved.

Redistribution and use in source and binary forms, with or without modification, 
are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, 
		this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice, 
		this list of conditions and the following disclaimer in the documentation 
		and/or other materials provided with the distribution.
    * Neither the name of the company nor the names of its contributors may be 
		used to endorse or promote products derived from this software without 
		specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

// WsHook.cpp - Code for intercepting winsock API calls
// We intercept at what is essentially the LSP layer so tese are actually LSP function calls
// which for the most part mirror the standard socket calls

#include "StdAfx.h"
#include ".\wshook.h"
#include "WatchDlg.h"

static CWsHook * pHook = NULL;

void WinsockInstallHooks(void)
{
	if( !pHook )
		pHook = new CWsHook();
}

void WinsockRemoveHooks(void)
{
	if( pHook )
	{
		delete pHook;
		pHook = NULL;
	}
}


/******************************************************************************
*******************************************************************************
**																			 **
**								Stub Functions								 **
**																			 **
*******************************************************************************
******************************************************************************/

SOCKET WSAAPI WSASocketW_Hook(int af, int type, int protocol, LPWSAPROTOCOL_INFOW lpProtocolInfo, GROUP g, DWORD dwFlags)
{
	SOCKET ret = SOCKET_ERROR;
	__try{
		if( pHook )
			ret = pHook->WSASocketW(af, type, protocol, lpProtocolInfo, g, dwFlags);
	}__except(1){}
	return ret;
}

int WSAAPI closesocket_Hook(SOCKET s)
{
	int ret = SOCKET_ERROR;
	__try{
		if( pHook )
			ret = pHook->closesocket(s);
	}__except(1){}
	return ret;
}

int WSAAPI connect_Hook(IN SOCKET s, const struct sockaddr FAR * name, IN int namelen)
{
	int ret = SOCKET_ERROR;
	__try{
		if( pHook )
			ret = pHook->connect(s, name, namelen);
	}__except(1){}
	return ret;
}

int WSAAPI bind_Hook(SOCKET s, const struct sockaddr FAR * name, IN int namelen)
{
	int ret = SOCKET_ERROR;
	__try{
		if( pHook )
			ret = pHook->bind(s, name, namelen);
	}__except(1){}
	return ret;
}

int WSAAPI recv_Hook(SOCKET s, char FAR * buf, int len, int flags)
{
	int ret = SOCKET_ERROR;
	__try{
		if( pHook )
			ret = pHook->recv(s, buf, len, flags);
	}__except(1){}
	return ret;
}

int WSAAPI send_Hook(SOCKET s, const char FAR * buf, int len, int flags)
{
	int ret = SOCKET_ERROR;
	__try{
		if( pHook )
			ret = pHook->send(s, buf, len, flags);
	}__except(1){}
	return ret;
}

int WSAAPI getaddrinfo_Hook(PCSTR pNodeName, PCSTR pServiceName, const ADDRINFOA * pHints, PADDRINFOA * ppResult)
{
	int ret = WSAEINVAL;
	__try{
		if( pHook )
			ret = pHook->getaddrinfo(pNodeName, pServiceName, pHints, ppResult);
	}__except(1){}
	return ret;
}

int WSAAPI GetAddrInfoW_Hook(PCWSTR pNodeName, PCWSTR pServiceName, const ADDRINFOW * pHints, PADDRINFOW * ppResult)
{
	int ret = WSAEINVAL;
	__try{
		if( pHook )
			ret = pHook->GetAddrInfoW(pNodeName, pServiceName, pHints, ppResult);
	}__except(1){}
	return ret;
}

void WSAAPI freeaddrinfo_Hook(PADDRINFOA pAddrInfo)
{
	__try{
		if( pHook )
			pHook->freeaddrinfo(pAddrInfo);
	}__except(1){}
}

void WSAAPI FreeAddrInfoW_Hook(PADDRINFOW pAddrInfo)
{
	__try{
		if( pHook )
			pHook->FreeAddrInfoW(pAddrInfo);
	}__except(1){}
}

int WSAAPI WSARecv_Hook(SOCKET s, LPWSABUF lpBuffers, DWORD dwBufferCount, LPDWORD lpNumberOfBytesRecvd, LPDWORD lpFlags, LPWSAOVERLAPPED lpOverlapped, LPWSAOVERLAPPED_COMPLETION_ROUTINE lpCompletionRoutine)
{
	int ret = SOCKET_ERROR;
	__try{
		if( pHook )
			ret = pHook->WSARecv(s, lpBuffers, dwBufferCount, lpNumberOfBytesRecvd, lpFlags, lpOverlapped, lpCompletionRoutine);
	}__except(1){}
	return ret;
}

/******************************************************************************
*******************************************************************************
**																			 **
**								CWSHook Class								 **
**																			 **
*******************************************************************************
******************************************************************************/

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CWsHook::CWsHook(void):
	_getaddrinfo(NULL)
	, _freeaddrinfo(NULL)
{
	InitializeCriticalSection(&cs);

	// install the code hooks
	_WSASocketW = hook.createHookByName("ws2_32.dll", "WSASocketW", WSASocketW_Hook);
	_closesocket = hook.createHookByName("ws2_32.dll", "closesocket", closesocket_Hook);
	_connect = hook.createHookByName("ws2_32.dll", "connect", connect_Hook);
	_bind = hook.createHookByName("ws2_32.dll", "bind", bind_Hook);
	_recv = hook.createHookByName("ws2_32.dll", "recv", recv_Hook);
	_send = hook.createHookByName("ws2_32.dll", "send", send_Hook);
	_GetAddrInfoW = hook.createHookByName("ws2_32.dll", "GetAddrInfoW", GetAddrInfoW_Hook);
	_FreeAddrInfoW = hook.createHookByName("ws2_32.dll", "FreeAddrInfoW", FreeAddrInfoW_Hook);
	_WSARecv = hook.createHookByName("ws2_32.dll", "WSARecv", WSARecv_Hook);

	// only hook the A version if the W version wasn't present (XP SP1 or below)
	if( !_GetAddrInfoW )
		_getaddrinfo = hook.createHookByName("ws2_32.dll", "getaddrinfo", getaddrinfo_Hook);
	if( !_FreeAddrInfoW )
		_freeaddrinfo = hook.createHookByName("ws2_32.dll", "freeaddrinfo", freeaddrinfo_Hook);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CWsHook::~CWsHook(void)
{
	if( pHook == this )
		pHook = NULL;

	DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SOCKET CWsHook::WSASocketW(int af, int type, int protocol, LPWSAPROTOCOL_INFOW lpProtocolInfo, GROUP g, DWORD dwFlags)
{
	SOCKET ret = INVALID_SOCKET;

	if( _WSASocketW )
	{
		ret = _WSASocketW(af, type, protocol, lpProtocolInfo, g, dwFlags);

		if( ret != INVALID_SOCKET && dlg )
			dlg->NewSocket(ret);
	}

    if (tlsIndex != TLS_OUT_OF_INDEXES)
      TlsSetValue(tlsIndex, 0);

	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int CWsHook::closesocket(SOCKET s)
{
	int ret = SOCKET_ERROR;

	if( dlg )
		dlg->CloseSocket(s);

	if( _closesocket )
		ret = _closesocket(s);

    if (tlsIndex != TLS_OUT_OF_INDEXES)
      TlsSetValue(tlsIndex, 0);

	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int CWsHook::connect(IN SOCKET s, const struct sockaddr FAR * name, IN int namelen)
{
	int ret = SOCKET_ERROR;

	// we only care about IP sockets at this point
	if( dlg && namelen >= sizeof(struct sockaddr_in) && name->sa_family == AF_INET)
	{
		struct sockaddr_in * ipName = (struct sockaddr_in *)name;
		dlg->SocketConnect(s, ipName);
	}

	if( _connect )
		ret = _connect(s, name, namelen);
  if (!ret) {
    dlg->SocketConnected(s);
  }

    if (tlsIndex != TLS_OUT_OF_INDEXES)
      TlsSetValue(tlsIndex, 0);

	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int	CWsHook::bind(SOCKET s, const struct sockaddr FAR * name, IN int namelen)
{
	int ret = SOCKET_ERROR;

	// we only care about IP sockets at this point
	if( dlg && namelen >= sizeof(struct sockaddr_in) && name->sa_family == AF_INET)
	{
		struct sockaddr_in * ipName = (struct sockaddr_in *)name;
		dlg->SocketBind(s, ipName);
	}

	if( _bind )
		ret = _bind(s, name, namelen);

    if (tlsIndex != TLS_OUT_OF_INDEXES)
      TlsSetValue(tlsIndex, 0);

	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int	CWsHook::recv(SOCKET s, char FAR * buf, int len, int flags)
{
	int ret = SOCKET_ERROR;

	if (tlsIndex != TLS_OUT_OF_INDEXES)
      TlsSetValue(tlsIndex, 0);

	if( _recv )
		ret = _recv(s, buf, len, flags);

	void * sid = NULL;
	if (dlg)
		sid = dlg->GetSchannelId(s);
	if( !sid && dlg && ret > 0 )
		dlg->SocketRecv(s, ret, (LPBYTE)buf );

	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int	CWsHook::WSARecv(SOCKET s, LPWSABUF lpBuffers, DWORD dwBufferCount, LPDWORD lpNumberOfBytesRecvd, LPDWORD lpFlags, LPWSAOVERLAPPED lpOverlapped, LPWSAOVERLAPPED_COMPLETION_ROUTINE lpCompletionRoutine)
{
	int ret = SOCKET_ERROR;

	if (tlsIndex != TLS_OUT_OF_INDEXES)
      TlsSetValue(tlsIndex, 0);

	if( _WSARecv )
		ret = _WSARecv(s, lpBuffers, dwBufferCount, lpNumberOfBytesRecvd, lpFlags, lpOverlapped, lpCompletionRoutine);

	void * sid = NULL;
	if (dlg)
		sid = dlg->GetSchannelId(s);
	if( !sid && dlg && ret != SOCKET_ERROR && lpBuffers && dwBufferCount && lpNumberOfBytesRecvd && *lpNumberOfBytesRecvd && !lpOverlapped && !lpCompletionRoutine )
	{
		DWORD bytes = *lpNumberOfBytesRecvd;
		DWORD i = 0;
		while( i < dwBufferCount && bytes > 0 )
		{
			DWORD chunk = min(lpBuffers[i].len, bytes);
			if( chunk )
			{
				bytes -= chunk;
				if( lpBuffers[i].buf )
					dlg->SocketRecv(s, chunk, (LPBYTE)lpBuffers[i].buf );
			}
			i++;
		}
	}

	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int	CWsHook::send(SOCKET s, const char FAR * buf, int len, int flags)
{
	int ret = SOCKET_ERROR;

	if (dlg && tlsIndex != TLS_OUT_OF_INDEXES) {
      void * schannelId = TlsGetValue(tlsIndex);
	  if (schannelId) {
		  dlg->MapSchannelSocket(schannelId, s);
	  }
	}
    if (tlsIndex != TLS_OUT_OF_INDEXES)
      TlsSetValue(tlsIndex, 0);

	void * sid = NULL;
	if (dlg)
		sid = dlg->GetSchannelId(s);
	if( dlg && len && !sid )
		dlg->SocketSend(s, len, (LPBYTE)buf );

	if( _send )
		ret = _send(s, buf, len, flags);

	return ret;
}

typedef struct {
	ADDRINFOA			info;
	struct sockaddr_in	addr; 
} ADDRINFOA_ADDR;

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int	CWsHook::getaddrinfo(PCSTR pNodeName, PCSTR pServiceName, const ADDRINFOA * pHints, PADDRINFOA * ppResult)
{
	int ret = WSAEINVAL;
	bool overrideDNS = false;

	void * context = NULL;
	CString name = CA2T(pNodeName);
	CAtlArray<DWORD> addresses;
	if( dlg )
		overrideDNS = dlg->DnsLookupStart( name, context, addresses );

	if( _getaddrinfo && !overrideDNS )
		ret = _getaddrinfo(CT2A((LPCTSTR)name), pServiceName, pHints, ppResult);
	else if( overrideDNS ) {
		if( addresses.IsEmpty() )
			ret = EAI_NONAME;
		else {
			// build the response structure with the addresses we looked up
			ret = 0;
			DWORD count = addresses.GetCount();

			ADDRINFOA_ADDR * result = (ADDRINFOA_ADDR *)malloc(sizeof(ADDRINFOA_ADDR) * count);
			for (DWORD i = 0; i < count; i++) {
				memset( &result[i], 0, sizeof(ADDRINFOA_ADDR) );
				result->info.ai_family = AF_INET;
				result->info.ai_addrlen = sizeof(struct sockaddr_in);
				result->info.ai_addr = (struct sockaddr *)&(result->addr);
				result->addr.sin_family = AF_INET;
				result->addr.sin_addr.S_un.S_addr = addresses[i];
				if( i < count - 1 )
					result->info.ai_next = (PADDRINFOA)&result[i+1];
			}
			addrInfo.AddTail(result);

			*ppResult = (PADDRINFOA)result;
		}
	}

	if (!ret && dlg) {
		PADDRINFOA addr = *ppResult;
		while (addr) {
      if (addr->ai_canonname)
        dlg->DnsLookupAlias(name, (LPCTSTR)CA2T(addr->ai_canonname));

			if (context &&
          addr->ai_addrlen >= sizeof(struct sockaddr_in) && 
          addr->ai_family == AF_INET) {
				struct sockaddr_in * ipName = (struct sockaddr_in *)addr->ai_addr;
				dlg->DnsLookupAddress(context, ipName->sin_addr);
			}

			addr = addr->ai_next;
		}

    if (context)
		  dlg->DnsLookupDone(context);
	}

	return ret;
}

typedef struct {
	ADDRINFOW			info;
	struct sockaddr_in	addr; 
} ADDRINFOW_ADDR;

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int	CWsHook::GetAddrInfoW(PCWSTR pNodeName, PCWSTR pServiceName, const ADDRINFOW * pHints, PADDRINFOW * ppResult)
{
	int ret = WSAEINVAL;
	bool overrideDNS = false;

	void * context = NULL;
	CString name = CW2T(pNodeName);
	CAtlArray<DWORD> addresses;
	if( dlg && pNodeName )
		overrideDNS = dlg->DnsLookupStart( name, context, addresses );

	if( _GetAddrInfoW && !overrideDNS )
		ret = _GetAddrInfoW(CT2W((LPCWSTR)name), pServiceName, pHints, ppResult);
	else if( overrideDNS ) {
		if( addresses.IsEmpty() )
			ret = EAI_NONAME;
		else {
			// build the response structure with the addresses we looked up
			ret = 0;
			DWORD count = addresses.GetCount();

			ADDRINFOW_ADDR * result = (ADDRINFOW_ADDR *)malloc(sizeof(ADDRINFOW_ADDR) * count);
			for (DWORD i = 0; i < count; i++) {
				memset( &result[i], 0, sizeof(ADDRINFOW_ADDR) );
				result->info.ai_family = AF_INET;
				result->info.ai_addrlen = sizeof(struct sockaddr_in);
				result->info.ai_addr = (struct sockaddr *)&(result->addr);
				result->addr.sin_family = AF_INET;
				result->addr.sin_addr.S_un.S_addr = addresses[i];
				if( i < count - 1 )
					result->info.ai_next = (PADDRINFOW)&result[i+1];
			}
			addrInfo.AddTail(result);

			*ppResult = (PADDRINFOW)result;
		}
	}

	if (!ret && dlg) {
		PADDRINFOW addr = *ppResult;
		while (addr) {
      if (addr->ai_canonname)
        dlg->DnsLookupAlias(name, addr->ai_canonname);

      if (context && 
          addr->ai_addrlen >= sizeof(struct sockaddr_in) &&
          addr->ai_family == AF_INET ) {
				struct sockaddr_in * ipName = (struct sockaddr_in *)addr->ai_addr;
				dlg->DnsLookupAddress(context, ipName->sin_addr);
			}

			addr = addr->ai_next;
		}
    
    if (context)
		  dlg->DnsLookupDone(context);
	}

	return ret;
}

/*-----------------------------------------------------------------------------
	Free the descriptor if it is one that we allocated, otherwise pass it through
-----------------------------------------------------------------------------*/
void CWsHook::freeaddrinfo(PADDRINFOA pAddrInfo)
{
	PADDRINFOA * mem = NULL;
	EnterCriticalSection(&cs);
	POSITION pos = addrInfo.GetHeadPosition();
	while( !mem && pos )
	{
		POSITION oldPos = pos;
		void * pAddr = addrInfo.GetNext(pos);
		if( pAddr == pAddrInfo )
		{
			mem = (PADDRINFOA *)pAddr;
			addrInfo.RemoveAt(oldPos);
		}
	}
	LeaveCriticalSection(&cs);

	if( mem )
		free(mem);
	else if(_freeaddrinfo)
		_freeaddrinfo(pAddrInfo);
}

/*-----------------------------------------------------------------------------
	Free the descriptor if it is one that we allocated, otherwise pass it through
-----------------------------------------------------------------------------*/
void CWsHook::FreeAddrInfoW(PADDRINFOW pAddrInfo)
{
	PADDRINFOW * mem = NULL;
	EnterCriticalSection(&cs);
	POSITION pos = addrInfo.GetHeadPosition();
	while( !mem && pos )
	{
		POSITION oldPos = pos;
		void * pAddr = addrInfo.GetNext(pos);
		if( pAddr == pAddrInfo )
		{
			mem = (PADDRINFOW *)pAddr;
			addrInfo.RemoveAt(oldPos);
		}
	}
	LeaveCriticalSection(&cs);

	if( mem )
		free(mem);
	else if(_FreeAddrInfoW)
		_FreeAddrInfoW(pAddrInfo);
}
