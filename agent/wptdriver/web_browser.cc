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
static const TCHAR * CHROME_TRACE = _T(" --trace-startup")
                                 _T(" --trace-startup-duration=240")
                                 _T(" --trace-startup-file=\"%s_trace.json\"");
static const TCHAR * CHROME_REQUIRED_OPTIONS[] = {
    _T("--enable-experimental-extension-apis"),
    _T("--ignore-certificate-errors"),
    _T("--disable-background-networking"),
    _T("--no-default-browser-check"),
    _T("--no-first-run"),
    _T("--process-per-tab"),
    _T("--new-window"),
    _T("--disable-translate"),
    _T("--disable-desktop-notifications"),
    _T("--allow-running-insecure-content"),
    _T("--enable-npn")
};

static const TCHAR * FIREFOX_REQUIRED_OPTIONS[] = {
    _T("-no-remote")
};

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WebBrowser::WebBrowser(WptSettings& settings, WptTestDriver& test, 
                        WptStatus &status, BrowserSettings& browser):
  _settings(settings)
  ,_test(test)
  ,_status(status)
  ,_browser_process(NULL)
  ,_browser(browser) {

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

  if (_test.Start()) {
    if (_browser._exe.GetLength()) {
      bool hook = true;
      TCHAR cmdLine[4096];
      lstrcpy( cmdLine, CString(_T("\"")) + _browser._exe + _T("\"") );
      if (_browser._options.GetLength() )
        lstrcat( cmdLine, CString(_T(" ")) + _browser._options );
      // if we are running chrome, make sure the command line options that our 
      // extension NEEDS are present
      CString exe(_browser._exe);
      exe.MakeLower();
      if (exe.Find(_T("chrome.exe")) >= 0) {
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
        if (_test._trace) {
          CString trace;
          trace.Format(CHROME_TRACE, (LPCTSTR)_test._file_base);
          lstrcat(cmdLine, trace);
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
      }
      lstrcat ( cmdLine, _T(" http://127.0.0.1:8888/blank.html"));

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
      bool ok = true;
      if (CreateProcess(NULL, cmdLine, NULL, NULL, FALSE, CREATE_SUSPENDED, 
                        NULL, NULL, &si, &pi)) {
        _browser_process = pi.hProcess;

        ResumeThread(pi.hThread);
        if (WaitForInputIdle(pi.hProcess, 120000) != 0) {
          ok = false;
          critical_error = true;
          _status.Set(_T("Error waiting for browser to launch\n"));
        }
        SuspendThread(pi.hThread);

        if (ok && hook && !InstallHook(pi.hProcess)) {
          ok = false;
          critical_error = true;
          _status.Set(_T("Error instrumenting browser\n"));
        }

        SetPriorityClass(pi.hProcess, ABOVE_NORMAL_PRIORITY_CLASS);
        if (!ConfigureIpfw(_test))
            ok = false;
        ResumeThread(pi.hThread);
        CloseHandle(pi.hThread);
      } else {
        _status.Set(_T("Error Launching: %s\n"), cmdLine);
        critical_error = true;
      }
      LeaveCriticalSection(&cs);

      // wait for the browser to finish (infinite timeout if we are debugging)
      if (_browser_process && ok) {
        _status.Set(_T("Waiting up to %d seconds for the test to complete\n"), 
                    (_test._test_timeout / SECONDS_TO_MS) * 2);
        #ifdef DEBUG
        if (WaitForSingleObject(_browser_process, INFINITE )==WAIT_OBJECT_0 ) {
          ret = true;
        }
        #else
        if (WaitForSingleObject(_browser_process, _test._test_timeout * 2) == 
            WAIT_OBJECT_0 ) {
          ret = true;
        }
        #endif

        // see if we need to attach to a child firefox process 
        // < 4.x spawns a child process after initializing a new profile
        if (ret && exe.Find(_T("firefox.exe")) >= 0) {
          ok = false;
          EnterCriticalSection(&cs);
          if (FindFirefoxChild(pi.dwProcessId, pi)) {
            ok = true;
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
            if (WaitForSingleObject(_browser_process, INFINITE )==WAIT_OBJECT_0 ) {
              ret = true;
            }
            #else
            if (WaitForSingleObject(_browser_process, _test._test_timeout * 2) == 
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
      LeaveCriticalSection(&cs);
      ResetIpfw();
    }
  }

  if (active_event)
    CloseHandle(active_event);

  return ret;
}

/*-----------------------------------------------------------------------------
  Delete the user profile as well as the flash and silverlight caches
-----------------------------------------------------------------------------*/
void WebBrowser::ClearUserData() {
  _browser.ResetProfile();
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
void WebBrowser::ResetIpfw(void) {
  _ipfw.CreatePipe(PIPE_IN, 0, 0, 0);
  _ipfw.CreatePipe(PIPE_OUT, 0, 0, 0);
}

/*-----------------------------------------------------------------------------
  Find a child process that is firefox.exe (for 3.6 hooking)
-----------------------------------------------------------------------------*/
bool WebBrowser::FindFirefoxChild(DWORD pid, PROCESS_INFORMATION& pi) {
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
            if (exe.Find(_T("firefox.exe") >= 0)) {
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
      _browser._template.GetLength() &&
      _test._script.GetLength()) {
    CStringA user_prefs;
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
