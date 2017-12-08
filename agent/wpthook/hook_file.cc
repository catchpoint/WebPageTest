#include "stdafx.h"
#include "request.h"
#include "test_state.h"
#include "track_sockets.h"
#include "hook_file.h"
#include "MinHook.h"

static FileHook* g_hook = NULL;

HANDLE __stdcall CreateFileW_Hook(LPCWSTR lpFileName, DWORD dwDesiredAccess,
    DWORD dwShareMode, LPSECURITY_ATTRIBUTES lpSecurityAttributes,
    DWORD dwCreationDisposition, DWORD dwFlagsAndAttributes,
    HANDLE hTemplateFile) {
  return g_hook ? g_hook->CreateFileW(lpFileName, dwDesiredAccess,
      dwShareMode, lpSecurityAttributes, dwCreationDisposition,
      dwFlagsAndAttributes, hTemplateFile): INVALID_HANDLE_VALUE;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
FileHook::FileHook(TrackSockets& sockets, TestState& test_state):
  _sockets(sockets)
  ,_test_state(test_state)
  ,CreateFileW_(NULL) {
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
FileHook::~FileHook() {
  if (g_hook == this)
    g_hook = NULL;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void FileHook::Init() {
  if (g_hook)
    return;

  // Get the system download path
  TCHAR path[4096];
  HKEY hKey;
  if (SUCCEEDED(RegOpenKeyEx(HKEY_CURRENT_USER,
      L"Software\\Microsoft\\Windows\\CurrentVersion"
      L"\\Explorer\\User Shell Folders", 0, KEY_READ, &hKey))) {
    DWORD len = _countof(path);
    if (SUCCEEDED(RegQueryValueEx(hKey,
        _T("{374DE290-123F-4565-9164-39C4925E467B}"), 0, 0,
        (LPBYTE)path, &len))) {
      download_path_ = path;
    } else if (SUCCEEDED(SHGetFolderPath(NULL, CSIDL_MYDOCUMENTS,
                              NULL, SHGFP_TYPE_CURRENT, path))) {
      PathAppend(path, _T("Downloads"));
      download_path_ = path;
    }

    if (!download_path_.IsEmpty()) {
      if (SHGetSpecialFolderPath(NULL, path, CSIDL_PROFILE, FALSE))
        download_path_.Replace(_T("%USERPROFILE%"), path);
    }

    RegCloseKey(hKey);
  }

  g_hook = this;
  ATLTRACE("[wpthook] FileHook::Init()");

  LoadLibrary(_T("kernel32.dll"));
  MH_CreateHookApi(L"kernel32.dll", "CreateFileW", CreateFileW_Hook, (LPVOID *)&CreateFileW_);
  MH_EnableHook(MH_ALL_HOOKS);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HANDLE FileHook::CreateFileW(LPCWSTR lpFileName, DWORD dwDesiredAccess,
    DWORD dwShareMode, LPSECURITY_ATTRIBUTES lpSecurityAttributes,
    DWORD dwCreationDisposition, DWORD dwFlagsAndAttributes,
    HANDLE hTemplateFile) {
  HANDLE hFile = INVALID_HANDLE_VALUE;
  if (!IsDownload(lpFileName)) {
    if (CreateFileW_) {
      hFile = CreateFileW_(lpFileName, dwDesiredAccess, dwShareMode,
          lpSecurityAttributes, dwCreationDisposition, dwFlagsAndAttributes,
          hTemplateFile);
    }
  } else {
    SetLastError(ERROR_ACCESS_DENIED);
  }
  return hFile;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool FileHook::IsDownload(LPCWSTR lpFileName) {
  bool is_download = false;

  if (lpFileName) {
    TCHAR path[4096];
    lstrcpyn(path, lpFileName, _countof(path));
    path[_countof(path) - 1] = 0;
    *PathFindFileName(path) = 0;
    CStringW dir(path);
    dir.TrimRight(_T("\\"));

    if (!download_path_.IsEmpty()) {
      if (!download_path_.CompareNoCase(lpFileName) ||
          !download_path_.CompareNoCase(dir)) {
        is_download = true;
      }
    }

    if (!lstrcmpi(PathFindFileName(lpFileName), _T("Downloads")) ||
        !lstrcmpi(PathFindFileName(dir), _T("Downloads"))) {
      is_download = true;
    }
  }

  return is_download;
}
