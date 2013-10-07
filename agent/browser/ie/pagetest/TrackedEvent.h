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
#include "HttpHeader.h"

/*-----------------------------------------------------------------------------
  Custom Regex matches
-----------------------------------------------------------------------------*/
class CCustomMatch {
public:
	CCustomMatch(void):count(0){}
	CCustomMatch(const CCustomMatch& src){ *this = src; }
	~CCustomMatch(void){}
	const CCustomMatch& operator =(const CCustomMatch& src) {
		name = src.name;
		value = src.value;
		count = src.count;
		return src;
	}

  CString name;
  CString value;
  int count;
};

/*-----------------------------------------------------------------------------
	base class for the list of events we are tracking 
	(will be tracked by the sequence they happen in)
-----------------------------------------------------------------------------*/
class CTrackedEvent
{
public:
	typedef enum{
		etPage			= 0,
		etDns			= 1,
		etSocketConnect	= 2,
		etSocketRequest	= 3,
		etDocument		= 4,	// removed
		etFrame			= 5,
		etRequest		= 6,	// removed
		etWinInetRequest= 7,
		etCachedRequest	= 8
	}EventType;
	
	CTrackedEvent(EventType Type, DWORD docId):
		end(0)
		, type(Type)
		, elapsed(0)
		, offset(0)
		, docID(docId)
		, hTreeItem(NULL)
		, treeIndex(-1)
		, highlighted(false)
		, ignore(false)
	{ 
		QueryPerfCounter(start); 
	}
	virtual ~CTrackedEvent(void){}
	virtual void Done(void){ QueryPerfCounter(end); }
	
	__int64		start;
	__int64		end;
	double		elapsed;
	double		offset;
	EventType	type;
	DWORD		docID;		// which document does this event belong to?
	bool		ignore;		// should this event be ignored for calculations?
	
	// UI stuff
	HTREEITEM	hTreeItem;		// handle to this item in the tree view
	int			treeIndex;		// index in the tree (used for coloring the rows)
	bool		highlighted;	// is this item highlighted?
};

/*-----------------------------------------------------------------------------
	The page
-----------------------------------------------------------------------------*/
class CPageEvent :
	public CTrackedEvent
{
public:
	CPageEvent(DWORD docId):
		CTrackedEvent(etPage, docId){}

	virtual ~CPageEvent(void){}
};


/*-----------------------------------------------------------------------------
	DNS lookups
-----------------------------------------------------------------------------*/
class CDnsLookup :
	public CTrackedEvent
{
public:
	CDnsLookup(CString& Name, DWORD docId):
		CTrackedEvent(etDns, docId)
		,hLookup(NULL)
		,name(Name)
		,addressCount(0)
		,socket(0)
		{
			overrideAddr.S_un.S_addr = 0;
		}

	virtual ~CDnsLookup(void){}
	
	virtual void AddAddress(struct in_addr &addr)
	{
		if( addressCount < _countof(address) )
		{
			memcpy(&address[addressCount], &addr, sizeof(addr));
			addressCount++;
		}
	}

	CString	name;
	HANDLE	hLookup;
	int				addressCount;
	struct in_addr 	address[20];	// only allow for up to 20 addresses
	CTrackedEvent *	socket;			// first socket connection that used this DNS lookup
	struct in_addr	overrideAddr;	// override address
};

/*-----------------------------------------------------------------------------
	Fields in the response headers
-----------------------------------------------------------------------------*/
class CWinInetResponseHeader
{
public:
	CString	connection;
	CString contentType;
	CString contentEncoding;
	CString expires;
	CString cacheControl;
	CString pragma;
	CString etag;
	CString date;
	CString age;
	double ver;
};

/*-----------------------------------------------------------------------------
	Fields in the request headers
-----------------------------------------------------------------------------*/
class CWinInetRequestHeader
{
public:
	CWinInetRequestHeader():cookieCount(0), cookieSize(0){}
	CString	cookie;
	DWORD	cookieSize;
	DWORD	cookieCount;
};

/*-----------------------------------------------------------------------------
	WinInet Requests
-----------------------------------------------------------------------------*/
class CWinInetRequest :
	public CTrackedEvent
{
public:
	CWinInetRequest(DWORD docId,EventType Type = etWinInetRequest):
		CTrackedEvent(Type, docId)
		, hRequest(NULL)
		, out(0)
		, in(0)
		, requestSent(0)
		, firstByte(0)
		, dnsStart(0)
		, dnsEnd(0)
		, socketConnect(0)
		, socketConnected(0)
		, s(0)
		, socketId(0)
		, secure(false)
		, result(-1)
		, linkedRequest(0)
		, tmDNS(-1)
		, tmSocket(-1)
		, tmSSL(-1)
		, tmRequest(0)
		, tmDownload(0)
		, tmLoad(0)
		, body(0)
		, bodyLen(0)
		, flagged(false)
		, valid(false)
		, basePage(false)
		,warning(false)
		,gzipScore(-1)
		,doctypeScore(-1)
		,keepAliveScore(-1)
		,staticCdnScore(-1)
		,cacheScore(-1)
		,combineScore(-1)
		,cookieScore(-1)
		,minifyScore(-1)
		,compressionScore(-1)
		,jpegScans(0)
		,etagScore(-1)
		,gzipTotal(0)
		,gzipTarget(0)
		,minifyTotal(0)
		,minifyTarget(0)
		,compressTotal(0)
		,compressTarget(0)
		,ttl(-1)
		,closed(0)
		,fromNet(false)
	{
		memset(&peer, 0, sizeof(peer));

		QueryPerfFrequency(msFreq);
		msFreq = msFreq / (__int64)1000;
	}
	
	virtual ~CWinInetRequest(void)
	{
		if( body )
			free(body);
	}
	virtual void Done(bool updateFirstByte = false);
	virtual void Process(void);
	virtual void CrackHeaders(void);
	virtual void Decompress(void);
  CString GetResponseHeader(CString field);
	
	HINTERNET		hRequest;
	CString			scheme;		// http, https, ftp, etc.
	CString			host;		// host name from the request headers
	CString			hostName;	// name of the host that we looked up
	CString			verb;		// GET/POST
	CString			object;
	DWORD			out;		// bytes out
	DWORD			in;			// bytes in
	CString			outHeaders;
	CString			inHeaders;        // inHeaders read from the network
	CString			cachedInHeaders;  // inHeaders read from the cache
	__int64			requestSent;	// time the request was sent
	__int64			firstByte;
	__int64			dnsStart;		// time the DNS lookup started
	__int64			dnsEnd;		// time the DNS lookup started
	__int64			socketConnect;	// time the socket connection was started
	__int64			socketConnected;	// time the socket connection was finished
	__int64			msFreq;
	__int64			created;		// time the request was created (independent of activity)
	__int64			closed;			// time when the request was closed
	CTrackedEvent*	linkedRequest;
	UINT_PTR		s;				// socket handle the request was on
	DWORD			socketId;		// socket ID the request was on
	bool			secure;			// is it a secure socket?
	SOCKADDR_IN		peer;			// address that we're connected to
	DWORD			result;			// result of the request (0 for success)
	DWORD			tmDNS;			// DNS lookup time (milliseconds)
	DWORD			tmSocket;		// Socket connect time (milliseconds)
	DWORD			tmSSL;			// SSL negotiation time (milliseconds)
	DWORD			tmRequest;		// Time to first byte from when the request started being sent
	DWORD			tmDownload;		// Content download time
	DWORD			tmLoad;			// total load time
	LPBYTE			body;			// response body
	DWORD			bodyLen;		// length of the body
	bool			flagged;		// is this connection to a flagged host?
	bool			valid;			// is it a real request?
	bool			basePage;		// is this the base page?
	bool			fromNet;		// Was it a network request?

  // custom checks
  CAtlList<CCustomMatch>  customMatches;

	// optimization checks
	bool				warning;
	int					gzipScore;
	int					doctypeScore;
	int					keepAliveScore;
	int					staticCdnScore;
	int					cacheScore;
	int					combineScore;
	int					cookieScore;
	int					minifyScore;
	int					compressionScore;
	int         jpegScans;
	int					etagScore;
	CString				cdnProvider;

	// optimization aggregates
	DWORD	gzipTotal;
	DWORD	gzipTarget;
	DWORD	minifyTotal;
	DWORD	minifyTarget;
	DWORD	compressTotal;
	DWORD	compressTarget;
	
	DWORD	ttl;	// cache time to live
	
	// header fields
	CWinInetResponseHeader	response;
	CWinInetRequestHeader	request;
	
};

/*-----------------------------------------------------------------------------
	Socket connects
-----------------------------------------------------------------------------*/
class CSocketConnect :
	public CTrackedEvent
{
public:
	CSocketConnect(SOCKET sock, struct sockaddr_in inAddr, DWORD docId):
		CTrackedEvent(etSocketConnect, docId)
		,name(inAddr)
		,s(sock)
		,socketId(0)
		,dns(0)
		,request(0)
		,host(_T(""))
		,linkedRequest(0)
		,flaggedConnection(false)
	{
		addr[0] = inAddr.sin_addr.S_un.S_un_b.s_b1;
		addr[1] = inAddr.sin_addr.S_un.S_un_b.s_b2;
		addr[2] = inAddr.sin_addr.S_un.S_un_b.s_b3;
		addr[3] = inAddr.sin_addr.S_un.S_un_b.s_b4;
		
		port = ntohs(inAddr.sin_port);
		
		*szName = 0;
	}
	
	virtual ~CSocketConnect(void){}
	
	SOCKET			s;
	BYTE			addr[4];
	WORD			port;
	char			szName[NI_MAXHOST];
	struct			sockaddr_in name;
	DWORD			socketId;
	CDnsLookup *	dns;		// pointer to the DNS event that this came from (if there is one)
	CTrackedEvent *	request;	// pointer to the first request that went over this socket
	CString			host;		// host name from the DNS lookup (if available)
	bool			flaggedConnection;	// is this a connection we're keeping track of (for parallel request counts)?
	CWinInetRequest * linkedRequest;	// WinInet request that this socket connect belongs to
};

/*-----------------------------------------------------------------------------
	Socket requests
-----------------------------------------------------------------------------*/
class CSocketRequest :
	public CTrackedEvent
{
public:
	CSocketRequest(SOCKET sock, DWORD docId):
		CTrackedEvent(etSocketRequest, docId)
		,s(sock)
		,firstByte(0)
		,in(0)
		,out(0)
		,tmFirstByte(0)
		,socketId(0)
		,port(0)
		,connect(0)
		,linkedRequest(0)
	{
		ipAddress[0] = ipAddress[1] = ipAddress[2] = ipAddress[3] = 0;
	}
	
	virtual ~CSocketRequest(void){}
	virtual void Done(void);
	
	SOCKET				s;
	__int64				firstByte;
	DWORD				in;			// number of bytes in
	DWORD				out;		// number of bytes out
	double				tmFirstByte;
	BYTE				ipAddress[4];
	WORD				port;
	CHttpHeader			request;
	CHttpHeader			response;
	DWORD				socketId;
	CSocketConnect *	connect;	// pointer to the socket connection this is linked to (only the first gets linked)
	CString				host;		// host based on the socket connect/DNS lookup
	CWinInetRequest *	linkedRequest;	// WinInet request that this request matches (for HTTPS info)
};

