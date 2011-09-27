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

#include "stdafx.h"
#include "../wpthook/wpthook_dll.h"
#include <Wincrypt.h>

/*-----------------------------------------------------------------------------
  Launch the provided process and wait for it to finish 
  (unless process_handle is provided in which case it will return immediately)
-----------------------------------------------------------------------------*/
bool LaunchProcess(CString command_line, HANDLE * process_handle){
  bool ret = false;

  if (command_line.GetLength()) {
    PROCESS_INFORMATION pi;
    STARTUPINFO si;
    memset( &si, 0, sizeof(si) );
    si.cb = sizeof(si);
    si.dwFlags = STARTF_USESHOWWINDOW;
    si.wShowWindow = SW_HIDE;
    if (CreateProcess(NULL, (LPTSTR)(LPCTSTR)command_line, 0, 0, FALSE, 
                      NORMAL_PRIORITY_CLASS , 0, NULL, &si, &pi)) {
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
      }while(FindNextFile(hFind, &fd));
      
      FindClose(hFind);
    }
    
    delete [] path;
    if( remove )
      RemoveDirectory(directory);
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
          if( fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY )
            CopyDirectoryTree(src, dest);
          else
            CopyFile(src, dest, FALSE);
        }
      }while(FindNextFile(hFind, &fd));
      FindClose(hFind);
    }
  }
}

/*-----------------------------------------------------------------------------
  Find what we assume is the browser document window:
  Largest child window that:
  - Is visible
  - Takes > 80% of the parent window's space
  - Recursively checks the largest child
-----------------------------------------------------------------------------*/
static HWND FindBrowserDocument(HWND parent_window) {
  HWND document_window = NULL;
  RECT rect;
  DWORD biggest_child = 0;

  if (GetWindowRect(parent_window, &rect)) {
    DWORD parent_pixels = abs(rect.right - rect.left) * 
                          abs(rect.top - rect.bottom);
    DWORD cutoff = (DWORD)((double)parent_pixels * 0.8);
    if (parent_pixels) {
      HWND child = GetWindow(parent_window, GW_CHILD);
      while (child) {
        if (IsWindowVisible(child) && GetWindowRect(child, &rect)) {
          DWORD child_pixels = abs(rect.right - rect.left) * 
                                abs(rect.top - rect.bottom);
          if (child_pixels > biggest_child && child_pixels > cutoff) {
            document_window = child;
            biggest_child = child_pixels;
          }
        }
        child = GetWindow(child, GW_HWNDNEXT);
      }
    }
  }

  if (document_window) {
    HWND child_window = FindBrowserDocument(document_window);
    if (child_window)
      document_window = child_window;
  }

  return document_window;
}

/*-----------------------------------------------------------------------------
  Find the top-level and document windows for the browser
-----------------------------------------------------------------------------*/
bool FindBrowserWindow( DWORD process_id, HWND& frame_window, 
                          HWND& document_window) {
  bool found = false;
  frame_window = NULL;
  document_window = NULL;

  HWND wnd = ::GetDesktopWindow();
  wnd = ::GetWindow(wnd, GW_CHILD);
  while (!frame_window && wnd) {
    DWORD pid;
    GetWindowThreadProcessId(wnd, &pid);
    if (pid == process_id && IsWindowVisible(wnd)) {
      LONG style = GetWindowLong(wnd, GWL_STYLE);
      if (style & WS_SYSMENU && style & WS_CAPTION) {
        found = true;
        frame_window = wnd;
      }
    }
    wnd = ::GetNextWindow( wnd , GW_HWNDNEXT);
  }

  if (frame_window) {
    document_window = FindBrowserDocument(frame_window);
  }

  return found;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptTrace(int level, LPCTSTR format, ...) {
  if (WptCheckLogLevel(level)) {
    va_list args;
    va_start( args, format );

    int len = _vsctprintf( format, args ) + 1;
    if (len) {
      TCHAR * msg = (TCHAR *)malloc( len * sizeof(TCHAR) );
      if (msg) {
        if (_vstprintf_s( msg, len, format, args ) > 0) {
          if (lstrlen(msg)) {
            #ifdef DEBUG
            OutputDebugString(msg);
            #endif
            WptLogMessage(msg);
          }
        }

        free( msg );
      }
    }
  }
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

