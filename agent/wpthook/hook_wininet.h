#pragma once
#include <WinInet.h>

class TestState;
class TrackSockets;
class WptTest;

typedef HINTERNET(__stdcall * LPINTERNETOPENW)(LPCWSTR lpszAgent,
    DWORD dwAccessType,LPCWSTR lpszProxy,LPCWSTR lpszProxyBypass,
    DWORD dwFlags);
typedef HINTERNET(__stdcall * LPINTERNETOPENA)(LPCSTR lpszAgent,
    DWORD dwAccessType,LPCSTR lpszProxy,LPCSTR lpszProxyBypass,DWORD dwFlags);
typedef BOOL(__stdcall * LPINTERNETCLOSEHANDLE)(HINTERNET hInternet);
typedef INTERNET_STATUS_CALLBACK(__stdcall * LPINTERNETSETSTATUSCALLBACK)
    (HINTERNET hInternet, INTERNET_STATUS_CALLBACK lpfnInternetCallback);
typedef HINTERNET(__stdcall * LPINTERNETCONNECTW)(HINTERNET hInternet, 
    LPCWSTR lpszServerName, INTERNET_PORT nServerPort, LPCWSTR lpszUserName, 
    LPCWSTR lpszPassword, DWORD dwService, DWORD dwFlags, DWORD_PTR dwContext);
typedef HINTERNET(__stdcall * LPINTERNETCONNECTA)(HINTERNET hInternet, 
    LPCSTR lpszServerName, INTERNET_PORT nServerPort, LPCSTR lpszUserName, 
    LPCSTR lpszPassword, DWORD dwService, DWORD dwFlags, DWORD_PTR dwContext);
typedef HINTERNET(__stdcall * LPHTTPOPENREQUESTW)(HINTERNET hConnect, 
    LPCWSTR lpszVerb, LPCWSTR lpszObjectName, LPCWSTR lpszVersion, 
    LPCWSTR lpszReferrer, LPCWSTR FAR * lplpszAcceptTypes, DWORD dwFlags, 
    DWORD_PTR dwContext);
typedef HINTERNET(__stdcall * LPHTTPOPENREQUESTA)(HINTERNET hConnect, 
    LPCSTR lpszVerb, LPCSTR lpszObjectName, LPCSTR lpszVersion, 
    LPCSTR lpszReferrer, LPCSTR FAR * lplpszAcceptTypes, DWORD dwFlags, 
    DWORD_PTR dwContext);
typedef BOOL(__stdcall * LPHTTPSENDREQUESTW)(HINTERNET hRequest, 
    LPCWSTR lpszHeaders, DWORD dwHeadersLength, LPVOID lpOptional, 
    DWORD dwOptionalLength);
typedef BOOL(__stdcall * LPHTTPSENDREQUESTA)(HINTERNET hRequest, 
    LPCSTR lpszHeaders, DWORD dwHeadersLength, LPVOID lpOptional, 
    DWORD dwOptionalLength);
typedef HINTERNET(__stdcall * LPFTPOPENFILEW)(HINTERNET hConnect, 
    LPCWSTR lpszFileName, DWORD dwAccess, DWORD dwFlags, DWORD_PTR dwContext);
typedef HINTERNET(__stdcall * LPFTPOPENFILEA)(HINTERNET hConnect, 
    LPCSTR lpszFileName, DWORD dwAccess, DWORD dwFlags, DWORD_PTR dwContext);
typedef BOOL(__stdcall * LPHTTPADDREQUESTHEADERSW)(HINTERNET hRequest, 
    LPCWSTR lpszHeaders, DWORD dwHeadersLength, DWORD dwModifiers);
typedef BOOL(__stdcall * LPHTTPADDREQUESTHEADERSA)(HINTERNET hRequest, 
    LPCSTR lpszHeaders, DWORD dwHeadersLength, DWORD dwModifiers);

class WinInetHook
{
public:
  WinInetHook(TrackSockets& sockets, TestState& test_state, WptTest& test);
  ~WinInetHook(void);
  void Init();

  HINTERNET	InternetOpenW(LPCWSTR lpszAgent,DWORD dwAccessType,
                      LPCWSTR lpszProxy,LPCWSTR lpszProxyBypass,DWORD dwFlags);
  HINTERNET	InternetOpenA(LPCSTR lpszAgent,DWORD dwAccessType,LPCSTR lpszProxy,
                      LPCSTR lpszProxyBypass,DWORD dwFlags);
  BOOL		InternetCloseHandle(HINTERNET hInternet);
  INTERNET_STATUS_CALLBACK	InternetSetStatusCallback(HINTERNET hInternet, 
          INTERNET_STATUS_CALLBACK lpfnInternetCallback);
  void		InternetStatusCallback(HINTERNET hInternet, DWORD_PTR dwContext, 
          DWORD dwInternetStatus, LPVOID lpvStatusInformation, 
          DWORD dwStatusInformationLength);
  HINTERNET	InternetConnectW(HINTERNET hInternet, LPCWSTR lpszServerName, 
          INTERNET_PORT nServerPort, LPCWSTR lpszUserName,LPCWSTR lpszPassword,
          DWORD dwService, DWORD dwFlags, DWORD_PTR dwContext);
  HINTERNET	InternetConnectA(HINTERNET hInternet, LPCSTR lpszServerName, 
          INTERNET_PORT nServerPort, LPCSTR lpszUserName, LPCSTR lpszPassword, 
          DWORD dwService, DWORD dwFlags, DWORD_PTR dwContext);
  HINTERNET	HttpOpenRequestW(HINTERNET hConnect, LPCWSTR lpszVerb, 
          LPCWSTR lpszObjectName, LPCWSTR lpszVersion, LPCWSTR lpszReferrer, 
          LPCWSTR FAR * lplpszAcceptTypes, DWORD dwFlags, DWORD_PTR dwContext);
  HINTERNET	HttpOpenRequestA(HINTERNET hConnect, LPCSTR lpszVerb, 
          LPCSTR lpszObjectName, LPCSTR lpszVersion, LPCSTR lpszReferrer, 
          LPCSTR FAR * lplpszAcceptTypes, DWORD dwFlags, DWORD_PTR dwContext);
  BOOL		HttpSendRequestW(HINTERNET hRequest, LPCWSTR lpszHeaders, 
          DWORD dwHeadersLength, LPVOID lpOptional, DWORD dwOptionalLength);
  BOOL		HttpSendRequestA(HINTERNET hRequest, LPCSTR lpszHeaders, 
          DWORD dwHeadersLength, LPVOID lpOptional, DWORD dwOptionalLength);
  HINTERNET	FtpOpenFileW(HINTERNET hConnect, LPCWSTR lpszFileName, 
          DWORD dwAccess, DWORD dwFlags, DWORD_PTR dwContext);
  HINTERNET	FtpOpenFileA(HINTERNET hConnect, LPCSTR lpszFileName, 
          DWORD dwAccess, DWORD dwFlags, DWORD_PTR dwContext);
  BOOL		HttpAddRequestHeadersW(HINTERNET hRequest, LPCWSTR lpszHeaders, 
          DWORD dwHeadersLength, DWORD dwModifiers);
  BOOL		HttpAddRequestHeadersA(HINTERNET hRequest, LPCSTR lpszHeaders, 
          DWORD dwHeadersLength, DWORD dwModifiers);

private:
  TestState& _test_state;
  TrackSockets& _sockets;
  WptTest& _test;
  CAtlMap<HINTERNET, INTERNET_STATUS_CALLBACK>	_status_callbacks;
  CAtlMap<HINTERNET, HINTERNET>	_parents;
  CAtlMap<HINTERNET, CString>	  _host_names;
  CAtlMap<HINTERNET, bool>      _https_requests;
  CRITICAL_SECTION	cs;
  bool  _hook_OpenA;

  void SetHeaders(HINTERNET hRequest, bool also_add = false);
  void CrackUrl(CString url, CString &scheme, CString &host, CString &object, CString &extra);

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
  LPHTTPADDREQUESTHEADERSW	_HttpAddRequestHeadersW;
  LPHTTPADDREQUESTHEADERSA	_HttpAddRequestHeadersA;
};

