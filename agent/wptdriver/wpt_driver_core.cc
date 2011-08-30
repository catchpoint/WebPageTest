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
#include "web_page_replay.h"
#include "wpt_driver_core.h"
#include "zlib/contrib/minizip/unzip.h"
#include <Wtsapi32.h>
#include "dbghelp/dbghelp.h"

const int PIPE_IN = 1;
const int PIPE_OUT = 2;
const TCHAR * BROWSERS[] = {
  _T("chrome.exe"),
  _T("firefox.exe"),
  _T("iexplore.exe")
};

WptDriverCore * global_core = NULL;
extern HINSTANCE hInst;

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptDriverCore::WptDriverCore(WptStatus &status):
  _status(status)
  ,_webpagetest(_settings, _status)
  ,_browser(NULL)
  ,_exit(false)
  ,_work_thread(NULL) {
  global_core = this;
  _testing_mutex = CreateMutex(NULL, FALSE, _T("Global\\WebPagetest"));
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptDriverCore::~WptDriverCore(void) {
  global_core = NULL;
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
-----------------------------------------------------------------------------*/
void WptDriverCore::Start(void){
  _status.Set(_T("Starting..."));

  if( _settings.Load() ){

    // boost our priority
    SetPriorityClass(GetCurrentProcess(), ABOVE_NORMAL_PRIORITY_CLASS);

    // start a background thread to do all of the actual test management
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
  _webpagetest._exit = true;
  if (_work_thread) {
    WaitForSingleObject(_work_thread, EXIT_TIMEOUT);
    CloseHandle(_work_thread);
    _work_thread = NULL;
  }

  _status.Set(_T("Exiting..."));
}

/*-----------------------------------------------------------------------------
  Main thread for processing work
-----------------------------------------------------------------------------*/
void WptDriverCore::WorkThread(void) {
  Sleep(_settings._startup_delay * SECONDS_TO_MS);
  Init();  // do initialization and machine configuration
  _status.Set(_T("Running..."));
  while (!_exit) {
    WaitForSingleObject(_testing_mutex, INFINITE);
    _status.Set(_T("Checking for work..."));

    WptTestDriver test(_settings._timeout * SECONDS_TO_MS);
    if (_webpagetest.GetTest(test)) {
      _status.Set(_T("Starting test..."));
      if (_settings.SetBrowser(test._browser)) {
        WebBrowser browser(_settings, test, _status, _settings._browser);
        if (SetupWebPageReplay(test, browser) &&
            !TracerouteTest(test) &&
            ConfigureIpfw(test)) {
          for (test._run = 1; test._run <= test._runs; test._run++) {
            test._clear_cache = true;
            BrowserTest(test, browser);
            if (!test._fv_only) {
              test._clear_cache = false;
              BrowserTest(test, browser);
            }
          }
        }
        ResetIpfw();

        bool uploaded = false;
        for (int count = 0; count < UPLOAD_RETRY_COUNT && !uploaded;count++ ) {
          uploaded = _webpagetest.TestDone(test);
          if( !uploaded )
            Sleep(UPLOAD_RETRY_DELAY * SECONDS_TO_MS);
        }
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
}

/*-----------------------------------------------------------------------------
  Check to see if it is a traceroute test and run it
  returns true if it was a traceroute test
-----------------------------------------------------------------------------*/
bool WptDriverCore::TracerouteTest(WptTestDriver& test) {
  bool ret = false;

  if (!test._test_type.CompareNoCase(_T("traceroute"))) {
    ret = true;
    CTraceRoute trace_route(test);
    for (test._run = 1; test._run <= test._runs; test._run++) {
      test.SetFileBase();
      trace_route.Run();
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
  Run a single iteration of a browser test (first or repeat view)
-----------------------------------------------------------------------------*/
bool WptDriverCore::BrowserTest(WptTestDriver& test, WebBrowser &browser) {
  bool ret = false;

  WptTrace(loglevel::kFunction,_T("[wptdriver] WptDriverCore::BrowserTest\n"));

  test.SetFileBase();
  if (test._clear_cache)
    browser.ClearUserData();
  if (test._tcpdump)
    _winpcap.StartCapture( test._file_base + _T(".cap") );

  ret = browser.RunAndWait();

  if (test._tcpdump)
    _winpcap.StopCapture();
  KillBrowsers();
  if (test._upload_incremental_results) {
    _webpagetest.UploadIncrementalResults(test);
  } else {
    _webpagetest.DeleteIncrementalResults(test);
  }
  WptTrace(loglevel::kFunction, 
            _T("[wptdriver] WptDriverCore::BrowserTest done\n"));

  return ret;
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

  ExtractZipFiles();

  // Get WinPCap ready (install it if necessary)
  _winpcap.Initialize();

  KillBrowsers();

  // copy dbghelp.dll and symsrv.dll to the chrome directory
/*
  TCHAR src_dir[MAX_PATH];
  GetModuleFileName(NULL, src_dir, _countof(src_dir));
  *PathFindFileName(src_dir) = _T('\0');
  CString src = src_dir;
  CopyFile(src + _T("dbghelp.dll"), 
            _settings._browser._exe_directory + _T("\\dbghelp.dll"), FALSE);
  CopyFile(src + _T("symsrv.dll"), 
            _settings._browser._exe_directory + _T("\\symsrv.dll"), FALSE);

  // download the symbol files for the browsers
  // we'll just be caching it here and downloading it for real in wpthook
  SymSetOptions(SYMOPT_DEBUG | SYMOPT_FAVOR_COMPRESSED |
                SYMOPT_IGNORE_NT_SYMPATH | SYMOPT_INCLUDE_32BIT_MODULES |
                SYMOPT_NO_PROMPTS);
  char symcache[MAX_PATH] = {'\0'};
  char sympath[1024];
  GetModuleFileNameA(NULL, symcache, _countof(symcache));
  lstrcpyA(PathFindFileNameA(symcache), "symbols");
  CreateDirectoryA(symcache, NULL);
  wsprintfA(sympath,"SRV*%s*"
    "http://chromium-browser-symsrv.commondatastorage.googleapis.com",
    symcache);
  if (SymInitialize(GetCurrentProcess(), sympath, FALSE)) {
    DownloadSymbols(_settings._browser._exe_directory);
    SymCleanup(GetCurrentProcess());
  }
*/
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
bool WptDriverCore::ConfigureIpfw(WptTestDriver& test) {
  bool ret = false;
  if (test._bwIn && test._bwOut) {
    // split the latency across directions
    DWORD latency = test._latency / 2;

    CString buff;
    buff.Format(_T("[urlblast] - Throttling: %d Kbps in, %d Kbps out, ")
                _T("%d ms latency, %0.2f plr"), test._bwIn, test._bwOut, 
                test._latency, test._plr );
    OutputDebugString(buff);

    if (_ipfw.CreatePipe(PIPE_IN, test._bwIn*1000, latency,test._plr/100.0)) {
      // make up for odd values
      if( test._latency % 2 )
        latency++;

      if (_ipfw.CreatePipe(PIPE_OUT, test._bwOut*1000,latency,test._plr/100.0))
        ret = true;
      else
        _ipfw.CreatePipe(PIPE_IN, 0, 0, 0);
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
  _ipfw.CreatePipe(PIPE_IN, 0, 0, 0);
  _ipfw.CreatePipe(PIPE_OUT, 0, 0, 0);
}


/*-----------------------------------------------------------------------------
  Set up Web Page Replay (Record the page then start playback for it.)
-----------------------------------------------------------------------------*/
bool WptDriverCore::SetupWebPageReplay(
    WptTestDriver& test, WebBrowser &browser) {
  bool ret = true;
  if (!_settings._web_page_replay_host.IsEmpty()) {
    if (WebPageReplaySetRecordMode(_settings._web_page_replay_host)) {
      test._clear_cache = true;
      ret = BrowserTest(test, browser);
      if (!test._fv_only) {
        test._clear_cache = false;
        ret = BrowserTest(test, browser);
      }
      WebPageReplaySetReplayMode(_settings._web_page_replay_host);
    } else {
      _status.Set(_T("Web Page Replay Record FAILED"));
      ret = false;
    }
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptDriverCore::ExtractZipFiles() {
  TCHAR src_path[MAX_PATH];
  GetModuleFileName(NULL, src_path, MAX_PATH);
  *PathFindFileName(src_path) = 0;
  CString src = src_path;

  WIN32_FIND_DATA fd;
  HANDLE find_handle = FindFirstFile(src + _T("*.zip"), &fd);
  if (find_handle != INVALID_HANDLE_VALUE) {
    do {
      if (!(fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY)) {
        if (ExtractZipFile(src + fd.cFileName))
          DeleteFile(src + fd.cFileName);
      }
    } while( FindNextFile(find_handle, &fd) );
    FindClose(find_handle);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptDriverCore::ExtractZipFile(CString file) {
  bool ret = false;

  unzFile zip_file_handle = unzOpen(CT2A(file));
  if (zip_file_handle) {
    ret = true;
    if (unzGoToFirstFile(zip_file_handle) == UNZ_OK) {
      TCHAR path[MAX_PATH];
      lstrcpy(path, (LPCTSTR)file);
      *PathFindFileName(path) = 0;
      CStringA dir = CT2A(path);
      DWORD len = 4096;
      LPBYTE buff = (LPBYTE)malloc(len);
      if (buff) {
        do {
          char file_name[MAX_PATH];
          unz_file_info info;
          if (unzGetCurrentFileInfo(zip_file_handle, &info, (char *)&file_name,
              _countof(file_name), 0, 0, 0, 0) == UNZ_OK) {
              CStringA dest_file_name = dir + file_name;

            // make sure the directory exists
            char szDir[MAX_PATH];
            lstrcpyA(szDir, (LPCSTR)dest_file_name);
            *PathFindFileNameA(szDir) = 0;
            if( lstrlenA(szDir) > 3 )
              SHCreateDirectoryExA(NULL, szDir, NULL);

            HANDLE dest_file = CreateFileA(dest_file_name, GENERIC_WRITE, 0, 
                                          NULL, CREATE_ALWAYS, 0, 0);
            if (dest_file != INVALID_HANDLE_VALUE) {
              if (unzOpenCurrentFile(zip_file_handle) == UNZ_OK) {
                int bytes = 0;
                DWORD written;
                do {
                  bytes = unzReadCurrentFile(zip_file_handle, buff, len);
                  if( bytes > 0 )
                    WriteFile( dest_file, buff, bytes, &written, 0);
                } while( bytes > 0 );
                unzCloseCurrentFile(zip_file_handle);
              }
              CloseHandle( dest_file );
            }
          }
        } while (unzGoToNextFile(zip_file_handle) == UNZ_OK);

        free(buff);
      }
    }

    unzClose(zip_file_handle);
  }

  return ret;
}

/*-----------------------------------------------------------------------------
  Download the debug symbols for Chrome so they will be ready when 
  the browser needs them
-----------------------------------------------------------------------------*/
void WptDriverCore::DownloadSymbols(CString directory) {
  _status.Set(_T("Downloading debug symbols..."));

  WptTrace(loglevel::kFunction, 
            _T("[wptdriver] - Downloading debug symbols in %s\n"), 
              (LPCTSTR)directory);
  WIN32_FIND_DATA fd;
  HANDLE find = FindFirstFile(directory + _T("\\*.*"), &fd);
  if (find != INVALID_HANDLE_VALUE) {
    do {
      if (fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) {
        if (lstrcmp(fd.cFileName, _T(".")) && 
            lstrcmp(fd.cFileName, _T("..")) )
          DownloadSymbols(directory + CString(_T("\\")) + fd.cFileName);
      } else if (!lstrcmpi(fd.cFileName, _T("chrome.dll"))) {
        WptTrace(loglevel::kFunction, 
                  _T("[wptdriver] - Downloading debug symbols for %s\n"), 
                  fd.cFileName);
        CStringA dll_path = CT2A(directory + CString(_T("\\")) + fd.cFileName);
        DWORD64 mod = SymLoadModuleEx(GetCurrentProcess(), NULL, dll_path, 
                        NULL, 0, 0, NULL, 0);
        if (mod)
          SymUnloadModule64(GetCurrentProcess(), mod);
      }
    } while (FindNextFile(find, &fd));
    FindClose(find);
  }
}

/*-----------------------------------------------------------------------------
  Kill any rogue browser processes that didn't go away on their own
  This is disabled in debug mode to make it easier to develop
-----------------------------------------------------------------------------*/
void WptDriverCore::KillBrowsers() {
  if (!_settings._debug) {
    WTS_PROCESS_INFO * proc = NULL;
    DWORD count = 0;
    DWORD browser_count = _countof(BROWSERS);
    if (WTSEnumerateProcesses(WTS_CURRENT_SERVER_HANDLE, 0, 1, &proc,&count)) {
      for (DWORD i = 0; i < count; i++) {
        bool terminate = false;

        for (DWORD browser = 0; browser < browser_count && !terminate; 
              browser++) {
          TCHAR * process = PathFindFileName(proc[i].pProcessName);
          if (!lstrcmpi(process, BROWSERS[browser]) )
            terminate = true;
        }

        if (terminate) {
          HANDLE process_handle = OpenProcess(PROCESS_TERMINATE, FALSE, 
                                                proc[i].ProcessId);
          if (process_handle) {
            TerminateProcess(process_handle, 0);
            CloseHandle(process_handle);
          }
        }
      }
    }
  }
}
