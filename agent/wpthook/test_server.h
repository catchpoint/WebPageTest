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

#pragma once

class WptHook;
class WptTestHook;
class TestState;
class Requests;
class Trace;

class TestServer {
public:
  TestServer(WptHook& hook, WptTestHook &test, TestState& test_state, 
             Requests& requests, Trace &trace);
  ~TestServer(void);

  bool Start(void);
  void Stop(void);
  void ThreadProc(void);
  void HTTPRequest(struct mg_connection *conn, struct http_message *message);

private:
  HANDLE            server_thread_;
  WptHook&          hook_;
  WptTestHook&      test_;
  TestState&        test_state_;
  Requests&         requests_;
  Trace             &trace_;
  CRITICAL_SECTION  cs;
  bool              started_;
  bool              shutting_down_;
  bool              stored_ua_string_;
  ULARGE_INTEGER    last_cpu_idle_;
  ULARGE_INTEGER    last_cpu_kernel_;
  ULARGE_INTEGER    last_cpu_user_;
  LARGE_INTEGER     start_check_time_;
  LARGE_INTEGER     start_check_freq_;
  LARGE_INTEGER     idle_start_;

  LogDuration * logExtensionStart_;
  LogDuration * logExtensionBlank_;
  LogDuration * logWaitForIdle_;

  void SendJsonResponse(struct mg_connection *conn,
                    struct http_message *message,
                    CStringA response_data);
  void SendResponse(struct mg_connection *conn,
                    struct http_message *message,
                    CStringA response_data,
                    CStringA content_type);
  CStringA GetParam(const CStringA query_string, const CStringA key) const;
  bool GetDwordParam(const CStringA query_string, const CStringA key, DWORD& value) const;
  bool GetIntParam(const CStringA query_string, const CStringA key, int& value) const;
  CStringA GetUnescapedParam(const CStringA query_string, const CStringA key) const;
  CString GetPostBody(struct mg_connection *conn,
                      const struct http_message *message);
  CStringA GetPostBodyA(struct mg_connection *conn,
                        const struct http_message *message);
  bool OkToStart(bool trigger_start);
};
