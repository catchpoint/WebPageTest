#include "StdAfx.h"
#include "webpagetest.h"
#include <Wininet.h>

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WebPagetest::WebPagetest(WptSettings &settings, WptStatus &status):
  _settings(settings)
  ,_status(status){
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WebPagetest::~WebPagetest(void){
}

/*-----------------------------------------------------------------------------
  Fetch a test from the server
-----------------------------------------------------------------------------*/
bool WebPagetest::GetTest(WptTest& test){
  bool ret = false;

  // build the url for the request
  CString url = _settings._server + _T("work/getwork.php?");
  url += CString(_T("location=")) + _settings._location;
  if( _settings._key.GetLength() )
    url += CString(_T("key=")) + _settings._key;

  CString test_string = HttpGet(url);
  if( test_string.GetLength() ){
    ret = test.Load(test_string);
  }

  return ret;
}

/*-----------------------------------------------------------------------------
  Send the test result back to the server
-----------------------------------------------------------------------------*/
bool WebPagetest::TestDone(WptTest& test, TestData& data){
  bool ret = false;

  CString headers;
  CStringA form_data, footer;
  DWORD content_length = 0;

  if (data.BuildFormData(_settings, test, headers, footer, form_data, 
                        content_length)) {
    // use WinInet to do the POST (quite a few steps)
    HINTERNET internet = InternetOpen(_T("WebPagetest Driver"), 
              INTERNET_OPEN_TYPE_PRECONFIG, NULL, NULL, 0);
    if (internet) {
      CString url = _settings._server + _T("work/workdone.php");
      CString host, object;
      unsigned short port;
      if (CrackUrl(url, host, port, object)) {
        HINTERNET connect = InternetConnect(internet, host, port, NULL, NULL,
                                            INTERNET_SERVICE_HTTP, 0, 0);
        if (connect){
          HINTERNET request = HttpOpenRequest(connect, _T("POST"), object, 
                                                NULL, NULL, NULL, 
                                                INTERNET_FLAG_NO_CACHE_WRITE |
                                                INTERNET_FLAG_NO_UI |
                                                INTERNET_FLAG_PRAGMA_NOCACHE |
                                                INTERNET_FLAG_RELOAD, NULL);
          if (request){
            if (HttpAddRequestHeaders(request, headers, headers.GetLength(), 
                            HTTP_ADDREQ_FLAG_ADD | HTTP_ADDREQ_FLAG_REPLACE)) {
              INTERNET_BUFFERS buffers;
              memset( &buffers, 0, sizeof(buffers) );
              buffers.dwStructSize = sizeof(buffers);
              buffers.dwBufferTotal = content_length;
              if (HttpSendRequestEx(request, &buffers, NULL, 0, NULL)) {
                DWORD bytes_written;
                if (InternetWriteFile(request, (LPCSTR)form_data, 
                                      form_data.GetLength(), &bytes_written)) {
                  if (InternetWriteFile(request, (LPCSTR)footer, 
                                        footer.GetLength(), &bytes_written)) {
                    if (HttpEndRequest(request, NULL, 0, 0)) {
                      ret = true;
                    }
                  }
                }
              }
            }
            InternetCloseHandle(request);
          }
          InternetCloseHandle(connect);
        }
      }
      InternetCloseHandle(internet);
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
  Perform a http GET operation and return the body as a string
-----------------------------------------------------------------------------*/
CString WebPagetest::HttpGet(CString url){
  CString result;

  // Use WinInet to make the request
  HINTERNET internet = InternetOpen(_T("WebPagetest Driver"), 
                                    INTERNET_OPEN_TYPE_PRECONFIG,
                                    NULL, NULL, 0);
  if (internet) {
    HINTERNET file = InternetOpenUrl(internet, url, NULL, 0, 
                                INTERNET_FLAG_NO_CACHE_WRITE | 
                                INTERNET_FLAG_NO_UI | 
                                INTERNET_FLAG_PRAGMA_NOCACHE | 
                                INTERNET_FLAG_RELOAD, NULL);
    if (file) {
      char buff[4096];
      DWORD bytes_read;
      while( InternetReadFile(file, buff, sizeof(buff), &bytes_read) && 
              bytes_read){
        // NULL-terminate it and add it to our response string
        buff[bytes_read] = 0;
        result += CA2T(buff);
      }
      InternetCloseHandle(file);
    }
    InternetCloseHandle(internet);
  }

  return result;
}

/*-----------------------------------------------------------------------------
  Helper function to crack an url into it's component parts
-----------------------------------------------------------------------------*/
bool WebPagetest::CrackUrl(CString url, CString &host, unsigned short &port,
                            CString& object){
  bool ret = false;

  URL_COMPONENTS parts;
  memset(&parts, 0, sizeof(parts));
  TCHAR szHost[10000];
  TCHAR path[10000];
  TCHAR extra[10000];
    
  memset(szHost, 0, sizeof(szHost));
  memset(path, 0, sizeof(path));
  memset(extra, 0, sizeof(extra));

  parts.lpszHostName = szHost;
  parts.dwHostNameLength = _countof(szHost);
  parts.lpszUrlPath = path;
  parts.dwUrlPathLength = _countof(path);
  parts.lpszExtraInfo = extra;
  parts.dwExtraInfoLength = _countof(extra);
  parts.dwStructSize = sizeof(parts);

  if( InternetCrackUrl((LPCTSTR)url, url.GetLength(), 0, &parts) ){
      ret = true;
      host = szHost;
      port = parts.nPort;
      object = path;
      object += extra;
      if( !port )
        port = INTERNET_DEFAULT_HTTP_PORT;
  }
  return ret;
}