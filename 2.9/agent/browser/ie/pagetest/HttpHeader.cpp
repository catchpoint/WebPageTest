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
#include ".\httpheader.h"
#include "zlib/zlib.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CHttpHeader::CHttpHeader(void):
	code(-1)
	,len(0)
	,buff(NULL)
{
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CHttpHeader::~CHttpHeader(void)
{
	Reset();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CHttpHeader::AddData(DWORD inLen, LPBYTE inBuff)
{
	// only keep 10k (to grab the header)
	if( len < 10240 )
	{
		DWORD oldLen = len;
		len = min(10240, len + inLen);
		DWORD copy = len - oldLen;
		if( copy )
		{
			buff = (LPBYTE)realloc(buff, len + 1);
			memcpy( &buff[oldLen], inBuff, copy );
			buff[len] = 0;	// NULL terminate it for convenience
		}
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CHttpHeader::Process(void)
{
	Reset(false);
	
	// crack the header apart
	CrackHeader();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CHttpHeader::CrackHeader()
{
	if( len > 5 && buff )
	{
		// make sure it starts out as GET POST HEAD or HTTP
		if( !memcmp(buff, "GET", 3) || 
			!memcmp(buff, "POST", 4) ||
			!memcmp(buff, "HEAD", 4) ||
			!memcmp(buff, "HTTP", 4) )
		{
			// find the end of the header and split it off
			LPBYTE end = (LPBYTE)strstr( (LPCSTR)buff, "\r\n\r\n" );
			if( end )
			{
				end += 4;
				headerLength = (DWORD)(end - buff);
				if( headerLength )
				{
					// copy the header
					LPBYTE tmp = (LPBYTE)malloc(headerLength + 1);
					if( tmp )
					{
						memcpy( tmp, buff, headerLength );
						tmp[headerLength] = 0;
						header = (LPCSTR)tmp;
						free(tmp);
					}
				}
			}
			else
			{
				header = buff;
				headerLength = 0;
			}
		
			if( !header.IsEmpty() )
			{
				// Parse the first line for the result
				int pos = 0;
				CStringA line = header.Tokenize("\r\n", pos).Trim();
				if( line.GetLength() )
				{
					// we only care about inbound (HTTP) responses
					int pos2 = 0;
					CStringA action = line.Tokenize(" /",pos2);
					if( action == "HTTP" )
					{
						pos2 = 0;
						line.Tokenize(" ", pos2);
						CStringA res = line.Tokenize(" ", pos2);
						code = atol((LPCSTR)res);
					}
				}
			}
		}
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CHttpHeader::Reset(bool eraseMemory)
{
	header.Empty();
	code = -1;
	headerLength = 0;

	// delete any memory chunks we have accumulated
	if( eraseMemory && buff )
	{
		free(buff);
		buff = NULL;
		len = 0;
	}
}
