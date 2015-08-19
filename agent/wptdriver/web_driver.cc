#include "StdAfx.h"
#include "web_driver.h"

extern const TCHAR * BROWSER_STARTED_EVENT;
extern const TCHAR * BROWSER_DONE_EVENT;

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

static DWORD WINAPI ReadClientErrorProc(LPVOID lpvParam) {
  WebDriver *driver = (WebDriver *)lpvParam;

  driver->ReadClientError();
  return 0;
}

static DWORD WINAPI ReadServerErrorProc(LPVOID lpvParam) {
  WebDriver *driver = (WebDriver *)lpvParam;

  driver->ReadServerError();
  return 0;
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
  HANDLE browser_process;

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

  if (!SpawnWebDriverServer()) {
    ok = false;
  }

  if (ok && !SpawnWebDriverClient()) {
    ok = false;
  }

  if (ok) {
    // Now both the processes are spawned. We wait until something
    // interesting happens.
    if (WaitForSingleObject(_browser_started_event, 60000) !=
      WAIT_OBJECT_0) {
      _status.Set(_T("Error waiting for browser to launch"));
      _test._run_error = "Timed out waiting for the browser to start.";
      ok = false;
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
  if (_client_info.hProcess) {
    // Wait for the wd-runner process to die.
    WaitForSingleObject(_client_info.hProcess, 10000);
  }
  // The standalone selenium server might have spawned a chromedriver.exe or
  // and iedriverserver.exe in the background. We need to kill them to make
  // sure there are no left over processes after a test.
  TerminateProcessesByName(_T("chromedriver.exe"));
  TerminateProcessesByName(_T("iedriverserver.exe"));
  // Now, terminate anything that might still be running.
  TerminateProcessById(_server_info.dwProcessId);
  TerminateProcessById(_client_info.dwProcessId);

  if (!GetExitCodeProcess(_client_info.hProcess, &client_exit_code)) {
    WptTrace(loglevel::kError, _T("[webdriver] WINAPI error GetExitCodeProcess: %u"), GetLastError());
  }

  if (!GetExitCodeProcess(_server_info.hProcess, &server_exit_code)) {
    WptTrace(loglevel::kError, _T("[webdriver] WINAPI error GetExitCodeProcess: %u"), GetLastError());
  }
  
  // Wait for all the read threads to be done.
  if (_server_read_thread) {
    WaitForSingleObject(_server_read_thread, 10000);
    TerminateThread(_server_read_thread, 0);    // Force terminate, just in case.
  }
  if (_client_read_thread) {
    WaitForSingleObject(_client_read_thread, 10000);
    TerminateThread(_client_read_thread, 0);
  }

  // Close all the handles.
  CloseHandle(_server_info.hProcess);
  CloseHandle(_server_info.hThread);
  CloseHandle(_client_info.hProcess);
  CloseHandle(_client_info.hThread);

  CloseHandle(_browser_started_event);
  CloseHandle(_browser_done_event);

  if (server_exit_code && _server_err.GetLength()) {
    _test._run_error = _server_err;
    WptTrace(loglevel::kError, _T("[webdriver] Error with webdriver server: ") + _server_err);
  }

  if (client_exit_code && _client_err.GetLength()) {
    _test._run_error += _client_err;
    WptTrace(loglevel::kError, _T("[webdriver] Error with webdriver client: ") + _client_err);
  }

  CloseHandle(_client_err_read);
  CloseHandle(_server_err_read);

  // Delete the script
  CString filepath = _scripts_dir + _T("\\script_") + _test._id;
  DeleteFile(filepath);

  return ok && !client_exit_code && !server_exit_code;
}

bool WebDriver::CreateStdPipes(HANDLE *hRead, HANDLE *hWrite) {
  SECURITY_ATTRIBUTES sa_attr;

  sa_attr.nLength = sizeof(SECURITY_ATTRIBUTES);
  sa_attr.bInheritHandle = TRUE;
  sa_attr.lpSecurityDescriptor = NULL;

  // Create the stdout pipe. Child will write via out_write
  // and we will read via out_read.
  if (!CreatePipe(hRead, hWrite, &sa_attr, 0)) {
    WptTrace(loglevel::kError, _T("[webdirver] Failed to create pipes. Error: %u"),
      GetLastError());
    return false;
  }
  // Make sure the read end of the pipe is not inheritable by the
  // child.
  if (!SetHandleInformation(*hRead, HANDLE_FLAG_INHERIT, 0)) {
    WptTrace(loglevel::kError, _T("[webdriver] Failed to make handle uninheritable. Error: %u"),
      GetLastError());
    return false;
  }
  return true;
}

bool WebDriver::SpawnWebDriverServer() {
  STARTUPINFO si;
  DWORD thread_id;

  ZeroMemory(&si, sizeof(STARTUPINFO));

  if (!CreateStdPipes(&_server_err_read, &_server_err_write)) {
    _test._run_error = "Failed to launch the webdriver server.";
    return false;
  }
  
  si.cb = sizeof(STARTUPINFO);
  si.wShowWindow = SW_MINIMIZE;
  si.hStdInput = GetStdHandle(STD_INPUT_HANDLE);
  si.hStdOutput = GetStdHandle(STD_OUTPUT_HANDLE);
  si.hStdError = _server_err_write;
  si.dwFlags |= STARTF_USESTDHANDLES | STARTF_USESHOWWINDOW;

  _status.Set(_T("Launching: %s"), _settings._webdriver_server_command);
  if (!CreateProcess(NULL, _settings._webdriver_server_command.GetBuffer(), NULL, NULL, TRUE, 0, NULL,
    NULL, &si, &_server_info)) {
    WptTrace(loglevel::kError, _T("[webdriver] Failed to start webdriver server. Error: %u"),
      GetLastError());
    _test._run_error = "Failed to launch the webdriver server.";
    return false;
  }
  
  CloseHandle(_server_err_write); // We won't be needing the write end of the pipe.

  if (!(_server_read_thread = CreateThread(NULL, 0, ::ReadServerErrorProc, this, 0, &thread_id))) {
    WptTrace(loglevel::kError, _T("[webdriver] Failed to create thread to read server errors. Error: %u"),
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
  DWORD thread_id;
  
  // Add the test id
  options.Add(_T("--id"));
  options.Add(_test._id);
  // Add the browser we are about to launch.
  options.Add(_T("--browser"));
  options.Add(_T("\"") + _settings._browser._browser.MakeLower() + _T("\""));
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
  options.Add(_T("--server-url"));
  options.Add(_settings._webdriver_server_url);
  // Get the command line options for the specific browser.
  _browser.GetCmdLineOptions(_test, options);
  // Add the profile directory option for firefox.
  if (!_settings._browser._browser.CompareNoCase(_T("firefox"))) {
    options.Add(_T("--firefox-profile-dir"));
    options.Add(_T("\"") + _settings._browser._profile_directory + _T("\""));
  }
  ConstructCmdLine(_settings._webdriver_client_command, options, CString(""), cmdLine);

  ZeroMemory(&si, sizeof(STARTUPINFO));

  if (!CreateStdPipes(&_client_err_read, &_client_err_write)) {
    _test._run_error = "Failed to launch the webdriver client.";
    return false;
  }

  si.cb = sizeof(STARTUPINFO);
  si.hStdInput = GetStdHandle(STD_INPUT_HANDLE);
  si.hStdOutput = GetStdHandle(STD_OUTPUT_HANDLE);
  si.hStdError = _client_err_write;		// so that we can read stderr.
  si.wShowWindow = SW_MINIMIZE;
  si.dwFlags |= STARTF_USESTDHANDLES | STARTF_USESHOWWINDOW;
  
  _status.Set(_T("Launching: %s"), cmdLine);

  if (!CreateProcess(NULL, cmdLine.GetBuffer(), NULL, NULL, TRUE, 0, NULL,
    NULL, &si, &_client_info)) {
    WptTrace(loglevel::kError, _T("[webdriver] Failed to start webdriver-client. Error: %s"),
      GetErrorDetail(GetLastError()));
    _test._run_error = "Failed to launch the webdriver client";
    return false;
  }

  CloseHandle(_client_err_write);	// We won't be needing the write end of the pipe.

  if (!(_client_read_thread = CreateThread(NULL, 0, ::ReadClientErrorProc, this, 0, &thread_id))) {
    WptTrace(loglevel::kError, _T("[webdriver] Failed to create thread to read client errors. Error: %s"),
      GetErrorDetail(GetLastError()));
    _test._run_error = "Failed to launch the webdriver client";
    return false;
  }

  return true;
}

bool WebDriver::ReadClientError() {
  return ReadPipe(_client_err_read, _client_err);
}

bool WebDriver::ReadServerError() {
  return ReadPipe(_server_err_read, _server_err);
}

bool WebDriver::ReadPipe(HANDLE hRead, CString &content) {
  DWORD bytesRead = -1;
  char buf[1024];

  while (true) {
    if (!ReadFile(hRead, &buf, sizeof(buf) - 1, &bytesRead, NULL)
      || !bytesRead) {
      DWORD err_code = GetLastError();
      if (err_code == ERROR_BROKEN_PIPE) {
        break;
      } else {
        // Something bad happened.
        WptTrace(loglevel::kError, _T("[webdriver] WINAPI error ReadFile. Error: %u"), GetLastError());
        return false;
      }
    }
    content.Append(CString(buf), bytesRead);
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