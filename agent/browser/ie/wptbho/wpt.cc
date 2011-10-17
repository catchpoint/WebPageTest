#include "StdAfx.h"
#include "wpt.h"
#include "wpt_task.h"

const DWORD TASK_INTERVAL = 1000;

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Wpt::Wpt(void):_active(false),_task_timer(NULL) {
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
  if (!_task_timer) {
    _web_browser = web_browser;
    timeBeginPeriod(1);
    CreateTimerQueueTimer(&_task_timer, NULL, ::TaskTimer, this, TASK_INTERVAL, 
                          TASK_INTERVAL, WT_EXECUTEDEFAULT);
  }
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
  OutputDebugString(CString(_T("[wptbho] NavigateTo: ")) + url);
  if (_web_browser) {
    CComBSTR bstr_url = url;
    _web_browser->Navigate(bstr_url, 0, 0, 0, 0);
  }
}

