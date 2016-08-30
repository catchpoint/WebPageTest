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

#pragma once

#include <TlHelp32.h>

namespace loglevel {
  const int kError = 1;
  const int kWarning = 2;
  const int kProcess = 3;
  const int kRareEvent = 4;
  const int kFrequentEvent = 7;
  const int kFunction = 8;
  const int kTrace = 9;
};


// Utility routines shared by all of the code

bool LaunchProcess(CString command_line, HANDLE * process_handle = NULL,
                   const TCHAR *dir = NULL);
void DeleteDirectory(LPCTSTR directory, bool remove = true);
void DeleteOldDirectoryEntries(CString directory, int seconds);
void DeleteRegKey(HKEY hParent, LPCTSTR key, bool remove = true);
void CopyDirectoryTree(CString source, CString destination);
bool FindBrowserWindow(DWORD process_id, HWND& frame_window);
void WptTrace(int level, LPCTSTR format, ...);

typedef CAtlList<CStringA> HookSymbolNames;
typedef CAtlMap<CStringA, DWORD64> HookOffsets;
CString CreateAppDataDir();
bool GetModuleByName(HANDLE process, LPCTSTR module_name,
    MODULEENTRY32 * module);
DWORD FindProcessIds(TCHAR * exe, CAtlList<DWORD> &pids);
DWORD GetParentProcessId(DWORD pid);
void TerminateProcessAndChildren(DWORD pid);
void TerminateProcessById(DWORD pid);
void TerminateProcessesByName(TCHAR * exe);
void WaitForChildProcesses(DWORD pid, DWORD timeout = 300000);
void WaitForProcessesByName(TCHAR * exe, DWORD timeout = 300000);
bool IsBrowserDocument(HWND wnd, bool recurse = true);
CString HttpGetText(CString url);
DWORD   HttpSaveFile(CString url, CString file);
CString HashFileMD5(CString file);
bool FileExists(CString file);
bool  RegexMatch(CStringA str, CStringA regex);
CStringA JSONEscape(CString src);
CStringA JSONEscapeA(CStringA src);
void QueryPerfCounter(__int64 &counter);
void QueryPerfFrequency(__int64 &freq);
int ElapsedFileTimeSeconds(FILETIME& check, FILETIME& now);
void Reboot();
bool ParseUrl(CString url, CString &scheme, CString &host,
              unsigned short &port, CString& object);
CString SniffMimeType(const LPBYTE content, size_t len);
bool IsBinaryContent(const LPBYTE content, size_t len);