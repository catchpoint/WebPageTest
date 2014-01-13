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
#include "dbghelp/dbghelp.h"
#include "util.h"
#include "web_browser.h"

typedef void(__stdcall * LPINSTALLHOOK)(DWORD thread_id);
const int PIPE_IN = 1;
const int PIPE_OUT = 2;
static const TCHAR * GLOBAL_TESTING_MUTEX = _T("Global\\wpt_testing_active");
static const TCHAR * FLASH_CACHE_DIR = 
                        _T("Macromedia\\Flash Player\\#SharedObjects");
static const TCHAR * SILVERLIGHT_CACHE_DIR = _T("Microsoft\\Silverlight");

static const TCHAR * CHROME_NETLOG = _T(" --log-net-log=\"%s_netlog.txt\"");
static const TCHAR * CHROME_SPDY3 = _T(" --enable-spdy3");
static const TCHAR * CHROME_GPU = 
    _T(" --force-compositing-mode")
    _T(" --enable-threaded-compositing")
    _T(" --enable-viewport");
static const TCHAR * CHROME_MOBILE = 
    _T(" --enable-pinch")
    _T(" --enable-fixed-layout");
static const TCHAR * CHROME_SOFTWARE_RENDER = 
    _T(" --disable-accelerated-compositing");
static const TCHAR * CHROME_SCALE_FACTOR =
    _T(" --force-device-scale-factor=");
static const TCHAR * CHROME_USER_AGENT =
    _T(" --user-agent=");
static const TCHAR * CHROME_REQUIRED_OPTIONS[] = {
    _T("--enable-experimental-extension-apis"),
    _T("--disable-background-networking"),
    _T("--no-default-browser-check"),
    _T("--no-first-run"),
    _T("--process-per-tab"),
    _T("--new-window"),
    _T("--disable-translate"),
    _T("--disable-desktop-notifications"),
    _T("--allow-running-insecure-content")
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
                       CIpfw &ipfw):
  _settings(settings)
  ,_test(test)
  ,_status(status)
  ,_browser_process(NULL)
  ,_browser(browser)
  ,_ipfw(ipfw) {

  InitializeCriticalSection(&cs);

  // create a NULL DACL we will use for allowing access to our active mutex
  ZeroMemory(&null_dacl, sizeof(null_dacl));
  null_dacl.nLength = sizeof(null_dacl);
  null_dacl.bInheritHandle = FALSE;
  if( InitializeSecurityDescriptor(&SD, SECURITY_DESCRIPTOR_REVISION) )
    if( SetSecurityDescriptorDacl(&SD, TRUE,(PACL)NULL, FALSE) )
      null_dacl.lpSecurityDescriptor = &SD;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WebBrowser::~WebBrowser(void) {
  DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WebBrowser::RunAndWait(bool &critical_error) {
  bool ret = false;
  critical_error = false;

  // signal to the IE BHO that it needs to inject the code
  HANDLE active_event = CreateMutex(&null_dacl, TRUE, GLOBAL_TESTING_MUTEX);

  if (_test.Start() && ConfigureIpfw(_test)) {
    if (_browser._exe.GetLength()) {
      bool hook = true;
      bool hook_child = false;
      TCHAR cmdLine[32768];
      lstrcpy( cmdLine, CString(_T("\"")) + _browser._exe + _T("\"") );
      if (_browser._options.GetLength() )
        lstrcat( cmdLine, CString(_T(" ")) + _browser._options );
      // if we are running chrome, make sure the command line options that our 
      // extension NEEDS are present
      CString exe(_browser._exe);
      exe.MakeLower();
      if (exe.Find(_T("chrome.exe")) >= 0) {
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
          else if (_test._emulate_mobile) {
            lstrcat(cmdLine, CHROME_GPU);
            lstrcat(cmdLine, CHROME_MOBILE);
          } else if (_test._device_scale_factor.GetLength())
            lstrcat(cmdLine, CHROME_GPU);
          if (_test.has_gpu_ && _test._device_scale_factor.GetLength()) {
            lstrcat(cmdLine, CHROME_SCALE_FACTOR);
            lstrcat(cmdLine, _test._device_scale_factor);
          }
          if (_test._user_agent.GetLength() &&
              _test._user_agent.Find(_T('"')) == -1) {
            lstrcat(cmdLine, CHROME_USER_AGENT);
            lstrcat(cmdLine, _T("\""));
            lstrcat(cmdLine, CA2T(_test._user_agent));
            lstrcat(cmdLine, _T("\""));
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

      InstallGlobalHook();
      EnterCriticalSection(&cs);
      _browser_process = NULL;
      HANDLE additional_process = NULL;
      CAtlArray<HANDLE> browser_processes;
      bool ok = true;
      if (CreateProcess(_browser._exe, cmdLine, NULL, NULL, FALSE,
                        CREATE_SUSPENDED, NULL, NULL, &si, &pi)) {
        _browser_process = pi.hProcess;
        browser_processes.Add(pi.hProcess);

        ResumeThread(pi.hThread);
        if (WaitForInputIdle(pi.hProcess, 120000) != 0) {
          ok = false;
          critical_error = true;
          _status.Set(_T("Error waiting for browser to launch\n"));
          _test._run_error = "Failed while waiting for the browser to launch.";
        }

        // wait for the child process to start if we are expecting one (Safari)
        if (ok && hook_child) {
          Sleep(1000);
          for (int attempts = 0;
               attempts < 600 && !additional_process;
               attempts++) {
            additional_process = FindAdditionalHookProcess(pi.hProcess, exe);
            if (!additional_process)
              Sleep(100);
          }
        }

        if (hook) {
          SuspendThread(pi.hThread);
          if (ok && !InstallHook(pi.hProcess)) {
            ok = false;
            critical_error = true;
            _status.Set(_T("Error instrumenting browser\n"));
            _test._run_error = "Failed to instrument the browser.";
          }
          if (additional_process)
            InstallHook(additional_process);
          ResumeThread(pi.hThread);
        }
        CloseHandle(pi.hThread);
        SetPriorityClass(pi.hProcess, ABOVE_NORMAL_PRIORITY_CLASS);
      } else {
        _status.Set(_T("Error Launching: %s\n"), cmdLine);
        _test._run_error = "Failed to launch the browser.";
        critical_error = true;
      }
      LeaveCriticalSection(&cs);

      // wait for the browser to finish (infinite timeout if we are debugging)
      if (_browser_process && ok) {
        _status.Set(_T("Waiting up to %d seconds for the test to complete\n"), 
                    (_test._test_timeout / SECONDS_TO_MS) * 2);
        DWORD wait_time = _test._test_timeout * 2;
        #ifdef DEBUG
        wait_time = INFINITE;
        #endif
        if (additional_process) {
          HANDLE handles[2];
          handles[0] = _browser_process;
          handles[1] = additional_process;
          DWORD result = WaitForMultipleObjects(2, handles, TRUE, wait_time);
          if (result == WAIT_OBJECT_0 || result == WAIT_OBJECT_0 + 1)
            ret = true;
        } else if (WaitForSingleObject(_browser_process, wait_time) != 
                   WAIT_TIMEOUT ) {
          ret = true;
        }

        // see if we need to attach to a child firefox process 
        // < 4.x spawns a child process after initializing a new profile
        CString browser_exe;
        exe.MakeLower();
        if (exe.Find(_T("firefox.exe")) >= 0)
          browser_exe = _T("firefox.exe");
        else if (exe.Find(_T("iexplore.exe")) >= 0)
          browser_exe = _T("iexplore.exe");
        if (ret && browser_exe.GetLength()) {
          EnterCriticalSection(&cs);
          if (FindBrowserChild(pi.dwProcessId, pi, browser_exe)) {
            CloseHandle(_browser_process);
            _browser_process = pi.hProcess;
            if (WaitForInputIdle(pi.hProcess, 120000) == 0) {
              if (pi.hThread)
                SuspendThread(pi.hThread);
              if (hook && !InstallHook(pi.hProcess))
                ok = false;
              if (pi.hThread) {
                ResumeThread(pi.hThread);
                CloseHandle(pi.hThread);
              }
            }
          }
          LeaveCriticalSection(&cs);
          if (ok) {
            ret = false;
            #ifdef DEBUG
            if (WaitForSingleObject(_browser_process, INFINITE ) ==
                WAIT_OBJECT_0 ) {
              ret = true;
            }
            #else
            if (WaitForSingleObject(_browser_process,
                                    _test._test_timeout * 2) == 
                WAIT_OBJECT_0 ) {
              ret = true;
            }
            #endif
          }
        }
      }

      // kill the browser and any child processes if it is still running
      EnterCriticalSection(&cs);
      if (_browser_process) {
        TerminateProcess(_browser_process, 0);
        WaitForSingleObject(_browser_process, 120000);
        CloseHandle(_browser_process);
        _browser_process = NULL;
      }
      if (additional_process) {
        TerminateProcess(additional_process, 0);
        WaitForSingleObject(additional_process, 120000);
        CloseHandle(additional_process);
      }
      LeaveCriticalSection(&cs);
      ResetIpfw();
      RemoveGlobalHook();
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
    AtlTrace(buff);

    if (_ipfw.SetPipe(PIPE_IN, test._bwIn, latency,test._plr/100.0)) {
      // make up for odd values
      if( test._latency % 2 )
        latency++;

      if (_ipfw.SetPipe(PIPE_OUT, test._bwOut,latency,test._plr/100.0))
        ret = true;
      else
        _ipfw.SetPipe(PIPE_IN, 0, 0, 0);
    }
  }
  else
    ret = true;

  if (!ret) {
    AtlTrace(_T("[wptdriver] - Error Configuring dummynet"));
  }

  return ret;
}

/*-----------------------------------------------------------------------------
  Remove the bandwidth throttling
-----------------------------------------------------------------------------*/
void WebBrowser::ResetIpfw(void) {
  _ipfw.SetPipe(PIPE_IN, 0, 0, 0);
  _ipfw.SetPipe(PIPE_OUT, 0, 0, 0);
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
}
