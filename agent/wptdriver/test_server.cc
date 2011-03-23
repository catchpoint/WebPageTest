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
#include "mongoose/mongoose.h"

static TestServer * _global_test_server = NULL;

// definitions
static const DWORD RESPONSE_OK = 200;
static const char * RESPONSE_OK_STR = "OK";

static const DWORD RESPONSE_ERROR_NO_TEST = 404;
static const char * RESPONSE_ERROR_NO_TEST_STR = "ERROR: No Test";

static const DWORD RESPONSE_ERROR_NOT_IMPLEMENTED = 403;
static const char * RESPONSE_ERROR_NOT_IMPLEMENTED_STR = 
                                                      "ERROR: Not Implemented";

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
TestServer::TestServer(WptSettings &settings, WptStatus &status, 
  WptHook& hook):
  _mongoose_context(NULL)
  ,_settings(settings)
  ,_status(status)
  ,_hook(hook)
  ,_test(NULL)
  ,_browser(NULL){
  InitializeCriticalSection(&cs);
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

  if (_global_test_server)
    _global_test_server->MongooseCallback(event, conn, request_info);

  return processed;
}

/*-----------------------------------------------------------------------------
  Start the local HTTP server
-----------------------------------------------------------------------------*/
bool TestServer::Start(void){
  bool ret = false;

  _global_test_server = this;

  static const char *options[] = {
    "listening_ports", "127.0.0.1:8888",
    "num_threads", "5",
    NULL
  };

  _mongoose_context = mg_start(&MongooseCallbackStub, options);
  if (_mongoose_context)
    ret = true;

  return ret;
}

/*-----------------------------------------------------------------------------
  Stop the local HTTP server
-----------------------------------------------------------------------------*/
void TestServer::Stop(void){
  if (_mongoose_context) {
    mg_stop(_mongoose_context);
    _mongoose_context = NULL;
  }
  _global_test_server = NULL;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestServer::SetTest(WptTest * test){
  EnterCriticalSection(&cs);
  _test = test;
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TestServer::SetBrowser(WebBrowser * browser){
  EnterCriticalSection(&cs);
  _browser = browser;
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
  We received a request that we need to respond to
-----------------------------------------------------------------------------*/
void TestServer::MongooseCallback(enum mg_event event,
                      struct mg_connection *conn,
                      const struct mg_request_info *request_info){

  EnterCriticalSection(&cs);
  if (event == MG_NEW_REQUEST) {
    ATLTRACE(_T("[wptdriver] HTTP Request: %s\n"), 
                    (LPCTSTR)CA2T(request_info->uri));
    ATLTRACE(_T("[wptdriver] HTTP Query String: %s\n"), 
                    (LPCTSTR)CA2T(request_info->query_string));
    if (strcmp(request_info->uri, "/get_test") == 0) {
      if (_test){
        _status.Set(_T("Running test in browser..."));
        SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, 
                    _test->ToJSON());
      }else{
        SendResponse(conn, request_info, RESPONSE_ERROR_NO_TEST, 
                    RESPONSE_ERROR_NO_TEST_STR, "");
      }
    } else if (strcmp(request_info->uri, "/task") == 0) {
      if (_test){
        CStringA task;
        if (_browser)
          _browser->PositionWindow();
        bool record = false;
        _test->GetNextTask(task, record);
        if (record)
          _hook.Start(false);
        SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, task);
      }else{
        SendResponse(conn, request_info, RESPONSE_ERROR_NO_TEST, 
                    RESPONSE_ERROR_NO_TEST_STR, "");
      }
    } else if (strcmp(request_info->uri, "/event/load") == 0) {
      _status.Set(_T("onLoad - waiting for test to complete..."));
      DWORD load_time = ParseLoadTime(request_info->query_string);
      _hook.OnLoad(load_time);
      SendResponse(conn, request_info, RESPONSE_OK, RESPONSE_OK_STR, "");
    } else if (strcmp(request_info->uri, "/event/navigate") == 0) {
      _status.Set(_T("onNavigate - waiting for test to complete..."));
      _hook.OnNavigate();
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
    "Cache: no-cache\r\n"
    "Content-Type: application/json\r\n"
    "\r\n";

  if (!callback.IsEmpty())
    response += callback + "(";

  // now the standard REST container
  CStringA buff;
  buff.Format("{\"statusCode\":%d,\"statusText\":\"%s\"", response_code, 
    (LPCSTR)response_code_string);
  response += buff;
  if (request_id.GetLength())
    response += CStringA(",\"requestId\":\"") + request_id + "\"";

  // and the actual data
  if (response_data.GetLength()) {
    response += ",\"data\":";
    response += response_data;
  }

  // close it out
  response += "}";
  if (!callback.IsEmpty())
    response += ");";

  // and finally, send it
  mg_printf(conn, "%s", (LPCSTR)response);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
DWORD TestServer::ParseLoadTime(CStringA query_string) {
  DWORD load_time = 0;
  int pos = 0;
  CStringA token = query_string.Tokenize("&", pos);
  while (pos >= 0 && !load_time) {
    int split = token.Find('=');
    if (split > 0) {
      CStringA key = token.Left(split).Trim();
      CStringA value = token.Mid(split + 1).Trim();
      if (!key.CompareNoCase("load_time")) {
        load_time = atoi(value);
        ATLTRACE(_T("[wptdriver] Page load time from extension: %dms"), 
                load_time);
      }
    }
    token = query_string.Tokenize("&", pos);
  }

  return load_time;
}