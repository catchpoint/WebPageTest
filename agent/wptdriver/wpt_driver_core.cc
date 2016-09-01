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
#include <D3D9.h>

const TCHAR * BROWSERS[] = {
  _T("chrome.exe"),
  _T("firefox.exe"),
  _T("iexplore.exe"),
  _T("plugin-container.exe")
};

const TCHAR * DIALOG_WHITELIST[] = { 
  _T("urlblast")
  , _T("url blast")
  , _T("task manager")
  , _T("aol pagetest")
  , _T("shut down windows")
  , _T("vmware")
  , _T("security essentials")
};

const DWORD SOFTWARE_INSTALL_RETRY_DELAY = 30000; // try every 30 seconds
const DWORD HOUSEKEEPING_INTERVAL = 500;

WptDriverCore * global_core = NULL;
extern HINSTANCE hInst;

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptDriverCore::WptDriverCore(WptStatus &status):
  _status(status)
  ,_webpagetest(_settings, _status)
  ,_browser(NULL)
  ,_exit(false)
  ,_work_thread(NULL)
  ,housekeeping_timer_(NULL)
  ,has_gpu_(false)
  ,watchdog_started_(false)
  ,_installing(false)
  ,_settings(status) {
  global_core = this;
  reboot_time_.QuadPart = 0;
  _testing_mutex = CreateMutex(NULL, FALSE, _T("Global\\WebPagetest"));
  has_gpu_ = DetectGPU();
  _webpagetest.has_gpu_ = has_gpu_;
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
void __stdcall DoHouseKeeping(PVOID lpParameter, BOOLEAN TimerOrWaitFired) {
  if( lpParameter )
    ((WptDriverCore *)lpParameter)->DoHouseKeeping();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptDriverCore::Start(void){
  _status.Set(_T("Starting..."));

  // start a background thread to do all of the actual test management
  _work_thread = (HANDLE)_beginthreadex(0, 0, ::WorkThreadProc, this, 0, 0);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptDriverCore::Stop(void) {
  _status.Set(_T("Stopping..."));

  // kill the watchdog
  HWND watchdog = FindWindow(_T("WPT_Watchdog"), NULL);
  if (watchdog)
    SendMessageTimeout(watchdog, WM_CLOSE, 0, 0, 0, 10000, NULL);

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
  Startup initilization
-----------------------------------------------------------------------------*/
bool WptDriverCore::Startup() {
  bool ok = false;

  // Clear out any old test config if it is present
  PostTest();

  do {
    ok = _settings.Load();
    if (!ok) {
      _status.Set(_T("Problem loading settings, trying again..."));
      Sleep(1000);
    }
  } while (!ok && !_exit);

  if( ok ){
    // boost our priority
    SetPriorityClass(GetCurrentProcess(), ABOVE_NORMAL_PRIORITY_CLASS);

    WaitForSingleObject(_testing_mutex, INFINITE);
    SetupScreen();
    ReleaseMutex(_testing_mutex);
  }else{
    _exit = true;
    _status.Set(_T("Error loading settings from wptdriver.ini"));
  }

  return ok;
}

/*-----------------------------------------------------------------------------
  Main thread for processing work
-----------------------------------------------------------------------------*/
void WptDriverCore::WorkThread(void) {
  if (Startup()) {
    Sleep(_settings._startup_delay * SECONDS_TO_MS);

    WaitForSingleObject(_testing_mutex, INFINITE);
    Init();  // do initialization and machine configuration
    ReleaseMutex(_testing_mutex);

    _status.Set(_T("Running..."));
  }
  while (!_exit && !NeedsReboot()) {
    WaitForSingleObject(_testing_mutex, INFINITE);
    _status.Set(_T("Checking for software updates..."));
    _installing = true;
    _settings.UpdateSoftware();
    _installing = false;
    _status.Set(_T("Checking for work..."));
    WptTestDriver test(_settings._timeout * SECONDS_TO_MS, has_gpu_);
    if (_webpagetest.GetTest(test)) {
      PreTest();
      test._run = test._specific_run ? test._specific_run : 1;
      _status.Set(_T("Starting test..."));
      if (_settings.SetBrowser(test._browser, test._browser_url,
                               test._browser_md5, test._client)) {
        CString profiles_dir = _settings._browser._profiles;
        if (profiles_dir.GetLength())
          DeleteDirectory(profiles_dir, false);
        WebBrowser browser(_settings, test, _status, _settings._browser, 
                           _ipfw, _webpagetest.WptVersion());
        if (SetupWebPageReplay(test, browser) &&
            !TracerouteTest(test)) {
          test._index = test._specific_index ? test._specific_index : 1;
          for (test._run = 1; test._run <= test._runs; test._run++) {
            test._run_error.Empty();
            test._run = test._specific_run ? test._specific_run : test._run;
            test._clear_cache = true;
            bool ok = BrowserTest(test, browser);
            if (!test._fv_only) {
              test._clear_cache = false;
              if (ok) {
                test._run_error.Empty();
                BrowserTest(test, browser);
              } else {
                CStringA first_run_error = test._run_error;
                if (!first_run_error.GetLength()) {
                  int result = GetTestResult();
                  if (result != 0 && result != 99999)
                    first_run_error.Format(
                        "Test run failed with result code %d", result);
                }
                test._run_error =
                    CStringA("Skipped repeat view, first view failed: ") +
                    first_run_error;
                _webpagetest.UploadIncrementalResults(test);
              }
            }
            if (test._specific_run)
              break;
            else if (test._discard > 0)
              test._discard--;
            else
              test._index++;
          }
        }
        test._run = test._specific_run ? test._specific_run : test._runs;
        if (profiles_dir.GetLength())
          DeleteDirectory(profiles_dir, false);
      } else {
        test._test_error = test._run_error =
            CStringA("Invalid Browser Selected: ") + CT2A(test._browser);
      }
      bool uploaded = false;
      for (int count = 0; count < UPLOAD_RETRY_COUNT && !uploaded;count++ ) {
        uploaded = _webpagetest.TestDone(test);
        if( !uploaded )
          Sleep(UPLOAD_RETRY_DELAY * SECONDS_TO_MS);
      }
      PostTest();
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
  Cleanup();
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
    test._index = test._specific_index ? test._specific_index : 1;
    for (test._run = 1; test._run <= test._runs; test._run++) {
      test._run_error.Empty();
      test._run = test._specific_run ? test._specific_run : test._run;
      test.SetFileBase();
      trace_route.Run();
      test._index++;
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

  test._run_error.Empty();
  ResetTestResult();
  test.SetFileBase();
  if (test._clear_cache) {
    FlushDNS();
    browser.ClearUserData();
  }

  SetCursorPos(0,0);
  ShowCursor(FALSE);
  ret = browser.RunAndWait();
  ShowCursor(TRUE);

  _webpagetest.UploadIncrementalResults(test);
  KillBrowsers();

  if (ret) {
    int result = GetTestResult();
    if (result != 0 && result != 99999)
      ret = false;
  }

  WptTrace(loglevel::kFunction, 
            _T("[wptdriver] WptDriverCore::BrowserTest done\n"));

  return ret;
}

typedef HRESULT (STDAPICALLTYPE* DLLREG)(void);

/*-----------------------------------------------------------------------------
  Do any startup initialization (settings have already loaded)
-----------------------------------------------------------------------------*/
void WptDriverCore::Init(void){

  // Clear IE's caches
  LaunchProcess(_T("RunDll32.exe InetCpl.cpl,ClearMyTracksByProcess 6655"));

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

  // Set it to reboot automatically with Windows updates
  if (SUCCEEDED(RegOpenKeyEx(HKEY_LOCAL_MACHINE, 
      _T("SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU"), 0, 
      KEY_SET_VALUE, &hKey))) {
    DWORD val = 1;
    RegSetValueEx(hKey, _T("AlwaysAutoRebootAtScheduledTime"), 0, REG_DWORD, 
                  (LPBYTE)&val, sizeof(val));
    RegCloseKey(hKey);
  }

  ExtractZipFiles();

  // register the IE BHO if it is in the directory
  TCHAR path[MAX_PATH];
  if (GetModuleFileName(NULL, path, _countof(path)) ) 	{ 
    lstrcpy(PathFindFileName(path), _T("wptbho.dll") );
    HMODULE bho = LoadLibrary(path);
    if (bho) {
      DLLREG proc = (DLLREG)GetProcAddress(bho, "DllRegisterServer");
      if( proc )
        proc();
      FreeLibrary(bho);
    }
  }

  // Disable IE auto-updates
	if (SUCCEEDED(RegCreateKeyEx(HKEY_LOCAL_MACHINE,
      _T("SOFTWARE\\Microsoft\\Internet Explorer\\Setup\\9.0"), 0, 0, 0,
      KEY_READ | KEY_WRITE, NULL, &hKey, NULL))) {
		DWORD val = 1;
		RegSetValueEx(hKey, _T("DoNotAllowIE90"), 0, REG_DWORD,
                  (LPBYTE)&val, sizeof(val));
		RegCloseKey(hKey);
	}
	if (SUCCEEDED(RegCreateKeyEx(HKEY_LOCAL_MACHINE,
      _T("SOFTWARE\\Microsoft\\Internet Explorer\\Setup\\10.0"), 0, 0, 0,
      KEY_READ | KEY_WRITE, NULL, &hKey, NULL))) {
		DWORD val = 1;
		RegSetValueEx(hKey, _T("DoNotAllowIE10"), 0, REG_DWORD,
                  (LPBYTE)&val, sizeof(val));
		RegCloseKey(hKey);
	}
	if (SUCCEEDED(RegCreateKeyEx(HKEY_LOCAL_MACHINE,
      _T("SOFTWARE\\Microsoft\\Internet Explorer\\Setup\\11.0"), 0, 0, 0,
      KEY_READ | KEY_WRITE, NULL, &hKey, NULL))) {
		DWORD val = 1;
		RegSetValueEx(hKey, _T("DoNotAllowIE11"), 0, REG_DWORD,
                  (LPBYTE)&val, sizeof(val));
		RegCloseKey(hKey);
	}

	// Disable OS Upgrade in Windows Update
	if (SUCCEEDED(RegCreateKeyEx(HKEY_LOCAL_MACHINE,
		_T("SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate"), 0, 0, 0,
		KEY_READ | KEY_WRITE, NULL, &hKey, NULL))) {
		DWORD val = 1;
		RegSetValueEx(hKey, _T("DisableOSUpgrade"), 0, REG_DWORD,
			(LPBYTE)&val, sizeof(val));
		RegCloseKey(hKey);
	}

	// Disable Windows 10 upgrade nag dialog
	if (SUCCEEDED(RegCreateKeyEx(HKEY_LOCAL_MACHINE,
		_T("SOFTWARE\\Policies\\Microsoft\\Windows\\GWX"), 0, 0, 0,
		KEY_READ | KEY_WRITE, NULL, &hKey, NULL))) {
		DWORD val = 1;
		RegSetValueEx(hKey, _T("DisableGWX"), 0, REG_DWORD,
			(LPBYTE)&val, sizeof(val));
		RegCloseKey(hKey);
	}

  KillBrowsers();

  _installing = true;
  _status.Set(_T("Installing software..."));
  while( !_settings.UpdateSoftware() && !_exit ) {
    _status.Set(_T("Software install failed, waiting to try again..."));
    Sleep(SOFTWARE_INSTALL_RETRY_DELAY);
    _status.Set(_T("Installing software..."));
  }
  _installing = false;

  SetupScreen();

  // start the background timer that does our housekeeping
  CreateTimerQueueTimer(&housekeeping_timer_, NULL, ::DoHouseKeeping, this, 
      HOUSEKEEPING_INTERVAL, HOUSEKEEPING_INTERVAL, WT_EXECUTEDEFAULT);
}

/*-----------------------------------------------------------------------------
  Do our cleanup on exit
-----------------------------------------------------------------------------*/
void WptDriverCore::Cleanup(void){
  if (housekeeping_timer_) {
    DeleteTimerQueueTimer(NULL, housekeeping_timer_, NULL);
    housekeeping_timer_ = NULL;
  }
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

  if (!flushed) {
    HANDLE async = NULL;
    LaunchProcess(_T("ipconfig.exe /flushdns"), &async);
    if (async)
      CloseHandle(async);
  }
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
  Kill any rogue browser processes that didn't go away on their own
  This is disabled in debug mode to make it easier to develop
-----------------------------------------------------------------------------*/
void WptDriverCore::KillBrowsers() {
  if (!_settings._debug) {
    WTS_PROCESS_INFO * proc = NULL;
    DWORD count = 0;
    DWORD browser_count = _countof(BROWSERS);
    if (WTSEnumerateProcesses(WTS_CURRENT_SERVER_HANDLE, 0, 1, &proc, &count)) {
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
      if (proc)
        WTSFreeMemory(proc);
    }
  }
}

/*-----------------------------------------------------------------------------
  Set the screen resolution if it is currently too low
-----------------------------------------------------------------------------*/
void WptDriverCore::SetupScreen(void) {
  if (!_settings._keep_resolution) {
    DEVMODE mode;
    memset(&mode, 0, sizeof(mode));
    mode.dmSize = sizeof(mode);
    CStringA settings;
    DWORD x = 0, y = 0, bpp = 0;

    int index = 0;
    DWORD targetWidth = 1920;
    DWORD targetHeight = 1200;
    DWORD min_bpp = 15;
    while( EnumDisplaySettings( NULL, index, &mode) ) {
      index++;
      bool use_mode = false;
      if (x >= targetWidth && y >= targetHeight && bpp >= 24) {
        // we already have at least one suitable resolution.  
        // Make sure we didn't overshoot and pick too high of a resolution
        // or see if a higher bpp is available
        if (mode.dmPelsWidth >= targetWidth && mode.dmPelsWidth <= x &&
            mode.dmPelsHeight >= targetHeight && mode.dmPelsHeight <= y &&
            mode.dmBitsPerPel >= bpp)
          use_mode = true;
      } else {
        if (mode.dmPelsWidth == x && mode.dmPelsHeight == y) {
          if (mode.dmBitsPerPel >= bpp)
            use_mode = true;
        } else if ((mode.dmPelsWidth >= targetWidth ||
                    mode.dmPelsWidth >= x) &&
                   (mode.dmPelsHeight >= targetHeight ||
                    mode.dmPelsHeight >= y) && 
                   mode.dmBitsPerPel >= min_bpp) {
            use_mode = true;
        }
      }
      if (use_mode) {
          x = mode.dmPelsWidth;
          y = mode.dmPelsHeight;
          bpp = mode.dmBitsPerPel;
      }
    }

    // get the current settings
    if (x && y && bpp && 
      EnumDisplaySettings(NULL, ENUM_CURRENT_SETTINGS, &mode)) {
      if (mode.dmPelsWidth < x || 
          mode.dmPelsHeight < y || 
          mode.dmBitsPerPel < bpp) {
        DEVMODE newMode;
        memcpy(&newMode, &mode, sizeof(mode));
      
        newMode.dmFields = DM_BITSPERPEL | DM_PELSWIDTH | DM_PELSHEIGHT;
        newMode.dmBitsPerPel = bpp;
        newMode.dmPelsWidth = x;
        newMode.dmPelsHeight = y;
        ChangeDisplaySettings( &newMode, CDS_UPDATEREGISTRY | CDS_GLOBAL );
      }
    }
  }
}

/*-----------------------------------------------------------------------------
  Run the dummynet initialization script if it is present
-----------------------------------------------------------------------------*/
void WptDriverCore::SetupDummynet(void) {
  _status.Set(_T("Configuring dummynet..."));
}

/*-----------------------------------------------------------------------------
  Take care of the periodic housekeeping tasks (closing dialogs,
  terminating processes)
-----------------------------------------------------------------------------*/
void WptDriverCore::DoHouseKeeping(void) {
  CloseDialogs();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptDriverCore::CloseDialogs(void) {
  TCHAR szTitle[1025];
  // make sure wptdriver isn't doing a software install
  bool installing = _installing;
  HWND hWptDriver = ::FindWindow(_T("wptdriver_wnd"), NULL);
  if (hWptDriver) {
    if (::GetWindowText(hWptDriver, szTitle, _countof(szTitle))) {
      CString title = szTitle;
      title.MakeLower();
      if (title.Find(_T(" software")) >= 0)
        installing = true;
    }
  }

  // if there are any explorer windows open, disable this code
  // (for local debugging and other work)
  if (!installing && !::FindWindow(_T("CabinetWClass"), NULL )) {
    HWND hDesktop = ::GetDesktopWindow();
    HWND hWnd = ::GetWindow(hDesktop, GW_CHILD);
    TCHAR szClass[100];
    CAtlArray<HWND> hDlg;

    // build a list of dialogs to close
    while (hWnd) {
      if (hWnd != _status._wnd) {
        if (::IsWindowVisible(hWnd))
          if (::GetClassName(hWnd, szClass, 100))
            if (!lstrcmp(szClass,_T("#32770")) ||
                !lstrcmp(szClass,_T("Notepad")) ||
                !lstrcmp(szClass,_T("Internet Explorer_Server"))) {
              bool bKill = true;

              // make sure it is not in our list of windows to keep
              if (::GetWindowText( hWnd, szTitle, 1024)) {
                _tcslwr_s(szTitle, _countof(szTitle));
                for (int i = 0; i < _countof(DIALOG_WHITELIST) && bKill; i++) {
                  if(_tcsstr(szTitle, DIALOG_WHITELIST[i]))
                    bKill = false;
                }
                
                // do we have to terminate the process that owns it?
                if (!lstrcmp(szTitle, _T("server busy"))) {
                  DWORD pid;
                  GetWindowThreadProcessId(hWnd, &pid);
                  HANDLE hProcess = OpenProcess(PROCESS_TERMINATE, FALSE, pid);
                  if (hProcess) {
                    TerminateProcess(hProcess, 0);
                    CloseHandle(hProcess);
                  }
                }
              }
            
              if(bKill)
                hDlg.Add(hWnd);	
            }
      }
      hWnd = ::GetWindow(hWnd, GW_HWNDNEXT);
    }

    for (size_t i = 0; i < hDlg.GetCount(); i++)
      ::PostMessage(hDlg[i],WM_CLOSE,0,0);
  }
}

/*-----------------------------------------------------------------------------
  See if a video adapter is present that supports hardware acceleration
-----------------------------------------------------------------------------*/
bool WptDriverCore::DetectGPU() {
  bool has_gpu = false;
  HMODULE dll = LoadLibrary(_T("d3d9.dll"));
  if (dll) {
    typedef IDirect3D9 *(__stdcall * LPDIRECT3DCREATE9)(UINT SDKVersion);
    LPDIRECT3DCREATE9 Direct3DCreate9_ =
        (LPDIRECT3DCREATE9)GetProcAddress(dll, "Direct3DCreate9");
    if (Direct3DCreate9_) {
      LPDIRECT3D9 d3d = Direct3DCreate9_(D3D_SDK_VERSION);
      if (d3d) {
        static const TCHAR windowName[] = TEXT("WPTDxDetect");
        static const TCHAR className[] = TEXT("STATIC");
        HWND wnd = CreateWindowEx(WS_EX_NOACTIVATE, className, windowName,
                                  WS_DISABLED | WS_POPUP, 0, 0, 1, 1,
                                  HWND_MESSAGE, NULL,
                                  GetModuleHandle(NULL), NULL);
        LPDIRECT3DDEVICE9 device = NULL;
        D3DPRESENT_PARAMETERS present_parameters; 
        ZeroMemory( &present_parameters, sizeof(present_parameters) );
        present_parameters.AutoDepthStencilFormat = D3DFMT_UNKNOWN;
        present_parameters.BackBufferCount = 1;
        present_parameters.BackBufferFormat = D3DFMT_UNKNOWN;
        present_parameters.BackBufferWidth = 1;
        present_parameters.BackBufferHeight = 1;
        present_parameters.EnableAutoDepthStencil = FALSE;
        present_parameters.Flags = 0;
        present_parameters.hDeviceWindow = wnd;
        present_parameters.MultiSampleQuality = 0;
        present_parameters.MultiSampleType = D3DMULTISAMPLE_NONE;
        present_parameters.PresentationInterval = D3DPRESENT_INTERVAL_DEFAULT;
        present_parameters.SwapEffect = D3DSWAPEFFECT_DISCARD;
        present_parameters.Windowed = TRUE;

        if (SUCCEEDED(d3d->CreateDevice(D3DADAPTER_DEFAULT, D3DDEVTYPE_HAL,
            wnd, D3DCREATE_FPU_PRESERVE | D3DCREATE_NOWINDOWCHANGES |
            D3DCREATE_SOFTWARE_VERTEXPROCESSING, &present_parameters,
            &device)) && device) {
          has_gpu = true;
          device->Release();
        } else if (SUCCEEDED(d3d->CreateDevice(D3DADAPTER_DEFAULT,
            D3DDEVTYPE_HAL, wnd,
            D3DCREATE_FPU_PRESERVE | D3DCREATE_NOWINDOWCHANGES |
            D3DCREATE_HARDWARE_VERTEXPROCESSING | D3DCREATE_PUREDEVICE,
            &present_parameters, &device)) && device) {
          has_gpu = true;
          device->Release();
        }
        if (wnd)
          DestroyWindow(wnd);
        d3d->Release();
      }
    }
    FreeLibrary(dll);
  }
  return has_gpu;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptDriverCore::PreTest() {
  // launch the watchdog just before executing the first test
  if (!watchdog_started_) {
    watchdog_started_ = true;
    TCHAR path[MAX_PATH];
    GetModuleFileName(NULL, path, MAX_PATH);
    lstrcpy(PathFindFileName(path), _T("wptwatchdog.exe"));
    CString watchdog;
    watchdog.Format(_T("\"%s\" %d"), path, GetCurrentProcessId());
    HANDLE process = NULL;
    LaunchProcess(watchdog, &process);
    if (process)
      CloseHandle(process);
  }

  // Install a global appinit hook for wpthook (actual loading will be
  // controlled by a shared memory state)
  TCHAR path[MAX_PATH];
  if (GetModuleFileName(NULL, path, _countof(path))) {
    lstrcpy(PathFindFileName(path), _T("wptload.dll"));
    TCHAR short_path[MAX_PATH];
    if (GetShortPathName(path, short_path, _countof(short_path))) {
      HKEY hKey;
		  if (RegCreateKeyEx(HKEY_LOCAL_MACHINE,
          _T("SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Windows"),
          0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS ) {
			  DWORD val = 1;
			  RegSetValueEx(hKey, _T("LoadAppInit_DLLs"), 0, REG_DWORD,
                      (const LPBYTE)&val, sizeof(val));
			  val = 0;
			  RegSetValueEx(hKey, _T("RequireSignedAppInit_DLLs"), 0, REG_DWORD,
                      (const LPBYTE)&val, sizeof(val));
        LPTSTR dlls = GetAppInitString(short_path, false);
        if (dlls) {
			    RegSetValueEx(hKey, _T("AppInit_DLLs"), 0, REG_SZ,
                        (const LPBYTE)dlls,
                        (lstrlen(dlls) + 1) * sizeof(TCHAR));
          free(dlls);
        }
        RegCloseKey(hKey);
      }
    }
  }

  // Install the 64-bit appinit hook
  BOOL is64bit = FALSE;
  if (IsWow64Process(GetCurrentProcess(), &is64bit) && is64bit) {
    lstrcpy(PathFindFileName(path), _T("wptld64.dll"));
    TCHAR short_path[MAX_PATH];
    if (GetShortPathName(path, short_path, _countof(short_path))) {
      HKEY hKey;
		  if (RegCreateKeyEx(HKEY_LOCAL_MACHINE,
          _T("SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Windows"),
          0, 0, 0, KEY_WRITE | KEY_WOW64_64KEY, 0, &hKey, 0) == ERROR_SUCCESS ) {
			  DWORD val = 1;
			  RegSetValueEx(hKey, _T("LoadAppInit_DLLs"), 0, REG_DWORD,
                      (const LPBYTE)&val, sizeof(val));
			  val = 0;
			  RegSetValueEx(hKey, _T("RequireSignedAppInit_DLLs"), 0, REG_DWORD,
                      (const LPBYTE)&val, sizeof(val));
        LPTSTR dlls = GetAppInitString(short_path, true);
        if (dlls) {
			    RegSetValueEx(hKey, _T("AppInit_DLLs"), 0, REG_SZ,
                        (const LPBYTE)dlls,
                        (lstrlen(dlls) + 1) * sizeof(TCHAR));
          free(dlls);
        }
        RegCloseKey(hKey);
      }
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptDriverCore::PostTest() {
  // Remove the AppInit dll
  DWORD flags[2] = {0, KEY_WOW64_64KEY};
  HKEY hKey;
	if (RegCreateKeyEx(HKEY_LOCAL_MACHINE,
      _T("SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Windows"),
      0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS ) {
    LPTSTR dlls = GetAppInitString(NULL, false);
    if (dlls) {
			RegSetValueEx(hKey, _T("AppInit_DLLs"), 0, REG_SZ,
                    (const LPBYTE)dlls,
                    (lstrlen(dlls) + 1) * sizeof(TCHAR));
      free(dlls);
    }
    RegCloseKey(hKey);
  }
  BOOL is64bit = FALSE;
  if (IsWow64Process(GetCurrentProcess(), &is64bit) && is64bit) {
	  if (RegCreateKeyEx(HKEY_LOCAL_MACHINE,
        _T("SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Windows"),
        0, 0, 0, KEY_WRITE | KEY_WOW64_64KEY, 0, &hKey, 0) == ERROR_SUCCESS ) {
      LPTSTR dlls = GetAppInitString(NULL, true);
      if (dlls) {
			  RegSetValueEx(hKey, _T("AppInit_DLLs"), 0, REG_SZ,
                      (const LPBYTE)dlls,
                      (lstrlen(dlls) + 1) * sizeof(TCHAR));
        free(dlls);
      }
      RegCloseKey(hKey);
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LPTSTR WptDriverCore::GetAppInitString(LPCTSTR new_dll, bool is64bit) {
  LPTSTR dlls = NULL;
  DWORD len = 0;
  DWORD flags = is64bit ? KEY_WOW64_64KEY : 0;

  // get the existing appinit list
  HKEY hKey;
	if (RegCreateKeyEx(HKEY_LOCAL_MACHINE,
                      _T("SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion")
                      _T("\\Windows"),
                      0, 0, 0, KEY_READ, 0, &hKey, 0) == ERROR_SUCCESS ) {
    if (RegQueryValueEx(hKey, _T("AppInit_DLLs"), 0, NULL, NULL, &len) ==
        ERROR_SUCCESS) {
      if (new_dll && lstrlen(new_dll))
        len += (lstrlen(new_dll) + 1) * sizeof(TCHAR);
      dlls = (LPTSTR)malloc(len);
      memset(dlls, 0, len);
      DWORD bytes = len;
      RegQueryValueEx(hKey, _T("AppInit_DLLs"), 0, NULL, (LPBYTE)dlls, &bytes);
    }
    RegCloseKey(hKey);
  }

  // allocate memory in case there wasn't an existing list
  if (!dlls && new_dll && lstrlen(new_dll)) {
    len = (lstrlen(new_dll) + 1) * sizeof(TCHAR);
    dlls = (LPTSTR)malloc(len);
    memset(dlls, 0, len);
  }

  // remove any occurences of wptload.dll and wptld64.dll from the list
  if (dlls && lstrlen(dlls)) {
    LPTSTR new_list = (LPTSTR)malloc(len);
    memset(new_list, 0, len);
    LPTSTR dll = _tcstok(dlls, _T(" ,"));
    while (dll) {
      if (lstrcmpi(PathFindFileName(dll), _T("wptload.dll")) &&
          lstrcmpi(PathFindFileName(dll), _T("wptld64.dll"))) {
        if (lstrlen(new_list))
          lstrcat(new_list, _T(","));
        lstrcat(new_list, dll);
      }
      dll = _tcstok(NULL, _T(" ,"));
    }
    free(dlls);
    dlls = new_list;
  }

  // add the new dll to the list
  if (dlls && new_dll && lstrlen(new_dll)) {
    if (lstrlen(dlls))
      lstrcat(dlls, _T(","));
    lstrcat(dlls, new_dll);
  }

  return dlls;
}

/*-----------------------------------------------------------------------------
  Check to see if a reboot is needed for some reason.
  (right now just pending windows updates)
-----------------------------------------------------------------------------*/
bool WptDriverCore::NeedsReboot() {
  HKEY key;

  if (reboot_time_.QuadPart != 0) {
    LARGE_INTEGER now;
    QueryPerformanceCounter(&now);
    if (now.QuadPart >= reboot_time_.QuadPart) {
      _exit = true;
      Reboot();
    }
  } else {
    bool needs_reboot = false;
    if (ERROR_SUCCESS == RegOpenKeyEx(HKEY_LOCAL_MACHINE,
        L"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate"
        L"\\Auto Update\\RebootRequired", 0, 0, &key)) {
      needs_reboot = true;
      RegCloseKey(key);
    }

    if (needs_reboot) {
      // schedule a reboot for 1 hour from now to allow updates to finish installing
      LARGE_INTEGER now, freq;
      QueryPerformanceCounter(&now);
      QueryPerformanceFrequency(&freq);
      reboot_time_.QuadPart = now.QuadPart + (freq.QuadPart * 3600);
    }
  }

  return _exit;
}