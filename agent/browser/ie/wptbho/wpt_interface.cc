#include "StdAfx.h"
#include "wpt_interface.h"
#include "wpt_task.h"

const TCHAR * TASK_REQUEST = _T("http://127.0.0.1:8888/task");
const TCHAR * EVENT_ON_NAVIGATE = _T("http://127.0.0.1:8888/event/navigate");
const TCHAR * EVENT_ON_LOAD = _T("http://127.0.0.1:8888/event/load");
const TCHAR * EVENT_ON_NAVIGATE_ERROR =
    _T("http://127.0.0.1:8888/event/navigate_error");
const TCHAR * EVENT_ON_TITLE = _T("http://127.0.0.1:8888/event/title?title=");
const TCHAR * EVENT_ON_STATUS = 
    _T("http://127.0.0.1:8888/event/status?status=");
const TCHAR * EVENT_WINDOW_TIMING = 
    _T("http://127.0.0.1:8888/event/window_timing?");
const TCHAR * EVENT_DOM_ELEMENT_COUNT = 
    _T("http://127.0.0.1:8888/event/stats?domCount=");
const TCHAR * EVENT_TIMED = 
    _T("http://127.0.0.1:8888/event/timed_event");
const TCHAR * EVENT_CUSTOM_METRICS =
    _T("http://127.0.0.1:8888/event/custom_metrics");

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptInterface::WptInterface(void) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptInterface::~WptInterface(void) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptInterface::GetTask(WptTask& task) {
  bool has_task = false;
  CString response;
  if (HttpGet(TASK_REQUEST, response)) {
    ATLTRACE(_T("[wptbho] Task String: %s"), response);
    has_task = task.ParseTask(response);
  }

  return has_task;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptInterface::OnLoad(CString options) {
  CString url = EVENT_ON_LOAD;
  if (options.GetLength())
    url += CString(_T("?")) + options;
  HttpPost(url);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptInterface::OnNavigate() {
  HttpPost(EVENT_ON_NAVIGATE);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptInterface::OnNavigateError(CString options) {
  CString url = EVENT_ON_NAVIGATE_ERROR;
  if (options.GetLength())
    url += CString(_T("?")) + options;
  HttpPost(url);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptInterface::OnTitle(CString title) {
  CString cmd = EVENT_ON_TITLE;
  char buff[4096];
  DWORD len = _countof(buff);
  if (InternetCanonicalizeUrlA(CT2A(title, CP_UTF8), buff, &len, 
                                  ICU_ENCODE_PERCENT))
    title = buff;
  HttpPost(cmd + title);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptInterface::OnStatus(CString status) {
  CString cmd = EVENT_ON_STATUS;
  char buff[4096];
  DWORD len = _countof(buff);
  if (InternetCanonicalizeUrlA(CT2A(status, CP_UTF8), buff, &len, 
                                  ICU_ENCODE_PERCENT))
    status = buff;
  HttpPost(cmd + status);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void  WptInterface::ReportDOMElementCount(DWORD count) {
  CString url;
  url.Format(_T("%s%d"), EVENT_DOM_ELEMENT_COUNT, count);
  HttpPost(url);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void  WptInterface::ReportNavigationTiming(CString timing) {
  CString url(EVENT_WINDOW_TIMING);
  HttpPost(url + timing);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void  WptInterface::ReportUserTiming(CString events) {
  HttpPost(EVENT_TIMED, CT2A(events, CP_UTF8));
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void  WptInterface::ReportCustomMetrics(CString custom_metrics) {
  HttpPost(EVENT_CUSTOM_METRICS, CT2A(custom_metrics, CP_UTF8));
}

/*-----------------------------------------------------------------------------
  Perform a http GET operation and return the body as a string
-----------------------------------------------------------------------------*/
bool WptInterface::HttpGet(CString url, CString& response) {
  bool result = false;
  response.Empty();
  HINTERNET internet = InternetOpen(_T("WebPagetest BHO"), 
                                    INTERNET_OPEN_TYPE_PRECONFIG,
                                    NULL, NULL, 0);
  if (internet) {
    DWORD timeout = 30000;
    InternetSetOption(internet, INTERNET_OPTION_CONNECT_TIMEOUT,
                      &timeout, sizeof(timeout));
    InternetSetOption(internet, INTERNET_OPTION_RECEIVE_TIMEOUT,
                      &timeout, sizeof(timeout));
    InternetSetOption(internet, INTERNET_OPTION_SEND_TIMEOUT,
                      &timeout, sizeof(timeout));
    HINTERNET http_request = InternetOpenUrl(internet, url, NULL, 0, 
                                INTERNET_FLAG_NO_CACHE_WRITE | 
                                INTERNET_FLAG_NO_UI | 
                                INTERNET_FLAG_PRAGMA_NOCACHE | 
                                INTERNET_FLAG_RELOAD, NULL);
    if (http_request) {
      char buff[4097];
      DWORD bytes_read;
      HANDLE file = INVALID_HANDLE_VALUE;
      while (InternetReadFile(http_request, buff, sizeof(buff) - 1, 
              &bytes_read) && bytes_read) {
        // NULL-terminate it and add it to our response string
        buff[bytes_read] = 0;
        response += CA2T(buff, CP_UTF8);
      }
      InternetCloseHandle(http_request);
    }
    InternetCloseHandle(internet);
  }

  if (response.GetLength())
    result = true;

  return result;
}

/*-----------------------------------------------------------------------------
  Perform a http POST operation and return the body as a string
-----------------------------------------------------------------------------*/
bool WptInterface::HttpPost(CString url, const char * body) {
  bool result = false;
  HINTERNET internet = InternetOpen(_T("WebPagetest BHO"), 
                                    INTERNET_OPEN_TYPE_PRECONFIG,
                                    NULL, NULL, 0);
  if (internet) {
    DWORD timeout = 30000;
    InternetSetOption(internet, INTERNET_OPTION_CONNECT_TIMEOUT,
                      &timeout, sizeof(timeout));
    InternetSetOption(internet, INTERNET_OPTION_RECEIVE_TIMEOUT,
                      &timeout, sizeof(timeout));
    InternetSetOption(internet, INTERNET_OPTION_SEND_TIMEOUT,
                      &timeout, sizeof(timeout));
    CString host, object;
    unsigned short port;
    DWORD secure_flag;
    if (CrackUrl(url, host, port, object, secure_flag)) {
      HINTERNET connect = InternetConnect(internet, host, port, NULL, NULL,
                                          INTERNET_SERVICE_HTTP, 0, 0);
      if (connect) {
        HINTERNET request = HttpOpenRequest(connect, _T("POST"), object, 
                                              NULL, NULL, NULL, 
                                              INTERNET_FLAG_NO_CACHE_WRITE |
                                              INTERNET_FLAG_NO_UI |
                                              INTERNET_FLAG_PRAGMA_NOCACHE |
                                              INTERNET_FLAG_RELOAD |
                                              INTERNET_FLAG_KEEP_CONNECTION |
                                              secure_flag, NULL);
        if (request) {
          DWORD body_len = 0;
          if (body)
            body_len = strlen(body);
          if (HttpSendRequest(request, NULL, 0, (LPVOID)body, body_len))
            result = true;
          InternetCloseHandle(request);
        }
        InternetCloseHandle(connect);
      }
    }
    InternetCloseHandle(internet);
  }

  return result;
}

/*-----------------------------------------------------------------------------
  Helper function to crack an url into it's component parts
-----------------------------------------------------------------------------*/
bool WptInterface::CrackUrl(CString url, CString &host, unsigned short &port,
                           CString& object, DWORD &secure_flag){
  bool ret = false;

  secure_flag = 0;
  URL_COMPONENTS parts;
  memset(&parts, 0, sizeof(parts));
  TCHAR szHost[10000];
  TCHAR path[10000];
  TCHAR extra[10000];
  TCHAR scheme[100];
    
  memset(szHost, 0, sizeof(szHost));
  memset(path, 0, sizeof(path));
  memset(extra, 0, sizeof(extra));
  memset(scheme, 0, sizeof(scheme));

  parts.lpszHostName = szHost;
  parts.dwHostNameLength = _countof(szHost);
  parts.lpszUrlPath = path;
  parts.dwUrlPathLength = _countof(path);
  parts.lpszExtraInfo = extra;
  parts.dwExtraInfoLength = _countof(extra);
  parts.lpszScheme = scheme;
  parts.dwSchemeLength = _countof(scheme);
  parts.dwStructSize = sizeof(parts);

  if( InternetCrackUrl((LPCTSTR)url, url.GetLength(), 0, &parts) ){
      ret = true;
      host = szHost;
      port = parts.nPort;
      object = path;
      object += extra;
      if (!host.CompareNoCase(_T("www.webpagetest.org")))
        host = _T("agent.webpagetest.org");
      if (!lstrcmpi(scheme, _T("https"))) {
        secure_flag = INTERNET_FLAG_SECURE |
                      INTERNET_FLAG_IGNORE_CERT_CN_INVALID |
                      INTERNET_FLAG_IGNORE_CERT_DATE_INVALID;
        if (!port)
          port = INTERNET_DEFAULT_HTTPS_PORT;
      } else if (!port)
        port = INTERNET_DEFAULT_HTTP_PORT;
  }
  return ret;
}
