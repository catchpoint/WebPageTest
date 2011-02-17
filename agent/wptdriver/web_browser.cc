#include "StdAfx.h"
#include "web_browser.h"


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WebBrowser::WebBrowser(WptSettings& settings, WptTest& test):
  _settings(settings)
  ,_test(test)
  ,_browser_process(NULL){

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

  CString cmdLine = _settings._browser_chrome.Trim(_T("\""));
  if( _settings._browser_chrome.GetLength() ){
    TCHAR cmdLine[MAX_PATH + 100];
    lstrcpy( cmdLine, CString(_T("\"")) + _settings._browser_chrome + 
        _T("\" about:blank") );

    STARTUPINFO si;
    PROCESS_INFORMATION pi;
    memset( &si, 0, sizeof(si) );
    si.cb = sizeof(si);
    si.dwX = 0;
    si.dwY = 0;
    si.dwXSize = 1024;
    si.dwYSize = 768;
    si.dwFlags = STARTF_USEPOSITION | STARTF_USESIZE;

    EnterCriticalSection(&cs);
    _browser_process = NULL;
    if (CreateProcess(NULL, cmdLine, NULL, NULL, FALSE, 0, NULL, NULL, 
                      &si, &pi)){
      _browser_process = pi.hProcess;
      CloseHandle(pi.hThread);
    }
    LeaveCriticalSection(&cs);

    if( _browser_process && 
        WaitForSingleObject(_browser_process, _settings._timeout * 
        SECONDS_TO_MS ) == WAIT_OBJECT_0 ){
      ret = true;
    }

    EnterCriticalSection(&cs);
    if( _browser_process ){
      DWORD exit_code;
      if( GetExitCodeProcess(_browser_process, &exit_code) == STILL_ACTIVE )
        TerminateProcess(_browser_process, 0);
      CloseHandle(_browser_process);
    }
    LeaveCriticalSection(&cs);
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WebBrowser::Close(){
  bool ret = false;

  EnterCriticalSection(&cs);
  if( _browser_process ){
    // send close messages to all of the top-level windows associated with the
    // browser process
    DWORD browser_process_id = GetProcessId(_browser_process);
    HWND wnd = ::GetDesktopWindow();
		wnd = ::GetWindow(wnd, GW_CHILD);
    while ( wnd )
    {
      DWORD pid;
      GetWindowThreadProcessId( wnd, &pid);
      if ( pid == browser_process_id )
        ::PostMessage(wnd,WM_CLOSE,0,0);
      wnd = ::GetNextWindow( wnd , GW_HWNDNEXT);
    }
  }
  LeaveCriticalSection(&cs);

  return ret;
}