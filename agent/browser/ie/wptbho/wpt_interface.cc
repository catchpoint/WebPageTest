#include "StdAfx.h"
#include "wpt_interface.h"
#include "wpt_task.h"

const TCHAR * TASK_REQUEST = _T("http://127.0.0.1:8888/task");
const TCHAR * EVENT_ON_NAVIGATE = _T("http://127.0.0.1:8888/event/navigate");
const TCHAR * EVENT_ON_LOAD = _T("http://127.0.0.1:8888/event/load");
const TCHAR * EVENT_ON_TITLE = _T("http://127.0.0.1:8888/event/title?title=");
const TCHAR * EVENT_ON_STATUS = 
                              _T("http://127.0.0.1:8888/event/status?status=");

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
    AtlTrace(response);
    has_task = task.ParseTask(response);
  }

  return has_task;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptInterface::OnLoad(CString options) {
  CString response;
  CString url = EVENT_ON_LOAD;
  if (options.GetLength())
    url += CString(_T("?")) + options;
  HttpGet(url, response);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptInterface::OnNavigate() {
  CString response;
  HttpGet(EVENT_ON_NAVIGATE, response);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptInterface::OnTitle(CString title) {
  CString response;
  CString cmd = EVENT_ON_TITLE;
  char buff[4096];
  DWORD len = _countof(buff);
  if (InternetCanonicalizeUrlA(CT2A(title, CP_UTF8), buff, &len, 
                                  ICU_ENCODE_PERCENT))
    title = buff;
  HttpGet(cmd + title, response);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptInterface::OnStatus(CString status) {
  CString response;
  CString cmd = EVENT_ON_STATUS;
  char buff[4096];
  DWORD len = _countof(buff);
  if (InternetCanonicalizeUrlA(CT2A(status, CP_UTF8), buff, &len, 
                                  ICU_ENCODE_PERCENT))
    status = buff;
  HttpGet(cmd + status, response);
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
        response += CA2T(buff);
      }
      InternetCloseHandle(http_request);
    }
    InternetCloseHandle(internet);
  }

  if (response.GetLength())
    result = true;

  return result;
}
