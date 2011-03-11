#include "StdAfx.h"
#include "web_browser.h"

typedef void(__stdcall * LPINSTALLHOOK)(DWORD thread_id);

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WebBrowser::WebBrowser(WptSettings& settings, WptTest& test, WptStatus &status,
                        WptHook& hook, BrowserSettings& browser):
  _settings(settings)
  ,_test(test)
  ,_status(status)
  ,_browser_process(NULL)
  ,_hook(hook)
  ,_browser(browser) {

  InitializeCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WebBrowser::~WebBrowser(void){
  DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WebBrowser::RunAndWait(){
  bool ret = false;

  if (_test.Start(&_browser) ){
    if( _browser._exe.GetLength() ){
      HMODULE hook_dll = NULL;
      TCHAR cmdLine[4096];
      lstrcpy( cmdLine, CString(_T("\"")) + _browser._exe + _T("\"") );
      if (_browser._options.GetLength() )
        lstrcat( cmdLine, CString(_T(" ")) + _browser._options );
      lstrcat ( cmdLine, _T(" about:blank"));

      _status.Set(_T("[wptdriver] Launching: %s\n"), cmdLine);

      STARTUPINFO si;
      PROCESS_INFORMATION pi;
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
      if (CreateProcess(NULL, cmdLine, NULL, NULL, FALSE, CREATE_SUSPENDED, 
                        NULL, NULL, &si, &pi)){
        _browser_process = pi.hProcess;

        ResumeThread(pi.hThread);
        WaitForInputIdle(pi.hProcess, 120000);
        SuspendThread(pi.hThread);

        InstallHook(pi.hProcess);

        SetPriorityClass(pi.hProcess, ABOVE_NORMAL_PRIORITY_CLASS);
        ResumeThread(pi.hThread);
        CloseHandle(pi.hThread);
      }
      LeaveCriticalSection(&cs);

      // wait for the browser to finish
      if( _browser_process && 
          WaitForSingleObject(_browser_process, _settings._timeout * 
          SECONDS_TO_MS ) == WAIT_OBJECT_0 ){
        ret = true;
      }

      // kill the browser if it is still running
      EnterCriticalSection(&cs);
      _hook.Disconnect();

      if( _browser_process ){
        DWORD exit_code;
        if( GetExitCodeProcess(_browser_process, &exit_code) == STILL_ACTIVE )
          TerminateProcess(_browser_process, 0);
        CloseHandle(_browser_process);
      }

      if (hook_dll) {
        FreeLibrary(hook_dll);
      }
      LeaveCriticalSection(&cs);
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WebBrowser::Close(){
  bool ret = false;

  EnterCriticalSection(&cs);

  // send close messages to all of the top-level windows associated with the
  // browser process
  if( _browser_process ){
    DWORD browser_process_id = GetProcessId(_browser_process);
    HWND wnd = ::GetDesktopWindow();
    wnd = ::GetWindow(wnd, GW_CHILD);
    TCHAR window_class[1024];
    while ( wnd )
    {
      DWORD pid;
      GetWindowThreadProcessId( wnd, &pid);
      if ( pid == browser_process_id && IsWindowVisible(wnd) ) {
        *window_class = NULL;
        GetClassName(wnd, window_class, _countof(window_class));
        if (!_browser._frame_window.GetLength() || 
              _browser._frame_window == window_class) {
          ::PostMessage(wnd,WM_CLOSE,0,0);
        }
      }
      wnd = ::GetNextWindow( wnd , GW_HWNDNEXT);
    }
  }
  LeaveCriticalSection(&cs);

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WebBrowser::ClearCache() {
  if (_browser._cache.GetLength()) {
    DeleteDirectory(_browser._cache, false);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WebBrowser::PositionWindow() {
  EnterCriticalSection(&cs);
  if( _browser_process ){
    DWORD browser_process_id = GetProcessId(_browser_process);
    HWND wnd = ::GetDesktopWindow();
    wnd = ::GetWindow(wnd, GW_CHILD);
    TCHAR window_class[1024];
    while ( wnd )
    {
      DWORD pid;
      GetWindowThreadProcessId( wnd, &pid);
      if ( pid == browser_process_id && IsWindowVisible(wnd) ) {
        *window_class = NULL;
        GetClassName(wnd, window_class, _countof(window_class));
        if (!_browser._frame_window.GetLength() || 
              _browser._frame_window == window_class) {
          ::ShowWindow(wnd, SW_RESTORE);
          ::SetWindowPos(wnd, HWND_TOPMOST, 0, 0, 1024, 768, SWP_NOACTIVATE);
        }
      }
      wnd = ::GetNextWindow( wnd , GW_HWNDNEXT);
    }
  }
  LeaveCriticalSection(&cs);
}
