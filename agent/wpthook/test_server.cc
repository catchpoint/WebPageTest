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
#include "mongoose/mongoose.h"
#include "test_state.h"
#include "trace.h"
#include "requests.h"
#include <atlutil.h>

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
static const char * BLANK_RESPONSE = "";

static const char * BLANK_HTML = 
    "<html><head><title>Blank</title>\n"
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, "
    "maximum-scale=1.0, user-scalable=0;\">\n"
    "<style type=\"text/css\">\n"
    "body {background-color: #FFF;}\n"
    "</style>\n"
    "</head><body>\n"
    "</body></html>";

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
TestServer::TestServer(WptHook& hook, WptTestHook &test, TestState& test_state,
                        Requests& requests, Trace &trace)
  :server_thread_(NULL)
  ,hook_(hook)
  ,test_(test)
  ,test_state_(test_state)
  ,requests_(requests)
  ,trace_(trace)
  ,started_(false)
  ,shutting_down_(false)
  ,stored_ua_string_(false)
  ,logExtensionBlank_(NULL)
  ,logWaitForIdle_(NULL) {
  last_cpu_idle_.QuadPart = 0;
  last_cpu_kernel_.QuadPart = 0;
  last_cpu_user_.QuadPart = 0;
  start_check_time_.QuadPart = 0;
  idle_start_.QuadPart = 0;
  QueryPerformanceFrequency(&start_check_freq_);
  logExtensionStart_ = new LogDuration(CString(test_state_.shared_.ResultsFileBase()) + "_test_timing.log", "Extension Start");
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
TestServer::~TestServer(void){
  Stop();
}

/*-----------------------------------------------------------------------------
  Stub entry point for the background work thread
-----------------------------------------------------------------------------*/
static unsigned __stdcall MongooseThreadProc(void* arg) {
  TestServer * server = (TestServer *)arg;
  if (server)
    server->ThreadProc();
    
  return 0;
}

/*-----------------------------------------------------------------------------
  Stub callback to trampoline into the class instance
-----------------------------------------------------------------------------*/
static void ev_handler(struct mg_connection *c, int ev, void *p) {
  if (c->mgr->user_data && ev == MG_EV_HTTP_REQUEST) {
    struct http_message *hm = (struct http_message *) p;
    TestServer * server = (TestServer *)c->mgr->user_data;
    server->HTTPRequest(c, hm);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestServer::ThreadProc(void) {
  ATLTRACE("[wpthook] - Starting mongoose server");
  struct mg_mgr mgr;
  struct mg_connection *c;

  mg_mgr_init(&mgr, this);
  c = mg_bind(&mgr, "127.0.0.1:8888", ev_handler);
  mg_set_protocol_http_websocket(c);

  while (!shutting_down_) {
    mg_mgr_poll(&mgr, 100);
  }

  mg_mgr_free(&mgr);
  ATLTRACE("[wpthook] - mongoose server done");
}

/*-----------------------------------------------------------------------------
  Spawn a background thread to run the web server in
-----------------------------------------------------------------------------*/
bool TestServer::Start(void) {
  bool ret = false;

  if (!server_thread_) {
    server_thread_ = (HANDLE)_beginthreadex(0, 0, ::MongooseThreadProc, this, 0, 0);
    ret = true;
  }

  return ret;
}

/*-----------------------------------------------------------------------------
  Stop the local HTTP server
-----------------------------------------------------------------------------*/
void TestServer::Stop(void){
  shutting_down_ = true;
  if (server_thread_) {
    WaitForSingleObject(server_thread_, 10000);
    server_thread_ = NULL;
  }

  HANDLE browser_done_event = OpenEvent(EVENT_MODIFY_STATE , FALSE,
                                        BROWSER_DONE_EVENT);
  if (browser_done_event) {
    SetEvent(browser_done_event);
    CloseHandle(browser_done_event);
  }
}

/*-----------------------------------------------------------------------------
  We received a request that we need to respond to
-----------------------------------------------------------------------------*/
void TestServer::HTTPRequest(struct mg_connection *conn, struct http_message *message) {
  CStringA json_response, text_response, response_type;
  DWORD response_code = RESPONSE_OK;

  if (!shutting_down_) {
    hook_.LateInit();
    CStringA uri(message->uri.p, (int)message->uri.len);
    CStringA query_string(message->query_string.p, (int)message->query_string.len);
    //OutputDebugStringA(CStringA(message->uri) + CStringA("?") + message->query_string);
    // Keep track of CPU utilization so we will know what it looks like when we
    // get a request to actually start.
    ATLTRACE("[wpthook] (%d) HTTP Request: %s%s", GetCurrentThreadId(), (LPCSTR)uri, query_string.GetLength() ? (LPCSTR)("?" + query_string) : "");
    if ( uri == "/task") {
      if (!stored_ua_string_) {
        if (!test_state_.shared_.OverrodeUAString()) {
          mg_str * ua = mg_get_http_header(message, "User-Agent");
          if (ua) {
            CStringA user_agent(ua->p, (int)ua->len);
            ATLTRACE("Current UA string: %s", (LPCSTR)user_agent);
            HKEY ua_key;
            if (RegCreateKeyEx(HKEY_CURRENT_USER,
                _T("Software\\WebPagetest\\wptdriver\\BrowserUAStrings"), 0, 0, 0, 
                KEY_READ | KEY_WRITE, 0, &ua_key, 0) == ERROR_SUCCESS) {
              RegSetValueExA(ua_key, CT2A((LPCWSTR)test_._browser), 0, REG_SZ,
                            (const LPBYTE)(LPCSTR)user_agent, 
                            user_agent.GetLength() + 1);
              RegCloseKey(ua_key);
            }
          }
        }
        stored_ua_string_ = true;
      }
      CStringA task;
      if (logExtensionBlank_) {
        logExtensionBlank_->Stop();
        delete logExtensionBlank_;
        logExtensionBlank_ = NULL;
        logWaitForIdle_ = new LogDuration(CString(test_state_.shared_.ResultsFileBase()) + "_test_timing.log", "Wait For Idle");
      }
      if (started_ || OkToStart(true)) {
        if (logWaitForIdle_) {
          logWaitForIdle_->Stop();
          delete logWaitForIdle_;
          logWaitForIdle_ = NULL;
        }
        bool record = false;
        test_.GetNextTask(task, record);
        if (record)
          hook_.Start();
      }
      if (!task.IsEmpty()) {
        ATLTRACE("[wpthook] - task: %s", (LPCSTR)task);
      }
      json_response = task;
    } else if (uri == "/event/load") {
      CString fixed_viewport = GetParam(query_string, "fixedViewport");
      if (!fixed_viewport.IsEmpty())
        test_state_._fixed_viewport = _ttoi(fixed_viewport);
      DWORD dom_count = 0;
      if (GetDwordParam(query_string, "domCount", dom_count) &&
          dom_count)
        test_state_._dom_element_count = dom_count;
      // Browsers may get "/event/window_timing" to set "onload" time.
      DWORD load_time = 0;
      GetDwordParam(query_string, "timestamp", load_time);
      hook_.OnLoad();
    } else if (uri == "/event/window_timing") {
      //OutputDebugStringA(CStringA("Window timing:") + query_string);
      DWORD start = 0;
      GetDwordParam(query_string, "domContentLoadedEventStart",
                    start);
      DWORD end = 0;
      GetDwordParam(query_string, "domContentLoadedEventEnd",
                    end);
      if (start < 0 || start > 3600000)
        start = 0;
      if (end < 0 || end > 3600000)
        end = 0;
      hook_.SetDomContentLoadedEvent(start, end);
      start = 0;
      GetDwordParam(query_string, "loadEventStart", start);
      end = 0;
      GetDwordParam(query_string, "loadEventEnd", end);
      if (start < 0 || start > 3600000)
        start = 0;
      if (end < 0 || end > 3600000)
        end = 0;
      hook_.SetLoadEvent(start, end);
      DWORD first_paint = 0;
      GetDwordParam(query_string, "msFirstPaint", first_paint);
      if (first_paint < 0 || first_paint > 3600000)
        first_paint = 0;
      hook_.SetFirstPaint(first_paint);
      DWORD dom_interactive = 0;
      GetDwordParam(query_string, "domInteractive", dom_interactive);
      if (dom_interactive < 0 || dom_interactive > 3600000)
        dom_interactive = 0;
      hook_.SetDomInteractiveEvent(dom_interactive);
      DWORD dom_loading = 0;
      GetDwordParam(query_string, "domLoading", dom_loading);
      if (dom_loading < 0 || dom_loading > 3600000)
        dom_loading = 0;
      hook_.SetDomLoadingEvent(dom_loading);
    } else if (uri == "/event/navigate") {
      hook_.OnNavigate();
    } else if (uri == "/event/complete") {
      hook_.OnNavigateComplete();
    } else if (uri == "/event/navigate_error") {
      CString err_str = GetUnescapedParam(query_string, "str");
      test_state_.OnStatusMessage(CString(_T("Navigation Error: ")) + err_str);
      GetIntParam(query_string, "error",
                  test_state_._test_result);
    } else if (uri == "/event/all_dom_elements_loaded") {
      DWORD load_time = 0;
      GetDwordParam(query_string, "load_time", load_time);
      hook_.OnAllDOMElementsLoaded(load_time);
      // TODO: Log the all dom elements loaded time into its metric.
    } else if (uri == "/event/dom_element") {
      DWORD time = 0;
      GetDwordParam(query_string, "load_time", time);
      CString dom_element = GetUnescapedParam(query_string,
                                                "name_value");
      // TODO: Store the dom element loaded time.
    } else if (uri == "/event/title") {
      CString title = GetParam(query_string, "title");
      if (!title.IsEmpty())
        test_state_.TitleSet(title);
    } else if (uri == "/event/status") {
      CString status = GetParam(query_string, "status");
      if (!status.IsEmpty())
        test_state_.OnStatusMessage(status);
    } else if (uri == "/event/request_data") {
      CString body = GetPostBody(conn, message);
      //OutputDebugStringA("\n\n*****\n\n");
      //OutputDebugString(body);
      requests_.ProcessBrowserRequest(body);
    } else if (uri == "/event/initiator") {
      CStringA body = GetPostBodyA(conn, message);
      requests_.ProcessInitiatorData(body);
    } else if (uri == "/event/user_timing") {
      CString body = GetPostBody(conn, message);
      test_state_.SetUserTiming(body);
    } else if (uri == "/event/console_log") {
      if (test_state_._active) {
        CString body = GetPostBody(conn, message);
        test_state_.AddConsoleLogMessage(body);
      }
    } else if (uri == "/event/timed_event") {
      CString body = GetPostBody(conn, message);
      //OutputDebugStringW("Timed event: " + body);
      test_state_.AddTimedEvent(body);
    } else if (uri == "/event/custom_metrics") {
      CString body = GetPostBody(conn, message);
      //OutputDebugStringW("Custom Metrics: " + body);
      test_state_.SetCustomMetrics(body);
    } else if (uri == "/event/stats") {
      DWORD dom_count = 0;
      //OutputDebugStringA(CStringA("DOM Count:") + query_string);
      if (GetDwordParam(query_string, "domCount", dom_count) &&
          dom_count)
        test_state_._dom_element_count = dom_count;
    } else if (uri == "/event/trace") {
      CStringA body = CT2A(GetPostBody(conn, message));
      if (body.GetLength())
        trace_.AddEvents(body);
    } else if (uri == "/event/paint") {
      //test_state_.PaintEvent(0, 0, 0, 0);
    } else if (uri == "/event/received_data") {
      test_state_.received_data_ = true;
	  } else if (uri.Left(6) == "/blank") {
      if (logExtensionStart_) {
        logExtensionStart_->Stop();
        delete logExtensionStart_;
        logExtensionStart_ = NULL;
        logExtensionBlank_ = new LogDuration(CString(test_state_.shared_.ResultsFileBase()) + "_test_timing.log", "Extension Blank");
      }
      if (!started_)
        OkToStart(false);
      test_state_.UpdateBrowserWindow();
      text_response = BLANK_HTML;
      response_type = "text/html";
	  } else if (uri.Left(12) == "/viewport.js") {
      DWORD width = 0;
      DWORD height = 0;
      GetDwordParam(query_string, "w", width);
      GetDwordParam(query_string, "h", height);
      test_state_.UpdateBrowserWindow(width, height);
      text_response = BLANK_RESPONSE;
      response_type = "application/javascript";
    } else if (uri == "/event/responsive") {
      GetIntParam(query_string, "isResponsive",
                  test_state_._is_responsive);
      GetIntParam(query_string, "viewportSpecified",
                  test_state_._viewport_specified);
      test_state_.CheckResponsive();
    } else if (uri == "/event/debug") {
      CStringA body = CT2A(GetPostBody(conn, message));
      OutputDebugStringA(body);
    }
  }

  if (response_type.IsEmpty())
    SendJsonResponse(conn, message, json_response);
  else
    SendResponse(conn, message, text_response, response_type);
}

/*-----------------------------------------------------------------------------
  Send a JSON/JSONP response back to the caller
-----------------------------------------------------------------------------*/
void TestServer::SendJsonResponse(struct mg_connection *conn,
                  struct http_message *message,
                  CStringA response_data){

  CStringA callback;
  CStringA request_id;

  ATLTRACE("[wpthook] TestServer::SendJsonResponse");

  // process the query parameters
  if (message->query_string.len) {
    CStringA query_string(message->query_string.p, (int)message->query_string.len);
    callback = GetParam(query_string, "callback");
    request_id = GetParam(query_string, "r");
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
  CStringA buff("{\"statusCode\":200,\"statusText\":\"OK\"");
  CStringA data("");
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
  mg_send(conn, (LPCSTR)response, response.GetLength());
}

/*-----------------------------------------------------------------------------
  Send a text response back to the caller
-----------------------------------------------------------------------------*/
void TestServer::SendResponse(struct mg_connection *conn,
                  struct http_message *message,
                  CStringA response_data,
                  CStringA content_type){

  CStringA callback;
  CStringA request_id;

  ATLTRACE("[wpthook] TestServer::SendResponse (with content type)");

  // process the query parameters
  if (message->query_string.len) {
    CStringA query_string(message->query_string.p, (int)message->query_string.len);
    callback = GetParam(query_string, "callback");
    request_id = GetParam(query_string, "r");
  }

  // start with the HTTP Header
  CStringA response = "HTTP/1.1 200 OK\r\n"
    "Server: wptdriver\r\n"
    "Cache: no-cache\r\n"
    "Pragma: no-cache\r\n"
    "Content-Type: " + content_type + "\r\n";

  DWORD len = response_data.GetLength();
  CStringA buff;
  buff.Format("Content-Length: %d\r\n", len);
  response += buff;
  response += "\r\n";
  response += response_data;

  // and finally, send it
  mg_send(conn, (LPCSTR)response, response.GetLength());
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CStringA TestServer::GetParam(const CStringA query_string, 
                              const CStringA key) const {
  CStringA value;
  int pos = 0;
  CStringA token = query_string.Tokenize("&", pos);
  bool is_found = false;
  while (pos >= 0 && !is_found) {
    int split = token.Find('=');
    if (split > 0) {
      CStringA k = token.Left(split).Trim();
      CStringA v = token.Mid(split + 1).Trim();
      if (!key.CompareNoCase(k)) {
        is_found = true;
        value = v;
      }
    }
    token = query_string.Tokenize("&", pos);
  }
  return value;
}

bool TestServer::GetDwordParam(const CStringA query_string,
                               const CStringA key, DWORD& value) const {
  bool found = false;
  CStringA string_value = GetParam(query_string, key);
  if (string_value.GetLength()) {
    found = true;
    value = atol(string_value);
  }
  return found;
}

bool TestServer::GetIntParam(const CStringA query_string,
                                const CStringA key, int& value) const {
  bool found = false;
  CStringA string_value = GetParam(query_string, key);
  if (string_value.GetLength()) {
    found = true;
    value = atoi(string_value);
  }
  return found;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CStringA TestServer::GetUnescapedParam(const CStringA query_string,
                                       const CStringA key) const {
  CStringA value;
  CStringA v = GetParam(query_string, key);
  if (!v.IsEmpty()) {
    DWORD len;
    TCHAR buff[4096];
    AtlUnescapeUrl((LPCWSTR)CA2T((LPCSTR)v), buff, &len, _countof(buff));
    value = CStringA(CT2A(buff));
  }
  return value;
}

/*-----------------------------------------------------------------------------
  Process the body of a post and return it as a string
-----------------------------------------------------------------------------*/
CString TestServer::GetPostBody(struct mg_connection *conn,
                                const struct http_message *message){
  CString body;
  if (message->body.len > 0) {
    CStringA b(message->body.p, (int)message->body.len);
    body = CA2T(b);
  }

  return body;
}
CStringA TestServer::GetPostBodyA(struct mg_connection *conn,
                                  const struct http_message *message){
  CStringA body;
  if (message->body.len > 0)
    body.SetString(message->body.p, (int)message->body.len);

  return body;
}

bool TestServer::OkToStart(bool trigger_start) {
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
    if (elapsed > 30 && trigger_start) {
      started_ = true;
    } else {
      // calculate CPU utilization and adjust for multiple cores
      double target_cpu = 20.0;
      SYSTEM_INFO sysinfo;
      GetSystemInfo(&sysinfo);
      if (sysinfo.dwNumberOfProcessors > 1)
        target_cpu = target_cpu / (double)sysinfo.dwNumberOfProcessors;
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
            double cpu_utilization = (((double)(kernel + user - idle) * 100.0) 
                                          / (double)(kernel + user));
            if (cpu_utilization < target_cpu) {
              if (!idle_start_.QuadPart) {
                idle_start_.QuadPart = now.QuadPart;
              } else {
                double idle_elapsed = (double)(now.QuadPart - idle_start_.QuadPart) /
                                      (double)start_check_freq_.QuadPart;
                // Wait for 500 ms of idle after browser start
                if (idle_elapsed > 0.5)
                  started_ = true;
              }
            } else {
              idle_start_.QuadPart = 0;
            }
          }
        }
        last_cpu_idle_.QuadPart = i.QuadPart;
        last_cpu_kernel_.QuadPart = k.QuadPart;
        last_cpu_user_.QuadPart = u.QuadPart;
      }
    }
    #ifdef DEBUG
      // don't wait in debug builds
      started_ = true;
    #endif
    if (started_) {
      // Signal to wptdriver which process it should wait for and that we started
      test_state_.shared_.SetBrowserProcessId(GetCurrentProcessId());
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