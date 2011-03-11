#include "StdAfx.h"
#include "wpt_settings.h"


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptSettings::WptSettings(void):
  _timeout(DEFAULT_TEST_TIMEOUT)
  ,_startup_delay(DEFAULT_STARTUP_DELAY)
  ,_polling_delay(DEFAULT_POLLING_DELAY)
{
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptSettings::~WptSettings(void)
{
}

/*-----------------------------------------------------------------------------
  Load the settings file
-----------------------------------------------------------------------------*/
bool WptSettings::Load(void)
{
  bool ret = false;

  TCHAR buff[1024];
  TCHAR iniFile[MAX_PATH];
  iniFile[0] = 0;
  GetModuleFileName(NULL, iniFile, _countof(iniFile));
  lstrcpy( PathFindFileName(iniFile), _T("wptdriver.ini") );

  // Load the server settings (WebPagetest Web Server)
  if( GetPrivateProfileString(_T("WebPagetest"), _T("Url"), _T(""), buff, 
    _countof(buff), iniFile ) )  {
    _server = buff;
    if( _server.Right(1) != '/' )
      _server += "/";
  }

  if( GetPrivateProfileString(_T("WebPagetest"), _T("Location"), _T(""), buff, 
    _countof(buff), iniFile ) )  {
    _location = buff;
  }

  if( GetPrivateProfileString(_T("WebPagetest"), _T("Key"), _T(""), buff, 
    _countof(buff), iniFile ) )  {
    _key = buff;
  }

  if( _server.GetLength() && _location.GetLength() )
    ret = true;

  // load the test parameters
  _timeout = GetPrivateProfileInt(_T("Test"), _T("Timeout"), 
                _timeout, iniFile);
  SetTestTimeout(_timeout * SECONDS_TO_MS);

  // load the browser settings
  _browser_chrome.Load(_T("chrome"), iniFile);

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void BrowserSettings::Load(const TCHAR * browser, const TCHAR * iniFile) {
  TCHAR buff[4096];

  CString wpt_directory;
  GetModuleFileName(NULL, buff, _countof(buff));
  *PathFindFileName(buff) = NULL;
  wpt_directory = buff;
  wpt_directory.Trim(_T("\\"));

  if( GetPrivateProfileString(browser, _T("exe"), _T(""), buff, 
    _countof(buff), iniFile ) )  {
    _exe = buff;
    _exe.Trim(_T("\""));
  }

  if( GetPrivateProfileString(browser, _T("options"), _T(""), buff, 
    _countof(buff), iniFile ) )  {
    _options = buff;
    _options.Trim(_T("\""));
    _options.Replace(_T("%WPTDIR%"), wpt_directory);
  }

  if( GetPrivateProfileString(browser, _T("cache"), _T(""), buff, 
    _countof(buff), iniFile ) )  {
    _cache = buff;
    _cache.Trim(_T("\""));
    _cache.Replace(_T("%WPTDIR%"), wpt_directory);
  }

  if( GetPrivateProfileString(browser, _T("frame_window"), _T(""), buff, 
    _countof(buff), iniFile ) )  {
    _frame_window = buff;
    _frame_window.Trim();
  }

  if( GetPrivateProfileString(browser, _T("browser_window"), _T(""), buff, 
    _countof(buff), iniFile ) )  {
    _browser_window = buff;
    _browser_window.Trim();
  }
}
