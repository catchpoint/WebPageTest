#include "StdAfx.h"
#include "software_update.h"
#include <Shellapi.h>

static const DWORD SOFTWARE_UPDATE_INTERVAL_MINUTES = 60;  // hourly
static const DWORD SOFTWARE_INSTALL_TIMEOUT = 600000;  // 10 minutes
static const TCHAR * SOFTWARE_REG_ROOT = 
                            _T("Software\\WebPagetest\\wptdriver\\Software");

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SoftwareUpdate::SoftwareUpdate(void) {
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
SoftwareUpdate::~SoftwareUpdate(void) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SoftwareUpdate::LoadSettings(CString settings_ini) {
  TCHAR sections[10000];
  TCHAR installer[1024];
  if (GetPrivateProfileString(_T("WebPagetest"), _T("Software"), NULL, 
        installer, _countof(installer), settings_ini)) {
    _software_url = installer;
  }
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
void SoftwareUpdate::UpdateSoftware(void) {
  if (TimeToCheck()) {
    UpdateBrowsers();
    if (_software_url.GetLength()) {
      CString info = HttpGetText(_software_url);
      if (info.GetLength()) {
        CString app, version, command, file_url, md5;
        int token_position = 0;
        CString line = info.Tokenize(_T("\r\n"), token_position).Trim();
        while (token_position >= 0) {
          if (line.Left(1) == _T('[')) {
            if (app.GetLength()) {
              InstallSoftware(app, file_url, md5, version, command);
            }
            app = line.Trim(_T("[] \t"));
            version.Empty();
            command.Empty();
            file_url.Empty();
            md5.Empty();
          } else if (app.GetLength()) {
            int separator = line.Find(_T('='));
            if (separator > 0) {
              CString tag = line.Left(separator).Trim().MakeLower();
              CString value = line.Mid(separator + 1).Trim();
              if (tag == _T("url"))
                file_url = value;
              else if (tag == _T("md5"))
                md5 = value;
              else if (tag == _T("version"))
                version = value;
              else if (tag == _T("command"))
                command = value;
            }
          }
          line = info.Tokenize(_T("\r\n"), token_position).Trim();
        }
        if (app.GetLength()) {
          InstallSoftware(app, file_url, md5, version, command);
        }
      }
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SoftwareUpdate::UpdateBrowsers(void) {
  WptTrace(loglevel::kFunction,
            _T("[wptdriver] SoftwareUpdate::UpdateBrowsers\n"));
  POSITION pos = _browsers.GetHeadPosition();
  while (pos) {
    bool ok = false;
    DWORD update = 1;
    POSITION current_pos = pos;
    CString url = _browsers.GetNext(pos).Trim();
    if (url.GetLength()) {
      CString info = HttpGetText(url);
      if (info.GetLength()) {
        CString browser, version, command, file_url, md5;
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
            else if (tag == _T("md5"))
              md5 = value;
            else if (tag == _T("version"))
              version = value;
            else if (tag == _T("command"))
              command = value;
            else if (tag == _T("update"))
              update = _ttoi(value);
          }
          line = info.Tokenize(_T("\r\n"), token_position);
        }

        ok = InstallSoftware(browser, file_url, md5, version, command);
      }
    }

    // if we don't need to automatically update the browser then 
    // remove it from the list
    if (ok && !update) {
      _browsers.RemoveAt(current_pos);
    }
  }
  WptTrace(loglevel::kFunction,
            _T("[wptdriver] SoftwareUpdate::UpdateBrowsers complete\n"));
}

/*-----------------------------------------------------------------------------
  Download and install the software if necessary
-----------------------------------------------------------------------------*/
bool SoftwareUpdate::InstallSoftware(CString app, CString file_url,CString md5,
                                    CString version, CString command) {
  bool ok = false;

  WptTrace(loglevel::kFunction,
            _T("[wptdriver] SoftwareUpdate::InstallSoftware - %s\n"),
            (LPCTSTR)app);

  if (app.GetLength() && file_url.GetLength() && version.GetLength() &&
      command.GetLength() ) {
    // make sure the version is different from what is currently installed
    HKEY key;
    if (RegCreateKeyEx(HKEY_CURRENT_USER, SOFTWARE_REG_ROOT, 0, 0, 0, 
          KEY_READ | KEY_WRITE, 0, &key, 0) == ERROR_SUCCESS) {
      bool install = true;
      TCHAR buff[1024];
      DWORD len = sizeof(buff);
      if (RegQueryValueEx(key, app, 0, 0, (LPBYTE)buff, &len) 
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
            if (md5.GetLength()) {
              if (HashFileMD5(file_path) != md5) {
                install = false;
              }
            }
            if (install) {
              // run the install command from the download directory
              SHELLEXECUTEINFO shell_info;
              memset(&shell_info, 0, sizeof(shell_info));
              shell_info.cbSize = sizeof(shell_info);
              shell_info.fMask = SEE_MASK_NOCLOSEPROCESS | SEE_MASK_NOASYNC;
              TCHAR exe[MAX_PATH];
              TCHAR parameters[MAX_PATH];
              int separator = command.Find(_T(' '));
              if (separator > 0) {
                lstrcpy(exe, command.Left(separator).Trim());
                lstrcpy(parameters, command.Mid(separator + 1).Trim());
                if (lstrlen(parameters)) {
                  shell_info.lpParameters = parameters;
                }
              } else {
                lstrcpy(exe, command);
                lstrcpy(parameters, _T(''));
              }
              shell_info.lpFile = exe;
              TCHAR directory[MAX_PATH];
              lstrcpy(directory, _directory);
              shell_info.lpDirectory = directory;
              shell_info.nShow = SW_SHOWNORMAL;
              WptTrace(loglevel::kTrace,
                 _T("[wptdriver] Running '%s' with parameters '%s' in '%s'\n"),
                 exe, parameters, directory);
              if (ShellExecuteEx(&shell_info) && shell_info.hProcess) {
                if (WaitForSingleObject(shell_info.hProcess, 
                      SOFTWARE_INSTALL_TIMEOUT) == WAIT_OBJECT_0) {
                  ok = true;
                }
                CloseHandle(shell_info.hProcess);
              } else {
                WptTrace(loglevel::kTrace,
                          _T("[wptdriver] Error Running Installer\n"));
              }
            } else {
              WptTrace(loglevel::kTrace,
                        _T("[wptdriver] File download corrupt\n"));
            }
            DeleteFile(file_path);
          }
        }
        if (ok) {
          RegSetValueEx(key, app, 0, REG_SZ, (const LPBYTE)(LPCTSTR)version, 
                        (version.GetLength() + 1) * sizeof(TCHAR));
        }
      } else {
        ok = true;
      }

      RegCloseKey(key);
    }
  }

  WptTrace(loglevel::kFunction,
            _T("[wptdriver] SoftwareUpdate::InstallSoftware Complete %s\n"),
            (LPCTSTR)app);

  return ok;
}

/*-----------------------------------------------------------------------------
  See if it is time to check for an update
-----------------------------------------------------------------------------*/
bool SoftwareUpdate::TimeToCheck(void) {
  bool should_check = false;
  LARGE_INTEGER now;
  QueryPerformanceCounter(&now);

  if (!_last_update_check.QuadPart || 
    now.QuadPart < _last_update_check.QuadPart) {
    should_check = true;
  } else {
    DWORD elapsed = (DWORD)((now.QuadPart - _last_update_check.QuadPart) 
                      / _perf_frequency_minutes.QuadPart);
    if (elapsed >= SOFTWARE_UPDATE_INTERVAL_MINUTES) {
      should_check = true;
    }
  }

  if (should_check) {
    _last_update_check.QuadPart = now.QuadPart;
  }
  return should_check;
}