#include "StdAfx.h"
#include "wpt.h"
#include "wpt_task.h"

extern HINSTANCE dll_hinstance;

const DWORD TASK_INTERVAL = 1000;
static const TCHAR * GLOBAL_TESTING_MUTEX = _T("Global\\wpt_testing_active");
static const TCHAR * HOOK_DLL = _T("wpthook.dll");
typedef BOOL (WINAPI * PFN_INSTALL_HOOK)(HANDLE process);


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Wpt::Wpt(void):_active(false),_task_timer(NULL),_hook_dll(NULL) {
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Wpt::~Wpt(void) {
}

VOID CALLBACK TaskTimer(PVOID lpParameter, BOOLEAN TimerOrWaitFired) {
  if( lpParameter )
    ((Wpt *)lpParameter)->CheckForTask();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Wpt::Start(CComPtr<IWebBrowser2> web_browser) {
  AtlTrace(_T("[wptbho] - Start"));
  HANDLE active_mutex = OpenMutex(SYNCHRONIZE, FALSE, GLOBAL_TESTING_MUTEX);
  if (!_task_timer && active_mutex) {
    if (InstallHook()) {
      _web_browser = web_browser;
      timeBeginPeriod(1);
      CreateTimerQueueTimer(&_task_timer, NULL, ::TaskTimer, this, 
                            TASK_INTERVAL, TASK_INTERVAL, WT_EXECUTEDEFAULT);
    }
  } else {
    AtlTrace(_T("[wptbho] - Start, failed to open mutex"));
  }
  if (active_mutex)
    CloseHandle(active_mutex);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Wpt::Stop(void) {
  if (_task_timer) {
    DeleteTimerQueueTimer(NULL, _task_timer, NULL);
    _task_timer = NULL;
    timeEndPeriod(1);
  }
  _web_browser.Release();
}

/*-----------------------------------------------------------------------------
  Load and install the hooks from wpthook if a test is currently active
  We have to do this from inside the BHO because IE launches child
  processes for each browser and we need to make sure we intercept the 
  correct one
-----------------------------------------------------------------------------*/
bool Wpt::InstallHook() {
  AtlTrace(_T("[wptbho] - InstallHook"));
  bool ok = false;
  if (!_hook_dll) {
    TCHAR path[MAX_PATH];
    if (GetModuleFileName((HMODULE)dll_hinstance, path, _countof(path))) {
      lstrcpy(PathFindFileName(path), HOOK_DLL);
      _hook_dll = LoadLibrary(path);
      if (_hook_dll) {
        PFN_INSTALL_HOOK InstallHook = 
          (PFN_INSTALL_HOOK)GetProcAddress(_hook_dll, "_InstallHook@4");
        if (InstallHook && InstallHook(GetCurrentProcess()) ) {
          ok = true;
        }
      }
    }
  }
  return ok;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Wpt::OnLoad() {
  if (_active) {
    _wpt_interface.OnLoad();
    _active = false;
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Wpt::OnNavigate() {
  if (_active)
    _wpt_interface.OnNavigate();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Wpt::OnTitle(CString title) {
  if (_active)
    _wpt_interface.OnTitle(title);
}

/*-----------------------------------------------------------------------------
  Check for new tasks that need to be executed
-----------------------------------------------------------------------------*/
void Wpt::CheckForTask() {
  if (!_active) {
    WptTask task;
    if (_wpt_interface.GetTask(task)) {
      if (task._record)
        _active = true;
      switch (task._action) {
        case WptTask::NAVIGATE: 
          NavigateTo(task._target); 
          break;
      }
      if (!_active)
        CheckForTask();
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void  Wpt::NavigateTo(CString url) {
  AtlTrace(CString(_T("[wptbho] NavigateTo: ")) + url);
  if (_web_browser) {
    CComBSTR bstr_url = url;
    _web_browser->Navigate(bstr_url, 0, 0, 0, 0);
  }
}

