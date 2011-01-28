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
	virtual void SocketConnect(SOCKET s, struct sockaddr_in * addr);
	virtual void SocketBind(SOCKET s, struct sockaddr_in * addr);
	virtual bool IsFakeSocket(SOCKET s, DWORD dataLen, LPBYTE buff);
	virtual bool CheckFlaggedConnection(CSocketConnect * c, DWORD hostAddr);
	virtual void linkSocketRequestConnect(CSocketConnect * c) = 0;
	virtual void linkSocketRequestSend(CSocketRequest * r) = 0;

	DWORD	nextSocketId;	// ID to assign to the next socket
	DWORD	bwBytesIn;

	CAtlMap<SOCKET, DWORD>	socketID;
	
	DWORD	simFlagged;		// number of current simultaneous flagged connections
};

typedef struct{
	LPCSTR	ip;
	BYTE	bits;
} SUBNET;

const SUBNET flagConnections [] = {
{"149.174.133.0",26},
{"149.174.133.64",26},
{"206.222.225.0",27},
{"206.222.225.32",27},
{"149.174.134.0",26},
{"149.174.134.64",26},
{"205.188.100.0",24},
{"205.188.195.0",24},
{"205.188.101.0",24},
{"205.188.88.0",24},
{"205.188.102.0",24},
{"205.188.89.0",24},
{"205.188.192.0",24},
{"205.188.90.0",24},
{"205.188.194.0",24},
{"172.17.200.0",23},
{"172.17.204.0",23},
{"172.17.206.0",23},
{"205.188.193.0",24},
{"206.222.227.0",24},
{"206.222.228.0",24},
{"206.222.229.0",24},
{"206.222.234.64",26},
{"206.222.235.64",26},
{"64.12.235.0",25},
{"64.12.79.0",24},
{"64.12.89.0",25},
{"64.12.228.0",24},
{"64.12.236.0",25},
{"64.12.89.128",25},
{"64.12.227.0",24},
{"64.12.237.0",25},
{"64.12.90.0",25},
{"64.12.79",24},
{"64.12.229.0",24},
{"64.12.230.0",24},
{"172.20.192.0",23},
{"172.20.196.0",23},
{"172.20.194.0",23},
{"64.12.231.0",24},
{"64.12.222.224",27},
{"64.12.223.224",27},
{"205.188.97.0",24},
{"205.188.98.0",24},
{"205.188.96.0",24},
{"205.188.99.0",24},
{"205.188.224.0",24},
{"64.12.128.0",24},
{"64.12.130.0",24},
{"64.12.129.0",24},
{"64.12.131.0",24},
{"64.12.192.0",24},
{"172.17.67.0",24},
{"172.17.64.0",24},
{"207.200.74.0",24},
{"207.200.94.0",24},
{"207.200.64.160",27},
{"207.200.64.224",27},
{"207.200.66.96",27},
{"207.200.66.224",27},
{"149.174.135.0",26},
{"149.174.136.128",27},
{"149.174.135.64",26},
{"149.174.136.160",27},
{"206.222.238.64",26},
{"206.222.239.64",26},
{"206.222.230.32",27},
{"206.222.231.32",27},
{"205.188.191.0",24},
{"205.188.91.0",27},
{"64.12.238.0",24},
{"64.12.73.0",24},
{"64.12.239.0",24},
{"64.12.74.0",24},
{"207.200.105.0",24},
{"207.200.76.160",27},
{"207.200.106.0",24},
{"207.200.76.224",27},
{"205.188.106.0",24},
{"205.188.107.0",24},
{"64.12.73.0",24},
{"64.12.74.0",24},
{"149.174.142.0",26},
{"10.178.90.0",24},
{"64.12.72.0",24}
};