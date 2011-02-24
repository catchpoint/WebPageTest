#pragma once
class WebBrowser
{
public:
  WebBrowser(WptSettings& settings, WptTest& test, WptStatus &status, 
              WptHook& hook);
  ~WebBrowser(void);

  bool RunAndWait();
  bool Close();

private:
  void InjectDll();

  WptSettings&  _settings;
  WptTest&      _test;
  WptStatus&    _status;
  WptHook&      _hook;

  HANDLE        _browser_process;

  CRITICAL_SECTION  cs;
};

