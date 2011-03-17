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
#include "wpt_driver_core.h"
#include "mongoose/mongoose.h"
#include "../wpthook/window_messages.h"

const int pipeIn = 1;
const int pipeOut = 2;

WptDriverCore * global_core = NULL;
extern HINSTANCE hInst;

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptDriverCore::WptDriverCore(WptStatus &status):
  _status(status)
  ,_webpagetest(_settings, _status)
  ,_test_server(_settings, _status, _hook)
  ,_browser(NULL)
  ,_exit(false)
  ,_work_thread(NULL)
  ,_message_thread(NULL)
  ,_message_window(NULL){
  global_core = this;
  InitializeCriticalSection(&cs);
  _testing_mutex = CreateMutex(NULL, FALSE, _T("Global\\WebPagetest"));
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptDriverCore::~WptDriverCore(void) {
  global_core = NULL;
  DeleteCriticalSection(&cs);
  CloseHandle(_testing_mutex);
}

/*-----------------------------------------------------------------------------
  Stub entry point for the background work thread
-----------------------------------------------------------------------------*/
static unsigned __stdcall WorkThreadProc(void* arg) {
  WptDriverCore * core = (WptDriverCore *)arg;
  if( core )
    core->WorkThread();
    
  return 0;
}

/*-----------------------------------------------------------------------------
  Stub entry point for the background message thread
-----------------------------------------------------------------------------*/
static unsigned __stdcall MessageThreadProc(void* arg) {
  WptDriverCore * core = (WptDriverCore *)arg;
  if( core )
    core->MessageThread();
    
  return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptDriverCore::Start(void){
  _status.Set(_T("Starting..."));

  if( _settings.Load() ){

    // boost our priority
    SetPriorityClass(GetCurrentProcess(), ABOVE_NORMAL_PRIORITY_CLASS);

    // start a background thread to do all of the actual test management
    _message_thread = (HANDLE)_beginthreadex(0, 0, ::MessageThreadProc, this, 
                                              0, 0);
    _work_thread = (HANDLE)_beginthreadex(0, 0, ::WorkThreadProc, this, 0, 0);
  }else{
    _status.Set(_T("Error loading settings from wptdriver.ini"));
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptDriverCore::Stop(void) {
  _status.Set(_T("Stopping..."));

  _exit = true;
  if (_work_thread) {
    WaitForSingleObject(_work_thread, EXIT_TIMEOUT);
    CloseHandle(_work_thread);
    _work_thread = NULL;
  }
  if (_message_thread) {
    if (_message_window)
      PostMessage(_message_window, WM_QUIT, 0, 0);
    WaitForSingleObject(_message_thread, EXIT_TIMEOUT);
    CloseHandle(_message_thread);
    _message_thread = NULL;
  }

  _status.Set(_T("Exiting..."));
}

/*-----------------------------------------------------------------------------
  Main thread for processing work
-----------------------------------------------------------------------------*/
void WptDriverCore::WorkThread(void) {
  Sleep(_settings._startup_delay * SECONDS_TO_MS);
  Init();  // do initialization and machine configuration
  _status.Set(_T("Starting Web Server..."));
  _test_server.Start();
  _status.Set(_T("Running..."));
  while( !_exit ){
    WaitForSingleObject(_testing_mutex, INFINITE);
    _status.Set(_T("Checking for work..."));

    WptTest test;
    if( _webpagetest.GetTest(test) ){
      if( !test._test_type.CompareNoCase(_T("traceroute")) )
      {
        // Calculate traceroute.
        CTraceRoute trace_route(test);
        // loop over all of the test runs
        for (test._run = 1; test._run <= test._runs; test._run++) {
          // Set the result file base.
          test.SetFileBase();
          trace_route.Run();
        }
        bool uploaded = false;
        for (int count = 0; count < UPLOAD_RETRY_COUNT && !uploaded;count++ ) {
          uploaded = _webpagetest.TestDone(test);
          if( !uploaded )
            Sleep(UPLOAD_RETRY_DELAY * SECONDS_TO_MS);
        }
      }    
      else if (ConfigureIpfw(test)) {
        _status.Set(_T("Launching browser..."));   
        EnterCriticalSection(&cs);
        _browser = new WebBrowser(_settings, test, _status, _hook, 
                                    _settings._browser_chrome);

        // configure the internal web server with information about the test
        _test_server.SetTest(&test);
        _test_server.SetBrowser(_browser);
        LeaveCriticalSection(&cs);

        for (test._run = 1; test._run <= test._runs; test._run++){
          test.SetFileBase();

          // Run the first view test
          test._clear_cache = true;
          _browser->ClearCache();
          if( test._tcpdump ) {
            winpcap.StartCapture( test._file_base + _T(".cap") );
          }
          _browser->RunAndWait();
          if( test._tcpdump )
            winpcap.StopCapture();

          _webpagetest.UploadIncrementalResults(test);

          if( !test._fv_only ){
            // run the repeat view test
            test._clear_cache = false;
            if( test._tcpdump )
              winpcap.StartCapture( test._file_base + _T("_Cached.cap") );
            _browser->RunAndWait();
            if( test._tcpdump )
              winpcap.StopCapture();

            _webpagetest.UploadIncrementalResults(test);
          }

        }
        _browser->ClearCache();

        EnterCriticalSection(&cs);
        _test_server.SetBrowser(NULL);
        _test_server.SetTest(NULL);

        delete _browser;
        _browser = NULL;
        LeaveCriticalSection(&cs);

        bool uploaded = false;
        for (int count = 0; count < UPLOAD_RETRY_COUNT && !uploaded;count++ ) {
          uploaded = _webpagetest.TestDone(test);
          if( !uploaded )
            Sleep(UPLOAD_RETRY_DELAY * SECONDS_TO_MS);
        }
        ResetIpfw();
      }
      ReleaseMutex(_testing_mutex);
    } else {
      ReleaseMutex(_testing_mutex);
      _status.Set(_T("Waiting for work..."));
      int delay = _settings._polling_delay * SECONDS_TO_MS;
      while (!_exit && delay > 0) {
        Sleep(100);
        delay -= 100;
      }
    }
  }

  _test_server.Stop();
}

/*-----------------------------------------------------------------------------
  Do any startup initialization (settings have already loaded)
-----------------------------------------------------------------------------*/
void WptDriverCore::Init(void){
  // set the OS to not boost foreground processes
  HKEY hKey;
  if (SUCCEEDED(RegOpenKeyEx(HKEY_LOCAL_MACHINE, 
      _T("SYSTEM\\CurrentControlSet\\Control\\PriorityControl"), 0, 
      KEY_SET_VALUE, &hKey))) {
    DWORD val = 0x18;
    RegSetValueEx(hKey, _T("Win32PrioritySeparation"), 0, REG_DWORD, 
                  (LPBYTE)&val, sizeof(val));
    RegCloseKey(hKey);
  }
  
  // Get WinPCap ready (install it if necessary)
  winpcap.Initialize();
}

typedef int (CALLBACK* DNSFLUSHPROC)();

/*-----------------------------------------------------------------------------
  Empty the OS DNS cache
-----------------------------------------------------------------------------*/
void WptDriverCore::FlushDNS(void) {
  _status.Set(_T("Flushing DNS cache..."));

  bool flushed = false;
  HINSTANCE		hDnsDll;

  hDnsDll = LoadLibrary(_T("dnsapi.dll"));
  if (hDnsDll) {
    DNSFLUSHPROC pDnsFlushProc = (DNSFLUSHPROC)GetProcAddress(hDnsDll, 
                                                      "DnsFlushResolverCache");
    if (pDnsFlushProc) {
      int ret = pDnsFlushProc();
      if (ret == ERROR_SUCCESS) {
        flushed = true;
        _status.Set(_T("Successfully flushed the DNS resolved cache"));
      } else
        _status.Set(_T("DnsFlushResolverCache returned %d"), ret);
    } else
      _status.Set(_T("Failed to load dnsapi.dll"));

    FreeLibrary(hDnsDll);
  } else
    _status.Set(_T("Failed to load dnsapi.dll"));

  if (!flushed)
    LaunchProcess(_T("ipconfig.exe /flushdns"));
}

/*-----------------------------------------------------------------------------
  Set up bandwidth throttling
-----------------------------------------------------------------------------*/
bool WptDriverCore::ConfigureIpfw(WptTest& test) {
  bool ret = false;
  if (test._bwIn && test._bwOut) {
    // split the latency across directions
    DWORD latency = test._latency / 2;

    CString buff;
    buff.Format(_T("[urlblast] - Throttling: %d Kbps in, %d Kbps out, ")
                _T("%d ms latency, %0.2f plr"), test._bwIn, test._bwOut, 
                test._latency, test._plr );
    OutputDebugString(buff);

    if (_ipfw.CreatePipe(pipeIn, test._bwIn*1000, latency,test._plr/100.0)) {
      // make up for odd values
      if( test._latency % 2 )
        latency++;

      if (_ipfw.CreatePipe(pipeOut, test._bwOut*1000,latency,test._plr/100.0))
        ret = true;
      else
        _ipfw.CreatePipe(pipeIn, 0, 0, 0);
    }
  }
  else
    ret = true;
  return ret;
}

/*-----------------------------------------------------------------------------
  Remove the bandwidth throttling
-----------------------------------------------------------------------------*/
void WptDriverCore::ResetIpfw(void) {
  _ipfw.CreatePipe(pipeIn, 0, 0, 0);
  _ipfw.CreatePipe(pipeOut, 0, 0, 0);
}


/*-----------------------------------------------------------------------------
  WndProc for the messaging window
-----------------------------------------------------------------------------*/
static LRESULT CALLBACK WptDriverWindowProc(HWND hwnd, UINT uMsg, 
                                               WPARAM wParam, LPARAM lParam) {
  LRESULT ret = 0;
  bool handled = false;
  if (global_core)
    handled = global_core->OnMessage(uMsg);
  if (!handled)
    ret = DefWindowProc(hwnd, uMsg, wParam, lParam);
  return ret;
}

/*-----------------------------------------------------------------------------
  Background window and thread for processing messages from the hook dll
-----------------------------------------------------------------------------*/
void WptDriverCore::MessageThread(void) {
  // create a hidden window for processing messages from wptdriver
  WNDCLASS wndClass;
  memset(&wndClass, 0, sizeof(wndClass));
  wndClass.lpszClassName = wptdriver_window_class;
  wndClass.lpfnWndProc = WptDriverWindowProc;
  wndClass.hInstance = hInst;
  if (RegisterClass(&wndClass)) {
    _message_window = CreateWindow(wptdriver_window_class, 
                                    wptdriver_window_class, 
                                    WS_POPUP, 0, 0, 0, 
                                    0, NULL, NULL, hInst, NULL);
    if (_message_window) {
      MSG msg;
      BOOL bRet;
      while ((bRet = GetMessage(&msg, _message_window, 0, 0)) != 0) {
        if (bRet != -1) {
          TranslateMessage(&msg);
          DispatchMessage(&msg);
        }
      }
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptDriverCore::OnMessage(UINT message) {
  bool ret = true;

  switch (message) {
    case WPT_HOOK_DONE:
        ATLTRACE2(_T("[wptdriver] OnMessage() - WPT_HOOK_DONE\n"));
        EnterCriticalSection(&cs);
        if (_browser)
          _browser->Close();
        LeaveCriticalSection(&cs);
        break;

    default:
        ret = false;
        break;
  }

  return ret;
}

