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
#include "util.h"
#include "web_browser.h"

typedef void(__stdcall * LPINSTALLHOOK)(DWORD thread_id);
const int PIPE_IN = 1;
const int PIPE_OUT = 2;
static const TCHAR * GLOBAL_TESTING_MUTEX = _T("Global\\wpt_testing_active");
static const TCHAR * BROWSER_STARTED_EVENT = _T("Global\\wpt_browser_started");
static const TCHAR * BROWSER_DONE_EVENT = _T("Global\\wpt_browser_done");
static const TCHAR * FLASH_CACHE_DIR = 
                        _T("Macromedia\\Flash Player\\#SharedObjects");
static const TCHAR * SILVERLIGHT_CACHE_DIR = _T("Microsoft\\Silverlight");

static const TCHAR * CHROME_NETLOG = _T(" --log-net-log=\"%s_netlog.txt\"");
static const TCHAR * CHROME_SPDY3 = _T(" --enable-spdy3");
static const TCHAR * CHROME_SOFTWARE_RENDER = 
    _T(" --disable-accelerated-compositing");
static const TCHAR * CHROME_USER_AGENT =
    _T(" --user-agent=");
static const TCHAR * CHROME_DISABLE_PLUGINS = 
    _T(" --disable-plugins-discovery --disable-bundled-ppapi-flash");
static const TCHAR * CHROME_REQUIRED_OPTIONS[] = {
    _T("--disable-background-networking"),
    _T("--no-default-browser-check"),
    _T("--no-first-run"),
    _T("--process-per-tab"),
    _T("--new-window"),
    _T("--silent-debugger-extension-api"),
    _T("--disable-infobars"),
    _T("--disable-translate"),
    _T("--disable-notifications"),
    _T("--disable-desktop-notifications"),
    _T("--allow-running-insecure-content"),
    _T("--disable-component-update"),
    _T("--disable-background-downloads"),
    _T("--disable-add-to-shelf"),
    _T("--disable-client-side-phishing-detection"),
    _T("--disable-datasaver-prompt"),
    _T("--disable-default-apps"),
    _T("--disable-domain-reliability"),
    _T("--safebrowsing-disable-auto-update"),
    _T("--host-rules=\"MAP cache.pack.google.com 127.0.0.1\"")
};
static const TCHAR * CHROME_IGNORE_CERT_ERRORS =
    _T(" --ignore-certificate-errors");

static const TCHAR * FIREFOX_REQUIRED_OPTIONS[] = {
    _T("-no-remote")
};

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WebBrowser::WebBrowser(WptSettings& settings, WptTestDriver& test, 
                       WptStatus &status, BrowserSettings& browser,
                       CIpfw &ipfw, DWORD wpt_ver):
  _settings(settings)
  ,_test(test)
  ,_status(status)
  ,_browser_process(NULL)
  ,_browser(browser)
  ,_ipfw(ipfw)
  ,_wpt_ver(wpt_ver) {

  InitializeCriticalSection(&cs);

  // create a NULL DACL we will use for allowing access to our active mutex
  ZeroMemory(&null_dacl, sizeof(null_dacl));
  null_dacl.nLength = sizeof(null_dacl);
  null_dacl.bInheritHandle = FALSE;
  if( InitializeSecurityDescriptor(&SD, SECURITY_DESCRIPTOR_REVISION) )
    if( SetSecurityDescriptorDacl(&SD, TRUE,(PACL)NULL, FALSE) )
      null_dacl.lpSecurityDescriptor = &SD;
  _browser_started_event = CreateEvent(&null_dacl, TRUE, FALSE,
                                       BROWSER_STARTED_EVENT);
  _browser_done_event = CreateEvent(&null_dacl, TRUE, FALSE,
                                    BROWSER_DONE_EVENT);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WebBrowser::~WebBrowser(void) {
  DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WebBrowser::RunAndWait() {
  bool ret = false;
  bool is_chrome = false;

  // signal to the IE BHO that it needs to inject the code
  HANDLE active_event = CreateMutex(&null_dacl, TRUE, GLOBAL_TESTING_MUTEX);
  SetOverrodeUAString(false);

  if (_test.Start() && ConfigureIpfw(_test)) {
    if (_browser._exe.GetLength()) {
      CString exe(_browser._exe);
      exe.MakeLower();
      if (exe.Find(_T("chrome.exe")) >= 0)
        CreateChromeSymlink();
      bool hook = true;
      bool hook_child = false;
      TCHAR cmdLine[32768];
      lstrcpy( cmdLine, CString(_T("\"")) + _browser._exe + _T("\"") );
      if (_browser._options.GetLength() )
        lstrcat( cmdLine, CString(_T(" ")) + _browser._options );
      // if we are running chrome, make sure the command line options that our 
      // extension NEEDS are present
      exe = _browser._exe;
      exe.MakeLower();
      if (exe.Find(_T("chrome.exe")) >= 0) {
        is_chrome = true;
        ConfigureChromePreferences();
        if (_test._browser_command_line.GetLength()) {
          lstrcat(cmdLine, CString(_T(" ")) +
                  _test._browser_command_line);
        } else {
          for (int i = 0; i < _countof(CHROME_REQUIRED_OPTIONS); i++) {
            if (_browser._options.Find(CHROME_REQUIRED_OPTIONS[i]) < 0) {
              lstrcat(cmdLine, _T(" "));
              lstrcat(cmdLine, CHROME_REQUIRED_OPTIONS[i]);
            }
          }
          if (_test._netlog) {
            CString netlog;
            netlog.Format(CHROME_NETLOG, (LPCTSTR)_test._file_base);
            lstrcat(cmdLine, netlog);
          }
          if (_test._ignore_ssl)
            lstrcat(cmdLine, CHROME_IGNORE_CERT_ERRORS);
          if (_test._spdy3)
            lstrcat(cmdLine, CHROME_SPDY3);
          if (_test._force_software_render)
            lstrcat(cmdLine, CHROME_SOFTWARE_RENDER);
          if (_test._emulate_mobile)
            lstrcat(cmdLine, CHROME_DISABLE_PLUGINS);

          CString user_agent;
          if (_test._user_agent.GetLength() &&
              _test._user_agent.Find(_T('"')) == -1) {
            user_agent = CA2T(_test._user_agent, CP_UTF8);
          } else if (!_test._preserve_user_agent) {
            // See if we have a stored version of what the UA string should be
            HKEY ua_key;
            if (RegCreateKeyEx(HKEY_CURRENT_USER,
                _T("Software\\WebPagetest\\wptdriver\\BrowserUAStrings"), 0, 0, 0, 
                KEY_READ, 0, &ua_key, 0) == ERROR_SUCCESS) {
                TCHAR buff[10000];
                DWORD len = sizeof(buff);
                if (RegQueryValueEx(ua_key, _test._browser, 0, 0, (LPBYTE)buff, &len) 
                    == ERROR_SUCCESS) {
                  user_agent = buff;
                }
              RegCloseKey(ua_key);
            }
          }
          if (user_agent.GetLength()) {
            if (!_test._preserve_user_agent) {
              CString append, buff;
              CString product = _test._append_user_agent.GetLength() ? 
                  CA2T(_test._append_user_agent, CP_UTF8) : _T("PTST");
              append.Format(_T(" %s/%d"), (LPCTSTR)product, _wpt_ver);
              append.Replace(_T("%TESTID%"), _test._id);
              buff.Format(_T("%d"), _test._run);
              append.Replace(_T("%RUN%"), buff);
              append.Replace(_T("%CACHED%"), _test._clear_cache ? _T("0") : _T("1"));
              buff.Format(_T("%d"), _test._version);
              append.Replace(_T("%VERSION%"), buff);
              user_agent += append;
            }
            lstrcat(cmdLine, CHROME_USER_AGENT);
            lstrcat(cmdLine, _T("\""));
            lstrcat(cmdLine, user_agent);
            lstrcat(cmdLine, _T("\""));
            SetOverrodeUAString(true);
          }
        }
        if (_test._browser_additional_command_line.GetLength()) {
          // if we are specifying a proxy server, strip any default setting out
          if (_test._browser_additional_command_line.Find(_T("--proxy-")) !=
              -1) {
            CString cmd(cmdLine);
            cmd.Replace(_T(" --no-proxy-server"), _T(""));
            lstrcpy(cmdLine, cmd);
          }
          lstrcat(cmdLine, CString(_T(" ")) +
                  _test._browser_additional_command_line);
        }
      } else if (exe.Find(_T("firefox.exe")) >= 0) {
        for (int i = 0; i < _countof(FIREFOX_REQUIRED_OPTIONS); i++) {
          if (_browser._options.Find(FIREFOX_REQUIRED_OPTIONS[i]) < 0) {
            lstrcat(cmdLine, _T(" "));
            lstrcat(cmdLine, FIREFOX_REQUIRED_OPTIONS[i]);
          }
        }
        ConfigureFirefoxPrefs();
      }
      if (exe.Find(_T("iexplore.exe")) >= 0) {
        hook = false;
        lstrcat(cmdLine, _T(" about:blank"));
        ConfigureIESettings();
      } else if (exe.Find(_T("safari.exe")) >= 0) {
        hook_child = true;
      } else {
        lstrcat(cmdLine, _T(" http://127.0.0.1:8888/blank.html"));
      }

      // set up the TLS session key log
      SetEnvironmentVariable(L"SSLKEYLOGFILE", _test._file_base + L"_keylog.log");
      DeleteFile(_test._file_base + L"_keylog.log");

      _status.Set(_T("Launching: %s\n"), cmdLine);

      STARTUPINFO si;
      PROCESS_INFORMATION pi;
      memset( &pi, 0, sizeof(pi) );
      memset( &si, 0, sizeof(si) );
      si.cb = sizeof(si);
      si.dwX = 0;
      si.dwY = 0;
      si.dwXSize = 1024;
      si.dwYSize = 768;
      si.wShowWindow = SW_SHOWNORMAL;
      si.dwFlags = STARTF_USEPOSITION | STARTF_USESIZE | STARTF_USESHOWWINDOW;

      EnterCriticalSection(&cs);
      _browser_process = NULL;
      HANDLE additional_process = NULL;
      CAtlArray<HANDLE> browser_processes;
      bool ok = true;

      // Launch the browser and wait for the hook to start
      TerminateProcessesByName(PathFindFileName((LPCTSTR)_browser._exe));
      SetBrowserExe(PathFindFileName((LPCTSTR)_browser._exe));
      if (_browser_started_event && _browser_done_event) {
        ResetEvent(_browser_started_event);
        ResetEvent(_browser_done_event);

        if (CreateProcess(_browser._exe, cmdLine, NULL, NULL, FALSE,
                          0, NULL, NULL, &si, &pi)) {
          DWORD wait_time = 60000;
          #ifdef DEBUG
          wait_time = INFINITE;
          #endif
          // see if we need to do a re-launch of Chrome (seems to be necessary with the latest canary)
          if (is_chrome) {
            HANDLE events[2];
            events[0] = pi.hProcess;
            events[1] = _browser_started_event;
            if (WaitForMultipleObjects(2, events, FALSE, wait_time) == WAIT_OBJECT_0) {
              CloseHandle(pi.hThread);
              CloseHandle(pi.hProcess);
              Sleep(5000);
              CreateProcess(_browser._exe, cmdLine, NULL, NULL, FALSE,
                          0, NULL, NULL, &si, &pi);
            }
          }
          CloseHandle(pi.hThread);
          CloseHandle(pi.hProcess);
          if (WaitForSingleObject(_browser_started_event, wait_time) ==
              WAIT_OBJECT_0) {
            DWORD pid = GetBrowserProcessId();
            if (pid) {
              _browser_process = OpenProcess(SYNCHRONIZE | PROCESS_TERMINATE,
                                             FALSE, pid);
            }
          } else {
            ok = false;
            _status.Set(_T("Error waiting for browser to launch"));
            _test._run_error = "Timed out waiting for the browser to start.";
          }
        } else {
          ok = false;
          _status.Set(_T("Error Launching: %s"), cmdLine);
          _test._run_error = "Failed to launch the browser.";
        }
        LeaveCriticalSection(&cs);

        // wait for the browser to finish (infinite timeout if we are debugging)
        if (_browser_process && ok) {
          ret = true;
          DWORD wait_time = _test._max_test_time ? _test._max_test_time : _test._test_timeout + 180000;  // Allow extra time for results processing
          _status.Set(_T("Waiting up to %d seconds for the test to complete"), 
                      (wait_time / SECONDS_TO_MS));
          #ifdef DEBUG
          wait_time = INFINITE;
          #endif
          WaitForSingleObject(_browser_done_event, wait_time);
          WaitForSingleObject(_browser_process, 10000);
        }
      } else {
        _status.Set(_T("Error initializing browser event"));
        _test._run_error =
            "Failed while initializing the browser started event.";
      }

      // kill the browser and any child processes if it is still running
      EnterCriticalSection(&cs);
      if (_browser_process) {
        CloseHandle(_browser_process);
        _browser_process = NULL;
      }
      LeaveCriticalSection(&cs);
      TerminateProcessesByName(PathFindFileName((LPCTSTR)_browser._exe));

      SetBrowserExe(NULL);
      ResetIpfw();

    } else {
      _test._run_error = "Browser configured incorrectly (exe not defined).";
    }
  } else {
    _test._run_error = "Failed to configure IPFW/dummynet.  Is it installed?";
  }

  if (active_event)
    CloseHandle(active_event);

  return ret;
}

/*-----------------------------------------------------------------------------
  Delete the user profile as well as the flash and silverlight caches
-----------------------------------------------------------------------------*/
void WebBrowser::ClearUserData() {
  TerminateProcessesByName(PathFindFileName((LPCTSTR)_browser._exe));
  _browser.ResetProfile(_test._clear_certs);
  TCHAR path[MAX_PATH];
  if (SUCCEEDED(SHGetFolderPath(NULL, CSIDL_APPDATA, NULL, 
                    SHGFP_TYPE_CURRENT, path))) {
    if (PathAppend(path, FLASH_CACHE_DIR)) {
      DeleteDirectory(path, false);
    }
  }
  if (SUCCEEDED(SHGetFolderPath(NULL, CSIDL_LOCAL_APPDATA, NULL, 
                    SHGFP_TYPE_CURRENT, path))) {
    if (PathAppend(path, SILVERLIGHT_CACHE_DIR)) {
      DeleteDirectory(path, false);
    }
  }
  if (GetTempPath(MAX_PATH, path)) {
      DeleteDirectory(path, false);
  }
  GetModuleFileName(NULL, path, MAX_PATH);
  lstrcpy(PathFindFileName(path), _T("symbols"));
  DeleteDirectory(path, false);

  // Clean out any old windows update downloads (over 1 month old)
  const unsigned __int64 TICKS_PER_MONTH = 10000000ui64 * 60ui64 * 60ui64 * 24ui64 * 30L;
  FILETIME now;
  GetSystemTimeAsFileTime(&now);
  ULARGE_INTEGER keep_start;
  keep_start.LowPart = now.dwLowDateTime;
  keep_start.HighPart = now.dwHighDateTime;
  keep_start.QuadPart -= TICKS_PER_MONTH;
  TCHAR dir[MAX_PATH];
  GetWindowsDirectory(dir, MAX_PATH);
  lstrcat(dir, _T("\\SoftwareDistribution\\Download\\"));
  CString downloads(dir);
  WIN32_FIND_DATA fd;
  HANDLE hFind = FindFirstFile(downloads + _T("*.*"), &fd);
  if (hFind != INVALID_HANDLE_VALUE) {
    do {
      if (lstrcmp(fd.cFileName, _T(".")) && lstrcmp(fd.cFileName, _T(".."))) {
        ULARGE_INTEGER file_time;
        file_time.LowPart = fd.ftLastWriteTime.dwLowDateTime;
        file_time.HighPart = fd.ftLastWriteTime.dwHighDateTime;
        if (file_time.QuadPart < keep_start.QuadPart) {
          if (fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY)
            DeleteDirectory(downloads + fd.cFileName, true);
          else
            DeleteFile(downloads + fd.cFileName);
        }
      }
    } while (FindNextFile(hFind, &fd));
    FindClose(hFind);
  }
}

/*-----------------------------------------------------------------------------
  Set up bandwidth throttling
-----------------------------------------------------------------------------*/
bool WebBrowser::ConfigureIpfw(WptTestDriver& test) {
  bool ret = false;
  if (test._bwIn && test._bwOut) {
    // split the latency across directions
    DWORD latency = test._latency / 2;

    CString buff;
    buff.Format(_T("[wptdriver] - Throttling: %d Kbps in, %d Kbps out, ")
                _T("%d ms latency, %0.2f plr"), test._bwIn, test._bwOut, 
                test._latency, test._plr );
    ATLTRACE(buff);

    if (_ipfw.SetPipe(PIPE_IN, test._bwIn, latency, test._plr/100.0, true)) {
      // make up for odd values
      if( test._latency % 2 )
        latency++;

      if (_ipfw.SetPipe(PIPE_OUT, test._bwOut,latency,test._plr/100.0, false))
        ret = true;
      else
        _ipfw.SetPipe(PIPE_IN, 0, 0, 0, true);
    }
  }
  else
    ret = true;

  if (!ret) {
    ATLTRACE(_T("[wptdriver] - Error Configuring dummynet"));
  }

  return ret;
}

/*-----------------------------------------------------------------------------
  Remove the bandwidth throttling
-----------------------------------------------------------------------------*/
void WebBrowser::ResetIpfw(void) {
  _ipfw.SetPipe(PIPE_IN, 0, 0, 0, true);
  _ipfw.SetPipe(PIPE_OUT, 0, 0, 0, false);
}

/*-----------------------------------------------------------------------------
  Find a child process that is firefox.exe (for 3.6 hooking)
-----------------------------------------------------------------------------*/
bool WebBrowser::FindBrowserChild(DWORD pid, PROCESS_INFORMATION& pi,
                                  LPCTSTR browser_exe) {
  bool found = false;
  if (pid) {
    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snap != INVALID_HANDLE_VALUE) {
      PROCESSENTRY32 proc;
      proc.dwSize = sizeof(proc);
      if (Process32First(snap, &proc)) {
        do {
          if (proc.th32ParentProcessID == pid) {
            CString exe(proc.szExeFile);
            exe.MakeLower();
            if (exe.Find(browser_exe) >= 0) {
              pi.hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | 
                                        PROCESS_CREATE_THREAD |
                                        PROCESS_SET_INFORMATION |
                                        PROCESS_SUSPEND_RESUME |
                                        PROCESS_VM_OPERATION | 
                                        PROCESS_VM_READ | PROCESS_VM_WRITE |
                                        PROCESS_TERMINATE | SYNCHRONIZE,
                                        FALSE, proc.th32ProcessID);
              if (pi.hProcess) {
                found = true;
                pi.dwProcessId = proc.th32ProcessID;
                pi.hThread = NULL;
                pi.dwThreadId = 0;
                // get a handle on the main thread
                HANDLE thread_snap = CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD
                                                             , pi.dwProcessId);
                if (thread_snap != INVALID_HANDLE_VALUE) {
                  THREADENTRY32 thread;
                  thread.dwSize = sizeof(thread);
                  FILETIME created, exit, kernel, user;
                  LARGE_INTEGER earliest, current;
                  if (Thread32First(thread_snap, &thread)) {
                    do {
                      HANDLE thread_handle = OpenThread(
                        THREAD_QUERY_INFORMATION, FALSE, thread.th32ThreadID);
                      if (thread_handle) {
                        if (GetThreadTimes(thread_handle, &created, &exit, 
                              &kernel, &user)) {
                          current.HighPart = created.dwHighDateTime;
                          current.LowPart = created.dwLowDateTime;
                          if (!pi.dwThreadId) {
                            pi.dwThreadId = thread.th32ThreadID;
                            earliest.QuadPart = current.QuadPart;
                          } else if (current.QuadPart < earliest.QuadPart) {
                            pi.dwThreadId = thread.th32ThreadID;
                            earliest.QuadPart = current.QuadPart;
                          }
                        }
                        CloseHandle(thread_handle);
                      }
                    } while (Thread32Next(thread_snap, &thread));
                  }
                  CloseHandle(thread_snap);
                }
                if (pi.dwThreadId)
                  pi.hThread = OpenThread(THREAD_QUERY_INFORMATION |
                              THREAD_SUSPEND_RESUME, FALSE, pi.dwThreadId);
              }
            }
          }
        } while (!found && Process32Next(snap, &proc));
      }
      CloseHandle(snap);
    }
  }
  return found;
}

/*-----------------------------------------------------------------------------
  See if there are any custom prefs in script that need to be set
-----------------------------------------------------------------------------*/
void WebBrowser::ConfigureFirefoxPrefs() {
  if (_browser._profile_directory.GetLength() && 
      _browser._template.GetLength()) {
    CStringA user_prefs;
    if (_test._script.GetLength()) {
      _test.BuildScript();
      if (!_test._script_commands.IsEmpty()) {
        POSITION pos = _test._script_commands.GetHeadPosition();
        while (pos) {
          ScriptCommand cmd = _test._script_commands.GetNext(pos);
          if (!cmd.command.CompareNoCase(_T("firefoxPref")) && 
              cmd.target.GetLength() && cmd.value.GetLength()) {
            CStringA pref;
            pref.Format("user_pref(\"%S\", %S);\r\n", 
                        (LPCTSTR)cmd.target, (LPCTSTR)cmd.value);
            user_prefs += pref;
          }
        }
      }
    }
    if (_test._noscript) {
      user_prefs += "user_pref(\"javascript.enabled\", false);\r\n";
    }
    if (!user_prefs.IsEmpty()) {
      CString prefs_file = _browser._profile_directory + _T("\\prefs.js");
      HANDLE file = CreateFile(prefs_file, GENERIC_WRITE, 0, 0, 
                                OPEN_EXISTING, 0, 0);
      if (file != INVALID_HANDLE_VALUE) {
        SetFilePointer(file, 0, 0, FILE_END);
        DWORD bytes;
        WriteFile(file, (LPCSTR)user_prefs, user_prefs.GetLength(), &bytes, 0);
        CloseHandle(file);
      }
    }
  }
}

/*-----------------------------------------------------------------------------
  See if we should be hooking a process other than the one we launched
  (i.e. Safari)
-----------------------------------------------------------------------------*/
HANDLE WebBrowser::FindAdditionalHookProcess(HANDLE launched_process, 
                                             CString exe) {
  HANDLE hook_process = NULL;

  if (exe.Find(_T("safari.exe")) >= 0) {
    DWORD parent_pid = GetProcessId(launched_process);
    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snap != INVALID_HANDLE_VALUE) {
      PROCESSENTRY32 proc;
      proc.dwSize = sizeof(proc);
      if (Process32First(snap, &proc)) {
        bool found = false;
        do {
          if (proc.th32ParentProcessID == parent_pid) {
            CString exe(proc.szExeFile);
            exe.MakeLower();
            if (exe.Find(_T("webkit2webprocess.exe")) >= 0) {
              found = true;
              hook_process = OpenProcess(PROCESS_QUERY_INFORMATION | 
                                         PROCESS_CREATE_THREAD |
                                         PROCESS_SET_INFORMATION |
                                         PROCESS_SUSPEND_RESUME |
                                         PROCESS_VM_OPERATION | 
                                         PROCESS_VM_READ | PROCESS_VM_WRITE |
                                         PROCESS_TERMINATE | SYNCHRONIZE,
                                         FALSE, proc.th32ProcessID);
            }
          }
        } while (!found && Process32Next(snap, &proc));
      }
      CloseHandle(snap);
    }
  }

  return hook_process;
}

/*-----------------------------------------------------------------------------
  Set some IE prefs to make sure testing is consistent
-----------------------------------------------------------------------------*/
void WebBrowser::ConfigureIESettings() {
    HKEY hKey;
    if (RegCreateKeyEx(HKEY_CURRENT_USER,
                       _T("Software\\Microsoft\\Internet Explorer\\Main"),
                       0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS ) {
      LPCTSTR szVal = _T("yes");
      RegSetValueEx(hKey, _T("DisableScriptDebuggerIE"), 0, REG_SZ,
                    (const LPBYTE)szVal, (lstrlen(szVal) + 1) * sizeof(TCHAR));

      szVal = _T("no");
      RegSetValueEx(hKey, _T("FormSuggest PW Ask"), 0, REG_SZ,
                    (const LPBYTE)szVal, (lstrlen(szVal) + 1) * sizeof(TCHAR));
      RegSetValueEx(hKey, _T("Friendly http errors"), 0, REG_SZ,
                    (const LPBYTE)szVal, (lstrlen(szVal) + 1) * sizeof(TCHAR));
      RegSetValueEx(hKey, _T("Use FormSuggest"), 0, REG_SZ,
                    (const LPBYTE)szVal, (lstrlen(szVal) + 1) * sizeof(TCHAR));

      DWORD val = 1;
      RegSetValueEx(hKey, _T("NoUpdateCheck"), 0, REG_DWORD,
                    (const LPBYTE)&val, sizeof(val));
      RegSetValueEx(hKey, _T("NoJITSetup"), 0, REG_DWORD,
                    (const LPBYTE)&val, sizeof(val));
      RegSetValueEx(hKey, _T("NoWebJITSetup"), 0, REG_DWORD,
                    (const LPBYTE)&val, sizeof(val));
      //val = 0;
      RegSetValueEx(hKey, _T("UseSWRender"), 0, REG_DWORD,
                    (const LPBYTE)&val, sizeof(val));
      RegCloseKey(hKey);
    }

    if (RegCreateKeyEx(HKEY_CURRENT_USER,
        _T("Software\\Microsoft\\Internet Explorer\\InformationBar"), 0, 0, 0,
        KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS) {
      DWORD val = 0;
      RegSetValueEx(hKey, _T("FirstTime"), 0, REG_DWORD,
                    (const LPBYTE)&val, sizeof(val));
      RegCloseKey(hKey);
    }

    if (RegCreateKeyEx(HKEY_CURRENT_USER,
        _T("Software\\Microsoft\\Internet Explorer\\PhishingFilter"), 0, 0, 0,
        KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS) {
      DWORD val = 0;
      RegSetValueEx(hKey, _T("EnabledV9"), 0, REG_DWORD,
                    (const LPBYTE)&val, sizeof(val));
      RegSetValueEx(hKey, _T("Enabled"), 0, REG_DWORD,
                    (const LPBYTE)&val, sizeof(val));
      val = 3;
      RegSetValueEx(hKey, _T("ShownVerifyBalloon"), 0, REG_DWORD,
                    (const LPBYTE)&val, sizeof(val));
      RegCloseKey(hKey);
    }

    if (RegCreateKeyEx(HKEY_CURRENT_USER,
        _T("Software\\Microsoft\\Internet Explorer\\IntelliForms"), 0, 0, 0,
        KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS) {
      DWORD val = 0;
      RegSetValueEx(hKey, _T("AskUser"), 0, REG_DWORD,
                    (const LPBYTE)&val, sizeof(val));
      RegCloseKey(hKey);
    }

    if (RegCreateKeyEx(HKEY_CURRENT_USER,
        _T("Software\\Microsoft\\Internet Explorer\\Security"), 0, 0, 0,
        KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS) {
      LPCTSTR szVal = _T("Query");
      RegSetValueEx(hKey, _T("Safety Warning Level"), 0, REG_SZ,
                    (const LPBYTE)szVal, (lstrlen(szVal) + 1) * sizeof(TCHAR));
      szVal = _T("Medium");
      RegSetValueEx(hKey, _T("Sending_Security"), 0, REG_SZ,
                    (const LPBYTE)szVal, (lstrlen(szVal) + 1) * sizeof(TCHAR));
      szVal = _T("Low");
      RegSetValueEx(hKey, _T("Viewing_Security"), 0, REG_SZ,
                    (const LPBYTE)szVal, (lstrlen(szVal) + 1) * sizeof(TCHAR));
      RegCloseKey(hKey);
    }

    if (RegCreateKeyEx(HKEY_CURRENT_USER,
        _T("Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"),
        0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS) {
      DWORD val = 1;
      RegSetValueEx(hKey, _T("AllowCookies"), 0, REG_DWORD,
                    (const LPBYTE)&val, sizeof(val));
      RegSetValueEx(hKey, _T("EnableHttp1_1"), 0, REG_DWORD,
                    (const LPBYTE)&val, sizeof(val));
      RegSetValueEx(hKey, _T("ProxyHttp1.1"), 0, REG_DWORD,
                    (const LPBYTE)&val, sizeof(val));
      RegSetValueEx(hKey, _T("EnableNegotiate"), 0, REG_DWORD,
                    (const LPBYTE)&val, sizeof(val));

      val = 0;
      RegSetValueEx(hKey, _T("WarnAlwaysOnPost"), 0,
                    REG_DWORD, (const LPBYTE)&val, sizeof(val));
      RegSetValueEx(hKey, _T("WarnonBadCertRecving"), 0,
                    REG_DWORD, (const LPBYTE)&val, sizeof(val));
      RegSetValueEx(hKey, _T("WarnOnPost"), 0, REG_DWORD,
                    (const LPBYTE)&val, sizeof(val));
      RegSetValueEx(hKey, _T("WarnOnPostRedirect"), 0,
                    REG_DWORD, (const LPBYTE)&val, sizeof(val));
      RegSetValueEx(hKey, _T("WarnOnZoneCrossing"), 0,
                    REG_DWORD, (const LPBYTE)&val, sizeof(val));
      RegCloseKey(hKey);
    }

    if (RegCreateKeyEx(HKEY_CURRENT_USER,
        _T("Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings")
        _T("\\5.0\\Cache\\Content"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0)
        == ERROR_SUCCESS) {
      DWORD val = 131072;
      RegSetValueEx(hKey, _T("CacheLimit"), 0, REG_DWORD,
                    (const LPBYTE)&val, sizeof(val));
      RegCloseKey(hKey);
    }

    if (RegCreateKeyEx(HKEY_CURRENT_USER,
        _T("Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings")
        _T("\\Cache\\Content"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0)
        == ERROR_SUCCESS) {
      DWORD val = 131072;
      RegSetValueEx(hKey, _T("CacheLimit"), 0, REG_DWORD,
                    (const LPBYTE)&val, sizeof(val));
      RegCloseKey(hKey);
    }

    // reset the toolbar layout (to make sure the sidebar isn't open)		
    if (RegCreateKeyEx(HKEY_CURRENT_USER,
        _T("Software\\Microsoft\\Internet Explorer\\Toolbar\\WebBrowser"),
        0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS) {
      RegDeleteValue(hKey, _T("ITBarLayout"));
      RegCloseKey(hKey);
    }
    
    // Tweak the security zone to eliminate some warnings
    if (RegCreateKeyEx(HKEY_CURRENT_USER,
        _T("Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings")
        _T("\\Zones\\3"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS) {
      DWORD val = 0;
      
      // don't warn about posting data
      RegSetValueEx(hKey, _T("1601"), 0, REG_DWORD, (const LPBYTE)&val,
                    sizeof(val));

      // don't warn about mixed content
      RegSetValueEx(hKey, _T("1609"), 0, REG_DWORD, (const LPBYTE)&val,
                    sizeof(val));

      RegCloseKey(hKey);
    }

    // Disable the blocking of ActiveX controls (which seems to be inconsistent)
    if (RegCreateKeyEx(HKEY_CURRENT_USER,
        _T("Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Ext"),
        0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS) {
      DWORD val = 0;
      RegSetValueEx(hKey, _T("VersionCheckEnabled"), 0, REG_DWORD,
                    (const LPBYTE)&val, sizeof(val));
      RegCloseKey(hKey);
    }
}

/*-----------------------------------------------------------------------------
  Write to both the profile prefs file and the master_preferences file
  that is used as a template
-----------------------------------------------------------------------------*/
void WebBrowser::ConfigureChromePreferences() {
  CString prefs_file =
      _browser._profile_directory + _T("\\Default\\Preferences");
  TCHAR master_prefs_file[10240];
  lstrcpy(master_prefs_file, _browser._exe);
  lstrcpy(PathFindFileName(master_prefs_file), _T("master_preferences"));

  LPCSTR prefs =
    "{"
      "\"profile\":{"
        "\"default_content_setting_values\":{"
          "\"geolocation\":2"
        "},"
        "\"password_manager_enabled\":false"
      "}"
    "}";
  SHCreateDirectoryEx(NULL, _browser._profile_directory + _T("\\Default"), NULL);
  HANDLE file = CreateFile(prefs_file, GENERIC_WRITE, 0, 0, CREATE_ALWAYS, 0, 0);
  if (file != INVALID_HANDLE_VALUE) {
    DWORD written = 0;
    WriteFile(file, prefs, strlen(prefs), &written, 0);
    CloseHandle(file);
  }
  file = CreateFile(master_prefs_file, GENERIC_WRITE, 0, 0, CREATE_ALWAYS, 0, 0);
  if (file != INVALID_HANDLE_VALUE) {
    DWORD written = 0;
    WriteFile(file, prefs, strlen(prefs), &written, 0);
    CloseHandle(file);
  }
}

/*-----------------------------------------------------------------------------
  Run Chrome from inside of a "Chrome SxS\\Application
-----------------------------------------------------------------------------*/
void WebBrowser::CreateChromeSymlink() {
  CString lower(_browser._exe);
  lower.MakeLower();
  int pos = lower.Find(_T("chrome\\application\\chrome.exe"));
  if (pos > 0 && lower.Find(_T("chrome sxs\\application")) == -1) {
    CString dir = _browser._exe.Left(pos) + _T("Chrome");
    CString newDir = dir + _T(" SxS");

    RemoveDirectory(newDir);
    if (CreateSymbolicLink(newDir, dir, SYMBOLIC_LINK_FLAG_DIRECTORY))
      _browser._exe = newDir + "\\Application\\chrome.exe";
  }
}