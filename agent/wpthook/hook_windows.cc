#include "stdafx.h"
#include "request.h"
#include "test_state.h"
#include "shared_mem.h"
#include "hook_windows.h"

static WindowsHook* g_hook = NULL;

BOOL __stdcall ShowWindow_Hook(HWND hWnd, int nCmdShow) {
  return g_hook ? g_hook->ShowWindow(hWnd, nCmdShow): FALSE;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WindowsHook::WindowsHook(TestState& test_state):
  _hook(NULL)
  ,_test_state(test_state)
  ,ShowWindow_(NULL) {
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WindowsHook::~WindowsHook() {
  if (g_hook == this)
    g_hook = NULL;
  delete _hook;  // remove all the hooks
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WindowsHook::Init() {
  if (_hook || g_hook) {
    return;
  }

  _hook = new NCodeHookIA32();
  g_hook = this;
  WptTrace(loglevel::kProcess, _T("[wpthook] WindowsHook::Init()\n"));
  ShowWindow_ = _hook->createHookByName("user32.dll", "ShowWindow",
                                         ShowWindow_Hook);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL WindowsHook::ShowWindow(HWND hWnd, int nCmdShow) {
  BOOL ret = FALSE;

  CString name;
  DWORD dwExStyle = GetWindowLong(hWnd, GWL_EXSTYLE);
  DWORD dwStyle = GetWindowLong(hWnd, GWL_STYLE);

  if (dwExStyle & WS_EX_TOOLWINDOW && nCmdShow == SW_SHOWNORMAL) {
    TCHAR class_name[1024];
    class_name[0] = 0;
    if (GetClassName(hWnd, class_name, _countof(class_name))) {
      if (!lstrcmp(class_name, _T("Chrome_WidgetWin_1")))
        ret = TRUE;
    }
  }

  if (!ret && ShowWindow_)
    ret = ShowWindow_(hWnd, nCmdShow);

  return ret;
}