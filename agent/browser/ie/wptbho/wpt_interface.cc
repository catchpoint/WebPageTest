#include "StdAfx.h"
#include "wpt_interface.h"
#include "wpt_task.h"

const TCHAR * TASK_REQUEST = _T("http://127.0.0.1:8888/task");
const TCHAR * EVENT_ON_NAVIGATE = _T("http://127.0.0.1:8888/event/navigate");
const TCHAR * EVENT_ON_LOAD = _T("http://127.0.0.1:8888/event/load");
const TCHAR * EVENT_ON_TITLE = _T("http://127.0.0.1:8888/event/title?title=");

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
void WptInterface::OnLoad() {
  CString response;
  HttpGet(EVENT_ON_LOAD, response);
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
  TCHAR buff[4096];
  DWORD len = _countof(buff);
  if (InternetCanonicalizeUrl(title, buff, &len, ICU_ENCODE_PERCENT))
    title = buff;
  HttpGet(cmd + title, response);
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
