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

#include <Wininet.h>
class WebPagetest;

/*-----------------------------------------------------------------------------
  Snapshot of a WptDriverTest for uploading results in a background thread.
-----------------------------------------------------------------------------*/
class TestInfo {
 public:
  TestInfo(WebPagetest& wpt, WptTestDriver& test, bool done, HANDLE done_event);
  ~TestInfo() {}

  // From WebPagetest
  WebPagetest * _wpt;
  CString _computer_name;
  CString _dns_servers;
  int     _cpu_utilization;

  // From Settings
  CString _server;
  CString _location;
  CString _key;
  CString _ec2_instance;
  CString _azure_instance;

  // From WptTestDriver
  CString _directory;
  bool    _discard_test;
  bool    _process_results;
  CString _id;
  int     _run;
  int     _index;
  bool    _clear_cache;
  CString _test_error;
  CString _run_error;
  CString _job_info;

  bool _done;
  HANDLE _done_event;
};


class WebPagetest {
public:
  WebPagetest(WptSettings &settings, WptStatus &status);
  ~WebPagetest(void);
  bool GetTest(WptTestDriver& test);
  bool DeleteIncrementalResults(WptTestDriver& test);
  bool UploadIncrementalResults(WptTestDriver& test, HANDLE background_processing_event);
  void StartTestRun(WptTestDriver& test);
  bool TestDone(WptTestDriver& test, HANDLE background_processing_event);
  DWORD WptVersion(){ return _revisionNo; }
  void UploadThread(TestInfo& test_info);

  bool _exit;
  bool has_gpu_;
  bool rebooting_;
  WptSettings&  _settings;
  CString       _computer_name;
  CString       _dns_servers;

private:
  WptStatus&    _status;
  DWORD         _majorVer;
  DWORD         _minorVer;
  DWORD         _buildNo;
  DWORD         _revisionNo;
  int           _screenWidth;
  int           _screenHeight;
  DWORD         _winMajor;
  DWORD         _winMinor;
  DWORD         _isServer;
  DWORD         _is64Bit;
  HANDLE        _upload_thread;

  void LoadClientCertificateFromStore(HINTERNET request);
  void SetLoginCredentials(HINTERNET request);
  bool HttpGet(CString url, WptTestDriver& test, CString& test_string, 
               CString& zip_file);
  bool CrackUrl(CString url, CString &host, unsigned short &port, 
                CString& object, DWORD &secure_flag);
  void BuildFormData(TestInfo& test_info, bool done,
                     CString file_name, DWORD file_size,
                     CString& headers, CStringA& footer, 
                     CStringA& form_data, DWORD& content_length);
  bool UploadFile(CString url, bool done, TestInfo& test_info, CString file);
  bool CompressResults(CString directory, CString zip_file);
  void GetImageFiles(const CString& directory, CAtlList<CString>& files);
  void GetFiles(const CString& directory, const TCHAR* glob_pattern,
                CAtlList<CString>& files);
  bool UploadImages(TestInfo& test_info, CAtlList<CString>& image_files);
  bool UploadData(TestInfo& test_info);
  bool ProcessZipFile(CString zip_file, WptTestDriver& test);
  bool InstallUpdate(CString dir);
  bool GetClient(WptTestDriver& test);
  bool UnzipTo(CString zip_file, CString dest);
  void UpdateDNSServers();
  bool GetNameFromMAC(LPTSTR name, DWORD &len);
  bool ProcessFile(TestInfo& test_info, CString file, CAtlList<CString> &newFiles);
};
