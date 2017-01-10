#include "StdAfx.h"
#include "software_update.h"
#include "wpt_status.h"
#include <Shellapi.h>

static const DWORD SOFTWARE_UPDATE_INTERVAL_MINUTES = 60;  // hourly
static const DWORD SOFTWARE_INSTALL_TIMEOUT = 600000;  // 10 minutes
static const TCHAR * SOFTWARE_REG_ROOT = 
                            _T("Software\\WebPagetest\\wptdriver\\Software");

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SoftwareUpdate::SoftwareUpdate(WptStatus &status):
  _status(status) {
  // figure out what our working diriectory is
  TCHAR path[MAX_PATH];
  if( SUCCEEDED(SHGetFolderPath(NULL, CSIDL_APPDATA | CSIDL_FLAG_CREATE,
                                NULL, SHGFP_TYPE_CURRENT, path)) ) {
    PathAppend(path, _T("webpagetest"));
    CreateDirectory(path, NULL);
    lstrcat(path, _T("_data"));
    CreateDirectory(path, NULL);
    lstrcat(path, _T("\\updates"));
    CreateDirectory(path, NULL);
    _directory = path;
    _last_update_check.QuadPart = 0;
  }
  QueryPerformanceFrequency(&_perf_frequency_minutes);
  _perf_frequency_minutes.QuadPart = _perf_frequency_minutes.QuadPart * 60;
  // get the version number to pass along in update checks
  TCHAR file[MAX_PATH];
  if (GetModuleFileName(NULL, file, _countof(file))) {
    DWORD unused;
    DWORD infoSize = GetFileVersionInfoSize(file, &unused);
    if (infoSize) {
      LPBYTE pVersion = new BYTE[infoSize];
      if (GetFileVersionInfo(file, 0, infoSize, pVersion)) {
        VS_FIXEDFILEINFO * info = NULL;
        UINT size = 0;
        if( VerQueryValue(pVersion, _T("\\"), (LPVOID*)&info, &size) && info )
        {
          _version.Format(_T("%d.%d.%d.%d"), HIWORD(info->dwFileVersionMS),
                          LOWORD(info->dwFileVersionMS),
                          HIWORD(info->dwFileVersionLS),
                          LOWORD(info->dwFileVersionLS));
          _build.Format(_T("%d"), LOWORD(info->dwFileVersionLS));
        }
      }

      delete [] pVersion;
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
SoftwareUpdate::~SoftwareUpdate(void) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SoftwareUpdate::LoadSettings(CString settings_ini) {
  TCHAR sections[10000];
  TCHAR buff[1024];
  if (GetPrivateProfileString(_T("WebPagetest"), _T("Software"), NULL, 
        buff, _countof(buff), settings_ini)) {
    _software_url = buff;
  }
  CString program_files_dir;
  TCHAR path[4096];
  if (SUCCEEDED(SHGetFolderPath(NULL, CSIDL_PROGRAM_FILES,
                                NULL, SHGFP_TYPE_CURRENT, path)))
    program_files_dir = path;
  if (GetPrivateProfileSectionNames(sections, _countof(sections), 
      settings_ini)) {
    TCHAR * section = sections;
    while(lstrlen(section)) {
      if (GetPrivateProfileString(section, _T("exe"), NULL, buff, 
          _countof(buff), settings_ini)) {
        BrowserInfo info;
        info._name = section;
        info._exe = buff;
        if (program_files_dir.GetLength())
          info._exe.Replace(_T("%PROGRAM_FILES%"), program_files_dir);
        if (GetPrivateProfileString(section, _T("Installer"), NULL, buff, 
            _countof(buff), settings_ini)) {
          info._installer = buff;
        }
        _browsers.AddTail(info);
      }
      section += lstrlen(section) + 1;
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void SoftwareUpdate::SetSoftwareUrl(CString url) {
  if (url != _software_url) {
    _software_url = url;
    UpdateSoftware(true);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CString SoftwareUpdate::GetUpdateInfo(CString url) {
  CString info, params, buff;
  params = _T("wptdriverVer=") + _version + _T("&wptdriverBuild=") + _build;
  if (_ec2_instance.GetLength())
    params += _T("&ec2instance=") + _ec2_instance;
  if (_ec2_availability_zone.GetLength())
    params += _T("&ec2zone=") + _ec2_availability_zone;
  if (params.GetLength()) {
    if (url.Find(_T("?")) > 0)
      url += _T("&");
    else
      url += _T("?");
    url += params;
  }

  // Try getting the update information directly from a local s3 bucket
  if (_ec2_availability_zone.GetLength() && url.Find(_T("www.webpagetest.org")) >= 0) {
    CString region = _ec2_availability_zone.Left(_ec2_availability_zone.GetLength() - 1);
    CString s3url = url;
    s3url.Replace(_T("www.webpagetest.org"), _T("wpt-") + region + _T(".s3.amazonaws.com"));
    info = HttpGetText(s3url);
  }

  if (info.IsEmpty())
    info = HttpGetText(url);

  return info;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool SoftwareUpdate::UpdateSoftware(bool force) {
  bool ok = true;
  ATLTRACE("[wptdriver] SoftwareUpdate::UpdateSoftware");
  if (force || TimeToCheck()) {
    ok = UpdateBrowsers();
    if (ok && _software_url.GetLength()) {
      CString info = GetUpdateInfo(_software_url);
      if (info.GetLength()) {
        CString app, version, command, url, md5;
        int token_position = 0;
        CString line = info.Tokenize(_T("\r\n"), token_position).Trim();
        while (ok && token_position >= 0) {
          if (line.Left(1) == _T('[')) {
            if (app.GetLength())
              ok = InstallSoftware(app, url, md5, version, command, _T(""));
            app = line.Trim(_T("[] \t"));
            version.Empty();
            command.Empty();
            url.Empty();
            md5.Empty();
          } else if (app.GetLength()) {
            int separator = line.Find(_T('='));
            if (separator > 0) {
              CString tag = line.Left(separator).Trim().MakeLower();
              CString value = line.Mid(separator + 1).Trim();
              if (tag == _T("url"))
                url = value;
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
        if (ok && app.GetLength())
          ok = InstallSoftware(app, url, md5, version, command, _T(""));
      }
    }
    if (ok) {
      QueryPerformanceCounter(&_last_update_check);
    }
  }
  return ok;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool SoftwareUpdate::UpdateBrowsers(void) {
  bool ok = true;
  ATLTRACE("[wptdriver] SoftwareUpdate::UpdateBrowsers");
  POSITION pos = _browsers.GetHeadPosition();
  while (ok && pos) {
    BrowserInfo browser_info = _browsers.GetNext(pos);
    CString url = browser_info._installer.Trim();
    if (url.GetLength()) {
      ATLTRACE(L"[wptdriver] Checking browser - %s", (LPCWSTR)url);
      CString info = GetUpdateInfo(url);
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
          }
          line = info.Tokenize(_T("\r\n"), token_position);
        }

        ok = InstallSoftware(browser, file_url, md5, version, command,
                              browser_info._exe);
      }
    }
  }
  ATLTRACE("[wptdriver] SoftwareUpdate::UpdateBrowsers complete: %s",
            ok ? "Succeeded" : "FAILED!");
  return ok;
}

/*-----------------------------------------------------------------------------
  Download and install the software if necessary
-----------------------------------------------------------------------------*/
bool SoftwareUpdate::InstallSoftware(CString app, CString file_url,CString md5,
          CString version, CString command, CString check_file) {
  bool ok = true;
  bool already_installed = false;

  ATLTRACE(L"[wptdriver] SoftwareUpdate::InstallSoftware - %s",
            (LPCWSTR)app);

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
        already_installed = true;
        if (!version.Compare(buff))
          install = false;
      }

      // download and install it
      if (install) {
        ok = false;
        DeleteDirectory(_directory, false);
        int file_pos = file_url.ReverseFind(_T('/'));
        if (file_pos > 0) {
          CString file_path = _directory + CString(_T("\\")) 
                                + file_url.Mid(file_pos + 1);
          _status.Set(_T("Downloading installer for %s"), (LPCTSTR)app);
          ATLTRACE(L"[wptdriver] Downloading - %s", (LPCWSTR)file_url);
          if (HttpSaveFile(file_url, file_path)) {
            if (md5.GetLength()) {
              CString file_md5 = HashFileMD5(file_path);
              if (file_md5.CompareNoCase(md5)) {
                ATLTRACE(L"[wptdriver] Hash mismatch - %s (expected %s)", (LPCWSTR)file_md5, (LPCWSTR)md5);
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
                lstrcpy(parameters, _T(""));
              }
              shell_info.lpFile = exe;
              TCHAR directory[MAX_PATH];
              lstrcpy(directory, _directory);
              shell_info.lpDirectory = directory;
              shell_info.nShow = SW_SHOWNORMAL;
              _status.Set(_T("Installing %s"), (LPCTSTR)app);
              ATLTRACE(L"[wptdriver] Running '%s' with parameters '%s' in '%s'",
                 exe, parameters, directory);
              if (ShellExecuteEx(&shell_info) && shell_info.hProcess) {
                if (WaitForSingleObject(shell_info.hProcess, 
                      SOFTWARE_INSTALL_TIMEOUT) == WAIT_OBJECT_0) {
                  WaitForChildProcesses(GetProcessId(shell_info.hProcess), SOFTWARE_INSTALL_TIMEOUT);
                  WaitForProcessesByName(exe, SOFTWARE_INSTALL_TIMEOUT);
                  ok = true;

                  // If we are responsible for installing and updating Chrome, disable the Google updater
                  if (!app.CompareNoCase(_T("Chrome"))) {
                    TerminateProcessesByName(_T("GoogleUpdate.exe"));
                    TerminateProcessesByName(_T("GoogleUpdateSetup.exe"));
                    DeleteDirectory(_T("C:\\Program Files (x86)\\Google\\Update"), true);
                  }
                }
                CloseHandle(shell_info.hProcess);
              } else {
                _status.Set(_T("Error installing %s"), (LPCTSTR)app);
                ATLTRACE("[wptdriver] Error Running Installer");
              }
            } else {
              _status.Set(_T("Error downloading installer for %s"),
                          (LPCTSTR)app);
              ATLTRACE("[wptdriver] File download corrupt");
            }
            DeleteFile(file_path);
          }
        }
        if (ok) {
          if (check_file.GetLength())
            ok = FileExists(check_file);
          if (ok)
            RegSetValueEx(key, app, 0, REG_SZ, (const LPBYTE)(LPCTSTR)version, 
                          (version.GetLength() + 1) * sizeof(TCHAR));
        }
      }

      RegCloseKey(key);
    }
  }

  ATLTRACE(L"[wptdriver] SoftwareUpdate::InstallSoftware Complete %s: %s",
           (LPCWSTR)app, ok ? L"Succeeded" : L"FAILED!");

  // don't fail if we already have the package installed and we are just doing
  // an update.
  if (already_installed)
    ok = true;

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

  return should_check;
}

/*-----------------------------------------------------------------------------
  Force a re-install of the given browser
-----------------------------------------------------------------------------*/
bool SoftwareUpdate::ReInstallBrowser(CString browser) {
  HKEY key;
  if (RegCreateKeyEx(HKEY_CURRENT_USER, SOFTWARE_REG_ROOT, 0, 0, 0, 
        KEY_READ | KEY_WRITE, 0, &key, 0) == ERROR_SUCCESS) {
    RegDeleteValue(key, browser);
    RegCloseKey(key);
  }
  return UpdateSoftware(true);
}

/*-----------------------------------------------------------------------------
  See if the exe's for all of the browsers are present
-----------------------------------------------------------------------------*/
bool SoftwareUpdate::CheckBrowsers(CString& missing_browser) {
  bool ok = true;

  POSITION pos = _browsers.GetHeadPosition();
  while (ok && pos) {
    BrowserInfo browser_info = _browsers.GetNext(pos);
    if (!FileExists(browser_info._exe)) {
      ok = false;
      missing_browser = browser_info._name;
    }
  }

  return ok;
}
