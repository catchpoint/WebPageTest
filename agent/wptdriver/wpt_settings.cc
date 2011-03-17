/******************************************************************************
Copyright (c) 2010, Google Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without 
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, 
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of the <ORGANIZATION> nor the names of its contributors 
    may be used to endorse or promote products derived from this software 
    without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE 
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL 
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER 
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, 
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
******************************************************************************/

#include "StdAfx.h"
#include "wpt_settings.h"


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptSettings::WptSettings(void):
  _timeout(DEFAULT_TEST_TIMEOUT)
  ,_startup_delay(DEFAULT_STARTUP_DELAY)
  ,_polling_delay(DEFAULT_POLLING_DELAY) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptSettings::~WptSettings(void) {
}

/*-----------------------------------------------------------------------------
  Load the settings file
-----------------------------------------------------------------------------*/
bool WptSettings::Load(void) {
  bool ret = false;

  TCHAR buff[1024];
  TCHAR iniFile[MAX_PATH];
  iniFile[0] = 0;
  GetModuleFileName(NULL, iniFile, _countof(iniFile));
  lstrcpy( PathFindFileName(iniFile), _T("wptdriver.ini") );

  // Load the server settings (WebPagetest Web Server)
  if (GetPrivateProfileString(_T("WebPagetest"), _T("Url"), _T(""), buff, 
    _countof(buff), iniFile )) {
    _server = buff;
    if( _server.Right(1) != '/' )
      _server += "/";
  }

  if (GetPrivateProfileString(_T("WebPagetest"), _T("Location"), _T(""), buff, 
    _countof(buff), iniFile )) {
    _location = buff;
  }

  if (GetPrivateProfileString(_T("WebPagetest"), _T("Key"), _T(""), buff, 
    _countof(buff), iniFile )) {
    _key = buff;
  }

  if (_server.GetLength() && _location.GetLength())
    ret = true;

  // load the test parameters
  _timeout = GetPrivateProfileInt(_T("Test"), _T("Timeout"),_timeout, iniFile);
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

  if (GetPrivateProfileString(browser, _T("exe"), _T(""), buff, 
    _countof(buff), iniFile )) {
    _exe = buff;
    _exe.Trim(_T("\""));
  }

  if (GetPrivateProfileString(browser, _T("options"), _T(""), buff, 
    _countof(buff), iniFile )) {
    _options = buff;
    _options.Trim(_T("\""));
    _options.Replace(_T("%WPTDIR%"), wpt_directory);
  }

  if (GetPrivateProfileString(browser, _T("cache"), _T(""), buff, 
    _countof(buff), iniFile )) {
    _cache = buff;
    _cache.Trim(_T("\""));
    _cache.Replace(_T("%WPTDIR%"), wpt_directory);
  }
}
