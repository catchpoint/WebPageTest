#include "StdAfx.h"
#include "web_browser.h"

typedef void(__stdcall * LPINSTALLHOOK)(DWORD thread_id);

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WebBrowser::WebBrowser(WptSettings& settings, WptTest& test, WptStatus &status,
                        WptHook& hook):
  _settings(settings)
  ,_test(test)
  ,_status(status)
  ,_browser_process(NULL)
  ,_hook(hook){

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

  if (_test.Start() ){
    CString cmdLine = _settings._browser_chrome.Trim(_T("\""));
    if( _settings._browser_chrome.GetLength() ){
      HMODULE hook_dll = NULL;
      TCHAR cmdLine[MAX_PATH + 100];
      lstrcpy( cmdLine, CString(_T("\"")) + _settings._browser_chrome + 
          _T("\" --new-window --no-first-run about:blank") );

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
      if (CreateProcess(NULL, cmdLine, NULL, NULL, FALSE, 0, 
                        NULL, NULL, &si, &pi)){
        _browser_process = pi.hProcess;

        // let the browser start pumping messages, otherwise our hook won't 
        // install
        WaitForInputIdle(pi.hProcess, 10000);

        TCHAR hook_dll_path[MAX_PATH];
        GetModuleFileName(NULL, hook_dll_path, _countof(hook_dll_path));
        lstrcpy( PathFindFileName(hook_dll_path), _T("wpthook.dll") );
        hook_dll = LoadLibrary(hook_dll_path);
        if (hook_dll) {
          LPINSTALLHOOK InstallHook = (LPINSTALLHOOK)GetProcAddress(hook_dll,
                                                          "_InstallHook@4");
          if (InstallHook)
            InstallHook(pi.dwThreadId);
        }

        // ok, let the browser continue running
        ResumeThread(pi.hThread);
        CloseHandle(pi.hThread);

        _hook.Connect();
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

