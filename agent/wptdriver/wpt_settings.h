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

#include "software_update.h"

// constants
const DWORD EXIT_TIMEOUT = 120000;

// default settings
const DWORD DEFAULT_TEST_TIMEOUT = 120;
const DWORD DEFAULT_ACTIVITY_TIMEOUT = 2000;
const DWORD DEFAULT_STARTUP_DELAY = 10;
const DWORD DEFAULT_POLLING_DELAY = 5;
const DWORD UPLOAD_RETRY_COUNT = 5;
const DWORD UPLOAD_RETRY_DELAY = 10;

// conversions
const DWORD SECONDS_TO_MS = 1000;

class WptTest;
class WptStatus;

class BrowserSettings {
public:
  BrowserSettings(){}
  ~BrowserSettings(){}
  bool Load(const TCHAR * browser, const TCHAR * iniFile, CString client);
  bool Install(CString browser, CString url, CString md5);
  void ResetProfile(bool clear_certs);
  void GetStandardDirectories();
  void ClearWinInetCache();
  void ClearWebCache();
  void CleanupCustomBrowsers(CString browser);
  
  CString _browser;
  CString _template;
  CString _exe;
  CString _options;
  CString _wpt_directory;
  CString _exe_directory;
  CString _profile_directory;
  CString _profiles;
  CString _cache_directory;

  // Windows/IE directories
  CString windows_dir_;
  CString app_data_dir_;
  CString local_app_data_dir_;
  CString program_files_dir_;
  CString profile_dir_;
  CString cookies_dir_;
  CString history_dir_;
  CString dom_storage_dir_;
  CString temp_files_dir_;
  CString temp_dir_;
  CString silverlight_dir_;
  CString recovery_dir_;
  CString flash_dir_;
  CString webcache_dir_;
};

// dynamic settings loaded from file
class WptSettings {
public:
  WptSettings(WptStatus &status);
  ~WptSettings(void);
  bool Load(void);
  void LoadFromEC2(void);
  void LoadFromGCE(void);
  void LoadFromAzure(void);
  void ParseInstanceData(CString &userData);
  bool SetBrowser(CString browser, CString url, CString md5, CString client);
  bool PrepareTest(WptTest& test);
  bool GetUrlText(CString url, CString &response, LPCTSTR headers = NULL);
  bool UpdateSoftware();
  bool ReInstallBrowser();

  CString _server;
  CString _username;
  CString _password;
  CString _location;
  CString _key;
  DWORD   _timeout;
  DWORD   _startup_delay;
  DWORD   _polling_delay;
  int     _debug;
  CString _web_page_replay_host;
  CString _ini_file;
  CString _ec2_instance;
  CString _ec2_availability_zone;
  CString _azure_instance;
  CString _clients_directory;
  BOOL _requireValidCertificate;
  CString _clientCertCommonName;
  bool  _keep_resolution;

  BrowserSettings _browser;
  SoftwareUpdate _software_update;
  WptStatus &_status;
};
