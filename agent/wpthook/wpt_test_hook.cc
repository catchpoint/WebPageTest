#include "StdAfx.h"
#include "wpt_test_hook.h"
#include "shared_mem.h"


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptTestHook::WptTestHook(void) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptTestHook::~WptTestHook(void) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptTestHook::LoadFromFile() {
  ATLTRACE(_T("[wpthook] - WptTestHook::LoadFromFile\n"));

  HANDLE file = CreateFile(_test_file, GENERIC_READ,0,0, OPEN_EXISTING, 0, 0);
  if (file != INVALID_HANDLE_VALUE) {
    DWORD len = GetFileSize(file, NULL);
    if (len) {
      ATLTRACE(_T("[wpthook] - WptTestHook::LoadFromFile - %d bytes\n"), len);

      wchar_t * buff = (wchar_t *) malloc(len + sizeof(wchar_t));
      if (buff) {
        memset(buff, 0, len + sizeof(wchar_t));
        DWORD bytes_read = 0;
        if (ReadFile(file, buff, len, &bytes_read, 0)) {
          ATLTRACE(_T("[wpthook] - Loaded %d bytes\n"), bytes_read);
          CString test_data(buff);
          if (Load(test_data)) {
            // build up a new script
            _script_commands.RemoveAll();
    
            if (_directory.GetLength() && _url.GetLength()) {
              ScriptCommand command;
              command.command = _T("navigate");
              command.target = _url;
              command.record = true;

              _script_commands.AddTail(command);
            }
          }
        }
        free(buff);
      }
    }
    CloseHandle(file);
  }

  _run = shared_current_run;
}
