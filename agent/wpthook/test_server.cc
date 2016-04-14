/******************************************************************************
Copyright (c) 2010, Google Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without 
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, 
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of the <ORGANIZATION> nor the names of its contributors 
    may be used to endorse or promote products derived from this software 
    without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE 
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL 
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER 
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, 
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
******************************************************************************/

#include "StdAfx.h"
#include "test_server.h"
#include "wpthook.h"
#include "wpt_test_hook.h"
#include "shared_mem.h"
#include "mongoose/mongoose.h"
#include "test_state.h"
#include "trace.h"
#include "requests.h"
#include <atlutil.h>

static TestServer * _globaltest__server = NULL;

// definitions
static const TCHAR * BROWSER_STARTED_EVENT = _T("Global\\wpt_browser_started");
static const TCHAR * BROWSER_DONE_EVENT = _T("Global\\wpt_browser_done");
static const DWORD RESPONSE_OK = 200;
static const char * RESPONSE_OK_STR = "OK";

static const DWORD RESPONSE_ERROR_NOtest_ = 404;
static const char * RESPONSE_ERROR_NOtest__STR = "ERROR: No Test";

static const DWORD RESPONSE_ERROR_NOT_IMPLEMENTED = 403;
static const char * RESPONSE_ERROR_NOT_IMPLEMENTED_STR = 
                                                      "ERROR: Not Implemented";
static const char * BLANK_HTML = "HTTP/1.1 200 OK\r\n"
    "Cache: no-cache\r\n"
    "Content-Type:text/html\r\n"
    "\r\n"
    "<html><head><title>Blank</title>\r\n"
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, "
    "maximum-scale=1.0, user-scalable=0;\">\r\n"
    "<style type=\"text/css\">\r\n"
    "body {background-color: #FFF;}\r\n"
    "</style>\r\n"
    "<script type=\"text/javascript\">\r\n"
    "var dummy=1;\r\n"
    "</script>\r\n"
    "</head><body>\r\n"
    "<img style=\"position: fixed; left: -2px; width: 1px; height: 1px\" "
    "src=\"https://www.google.com/favicon.ico\">\r\n"
    "</body></html>";

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
TestServer::TestServer(WptHook& hook, WptTestHook &test, TestState& test_state,
                        Requests& requests, Trace &trace)
  :mongoose_context_(NULL)
  ,hook_(hook)
  ,test_(test)
  ,test_state_(test_state)
  ,requests_(requests)
  ,trace_(trace)
  ,started_(false) {
  InitializeCriticalSection(&cs);
  last_cpu_idle_.QuadPart = 0;
  last_cpu_kernel_.QuadPart = 0;
  last_cpu_user_.QuadPart = 0;
  start_check_time_.QuadPart = 0;
  QueryPerformanceFrequency(&start_check_freq_);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
TestServer::~TestServer(void){
  DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
  Stub callback to trampoline into the class instance
-----------------------------------------------------------------------------*/
static void *MongooseCallbackStub(enum mg_event event,
                           struct mg_connection *conn,
                           const struct mg_request_info *request_info) {
  void *processed = "yes";

  if (_globaltest__server)
    _globaltest__server->MongooseCallback(event, conn, request_info);

  return processed;
}

/*-----------------------------------------------------------------------------
  Start the local HTTP server
-----------------------------------------------------------------------------*/
bool TestServer::Start(void){
  bool ret = false;

  _globaltest__server = this;

  static const char *options[] = {
    "listening_ports", "127.0.0.1:8888",
    "num_threads", "5",
    NULL
  };

  mongoose_context_ = mg_start(&MongooseCallbackStub, options);
  if (mongoose_context_)
    ret = true;

  return ret;
}

/*-----------------------------------------------------------------------------
  Stop the local HTTP server
-----------------------------------------------------------------------------*/
void TestServer::Stop(void){
  if (mongoose_context_) {
    mg_stop(mongoose_context_);
    mongoose_context_ = NULL;
  }
  HANDLE browser_done_event = OpenEvent(EVENT_MODIFY_STATE , FALSE,
                                        BROWSER_DONE_EVENT);
  if (browser_done_event) {
    SetEvent(browser_done_event);
    CloseHandle(browser_done_event);
  }
  _globaltest__server = NULL;
}

/*-----------------------------------------------------------------------------
  We received a request that we need to respond to
-----------------------------------------------------------------------------*/
void TestServer::MongooseCallback(enum mg_event event,
                      struct mg_connection *conn,
                      const struct mg_request_info *request_info){

  hook_.LateInit();
  EnterCriticalSection(&cs);
  if (event == MG_NEW_REQUEST) {
    //OutputDebugStringA(CStringA(request_info->uri) + CStringA("?") + request_info->query_string);
    WptTrace(loglevel::kFrequentEvent, _T("[wpthook] HTTP Request: %s\n"), 
                    (LPCTSTR)CA2T(request_info->uri, CP_UTF8));
    WptTrace(loglevel::kFrequentEvent, _T("[wpthook] HTTP Query String: %s\n"), 
                    (LPCTSTR)CA2T(request_info->query_string, CP_UTF8));
    if (strcmp(request_info->uri, "/task") == 0) {
      CStringA task;
      if (OkToStart()) {
        bool record = false;
        test_.GetNextTask(task, record);
        if (record)
          hook_.Start();
        }
      SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, task);
    } else if (strcmp(request_info->uri, "/event/load") == 0) {
      CString fixed_viewport = GetParam(request_info->query_string,
                                        "fixedViewport");
      if (!fixed_viewport.IsEmpty())
        test_state_._fixed_viewport = _ttoi(fixed_viewport);
      DWORD dom_count = 0;
      if (GetDwordParam(request_info->query_string, "domCount", dom_count) &&
          dom_count)
        test_state_._dom_element_count = dom_count;
      // Browsers may get "/event/window_timing" to set "onload" time.
      DWORD load_time = 0;
      GetDwordParam(request_info->query_string, "timestamp", load_time);
      hook_.OnLoad();
      SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, "");
    } else if (strcmp(request_info->uri, "/event/window_timing") == 0) {
      //OutputDebugStringA(CStringA("Window timing:") + request_info->query_string);
      DWORD start = 0;
      GetDwordParam(request_info->query_string, "domContentLoadedEventStart",
                    start);
      DWORD end = 0;
      GetDwordParam(request_info->query_string, "domContentLoadedEventEnd",
                    end);
      if (start < 0 || start > 3600000)
        start = 0;
      if (end < 0 || end > 3600000)
        end = 0;
      hook_.SetDomContentLoadedEvent(start, end);
      start = 0;
      GetDwordParam(request_info->query_string, "loadEventStart", start);
      end = 0;
      GetDwordParam(request_info->query_string, "loadEventEnd", end);
      if (start < 0 || start > 3600000)
        start = 0;
      if (end < 0 || end > 3600000)
        end = 0;
      hook_.SetLoadEvent(start, end);
      DWORD first_paint = 0;
      GetDwordParam(request_info->query_string, "msFirstPaint", first_paint);
      if (first_paint < 0 || first_paint > 3600000)
        first_paint = 0;
      hook_.SetFirstPaint(first_paint);
      DWORD dom_interactive = 0;
      GetDwordParam(request_info->query_string, "domInteractive", dom_interactive);
      if (dom_interactive < 0 || dom_interactive > 3600000)
        dom_interactive = 0;
      hook_.SetDomInteractiveEvent(dom_interactive);
      SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, "");
    } else if (strcmp(request_info->uri, "/event/navigate") == 0) {
      hook_.OnNavigate();
      SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, "");
    } else if (strcmp(request_info->uri, "/event/complete") == 0) {
      hook_.OnNavigateComplete();
      SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, "");
    } else if (strcmp(request_info->uri, "/event/navigate_error") == 0) {
      CString err_str = GetUnescapedParam(request_info->query_string, "str");
      test_state_.OnStatusMessage(CString(_T("Navigation Error: ")) + err_str);
      GetIntParam(request_info->query_string, "error",
                  test_state_._test_result);
      SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, "");
    } else if (strcmp(request_info->uri,"/event/all_dom_elements_loaded")==0) {
      DWORD load_time = 0;
      GetDwordParam(request_info->query_string, "load_time", load_time);
      hook_.OnAllDOMElementsLoaded(load_time);
      // TODO: Log the all dom elements loaded time into its metric.
      SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, "");
    } else if (strcmp(request_info->uri, "/event/dom_element") == 0) {
      DWORD time = 0;
      GetDwordParam(request_info->query_string, "load_time", time);
      CString dom_element = GetUnescapedParam(request_info->query_string,
                                               "name_value");
      // TODO: Store the dom element loaded time.
      SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, "");
    } else if (strcmp(request_info->uri, "/event/title") == 0) {
      CString title = GetParam(request_info->query_string, "title");
      if (!title.IsEmpty())
        test_state_.TitleSet(title);
      SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, "");
    } else if (strcmp(request_info->uri, "/event/status") == 0) {
      CString status = GetParam(request_info->query_string, "status");
      if (!status.IsEmpty())
        test_state_.OnStatusMessage(status);
      SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, "");
    } else if (strcmp(request_info->uri, "/event/request_data") == 0) {
      CString body = GetPostBody(conn, request_info);
      //OutputDebugStringA("\n\n*****\n\n");
      //OutputDebugString(body);
      requests_.ProcessBrowserRequest(body);
      SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, "");
    } else if (strcmp(request_info->uri, "/event/initiator") == 0) {
      CStringA body = GetPostBodyA(conn, request_info);
      requests_.ProcessInitiatorData(body);
      SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, "");
    } else if (strcmp(request_info->uri, "/event/user_timing") == 0) {
      CString body = GetPostBody(conn, request_info);
      test_state_.SetUserTiming(body);
      SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, "");
    } else if (strcmp(request_info->uri, "/event/console_log") == 0) {
      if (test_state_._active) {
        CString body = GetPostBody(conn, request_info);
        test_state_.AddConsoleLogMessage(body);
      }
      SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, "");
    } else if (strcmp(request_info->uri, "/event/timed_event") == 0) {
      CString body = GetPostBody(conn, request_info);
      //OutputDebugStringW("Timed event: " + body);
      test_state_.AddTimedEvent(body);
      SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, "");
    } else if (strcmp(request_info->uri, "/event/custom_metrics") == 0) {
      CString body = GetPostBody(conn, request_info);
      //OutputDebugStringW("Custom Metrics: " + body);
      test_state_.SetCustomMetrics(body);
      SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, "");
    } else if (strcmp(request_info->uri, "/event/stats") == 0) {
      DWORD dom_count = 0;
      //OutputDebugStringA(CStringA("DOM Count:") + request_info->query_string);
      if (GetDwordParam(request_info->query_string, "domCount", dom_count) &&
          dom_count)
        test_state_._dom_element_count = dom_count;
      SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, "");
    } else if (strcmp(request_info->uri, "/event/trace") == 0) {
      CStringA body = CT2A(GetPostBody(conn, request_info));
      if (body.GetLength())
        trace_.AddEvents(body);
      SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, "");
    } else if (strcmp(request_info->uri, "/event/paint") == 0) {
      //test_state_.PaintEvent(0, 0, 0, 0);
      SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, "");
    } else if (strcmp(request_info->uri, "/event/received_data") == 0) {
      test_state_.received_data_ = true;
    } else if (strncmp(request_info->uri, "/blank", 6) == 0) {
      test_state_.UpdateBrowserWindow();
      mg_printf(conn, BLANK_HTML);
    } else if (strcmp(request_info->uri, "/event/responsive") == 0) {
      GetIntParam(request_info->query_string, "isResponsive",
                  test_state_._is_responsive);
      GetIntParam(request_info->query_string, "viewportSpecified",
                  test_state_._viewport_specified);
      test_state_.CheckResponsive();
      SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, "");
    } else if (strcmp(request_info->uri, "/event/debug") == 0) {
      CStringA body = CT2A(GetPostBody(conn, request_info));
      OutputDebugStringA(body);
      SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, "");
    } else {
        // unknown command fall-through
        SendResponse(conn, request_info, RESPONSE_ERROR_NOT_IMPLEMENTED, 
                    RESPONSE_ERROR_NOT_IMPLEMENTED_STR, "");
    }
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
  Send a JSON/JSONP response back to the caller
-----------------------------------------------------------------------------*/
void TestServer::SendResponse(struct mg_connection *conn,
                  const struct mg_request_info *request_info,
                  DWORD response_code,
                  CStringA response_code_string,
                  CStringA response_data){

  CStringA callback;
  CStringA request_id;

  // process the query parameters
  if (request_info->query_string) {
    size_t query_len = strlen(request_info->query_string);
    if (query_len) {
      char param[1024];
      const char *qs = request_info->query_string;

      // see if it is a jsonp call
      mg_get_var(qs, query_len, "callback", param, sizeof(param));
      if (param[0] != '\0') {
        callback = param;
      }

      // get the request ID if it was specified
      mg_get_var(qs, query_len, "r", param, sizeof(param));
      if (param[0] != '\0') {
        request_id = param;
      }
    }
  }

  // start with the HTTP Header
  CStringA response = "HTTP/1.1 200 OK\r\n"
    "Server: wptdriver\r\n"
    "Cache: no-cache\r\n"
    "Pragma: no-cache\r\n"
    "Content-Type: application/json\r\n";

  if (!callback.IsEmpty())
    response += callback + "(";

  // now the standard REST container
  CStringA buff;
  CStringA data = "";
  buff.Format("{\"statusCode\":%d,\"statusText\":\"%s\"", response_code, 
    (LPCSTR)response_code_string);
  data += buff;
  if (request_id.GetLength())
    data += CStringA(",\"requestId\":\"") + request_id + "\"";

  // and the actual data
  if (response_data.GetLength()) {
    data += ",\"data\":";
    data += response_data;
  }

  // close it out
  data += "}";
  if (!callback.IsEmpty())
    data += ");";

  DWORD len = data.GetLength();
  buff.Format("Content-Length: %d\r\n", len);
  response += buff;
  response += "\r\n";
  response += data;

  // and finally, send it
  mg_write(conn, (LPCSTR)response, response.GetLength());
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CString TestServer::GetParam(const CString query_string, 
                             const CString key) const {
  CString value;
  int pos = 0;
  CString token = query_string.Tokenize(_T("&"), pos);
  bool is_found = false;
  while (pos >= 0 && !is_found) {
    int split = token.Find('=');
    if (split > 0) {
      CString k = token.Left(split).Trim();
      CString v = token.Mid(split + 1).Trim();
      if (!key.CompareNoCase(k)) {
        is_found = true;
        value = v;
      }
    }
    token = query_string.Tokenize(_T("&"), pos);
  }
  return value;
}

bool TestServer::GetDwordParam(const CString query_string,
                                const CString key, DWORD& value) const {
  bool found = false;
  CString string_value = GetParam(query_string, key);
  if (string_value.GetLength()) {
    found = true;
    value = _ttoi(string_value);
  }
  return found;
}

bool TestServer::GetIntParam(const CString query_string,
                                const CString key, int& value) const {
  bool found = false;
  CString string_value = GetParam(query_string, key);
  if (string_value.GetLength()) {
    found = true;
    value = _ttoi(string_value);
  }
  return found;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CString TestServer::GetUnescapedParam(const CString query_string,
                                      const CString key) const {
  CString value = GetParam(query_string, key);
  DWORD len;
  TCHAR buff[4096];
  AtlUnescapeUrl((LPCTSTR)value, buff, &len, _countof(buff));
  value = CStringA(buff);
  return value;
}

/*-----------------------------------------------------------------------------
  Process the body of a post and return it as a string
-----------------------------------------------------------------------------*/
CString TestServer::GetPostBody(struct mg_connection *conn,
                      const struct mg_request_info *request_info){
  CString body;
  const char * length_string = mg_get_header(conn, "Content-Length");
  if (length_string) {
    int length = atoi(length_string);
    if (length) {
      char * buff = (char *)malloc(length + 1);
      if (buff) {
        while (length) {
          int bytes = mg_read(conn, buff, length);
          if (bytes && bytes <= length) {
            buff[bytes] = 0;
            body += CA2T(buff, CP_UTF8);
            length -= bytes;
          }
        }
        free(buff);
      }
    }
  }

  return body;
}
CStringA TestServer::GetPostBodyA(struct mg_connection *conn,
                                  const struct mg_request_info *request_info){
  CStringA body;
  const char * length_string = mg_get_header(conn, "Content-Length");
  if (length_string) {
    int length = atoi(length_string);
    if (length) {
      char * buff = (char *)malloc(length + 1);
      if (buff) {
        while (length) {
          int bytes = mg_read(conn, buff, length);
          if (bytes && bytes <= length) {
            buff[bytes] = 0;
            body += CStringA(buff);
            length -= bytes;
          }
        }
        free(buff);
      }
    }
  }

  return body;
}

bool TestServer::OkToStart() {
  if (!started_) {
    LARGE_INTEGER now;
    QueryPerformanceCounter(&now);
    double elapsed = 0;
    if (start_check_time_.QuadPart) {
      if (now.QuadPart > start_check_time_.QuadPart &&
          start_check_freq_.QuadPart > 0)
        elapsed = (double)(now.QuadPart - start_check_time_.QuadPart) /
                  (double)start_check_freq_.QuadPart;
    } else {
      start_check_time_.QuadPart = now.QuadPart;
    }
    if (elapsed > 30) {
      started_ = true;
    } else {
      // calculate CPU utilization
      FILETIME idle_time, kernel_time, user_time;
      if (GetSystemTimes(&idle_time, &kernel_time, &user_time)) {
        ULARGE_INTEGER k, u, i;
        k.LowPart = kernel_time.dwLowDateTime;
        k.HighPart = kernel_time.dwHighDateTime;
        u.LowPart = user_time.dwLowDateTime;
        u.HighPart = user_time.dwHighDateTime;
        i.LowPart = idle_time.dwLowDateTime;
        i.HighPart = idle_time.dwHighDateTime;
        if(last_cpu_idle_.QuadPart || last_cpu_kernel_.QuadPart || 
           last_cpu_user_.QuadPart) {
          __int64 idle = i.QuadPart - last_cpu_idle_.QuadPart;
          __int64 kernel = k.QuadPart - last_cpu_kernel_.QuadPart;
          __int64 user = u.QuadPart - last_cpu_user_.QuadPart;
          if (kernel || user) {
            int cpu_utilization = (int)((((kernel + user) - idle) * 100) 
                                          / (kernel + user));
            if (cpu_utilization < 25)
              started_ = true;
          }
        }
        last_cpu_idle_.QuadPart = i.QuadPart;
        last_cpu_kernel_.QuadPart = k.QuadPart;
        last_cpu_user_.QuadPart = u.QuadPart;
      }
    }
    if (started_) {
      // Signal to wptdriver which process it should wait for and that we started
      shared_browser_process_id = GetCurrentProcessId();
      HANDLE browser_started_event = OpenEvent(EVENT_MODIFY_STATE , FALSE,
                                                BROWSER_STARTED_EVENT);
      if (browser_started_event) {
        SetEvent(browser_started_event);
        CloseHandle(browser_started_event);
      }
    }
  }
  return started_;
}