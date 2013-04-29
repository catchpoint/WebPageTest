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
#include "dnsevents.h"

class CSocketEvents :
	public CDNSEvents
{
public:
	CSocketEvents(void);
	virtual ~CSocketEvents(void);

	virtual void Reset(void);

	virtual void NewSocket(SOCKET s);
	virtual void CloseSocket(SOCKET s);
	virtual void SocketSend(SOCKET s, DWORD len, LPBYTE buff);
	virtual void SocketRecv(SOCKET s, DWORD len, LPBYTE buff);
  virtual void ModifyDataOut(LPBYTE buff, unsigned long len);
	virtual void SocketConnect(SOCKET s, struct sockaddr_in * addr);
	virtual void SocketConnected(SOCKET s);
	virtual void SocketBind(SOCKET s, struct sockaddr_in * addr);
	virtual bool IsFakeSocket(SOCKET s, DWORD dataLen, LPBYTE buff);
	virtual void linkSocketRequestConnect(CSocketConnect * c) = 0;
	virtual void linkSocketRequestSend(CSocketRequest * r) = 0;
	virtual void UpdateRTT(CSocketConnect * c);
	virtual void UpdateRTT(DWORD ipv4_address, long elapsed);
  virtual CString GetRTT(DWORD ipv4_address);
  virtual void MapSchannelSocket(void * schannelId, SOCKET s);
  virtual SOCKET GetSchannelSocket(void * schannelId);
  virtual void * GetSchannelId(SOCKET s);
  virtual void UpdateClientPort(SOCKET s, DWORD id);

	DWORD	nextSocketId;	// ID to assign to the next socket
	DWORD	bwBytesIn;

	CAtlMap<SOCKET, DWORD>	socketID;
	CAtlMap<DWORD, long>	  rtt;

protected:
	CRITICAL_SECTION socket_cs;
	CAtlMap<SOCKET, void *>	schannelIds;
	CAtlMap<void *, SOCKET>	schannelSockets;
};
