#pragma once
class WebBrowser
{
public:
  WebBrowser(WptSettings& settings, WptTest& test, WptStatus &status);
  ~WebBrowser(void);

  bool RunAndWait();
  bool Close();

private:
  void InjectDll();

  WptSettings&  _settings;
  WptTest&      _test;
  WptStatus&    _status;

  HANDLE        _browser_process;
  HMODULE       _hook_dll;

  CRITICAL_SECTION  cs;
};

