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
#include "WinInetEvents.h"
#include <atlenc.h>
#include <regex>
#include <string>
#include <sstream>

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CWinInetEvents::CWinInetEvents(void):
	forceDone(false)
{
	winInetConnections.InitHashTable(257);
	winInetAsync.InitHashTable(257);
	winInetThreadConnects.InitHashTable(257);
	winInetThreadSends.InitHashTable(257);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CWinInetEvents::~CWinInetEvents(void)
{
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWinInetEvents::Reset(void)
{
	__super::Reset();
	forceDone = false;	
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWinInetEvents::BeforeInternetOpen(CString &agent)
{
	if( active )
	{
		if( !userAgent.IsEmpty() )
		{
			agent = userAgent;
		}
		else if( script_modifyUserAgent && !keepua )
		{
			// modify the user agent string
			CString buff;
			buff.Format(_T("; PTST 2.%d"), build);
			
			// make sure we didn't already set the UA string
			if( agent.Find(buff) == -1 )
			{
				// find the end parenthesis
				int end = agent.ReverseFind(_T(')'));
				if( end >= 0 )
					agent = agent.Left(end) + buff + agent.Mid(end);
				else
					agent += buff;	// just tack it on the end if we couldn't find the correct structure (unlikely but better to be safe)
			}
		}
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWinInetEvents::OnInternetOpen(HINTERNET hInternet, CString & agent, DWORD accessType, CString & proxy, CString & proxyBypass, DWORD flags)
{
	ATLTRACE(_T("[Pagetest] - *** 0x%p - OnInternetOpen : flags - 0x%08X\n"), hInternet, flags);

	// store if it is an async connection
	bool async = false;
	if( flags & INTERNET_FLAG_ASYNC )
		async = true;
	winInetAsync.SetAt(hInternet, async);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWinInetEvents::OnInternetCloseHandle(HINTERNET hInternet)
{
	ATLTRACE(_T("[Pagetest] - *** 0x%p - OnInternetCloseHandle\n"), hInternet);

	// remove it from our active list
	if( active )
	{
		__int64 now;
		QueryPerfCounter(now);

		CheckStuff();

		EnterCriticalSection(&cs);		

		CWinInetRequest * r = NULL;
		winInetRequests.Lookup(hInternet, r);
		if( r )
		{
			r->closed = now;

			if( !r->end )
			{
				// flag the request as cancelled (0)
				if( r->result == -1 )
					r->result = 0;

				r->Done();
				
				// update the end time
				if( !r->ignore )
				{
					lastRequest = r->end;
					lastActivity = r->end;
				}
				
				// update the in and out bytes from the raw socket
				if( r->linkedRequest )
				{
					r->in = ((CSocketRequest *)r->linkedRequest)->in;
					r->out = ((CSocketRequest *)r->linkedRequest)->out;
				}
			}
			
			// if we were waiting for this request, act on it
			CString request = r->host + r->object;
			if( !domElement && !domRequest.IsEmpty() && request.Find(domRequest) > -1 )
			{
				switch(domRequestType)
				{
					case START: domElement = r->start; break;
					case TTFB: domElement = r->firstByte; break;
					default: domElement = r->end; break;
				}

				lastRequest = lastActivity = domElement;
			}
			if( !endRequest.IsEmpty() && request.Find(endRequest) > -1 )
			{
				end = r->end;
				forceDone = true;
			}
			if( !requiredRequests.IsEmpty() )
			{
				POSITION pos = requiredRequests.GetHeadPosition();
				while( pos )
				{
					POSITION oldPos = pos;
					CString match = requiredRequests.GetNext(pos);

					if( request.Find(match) > -1 )
					{
						requiredRequests.RemoveAt(oldPos);
						break;	// only peel off one match at a time
					}
				}
			}

			winInetRequests.RemoveKey(hInternet);
		}
		LeaveCriticalSection(&cs);
	}
	
	// if it was a connection, remove it from the list
	EnterCriticalSection(&cs);		
	CString str;
	if( winInetConnections.Lookup(hInternet, str) )
		winInetConnections.RemoveKey(hInternet);
	bool b;
	if( winInetAsync.Lookup(hInternet, b) )
		winInetAsync.RemoveKey(hInternet);
	LeaveCriticalSection(&cs);
}

#pragma warning(push)
#pragma warning(disable:4244)

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWinInetEvents::OnInternetStatusCallback(HINTERNET hInternet, DWORD_PTR dwContext, DWORD dwInternetStatus, LPVOID lpvStatusInformation, DWORD dwStatusInformationLength)
{
	if( active )
	{
		// locate the request
		EnterCriticalSection(&cs);
		CWinInetRequest * r = NULL;
		winInetRequests.Lookup(hInternet, r);
		LeaveCriticalSection(&cs);

		if( r )
		{
			switch(dwInternetStatus)
			{
				case INTERNET_STATUS_RESOLVING_NAME: 
						{
							EnterCriticalSection(&cs);

							r->valid = true;
							r->fromNet = true;
							if( lpvStatusInformation )
								r->hostName = (LPCSTR)lpvStatusInformation;
								
							if( !r->dnsStart )
								QueryPerfCounter(r->dnsStart);

							if( !r->start )
							{
								r->start = r->dnsStart;
								r->docID = currentDoc;
							}

							LeaveCriticalSection(&cs);
								
							ATLTRACE(_T("[Pagetest] - (0x%08X) *** 0x%p - INTERNET_STATUS_RESOLVING_NAME : %s\n"), GetCurrentThreadId(), r->hRequest, (LPCTSTR)r->hostName);
						}
						break;
						
				case INTERNET_STATUS_NAME_RESOLVED:
						{
							ATLTRACE(_T("[Pagetest] - (0x%08X) *** 0x%p - INTERNET_STATUS_NAME_RESOLVED\n"), GetCurrentThreadId(), r->hRequest);
							__int64 now;
							QueryPerfCounter(now);

							EnterCriticalSection(&cs);
							if( r->dnsStart )
							{
								r->dnsEnd = now;
								r->tmDNS = now <= r->dnsStart ? 0 : (DWORD)((now - r->dnsStart) / msFreq);
							}
							LeaveCriticalSection(&cs);
						}
						break;
						
				case INTERNET_STATUS_CONNECTING_TO_SERVER:
						{
							EnterCriticalSection(&cs);

							r->valid = true;
							r->fromNet = true;
							if( !r->socketConnect )
								QueryPerfCounter(r->socketConnect);

							if( !r->start )
							{
								r->start = r->socketConnect;
								r->docID = currentDoc;
							}
							
							// keep track of the current connect on this thread
							winInetThreadConnects.SetAt(GetCurrentThreadId(), r);

							LeaveCriticalSection(&cs);

							ATLTRACE(_T("[Pagetest] - (0x%08X) *** 0x%p - INTERNET_STATUS_CONNECTING_TO_SERVER\n"), GetCurrentThreadId(), r->hRequest);
						}
						break;
						
				case INTERNET_STATUS_CONNECTED_TO_SERVER:
						{
							__int64 now;
							QueryPerfCounter(now);

							EnterCriticalSection(&cs);
							if( r->socketConnect )
							{
								r->socketConnected = now;
								r->tmSocket = now <= r->socketConnect ? 0 : (DWORD)((now - r->socketConnect) / msFreq);
                UpdateRTT(r->peer.sin_addr.S_un.S_addr, r->tmSocket);
							}
							
							// remove the pending connect for this thread (no big deal if they don't all get removed in case of failure)
							winInetThreadConnects.RemoveKey(GetCurrentThreadId());
							LeaveCriticalSection(&cs);

							ATLTRACE(_T("[Pagetest] - (0x%08X) *** 0x%p - INTERNET_STATUS_CONNECTED_TO_SERVER\n"), GetCurrentThreadId(), r->hRequest);
						}
						break;
						
				case INTERNET_STATUS_SENDING_REQUEST:
						{
							r->valid = true;
							r->fromNet = true;
              OverrideHost(r);
							if( !r->requestSent )
								QueryPerfCounter(r->requestSent);
								
							// see if this is the base page that is being requested
							if( !haveBasePage )
							{
								r->basePage = true;
								haveBasePage = true;
							}

							if( !r->start )
							{
								r->start = r->requestSent;
								r->docID = currentDoc;
							}
							
							// check if the request is secure
							DWORD flags = 0;
							DWORD len = sizeof(flags);
							if( InternetQueryOption(r->hRequest, INTERNET_OPTION_SECURITY_FLAGS, &flags, &len) )
								if( flags & SECURITY_FLAG_SECURE )
									r->secure = true;

							if( r->tmSSL == -1 && r->secure && r->socketConnected )
								r->tmSSL = r->requestSent <= r->socketConnected ? 0 : (DWORD)((r->requestSent - r->socketConnected) / msFreq);

							// get the request headers
							TCHAR buff[10000];
							len = sizeof(buff);
							DWORD index = 0;
							memset(buff, 0, len);
							if( r->outHeaders.IsEmpty() )
								if( HttpQueryInfo(r->hRequest, HTTP_QUERY_FLAG_REQUEST_HEADERS | HTTP_QUERY_RAW_HEADERS_CRLF , buff, &len, &index) )
									r->outHeaders = buff;
								
							// get some specific headers we care about
              if( !r->host.GetLength() )
              {
							  len = sizeof(buff);
							  index = 0;
							  memset(buff, 0, len);
							  if( HttpQueryInfo(r->hRequest, HTTP_QUERY_FLAG_REQUEST_HEADERS | HTTP_QUERY_HOST , buff, &len, &index) )
								  r->host = buff;
              }
							
							ATLTRACE(_T("[Pagetest] - *** (%d) 0x%p - INTERNET_STATUS_SENDING_REQUEST, socket %d\n"), GetCurrentThreadId(), r->hRequest, r->socketId);
						}
						break;
						
				case INTERNET_STATUS_REQUEST_SENT:
						{
							ATLTRACE(_T("[Pagetest] - *** (%d) 0x%p - INTERNET_STATUS_REQUEST_SENT : %d bytes\n"), GetCurrentThreadId(), r->hRequest, r->out);
							EnterCriticalSection(&cs);

							if( dwStatusInformationLength == sizeof(DWORD) && lpvStatusInformation )
								r->out += *((LPDWORD)lpvStatusInformation);
							
	            EnterCriticalSection(&cs);
	            CSocketRequest * s = NULL;
	            winInetThreadSends.Lookup(GetCurrentThreadId(), s);
	            if( s )
	            {
		            r->linkedRequest = s;
		            s->linkedRequest = r;
            		
		            // copy over the IP information
		            r->peer.sin_addr.S_un.S_un_b.s_b1 = s->ipAddress[0];
		            r->peer.sin_addr.S_un.S_un_b.s_b2 = s->ipAddress[1];
		            r->peer.sin_addr.S_un.S_un_b.s_b3 = s->ipAddress[2];
		            r->peer.sin_addr.S_un.S_un_b.s_b4 = s->ipAddress[3];
		            r->peer.sin_port = s->port;
		            r->socketId = s->socketId;

                // zero out the bytes-in
                s->in = 0;
                r->in = 0;
                ATLTRACE(_T("[Pagetest] INTERNET_STATUS_REQUEST_SENT - linked socket request to wininet request for %s%s\n"), (LPCTSTR)r->host, (LPCTSTR)r->object);
              } else {
                ATLTRACE(_T("[Pagetest] INTERNET_STATUS_REQUEST_SENT - Failed to link socket request to wininet request on thread %d\n"), GetCurrentThreadId());
              }
	            LeaveCriticalSection(&cs);

              // clean up the mapping of the request that was sending on this thread
							winInetThreadSends.RemoveKey(GetCurrentThreadId());

							LeaveCriticalSection(&cs);
						}
						break;
						
				case INTERNET_STATUS_RECEIVING_RESPONSE:
						{
							ATLTRACE(_T("[Pagetest] - *** (%d) 0x%p - INTERNET_STATUS_RECEIVING_RESPONSE\n"), GetCurrentThreadId(), r->hRequest);
						}
						break;
						
				case INTERNET_STATUS_REDIRECT:
						{
							CString url = CA2T((LPCSTR)lpvStatusInformation);
							ATLTRACE(_T("[Pagetest] - *** (%d) 0x%p - INTERNET_STATUS_REDIRECT : Redirecting to %s\n"), GetCurrentThreadId(), r->hRequest, (LPCTSTR)url);
							
							// get the headers, close out the request and start a new one for the redirect
							r->Done();
							
							// update the end time
							if( !r->ignore )
							{
								lastRequest = r->end;
								lastActivity = r->end;
							}

							// update the in and out bytes from the raw socket
							if( r->linkedRequest )
							{
								r->in = ((CSocketRequest *)r->linkedRequest)->in;
								r->out = ((CSocketRequest *)r->linkedRequest)->out;
							}

							// get the response code and headers
							TCHAR buff[10000];
							DWORD len = sizeof(buff);
							DWORD index = 0;
							memset(buff, 0, len);
							if( r->inHeaders.IsEmpty() )
								if( HttpQueryInfo(r->hRequest, HTTP_QUERY_RAW_HEADERS_CRLF , buff, &len, &index) )
									r->inHeaders = buff;

							// get the redirect code
							DWORD code;
							len = sizeof(code);
							index = 0;
							if( HttpQueryInfo(r->hRequest, HTTP_QUERY_FLAG_NUMBER | HTTP_QUERY_STATUS_CODE , &code, &len, &index) )
								r->result = code;
								
							// remove it from the lookup
							OnInternetCloseHandle(r->hRequest);

              // see if we need to block the new request
              bool block = false;
			        POSITION pos = blockRequests.GetHeadPosition();
			        while (pos && !block) {
				        CString blockRequest = blockRequests.GetNext(pos);
				        blockRequest.Trim();
                if (blockRequest.GetLength() && url.Find(blockRequest) != -1) {
					        block = true;
				          blockedRequests.AddTail(url);
                }
			        }
              if (block) {
                InternetCloseHandle(r->hRequest);
              } else {
							  // create a new request
							  CWinInetRequest * req = new CWinInetRequest(currentDoc);
  							
							  // if this is for the base page, move it to the redirected request
							  if( r->basePage )
							  {
								  basePageRedirects++;
								  r->basePage = false;
								  req->basePage = true;
							  }

							  req->verb = r->verb;
							  req->hRequest = r->hRequest;
  	
							  // split up the url
							  URL_COMPONENTS parts;
							  memset(&parts, 0, sizeof(parts));
							  TCHAR scheme[10000];
							  TCHAR host[10000];
							  TCHAR object[10000];
							  TCHAR extra[10000];
  							
							  memset(scheme, 0, sizeof(scheme));
							  memset(host, 0, sizeof(host));
							  memset(object, 0, sizeof(object));
							  memset(extra, 0, sizeof(extra));

							  parts.lpszScheme = scheme;
							  parts.dwSchemeLength = _countof(scheme);
							  parts.lpszHostName = host;
							  parts.dwHostNameLength = _countof(host);
							  parts.lpszUrlPath = object;
							  parts.dwUrlPathLength = _countof(object);
							  parts.lpszExtraInfo = extra;
							  parts.dwExtraInfoLength = _countof(extra);
							  parts.dwStructSize = sizeof(parts);
  							
							  if( InternetCrackUrl((LPCTSTR)url, url.GetLength(), 0, &parts) )
							  {
								  req->host = host;
								  req->object = CString(object) + extra;
								  req->scheme = scheme;
                  if (!req->scheme.Left(5).CompareNoCase(_T("https")))
                    req->secure = true;
							  }
  							
							  EnterCriticalSection(&cs);
							  winInetRequests.SetAt(req->hRequest, req);
							  winInetRequestList.AddHead(req);
                OverrideHost(req);
 							  LeaveCriticalSection(&cs);
  							
							  AddEvent(req);
              }
						}
						break;
						
				case INTERNET_STATUS_RESPONSE_RECEIVED:
						{
							if( dwStatusInformationLength == sizeof(DWORD) && lpvStatusInformation )
								r->in += *((LPDWORD)lpvStatusInformation);
								
							r->Done(true);

							// update the end time
							if( !r->ignore )
							{
								lastRequest = r->end;
								lastActivity = r->end;
							}

							// update the in and out bytes from the raw socket
							if( r->linkedRequest )
							{
								r->in = ((CSocketRequest *)r->linkedRequest)->in;
								r->out = ((CSocketRequest *)r->linkedRequest)->out;
							}

							ATLTRACE(_T("[Pagetest] - *** (0x%08X) 0x%p - INTERNET_STATUS_RESPONSE_RECEIVED : %d bytes\n"), GetCurrentThreadId(), r->hRequest, r->in);
						}
						break;
						
				case INTERNET_STATUS_REQUEST_COMPLETE:
						{
								
							ATLTRACE(_T("[Pagetest] - *** (0x%08X) 0x%p - INTERNET_STATUS_REQUEST_COMPLETE\n"), GetCurrentThreadId(), r->hRequest);

							LPINTERNET_ASYNC_RESULT result = (LPINTERNET_ASYNC_RESULT)lpvStatusInformation;
							if( (!r->result || (r->result == -1))&& result && !result->dwResult)
							{
								ATLTRACE(_T("[Pagetest] - *** INTERNET_STATUS_REQUEST_COMPLETE Error - %d\n"), result->dwError);
								r->result = result->dwError;
							}
							
							// get the response code and headers
							TCHAR buff[10000];
							DWORD len = sizeof(buff);
							DWORD index = 0;
							memset(buff, 0, len);
							if( r->inHeaders.IsEmpty() )
								if( HttpQueryInfo(r->hRequest, HTTP_QUERY_RAW_HEADERS_CRLF , buff, &len, &index) )
								{
									CString header = r->inHeaders = buff;

									// get the result code out of the header ourselves
									index = header.Find(_T(' '));
									if( index >= 0 )
									{
										header = header.Mid(index + 1, 10);
										long code = _ttol((LPCTSTR)header);
										if( code > 0 )
											r->result = (DWORD)code;
									}
								}

							if( !r->result || r->result == -1 )
							{
								DWORD code;
								len = sizeof(code);
								index = 0;
								if( HttpQueryInfo(r->hRequest, HTTP_QUERY_FLAG_NUMBER | HTTP_QUERY_STATUS_CODE , &code, &len, &index) )
									r->result = code;
							}
								
							// see if it was a 304 (from cache)
							unsigned long reqFlags = 0;
							len = sizeof(reqFlags);
							if( InternetQueryOption(r->hRequest, INTERNET_OPTION_REQUEST_FLAGS, &reqFlags, &len) )
								if( reqFlags & INTERNET_REQFLAG_FROM_CACHE )
								{
									r->result = 304;
									// Save away the headers we've received previously, which were the cached
									// headers reported from wininet. Note that wininet does not cache all
									// headers, so this is just a partial set of the actual headers associated
									// with the response.
									r->cachedInHeaders = r->inHeaders;
									r->inHeaders = _T("HTTP/1.1 304 Not Modified\nFull response not available\n");
								}
								
							// update the "done" time
							r->Done();

							// update the end time
							if( !r->ignore )
							{
								lastRequest = r->end;
								lastActivity = r->end;
							}

							// update the in and out bytes from the raw socket
							if( r->linkedRequest )
							{
								CSocketRequest * req = (CSocketRequest *)r->linkedRequest;
								r->in = req->in;
								r->out = req->out;
								
								if( req->response.code && req->response.code != -1 )
									r->result = req->response.code;
							}

							// make sure that we got an IP address for it
							EnterCriticalSection(&cs);
							if( r->s && !r->peer.sin_addr.S_un.S_addr )
							{
								CSocketInfo * soc = NULL;
								openSockets.Lookup(r->s, soc);
								if( soc )
									memcpy( &r->peer, &soc->address, sizeof(SOCKADDR_IN) );
							}
							LeaveCriticalSection(&cs);
						}
						break;
			}

			// update the activity time
			if( !r->ignore )
				QueryPerfCounter(lastActivity);
		}

		CheckStuff();
	}

	ATLTRACE(_T("[Pagetest] - *** (0x%08X) 0x%p - OnInternetStatusCallback - complete\n"), GetCurrentThreadId(), hInternet);
}

#pragma warning(pop)

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void * CWinInetEvents::BeforeHttpOpenRequest(HINTERNET hConnect, CString &verb, CString &object, CString &version, CString &referrer, CString &accept, DWORD &dwFlags, DWORD_PTR dwContext, bool &block)
{
	void * context = NULL;
	block = false;
	bool is_ad = false;
	
	ATLTRACE(_T("[Pagetest] - *** (0x%08X) 0x%p - BeforeHttpOpenRequest : flags - 0x%08X %s %s\n"), GetCurrentThreadId(), hConnect, dwFlags, (LPCTSTR)verb, (LPCTSTR)object);

	if( active )
	{
		// make sure it is an async request (ignore blocking requests)
		bool async = true;
		winInetAsync.Lookup(hConnect, async);
		
		// ignore Flash streaming RTMP traffic
		if( !async )
		{
			ATLTRACE(_T("[Pagetest] - *** BeforeHttpOpenRequest : Ignoring non-async request\n"));
		}
		else
		{
			CheckStuff();

			// see if we have to block the request
			EnterCriticalSection(&cs);
			
			// look up the host name if it is available
			CString host;
			winInetConnections.Lookup(hConnect, host);
      CString fullUrl = _T("http://");
			if( dwFlags & INTERNET_FLAG_SECURE )
        fullUrl = _T("https://");
			fullUrl += host + object;

			// Block ads.
			if( blockads && IsAdRequest(fullUrl) )
			{
				is_ad = true;
				block = true;
			}

			// Block requests containing the given string.
			POSITION pos = blockRequests.GetHeadPosition();
			while( pos && !block )
			{
				CString blockRequest = blockRequests.GetNext(pos);
				blockRequest.Trim();
				if( blockRequest.GetLength() && fullUrl.Find(blockRequest) != -1 )
					block = true;
			}
			
      // see if we need to add the original host name into the URL itself
      CString addHost;
      pos = overrideHostUrls.GetHeadPosition();
      while( pos && addHost.IsEmpty() )
      {
        CHostOverride target = overrideHostUrls.GetNext(pos);
        if( !target.originalHost.CompareNoCase(host) || !target.originalHost.Compare(_T("*")) )
        {
          addHost = host;
          host = target.newHost;
        }
      }
      if( !addHost.IsEmpty() )
        object = CString(_T("/")) + addHost + object;

      if( is_ad && block )
				blockedAdRequests.AddTail(fullUrl);
			else if( block )
				blockedRequests.AddTail(fullUrl);
			else
			{
				CWinInetRequest * r = new CWinInetRequest(currentDoc);
				r->docID = 0;
				context = (void *)r;
				
				r->host = host;
				r->verb = verb;
				r->object = object;
				r->scheme = _T("http:");
				if( dwFlags & INTERNET_FLAG_SECURE )
				{
					r->secure = true;
					r->scheme = _T("https:");
				}

        ATLTRACE(_T("[Pagetest] - *** BeforeHttpOpenRequest : %s/%s\n"), (LPCTSTR)host, (LPCTSTR)object);
					
				// ignore favicon.ico
				if( !object.Right(11).CompareNoCase(_T("favicon.ico")) )
					r->ignore = true;

				// update the activity time
				if( !r->ignore )
					QueryPerfCounter(lastActivity);
			}
			LeaveCriticalSection(&cs);
		}
	}

	return context;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWinInetEvents::AddAuthHeader(HINTERNET hRequest, CWinInetRequest * r )
{
	if( !script_basicAuth.IsEmpty() )
		basicAuth = script_basicAuth;

	int pos = basicAuth.Find(_T(':'));

	// set the basic auth valuse if we are doing authentication
	if( pos > -1 )
	{
		char auth[1024];
		int authLen = 1024;
		if( Base64Encode( (LPBYTE)(LPCSTR)CT2A(basicAuth), basicAuth.GetLength(), auth, &authLen, ATL_BASE64_FLAG_NOCRLF ) )
		{
			auth[authLen] = 0;
			CString header = CString("Authorization: Basic ") + CString(auth) + _T("\r\n");
			HttpAddRequestHeaders( hRequest, header, header.GetLength(), HTTP_ADDREQ_FLAG_ADD | HTTP_ADDREQ_FLAG_REPLACE );
		}
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWinInetEvents::AfterHttpOpenRequest(HINTERNET hRequest, void * context)
{
	ATLTRACE(_T("[Pagetest] - *** (0x%08X) 0x%p - AfterHttpOpenRequest\n"), GetCurrentThreadId(), hRequest);

	__try
	{
		if( context )
		{
			CWinInetRequest * r = (CWinInetRequest *)context;
			r->hRequest = hRequest;

			// add it to our map of requests
			EnterCriticalSection(&cs);
			winInetRequests.SetAt(hRequest, r);
			winInetRequestList.AddHead(r);
			LeaveCriticalSection(&cs);

			AddAuthHeader( hRequest, r );
      OverrideHost(r);

			r->created = r->start;
			AddEvent(r);

			// if it failed, flag it right away
			if( hRequest )
			{
				r->start = 0;
			}
			else
			{
				DWORD error = GetLastError();
				ATLTRACE(_T("[Pagetest] - *** AfterHttpOpenRequest Error : 0x%X\n"), error);

				r->start = r->created;

				if( error < 400 )
					error += 90000;
				r->docID = currentDoc;
				r->result = error;
				r->valid = true;
				r->Done();
			}
			
			// update the activity time
			if( active && !r->ignore )
				QueryPerfCounter(lastActivity);
		}
	}__except(1)
	{
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWinInetEvents::OnHttpSendRequest(HINTERNET hRequest, CString &headers, LPVOID lpOptional, DWORD dwOptionalLength)
{

	// update the activity time
	if( active )
	{
		EnterCriticalSection(&cs);
		CWinInetRequest * r = NULL;
		winInetRequests.Lookup(hRequest, r);
		LeaveCriticalSection(&cs);

    if( r )
    {
      ATLTRACE(_T("[Pagetest] - *** (0x%08X) 0x%p - OnHttpSendRequest: %s%s\n"), GetCurrentThreadId(), hRequest, r->host, r->object);
    }
    else
    {
      ATLTRACE(_T("[Pagetest] - *** (0x%08X) 0x%p - OnHttpSendRequest\n"), GetCurrentThreadId(), hRequest);
    }

    if( headers.GetLength() )
    {
      ATLTRACE(_T("[Pagetest] - Headers:\n%s"), (LPCTSTR)headers);
    }

		// modify the user agent string if it was passed as a custom header (IE8)
		if( !userAgent.IsEmpty() )
		{
			CString lcase = headers;
			lcase.MakeLower();
			int offset = lcase.Find(_T("user-agent"));
			if( offset >= 0 )
			{
				offset = lcase.Find(_T(":"), offset);
				if( offset >= 0 )
				{
					int end = lcase.Find(_T('\n'), offset);
					if( end >= -1 )
					{
						// insert it in the middle of the string
						headers = headers.Left(offset + 2) + userAgent + headers.Mid(end);
					}
				}
			}
		}
		else if( script_modifyUserAgent && !keepua )
		{
			CString agent;
			agent.Format(_T("; PTST 2.%d"), build);
			if( headers.Find(agent) == -1 )
			{
				CString lcase = headers;
				lcase.MakeLower();
				int offset = lcase.Find(_T("user-agent"));
				if( offset >= 0 )
				{
					int end = lcase.Find(_T('\n'), offset);
					if( end >= -1 )
					{
						// now scan backwards for the end parenthesis
						CString left = lcase.Left(end);
						int end2 = left.ReverseFind(_T(')'));
						if( end2 >= 0 )
							end = end2;
							
						// insert it in the middle of the string
						headers = headers.Left(end) + agent + headers.Mid(end);
					}
				}
			}
		}

    // add any custom headers
    POSITION pos = headersAdd.GetHeadPosition();
    while(pos)
    {
      CFilteredHeader header = headersAdd.GetNext(pos);
      CString h = header.header;
      if( h.GetLength() && RegexMatch(r->host, header.filter) )
      {
        h = h + _T("\r\n");
        HttpAddRequestHeaders( hRequest, h, h.GetLength(), HTTP_ADDREQ_FLAG_ADD );
      }
    }

    // override any headers specified
    pos = headersSet.GetHeadPosition();
    while(pos)
    {
      CFilteredHeader header = headersSet.GetNext(pos);
      CString h = header.header;
      if( h.GetLength() && RegexMatch(r->host, header.filter) )
      {
        h = h + _T("\r\n");
        HttpAddRequestHeaders( hRequest, h, h.GetLength(), HTTP_ADDREQ_FLAG_ADD | HTTP_ADDREQ_FLAG_REPLACE );

        // remove the header if it is passed in in the current headers
        int i = h.Find(_T(':'));
        if( i > 0 )
        {
          CString key = h.Left(i).Trim();
          do
          {
            i = headers.Find(key);
            if( i >= 0 )
            {
              int e = headers.Find(_T('\n'), i);
              if( e > i)
                headers = headers.Left(i) + headers.Mid(e + 1);
              else
                headers = headers.Left(i);
            }
          }while(i >= 0);
        }
      }
    }

    OverrideHost(r);

		// tweak the SSL options if we are ignoring cert errors
		if( r && r->secure && ignoreSSL )
		{
			DWORD flags = 0;
			DWORD len = sizeof(flags);
			if( InternetQueryOption(r->hRequest, INTERNET_OPTION_SECURITY_FLAGS, &flags, &len) )
			{
				flags |= SECURITY_FLAG_IGNORE_CERT_CN_INVALID | SECURITY_FLAG_IGNORE_CERT_DATE_INVALID | SECURITY_FLAG_IGNORE_REDIRECT_TO_HTTP |
						SECURITY_FLAG_IGNORE_REDIRECT_TO_HTTPS | SECURITY_FLAG_IGNORE_REVOCATION | SECURITY_FLAG_IGNORE_UNKNOWN_CA | 
						SECURITY_FLAG_IGNORE_WRONG_USAGE;
				InternetSetOption(r->hRequest, INTERNET_OPTION_SECURITY_FLAGS, &flags, len);
			}
		}
		
		if( r && !r->ignore )
			QueryPerfCounter(lastActivity);
	}

	ATLTRACE(_T("[Pagetest] - *** (0x%08X) 0x%p - OnHttpSendRequest - complete\n"), GetCurrentThreadId(), hRequest);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWinInetEvents::BeforeInternetConnect(HINTERNET hInternet, CString &server)
{
  // see if we need to override the server
  POSITION pos = overrideHostUrls.GetHeadPosition();
  while( pos )
  {
    CHostOverride target = overrideHostUrls.GetNext(pos);
    if( !target.originalHost.CompareNoCase(server) || !target.originalHost.Compare(_T("*")) )
      server = target.newHost;
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWinInetEvents::OnInternetConnect(HINTERNET hConnect, CString &server, HINTERNET hInternet)
{
	// for each connection, keep track of the server associated with it
	ATLTRACE(_T("[Pagetest] - *** 0x%p - OnInternetConnect - 0x%p - %s\n"), hConnect, hInternet, (LPCTSTR)server);
	winInetConnections.SetAt(hConnect, server);

	bool async = true;
	if( winInetAsync.Lookup(hInternet, async) )
		winInetAsync.SetAt(hConnect, async);
}

/*-----------------------------------------------------------------------------
	We have an outgoing socket connect, get the IP info into the request
-----------------------------------------------------------------------------*/
void CWinInetEvents::linkSocketRequestConnect(CSocketConnect * c)
{
	EnterCriticalSection(&cs);
	CWinInetRequest * w = NULL;
	winInetThreadConnects.Lookup(GetCurrentThreadId(), w);
	if( w )
	{
		// copy over the IP information
		w->peer.sin_addr.S_un.S_un_b.s_b1 = c->addr[0];
		w->peer.sin_addr.S_un.S_un_b.s_b2 = c->addr[1];
		w->peer.sin_addr.S_un.S_un_b.s_b3 = c->addr[2];
		w->peer.sin_addr.S_un.S_un_b.s_b4 = c->addr[3];
		w->peer.sin_port = c->port;
		w->socketId = c->socketId;
	}
	LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
	We have an outgoing send, link the underlying socket event to this request
-----------------------------------------------------------------------------*/
void CWinInetEvents::linkSocketRequestSend(CSocketRequest * r)
{
  // keep track of the request that is actively sending on this thread
	EnterCriticalSection(&cs);
	winInetThreadSends.SetAt(GetCurrentThreadId(), r);
	LeaveCriticalSection(&cs);
  ATLTRACE(_T("[Pagetest] CWinInetEvents::linkSocketRequestSend - stored request mapping on thread %d\n"), GetCurrentThreadId());
}

/*-----------------------------------------------------------------------------
	We have received some data for the given request
-----------------------------------------------------------------------------*/
void CWinInetEvents::OnDataReceived(HINTERNET hFile, LPVOID buff, DWORD len)
{
	ATLTRACE(_T("[Pagetest] - 0x%08X - CWinInetEvents::OnDataReceived - %d bytes\n"), hFile, len);

	if( active && buff && len )
	{
		EnterCriticalSection(&cs);
		CWinInetRequest * w = NULL;
		winInetRequests.Lookup(hFile, w);
		LeaveCriticalSection(&cs);

		if( w )
		{
			w->valid = true;

			if( !w->fromNet ) 
			{
				// Attempt to collect data about the resource from the cache
				TCHAR* buff = NULL;
				DWORD len = 0;
				DWORD index = 0;
				if( w->outHeaders.IsEmpty() )
				{
					if( !HttpQueryInfo(w->hRequest, HTTP_QUERY_FLAG_REQUEST_HEADERS | HTTP_QUERY_RAW_HEADERS_CRLF , buff, &len, &index) ) 
					{
						if (ERROR_INSUFFICIENT_BUFFER == GetLastError()) 
						{
							buff = static_cast<TCHAR*>(malloc(len));
							memset(buff, 0, len);
							if( HttpQueryInfo(w->hRequest, HTTP_QUERY_FLAG_REQUEST_HEADERS | HTTP_QUERY_RAW_HEADERS_CRLF , buff, &len, &index) ) 
							{
								w->outHeaders = buff;
							}
							free(buff);
							buff = NULL;
						}
					}
				}
				len = 0;
				index = 0;
				if( w->cachedInHeaders.IsEmpty() )
				{
					if( !HttpQueryInfo(w->hRequest, HTTP_QUERY_RAW_HEADERS_CRLF , buff, &len, &index) ) 
					{
						if (ERROR_INSUFFICIENT_BUFFER == GetLastError()) 
						{
							buff = static_cast<TCHAR*>(malloc(len));
							memset(buff, 0, len);
							if( HttpQueryInfo(w->hRequest, HTTP_QUERY_RAW_HEADERS_CRLF , buff, &len, &index) ) 
							{
								w->cachedInHeaders = buff;
							}
							free(buff);
							buff = NULL;
						}
					}
				}
				if (w->result == -1)
				{
					DWORD code;
					len = sizeof(code);
					index = 0;
					if( HttpQueryInfo(w->hRequest, HTTP_QUERY_FLAG_NUMBER | HTTP_QUERY_STATUS_CODE , &code, &len, &index) )
						w->result = code;
				}
				w->Done(true);
			}

			// we only care for certain content types
			if( w->response.contentType.IsEmpty() )
			{
				TCHAR type[1024];
				DWORD typeLen = _countof(type);
				DWORD index = 0;
				if( HttpQueryInfo(hFile, HTTP_QUERY_CONTENT_TYPE, type, &typeLen, &index) )
					w->response.contentType = type;
			}

			CString mime(w->response.contentType);
			mime.MakeLower();
			if (mime.Find(_T("video/")) == -1) {
				// add the content to our internal buffer
				DWORD oldLen = w->bodyLen;
				w->bodyLen += len;
				DWORD copy = w->bodyLen - oldLen;
				if( copy )
				{
					w->body = (LPBYTE)realloc(w->body, w->bodyLen + 1);
					memcpy( &w->body[oldLen], buff, copy );
					w->body[w->bodyLen] = 0;	// NULL terminate it in case we're dealing with string data as a convenience
				}
			}
		}
	}
}

/*-----------------------------------------------------------------------------
	Take a crack at modifying custom headers
-----------------------------------------------------------------------------*/
void CWinInetEvents::OnHttpAddRequestHeaders(HINTERNET hRequest, CString &headers, DWORD &dwModifiers)
{
	if( active )
	{
		if( !userAgent.IsEmpty() )
		{
			CString lcase = headers;
			lcase.MakeLower();
			int offset = lcase.Find(_T("user-agent"));
			if( offset >= 0 )
			{
				offset = lcase.Find(_T(":"), offset);
				if( offset >= 0 )
				{
					int end = lcase.Find(_T('\n'), offset);
					if( end >= -1 )
					{
						// insert it in the middle of the string
						headers = headers.Left(offset + 2) + userAgent + headers.Mid(end);
					}
				}
			}
		}
		else if( script_modifyUserAgent && !keepua )
		{
			// modify the user agent string if it was passed as a custom header (IE8)
			CString agent;
			agent.Format(_T("; PTST 2.%d"), build);
			if( headers.Find(agent) == -1 )
			{
				CString lcase = headers;
				lcase.MakeLower();
				int offset = lcase.Find(_T("user-agent"));
				if( offset >= 0 )
				{
					int end = lcase.Find(_T('\n'), offset);
					if( end >= -1 )
					{
						// now scan backwards for the end parenthesis
						CString left = lcase.Left(end);
						int end2 = left.ReverseFind(_T(')'));
						if( end2 >= 0 )
							end = end2;
							
						// insert it in the middle of the string
						headers = headers.Left(end) + agent + headers.Mid(end);
					}
				}
			}
		}
	}
}

/*-----------------------------------------------------------------------------
	Override the host header
-----------------------------------------------------------------------------*/
void CWinInetEvents::OverrideHost(CWinInetRequest * r)
{
  if( hostOverride.GetCount() && r && r->host.GetLength() )
  {
    ATLTRACE(_T("[Pagetest] - Checking for host override for %s\n"), (LPCTSTR)r->host);
    POSITION pos = hostOverride.GetHeadPosition();
    while(pos)
    {
      CHostOverride hostPair = hostOverride.GetNext(pos);
      if( !r->host.CompareNoCase(hostPair.originalHost) || !hostPair.originalHost.Compare(_T("*")) )
      {
        ATLTRACE(_T("[Pagetest] - Overriding host %s to %s\n"), (LPCTSTR)r->host, (LPCTSTR)hostPair.newHost);
        CString header = CString("Host: ") + hostPair.newHost + _T("\r\n");
        HttpAddRequestHeaders( r->hRequest, header, header.GetLength(), HTTP_ADDREQ_FLAG_ADD | HTTP_ADDREQ_FLAG_REPLACE );
        header = CString("x-Host: ") + r->host + _T("\r\n");
        HttpAddRequestHeaders( r->hRequest, header, header.GetLength(), HTTP_ADDREQ_FLAG_ADD | HTTP_ADDREQ_FLAG_REPLACE );
        break;
      }
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CWinInetEvents::RegexMatch(CString str, CString regex) {
  bool matched = false;

  if (str.GetLength()) {
    if (!regex.GetLength() || !regex.Compare(_T("*")) || !str.CompareNoCase(regex)) {
      matched = true;
    } else if (regex.GetLength()) {
        std::tr1::regex match_regex(CT2A(regex), std::tr1::regex_constants::icase | std::tr1::regex_constants::ECMAScript);
        matched = std::tr1::regex_match((LPCSTR)CT2A(str), match_regex);
    }
  }

  return matched;
}