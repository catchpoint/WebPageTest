#pragma once
class BrowserUpdate
{
public:
  BrowserUpdate(void);
  ~BrowserUpdate(void);
  void LoadSettings(CString settings_ini);
  void UpdateBrowsers(void);

protected:
  CAtlList<CString> _browsers;
  CString           _directory;
  LARGE_INTEGER     _last_update_check;
  LARGE_INTEGER     _perf_frequency_minutes;

  bool InstallBrowser(CString browser, CString file_url, 
                        CString version, CString command);
  bool TimeToCheck(void);
};

