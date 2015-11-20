#include "stdafx.h"
#include "request.h"
#include "test_state.h"
#include "track_sockets.h"
#include "shared_mem.h"
#include "hook_file.h"

static FileHook* g_hook = NULL;

HANDLE __stdcall CreateFileW_Hook(LPCWSTR lpFileName, DWORD dwDesiredAccess,
    DWORD dwShareMode, LPSECURITY_ATTRIBUTES lpSecurityAttributes,
    DWORD dwCreationDisposition, DWORD dwFlagsAndAttributes,
    HANDLE hTemplateFile) {
  return g_hook ? g_hook->CreateFileW(lpFileName, dwDesiredAccess,
      dwShareMode, lpSecurityAttributes, dwCreationDisposition,
      dwFlagsAndAttributes, hTemplateFile): INVALID_HANDLE_VALUE;
}

BOOL __stdcall WriteFile_Hook(HANDLE hFile, LPCVOID lpBuffer,
    DWORD nNumberOfBytesToWrite, LPDWORD lpNumberOfBytesWritten,
    LPOVERLAPPED lpOverlapped) {
  return g_hook ? g_hook->WriteFile(hFile, lpBuffer, nNumberOfBytesToWrite,
      lpNumberOfBytesWritten, lpOverlapped) : FALSE;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
FileHook::FileHook(TrackSockets& sockets, TestState& test_state):
  _hook(NULL)
  ,_sockets(sockets)
  ,_test_state(test_state)
  ,keylog_file_(INVALID_HANDLE_VALUE)
  ,CreateFileW_(NULL)
  ,WriteFile_(NULL) {
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
FileHook::~FileHook() {
  if (g_hook == this)
    g_hook = NULL;
  delete _hook;  // remove all the hooks
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void FileHook::Init() {
  if (_hook || g_hook) {
    return;
  }
  _hook = new NCodeHookIA32();
  g_hook = this;
  WptTrace(loglevel::kProcess, _T("[wpthook] FileHook::Init()\n"));
  CreateFileW_ = _hook->createHookByName("kernel32.dll", "CreateFileW",
                                         CreateFileW_Hook);
  WriteFile_ = _hook->createHookByName("kernel32.dll", "WriteFile",
                                       WriteFile_Hook);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HANDLE FileHook::CreateFileW(LPCWSTR lpFileName, DWORD dwDesiredAccess,
    DWORD dwShareMode, LPSECURITY_ATTRIBUTES lpSecurityAttributes,
    DWORD dwCreationDisposition, DWORD dwFlagsAndAttributes,
    HANDLE hTemplateFile) {
  HANDLE hFile = INVALID_HANDLE_VALUE;
  if (CreateFileW_) {
    hFile = CreateFileW_(lpFileName, dwDesiredAccess, dwShareMode,
        lpSecurityAttributes, dwCreationDisposition, dwFlagsAndAttributes,
        hTemplateFile);
  }
  // Detect the keylog file so we can catch writes to it
  if (!lstrcmpiW(shared_keylog_file, lpFileName)) {
    keylog_file_ = hFile;
  }
  return hFile;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL FileHook::WriteFile(HANDLE hFile, LPCVOID lpBuffer,
    DWORD nNumberOfBytesToWrite, LPDWORD lpNumberOfBytesWritten,
    LPOVERLAPPED lpOverlapped) {
  BOOL ret = FALSE;
  if (hFile == keylog_file_ && lpBuffer && nNumberOfBytesToWrite) {
    CStringA buff((const char *)lpBuffer, nNumberOfBytesToWrite);
    _sockets.SslKeyLog(buff);
  }
  if (WriteFile_) {
    ret = WriteFile_(hFile, lpBuffer, nNumberOfBytesToWrite,
                     lpNumberOfBytesWritten, lpOverlapped);
  }
  return ret;
}
