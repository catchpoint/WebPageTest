#pragma once

class BrowserSettings;

class WebBrowser
{
public:
  WebBrowser(WptSettings& settings, WptTest& test, WptStatus &status, 
              WptHook& hook, BrowserSettings& browser);
  ~WebBrowser(void);

  bool RunAndWait();
  bool Close();
  void ClearCache();

private:
  void InjectDll();

  WptSettings&  _settings;
  WptTest&      _test;
  WptStatus&    _status;
  WptHook&      _hook;
  BrowserSettings& _browser;

  HANDLE        _browser_process;

  CRITICAL_SECTION  cs;
};

