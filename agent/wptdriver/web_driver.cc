#include "StdAfx.h"
#include "web_driver.h"

extern const TCHAR * BROWSER_STARTED_EVENT;
extern const TCHAR * BROWSER_DONE_EVENT;
extern const TCHAR * GLOBAL_TESTING_MUTEX;

static CStringA UTF16toUTF8(const CStringW& utf16) {
  CStringA utf8;
  int len = WideCharToMultiByte(CP_UTF8, 0, utf16, -1, NULL, 0, 0, 0);
  if (len > 1) {
    char *ptr = utf8.GetBuffer(len - 1);
    if (ptr) {
      WideCharToMultiByte(CP_UTF8, 0, utf16, -1, ptr, len, 0, 0);
    }
    utf8.ReleaseBuffer();
  }
  return utf8;
}

WebDriver::WebDriver(WptSettings& settings,
                     WptTestDriver& test,
                     WptStatus &status, 
                     BrowserSettings& browser,
                     CIpfw &ipfw):
  _settings(settings),
  _test(test),
  _status(status),
  _browser(browser),
  _ipfw(ipfw) {
  
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
  _scripts_dir = browser.app_data_dir_ + _T("\\webdriver_scripts");
  CreateDirectory(_scripts_dir, NULL);

}

WebDriver::~WebDriver() {
  if (_browser_started_event) {
    CloseHandle(_browser_started_event);
  }
  if (_browser_done_event) {
    CloseHandle(_browser_started_event);
  }
}

bool WebDriver::RunAndWait() {
  bool ok = true;
  DWORD client_exit_code = 0;
  DWORD server_exit_code = 0;
  HANDLE browser_process, active_event = NULL;

  if (!_test.Start()) {
    _status.Set(_T("[webdriver] Error with internal test state."));
    _test._run_error = "Failed to launch webdriver test.";
    return false;
  }

  if (!_ipfw.Configure(_test)) {
    _status.Set(_T("[webdriver] Error with IPFW/dummynet"));
    _test._run_error = "Failed to configure IPFW/dummynet. Is it installed?";
    return false;
  }

  if (!_browser_started_event || !_browser_done_event) {
      _status.Set(_T("[webdriver] Error initializing browser event"));
      _test._run_error =
          "Failed to launch webdriver test.";
      return false;
  }

  ResetEvent(_browser_started_event);
  ResetEvent(_browser_done_event);
  if (_settings._browser.IsIE()) {
    // signal to the IE BHO that it needs to inject the code
    active_event = CreateMutex(&null_dacl, TRUE, GLOBAL_TESTING_MUTEX);
  }

  if (!SpawnWebDriverServer()) {
    ok = false;
  }

  if (ok && !SpawnWebDriverClient()) {
    ok = false;
  }

  if (ok) {
    // Now that both the processes are spawned, we wait until something
    // interesting happens.
    HANDLE handles[] = { _client_info.hProcess,
      _server_info.hProcess,
      _browser_started_event
    };
    DWORD ret = WaitForMultipleObjects(_countof(handles), handles, false, 60000);
    if (ret == WAIT_FAILED || ret == WAIT_TIMEOUT || ret == WAIT_ABANDONED) {
      // WAIT_ABANDONED is also included here because even though the mutex 
      // is abandoned, and possibly left things in a sloppy state, there is
      // not much we can do here except signal that the browser never started.
      _status.Set(_T("Error waiting for browser to launch"));
      _test._run_error = "Timed out waiting for the browser to start.";
      ok = false;
    } else if (ret == 0) {
      // webdriver client died before the browser could have been started.
      _status.Set(_T("Error starting webdriver client"));
      _test._run_error = "Error starting webdriver client";
      ok = false;
    } else if (ret == 1) {
      _status.Set(_T("Error starting webdriver server"));
      _test._run_error = "Error starting webdriver server";
      ok = false;
    } /* else {
      // everything went okay and the browser was started.
    } */
  }
  if (ok) {
    // Get a handle to the browser process.
    DWORD browser_pid = GetBrowserProcessId();
    if (browser_pid) {
      browser_process = OpenProcess(SYNCHRONIZE | PROCESS_TERMINATE,
        FALSE, browser_pid);
    }
    if (!browser_process) {
      WptTrace(loglevel::kError, _T("Failed to acquire handle to the browser process."));
      _test._run_error = "Failed to acquire handle to the browser process.";
      ok = false;
    }

    if (ok) {
      _status.Set(_T("Waiting up to %d seconds for the test to complete."),
        (_test._test_timeout / SECONDS_TO_MS) * 2);
      DWORD wait_time = _test._test_timeout;  // Stricter limit on this value
      HANDLE handles[] = { _browser_done_event, browser_process };
      // Wait for either the _browser_done_event to be set OR the browser
      // process to die, whichever happens first.
      WaitForMultipleObjects(2, handles, false, wait_time);
    }
  }
  // Wait for the wd-runner process to die.
  WaitForSingleObject(_client_info.hProcess, 10000);
  // The standalone selenium server might have spawned a chromedriver.exe or
  // iedriverserver.exe in the background. We need to kill them to make sure
  // there are no left over processes after a test.
  TerminateProcessesByName(_T("chromedriver.exe"));
  TerminateProcessesByName(_T("iedriverserver.exe"));
  // Now, terminate anything that might still be running.
  TerminateProcessById(_server_info.dwProcessId);
  TerminateProcessById(_client_info.dwProcessId);

  if (!GetExitCodeProcess(_client_info.hProcess, &client_exit_code)) {
    WptTrace(loglevel::kError, _T("[webdriver] Client exited with exit code: %u"), GetLastError());
  }

  if (!GetExitCodeProcess(_server_info.hProcess, &server_exit_code)) {
    WptTrace(loglevel::kError, _T("[webdriver] Server exited with exit code: %u"), GetLastError());
  }
  
  // Close all the handles.
  CloseHandle(_server_info.hProcess);
  CloseHandle(_server_info.hThread);
  CloseHandle(_client_info.hProcess);
  CloseHandle(_client_info.hThread);

  CloseHandle(_browser_started_event);
  CloseHandle(_browser_done_event);

  // Delete the script
  CString filepath = _scripts_dir + _T("\\script_") + _test._id;
  DeleteFile(filepath);

  if (active_event) {
    CloseHandle(active_event);
  }

  return ok && !client_exit_code && !server_exit_code;
}

bool WebDriver::SpawnWebDriverServer() {
  STARTUPINFO si;

  ZeroMemory(&si, sizeof(STARTUPINFO));

  si.cb = sizeof(STARTUPINFO);
  si.dwFlags = STARTF_USESHOWWINDOW;
  _settings._webdriver_server_command.Replace(_T("%RESULTDIR%"), _test._directory);
  _status.Set(_T("Launching: %s"), _settings._webdriver_server_command);
  if (!CreateProcess(NULL, _settings._webdriver_server_command.GetBuffer(), NULL, NULL, TRUE, 0, NULL,
    NULL, &si, &_server_info)) {
    WptTrace(loglevel::kError, _T("[webdriver] Failed to start webdriver server. Error: %u"),
      GetLastError());
    _test._run_error = "Failed to launch the webdriver server.";
    return false;
  }
  
  return true;
}

bool WebDriver::SpawnWebDriverClient() {
  STARTUPINFO si;
  CString cmdLine;
  CAtlArray<CString> options;
  CString browser(_settings._browser._browser);
  
  browser.MakeLower();
  // Add the test id
  options.Add(_T("--id"));
  options.Add(_test._id);
  // Add the browser we are about to launch.
  options.Add(_T("--browser"));
  options.Add(_T("\"") + browser + _T("\""));
  if (!_test._script.GetLength()) {
    // Script is empty. Test the said url.
    options.Add(_T("--test-url"));
    options.Add(_test._url);
  } else {
    CString filepath = _scripts_dir + _T("\\script_") + _test._id;
    WriteScriptToFile(_test._script, filepath);
    options.Add(_T("--test-script"));
    options.Add(_T("\"") + filepath + _T("\""));
  }
  if (!_settings._webdriver_server_url.IsEmpty()) {
    options.Add(_T("--server-url"));
    options.Add(_settings._webdriver_server_url);
  }
  // Get the command line options for the specific browser.
  _browser.GetCmdLineOptions(_test, options);
  // Add the profile directory option for firefox.
  if (_settings._browser.IsFirefox()) {
    options.Add(_T("--firefox-profile-dir"));
    options.Add(_T("\"") + _settings._browser._profile_directory + _T("\""));
  }
  if (!_test._webdriver_args.IsEmpty()) {
    options.Add(_test._webdriver_args);
  }
  // pass an output file for the client to record stdout/stderr
  CString filepath = _test._directory + _T("\\output.json");
  options.Add(_T("--output"));
  options.Add(_T("\"") + filepath + _T("\""));

  ConstructCmdLine(_settings._webdriver_client_command, options, CString(""), cmdLine);

  ZeroMemory(&si, sizeof(STARTUPINFO));

  si.cb = sizeof(STARTUPINFO);
  si.dwFlags = STARTF_USESHOWWINDOW;
  
  _status.Set(_T("Launching: %s"), cmdLine);

  if (!CreateProcess(NULL, cmdLine.GetBuffer(), NULL, NULL, TRUE, 0, NULL,
    NULL, &si, &_client_info)) {
    WptTrace(loglevel::kError, _T("[webdriver] Failed to start webdriver-client. Error: %s"),
      GetErrorDetail(GetLastError()));
    _test._run_error = "Failed to launch the webdriver client";
    return false;
  }

  return true;
}

bool WebDriver::WriteScriptToFile(CString& script, CString& filepath) {
  HANDLE file = CreateFile(filepath.GetBuffer(), GENERIC_WRITE, 0, 0, CREATE_ALWAYS,
                            0, 0);
  bool ret = false;
  if (file != INVALID_HANDLE_VALUE) {
    DWORD bytes_written = 0;
    CStringA utf8_script = ::UTF16toUTF8(script);
    WriteFile(file, (LPCWSTR)utf8_script.GetBuffer(), utf8_script.GetLength(), &bytes_written, 0);
    CloseHandle(file);
    ret = true;
  }

  return ret;
}