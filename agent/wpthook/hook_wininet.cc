#include "StdAfx.h"
#include "request.h"
#include "test_state.h"
#include "track_sockets.h"
#include "hook_wininet.h"
#include "../wptdriver/wpt_test.h"

static WinInetHook* g_hook = NULL;

// Stub Functions

HINTERNET __stdcall InternetOpenW_Hook(LPCWSTR lpszAgent,DWORD dwAccessType,
  LPCWSTR lpszProxy,LPCWSTR lpszProxyBypass,DWORD dwFlags) {
  HINTERNET ret = NULL;
  if(g_hook)
    ret = g_hook->InternetOpenW(lpszAgent, dwAccessType, lpszProxy, 
                                lpszProxyBypass, dwFlags);
  return ret;
}

HINTERNET __stdcall InternetOpenA_Hook(LPCSTR lpszAgent,DWORD dwAccessType,
  LPCSTR lpszProxy,LPCSTR lpszProxyBypass,DWORD dwFlags) {
  HINTERNET ret = NULL;
  if(g_hook)
    ret = g_hook->InternetOpenA(lpszAgent, dwAccessType, lpszProxy, 
                                  lpszProxyBypass, dwFlags);
  return ret;
}

BOOL __stdcall InternetCloseHandle_Hook(HINTERNET hInternet) {
  BOOL ret = FALSE;
  if(g_hook)
    ret = g_hook->InternetCloseHandle(hInternet);
  return ret;
}

INTERNET_STATUS_CALLBACK __stdcall InternetSetStatusCallback_Hook(
  HINTERNET hInternet, INTERNET_STATUS_CALLBACK lpfnInternetCallback) {
  INTERNET_STATUS_CALLBACK ret = NULL;
  if(g_hook)
    ret = g_hook->InternetSetStatusCallback(hInternet, lpfnInternetCallback);
  return ret;
}

HINTERNET __stdcall InternetConnectW_Hook(HINTERNET hInternet, 
  LPCWSTR lpszServerName, INTERNET_PORT nServerPort, LPCWSTR lpszUserName, 
  LPCWSTR lpszPassword, DWORD dwService, DWORD dwFlags, DWORD_PTR dwContext) {
  HINTERNET ret = NULL;
  if(g_hook)
    ret = g_hook->InternetConnectW(hInternet, lpszServerName, nServerPort, 
                lpszUserName, lpszPassword, dwService, dwFlags, dwContext);
  return ret;
}

HINTERNET __stdcall InternetConnectA_Hook(HINTERNET hInternet, 
  LPCSTR lpszServerName, INTERNET_PORT nServerPort, LPCSTR lpszUserName, 
  LPCSTR lpszPassword, DWORD dwService, DWORD dwFlags, DWORD_PTR dwContext) {
  HINTERNET ret = NULL;
  if(g_hook)
    ret = g_hook->InternetConnectA(hInternet, lpszServerName, nServerPort, 
                  lpszUserName, lpszPassword, dwService, dwFlags, dwContext);
  return ret;
}

HINTERNET __stdcall HttpOpenRequestW_Hook(HINTERNET hConnect, LPCWSTR lpszVerb,
  LPCWSTR lpszObjectName, LPCWSTR lpszVersion, LPCWSTR lpszReferrer, 
  LPCWSTR FAR * lplpszAcceptTypes, DWORD dwFlags, DWORD_PTR dwContext) {
  HINTERNET ret = NULL;
  if(g_hook)
    ret = g_hook->HttpOpenRequestW(hConnect, lpszVerb, lpszObjectName, 
          lpszVersion, lpszReferrer, lplpszAcceptTypes, dwFlags, dwContext);
  return ret;
}

HINTERNET __stdcall HttpOpenRequestA_Hook(HINTERNET hConnect, LPCSTR lpszVerb,
    LPCSTR lpszObjectName, LPCSTR lpszVersion, LPCSTR lpszReferrer, 
    LPCSTR FAR * lplpszAcceptTypes, DWORD dwFlags, DWORD_PTR dwContext) {
  HINTERNET ret = NULL;
  if(g_hook)
    ret = g_hook->HttpOpenRequestA(hConnect, lpszVerb, lpszObjectName, 
          lpszVersion, lpszReferrer, lplpszAcceptTypes, dwFlags, dwContext);
  return ret;
}

BOOL __stdcall HttpSendRequestW_Hook(HINTERNET hRequest, LPCWSTR lpszHeaders, 
  DWORD dwHeadersLength, LPVOID lpOptional, DWORD dwOptionalLength) {
  BOOL ret = FALSE;
  if(g_hook)
    ret = g_hook->HttpSendRequestW(hRequest, lpszHeaders, dwHeadersLength, 
                                  lpOptional, dwOptionalLength);
  return ret;
}

BOOL __stdcall HttpSendRequestA_Hook(HINTERNET hRequest, LPCSTR lpszHeaders, 
  DWORD dwHeadersLength, LPVOID lpOptional, DWORD dwOptionalLength) {
  BOOL ret = FALSE;
  if(g_hook)
    ret = g_hook->HttpSendRequestA(hRequest, lpszHeaders, dwHeadersLength, 
                                    lpOptional, dwOptionalLength);
  return ret;
}

HINTERNET __stdcall FtpOpenFileW_Hook(HINTERNET hConnect, LPCWSTR lpszFileName,
  DWORD dwAccess, DWORD dwFlags, DWORD_PTR dwContext) {
  HINTERNET ret = NULL;
  if(g_hook)
    ret = g_hook->FtpOpenFileW(hConnect, lpszFileName, dwAccess, dwFlags, 
                                dwContext);
  return ret;
}

HINTERNET __stdcall FtpOpenFileA_Hook(HINTERNET hConnect, LPCSTR lpszFileName,
  DWORD dwAccess, DWORD dwFlags, DWORD_PTR dwContext) {
  HINTERNET ret = NULL;
  if(g_hook)
    ret = g_hook->FtpOpenFileA(hConnect, lpszFileName, dwAccess, dwFlags, 
                                dwContext);
  return ret;
}

BOOL __stdcall HttpAddRequestHeadersW_Hook(HINTERNET hRequest, 
  LPCWSTR lpszHeaders, DWORD dwHeadersLength, DWORD dwModifiers) {
  BOOL ret = FALSE;
  if(g_hook)
    ret = g_hook->HttpAddRequestHeadersW(hRequest, lpszHeaders, 
                                          dwHeadersLength, dwModifiers);
  return ret;
}

BOOL __stdcall HttpAddRequestHeadersA_Hook(HINTERNET hRequest, 
  LPCSTR lpszHeaders, DWORD dwHeadersLength, DWORD dwModifiers) {
  BOOL ret = FALSE;
  if(g_hook)
    ret = g_hook->HttpAddRequestHeadersA(hRequest, lpszHeaders, 
                                          dwHeadersLength, dwModifiers);
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WinInetHook::WinInetHook(TrackSockets& sockets, TestState& test_state, 
  WptTest& test):
  _hook(NULL)
  ,_sockets(sockets)
  ,_test_state(test_state)
  ,_test(test)
  ,_hook_OpenA(true) {
  InitializeCriticalSection(&cs);
  _status_callbacks.InitHashTable(257);
  _parents.InitHashTable(257);
  _host_names.InitHashTable(257);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WinInetHook::~WinInetHook(void) {
  if (g_hook == this) {
    g_hook = NULL;
  }
  if (_hook)
    delete _hook;  // remove all the hooks
  DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WinInetHook::Init() {
  if (_hook || g_hook)
    return;
  _hook = new NCodeHookIA32();
  g_hook = this;
  WptTrace(loglevel::kProcess, _T("[wpthook] WinInetHook::Init()\n"));

/*
  _InternetConnectW = _hook->createHookByName("wininet.dll", 
                  "InternetConnectW", InternetConnectW_Hook);
  _InternetConnectA = _hook->createHookByName("wininet.dll", 
                  "InternetConnectA", InternetConnectA_Hook);
  _HttpOpenRequestA = _hook->createHookByName("wininet.dll", 
                  "HttpOpenRequestA", HttpOpenRequestA_Hook);
  _HttpOpenRequestW = _hook->createHookByName("wininet.dll", 
                  "HttpOpenRequestW", HttpOpenRequestW_Hook);
  _InternetOpenW = _hook->createHookByName("wininet.dll", "InternetOpenW", 
                    InternetOpenW_Hook);
  _InternetOpenA = _hook->createHookByName("wininet.dll", "InternetOpenA", 
                    InternetOpenA_Hook);
  _InternetCloseHandle = _hook->createHookByName("wininet.dll", 
                  "InternetCloseHandle", InternetCloseHandle_Hook);
  _InternetSetStatusCallback = _hook->createHookByName("wininet.dll", 
                  "InternetSetStatusCallback", InternetSetStatusCallback_Hook);
  _HttpSendRequestW = _hook->createHookByName("wininet.dll", 
                  "HttpSendRequestW", HttpSendRequestW_Hook);
  _HttpSendRequestA = _hook->createHookByName("wininet.dll", 
                  "HttpSendRequestA", HttpSendRequestA_Hook);
  _FtpOpenFileW = _hook->createHookByName("wininet.dll", 
                  "FtpOpenFileW", FtpOpenFileW_Hook);
  _FtpOpenFileA = _hook->createHookByName("wininet.dll", 
                  "FtpOpenFileA", FtpOpenFileA_Hook);
  _HttpAddRequestHeadersW = _hook->createHookByName("wininet.dll", 
                  "HttpAddRequestHeadersW", HttpAddRequestHeadersW_Hook);
  _HttpAddRequestHeadersA = _hook->createHookByName("wininet.dll", 
                  "HttpAddRequestHeadersA", HttpAddRequestHeadersA_Hook);
*/
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HINTERNET WinInetHook::InternetOpenW(LPCWSTR lpszAgent,DWORD dwAccessType,
  LPCWSTR lpszProxy,LPCWSTR lpszProxyBypass,DWORD dwFlags) {
  HINTERNET ret = NULL;

  CString agent(lpszAgent);
  if( _InternetOpenW )
    ret = _InternetOpenW((LPCWSTR)CT2W(agent), dwAccessType, lpszProxy, 
                          lpszProxyBypass, dwFlags);
  
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HINTERNET WinInetHook::InternetOpenA(LPCSTR lpszAgent,DWORD dwAccessType,
  LPCSTR lpszProxy,LPCSTR lpszProxyBypass,DWORD dwFlags) {
  HINTERNET ret = NULL;

  CString agent((LPCTSTR)CA2T(lpszAgent));
  if( _InternetOpenA )
    ret = _InternetOpenA((LPCSTR)CT2A(agent), dwAccessType, lpszProxy, 
                          lpszProxyBypass, dwFlags);
  
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL WinInetHook::InternetCloseHandle(HINTERNET hInternet) {
  BOOL ret = FALSE;

  if( _InternetCloseHandle )
    ret = _InternetCloseHandle(hInternet);

  EnterCriticalSection(&cs);
  _status_callbacks.RemoveKey(hInternet);
  _parents.RemoveKey(hInternet);
  _host_names.RemoveKey(hInternet);
  LeaveCriticalSection(&cs);
  
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CALLBACK InternetStatusCallback(HINTERNET hInternet, DWORD_PTR dwContext, 
  DWORD dwInternetStatus, LPVOID lpvStatusInformation, 
  DWORD dwStatusInformationLength) {
  __try{
    if( g_hook )
      g_hook->InternetStatusCallback(hInternet, dwContext, dwInternetStatus, 
                      lpvStatusInformation, dwStatusInformationLength);
  }__except(1){}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
INTERNET_STATUS_CALLBACK WinInetHook::InternetSetStatusCallback(
  HINTERNET hInternet, INTERNET_STATUS_CALLBACK lpfnInternetCallback) {
  INTERNET_STATUS_CALLBACK ret = NULL;

  EnterCriticalSection(&cs);
  _status_callbacks.SetAt(hInternet, lpfnInternetCallback);
  LeaveCriticalSection(&cs);
  
  if( _InternetSetStatusCallback )
    ret = _InternetSetStatusCallback( hInternet, ::InternetStatusCallback );
  
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WinInetHook::InternetStatusCallback(HINTERNET hInternet, 
  DWORD_PTR dwContext, DWORD dwInternetStatus, LPVOID lpvStatusInformation, 
  DWORD dwStatusInformationLength) {
  INTERNET_STATUS_CALLBACK cb = NULL;
  EnterCriticalSection(&cs);
  HINTERNET h = hInternet;
  while (!cb && h) {
    _status_callbacks.Lookup(h, cb);
    if (!cb) {
      HINTERNET parent = NULL;
      _parents.Lookup(h, parent);
      h = parent;
    }
  }
  LeaveCriticalSection(&cs);
  
  if (cb) {
    cb(hInternet, dwContext, dwInternetStatus, lpvStatusInformation, 
      dwStatusInformationLength);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HINTERNET WinInetHook::InternetConnectW(HINTERNET hInternet, 
  LPCWSTR lpszServerName, INTERNET_PORT nServerPort, LPCWSTR lpszUserName, 
  LPCWSTR lpszPassword, DWORD dwService, DWORD dwFlags, DWORD_PTR dwContext) {
  HINTERNET ret = NULL;
  CString server((LPCTSTR)CW2T(lpszServerName));
  CString originalServer = server;

  EnterCriticalSection(&cs);
  INTERNET_STATUS_CALLBACK cb = NULL;
  _status_callbacks.Lookup(hInternet, cb);
  if (!cb && _InternetSetStatusCallback) {
    cb = _InternetSetStatusCallback(hInternet, ::InternetStatusCallback);
    if (cb)
      _status_callbacks.SetAt(hInternet, cb);
  }
  LeaveCriticalSection(&cs);

  if (_InternetConnectW)
    ret = _InternetConnectW(hInternet, (LPCWSTR)server, nServerPort, 
            lpszUserName, lpszPassword, dwService, dwFlags, dwContext);
    
  if (ret) {
    EnterCriticalSection(&cs);
    _host_names.SetAt(ret, lpszServerName);
    _parents.SetAt(ret, hInternet);
    LeaveCriticalSection(&cs);
  }
  
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HINTERNET WinInetHook::InternetConnectA(HINTERNET hInternet, 
  LPCSTR lpszServerName, INTERNET_PORT nServerPort, LPCSTR lpszUserName, 
  LPCSTR lpszPassword, DWORD dwService, DWORD dwFlags, DWORD_PTR dwContext) {
  HINTERNET ret = NULL;
  CString server((LPCTSTR)CA2T(lpszServerName));
  CString originalServer = server;

  if (_InternetConnectA)
    ret = _InternetConnectA(hInternet, (LPCSTR)CT2A(server), nServerPort, 
          lpszUserName, lpszPassword, dwService, dwFlags, dwContext);
    
  if (ret) {
    EnterCriticalSection(&cs);
    _host_names.SetAt(ret, CA2T(lpszServerName));
    _parents.SetAt(ret, hInternet);
    LeaveCriticalSection(&cs);
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HINTERNET WinInetHook::HttpOpenRequestW(HINTERNET hConnect, LPCWSTR lpszVerb, 
  LPCWSTR lpszObjectName, LPCWSTR lpszVersion, LPCWSTR lpszReferrer, 
  LPCWSTR FAR * lplpszAcceptTypes, DWORD dwFlags, DWORD_PTR dwContext) {
  HINTERNET ret = NULL;
  void * dlgContext = NULL;

  _hook_OpenA = false;

  CString host;
  _host_names.Lookup(hConnect, host);
  if (_test.BlockRequest(host, lpszObjectName)) {
    ret = NULL;
    SetLastError(ERROR_INTERNET_INVALID_URL);
  } else {	
    if( _HttpOpenRequestW ) {
      ret = _HttpOpenRequestW(hConnect, lpszVerb, lpszObjectName, lpszVersion, 
                      lpszReferrer, lplpszAcceptTypes, dwFlags, dwContext);
    }
      
    if (ret) {
      EnterCriticalSection(&cs);
      _parents.SetAt(ret, hConnect);
      LeaveCriticalSection(&cs);
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HINTERNET WinInetHook::HttpOpenRequestA(HINTERNET hConnect, LPCSTR lpszVerb, 
  LPCSTR lpszObjectName, LPCSTR lpszVersion, LPCSTR lpszReferrer, 
  LPCSTR FAR * lplpszAcceptTypes, DWORD dwFlags, DWORD_PTR dwContext) {
  HINTERNET ret = NULL;
  void * dlgContext = NULL;

  if (_hook_OpenA) {
    CString host;
    _host_names.Lookup(hConnect, host);
    if (_test.BlockRequest(host, lpszObjectName)) {
      ret = NULL;
      SetLastError(ERROR_INTERNET_INVALID_URL);
    } else {	
      if (_HttpOpenRequestA) {
        ret = _HttpOpenRequestA(hConnect, lpszVerb, lpszObjectName, 
            lpszVersion, lpszReferrer, lplpszAcceptTypes, dwFlags, dwContext);
      }
      
      if (ret) {
        EnterCriticalSection(&cs);
        _parents.SetAt(ret, hConnect);
        LeaveCriticalSection(&cs);
      }
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL WinInetHook::HttpSendRequestW(HINTERNET hRequest, LPCWSTR lpszHeaders, 
  DWORD dwHeadersLength, LPVOID lpOptional, DWORD dwOptionalLength) {
  BOOL ret = FALSE;
  
  CString headers(lpszHeaders);
  if (_HttpSendRequestW)
    ret = _HttpSendRequestW(hRequest, (LPCWSTR)CT2W(headers), 
            headers.GetLength(), lpOptional, dwOptionalLength);

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL WinInetHook::HttpSendRequestA(HINTERNET hRequest, LPCSTR lpszHeaders, 
  DWORD dwHeadersLength, LPVOID lpOptional, DWORD dwOptionalLength) {
  BOOL ret = FALSE;
  
  CString headers((LPCTSTR)CA2T(lpszHeaders));
  if (_HttpSendRequestA)
    ret = _HttpSendRequestA(hRequest, (LPCSTR)CT2A(headers), 
            headers.GetLength(), lpOptional, dwOptionalLength);

  return ret;
}

/*-----------------------------------------------------------------------------
  Need to track all of the handles since we modify the callbacks
-----------------------------------------------------------------------------*/
HINTERNET WinInetHook::FtpOpenFileW(HINTERNET hConnect, LPCWSTR lpszFileName, 
  DWORD dwAccess, DWORD dwFlags, DWORD_PTR dwContext) {
  HINTERNET ret = NULL;

  if (_FtpOpenFileW) {
    ret = _FtpOpenFileW(hConnect, lpszFileName, dwAccess, dwFlags, dwContext);
    if (ret) {
      EnterCriticalSection(&cs);
      _parents.SetAt(ret, hConnect);
      LeaveCriticalSection(&cs);
    }
  }
  
  return ret;
}

/*-----------------------------------------------------------------------------
  Need to track all of the handles since we modify the callbacks
-----------------------------------------------------------------------------*/
HINTERNET WinInetHook::FtpOpenFileA(HINTERNET hConnect, LPCSTR lpszFileName, 
  DWORD dwAccess, DWORD dwFlags, DWORD_PTR dwContext) {
  HINTERNET ret = NULL;

  if (_FtpOpenFileA) {
    ret = _FtpOpenFileA(hConnect, lpszFileName, dwAccess, dwFlags, dwContext);
    if (ret) {
      EnterCriticalSection(&cs);
      _parents.SetAt(ret, hConnect);
      LeaveCriticalSection(&cs);
    }
  }
  
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL WinInetHook::HttpAddRequestHeadersW(HINTERNET hRequest, 
  LPCWSTR lpszHeaders, DWORD dwHeadersLength, DWORD dwModifiers) {
  BOOL ret = FALSE;

  CString headers = CW2CT(lpszHeaders);
  if( _HttpAddRequestHeadersW )
    ret = _HttpAddRequestHeadersW(hRequest, CT2CW(headers), 
            headers.GetLength(), dwModifiers);

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL WinInetHook::HttpAddRequestHeadersA(HINTERNET hRequest, 
  LPCSTR lpszHeaders, DWORD dwHeadersLength, DWORD dwModifiers) {
  BOOL ret = FALSE;

  CString headers = CA2CT(lpszHeaders);
  if( _HttpAddRequestHeadersA )
    ret = _HttpAddRequestHeadersA(hRequest, CT2CA(headers), 
            headers.GetLength(), dwModifiers);

  return ret;
}
