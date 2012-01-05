#include "StdAfx.h"
#include "browser_update.h"

static const DWORD BROWSER_UPDATE_INTERVAL_MINUTES = 5;  // hourly
static const DWORD BROWSER_INSTALL_TIMEOUT = 600000;  // 10 minutes
static const TCHAR * BROWSER_REG_ROOT = 
                            _T("Software\\WebPagetest\\wptdriver\\Browsers");

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BrowserUpdate::BrowserUpdate(void) {
  // figure out what our working diriectory is
  TCHAR path[MAX_PATH];
  if( SUCCEEDED(SHGetFolderPath(NULL, CSIDL_APPDATA | CSIDL_FLAG_CREATE,
                                NULL, SHGFP_TYPE_CURRENT, path)) ) {
    PathAppend(path, _T("webpagetest"));
    CreateDirectory(path, NULL);
    lstrcat(path, _T("_data\\updates"));
    CreateDirectory(path, NULL);
    _directory = path;
    _last_update_check.QuadPart = 0;
  }
  QueryPerformanceFrequency(&_perf_frequency_minutes);
  _perf_frequency_minutes.QuadPart = _perf_frequency_minutes.QuadPart * 60;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BrowserUpdate::~BrowserUpdate(void) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void BrowserUpdate::LoadSettings(CString settings_ini) {
  TCHAR sections[10000];
  TCHAR installer[1024];
  if (GetPrivateProfileSectionNames(sections, _countof(sections), 
      settings_ini)) {
    TCHAR * section = sections;
    while(lstrlen(section)) {
      if (GetPrivateProfileString(section, _T("Installer"), NULL, installer, 
          _countof(installer), settings_ini)) {
        _browsers.AddTail(installer);
      }
      section += lstrlen(section) + 1;
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void BrowserUpdate::UpdateBrowsers(void) {
  WptTrace(loglevel::kFunction,
            _T("[wptdriver] BrowserUpdate::UpdateBrowsers\n"));
  if (TimeToCheck()) {
    POSITION pos = _browsers.GetHeadPosition();
    while (pos) {
      bool ok = false;
      DWORD update = 1;
      POSITION current_pos = pos;
      CString url = _browsers.GetNext(pos).Trim();
      if (url.GetLength()) {
        CString info = HttpGetText(url);
        if (info.GetLength()) {
          CString browser, version, command, file_url;
          int token_position = 0;
          CString line = info.Tokenize(_T("\r\n"), token_position);
          while (token_position >= 0) {
            int separator = line.Find(_T('='));
            if (separator > 0) {
              CString tag = line.Left(separator).Trim().MakeLower();
              CString value = line.Mid(separator + 1).Trim();
              if (tag == _T("browser"))
                browser = value;
              else if (tag == _T("url"))
                file_url = value;
              else if (tag == _T("version"))
                version = value;
              else if (tag == _T("command"))
                command = value;
              else if (tag == _T("update"))
                update = _ttoi(value);
            }
            line = info.Tokenize(_T("\r\n"), token_position);
          }

          ok = InstallBrowser(browser, file_url, version, command);
        }
      }

      // if we don't need to automatically update the browser then 
      // remove it from the list
      if (ok && !update) {
        _browsers.RemoveAt(current_pos);
      }
    }
  }
  WptTrace(loglevel::kFunction,
            _T("[wptdriver] BrowserUpdate::UpdateBrowsers complete\n"));
}

/*-----------------------------------------------------------------------------
  Download and install the browser if necessary
-----------------------------------------------------------------------------*/
bool BrowserUpdate::InstallBrowser(CString browser, CString file_url, 
                                    CString version, CString command) {
  bool ok = false;

  WptTrace(loglevel::kFunction,
            _T("[wptdriver] BrowserUpdate::InstallBrowser - %s\n"),
            (LPCTSTR)browser);

  // make sure the version is different from what is currently installed
  HKEY key;
  if (RegCreateKeyEx(HKEY_CURRENT_USER, BROWSER_REG_ROOT, 0, 0, 0, 
        KEY_READ | KEY_WRITE, 0, &key, 0) == ERROR_SUCCESS) {
    bool install = true;
    TCHAR buff[1024];
    DWORD len = sizeof(buff);
    if (RegQueryValueEx(key, browser, 0, 0, (LPBYTE)buff, &len) 
        == ERROR_SUCCESS) {
      if (!version.Compare(buff)) {
        install = false;
      }
    }

    // download and install it
    if (install) {
      DeleteDirectory(_directory, false);
      int file_pos = file_url.ReverseFind(_T('/'));
      if (file_pos > 0) {
        CString file_path = _directory + CString(_T("\\")) 
                              + file_url.Mid(file_pos + 1);
        WptTrace(loglevel::kTrace,
                  _T("[wptdriver] Downloading - %s\n"), (LPCTSTR)file_url);
        if (HttpSaveFile(file_url, file_path)) {
          // run the install command from the download directory
          PROCESS_INFORMATION pi;
          STARTUPINFO si;
          memset( &si, 0, sizeof(si) );
          si.cb = sizeof(si);
          if (CreateProcess(NULL, (LPTSTR)(LPCTSTR)command, 0, 0, FALSE, 
                            NORMAL_PRIORITY_CLASS , 0, _directory, &si, &pi)) {
            if (WaitForSingleObject(pi.hProcess, BROWSER_INSTALL_TIMEOUT) 
                  == WAIT_OBJECT_0) {
              ok = true;
            }
            CloseHandle(pi.hThread);
            CloseHandle(pi.hProcess);
          }
          DeleteFile(file_path);
        }
      }
      if (ok) {
        RegSetValueEx(key, browser, 0, REG_SZ, (const LPBYTE)(LPCTSTR)version, 
                      (version.GetLength() + 1) * sizeof(TCHAR));
      }
    } else {
      ok = true;
    }

    RegCloseKey(key);
  }

  WptTrace(loglevel::kFunction,
            _T("[wptdriver] BrowserUpdate::InstallBrowser Complete %s\n"),
            (LPCTSTR)browser);

  return ok;
}

/*-----------------------------------------------------------------------------
  See if it is time to check for an update
-----------------------------------------------------------------------------*/
bool BrowserUpdate::TimeToCheck(void) {
  bool should_check = false;
  LARGE_INTEGER now;
  QueryPerformanceCounter(&now);

  if (!_last_update_check.QuadPart || 
    now.QuadPart < _last_update_check.QuadPart) {
    should_check = true;
  } else {
    DWORD elapsed = (DWORD)((now.QuadPart - _last_update_check.QuadPart) 
                      / _perf_frequency_minutes.QuadPart);
    if (elapsed >= BROWSER_UPDATE_INTERVAL_MINUTES) {
      should_check = true;
    }
  }

  if (should_check) {
    _last_update_check.QuadPart = now.QuadPart;
  }
  return should_check;
}