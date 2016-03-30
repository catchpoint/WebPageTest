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

private:
  bool RunImageHash();
  bool RunVisuallyComplete();
  bool SpawnWebDriverServer();
  bool SpawnWebDriverClient();
  void TerminateWebDriverServer();
  void TerminateWebDriverClient();
  bool WriteScriptToFile(CString& script, CString& filename);

  HANDLE _browser_started_event;
  HANDLE _browser_done_event;

  PROCESS_INFORMATION _server_info;
  PROCESS_INFORMATION _client_info;
  
  WptSettings& _settings;
  WptTestDriver& _test;
  WptStatus& _status;
  BrowserSettings& _browser;
  CIpfw& _ipfw;

  SECURITY_ATTRIBUTES null_dacl;
  SECURITY_DESCRIPTOR SD;

  CString _scripts_dir;
};