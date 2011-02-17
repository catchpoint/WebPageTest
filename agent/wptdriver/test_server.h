#pragma once

class TestServer
{
public:
  TestServer(WptSettings &settings, WptStatus &status);
  ~TestServer(void);

  bool Start(void);
  void Stop(void);
  void SetTest(WptTest * test);
  void SetBrowser(WebBrowser * browser);
  void MongooseCallback(enum mg_event event,
                        struct mg_connection *conn,
                        const struct mg_request_info *request_info);

private:
  WptSettings&      _settings;
  WptStatus&        _status;
  struct mg_context *_mongoose_context;
  WptTest *         _test;
  WebBrowser *      _browser;
  CRITICAL_SECTION  cs;

  void SendResponse(struct mg_connection *conn,
                    const struct mg_request_info *request_info,
                    DWORD response_code,
                    CStringA response_code_string,
                    CStringA response_data);
};
