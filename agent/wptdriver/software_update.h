#pragma once
class SoftwareUpdate
{
public:
  SoftwareUpdate(void);
  ~SoftwareUpdate(void);
  void LoadSettings(CString settings_ini);
  void UpdateSoftware(void);

protected:
  CAtlList<CString> _browsers;
  CString           _software_url;
  CString           _directory;
  LARGE_INTEGER     _last_update_check;
  LARGE_INTEGER     _perf_frequency_minutes;

  void UpdateBrowsers(void);
  bool InstallSoftware(CString browser, CString file_url, CString md5,
                        CString version, CString command);
  bool TimeToCheck(void);
};

