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

#pragma once

#include "ncodehook/NCodeHookInstantiation.h"

void WinsockInstallHooks(void);
void WinsockRemoveHooks(void);

class CWsHook
{
public:
	CWsHook(void);
	virtual ~CWsHook(void);

	// straight winsock hooks
	SOCKET	WSASocketW(int af, int type, int protocol, LPWSAPROTOCOL_INFOW lpProtocolInfo, GROUP g, DWORD dwFlags);
	int		closesocket(SOCKET s);
	int		connect(IN SOCKET s, const struct sockaddr FAR * name, IN int namelen);
	int		bind(SOCKET s, const struct sockaddr FAR * name, IN int namelen);
	int		recv(SOCKET s, char FAR * buf, int len, int flags);
	int		send(SOCKET s, const char FAR * buf, int len, int flags);
	int		getaddrinfo(PCSTR pNodeName, PCSTR pServiceName, const ADDRINFOA * pHints, PADDRINFOA * ppResult);
	int		GetAddrInfoW(PCWSTR pNodeName, PCWSTR pServiceName, const ADDRINFOW * pHints, PADDRINFOW * ppResult);
	void	freeaddrinfo(PADDRINFOA pAddrInfo);
	void	FreeAddrInfoW(PADDRINFOW pAddrInfo);
	int		WSARecv(SOCKET s, LPWSABUF lpBuffers, DWORD dwBufferCount, LPDWORD lpNumberOfBytesRecvd, LPDWORD lpFlags, LPWSAOVERLAPPED lpOverlapped, LPWSAOVERLAPPED_COMPLETION_ROUTINE lpCompletionRoutine);

private:
	NCodeHookIA32		hook;
	CRITICAL_SECTION	cs;
	CAtlList<void *>	addrInfo;

	LPFN_WSASOCKETW		_WSASocketW;
	LPFN_CLOSESOCKET	_closesocket;
	LPFN_CONNECT		_connect;
	LPFN_BIND			_bind;
	LPFN_RECV			_recv;
	LPFN_SEND			_send;
	LPFN_GETADDRINFO	_getaddrinfo;
	LPFN_GETADDRINFOW	_GetAddrInfoW;
	LPFN_FREEADDRINFO	_freeaddrinfo;
	LPFN_FREEADDRINFOW	_FreeAddrInfoW;
	LPFN_WSARECV		_WSARecv;
};
