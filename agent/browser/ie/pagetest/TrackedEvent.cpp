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

#include "stdafx.h"
#include "TrackedEvent.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CSocketRequest::Done(void)
{
	CTrackedEvent::Done();  
	
	// attempt to crack the headers
	if( in && in < 10240 )
	{
		// only do the request once
		if( !request.len )
			request.Process();

		response.Process();
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWinInetRequest::Done(bool updateFirstByte)
{ 
	CTrackedEvent::Done();

	// update the start time if it hadn't been set yet
	if( !start )
	{
		if( dnsStart )
			start = dnsStart;
		else if( socketConnect )
			start = socketConnect;
		else if( requestSent )
			start = requestSent;
	}

	// update the calculated times
	if( !firstByte && requestSent && updateFirstByte )
	{
		firstByte = end;
		tmRequest = firstByte <= requestSent ? 0 : (DWORD)((firstByte - requestSent) / msFreq);
	}

	// handle timings for error cases
	if( firstByte )
		tmDownload = end <= firstByte ? 0 : (DWORD)((end - firstByte) / msFreq);

	tmLoad = end <= start ? 0 : (DWORD)((end - start) / msFreq);
}

/*-----------------------------------------------------------------------------
	Parse the response headers and do any other post-processing we need
-----------------------------------------------------------------------------*/
void CWinInetRequest::Process(void)
{
	__int64 freq;
	QueryPerfFrequency(freq);

	if( fromNet )
	{
		// re-calculate some of the ms times
		if( socketConnected )
		{
			tmSocket = socketConnected <= socketConnect ? 0 : (DWORD)((socketConnected - socketConnect) / msFreq);
			if( secure && requestSent )
				tmSSL = requestSent <= socketConnected ? 0 : (DWORD)((requestSent - socketConnected) / msFreq);
		}
		if( dnsStart && dnsEnd )
			tmDNS = dnsEnd <= dnsStart ? 0 :  (DWORD)((dnsEnd - dnsStart) / msFreq);
		
		if( linkedRequest )
		{
			CSocketRequest * r = (CSocketRequest *)linkedRequest;

			// copy the ignore setting over
			r->ignore = ignore;
			
			// in case we couldn't decode the winsock native headers, feed it wininet headers (like for SSL)
			r->response.Process();
			if( r->response.len > 4 && r->response.buff && memcmp(r->response.buff, "HTTP", 4))
			{
				r->request.Reset();
				r->request.AddData(outHeaders.GetLength(), (LPBYTE)(LPCSTR)CT2A(outHeaders));

				r->response.Reset();
				r->response.AddData(inHeaders.GetLength(), (LPBYTE)(LPCSTR)CT2A(inHeaders));
			}
			
			r->request.Process();
			r->response.Process();
			r->tmFirstByte = r->firstByte < r->start ? 0 : ((double)(r->firstByte - r->start)) / (double)freq;
			
			if( r->response.code != -1 && r->response.code != 100 )
				result = r->response.code;
				
			// fix the inbound headers which are not always accurate from WinInet
			if( !r->response.header.IsEmpty() && r->response.code != 100 )
				inHeaders = r->response.header;
				
			// use the bytes from the socket
			in = r->in;
			out = r->out;
    }
  }

	if( !result && !closed )
		result = 9999;
	
	// crack the response headers
	CrackHeaders();
	
	// decompress the body (if necessary)
	Decompress();
}

/*-----------------------------------------------------------------------------
	Crack the headers for somee fields we care about
-----------------------------------------------------------------------------*/
void CWinInetRequest::CrackHeaders(void)
{
	int headerPos = 0;
	
	// crack the request headers
	headerPos = 0;
	CString line = outHeaders.Tokenize(_T("\r\n"), headerPos).Trim();
	while( headerPos >= 0 )
	{
		int separator = line.Find(_T(':'));
		if( separator > 0 )
		{
			CString tag = line.Left(separator).Trim();
			CString value = line.Mid(separator + 1).Trim();
			
			if( !tag.CompareNoCase(_T("cookie")) )
			{
				request.cookie = value;
				request.cookieSize = value.GetLength();
				int p = 0;
				request.cookieCount = 0;
				while( value.Tokenize(_T(";"),p).GetLength() > 0 )
					request.cookieCount++;
			}
		}
		
		// on to the next line
		line = outHeaders.Tokenize(_T("\r\n"), headerPos).Trim();
	}
	
	// crack the response headers
	int lineCount = 0;
	headerPos = 0;
	line = inHeaders.Tokenize(_T("\r\n"), headerPos).Trim();
	while( headerPos >= 0 )
	{
		// pull the HTTP version out of the header
		if( !lineCount )
		{
			int verPos = line.Find(_T("HTTP/"));
			if( verPos >= 0 )
			{
				CString verStr = line.Mid(verPos + 5);
				response.ver = _tstof((LPCTSTR)verStr);
			}
		}

		int separator = line.Find(_T(':'));
		if( separator > 0 )
		{
			CString tag = line.Left(separator).Trim();
			CString value = line.Mid(separator + 1).Trim();
			
			if( !tag.CompareNoCase(_T("expires")) )
				response.expires = value;
			else if( !tag.CompareNoCase(_T("cache-control")) )
				response.cacheControl = value;
			else if( !tag.CompareNoCase(_T("content-type")) )
			{
				// if there is a semicolon, just take the first part
				int p = 0;
				response.contentType = value.Tokenize(_T(";"),p).Trim();
			}
			else if( !tag.CompareNoCase(_T("content-encoding")) )
				response.contentEncoding = value;
			else if( !tag.CompareNoCase(_T("connection")) )
				response.connection = value;
			else if( !tag.CompareNoCase(_T("pragma")) )
				response.pragma = value;
			else if( !tag.CompareNoCase(_T("ETag")) )
				response.etag = value;
			else if( !tag.CompareNoCase(_T("Date")) )
				response.date = value;
			else if( !tag.CompareNoCase(_T("Age")) )
				response.age = value;
		}
		
		// on to the next line
		lineCount++;
		line = inHeaders.Tokenize(_T("\r\n"), headerPos).Trim();
	}
}

/*-----------------------------------------------------------------------------
	Decompress the body
-----------------------------------------------------------------------------*/
void CWinInetRequest::Decompress(void)
{
	CString enc = response.contentEncoding;
	enc.MakeLower();
	if( body && enc.Find(_T("gzip")) >= 0 )
	{
		int err;
		
		DWORD len = bodyLen * 10;
		LPBYTE buff = (LPBYTE)malloc(len);
		if( buff )
		{
			z_stream d_stream;
			memset( &d_stream, 0, sizeof(d_stream) );
			d_stream.next_in  = body;
			d_stream.avail_in = bodyLen;

			err = inflateInit2(&d_stream, MAX_WBITS + 16);
			if( err == Z_OK )
			{
				d_stream.next_out = buff;
				d_stream.avail_out = len;
				while( ((err = inflate(&d_stream, Z_SYNC_FLUSH)) == Z_OK) && d_stream.avail_in )
				{
					len *= 2;
					buff = (LPBYTE)realloc(buff, len);
					if( !buff )
						break;
						
					d_stream.next_out = buff + d_stream.total_out;
					d_stream.avail_out = len - d_stream.total_out;
				}
				
				if(d_stream.total_out) 
				{
					bodyLen = d_stream.total_out;
					body = (LPBYTE)realloc(body, bodyLen + 1);
					if( body )
					{
						// NULL-terminate it for convienience
						memcpy(body, buff, bodyLen);
						body[bodyLen] = 0;
					}
				}
				
				inflateEnd(&d_stream);
			}
			
			free(buff);
		}
	}
}


/*-----------------------------------------------------------------------------
	Retrieve a specific header field
-----------------------------------------------------------------------------*/
CString CWinInetRequest::GetResponseHeader(CString field) {
  CString value;
	int headerPos = 0;
	CString line = inHeaders.Tokenize(_T("\r\n"), headerPos).Trim();
	while (value.IsEmpty() && headerPos >= 0) {
		int separator = line.Find(_T(':'));
    if (separator > 0){
			CString tag = line.Left(separator).Trim();
      if (!tag.CompareNoCase(field))
			  value = line.Mid(separator + 1).Trim();
    }
		line = inHeaders.Tokenize(_T("\r\n"), headerPos).Trim();
  }
  return value;
}