#include "StdAfx.h"
#include "globals.h"
#include "web_driver.h"

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
  DWORD client_exit_code = -1;
  DWORD server_exit_code = -1;
  DWORD browser_pid = -1;
  HANDLE browser_process = NULL;
  HANDLE active_event = NULL;

  if (!_test.Start()) {
    _status.Set(_T("[webdriver] Error with internal test state."));
    _test._run_error = "Failed to launch webdriver test. Error with internal test state";
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
          "Failed to launch webdriver test. Error initializing browser event";
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
    HANDLE handles[] = {
      _client_info.hProcess,
      _server_info.hProcess,
      _browser_started_event
    };

    _status.Set(_T("Waiting up to %u seconds for browser to start"),
      BROWSER_STARTED_EVENT_TIMEOUT / SECONDS_TO_MS);

    DWORD ret = WaitForMultipleObjects(_countof(handles),
      handles,
      false,
      BROWSER_STARTED_EVENT_TIMEOUT);

    if (ret == WAIT_FAILED || ret == WAIT_TIMEOUT || ret == WAIT_ABANDONED) {
      // WAIT_ABANDONED is also included here because even though the mutex 
      // is abandoned, and possibly left things in a sloppy state, there is
      // not much we can do here except signal that the browser never started.
      CString err_msg("Timed out waiting for browser to start");
      _status.Set(err_msg);
      _test._run_error = err_msg;
      ok = false;
    } else if (ret == 0) {
      // webdriver client died before the browser could have been started.
      GetExitCodeProcess(_client_info.hProcess, &client_exit_code);
      CString err_msg;
      err_msg.Format(_T("Webdriver client prematurely exited with code %u"), client_exit_code);
      _status.Set(err_msg);
      _test._run_error = err_msg;
      ok = false;
    } else if (ret == 1) {
      GetExitCodeProcess(_server_info.hProcess, &server_exit_code);
      CString err_msg;
      err_msg.Format(_T("Webdriver server prematurely exited with code %u"), server_exit_code);
      _status.Set(err_msg);
      _test._run_error = err_msg;
      ok = false;
    } /* else {
      // everything went okay and the browser was started.
    } */
  }

  if (ok) {
    // Get a handle to the browser process.
    browser_pid = GetBrowserProcessId();
    if (browser_pid) {
      browser_process = OpenProcess(SYNCHRONIZE | PROCESS_TERMINATE,
        FALSE, browser_pid);
    }
    if (!browser_process) {
      CString err_msg("Failed to acquire handle to the browser process");
      WptTrace(loglevel::kError, err_msg);
      _test._run_error = err_msg;
      ok = false;
    }

    if (ok) {
      DWORD wait_time = _test._test_timeout + RESULTS_PROCESSING_GRACE_PERIOD;
      _status.Set(_T("Waiting up to %d seconds for the test to complete."),
        (wait_time / SECONDS_TO_MS));
      HANDLE handles[] = { _browser_done_event, _client_info.hProcess };
      // Wait for the browser process to signal that it is done AND the connector
      // process to terminate
      DWORD ret = WaitForMultipleObjects(_countof(handles), handles, true, wait_time);
      if (ret == WAIT_FAILED) {
        CString err_msg;
        err_msg.Format(
          _T("Error waiting for the browser to signal test completion. Error code: %u"),
          GetLastError());
        _status.Set(err_msg);
        _test._run_error = err_msg;
        ok = false;
      } else if (ret == WAIT_TIMEOUT) {
        CString err_msg("Timed out waiting for the browser to signal test completion");
        _status.Set(err_msg);
        _test._run_error = err_msg;
        ok = false;
      } else if (ret == WAIT_ABANDONED) {
        CString err_msg("Browser exited prematurely");
        _status.Set(err_msg);
        _test._run_error = err_msg;
        ok = false;
      }
    }
  }

  // The standalone selenium server might have spawned a chromedriver.exe or
  // iedriverserver.exe in the background. We need to kill them to make sure
  // there are no left over processes after a test.
  TerminateProcessesByName(_T("chromedriver.exe"));
  TerminateProcessesByName(_T("iedriverserver.exe"));

  if (browser_pid > 0) {
    TerminateProcessById(browser_pid);
  }
  if (_server_info.dwProcessId > 0) {
    TerminateProcessById(_server_info.dwProcessId);
  }
  if (_client_info.dwProcessId > 0) {
    TerminateProcessById(_client_info.dwProcessId);
  }

  // Close all the process handles.
  CloseHandle(browser_process);
  CloseHandle(_server_info.hProcess);
  CloseHandle(_server_info.hThread);
  CloseHandle(_client_info.hProcess);
  CloseHandle(_client_info.hThread);
  // Close all the mutex handles
  CloseHandle(_browser_started_event);
  CloseHandle(_browser_done_event);
  if (active_event) {
    CloseHandle(active_event);
  }
  // Delete the script
  CString filepath = _scripts_dir + _T("\\script_") + _test._id;
  DeleteFile(filepath);

  return ok;
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
    CString err_msg;
    err_msg.Format(_T("Failed to launch webdriver server. Error code: %u"), GetLastError());
    _status.Set(err_msg);
    _test._run_error = err_msg;
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
  // pass the test directory to the client to record stdout/stderr and other result files
  options.Add(_T("--outputDir"));
  options.Add(_T("\"") + _test._directory + _T("\""));
  // pass the test timeout to the client
  if (_test._test_timeout > 0) {
    CString timeout;
    timeout.Format(_T("%u"), (_test._test_timeout / SECONDS_TO_MS));

    options.Add(_T("--timeout"));
    options.Add(timeout);
  }
  ConstructCmdLine(_settings._webdriver_client_command, options, CString(""), cmdLine);

  ZeroMemory(&si, sizeof(STARTUPINFO));

  si.cb = sizeof(STARTUPINFO);
  si.dwFlags = STARTF_USESHOWWINDOW;
  
  _status.Set(_T("Launching: %s"), cmdLine);

  if (!CreateProcess(NULL, cmdLine.GetBuffer(), NULL, NULL, TRUE, 0, NULL,
    NULL, &si, &_client_info)) {
    CString err_msg;
    err_msg.Format(_T("Failed to launch webdriver client. Error code: %u"), GetLastError());
    _test._run_error = err_msg;
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