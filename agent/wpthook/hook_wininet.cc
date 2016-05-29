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
  _https_requests.InitHashTable(257);
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
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HINTERNET WinInetHook::InternetOpenW(LPCWSTR lpszAgent, DWORD dwAccessType,
  LPCWSTR lpszProxy, LPCWSTR lpszProxyBypass, DWORD dwFlags) {
  HINTERNET ret = NULL;

  ATLTRACE(_T("WinInetHook::InternetOpenW"));

  CString agent(lpszAgent);
  if (agent.Find(_T("WebPagetest")) == -1) {
    if (agent.Find(CA2T(" " + _test._user_agent_modifier + "/")) == -1) {
      CStringA append = _test.GetAppendUA();
      if (append.GetLength())
        agent += CA2T(" " + append);
    }
  }
  if( _InternetOpenW )
    ret = _InternetOpenW((LPCWSTR)CT2W(agent), dwAccessType, lpszProxy, 
                          lpszProxyBypass, dwFlags);
  
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HINTERNET WinInetHook::InternetOpenA(LPCSTR lpszAgent, DWORD dwAccessType,
  LPCSTR lpszProxy, LPCSTR lpszProxyBypass, DWORD dwFlags) {
  HINTERNET ret = NULL;

  ATLTRACE(_T("WinInetHook::InternetOpenA"));

  CString agent((LPCTSTR)CA2T(lpszAgent, CP_UTF8));
  if (agent.Find(_T("WebPagetest")) == -1) {
    if (agent.Find(CA2T(" " + _test._user_agent_modifier + "/")) == -1) {
      CStringA append = _test.GetAppendUA();
      if (append.GetLength())
        agent += CA2T(" " + append);
    }
  }
  if( _InternetOpenA )
    ret = _InternetOpenA((LPCSTR)CT2A(agent), dwAccessType, lpszProxy, 
                          lpszProxyBypass, dwFlags);
  
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL WinInetHook::InternetCloseHandle(HINTERNET hInternet) {
  BOOL ret = FALSE;

  ATLTRACE(_T("WinInetHook::InternetCloseHandle"));

  if( _InternetCloseHandle )
    ret = _InternetCloseHandle(hInternet);

  EnterCriticalSection(&cs);
  _status_callbacks.RemoveKey(hInternet);
  _parents.RemoveKey(hInternet);
  _host_names.RemoveKey(hInternet);
  _https_requests.RemoveKey(hInternet);
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

  ATLTRACE(_T("WinInetHook::InternetSetStatusCallback"));

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

  ATLTRACE(_T("WinInetHook::InternetStatusCallback"));

  switch (dwInternetStatus) {
    case INTERNET_STATUS_RESOLVING_NAME: 
        ATLTRACE(_T("INTERNET_STATUS_RESOLVING_NAME"));
        break;
    case INTERNET_STATUS_NAME_RESOLVED:
        ATLTRACE(_T("INTERNET_STATUS_NAME_RESOLVED"));
        break;
    case INTERNET_STATUS_CONNECTING_TO_SERVER:
        ATLTRACE(_T("INTERNET_STATUS_CONNECTING_TO_SERVER"));
        break;
    case INTERNET_STATUS_CONNECTED_TO_SERVER:
        ATLTRACE(_T("INTERNET_STATUS_CONNECTED_TO_SERVER"));
        break;
    case INTERNET_STATUS_SENDING_REQUEST: {
          ATLTRACE(_T("INTERNET_STATUS_SENDING_REQUEST"));
          // check if the request is secure
          DWORD flags = 0;
          DWORD len = sizeof(flags);
          if (InternetQueryOption(hInternet, INTERNET_OPTION_SECURITY_FLAGS, &flags, &len)) {
            EnterCriticalSection(&cs);
            _https_requests.SetAt(hInternet, flags & SECURITY_FLAG_SECURE ? true : false);
            LeaveCriticalSection(&cs);
          }
          SetHeaders(hInternet, true);
        }
        break;
    case INTERNET_STATUS_REQUEST_SENT:
        ATLTRACE(_T("INTERNET_STATUS_REQUEST_SENT"));
        break;
    case INTERNET_STATUS_RECEIVING_RESPONSE:
        ATLTRACE(_T("INTERNET_STATUS_RECEIVING_RESPONSE"));
        break;
    case INTERNET_STATUS_REDIRECT:
        ATLTRACE(_T("INTERNET_STATUS_REDIRECT"));
        if (lpvStatusInformation) {
          CString url = CA2T((LPCSTR)lpvStatusInformation);
          CString scheme, host, object, extra;
          CrackUrl(url, scheme, host, object, extra);
          EnterCriticalSection(&cs);
          _host_names.SetAt(hInternet, host);
          _https_requests.SetAt(hInternet, scheme.Left(5).CompareNoCase(_T("https")) == 0 ? true : false);
          LeaveCriticalSection(&cs);
          SetHeaders(hInternet, true);
          if (_test.BlockRequest(host, object))
            InternetCloseHandle(hInternet);
        }
        break;
    case INTERNET_STATUS_RESPONSE_RECEIVED:
        ATLTRACE(_T("INTERNET_STATUS_RESPONSE_RECEIVED"));
        break;
    case INTERNET_STATUS_REQUEST_COMPLETE:
        ATLTRACE(_T("INTERNET_STATUS_REQUEST_COMPLETE"));
        break;
  }

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

  ATLTRACE(_T("WinInetHook::InternetConnectW"));

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

  ATLTRACE(_T("WinInetHook::InternetConnectA"));

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

  AtlTrace(_T("WinInetHook::HttpOpenRequestW"));

  HINTERNET ret = NULL;
  void * dlgContext = NULL;
  _hook_OpenA = false;

  _test_state.SendingRequest();

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
      _https_requests.SetAt(ret, dwFlags & INTERNET_FLAG_SECURE ? true : false);
      _host_names.SetAt(ret, host);
      LeaveCriticalSection(&cs);
      SetHeaders(ret);
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

  ATLTRACE(_T("WinInetHook::HttpOpenRequestA"));

  HINTERNET ret = NULL;
  bool block = false;
  CString host;

  _test_state.SendingRequest();

  if (_hook_OpenA) {
    _host_names.Lookup(hConnect, host);
    block = _test.BlockRequest(host, lpszObjectName);
  }

  if (block) {
    SetLastError(ERROR_INTERNET_INVALID_URL);
  } else {
    if (_HttpOpenRequestA) {
      ret = _HttpOpenRequestA(hConnect, lpszVerb, lpszObjectName, 
          lpszVersion, lpszReferrer, lplpszAcceptTypes, dwFlags, dwContext);
    }
    if (_hook_OpenA && ret) {
      EnterCriticalSection(&cs);
      _https_requests.SetAt(ret, dwFlags & INTERNET_FLAG_SECURE ? true : false);
      _host_names.SetAt(ret, host);
      LeaveCriticalSection(&cs);
      SetHeaders(ret);
      EnterCriticalSection(&cs);
      _parents.SetAt(ret, hConnect);
      LeaveCriticalSection(&cs);
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL WinInetHook::HttpSendRequestW(HINTERNET hRequest, LPCWSTR lpszHeaders, 
  DWORD dwHeadersLength, LPVOID lpOptional, DWORD dwOptionalLength) {
  BOOL ret = FALSE;

  ATLTRACE(_T("WinInetHook::HttpSendRequestW"));

  SetHeaders(hRequest);  
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
  
  ATLTRACE(_T("WinInetHook::HttpSendRequestA"));

  SetHeaders(hRequest);
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

  ATLTRACE(_T("WinInetHook::FtpOpenFileW"));

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

  ATLTRACE(_T("WinInetHook::FtpOpenFileA"));

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

  ATLTRACE(_T("WinInetHook::HttpAddRequestHeadersW: %s"), lpszHeaders);

  CStringA headers = CT2A(lpszHeaders);
  EnterCriticalSection(&cs);
  bool secure = false;
  _https_requests.Lookup(hRequest, secure);
  LeaveCriticalSection(&cs);
  if (secure) {
    CStringA out_headers("");
    int pos = 0;
    while (pos >= 0) {
      CStringA header = headers.Tokenize("\n", pos).Trim();
      _test.ModifyRequestHeader(header);
      if (header.GetLength())
        out_headers += header + "\r\n";
    }
    headers = out_headers;
    ATLTRACE(_T("WinInetHook::HttpAddRequestHeadersW (new): %s"), CA2T((LPCSTR)headers));
  }
  if( _HttpAddRequestHeadersW )
    ret = _HttpAddRequestHeadersW(hRequest, CA2T((LPCSTR)headers), 
            headers.GetLength(), dwModifiers);

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL WinInetHook::HttpAddRequestHeadersA(HINTERNET hRequest, 
  LPCSTR lpszHeaders, DWORD dwHeadersLength, DWORD dwModifiers) {
  BOOL ret = FALSE;

  ATLTRACE(_T("WinInetHook::HttpAddRequestHeadersA: %S"), lpszHeaders);

  CStringA headers(lpszHeaders);
  EnterCriticalSection(&cs);
  bool secure = false;
  _https_requests.Lookup(hRequest, secure);
  LeaveCriticalSection(&cs);
  if (secure) {
    CStringA out_headers("");
    int pos = 0;
    while (pos >= 0) {
      CStringA header = headers.Tokenize("\n", pos).Trim();
      _test.ModifyRequestHeader(header);
      if (header.GetLength())
        out_headers += header + "\r\n";
    }
    headers = out_headers;
    ATLTRACE(_T("WinInetHook::HttpAddRequestHeadersA (new): %S"), (LPCSTR)headers);
  }
  if( _HttpAddRequestHeadersA )
    ret = _HttpAddRequestHeadersA(hRequest, (LPCSTR)headers, 
            headers.GetLength(), dwModifiers);

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WinInetHook::SetHeaders(HINTERNET hRequest, bool also_add) {
  bool secure = false;
  EnterCriticalSection(&cs);
  CString host;
  _host_names.Lookup(hRequest, host);
  _https_requests.Lookup(hRequest, secure);
  LeaveCriticalSection(&cs);

  // Only modify headers in wininet for https requests.  Other requests will
  // be processed normally in the socket hooks.
  if (secure) {
    CAtlList<CString> headers;
    if (_test.GetHeadersToSet(host, headers)) {
      POSITION pos = headers.GetHeadPosition();
      while (pos) {
        CString header = headers.GetNext(pos);
        ATLTRACE(_T("WinInetHook::SetHeaders - Setting header : %s"), (LPCTSTR)header);
        header += _T("\r\n");
        HttpAddRequestHeaders(hRequest, header, header.GetLength(), HTTP_ADDREQ_FLAG_ADD | HTTP_ADDREQ_FLAG_REPLACE);
      }
    }
    headers.RemoveAll();
    if (also_add && _test.GetHeadersToAdd(host, headers)) {
      POSITION pos = headers.GetHeadPosition();
      while (pos) {
        CString header = headers.GetNext(pos);
        ATLTRACE(_T("WinInetHook::SetHeaders - Adding header : %s"), (LPCTSTR)header);
        header += _T("\r\n");
        HttpAddRequestHeaders(hRequest, header, header.GetLength(), HTTP_ADDREQ_FLAG_ADD);
      }
    }
    CString new_host;
    if (_test.OverrideHost(host, new_host)) {
      ATLTRACE(_T("WinInetHook::SetHeaders - Overriding host : %s -> %s"), (LPCTSTR)host, (LPCTSTR)new_host);
      CString header = CString("Host: ") + new_host + _T("\r\n");
      HttpAddRequestHeaders(hRequest, header, header.GetLength(), HTTP_ADDREQ_FLAG_ADD | HTTP_ADDREQ_FLAG_REPLACE);
      header = CString("x-Host: ") + host + _T("\r\n");
      HttpAddRequestHeaders(hRequest, header, header.GetLength(), HTTP_ADDREQ_FLAG_ADD | HTTP_ADDREQ_FLAG_REPLACE);
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WinInetHook::CrackUrl(CString url, CString &scheme, CString &host, CString &object, CString &extra) {
  URL_COMPONENTS parts;
  memset(&parts, 0, sizeof(parts));
  TCHAR scheme_buff[10000];
  TCHAR host_buff[10000];
  TCHAR object_buff[10000];
  TCHAR extra_buff[10000];
                
  memset(scheme_buff, 0, sizeof(scheme));
  memset(host_buff, 0, sizeof(host));
  memset(object_buff, 0, sizeof(object));
  memset(extra_buff, 0, sizeof(extra));

  parts.lpszScheme = scheme_buff;
  parts.dwSchemeLength = _countof(scheme_buff);
  parts.lpszHostName = host_buff;
  parts.dwHostNameLength = _countof(host_buff);
  parts.lpszUrlPath = object_buff;
  parts.dwUrlPathLength = _countof(object_buff);
  parts.lpszExtraInfo = extra_buff;
  parts.dwExtraInfoLength = _countof(extra_buff);
  parts.dwStructSize = sizeof(parts);
                
  if (InternetCrackUrl((LPCTSTR)url, url.GetLength(), 0, &parts)) {
    scheme = scheme_buff;
    host = host_buff;
    object = object_buff;
    extra = extra_buff;
  }
}
