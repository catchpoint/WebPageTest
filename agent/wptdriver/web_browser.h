#pragma once
class WebBrowser
{
public:
  WebBrowser(WptSettings& settings, WptTest& test);
  ~WebBrowser(void);

  bool RunAndWait();
  bool Close();

private:
  WptSettings&  _settings;
  WptTest&      _test;

  HANDLE _browser_process;

  CRITICAL_SECTION  cs;
};

