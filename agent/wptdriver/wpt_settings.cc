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

  // load the path to the browsers (just support one of each for right now)
  if( GetPrivateProfileString(_T("browser"), _T("Chrome"), _T(""), buff, 
    _countof(buff), iniFile ) )  {
    _browser_chrome = buff;
    _browser_chrome.Trim(_T("\""));
  }

  if( GetPrivateProfileString(_T("browser"), _T("Firefox"), _T(""), buff, 
    _countof(buff), iniFile ) )  {
    _browser_firefox = buff;
    _browser_firefox.Trim(_T("\""));
  }

  if( GetPrivateProfileString(_T("browser"), _T("IE"), _T(""), buff, 
    _countof(buff), iniFile ) )  {
    _browser_ie = buff;
    _browser_ie.Trim(_T("\""));
  }

  return ret;
}
