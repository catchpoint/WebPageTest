#include "StdAfx.h"
#include "wpt_test_hook.h"
#include "wpthook.h"
#include "test_state.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptTestHook::WptTestHook(WptHook& hook, TestState& test_state, DWORD timeout):
  hook_(hook)
  , test_state_(test_state) {
  _measurement_timeout = timeout;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptTestHook::~WptTestHook(void) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptTestHook::LoadFromFile() {
  ATLTRACE("[wpthook] - WptTestHook::LoadFromFile");

  HANDLE file = CreateFile(_test_file, GENERIC_READ,0,0, OPEN_EXISTING, 0, 0);
  if (file != INVALID_HANDLE_VALUE) {
    DWORD len = GetFileSize(file, NULL);
    if (len) {
      wchar_t * buff = (wchar_t *) malloc(len + sizeof(wchar_t));
      if (buff) {
        memset(buff, 0, len + sizeof(wchar_t));
        DWORD bytes_read = 0;
        if (ReadFile(file, buff, len, &bytes_read, 0)) {
          CString test_data(buff);
          if (Load(test_data)) {
            SharedMem shared(false);
            _clear_cache = shared.ClearedCache();
            _run = shared.CurrentRun();
            has_gpu_ = shared.HasGPU();
            overrode_ua_string_ = shared.OverrodeUAString();
            BuildScript();
          }
        }
        free(buff);
      }
    }
    CloseHandle(file);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptTestHook::ReportData() {
  hook_.Report();
}

/*-----------------------------------------------------------------------------
  
-----------------------------------------------------------------------------*/
bool WptTestHook::ProcessCommand(ScriptCommand& command, bool &consumed) {
  bool continue_processing = WptTest::ProcessCommand(command, consumed);
  if (!consumed) {
    consumed = true;

    CString cmd = command.command;
    cmd.MakeLower();

    if (cmd == _T("resizeresponsive")) {
      test_state_.ResizeBrowserForResponsiveTest();
      continue_processing = false;
      consumed = true;
    } else {
      continue_processing = false;
      consumed = false;
    }
  }

  return continue_processing;
}
