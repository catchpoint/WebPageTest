#include "StdAfx.h"
#include "wpt.h"
#include "wpt_task.h"

extern HINSTANCE dll_hinstance;

const DWORD TASK_INTERVAL = 1000;
static const TCHAR * GLOBAL_TESTING_MUTEX = _T("Global\\wpt_testing_active");
static const TCHAR * HOOK_DLL = _T("wpthook.dll");

typedef BOOL (WINAPI * PFN_INSTALL_HOOK)(HANDLE process);

// registry keys
static const TCHAR * REG_DOM_STORAGE_LOW = 
    _T("Software\\Microsoft\\Internet Explorer\\LowRegistry\\DOMStorage");
static const TCHAR * REG_DOM_STORAGE = 
    _T("Software\\Microsoft\\Internet Explorer\\DOMStorage");
static const TCHAR * REG_DOM_STORAGE_KEY = 
    _T("Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings")
    _T("\\5.0\\Cache\\Extensible Cache\\DOMStore");
static const TCHAR * REG_SHELL_FOLDERS = 
    _T("Software\\Microsoft\\Windows\\CurrentVersion")
    _T("\\Explorer\\User Shell Folders");


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
    _wpt_interface.OnTitle(title + _T(" - IE"));
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
        case WptTask::CLEAR_CACHE: 
          ClearCache(); 
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

/*-----------------------------------------------------------------------------
  Recursively delete the given reg key
-----------------------------------------------------------------------------*/
static void DeleteRegKey(HKEY hParent, LPCTSTR key, bool remove) {
  HKEY hKey;
  if (SUCCEEDED(RegOpenKeyEx(hParent, key, 0, KEY_READ | KEY_WRITE, &hKey))) {
    CAtlList<CString> keys;
    TCHAR subKey[255];
    memset(subKey, 0, sizeof(subKey));
    DWORD len = 255;
    DWORD i = 0;
    while (RegEnumKeyEx(hKey, i, subKey, &len, 0, 0, 0, 0) == ERROR_SUCCESS) {
      keys.AddTail(subKey);
      i++;
      len = 255;
      memset(subKey, 0, sizeof(subKey));
    }
    while (!keys.IsEmpty()) {
      CString child = keys.RemoveHead();
      DeleteRegKey(hKey, child, true);
    }
    RegCloseKey(hKey);
    if (remove)
      RegDeleteKey(hParent, key);
  }
}

/*-----------------------------------------------------------------------------
  recursively delete the given directory
-----------------------------------------------------------------------------*/
static void DeleteDirectory(LPCTSTR inPath, bool remove) {
  if (lstrlen(inPath)) {
    TCHAR * path = new TCHAR[MAX_PATH];
    lstrcpy(path, inPath);
    PathAppend(path, _T("*.*"));
    WIN32_FIND_DATA fd;
    HANDLE hFind = FindFirstFile(path, &fd);
    if (hFind != INVALID_HANDLE_VALUE) {
      do {
        if (lstrcmp(fd.cFileName, _T(".")) && lstrcmp(fd.cFileName,_T(".."))) {
          lstrcpy(path, inPath);
          PathAppend(path, fd.cFileName);
          if( fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY ) {
            DeleteDirectory(path, true);
          }
        }
      } while(FindNextFile(hFind, &fd));
      FindClose(hFind);
    }
    delete [] path;
    if (remove)
      RemoveDirectory(inPath);
  }
}

/*-----------------------------------------------------------------------------
  Delete a directory whose path is retrieved from a reg key
-----------------------------------------------------------------------------*/
static void DeleteProfileDirectory(LPCTSTR reg_path, LPCTSTR reg_key, 
                                    LPCTSTR sub_dir = NULL) {
  HKEY key;
  TCHAR path[MAX_PATH];
  if (SUCCEEDED(RegOpenKeyEx(HKEY_CURRENT_USER, reg_path, 0, KEY_READ, &key))){
    DWORD len = _countof(path);
    if (SUCCEEDED(RegQueryValueEx(key, reg_key, 0, 0, (LPBYTE)path, &len))) {
      TCHAR dir[MAX_PATH];
      ExpandEnvironmentStrings(path, dir, _countof(dir));
      if (sub_dir)
        PathAppend(dir, sub_dir);
      DeleteDirectory(dir, false);
    }
    RegCloseKey(key);
  }
}

/*-----------------------------------------------------------------------------
  Delete IE's various caches
-----------------------------------------------------------------------------*/
void  Wpt::ClearCache(void) {
  // first WinInet's supported method for cache clearing
  GROUPID id;
  HANDLE group = FindFirstUrlCacheGroup(0, CACHEGROUP_SEARCH_ALL, 0,0, &id, 0);
  if (group) {
    do {
      DeleteUrlCacheGroup(id, CACHEGROUP_FLAG_FLUSHURL_ONDELETE, 0);
    } while (FindNextUrlCacheGroup(group, &id,0));
    FindCloseUrlCache(group);
  }
  DWORD dwSize = 102400;
  INTERNET_CACHE_ENTRY_INFO * info = (INTERNET_CACHE_ENTRY_INFO *)malloc(dwSize);
  if (info) {
    DWORD len = dwSize / sizeof(TCHAR);
    HANDLE entry = FindFirstUrlCacheEntry(NULL, info, &len);
    if (entry) {
      do {
        DeleteUrlCacheEntry(info->lpszSourceUrlName);
        len = dwSize / sizeof(TCHAR);
      }
      while(FindNextUrlCacheEntry(entry, info, &len));
    }
    free(info);
  }

  // now delete the undocumented directories and registry keys
  DeleteProfileDirectory(REG_SHELL_FOLDERS, _T("Cookies"));
  DeleteProfileDirectory(REG_SHELL_FOLDERS, _T("History"));
  DeleteProfileDirectory(REG_SHELL_FOLDERS, _T("Cache"));
  DeleteProfileDirectory(REG_SHELL_FOLDERS, _T("Local AppData"), 
                          _T("\\Microsoft\\Silverlight"));
  DeleteProfileDirectory(REG_SHELL_FOLDERS, _T("AppData"), 
                          _T("\\Macromedia\\Flash Player\\#SharedObjects"));
  DeleteProfileDirectory(REG_DOM_STORAGE_KEY, _T("CachePath"));

  // delete the local storage quotas from the registry
  DeleteRegKey(HKEY_CURRENT_USER, REG_DOM_STORAGE_LOW, false);
  DeleteRegKey(HKEY_CURRENT_USER, REG_DOM_STORAGE, false);
}

