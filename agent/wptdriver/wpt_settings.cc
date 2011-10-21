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
#include <WinInet.h>

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptSettings::WptSettings(void):
  _timeout(DEFAULT_TEST_TIMEOUT)
  ,_startup_delay(DEFAULT_STARTUP_DELAY)
  ,_polling_delay(DEFAULT_POLLING_DELAY)
  ,_debug(0){
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
  TCHAR logFile[MAX_PATH];
  iniFile[0] = 0;
  GetModuleFileName(NULL, iniFile, _countof(iniFile));
  lstrcpy( PathFindFileName(iniFile), _T("wptdriver.ini") );
  _ini_file = iniFile;
  lstrcpy(logFile, iniFile);
  lstrcpy( PathFindFileName(logFile), _T("wpt.log") );
  DeleteFile(logFile);

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

  #ifdef DEBUG
  _debug = 9;
  #else
  _debug = GetPrivateProfileInt(_T("WebPagetest"), _T("Debug"),_debug,iniFile);
  #endif
  SetDebugLevel(_debug, logFile);

  // load the test parameters
  _timeout = GetPrivateProfileInt(_T("WebPagetest"), _T("Time Limit"),
                                  _timeout, iniFile);

  // load the Web Page Replay host
  if (GetPrivateProfileString(
      _T("WebPagetest"), _T("web_page_replay_host"), _T(""), buff,
      _countof(buff), iniFile )) {
    _web_page_replay_host = buff;
  }

  // see if we need to load settings from EC2 (server and location)
  if (GetPrivateProfileInt(_T("WebPagetest"), _T("ec2"), 0, iniFile)) {
    LoadFromEC2();
  }

  SetTestTimeout(_timeout * SECONDS_TO_MS);
  if (_server.GetLength() && _location.GetLength())
    ret = true;

  return ret;
}

/*-----------------------------------------------------------------------------
  Load the settings from EC2 User Data
  We have to support the old "urlblast" format settings because both may
  be running on the same machine
-----------------------------------------------------------------------------*/
void WptSettings::LoadFromEC2(void) {

  CString userData;
  if (GetUrlText(_T("http://169.254.169.254/latest/user-data"), userData)) {
    int pos = 0;
    do {
      CString token = userData.Tokenize(_T(" &"), pos).Trim();
      if (token.GetLength()) {
        int split = token.Find(_T('='), 0);
        if (split > 0) {
          CString key = token.Left(split).Trim();
          CString value = token.Mid(split + 1).Trim();

          if (key.GetLength() && value.GetLength()) {
            if (!key.CompareNoCase(_T("wpt_server")))
              _server = CString(_T("http://")) + value + _T("/");
            else if (!key.CompareNoCase(_T("wpt_location")))
              _location = value + _T("_wptdriver"); 
            else if (!key.CompareNoCase(_T("wpt_key")) )
              _key = value; 
            else if (!key.CompareNoCase(_T("wpt_timeout")))
              _timeout = _ttol(value); 
          }
        }
      }
    } while (pos > 0);
  }

  GetUrlText(_T("http://169.254.169.254/latest/meta-data/instance-id"), 
    _ec2_instance);
  _ec2_instance = _ec2_instance.Trim();
}

/*-----------------------------------------------------------------------------
  Get a string response from the given url
-----------------------------------------------------------------------------*/
bool WptSettings::GetUrlText(CString url, CString &response)
{
  bool ret = false;
  response.Empty();

  HINTERNET internet = InternetOpen(_T("WebPagetest Driver"), 
                                    INTERNET_OPEN_TYPE_PRECONFIG,
                                    NULL, NULL, 0);
  if (internet) {
    HINTERNET http_request = InternetOpenUrl(internet, url, NULL, 0, 
                                INTERNET_FLAG_NO_CACHE_WRITE | 
                                INTERNET_FLAG_NO_UI | 
                                INTERNET_FLAG_PRAGMA_NOCACHE | 
                                INTERNET_FLAG_RELOAD, NULL);
    if (http_request) {
      ret = true;
      char buff[4097];
      DWORD bytes_read;
      HANDLE file = INVALID_HANDLE_VALUE;
      while (InternetReadFile(http_request, buff, sizeof(buff) - 1, 
              &bytes_read) && bytes_read) {
        // NULL-terminate it and add it to our response string
        buff[bytes_read] = 0;
        response += CA2T(buff);
      }
      if (file != INVALID_HANDLE_VALUE)
        CloseHandle(file);
      InternetCloseHandle(http_request);
    }
    InternetCloseHandle(internet);
  }

  return ret;
}


/*-----------------------------------------------------------------------------
  Load the settings for the specified browser 
  (this will be done on every test run in order to support 
  multi-browser testing)
-----------------------------------------------------------------------------*/
bool WptSettings::SetBrowser(CString browser) {
  TCHAR buff[1024];
  if (!browser.GetLength()) {
    browser = _T("chrome");  // default to "chrome" to support older ini file
    if (GetPrivateProfileString(_T("WebPagetest"), _T("browser"), _T(""), buff,
      _countof(buff), _ini_file )) {
      browser = buff;
    }
  }
  // try loading the settings for the specified browser
  bool ret = _browser.Load(browser, _ini_file);
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool BrowserSettings::Load(const TCHAR * browser, const TCHAR * iniFile) {
  bool ret = false;
  TCHAR buff[4096];
  _browser = browser;
  _template = _browser;
  _exe.Empty();
  _exe_directory.Empty();
  _options.Empty();

  GetModuleFileName(NULL, buff, _countof(buff));
  *PathFindFileName(buff) = NULL;
  _wpt_directory = buff;
  _wpt_directory.Trim(_T("\\"));

  // create a profile directory for the given browser
  _profile_directory = _wpt_directory + _T("\\profiles\\");
  if( SUCCEEDED(SHGetFolderPath(NULL, CSIDL_APPDATA | CSIDL_FLAG_CREATE,
                                NULL, SHGFP_TYPE_CURRENT, buff)) ) {
    PathAppend(buff, _T("webpagetest_profiles\\"));
    _profile_directory = buff;
  }
  _profile_directory += browser;
  if (GetPrivateProfileString(browser, _T("cache"), _T(""), buff, 
    _countof(buff), iniFile )) {
    _profile_directory = buff;
    _profile_directory.Trim();
    _profile_directory.Replace(_T("%WPTDIR%"), _wpt_directory);
  }

  if (GetPrivateProfileString(browser, _T("template"), _T(""), buff, 
    _countof(buff), iniFile )) {
    _template = buff;
    _template.Trim();
  }

  if (GetPrivateProfileString(browser, _T("exe"), _T(""), buff, 
    _countof(buff), iniFile )) {
    _exe = buff;
    _exe.Trim(_T("\""));

    lstrcpy(buff, _exe);
    *PathFindFileName(buff) = NULL;
    _exe_directory = buff;
    _exe_directory.Trim(_T("/\\"));
    ret = true;
  }

  if (GetPrivateProfileString(browser, _T("options"), _T(""), buff, 
    _countof(buff), iniFile )) {
    _options = buff;
    _options.Trim(_T("\""));
    _options.Replace(_T("%WPTDIR%"), _wpt_directory);
    _options.Replace(_T("%PROFILE%"), _profile_directory);
  }

  _use_symbols = false;
  if (GetPrivateProfileInt(browser, _T("use symbols"), 0, iniFile))
    _use_symbols = true;

  return ret;
}

/*-----------------------------------------------------------------------------
  Reset the browser user profile (nuke the directory, copy the template over)
-----------------------------------------------------------------------------*/
void BrowserSettings::ResetProfile() {
  if (_profile_directory.GetLength() ) {
    SHCreateDirectoryEx(NULL, _profile_directory, NULL);
    DeleteDirectory(_profile_directory, false);
    CopyDirectoryTree(_wpt_directory + CString(_T("\\templates\\"))+_template,
                      _profile_directory);
  }
}