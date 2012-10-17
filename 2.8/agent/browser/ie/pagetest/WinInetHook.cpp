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
#include "WinInetHook.h"
#include "WatchDlg.h"

static CWinInetHook * pHook = NULL;

void WinInetInstallHooks(void)
{
	if( !pHook )
		pHook = new CWinInetHook();
}

void WinInetRemoveHooks(void)
{
	if( pHook )
	{
		delete pHook;
		pHook = NULL;
	}
}


/******************************************************************************
*******************************************************************************
**																			 **
**								Stub Functions								 **
**																			 **
*******************************************************************************
******************************************************************************/

HINTERNET __stdcall InternetOpenW_Hook(LPCWSTR lpszAgent,DWORD dwAccessType,LPCWSTR lpszProxy,LPCWSTR lpszProxyBypass,DWORD dwFlags)
{
	HINTERNET ret = NULL;
	__try{
		if(pHook)
			ret = pHook->InternetOpenW(lpszAgent, dwAccessType, lpszProxy, lpszProxyBypass, dwFlags);
	}__except(1){}
	return ret;
}

HINTERNET __stdcall InternetOpenA_Hook(LPCSTR lpszAgent,DWORD dwAccessType,LPCSTR lpszProxy,LPCSTR lpszProxyBypass,DWORD dwFlags)
{
	HINTERNET ret = NULL;
	__try{
		if(pHook)
			ret = pHook->InternetOpenA(lpszAgent, dwAccessType, lpszProxy, lpszProxyBypass, dwFlags);
	}__except(1){}
	return ret;
}

BOOL __stdcall InternetCloseHandle_Hook(HINTERNET hInternet)
{
	BOOL ret = FALSE;
	__try{
		if(pHook)
			ret = pHook->InternetCloseHandle(hInternet);
	}__except(1){}
	return ret;
}

INTERNET_STATUS_CALLBACK __stdcall InternetSetStatusCallback_Hook(HINTERNET hInternet, INTERNET_STATUS_CALLBACK lpfnInternetCallback)
{
	INTERNET_STATUS_CALLBACK ret = NULL;
	__try{
		if(pHook)
			ret = pHook->InternetSetStatusCallback(hInternet, lpfnInternetCallback);
	}__except(1){}
	return ret;
}

HINTERNET __stdcall InternetConnectW_Hook(HINTERNET hInternet, LPCWSTR lpszServerName, INTERNET_PORT nServerPort, LPCWSTR lpszUserName, LPCWSTR lpszPassword, DWORD dwService, DWORD dwFlags, DWORD_PTR dwContext)
{
	HINTERNET ret = NULL;
	__try{
		if(pHook)
			ret = pHook->InternetConnectW(hInternet, lpszServerName, nServerPort, lpszUserName, lpszPassword, dwService, dwFlags, dwContext);
	}__except(1){}
	return ret;
}

HINTERNET __stdcall InternetConnectA_Hook(HINTERNET hInternet, LPCSTR lpszServerName, INTERNET_PORT nServerPort, LPCSTR lpszUserName, LPCSTR lpszPassword, DWORD dwService, DWORD dwFlags, DWORD_PTR dwContext)
{
	HINTERNET ret = NULL;
	__try{
		if(pHook)
			ret = pHook->InternetConnectA(hInternet, lpszServerName, nServerPort, lpszUserName, lpszPassword, dwService, dwFlags, dwContext);
	}__except(1){}
	return ret;
}

HINTERNET __stdcall HttpOpenRequestW_Hook(HINTERNET hConnect, LPCWSTR lpszVerb, LPCWSTR lpszObjectName, LPCWSTR lpszVersion, LPCWSTR lpszReferrer, LPCWSTR FAR * lplpszAcceptTypes, DWORD dwFlags, DWORD_PTR dwContext)
{
	HINTERNET ret = NULL;
	__try{
		if(pHook)
			ret = pHook->HttpOpenRequestW(hConnect, lpszVerb, lpszObjectName, lpszVersion, lpszReferrer, lplpszAcceptTypes, dwFlags, dwContext);
	}__except(1){}
	return ret;
}

HINTERNET __stdcall HttpOpenRequestA_Hook(HINTERNET hConnect, LPCSTR lpszVerb, LPCSTR lpszObjectName, LPCSTR lpszVersion, LPCSTR lpszReferrer, LPCSTR FAR * lplpszAcceptTypes, DWORD dwFlags, DWORD_PTR dwContext)
{
	HINTERNET ret = NULL;
	__try{
		if(pHook)
			ret = pHook->HttpOpenRequestA(hConnect, lpszVerb, lpszObjectName, lpszVersion, lpszReferrer, lplpszAcceptTypes, dwFlags, dwContext);
	}__except(1){}
	return ret;
}

BOOL __stdcall HttpSendRequestW_Hook(HINTERNET hRequest, LPCWSTR lpszHeaders, DWORD dwHeadersLength, LPVOID lpOptional, DWORD dwOptionalLength)
{
	BOOL ret = FALSE;
	__try{
		if(pHook)
			ret = pHook->HttpSendRequestW(hRequest, lpszHeaders, dwHeadersLength, lpOptional, dwOptionalLength);
	}__except(1){}
	return ret;
}

BOOL __stdcall HttpSendRequestA_Hook(HINTERNET hRequest, LPCSTR lpszHeaders, DWORD dwHeadersLength, LPVOID lpOptional, DWORD dwOptionalLength)
{
	BOOL ret = FALSE;
	__try{
		if(pHook)
			ret = pHook->HttpSendRequestA(hRequest, lpszHeaders, dwHeadersLength, lpOptional, dwOptionalLength);
	}__except(1){}
	return ret;
}

HINTERNET __stdcall FtpOpenFileW_Hook(HINTERNET hConnect, LPCWSTR lpszFileName, DWORD dwAccess, DWORD dwFlags, DWORD_PTR dwContext)
{
	HINTERNET ret = NULL;
	__try{
		if(pHook)
			ret = pHook->FtpOpenFileW(hConnect, lpszFileName, dwAccess, dwFlags, dwContext);
	}__except(1){}
	return ret;
}

HINTERNET __stdcall FtpOpenFileA_Hook(HINTERNET hConnect, LPCSTR lpszFileName, DWORD dwAccess, DWORD dwFlags, DWORD_PTR dwContext)
{
	HINTERNET ret = NULL;
	__try{
		if(pHook)
			ret = pHook->FtpOpenFileA(hConnect, lpszFileName, dwAccess, dwFlags, dwContext);
	}__except(1){}
	return ret;
}

BOOL __stdcall InternetReadFile_Hook(HINTERNET hFile, LPVOID lpBuffer, DWORD dwNumberOfBytesToRead, LPDWORD lpdwNumberOfBytesRead)
{
	BOOL ret = FALSE;
	__try{
		if(pHook)
			ret = pHook->InternetReadFile(hFile, lpBuffer, dwNumberOfBytesToRead, lpdwNumberOfBytesRead);
	}__except(1){}
	return ret;
}

BOOL __stdcall InternetReadFileExW_Hook(HINTERNET hFile, LPINTERNET_BUFFERSW lpBuffersOut, DWORD dwFlags, DWORD_PTR dwContext)
{
	BOOL ret = FALSE;
	__try{
		if(pHook)
			ret = pHook->InternetReadFileExW(hFile, lpBuffersOut, dwFlags, dwContext);
	}__except(1){}
	return ret;
}

BOOL __stdcall InternetReadFileExA_Hook(HINTERNET hFile, LPINTERNET_BUFFERSA lpBuffersOut, DWORD dwFlags, DWORD_PTR dwContext)
{
	BOOL ret = FALSE;
	__try{
		if(pHook)
			ret = pHook->InternetReadFileExA(hFile, lpBuffersOut, dwFlags, dwContext);
	}__except(1){}
	return ret;
}

BOOL __stdcall HttpAddRequestHeadersW_Hook(HINTERNET hRequest, LPCWSTR lpszHeaders, DWORD dwHeadersLength, DWORD dwModifiers)
{
	BOOL ret = FALSE;
	__try{
		if(pHook)
			ret = pHook->HttpAddRequestHeadersW(hRequest, lpszHeaders, dwHeadersLength, dwModifiers);
	}__except(1){}
	return ret;
}

BOOL __stdcall HttpAddRequestHeadersA_Hook(HINTERNET hRequest, LPCSTR lpszHeaders, DWORD dwHeadersLength, DWORD dwModifiers)
{
	BOOL ret = FALSE;
	__try{
		if(pHook)
			ret = pHook->HttpAddRequestHeadersA(hRequest, lpszHeaders, dwHeadersLength, dwModifiers);
	}__except(1){}
	return ret;
}


/******************************************************************************
*******************************************************************************
**																			 **
**								CWinInetHook Class							 **
**																			 **
*******************************************************************************
******************************************************************************/

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CWinInetHook::CWinInetHook(void):
	hookReadA(true)
  ,hookOpenA(true)
{
	InitializeCriticalSection(&cs);

	// initialize the hash tables
	statusCallbacks.InitHashTable(257);
	parents.InitHashTable(257);

	_InternetOpenW = hook.createHookByName("wininet.dll", "InternetOpenW", InternetOpenW_Hook);
	_InternetOpenA = hook.createHookByName("wininet.dll", "InternetOpenA", InternetOpenA_Hook);
	_InternetCloseHandle = hook.createHookByName("wininet.dll", "InternetCloseHandle", InternetCloseHandle_Hook);
	_InternetSetStatusCallback = hook.createHookByName("wininet.dll", "InternetSetStatusCallback", InternetSetStatusCallback_Hook);
	_InternetConnectW = hook.createHookByName("wininet.dll", "InternetConnectW", InternetConnectW_Hook);
	_InternetConnectA = hook.createHookByName("wininet.dll", "InternetConnectA", InternetConnectA_Hook);
	_HttpOpenRequestW = hook.createHookByName("wininet.dll", "HttpOpenRequestW", HttpOpenRequestW_Hook);
	_HttpOpenRequestA = hook.createHookByName("wininet.dll", "HttpOpenRequestA", HttpOpenRequestA_Hook);
	_HttpSendRequestW = hook.createHookByName("wininet.dll", "HttpSendRequestW", HttpSendRequestW_Hook);
	_HttpSendRequestA = hook.createHookByName("wininet.dll", "HttpSendRequestA", HttpSendRequestA_Hook);
	_FtpOpenFileW = hook.createHookByName("wininet.dll", "FtpOpenFileW", FtpOpenFileW_Hook);
	_FtpOpenFileA = hook.createHookByName("wininet.dll", "FtpOpenFileA", FtpOpenFileA_Hook);
	_InternetReadFile = hook.createHookByName("wininet.dll", "InternetReadFile", InternetReadFile_Hook);
	_InternetReadFileExW = hook.createHookByName("wininet.dll", "InternetReadFileExW", InternetReadFileExW_Hook);
	_InternetReadFileExA = hook.createHookByName("wininet.dll", "InternetReadFileExA", InternetReadFileExA_Hook);
	_HttpAddRequestHeadersW = hook.createHookByName("wininet.dll", "HttpAddRequestHeadersW", HttpAddRequestHeadersW_Hook);
	_HttpAddRequestHeadersA = hook.createHookByName("wininet.dll", "HttpAddRequestHeadersA", HttpAddRequestHeadersA_Hook);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CWinInetHook::~CWinInetHook(void)
{
	if( pHook == this )
		pHook = NULL;
		
	DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HINTERNET CWinInetHook::InternetOpenW(LPCWSTR lpszAgent,DWORD dwAccessType,LPCWSTR lpszProxy,LPCWSTR lpszProxyBypass,DWORD dwFlags)
{
	HINTERNET ret = NULL;

	CString agent(lpszAgent);
	if( dlg )
		dlg->BeforeInternetOpen(agent);
		
	if( _InternetOpenW )
		ret = _InternetOpenW((LPCWSTR)CT2W(agent), dwAccessType, lpszProxy, lpszProxyBypass, dwFlags);

	if( dlg )
	{
		CString proxy(lpszProxy);
		CString proxyBypass(lpszProxyBypass);
		
		dlg->OnInternetOpen(ret, agent, dwAccessType, proxy, proxyBypass, dwFlags);
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HINTERNET CWinInetHook::InternetOpenA(LPCSTR lpszAgent,DWORD dwAccessType,LPCSTR lpszProxy,LPCSTR lpszProxyBypass,DWORD dwFlags)
{
	HINTERNET ret = NULL;

	CString agent((LPCTSTR)CA2T(lpszAgent));
	if( dlg )
		dlg->BeforeInternetOpen(agent);
		
	if( _InternetOpenA )
		ret = _InternetOpenA((LPCSTR)CT2A(agent), dwAccessType, lpszProxy, lpszProxyBypass, dwFlags);

	if( dlg )
	{
		CString proxy((LPCTSTR)CA2T(lpszProxy));
		CString proxyBypass((LPCTSTR)CA2T(lpszProxyBypass));
		
		dlg->OnInternetOpen(ret, agent, dwAccessType, proxy, proxyBypass, dwFlags);
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL CWinInetHook::InternetCloseHandle(HINTERNET hInternet)
{
	BOOL ret = FALSE;

	if( dlg )
		dlg->OnInternetCloseHandle(hInternet);
		
	if( _InternetCloseHandle )
		ret = _InternetCloseHandle(hInternet);
		
	// remove any status callback mapping we have for the handle
	EnterCriticalSection(&cs);
	statusCallbacks.RemoveKey(hInternet);
	parents.RemoveKey(hInternet);
	LeaveCriticalSection(&cs);
	
	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CALLBACK InternetStatusCallback(HINTERNET hInternet, DWORD_PTR dwContext, DWORD dwInternetStatus, LPVOID lpvStatusInformation, DWORD dwStatusInformationLength)
{
	__try{
		if( pHook )
			pHook->InternetStatusCallback(hInternet, dwContext, dwInternetStatus, lpvStatusInformation, dwStatusInformationLength);
	}__except(1){}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
INTERNET_STATUS_CALLBACK CWinInetHook::InternetSetStatusCallback(HINTERNET hInternet, INTERNET_STATUS_CALLBACK lpfnInternetCallback)
{
	INTERNET_STATUS_CALLBACK ret = NULL;

	// keep track of where the callbacks go for each hInternet
	EnterCriticalSection(&cs);
	statusCallbacks.SetAt(hInternet, lpfnInternetCallback);
	LeaveCriticalSection(&cs);
	
	// redirect the status callbacks to ourselves
	if( _InternetSetStatusCallback )
		ret = _InternetSetStatusCallback( hInternet, ::InternetStatusCallback );
	
	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWinInetHook::InternetStatusCallback(HINTERNET hInternet, DWORD_PTR dwContext, DWORD dwInternetStatus, LPVOID lpvStatusInformation, DWORD dwStatusInformationLength)
{
	if( dlg )
		dlg->OnInternetStatusCallback(hInternet, dwContext, dwInternetStatus, lpvStatusInformation, dwStatusInformationLength);

	// get the original callback
	INTERNET_STATUS_CALLBACK cb = NULL;

	EnterCriticalSection(&cs);
	HINTERNET h = hInternet;
	while( !cb && h )
	{
		statusCallbacks.Lookup(h, cb);
		if( !cb )
		{
			HINTERNET parent = NULL;
			parents.Lookup(h, parent);
			h = parent;
		}
	}
	LeaveCriticalSection(&cs);
	
	if( cb )
		cb(hInternet, dwContext, dwInternetStatus, lpvStatusInformation, dwStatusInformationLength);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HINTERNET CWinInetHook::InternetConnectW(HINTERNET hInternet, LPCWSTR lpszServerName, INTERNET_PORT nServerPort, LPCWSTR lpszUserName, LPCWSTR lpszPassword, DWORD dwService, DWORD dwFlags, DWORD_PTR dwContext)
{
	HINTERNET ret = NULL;
	CString server((LPCTSTR)CW2T(lpszServerName));
  CString originalServer = server;

	// check to make sure the callback for the parent hInternet has already been hooked
	EnterCriticalSection(&cs);
	INTERNET_STATUS_CALLBACK cb = NULL;
	statusCallbacks.Lookup(hInternet, cb);
	if( !cb && _InternetSetStatusCallback )
	{
		cb = _InternetSetStatusCallback( hInternet, ::InternetStatusCallback );
		if( cb )
			statusCallbacks.SetAt(hInternet, cb);
	}
	LeaveCriticalSection(&cs);

  if( dlg )
    dlg->BeforeInternetConnect(hInternet, server);

	if( _InternetConnectW )
		ret = _InternetConnectW(hInternet, (LPCWSTR)server, nServerPort, lpszUserName, lpszPassword, dwService, dwFlags, dwContext);
		
	// add a mapping of the new handle back to the parent
	if( ret )
	{
		EnterCriticalSection(&cs);
		parents.SetAt(ret, hInternet);
		LeaveCriticalSection(&cs);
	}
	
	if( dlg && ret )
		dlg->OnInternetConnect(ret, originalServer, hInternet);

	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HINTERNET CWinInetHook::InternetConnectA(HINTERNET hInternet, LPCSTR lpszServerName, INTERNET_PORT nServerPort, LPCSTR lpszUserName, LPCSTR lpszPassword, DWORD dwService, DWORD dwFlags, DWORD_PTR dwContext)
{
	HINTERNET ret = NULL;
	CString server((LPCTSTR)CA2T(lpszServerName));
  CString originalServer = server;

  if( dlg )
    dlg->BeforeInternetConnect(hInternet, server);

	if( _InternetConnectA )
		ret = _InternetConnectA(hInternet, (LPCSTR)CT2A(server), nServerPort, lpszUserName, lpszPassword, dwService, dwFlags, dwContext);
		
	// add a mapping of the new handle back to the parent
	if( ret )
	{
		EnterCriticalSection(&cs);
		parents.SetAt(ret, hInternet);
		LeaveCriticalSection(&cs);
	}
	
	if( dlg && ret )
		dlg->OnInternetConnect(ret, originalServer, hInternet);

	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HINTERNET CWinInetHook::HttpOpenRequestW(HINTERNET hConnect, LPCWSTR lpszVerb, LPCWSTR lpszObjectName, LPCWSTR lpszVersion, LPCWSTR lpszReferrer, LPCWSTR FAR * lplpszAcceptTypes, DWORD dwFlags, DWORD_PTR dwContext)
{
	HINTERNET ret = NULL;
	void * dlgContext = NULL;
	bool block = false;

	hookOpenA = false;	// if we ever get the W version, DO NOT HOOK the A version or you will get duplicate requests

  CString object(lpszObjectName);
	if( dlg )
	{
		CString verb(lpszVerb);
		CString version(lpszVersion);
		CString referrer(lpszReferrer);
		CString accept;
		if(lplpszAcceptTypes)
			accept = *lplpszAcceptTypes;
		
		dlgContext = dlg->BeforeHttpOpenRequest(hConnect, verb, object, version, referrer, accept, dwFlags, dwContext, block);
	}
	
	if( block )
	{
		ret = NULL;
		SetLastError(ERROR_INTERNET_INVALID_URL);
	}
	else
	{	
		if( _HttpOpenRequestW )
			ret = _HttpOpenRequestW(hConnect, lpszVerb, (LPCWSTR)object, lpszVersion, lpszReferrer, lplpszAcceptTypes, dwFlags, dwContext);
			
		// add a mapping of the new handle back to the parent
		if( ret )
		{
			EnterCriticalSection(&cs);
			parents.SetAt(ret, hConnect);
			LeaveCriticalSection(&cs);
		}
		else
		{
			DWORD err = GetLastError();
			DWORD len = 0;
			if( lpszObjectName )
				len = lstrlenW(lpszObjectName);
			ATLTRACE(_T("[Pagetest] - *** HttpOpenRequestW Error: %d, Object Length = %d\n"), err, len);
		}
		
		// let the dialog know about the new handle
		if( dlg )
			dlg->AfterHttpOpenRequest(ret, dlgContext);
	}

	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HINTERNET CWinInetHook::HttpOpenRequestA(HINTERNET hConnect, LPCSTR lpszVerb, LPCSTR lpszObjectName, LPCSTR lpszVersion, LPCSTR lpszReferrer, LPCSTR FAR * lplpszAcceptTypes, DWORD dwFlags, DWORD_PTR dwContext)
{
	HINTERNET ret = NULL;
	void * dlgContext = NULL;
	bool block = false;
	
  CString object((LPCTSTR)CA2T(lpszObjectName));

  if( dlg && hookOpenA )
	{
		CString verb((LPCTSTR)CA2T(lpszVerb));
		CString version((LPCTSTR)CA2T(lpszVersion));
		CString referrer((LPCTSTR)CA2T(lpszReferrer));
		CString accept;
		if(lplpszAcceptTypes)
			accept = (LPCTSTR)CA2T(*lplpszAcceptTypes);
		
		dlgContext = dlg->BeforeHttpOpenRequest(hConnect, verb, object, version, referrer, accept, dwFlags, dwContext, block);
	}
	
	if( block )
	{
		ret = NULL;
		SetLastError(ERROR_INTERNET_INVALID_URL);
	}
	else
	{	
		if( _HttpOpenRequestA )
			ret = _HttpOpenRequestA(hConnect, lpszVerb, (LPCSTR)CT2A(object), lpszVersion, lpszReferrer, lplpszAcceptTypes, dwFlags, dwContext);
			
    if( hookOpenA )
    {
		  // add a mapping of the new handle back to the parent
		  if( ret )
		  {
			  EnterCriticalSection(&cs);
			  parents.SetAt(ret, hConnect);
			  LeaveCriticalSection(&cs);
		  }
		  else
		  {
			  DWORD err = GetLastError();
			  DWORD len = 0;
			  if( lpszObjectName )
				  len = lstrlenA(lpszObjectName);
			  ATLTRACE(_T("[Pagetest] - *** HttpOpenRequestA Error: %d, Object Length = %d\n"), err, len);
		  }
  		
		  // let the dialog know about the new handle
		  if( dlg )
			  dlg->AfterHttpOpenRequest(ret, dlgContext);
    }
	}

	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL CWinInetHook::HttpSendRequestW(HINTERNET hRequest, LPCWSTR lpszHeaders, DWORD dwHeadersLength, LPVOID lpOptional, DWORD dwOptionalLength)
{
	BOOL ret = FALSE;
	
	CString headers(lpszHeaders);
	if( dlg )
		dlg->OnHttpSendRequest(hRequest, headers, lpOptional, dwOptionalLength);

	if( _HttpSendRequestW )
		ret = _HttpSendRequestW(hRequest, (LPCWSTR)CT2W(headers), headers.GetLength(), lpOptional, dwOptionalLength);

	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL CWinInetHook::HttpSendRequestA(HINTERNET hRequest, LPCSTR lpszHeaders, DWORD dwHeadersLength, LPVOID lpOptional, DWORD dwOptionalLength)
{
	BOOL ret = FALSE;
	
	CString headers((LPCTSTR)CA2T(lpszHeaders));
	if( dlg )
		dlg->OnHttpSendRequest(hRequest, headers, lpOptional, dwOptionalLength);

	if( _HttpSendRequestA )
		ret = _HttpSendRequestA(hRequest, (LPCSTR)CT2A(headers), headers.GetLength(), lpOptional, dwOptionalLength);

	return ret;
}

/*-----------------------------------------------------------------------------
	Need to track all of the handles since we modify the callbacks
-----------------------------------------------------------------------------*/
HINTERNET CWinInetHook::FtpOpenFileW(HINTERNET hConnect, LPCWSTR lpszFileName, DWORD dwAccess, DWORD dwFlags, DWORD_PTR dwContext)
{
	HINTERNET ret = NULL;

	if( _FtpOpenFileW )
		ret = _FtpOpenFileW(hConnect, lpszFileName, dwAccess, dwFlags, dwContext);
		
	// add a mapping of the new handle back to the parent
	if( ret )
	{
		EnterCriticalSection(&cs);
		parents.SetAt(ret, hConnect);
		LeaveCriticalSection(&cs);
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
	Need to track all of the handles since we modify the callbacks
-----------------------------------------------------------------------------*/
HINTERNET CWinInetHook::FtpOpenFileA(HINTERNET hConnect, LPCSTR lpszFileName, DWORD dwAccess, DWORD dwFlags, DWORD_PTR dwContext)
{
	HINTERNET ret = NULL;

	if( _FtpOpenFileA )
		ret = _FtpOpenFileA(hConnect, lpszFileName, dwAccess, dwFlags, dwContext);
		
	// add a mapping of the new handle back to the parent
	if( ret )
	{
		EnterCriticalSection(&cs);
		parents.SetAt(ret, hConnect);
		LeaveCriticalSection(&cs);
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL CWinInetHook::InternetReadFile(HINTERNET hFile, LPVOID lpBuffer, DWORD dwNumberOfBytesToRead, LPDWORD lpdwNumberOfBytesRead)
{
	BOOL ret = FALSE;

	if( _InternetReadFile )
		ret = _InternetReadFile(hFile, lpBuffer, dwNumberOfBytesToRead, lpdwNumberOfBytesRead);

	if( ret && dlg )
		dlg->OnDataReceived(hFile, lpBuffer, *lpdwNumberOfBytesRead);
	
	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL CWinInetHook::InternetReadFileExW(HINTERNET hFile, LPINTERNET_BUFFERSW lpBuffersOut, DWORD dwFlags, DWORD_PTR dwContext)
{
	BOOL ret = FALSE;

	hookReadA = false;	// if we ever get the W version, DO NOT HOOK the A version or you will duplicate data

	if( _InternetReadFileExW )
		ret = _InternetReadFileExW(hFile, lpBuffersOut, dwFlags, dwContext);

	if( ret && dlg )
	{
		while( lpBuffersOut )
		{
			dlg->OnDataReceived(hFile, lpBuffersOut->lpvBuffer, lpBuffersOut->dwBufferLength);
			lpBuffersOut = lpBuffersOut->Next;
		}
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL CWinInetHook::InternetReadFileExA(HINTERNET hFile, LPINTERNET_BUFFERSA lpBuffersOut, DWORD dwFlags, DWORD_PTR dwContext)
{
	BOOL ret = FALSE;

	if( _InternetReadFileExA )
		ret = _InternetReadFileExA(hFile, lpBuffersOut, dwFlags, dwContext);

	if( ret && dlg && hookReadA )
	{
		while( lpBuffersOut )
		{
			dlg->OnDataReceived(hFile, lpBuffersOut->lpvBuffer, lpBuffersOut->dwBufferLength);
			lpBuffersOut = lpBuffersOut->Next;
		}
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL CWinInetHook::HttpAddRequestHeadersW(HINTERNET hRequest, LPCWSTR lpszHeaders, DWORD dwHeadersLength, DWORD dwModifiers)
{
	BOOL ret = FALSE;

	if( dlg && dlg->active )
	{
		CString headers = CW2CT(lpszHeaders);
		dlg->OnHttpAddRequestHeaders(hRequest, headers, dwModifiers);

		if( _HttpAddRequestHeadersW )
			ret = _HttpAddRequestHeadersW(hRequest, CT2CW(headers), headers.GetLength(), dwModifiers);
	}
	else if( _HttpAddRequestHeadersW )
		ret = _HttpAddRequestHeadersW(hRequest, lpszHeaders, dwHeadersLength, dwModifiers);

	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL CWinInetHook::HttpAddRequestHeadersA(HINTERNET hRequest, LPCSTR lpszHeaders, DWORD dwHeadersLength, DWORD dwModifiers)
{
	BOOL ret = FALSE;

	if( dlg && dlg->active )
	{
		CString headers = CA2CT(lpszHeaders);
		dlg->OnHttpAddRequestHeaders(hRequest, headers, dwModifiers);

		if( _HttpAddRequestHeadersA )
			ret = _HttpAddRequestHeadersA(hRequest, CT2CA(headers), headers.GetLength(), dwModifiers);
	}
	else if( _HttpAddRequestHeadersA )
		ret = _HttpAddRequestHeadersA(hRequest, lpszHeaders, dwHeadersLength, dwModifiers);

	return ret;
}
