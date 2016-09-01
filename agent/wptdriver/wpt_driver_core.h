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

class WebPageReplay;

class WptDriverCore {
public:
  WptDriverCore(WptStatus &status);
  ~WptDriverCore(void);

  void Start(void);
  void Stop(void);
  void WorkThread(void);
  void DoHouseKeeping();

private:
  WptSettings _settings;
  WptStatus&  _status;
  WebPagetest _webpagetest;
  WebBrowser *_browser;
  bool        _exit;
  bool        _installing;
  HANDLE      _work_thread;
  HANDLE      _testing_mutex;
  CIpfw       _ipfw;
  HANDLE      housekeeping_timer_;
  bool        has_gpu_;
  bool        watchdog_started_;
  LARGE_INTEGER reboot_time_;
  bool TracerouteTest(WptTestDriver& test);
  bool BrowserTest(WptTestDriver& test, WebBrowser &browser);
  bool SetupWebPageReplay(WptTestDriver& test, WebBrowser &browser);
  void Init(void);
  void Cleanup(void);
  void FlushDNS(void);
  void ExtractZipFiles();
  bool ExtractZipFile(CString file);
  void KillBrowsers();
  void SetupScreen();
  void SetupDummynet();
  void CloseDialogs();
  bool DetectGPU();
  void PreTest();
  void PostTest();
  bool Startup();
  LPTSTR GetAppInitString(LPCTSTR new_dll, bool is64bit);
  bool NeedsReboot();
};
