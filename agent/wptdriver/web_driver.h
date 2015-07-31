#pragma once

class WebDriver {
public:
  WebDriver(WptSettings& settings,
            WptTestDriver& test,
            WptStatus &status, 
            BrowserSettings& browser,
            CIpfw& ipfw);
  ~WebDriver();
  bool RunAndWait();
  void Terminate();
  bool ReadClientError();
  bool ReadServerError();

private:
  bool SpawnWebDriverServer();
  bool SpawnWebDriverClient();
  void TerminateWebDriverServer();
  void TerminateWebDriverClient();
  bool WriteScriptToFile(CString& script, CString& filename);

  bool CreateStdPipes(HANDLE *hRead, HANDLE *hWrite);
  
  bool ReadPipe(HANDLE hRead, CString &content);

  HANDLE _server_err_write, _server_err_read;
  HANDLE _client_err_write, _client_err_read;
  HANDLE _browser_started_event;
  HANDLE _browser_done_event;
  HANDLE _server_read_thread, _client_read_thread;

  PROCESS_INFORMATION _server_info;
  PROCESS_INFORMATION _client_info;
  
  WptSettings& _settings;
  WptTestDriver& _test;
  WptStatus& _status;
  BrowserSettings& _browser;
  CIpfw& _ipfw;

  SECURITY_ATTRIBUTES null_dacl;
  SECURITY_DESCRIPTOR SD;

  CString _client_err;
  CString _server_err;
  CString _scripts_dir;
};