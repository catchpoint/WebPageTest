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

#include "StdAfx.h"
#include "SocketEvents.h"
#include <wininet.h>

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CSocketEvents::CSocketEvents(void):
	nextSocketId(1)
	, bwBytesIn(0)
{
  rtt.InitHashTable(257);
  socketID.InitHashTable(257);
  schannelIds.InitHashTable(257);
  schannelSockets.InitHashTable(257);
  InitializeCriticalSection(&socket_cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CSocketEvents::~CSocketEvents(void)
{
  DeleteCriticalSection(&socket_cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CSocketEvents::Reset(void)
{
	__super::Reset();
	
	EnterCriticalSection(&cs);
	nextSocketId = 1;
	bwBytesIn = 0;
	LeaveCriticalSection(&cs);
}

#pragma warning(push)
#pragma warning(disable:4244)

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CSocketEvents::NewSocket(SOCKET s)
{
	CheckStuff();

	EnterCriticalSection(&cs);

	ATLTRACE(_T("[Pagetest] - (0x%08X) Socket %d assigned ID %d\n"), GetCurrentThreadId(), s, nextSocketId);

	// delete any old socket that was at the same position
	CSocketInfo * info = NULL;
	openSockets.Lookup(s, info);
	if( info )
	{
		delete info;
		openSockets.RemoveKey(s);
	}

	// create a new socket for our list of open sockets
	info = new CSocketInfo(s, nextSocketId);
	socketID.SetAt((UINT_PTR)s, nextSocketId);
	nextSocketId++;
	openSockets.SetAt(s, info);

	LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CSocketEvents::CloseSocket(SOCKET s)
{
	EnterCriticalSection(&cs);

	ATLTRACE(_T("[Pagetest] - (0x%08X) CWatchDlg::CloseSocket - %d\n"), GetCurrentThreadId(), s);

	// close out any open requests on the socket
	POSITION pos = requests.GetHeadPosition();
	CSocketRequest * socketRequest = NULL;
	while( pos )
	{
		POSITION old = pos;
		CSocketRequest * r = requests.GetNext(pos);
		if( r && r->s == s )
		{
			socketRequest = r;
			requests.RemoveAt(old);
			pos = 0;
		}
	}
	
	// see if we can line up a winInet request with this socket
	if( socketRequest )
	{
		CWinInetRequest * linked = socketRequest->linkedRequest;
		if( linked && !linked->end )
			linked->Done(false);
	}
	
	DWORD id = 0;
	socketID.Lookup(s, id);
	if( id )
		requestSocketIds.RemoveKey(id);
	
	// remove the socket ID that was tied to this socket
	socketID.RemoveKey((UINT_PTR)s);
	
	LeaveCriticalSection(&cs);

	void * schannelId = GetSchannelId(s);
	EnterCriticalSection(&socket_cs);
	if (schannelId)
		schannelSockets.RemoveKey(schannelId);
	schannelIds.RemoveKey(s);
	LeaveCriticalSection(&socket_cs);
}

#pragma warning(pop)


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CSocketEvents::SocketSend(SOCKET s, DWORD len, LPBYTE buff)
{
	// make sure we are timing something
	if( active )
	{
		CheckStuff();
		
		if(!IsFakeSocket(s, len, buff) )
		{
      ATLTRACE(_T("[Pagetest] - (0x%08X) CWatchDlg::SocketSend - %d bytes socket %d, currentDoc = %d\n"), len, GetCurrentThreadId(), s, currentDoc);

      // last chance to override host headers (redirect case)
      ModifyDataOut(buff, len);
	        
			// see if this socket had an existing connect.  If so, end that now
			EnterCriticalSection(&cs);
			POSITION pos = connects.GetHeadPosition();
			while( pos )
			{
				POSITION old = pos;
				CSocketConnect * c = connects.GetNext(pos);
				if( c && !c->end && c->s == s)
				{
					c->Done();
          UpdateRTT(c);
					
					// remove it from the pending connections list (will still be in the tracked events)
					connects.RemoveAt(old);
					pos = 0;
				}
			}
				
			// see if there is an existing request that this is part of
			CSocketRequest * request = NULL;
			pos = requests.GetHeadPosition();
			POSITION requestPos = NULL;
			while( pos && !request )
			{
				POSITION old = pos;
				CSocketRequest * r = requests.GetNext(pos);
				if( r && r->s == s )
				{
					request = r;
					requestPos = old;
				}
			}
			
			if( request )
			{
				bool cont = false;
				if( !request->in )
					cont = true;
					
				// Do we continue the existing request?
				if( cont )
				{
					// store information about the request
					request->out += len;
					request->request.AddData(len, buff);
					request->firstByte = 0;
				}
				else
				{
					if( requestPos )
						requests.RemoveAt(requestPos);
						
					request = NULL;
				}
			}
				
			// If we didn't have an existing request to work with, create a new one
			if( !request )
			{
				// create the new request object (assume for now that every send will be a new request)
				request = new CSocketRequest(s, currentDoc);

				// store information about the request
				request->out = len;
				request->request.AddData(len, buff);

				// Get the IP address of the socket
				CSocketInfo * soc = NULL;
				openSockets.Lookup( s, soc );
				if( soc )
				{
					request->ipAddress[0] = soc->ipAddress[0];
					request->ipAddress[1] = soc->ipAddress[1];
					request->ipAddress[2] = soc->ipAddress[2];
					request->ipAddress[3] = soc->ipAddress[3];
					request->port = soc->port;
					request->socketId = soc->id;
					UpdateClientPort(s, soc->id);
          ATLTRACE(_T("[%d] - CWatchDlg::SocketSend - New request to %d.%d.%d.%d:%d\n"), s, soc->ipAddress[0], soc->ipAddress[1], soc->ipAddress[2], soc->ipAddress[3], soc->port);
        } else {
          ATLTRACE(_T("[%d] - CWatchDlg::SocketSend - Failed to find matching socket info\n"), s);
        }
				
				// find the connection this is tied to
				POSITION pos = events.GetHeadPosition();
				while( pos )
				{
					CTrackedEvent * e = events.GetNext(pos);
					if( e && e->type == CTrackedEvent::etSocketConnect )
					{
						CSocketConnect * c = (CSocketConnect *)e;
						if( c->socketId == request->socketId )
						{
							request->host = c->host;
							
							if( !c->request )
							{
								c->request = request;
								request->connect = c;
							}
							pos = 0;
						}
					}
				}
				
				// add the new request to the list
				requests.AddHead(request);
				request->request.Process();
				AddEvent(request);
			}
			else
				request->request.Process();
				
			// link this to the winInet request from the same thread
			if( request && !request->linkedRequest )
				linkSocketRequestSend(request);
			
			requestSocketIds.SetAt(request->socketId, request);

			LeaveCriticalSection(&cs);
		}
		else
		{
			// pull it out of the connection list
			EnterCriticalSection(&cs);
			POSITION pos = connects.GetHeadPosition();
			while( pos )
			{
				POSITION old = pos;
				CSocketConnect * c = connects.GetNext(pos);
				if( c && !c->end && c->s == s)
				{
					// remove it from the pending connections list (will still be in the tracked events)
					connects.RemoveAt(old);
					pos = 0;
				}
			}
			LeaveCriticalSection(&cs);
		}
	}
	else if( !IsFakeSocket(s,0,0) )
	{
        ATLTRACE(_T("[Pagetest] - CWatchDlg::SocketSend - outside of active request\n"));
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CSocketEvents::SocketRecv(SOCKET s, DWORD len, LPBYTE buff)
{
	if( active )
	{
		CheckStuff();
		
		if( !IsFakeSocket(s,0,0) )
		{
			__int64 now;
			QueryPerfCounter(now);

      ATLTRACE(_T("[Pagetest] - (0x%08X) CWatchDlg::SocketRecv - socket %d, %d bytes, open requests = %d\n"), GetCurrentThreadId(), s, len, openRequests);

			bool repaint = false;
			bwBytesIn += len;	// update the bandwidth info
			
			EnterCriticalSection(&cs);
			
			// update the start and end of response on the request object
			POSITION pos = requests.GetHeadPosition();
			while( pos )
			{
				CSocketRequest * r = requests.GetNext(pos);
				if( r && r->s == s )
				{
					requestSocketIds.SetAt(r->socketId, r);
					
					// see if we already recorded time to first byte on the response
					if( !r->firstByte )
						r->firstByte = now;
						
					// increment the amount of incoming data
					r->in += len;
					r->response.AddData(len, buff);
					
					// update the end time of the linked request
					if( r->linkedRequest )
					{
						r->linkedRequest->Done();
						r->linkedRequest->in = r->in;
						lastActivity = now;
					}

					// update the end time (this can be done multiple times)
					r->Done();
					now = r->end;
				}
			}
			LeaveCriticalSection(&cs);
			
			if( repaint )
				RepaintWaterfall();
		}
	}
	else if( !IsFakeSocket(s,0,0) )
	{
        ATLTRACE(_T("[Pagetest] - CWatchDlg::SocketRecv - outside of active request\n"));
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CSocketEvents::SocketConnect(SOCKET s, struct sockaddr_in * addr)
{
	// create the new connect attempt
	CSocketConnect * c = new CSocketConnect(s, *addr, currentDoc);

	// update the IP address on the socket
	EnterCriticalSection(&cs);
	CSocketInfo * soc = NULL;
	openSockets.Lookup(s, soc);
	if( soc )
	{
		soc->ipAddress[0] = c->addr[0];
		soc->ipAddress[1] = c->addr[1];
		soc->ipAddress[2] = c->addr[2];
		soc->ipAddress[3] = c->addr[3];
		soc->port = c->port;
		c->socketId = soc->id;
		
		memcpy( &soc->address, addr, sizeof(SOCKADDR_IN) );
	}
	LeaveCriticalSection(&cs);
	
	// make sure we are timing something
	if( active )
	{
		ATLTRACE(_T("[Pagetest] - (0x%08X) CWatchDlg::SocketConnect - socket %d, currentDoc = %d\n"), GetCurrentThreadId(), s, currentDoc);
		
		CheckStuff();

		EnterCriticalSection(&cs);

		// find which DNS entry this socket came from (only the first socket to claim a DNS entry wins)
		POSITION pos = dns.GetHeadPosition();
		while( pos )
		{
			CDnsLookup * d = dns.GetNext(pos);
			if( d && d->addressCount )
			{
				for( int i = 0; i < d->addressCount; i++ )
				{
					if( d->address[i].S_un.S_addr == addr->sin_addr.S_un.S_addr )
					{
						pos = 0;
						c->host = d->name;
						if( !d->socket )
						{
							d->socket = c;
							c->dns = d;
						}
					}
				}
			}
		}
		
		connects.AddHead(c);
		AddEvent(c);

		// link this to the winInet request from the same thread
		if( c )
			linkSocketRequestConnect(c);

		LeaveCriticalSection(&cs);

		// see if we know the local port (so we can add it to the traffic shaping rules)
		if( addr )
		{
			SOCKADDR_IN local;
			int len = sizeof(local);
			if( !getsockname(s, (sockaddr *)&local, &len) )
			{
				ATLTRACE(_T("[Pagetest] - Connecting: %d.%d.%d.%d : %d -> %d.%d.%d.%d : %d"), 
						local.sin_addr.S_un.S_un_b.s_b1, local.sin_addr.S_un.S_un_b.s_b2, local.sin_addr.S_un.S_un_b.s_b3, local.sin_addr.S_un.S_un_b.s_b4, 
						htons(local.sin_port),
						addr->sin_addr.S_un.S_un_b.s_b1, addr->sin_addr.S_un.S_un_b.s_b2, addr->sin_addr.S_un.S_un_b.s_b3, addr->sin_addr.S_un.S_un_b.s_b4, 
						htons(addr->sin_port) );
			}
		}
	}
	else
		delete c;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CSocketEvents::SocketConnected(SOCKET s)
{
    DWORD id = 0;
		EnterCriticalSection(&cs);
		POSITION pos = connects.GetHeadPosition();
		while( pos )
		{
			POSITION old = pos;
			CSocketConnect * c = connects.GetNext(pos);
			if( c && !c->end && c->s == s)
			{
			  id = c->socketId;
				c->Done();
        UpdateRTT(c);
				
				// remove it from the pending connections list (will still be in the tracked events)
				connects.RemoveAt(old);
				pos = 0;
			}
		}
		LeaveCriticalSection(&cs);
		if (id)
		  UpdateClientPort(s, id);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CSocketEvents::SocketBind(SOCKET s, struct sockaddr_in * addr)
{
}

/*-----------------------------------------------------------------------------
	Determine if the given socket is a fake socket
-----------------------------------------------------------------------------*/
bool CSocketEvents::IsFakeSocket(SOCKET s, DWORD dataLen, LPBYTE buff)
{
	bool ret = false;

	EnterCriticalSection(&cs);

	// find the socket info
	CSocketInfo * sock = NULL;
	openSockets.Lookup(s, sock);

	if( sock )
	{
		if( sock->fake )
			ret = true;
		else if( sock->dataSent )
			ret = false;
		else
		{
			// ok, not clear cut, we need to figure it out if we haven't already
			if( dataLen == 1 && buff && *buff == '!' )
				ret = sock->fake = sock->dataSent = true;
			else if( dataLen )
				sock->dataSent = true;
		}
	}
	
	LeaveCriticalSection(&cs);
	
	return ret;
}

/*-----------------------------------------------------------------------------
	Allow for an in-place modification of HTTP headers
  (must keep the size the same so we have to remove data from the UA string
  and possibly eliminate other headers)
-----------------------------------------------------------------------------*/
void CSocketEvents::ModifyDataOut(LPBYTE buff, DWORD len) {
  if (hostOverride.GetCount() && len > 4 && buff) {
    // make sure we have an outbound HTTP request
    if (!memcmp(buff, "GET ", 4) || 
        !memcmp(buff, "PUT ", 4) || 
        !memcmp(buff, "POST ", 5) || 
        !memcmp(buff, "HEAD ", 5)) {
      CStringA original((char *)buff, len);
      CStringA out;
      bool xhost_exists = false;
      bool modified = false;
      int token_pos = 0;
      CStringA line = original.Tokenize("\r\n", token_pos).Trim();
      while (token_pos >= 0) {
        bool keep = true;
        int separator = line.Find(":");
        if (separator > 0) {
          CStringA token = line.Left(separator).Trim();
          CStringA value = line.Mid(separator + 1).Trim();
          // modify the host header
          if (!token.CompareNoCase("Host")) {
            POSITION pos = hostOverride.GetHeadPosition();
            while(pos) {
              CHostOverride hostPair = hostOverride.GetNext(pos);
              if( value.CompareNoCase(CT2A(hostPair.newHost)) && 
                  (!value.CompareNoCase(CT2A(hostPair.originalHost)) || 
                    !hostPair.originalHost.Compare(_T("*"))) ) {
                line = CStringA("Host: ") + CStringA(CT2A(hostPair.newHost));
                if (!xhost_exists) {
                  line += CStringA("\r\nx-Host: ") + value;
                  xhost_exists = true;
                }
                modified = true;
                break;
              } 
            }
          } else if (!token.CompareNoCase("x-Host")) {
            if (xhost_exists) {
              keep = false;
            } else {
              xhost_exists = true;
            }
          }
        }
        if (keep) {
          out += line + "\r\n";
        }
        line = original.Tokenize("\r\n", token_pos).Trim();
      }
      out += "\r\n";

      // see if we need to reduce the size of the request by stripping out headers
      if (modified) {
        if (out.GetLength() != (int)len) {
          CStringA reduced = "";
          token_pos = 0;
          line = out.Tokenize("\r\n", token_pos).Trim();
          while (token_pos >= 0) {
            bool keep = true;
            int separator = line.Find(":");
            if (separator > 0) {
              CStringA token = line.Left(separator).Trim();
              CStringA value = line.Mid(separator + 1).Trim();
              if (!token.CompareNoCase("Accept-Language")) {
                keep = false;
              } else if (!token.CompareNoCase("Referer")) {
                keep = false;
              } else if (!token.CompareNoCase("Accept")) {
                line = "Accept: */*";
              } else if (!token.CompareNoCase("Accept-Encoding")) {
                line.Replace(", deflate", "");
              } else if (!token.CompareNoCase("User-Agent")) {
                int msie = line.Find("MSIE");
                if (msie > 0) {
                  msie = line.Find(";", msie);
                  if (msie > 0) {
                    line = line.Left(msie) + ";)";
                  }
                }
              }
            }
            if (keep)
              reduced += line + "\r\n";
            line = out.Tokenize("\r\n", token_pos).Trim();
          }
          out = reduced + "\r\n";
        }

        // add padding
        if (out.GetLength() < (int)len) {
          out = out.Trim() + "\r\nx: ";
          int needed = (int)len - out.GetLength();
          if (needed > 4) {
            while (needed > 4) {
              needed--;
              out += "x";
            }
            out += "\r\n\r\n";
          } else {
            modified = false;
          }
        }

        if (modified && out.GetLength() == (int)len) {
          memcpy(buff, (LPCSTR)out, len);
        }
      }
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CSocketEvents::UpdateRTT(CSocketConnect * c)
{
  DWORD addr = c->name.sin_addr.S_un.S_addr;
  if (c->start && c->end && c->end >= c->start && addr)
  {
    long elapsed = (long)((c->end - c->start) / msFreq);
    UpdateRTT(addr, elapsed) ;
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CSocketEvents::UpdateRTT(DWORD ipv4_address, long elapsed) 
{
  if (ipv4_address)
  {
    long ms = -1;
    if (rtt.Lookup(ipv4_address, ms))
    {
      if (elapsed < ms)
      {
        rtt.SetAt(ipv4_address,elapsed);
      }
    }
    else
    {
      rtt.SetAt(ipv4_address,elapsed);
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CString CSocketEvents::GetRTT(DWORD ipv4_address)
{
  CString ret;
  if (ipv4_address) {
    long ms = -1;
    if (rtt.Lookup(ipv4_address, ms)) {
      ret.Format(_T("%d"), ms);
    }
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CSocketEvents::MapSchannelSocket(void * schannelId, SOCKET s) {
  EnterCriticalSection(&socket_cs);
  schannelIds.SetAt(s, schannelId);
  schannelSockets.SetAt(schannelId, s);
  LeaveCriticalSection(&socket_cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SOCKET CSocketEvents::GetSchannelSocket(void * schannelId){
  SOCKET s = INVALID_SOCKET;
  EnterCriticalSection(&socket_cs);
  schannelSockets.Lookup(schannelId, s);
  LeaveCriticalSection(&socket_cs);
  return s;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void * CSocketEvents::GetSchannelId(SOCKET s){
  void * schannelId = NULL;
  EnterCriticalSection(&socket_cs);
  schannelIds.Lookup(s, schannelId);
  LeaveCriticalSection(&socket_cs);
  return schannelId;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CSocketEvents::UpdateClientPort(SOCKET s, DWORD id) {
  struct sockaddr_in client;
  int addrlen = sizeof(client);
  if(getsockname(s, (struct sockaddr *)&client, &addrlen) == 0 &&
     client.sin_family == AF_INET &&
     addrlen == sizeof(client)) {
    int localPort = ntohs(client.sin_port);
    EnterCriticalSection(&cs);
    client_ports.SetAt(id, localPort);
    LeaveCriticalSection(&cs);
  }
}
