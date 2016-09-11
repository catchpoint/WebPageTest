/******************************************************************************
Copyright (c) 2010, Google Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without 
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, 
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of the <ORGANIZATION> nor the names of its contributors 
    may be used to endorse or promote products derived from this software 
    without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE 
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL 
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER 
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, 
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
******************************************************************************/

#include "StdAfx.h"
#include "util.h"
#include <Wincrypt.h>
#include <TlHelp32.h>
#include <Wtsapi32.h>
#include <WinInet.h>
#include <regex>
#include <string>
#include <sstream>

static const TCHAR * DOCUMENT_WINDOW_CLASSES[] = {
  _T("Internet Explorer_Server"),
  _T("Chrome_RenderWidgetHostHWND"),
  _T("Chrome_WidgetWin_1"),
  _T("MozillaWindowClass"),
  _T("WebKit2WebViewWindowClass")
};

/*-----------------------------------------------------------------------------
  Launch the provided process and wait for it to finish 
  (unless process_handle is provided in which case it will return immediately)
-----------------------------------------------------------------------------*/
bool LaunchProcess(CString command_line, HANDLE * process_handle,
                   const TCHAR * dir){
  bool ret = false;

  if (command_line.GetLength()) {
    PROCESS_INFORMATION pi;
    STARTUPINFO si;
    memset( &si, 0, sizeof(si) );
    si.cb = sizeof(si);
    si.dwFlags = STARTF_USESHOWWINDOW;
    si.wShowWindow = SW_HIDE;
    if (CreateProcess(NULL, (LPTSTR)(LPCTSTR)command_line, 0, 0, FALSE, 
                      NORMAL_PRIORITY_CLASS , 0, dir, &si, &pi)) {
      if (process_handle) {
        *process_handle = pi.hProcess;
        ret = true;
        CloseHandle(pi.hThread);
      } else {
        WaitForSingleObject(pi.hProcess, 60 * 60 * 1000);
        DWORD code;
        if( GetExitCodeProcess(pi.hProcess, &code) && code == 0 )
          ret = true;
        CloseHandle(pi.hThread);
        CloseHandle(pi.hProcess);
      }
    }
  } else
    ret = true;

  return ret;
}

/*-----------------------------------------------------------------------------
  recursively delete the given directory
-----------------------------------------------------------------------------*/
void DeleteDirectory( LPCTSTR directory, bool remove ) {
  if (lstrlen(directory)) {
    // allocate off of the heap so we don't blow the stack
    TCHAR * path = new TCHAR[MAX_PATH];	
    lstrcpy( path, directory );
    PathAppend( path, _T("*.*") );

    WIN32_FIND_DATA fd;
    HANDLE hFind = FindFirstFile(path, &fd);
    if (hFind != INVALID_HANDLE_VALUE) {
      do {
        if (lstrcmp(fd.cFileName, _T(".")) && lstrcmp(fd.cFileName,_T(".."))) {
          lstrcpy( path, directory );
          PathAppend( path, fd.cFileName );
          if( fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY )
            DeleteDirectory(path, true);
          else
            DeleteFile(path);
        }
      } while(FindNextFile(hFind, &fd));
      
      FindClose(hFind);
    }
    
    delete [] path;
    if( remove )
      RemoveDirectory(directory);
  }
}


/*-----------------------------------------------------------------------------
  Delete anything in the given directory older than the provided age
-----------------------------------------------------------------------------*/
void DeleteOldDirectoryEntries(CString directory, int seconds) {
  WIN32_FIND_DATA fd;
  HANDLE hFind = FindFirstFile(directory + _T("\\*.*"), &fd);
  if (hFind != INVALID_HANDLE_VALUE) {
    FILETIME now;
    GetSystemTimeAsFileTime(&now);
    do {
      if (lstrcmp(fd.cFileName, _T(".")) &&
          lstrcmp(fd.cFileName, _T("..")) &&
          ElapsedFileTimeSeconds(fd.ftLastWriteTime, now) > seconds) {
        if (fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY)
          DeleteDirectory(directory + _T("\\") + fd.cFileName);
        else
          DeleteFile(directory + _T("\\") + fd.cFileName);
      }
    } while (FindNextFile(hFind, &fd));
    FindClose(hFind);
  }
}

/*-----------------------------------------------------------------------------
  recursively copy a directory and it's files
-----------------------------------------------------------------------------*/
void CopyDirectoryTree(CString source, CString destination) {
  if (source.GetLength() && destination.GetLength()) {
    WIN32_FIND_DATA fd;
    HANDLE hFind = FindFirstFile(source + _T("\\*.*"), &fd);
    if (hFind != INVALID_HANDLE_VALUE) {
      SHCreateDirectoryEx(NULL, destination, NULL);
      do {
        if (lstrcmp(fd.cFileName, _T(".")) && lstrcmp(fd.cFileName,_T(".."))) {
          CString src = source + CString(_T("\\")) + fd.cFileName;
          CString dest = destination + CString(_T("\\")) + fd.cFileName;
          if( fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY ) {
            CopyDirectoryTree(src, dest);
          } else {
            CopyFile(src, dest, FALSE);
            SetFileAttributes(dest, FILE_ATTRIBUTE_NORMAL);
          }
        }
      }while(FindNextFile(hFind, &fd));
      FindClose(hFind);
    }
  }
}

/*-----------------------------------------------------------------------------
  Recursively delete the given reg key
-----------------------------------------------------------------------------*/
void DeleteRegKey(HKEY hParent, LPCTSTR key, bool remove) {
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
  Recursively check to see if the given window has a child that is also a
  browser document.
-----------------------------------------------------------------------------*/
static bool HasVisibleChildDocument(HWND parent) {
  bool has_child_document = false;
  HWND wnd = ::GetWindow(parent, GW_CHILD);
  while (wnd && !has_child_document) {
    if (IsWindowVisible(wnd)) {
      if (IsBrowserDocument(wnd, false))
        has_child_document = true;
      else
        has_child_document = HasVisibleChildDocument(wnd);
    }
    wnd = ::GetNextWindow(wnd , GW_HWNDNEXT);
  }
  return has_child_document;
}

/*-----------------------------------------------------------------------------
  See if the given window is a browser document window.
  A browser document window is detected as:
  - Having a window class of a known type
  - Not having any visible child windows of the same type
-----------------------------------------------------------------------------*/
bool IsBrowserDocument(HWND wnd, bool recurse) {
  bool is_document = false;
  TCHAR class_name[100];
  if (GetClassName(wnd, class_name, _countof(class_name))) {
    for (int i = 0;
         i < _countof(DOCUMENT_WINDOW_CLASSES) && !is_document;
         i++) {
      if (!lstrcmp(class_name, DOCUMENT_WINDOW_CLASSES[i])) {
        if (!recurse || !HasVisibleChildDocument(wnd)) {
          is_document = true;
        }
      }
    }
  }
  return is_document;
}

/*-----------------------------------------------------------------------------
  Recursively find the highest visible window for the given process
-----------------------------------------------------------------------------*/
static HWND FindDocumentWindow(DWORD process_id, HWND parent) {
  HWND document_window = NULL;
  HWND wnd = ::GetWindow(parent, GW_CHILD);
  while (wnd && !document_window) {
    if (IsWindowVisible(wnd)) {
      DWORD pid;
      GetWindowThreadProcessId(wnd, &pid);
      if (pid == process_id && IsBrowserDocument(wnd))
        document_window = wnd;
      else
        document_window = FindDocumentWindow(process_id, wnd);
    }
    wnd = ::GetNextWindow(wnd , GW_HWNDNEXT);
  }
  return document_window;
}

/*-----------------------------------------------------------------------------
  Find the top-level and document windows for the browser
-----------------------------------------------------------------------------*/
bool FindBrowserWindow( DWORD process_id, HWND& frame_window) {
  bool found = false;
  // find a known document window that belongs to this process
  HWND document_window = FindDocumentWindow(process_id, ::GetDesktopWindow());
  if (document_window) {
    found = true;
    frame_window = GetAncestor(document_window, GA_ROOTOWNER);
  }
  return found;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptTrace(int level, LPCTSTR format, ...) {
  #ifdef DEBUG
  va_list args;
  va_start( args, format );

  int len = _vsctprintf( format, args ) + 1;
  if (len) {
    TCHAR * msg = (TCHAR *)malloc( len * sizeof(TCHAR) );
    if (msg) {
      if (_vstprintf_s( msg, len, format, args ) > 0) {
        if (lstrlen(msg)) {
          OutputDebugString(msg);
        }
      }

      free( msg );
    }
  }
  #endif
}

/*-----------------------------------------------------------------------------
  Generate a md5 hash of the provided file
-----------------------------------------------------------------------------*/
bool HashFile(LPCTSTR file, CString& hash) {
  bool ret = false;

  HCRYPTPROV crypto = 0;
  if (CryptAcquireContext(&crypto, NULL, NULL, PROV_RSA_FULL, 
                          CRYPT_VERIFYCONTEXT)) {
    HCRYPTHASH crypto_hash = 0;
    if (CryptCreateHash(crypto, CALG_MD5, 0, 0, &crypto_hash)) {
      HANDLE file_handle = CreateFile( file, GENERIC_READ, FILE_SHARE_READ, 0, 
                                OPEN_EXISTING, 0, 0);
      if (file != INVALID_HANDLE_VALUE) {
        ret = true;
        BYTE buff[4096];
        DWORD bytes = 0;
        while (ReadFile(file_handle, buff, sizeof(buff), &bytes, 0) && bytes)
          if (!CryptHashData(crypto_hash, buff, bytes, 0))
            ret = false;

        if (ret) {
          BYTE h[16];
          TCHAR file_hash[100];
          DWORD len = 16;
          if (CryptGetHashParam(crypto_hash, HP_HASHVAL, 
                                h, &len, 0)) {
            wsprintf(file_hash, _T("%02X%02X%02X%02X%02X%02X%02X%02X")
                      _T("%02X%02X%02X%02X%02X%02X%02X%02X"),
                h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 
                h[8], h[9], h[10], h[11], h[12], h[13], h[14], h[15]);
            hash = file_hash;
          } else
            ret = false;
        }

        CloseHandle(file_handle);
      }
      CryptDestroyHash(crypto_hash);
    }
    CryptReleaseContext(crypto,0);
  }

  return ret;
}

/*-----------------------------------------------------------------------------
  Data for saving debug symbols files and function offsets.
-----------------------------------------------------------------------------*/
CString CreateAppDataDir() {
  CString app_data_dir;
  TCHAR dir[MAX_PATH];
  if (SUCCEEDED(SHGetFolderPath(NULL, CSIDL_APPDATA | CSIDL_FLAG_CREATE,
                                NULL, SHGFP_TYPE_CURRENT, dir))) {
    PathAppend(dir, _T("webpagetest_data"));
    CreateDirectory(dir, NULL);
    app_data_dir = dir;
  }
  return app_data_dir;
}

/*-----------------------------------------------------------------------------
  Get the module entry for a given process.
-----------------------------------------------------------------------------*/
bool GetModuleByName(HANDLE process, LPCTSTR module_name,
                     MODULEENTRY32 * module) {
  bool is_found = false;
  HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE,
      GetProcessId(process));
  if (snap != INVALID_HANDLE_VALUE) {
    module->dwSize = sizeof(*module);
    if (Module32First(snap, module)) {
      do {
        is_found = !lstrcmpi(module->szModule, module_name);
      } while (!is_found && Module32Next(snap, module));
    }
    CloseHandle(snap);
  }
  return is_found;
}

/*-----------------------------------------------------------------------------
  Recursively terminate the given process and all of it's child processes
-----------------------------------------------------------------------------*/
void TerminateProcessAndChildren(DWORD pid) {
  if (pid) {
    // terminate any child processes
    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snap != INVALID_HANDLE_VALUE) {
      PROCESSENTRY32 proc;
      proc.dwSize = sizeof(proc);
      if (Process32First(snap, &proc)) {
        do {
          if (proc.th32ParentProcessID == pid) {
            TerminateProcessAndChildren(proc.th32ProcessID);
          }
        } while (Process32Next(snap, &proc));
      }
      CloseHandle(snap);
    }
    // terminate the target process
    HANDLE process = OpenProcess( PROCESS_TERMINATE | SYNCHRONIZE,
                                  FALSE, pid);
    if (process) {
      TerminateProcess(process, 0);
      WaitForSingleObject(process, 120000);
      CloseHandle(process);
    }
  }
}

/*-----------------------------------------------------------------------------
  Fetch an URL and return the response as a string
-----------------------------------------------------------------------------*/
CString HttpGetText(CString url) {
  CString response;
  HINTERNET internet = InternetOpen(_T("WebPagetest Driver"), 
                                    INTERNET_OPEN_TYPE_PRECONFIG,
                                    NULL, NULL, 0);
  if (internet) {
    DWORD timeout = 300000;
    InternetSetOption(internet, INTERNET_OPTION_CONNECT_TIMEOUT, 
                      &timeout, sizeof(timeout));
    InternetSetOption(internet, INTERNET_OPTION_RECEIVE_TIMEOUT, 
                      &timeout, sizeof(timeout));
    InternetSetOption(internet, INTERNET_OPTION_SEND_TIMEOUT, 
                      &timeout, sizeof(timeout));
    HINTERNET http_request = InternetOpenUrl(internet, url, NULL, 0, 
                                INTERNET_FLAG_NO_CACHE_WRITE | 
                                INTERNET_FLAG_NO_UI | 
                                INTERNET_FLAG_PRAGMA_NOCACHE | 
                                INTERNET_FLAG_RELOAD, NULL);
    if (http_request) {
      char buff[4097];
      DWORD bytes_read;
      while (InternetReadFile(http_request, buff, sizeof(buff) - 1, 
              &bytes_read) && bytes_read) {
        buff[bytes_read] = 0;
        response += CA2T(buff, CP_UTF8);
      }
      InternetCloseHandle(http_request);
    }
    InternetCloseHandle(internet);
  }

  return response;
}

/*-----------------------------------------------------------------------------
  Fetch an URL and save it to a file (returning the length of the file)
-----------------------------------------------------------------------------*/
DWORD HttpSaveFile(CString url, CString file) {
  DWORD len = 0;

  TCHAR directory[MAX_PATH];
  lstrcpy(directory, file);
  *PathFindFileName(directory) = NULL;
  if (lstrlen(directory) > 3) {
    SHCreateDirectoryEx(NULL, directory, NULL);
  }

  HINTERNET internet = InternetOpen(_T("WebPagetest Driver"), 
                                    INTERNET_OPEN_TYPE_PRECONFIG,
                                    NULL, NULL, 0);
  if (internet) {
    DWORD timeout = 300000;
    DWORD fetch_timeout = 360000;
    InternetSetOption(internet, INTERNET_OPTION_CONNECT_TIMEOUT, 
                      &timeout, sizeof(timeout));
    InternetSetOption(internet, INTERNET_OPTION_RECEIVE_TIMEOUT, 
                      &fetch_timeout, sizeof(fetch_timeout));
    InternetSetOption(internet, INTERNET_OPTION_SEND_TIMEOUT, 
                      &timeout, sizeof(timeout));
    HINTERNET http_request = InternetOpenUrl(internet, url, NULL, 0, 
                                INTERNET_FLAG_NO_CACHE_WRITE | 
                                INTERNET_FLAG_NO_UI | 
                                INTERNET_FLAG_PRAGMA_NOCACHE | 
                                INTERNET_FLAG_RELOAD, NULL);
    if (http_request) {
      char buff[4097];
      DWORD bytes_read, bytes_written;
      HANDLE file_handle = CreateFile(file,GENERIC_WRITE,0,0,
                                      CREATE_ALWAYS,0,NULL);
      if (file_handle != INVALID_HANDLE_VALUE) {
        while (InternetReadFile(http_request, buff, sizeof(buff) - 1, 
                &bytes_read) && bytes_read) {
          WriteFile(file_handle, buff, bytes_read, &bytes_written, 0);
          len += bytes_read;
        }
        CloseHandle(file_handle);
      } 
      InternetCloseHandle(http_request);
    } 
    InternetCloseHandle(internet);
  } 
  return len;
}

/*-----------------------------------------------------------------------------
  Generate a MD5 hash of the given file
-----------------------------------------------------------------------------*/
CString HashFileMD5(CString file) {
  CString hash_result;
  HCRYPTPROV crypto = 0;
  if (CryptAcquireContext(&crypto, NULL, NULL, PROV_RSA_FULL, 
      CRYPT_VERIFYCONTEXT)) {
    TCHAR file_hash[100];
    BYTE buff[4096];
    DWORD bytes = 0;
    HCRYPTHASH crypto_hash = 0;
    if (CryptCreateHash(crypto, CALG_MD5, 0, 0, &crypto_hash)) {
      HANDLE file_handle = CreateFile( file, GENERIC_READ, FILE_SHARE_READ, 
                                        0, OPEN_EXISTING, 0, 0);
      if (file_handle != INVALID_HANDLE_VALUE) {
        bool ok = true;
        while (ReadFile(file_handle, buff, sizeof(buff), &bytes, 0) && bytes) {
          if (!CryptHashData(crypto_hash, buff, bytes, 0)) {
            ok = false;
          }
        }
        if (ok) {
          BYTE hash[16];
          DWORD len = 16;
          if (CryptGetHashParam(crypto_hash, HP_HASHVAL, hash, &len, 0)) {
            wsprintf(file_hash, _T("%02X%02X%02X%02X%02X%02X%02X%02X")
                                _T("%02X%02X%02X%02X%02X%02X%02X%02X"),
                        hash[0], hash[1], hash[2], hash[3], hash[4], hash[5], 
                        hash[6], hash[7], hash[8], hash[9], hash[10], hash[11],
                        hash[12], hash[13], hash[14], hash[15]);
            hash_result = file_hash;
          }
        }
        CloseHandle(file_handle);
      }
      CryptDestroyHash(crypto_hash);
    }
    CryptReleaseContext(crypto,0);
  }
  return hash_result;
}

/*-----------------------------------------------------------------------------
  See if the given file exists
-----------------------------------------------------------------------------*/
bool FileExists(CString file) {
  bool ret = false;
  if (GetFileAttributes(file) != INVALID_FILE_ATTRIBUTES)
    ret = true;
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool  RegexMatch(CStringA str, CStringA regex) {
  bool matched = false;

  if (str.GetLength()) {
    if (!regex.GetLength() || 
        !regex.Compare("*") || 
        !str.CompareNoCase(regex)) {
      matched = true;
    } else if (regex.GetLength()) {
        std::tr1::regex match_regex(regex, 
                std::tr1::regex_constants::icase | 
                std::tr1::regex_constants::ECMAScript);
        matched = std::tr1::regex_match((LPCSTR)str, match_regex);
    }
  }

  return matched;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CStringA JSONEscapeA(CStringA src) {
  src.Replace("\\", "\\\\");
  src.Replace("\"", "\\\"");
  src.Replace("/", "\\/");
  src.Replace("\b", "\\b");
  src.Replace("\r", "\\r");
  src.Replace("\n", "\\n");
  src.Replace("\t", "\\t");
  src.Replace("\f", "\\f");
  return src;
}

/*-----------------------------------------------------------------------------
  Escape the supplied string for JSON
-----------------------------------------------------------------------------*/
CStringA JSONEscape(CString src) {
  return JSONEscapeA((LPCSTR)CT2A(src, CP_UTF8));
}

/*-----------------------------------------------------------------------------
  Get the process ID of the parent for the supplied process
-----------------------------------------------------------------------------*/
DWORD GetParentProcessId(DWORD pid) {
  DWORD parent_pid = pid;
  HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
  if (snap != INVALID_HANDLE_VALUE) {
    PROCESSENTRY32 proc;
    proc.dwSize = sizeof(proc);
    if (Process32First(snap, &proc)) {
      bool found = false;
      do {
        if (proc.th32ProcessID == pid) {
          found = true;
          parent_pid = proc.th32ParentProcessID;
        }
      } while (!found && Process32Next(snap, &proc));
    }
    CloseHandle(snap);
  }
  return parent_pid;
}

/*-----------------------------------------------------------------------------
  Build a list of process ID's for the given exe name
-----------------------------------------------------------------------------*/
DWORD FindProcessIds(TCHAR * exe, CAtlList<DWORD> &pids) {
  DWORD count = 0;
  WTS_PROCESS_INFO * proc = NULL;
  DWORD process_count = 0;
  if (WTSEnumerateProcesses(WTS_CURRENT_SERVER_HANDLE, 0, 1, &proc, &process_count)) {
    for (DWORD i = 0; i < process_count; i++) {
      TCHAR * process = PathFindFileName(proc[i].pProcessName);
      if (!lstrcmpi(process, exe)) {
        count++;
        pids.AddTail(proc[i].ProcessId);
      }
    }
    if (proc)
      WTSFreeMemory(proc);
  }
  return count;
}

/*-----------------------------------------------------------------------------
  Terminate a process given it's process ID
-----------------------------------------------------------------------------*/
void TerminateProcessById(DWORD pid) {
  // terminate the target process
  HANDLE process = OpenProcess( PROCESS_TERMINATE | SYNCHRONIZE, FALSE, pid);
  if (process) {
    TerminateProcess(process, 0);
    WaitForSingleObject(process, 120000);
    CloseHandle(process);
  }
}

/*-----------------------------------------------------------------------------
  Wait for all direct children of the given process to finish
-----------------------------------------------------------------------------*/
void WaitForChildProcesses(DWORD pid, DWORD timeout) {
  bool children_found = false;
  DWORD end_time = GetTickCount() + timeout;
  do {
    children_found = false;
    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snap != INVALID_HANDLE_VALUE) {
      PROCESSENTRY32 proc;
      proc.dwSize = sizeof(proc);
      if (Process32First(snap, &proc)) {
        do {
          if (proc.th32ParentProcessID == pid) {
            children_found = true;
            HANDLE process = OpenProcess(SYNCHRONIZE, FALSE, proc.th32ProcessID);
            if (process) {
              WaitForSingleObject(process, timeout);
              CloseHandle(process);
            }
          }
        } while (Process32Next(snap, &proc));
      }
      CloseHandle(snap);
    }
  } while(children_found && GetTickCount() < end_time);
}

/*-----------------------------------------------------------------------------
  Wait for all instances of the given executable to finish
-----------------------------------------------------------------------------*/
void WaitForProcessesByName(TCHAR * exe, DWORD timeout) {
  bool processes_found = false;
  DWORD end_time = GetTickCount() + timeout;
  do {
    processes_found = false;
    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snap != INVALID_HANDLE_VALUE) {
      PROCESSENTRY32 proc;
      proc.dwSize = sizeof(proc);
      if (Process32First(snap, &proc)) {
        do {
          if (!lstrcmpi(proc.szExeFile, exe)) {
            processes_found = true;
            HANDLE process = OpenProcess(SYNCHRONIZE, FALSE, proc.th32ProcessID);
            if (process) {
              WaitForSingleObject(process, timeout);
              CloseHandle(process);
            }
          }
        } while (Process32Next(snap, &proc));
      }
      CloseHandle(snap);
    }
  } while(processes_found && GetTickCount() < end_time);
}

/*-----------------------------------------------------------------------------
  Terminate all instances of a process given it's name
-----------------------------------------------------------------------------*/
void TerminateProcessesByName(TCHAR * exe) {
  CAtlList<DWORD> processes;
  FindProcessIds(exe, processes);
  if (!processes.IsEmpty()) {
    POSITION pos = processes.GetHeadPosition();
    while (pos) {
      DWORD pid = processes.GetNext(pos);
      TerminateProcessById(pid);
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void QueryPerfCounter(__int64 &counter) {
  LARGE_INTEGER counter_struct;
  counter_struct.QuadPart = 0;
  QueryPerformanceCounter(&counter_struct);
  counter = counter_struct.QuadPart;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void QueryPerfFrequency(__int64 &freq) {
  LARGE_INTEGER freq_struct;
  freq_struct.QuadPart = 0;
  QueryPerformanceFrequency(&freq_struct);
  freq = freq_struct.QuadPart;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int ElapsedFileTimeSeconds(FILETIME& check, FILETIME& now) {
  int elapsed = -1;
  ULARGE_INTEGER c, n, e;
  c.HighPart = check.dwHighDateTime;
  c.LowPart = check.dwLowDateTime;
  n.HighPart = now.dwHighDateTime;
  n.LowPart = now.dwLowDateTime;
  if (n.QuadPart > c.QuadPart) {
    e.QuadPart = (n.QuadPart - c.QuadPart) / 10000000;
    elapsed = (int)e.QuadPart;
  }
  return elapsed;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Reboot() {
  HANDLE hToken;
  if (OpenProcessToken(GetCurrentProcess(),
      TOKEN_ADJUST_PRIVILEGES | TOKEN_QUERY, &hToken)) {
    TOKEN_PRIVILEGES tp;
    if (LookupPrivilegeValue(NULL, SE_SHUTDOWN_NAME, &tp.Privileges[0].Luid)) {
      tp.PrivilegeCount = 1;
      tp.Privileges[0].Attributes = SE_PRIVILEGE_ENABLED;
      AdjustTokenPrivileges(hToken, FALSE, &tp, 0, (PTOKEN_PRIVILEGES)0, 0) ;
    }
    CloseHandle(hToken);
  }
  
  InitiateSystemShutdown(NULL, NULL, 0, TRUE, TRUE);
}

/*-----------------------------------------------------------------------------
  Helper function to crack an url into it's component parts
-----------------------------------------------------------------------------*/
bool ParseUrl(CString url, CString &scheme, CString &host,
              unsigned short &port, CString& object){
  bool ret = false;

  URL_COMPONENTS parts;
  memset(&parts, 0, sizeof(parts));
  TCHAR szHost[10000];
  TCHAR path[10000];
  TCHAR extra[10000];
  TCHAR szScheme[100];
    
  memset(szHost, 0, sizeof(szHost));
  memset(path, 0, sizeof(path));
  memset(extra, 0, sizeof(extra));
  memset(szScheme, 0, sizeof(szScheme));

  parts.lpszHostName = szHost;
  parts.dwHostNameLength = _countof(szHost);
  parts.lpszUrlPath = path;
  parts.dwUrlPathLength = _countof(path);
  parts.lpszExtraInfo = extra;
  parts.dwExtraInfoLength = _countof(extra);
  parts.lpszScheme = szScheme;
  parts.dwSchemeLength = _countof(szScheme);
  parts.dwStructSize = sizeof(parts);

  if( InternetCrackUrl((LPCTSTR)url, url.GetLength(), 0, &parts) ){
    ret = true;
    scheme = szScheme;
    host = szHost;
    port = parts.nPort;
    object = path;
    object += extra;
    if (!port) {
      port = !lstrcmpi(scheme, _T("https")) ?
          INTERNET_DEFAULT_HTTPS_PORT : INTERNET_DEFAULT_HTTP_PORT;
    }
  }
  return ret;
}

/*-----------------------------------------------------------------------------
  See if we can sniff the real content type by looking for a file signature
  https://mimesniff.spec.whatwg.org/#matching-an-image-type-pattern
-----------------------------------------------------------------------------*/
CString SniffMimeType(const LPBYTE content, size_t len) {
  CString mime_type;
  if (len && content) {
    LPBYTE b = content;

    // Image Types
    if (len > 4 &&
        b[0] == 0x00 && b[1] == 0x00 && b[2] == 0x01 && b[3] == 0x00) {
      mime_type = _T("image/x-icon"); // Windows Icon
    } else if (len > 4 &&
        b[0] == 0x00 && b[1] == 0x00 && b[2] == 0x02 && b[3] == 0x00) {
      mime_type = _T("image/x-icon"); // Windows Cursor
    } else if (len > 6 && !memcmp(b, "GIF87a", 6)) {
      mime_type = _T("image/gif");
    } else if (len > 14 &&
        !memcmp(b, "RIFF", 4) && !memcmp(&b[8], "WEBPVP", 6)) {
      mime_type = _T("image/webp");
    } else if (len > 8 &&
        b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47 &&
        b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) {
      mime_type = _T("image/png");
    } else if (len > 3 &&
        b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF) {
      mime_type = _T("image/jpeg");
    // Video/Audio types
    } else if (len > 4 &&
        b[0] == 0x1A && b[1] == 0x45 && b[2] == 0xDF && b[3] == 0xA3) {
      mime_type = _T("video/webm");
    } else if (len > 4 && !memcmp(b, ".snd", 4)) {
      mime_type = _T("audio/basic");
    } else if (len > 12 &&
        !memcmp(b, "FORM", 4) && !memcmp(&b[8], "AIFF", 4)) {
      mime_type = _T("audio/aiff");
    } else if (len > 3 && !memcmp(b, "ID3", 4)) {
      mime_type = _T("audio/mpeg");
    } else if (len > 5 && !memcmp(b, "OggS", 5)) {
      mime_type = _T("application/ogg");
    } else if (len > 8 &&
        b[0] == 0x4D && b[1] == 0x54 && b[2] == 0x68 && b[3] == 0x64 &&
        b[4] == 0x00 && b[5] == 0x00 && b[6] == 0x00 && b[7] == 0x06) {
      mime_type = _T("audio/midi");
    } else if (len > 12 &&
        !memcmp(b, "RIFF", 4) && !memcmp(&b[8], "AVI ", 4)) {
      mime_type = _T("video/avi");
    } else if (len > 12 &&
        !memcmp(b, "RIFF", 4) && !memcmp(&b[8], "WAVE", 4)) {
      mime_type = _T("audio/wave");
    // Fonts
    } else if (len > 4 &&
        b[0] == 0x00 && b[1] == 0x01 && b[2] == 0x00 && b[3] == 0x00) {
      mime_type = _T("application/x-font-truetype");
    } else if (len > 4 && !memcmp(b, "OTTO", 4)) {
      mime_type = _T("application/x-font-opentype");
    } else if (len > 4 && !memcmp(b, "ttcf", 4)) {
      mime_type = _T("application/x-font-truetype");
    } else if (len > 4 && !memcmp(b, "wOFF", 4)) {
      mime_type = _T("application/font-woff");
    // Compressed file formats
    } else if (len > 3 &&
        b[0] == 0x1F && b[1] == 0x8B && b[2] == 0x08) {
      mime_type = _T("application/x-gzip");
    } else if (len > 4 &&
        b[0] == 0x50 && b[1] == 0x4B && b[2] == 0x03 && b[3] == 0x04) {
      mime_type = _T("application/zip");
    } else if (len > 7 &&
        b[0] == 0x52 && b[1] == 0x61 && b[2] == 0x72 && b[3] == 0x20 &&
        b[4] == 0x1A && b[5] == 0x07 && b[6] == 0x00) {
      mime_type = _T("application/x-rar-compressed");
    // Misc
    } else if (len > 5 && !memcmp(b, "%PDF-", 5)) {
      mime_type = _T("application/pdf");
    } else if (len > 11 && !memcmp(b, "%!PS-Adobe-", 11)) {
      mime_type = _T("application/postscript");
    }
  }

  return mime_type;
}

/*-----------------------------------------------------------------------------
  Scan the content to see if it is a binary content type
  https://mimesniff.spec.whatwg.org/#sniffing-a-mislabeled-binary-resource
-----------------------------------------------------------------------------*/
bool IsBinaryContent(const LPBYTE content, size_t len) {
  bool is_binary = false;

  if (content) {
    if (len >= 2 &&
        (content[0] == 0xFE && content[1] == 0xFF) ||
        (content[0] == 0xFF && content[1] == 0xFE)) {
      // UTF 16 BOM
      is_binary = false;
    } else if (len >= 3 && content[0] == 0xEF &&
               content[1] == 0xBB && content[2] == 0xBF) {
      // UTF 8 BOM
      is_binary = false;
    } else if (len > 0) {
      DWORD index = 0;
      while (index < len && !is_binary) {
        BYTE val = content[index];
        if (val <= 0x08 || 
            val == 0x0B ||
            (val >= 0x0E && val <= 0x1A) ||
            (val >= 0x1C && val <= 0x1F)) {
          is_binary = true;
        }
        index++;
      }
    }
  }

  return is_binary;
}