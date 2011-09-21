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

/******************************************************************************
*******************************************************************************
**																			 **
**								Function Prototypes							 **
**																			 **
*******************************************************************************
******************************************************************************/

typedef HINTERNET(__stdcall * LPINTERNETOPENW)(LPCWSTR lpszAgent,DWORD dwAccessType,LPCWSTR lpszProxy,LPCWSTR lpszProxyBypass,DWORD dwFlags);
typedef HINTERNET(__stdcall * LPINTERNETOPENA)(LPCSTR lpszAgent,DWORD dwAccessType,LPCSTR lpszProxy,LPCSTR lpszProxyBypass,DWORD dwFlags);
typedef BOOL(__stdcall * LPINTERNETCLOSEHANDLE)(HINTERNET hInternet);
typedef INTERNET_STATUS_CALLBACK(__stdcall * LPINTERNETSETSTATUSCALLBACK)(HINTERNET hInternet, INTERNET_STATUS_CALLBACK lpfnInternetCallback);
typedef HINTERNET(__stdcall * LPINTERNETCONNECTW)(HINTERNET hInternet, LPCWSTR lpszServerName, INTERNET_PORT nServerPort, LPCWSTR lpszUserName, LPCWSTR lpszPassword, DWORD dwService, DWORD dwFlags, DWORD_PTR dwContext);
typedef HINTERNET(__stdcall * LPINTERNETCONNECTA)(HINTERNET hInternet, LPCSTR lpszServerName, INTERNET_PORT nServerPort, LPCSTR lpszUserName, LPCSTR lpszPassword, DWORD dwService, DWORD dwFlags, DWORD_PTR dwContext);
typedef HINTERNET(__stdcall * LPHTTPOPENREQUESTW)(HINTERNET hConnect, LPCWSTR lpszVerb, LPCWSTR lpszObjectName, LPCWSTR lpszVersion, LPCWSTR lpszReferrer, LPCWSTR FAR * lplpszAcceptTypes, DWORD dwFlags, DWORD_PTR dwContext);
typedef HINTERNET(__stdcall * LPHTTPOPENREQUESTA)(HINTERNET hConnect, LPCSTR lpszVerb, LPCSTR lpszObjectName, LPCSTR lpszVersion, LPCSTR lpszReferrer, LPCSTR FAR * lplpszAcceptTypes, DWORD dwFlags, DWORD_PTR dwContext);
typedef BOOL(__stdcall * LPHTTPSENDREQUESTW)(HINTERNET hRequest, LPCWSTR lpszHeaders, DWORD dwHeadersLength, LPVOID lpOptional, DWORD dwOptionalLength);
typedef BOOL(__stdcall * LPHTTPSENDREQUESTA)(HINTERNET hRequest, LPCSTR lpszHeaders, DWORD dwHeadersLength, LPVOID lpOptional, DWORD dwOptionalLength);
typedef HINTERNET(__stdcall * LPFTPOPENFILEW)(HINTERNET hConnect, LPCWSTR lpszFileName, DWORD dwAccess, DWORD dwFlags, DWORD_PTR dwContext);
typedef HINTERNET(__stdcall * LPFTPOPENFILEA)(HINTERNET hConnect, LPCSTR lpszFileName, DWORD dwAccess, DWORD dwFlags, DWORD_PTR dwContext);
typedef BOOL(__stdcall * LPINTERNETREADFILE)(HINTERNET hFile, LPVOID lpBuffer, DWORD dwNumberOfBytesToRead, LPDWORD lpdwNumberOfBytesRead);
typedef BOOL(__stdcall * LPINTERNETREADFILEEXW)(HINTERNET hFile, LPINTERNET_BUFFERSW lpBuffersOut, DWORD dwFlags, DWORD_PTR dwContext);
typedef BOOL(__stdcall * LPINTERNETREADFILEEXA)(HINTERNET hFile, LPINTERNET_BUFFERSA lpBuffersOut, DWORD dwFlags, DWORD_PTR dwContext);
typedef BOOL(__stdcall * LPHTTPADDREQUESTHEADERSW)(HINTERNET hRequest, LPCWSTR lpszHeaders, DWORD dwHeadersLength, DWORD dwModifiers);
typedef BOOL(__stdcall * LPHTTPADDREQUESTHEADERSA)(HINTERNET hRequest, LPCSTR lpszHeaders, DWORD dwHeadersLength, DWORD dwModifiers);

/******************************************************************************
*******************************************************************************
**																			 **
**								CWinInetHook Class							 **
**																			 **
*******************************************************************************
******************************************************************************/
void WinInetInstallHooks(void);
void WinInetRemoveHooks(void);
    
class CWinInetHook
{
public:
	CWinInetHook(void);
	virtual ~CWinInetHook(void);
	void InstallHooks(void);

	HINTERNET	InternetOpenW(LPCWSTR lpszAgent,DWORD dwAccessType,LPCWSTR lpszProxy,LPCWSTR lpszProxyBypass,DWORD dwFlags);
	HINTERNET	InternetOpenA(LPCSTR lpszAgent,DWORD dwAccessType,LPCSTR lpszProxy,LPCSTR lpszProxyBypass,DWORD dwFlags);
	BOOL		InternetCloseHandle(HINTERNET hInternet);
	INTERNET_STATUS_CALLBACK	InternetSetStatusCallback(HINTERNET hInternet, INTERNET_STATUS_CALLBACK lpfnInternetCallback);
	void		InternetStatusCallback(HINTERNET hInternet, DWORD_PTR dwContext, DWORD dwInternetStatus, LPVOID lpvStatusInformation, DWORD dwStatusInformationLength);
	HINTERNET	InternetConnectW(HINTERNET hInternet, LPCWSTR lpszServerName, INTERNET_PORT nServerPort, LPCWSTR lpszUserName, LPCWSTR lpszPassword, DWORD dwService, DWORD dwFlags, DWORD_PTR dwContext);
	HINTERNET	InternetConnectA(HINTERNET hInternet, LPCSTR lpszServerName, INTERNET_PORT nServerPort, LPCSTR lpszUserName, LPCSTR lpszPassword, DWORD dwService, DWORD dwFlags, DWORD_PTR dwContext);
	HINTERNET	HttpOpenRequestW(HINTERNET hConnect, LPCWSTR lpszVerb, LPCWSTR lpszObjectName, LPCWSTR lpszVersion, LPCWSTR lpszReferrer, LPCWSTR FAR * lplpszAcceptTypes, DWORD dwFlags, DWORD_PTR dwContext);
	HINTERNET	HttpOpenRequestA(HINTERNET hConnect, LPCSTR lpszVerb, LPCSTR lpszObjectName, LPCSTR lpszVersion, LPCSTR lpszReferrer, LPCSTR FAR * lplpszAcceptTypes, DWORD dwFlags, DWORD_PTR dwContext);
	BOOL		HttpSendRequestW(HINTERNET hRequest, LPCWSTR lpszHeaders, DWORD dwHeadersLength, LPVOID lpOptional, DWORD dwOptionalLength);
	BOOL		HttpSendRequestA(HINTERNET hRequest, LPCSTR lpszHeaders, DWORD dwHeadersLength, LPVOID lpOptional, DWORD dwOptionalLength);
	HINTERNET	FtpOpenFileW(HINTERNET hConnect, LPCWSTR lpszFileName, DWORD dwAccess, DWORD dwFlags, DWORD_PTR dwContext);
	HINTERNET	FtpOpenFileA(HINTERNET hConnect, LPCSTR lpszFileName, DWORD dwAccess, DWORD dwFlags, DWORD_PTR dwContext);
	BOOL		InternetReadFile(HINTERNET hFile, LPVOID lpBuffer, DWORD dwNumberOfBytesToRead, LPDWORD lpdwNumberOfBytesRead);
	BOOL		InternetReadFileExW(HINTERNET hFile, LPINTERNET_BUFFERSW lpBuffersOut, DWORD dwFlags, DWORD_PTR dwContext);
	BOOL		InternetReadFileExA(HINTERNET hFile, LPINTERNET_BUFFERSA lpBuffersOut, DWORD dwFlags, DWORD_PTR dwContext);
	BOOL		HttpAddRequestHeadersW(HINTERNET hRequest, LPCWSTR lpszHeaders, DWORD dwHeadersLength, DWORD dwModifiers);
	BOOL		HttpAddRequestHeadersA(HINTERNET hRequest, LPCSTR lpszHeaders, DWORD dwHeadersLength, DWORD dwModifiers);
	
private:
	CAtlMap<HINTERNET, INTERNET_STATUS_CALLBACK>	statusCallbacks;
	CAtlMap<HINTERNET, HINTERNET>					parents;
	CRITICAL_SECTION	cs;
	bool				hookReadA;	// do we need to hook the InternetReadFileExA?
  bool        hookOpenA;

	NCodeHookIA32	hook;

	LPINTERNETOPENW				_InternetOpenW;
	LPINTERNETOPENA				_InternetOpenA;
	LPINTERNETCLOSEHANDLE		_InternetCloseHandle;
	LPINTERNETSETSTATUSCALLBACK	_InternetSetStatusCallback;
	LPINTERNETCONNECTW			_InternetConnectW;
	LPINTERNETCONNECTA			_InternetConnectA;
	LPHTTPOPENREQUESTW			_HttpOpenRequestW;
	LPHTTPOPENREQUESTA			_HttpOpenRequestA;
	LPHTTPSENDREQUESTW			_HttpSendRequestW;
	LPHTTPSENDREQUESTA			_HttpSendRequestA;
	LPFTPOPENFILEW				_FtpOpenFileW;
	LPFTPOPENFILEA				_FtpOpenFileA;
	LPINTERNETREADFILE			_InternetReadFile;
	LPINTERNETREADFILEEXW		_InternetReadFileExW;
	LPINTERNETREADFILEEXA		_InternetReadFileExA;
	LPHTTPADDREQUESTHEADERSW	_HttpAddRequestHeadersW;
	LPHTTPADDREQUESTHEADERSA	_HttpAddRequestHeadersA;
};
