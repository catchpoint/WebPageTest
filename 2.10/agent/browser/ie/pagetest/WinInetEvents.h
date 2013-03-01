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

#include "socketevents.h"

class CWinInetEvents:
	public CSocketEvents
{
public:
	CWinInetEvents(void);
	virtual ~CWinInetEvents(void);
	virtual void Reset(void);
	virtual void BeforeInternetOpen(CString &agent);
	virtual void OnInternetOpen(HINTERNET hInternet, CString & agent, DWORD accessType, CString & proxy, CString & proxyBypass, DWORD flags);
	virtual void OnInternetCloseHandle(HINTERNET hInternet);
	virtual void OnInternetStatusCallback(HINTERNET hInternet, DWORD_PTR dwContext, DWORD dwInternetStatus, LPVOID lpvStatusInformation, DWORD dwStatusInformationLength);
	virtual void * BeforeHttpOpenRequest(HINTERNET hConnect, CString &verb, CString &object, CString &version, CString &referrer, CString &accept, DWORD &dwFlags, DWORD_PTR dwContext, bool &block);
	virtual void AfterHttpOpenRequest(HINTERNET hRequest, void * context);
	virtual void OnHttpSendRequest(HINTERNET hRequest, CString &headers, LPVOID lpOptional, DWORD dwOptionalLength);
  virtual void BeforeInternetConnect(HINTERNET hInternet, CString &server);
	virtual void OnInternetConnect(HINTERNET hConnect, CString &server, HINTERNET hInternet);
	virtual void linkSocketRequestConnect(CSocketConnect * c);
	virtual void linkSocketRequestSend(CSocketRequest * r);
	virtual void OnDataReceived(HINTERNET hFile, LPVOID buff, DWORD len);
	virtual void OnHttpAddRequestHeaders(HINTERNET hRequest, CString &headers, DWORD &dwModifiers);
	
protected:
	CAtlMap<HINTERNET, CString>	winInetConnections;
	CAtlMap<HINTERNET, bool>	winInetAsync;
	CAtlMap<DWORD, CWinInetRequest *>	winInetThreadConnects;
	CAtlMap<DWORD, CSocketRequest *>	winInetThreadSends;
	bool	forceDone;
	void AddAuthHeader(HINTERNET hRequest, CWinInetRequest * r );
  void OverrideHost(CWinInetRequest * r);
  bool RegexMatch(CString str, CString regex);
};
