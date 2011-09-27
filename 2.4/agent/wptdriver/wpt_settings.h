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

#pragma once

// constants
const DWORD EXIT_TIMEOUT = 120000;

// default settings
const DWORD DEFAULT_TEST_TIMEOUT = 120;
const DWORD DEFAULT_STARTUP_DELAY = 10;
const DWORD DEFAULT_POLLING_DELAY = 15;
const DWORD UPLOAD_RETRY_COUNT = 5;
const DWORD UPLOAD_RETRY_DELAY = 10;

// conversions
const DWORD SECONDS_TO_MS = 1000;

class WptTest;

class BrowserSettings {
public:
  BrowserSettings(){}
  ~BrowserSettings(){}
  bool Load(const TCHAR * browser, const TCHAR * iniFile);
  void ResetProfile();

  CString _browser;
  CString _template;
  CString _exe;
  CString _options;
  CString _wpt_directory;
  CString _exe_directory;
  CString _profile_directory;
};

// dynamic settings loaded from file
class WptSettings {
public:
  WptSettings(void);
  ~WptSettings(void);
  bool Load(void);
  void LoadFromEC2(void);
  bool SetBrowser(CString browser);
  bool PrepareTest(WptTest& test);
  bool GetUrlText(CString url, CString &response);

  CString _server;
  CString _location;
  CString _key;
  DWORD   _timeout;
  DWORD   _startup_delay;
  DWORD   _polling_delay;
  int     _debug;
  CString _web_page_replay_host;
  CString _ini_file;
  CString _ec2_instance;

  BrowserSettings _browser;
};
