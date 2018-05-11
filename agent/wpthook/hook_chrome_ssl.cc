/******************************************************************************
Copyright (c) 2011, Google Inc.
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

// hook_chrome_ssl.cc - Code for intercepting Chrome SSL API calls

#include "StdAfx.h"

#include "request.h"
#include "test_state.h"
#include "track_sockets.h"
#include "wpt_test_hook.h"
#include "MinHook.h"
#include <Psapi.h>

#include "hook_chrome_ssl.h"
static ChromeSSLHook* g_hook = NULL;

// Stub Functions
int __cdecl New_Hook(void *ssl) {
  return g_hook ? g_hook->New(ssl) : -1;
}

void __cdecl Free_Hook(void *ssl) {
  if (g_hook) g_hook->Free(ssl);
}

int __cdecl Connect_Hook(void *ssl) {
  return g_hook ? g_hook->Connect(ssl) : -1;
}

int __cdecl ReadAppDataOld2_Hook(void *ssl, uint8_t *buf, int len, int peek) {
  return g_hook ? g_hook->ReadAppDataOld2(ssl, buf, len, peek) : -1;
}

int __cdecl ReadAppDataOld_Hook(void *ssl, int *out_got_handshake, uint8_t *buf, int len, int peek) {
  return g_hook ? g_hook->ReadAppDataOld(ssl, out_got_handshake, buf, len, peek) : -1;
}

int __cdecl ReadAppData_Hook(void *ssl, bool *out_got_handshake, uint8_t *buf, int len, int peek) {
  return g_hook ? g_hook->ReadAppData(ssl, out_got_handshake, buf, len, peek) : -1;
}

int __cdecl WriteAppDataOld_Hook(void *ssl, const void *buf, int len) {
  return g_hook ? g_hook->WriteAppDataOld(ssl, buf, len) : -1;
}

int __cdecl WriteAppData_Hook(void *ssl, int *out_needs_handshake, const uint8_t *buf, int len) {
  return g_hook ? g_hook->WriteAppData(ssl, out_needs_handshake, buf, len) : -1;
}

// end of C hook functions
ChromeSSLHook::ChromeSSLHook(TrackSockets& sockets, TestState& test_state,
                             WptTestHook& test) :
    sockets_(sockets),
    test_state_(test_state),
    test_(test),
    New_(NULL),
    Free_(NULL),
    Connect_(NULL),
    ReadAppDataOld2_(NULL),
    ReadAppDataOld_(NULL),
    ReadAppData_(NULL),
    WriteAppDataOld_(NULL),
    WriteAppData_(NULL) {
  InitializeCriticalSection(&cs);
}

ChromeSSLHook::~ChromeSSLHook() {
  if (g_hook == this)
    g_hook = NULL;
  DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
  Scan through memory for the static mapping of ssl functions
-----------------------------------------------------------------------------*/
void ChromeSSLHook::Init() {
  EnterCriticalSection(&cs);
  if (g_hook) {
    LeaveCriticalSection(&cs);
    return;
  }

  // only install for chrome.exe
  TCHAR path[MAX_PATH];
  GetModuleFileName(NULL, path, _countof(path));
  if (lstrcmpi(PathFindFileName(path), _T("chrome.exe"))) {
    LeaveCriticalSection(&cs);
    return;
  }

  // Locate the global SSL_METHODS structure from s3_meth.c in memory
  // - in the .rdata section of chrome.dll
  // - starting with a signature that matches one of our defined signatures
  // - with a 4 for the hhlen at the appropriate offset
  // - with all functions pointing to addresses within chrome.dll
  CStringA buff;
  HMODULE module = GetModuleHandleA("chrome.dll");
  DWORD chrome_version = 0;
  if (GetModuleFileName(module, path, _countof(path))) {
    DWORD unused;
    DWORD infoSize = GetFileVersionInfoSize(path, &unused);
    LPBYTE pVersion = NULL;
    if (infoSize)  
      pVersion = (LPBYTE)malloc( infoSize );
    if (pVersion) {
      if (GetFileVersionInfo(path, 0, infoSize, pVersion)) {
        VS_FIXEDFILEINFO * info = NULL;
        UINT size = 0;
        if (VerQueryValue(pVersion, _T("\\"), (LPVOID*)&info, &size)) {
          if( info ) {
            chrome_version = HIWORD(info->dwFileVersionMS);
          }
        }
      }
      free( pVersion );
    }
  }
  ATLTRACE("Looking for Chrome SSL hook for Chrome version %d", chrome_version);
  // Don't hook TLS for chrome 64 or later.  The interface changed pretty radically
  if (chrome_version < 64) {
    HookUsingSymbols(path, module, chrome_version);
  }

  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool ChromeSSLHook::HookUsingSymbols(LPCTSTR path, HMODULE module, DWORD chrome_version) {
  bool ok = false, read_hooked = false, write_hooked = false;
  TCHAR offsets_file[MAX_PATH];
  lstrcpy(offsets_file, path);
  lstrcpy(PathFindFileName(offsets_file), _T("wpt.sym"));
  char * base_addr = 0;
  if (module) {
    base_addr = (char *)module;
    MODULEINFO module_info;
    if (GetModuleInformation(GetCurrentProcess(), module, &module_info, sizeof(module_info))) {
      char * end_addr = base_addr + module_info.SizeOfImage;
      HANDLE file_handle = CreateFile(offsets_file, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, 0, 0);
      if (file_handle != INVALID_HANDLE_VALUE) {
        DWORD size = GetFileSize(file_handle, NULL);
        if (size > 0) {
          char * buff = (char *)malloc(size + 1);
          DWORD bytes = 0;
          if (ReadFile(file_handle, buff, size, &bytes, 0) && bytes == size) {
            buff[size] = 0;
            CStringA offsets(buff);
            ATLTRACE("Offsets for %S:\n%s", path, (LPCSTR)offsets);
            int pos = 0;
            CStringA line = offsets.Tokenize("\n", pos);
            while(line.GetLength()) {
              int separator = line.Find(" ");
              if (separator > 0) {
                CStringA func = line.Left(separator).Trim();
                DWORD offset = atoi(line.Mid(separator + 1).Trim());
                if (func.GetLength() && offset > 0 && offset < module_info.SizeOfImage) {
                  LPVOID addr = (LPVOID)(base_addr + offset);
                  if (func == "ssl3_new") {
                    ATLTRACE("%s (%d): 0x%p", (LPCSTR)func, offset, addr);
                    MH_CreateHook(addr, New_Hook, (LPVOID *)&New_);
                  } else if (func == "ssl3_free") {
                    ATLTRACE("%s (%d): 0x%p", (LPCSTR)func, offset, addr);
                    MH_CreateHook(addr, Free_Hook, (LPVOID *)&Free_);
                  } else if (func == "ssl3_connect") {
                    if (chrome_version <= 52) {
                      ATLTRACE("%s (%d): 0x%p", (LPCSTR)func, offset, addr);
                      MH_CreateHook(addr, Connect_Hook, (LPVOID *)&Connect_);
                    }
                  } else if (func == "ssl3_read_app_data") {
                    read_hooked = true;
                    if (chrome_version <= 53) {
                      ATLTRACE("%s - old2 (%d): 0x%p", (LPCSTR)func, offset, addr);
                      MH_CreateHook(addr, ReadAppDataOld2_Hook, (LPVOID *)&ReadAppDataOld2_);
                    } else if (chrome_version <= 61) {
                      ATLTRACE("%s - old (%d): 0x%p", (LPCSTR)func, offset, addr);
                      MH_CreateHook(addr, ReadAppDataOld_Hook, (LPVOID *)&ReadAppDataOld_);
                    } else {
                      ATLTRACE("%s (%d): 0x%p", (LPCSTR)func, offset, addr);
                      MH_CreateHook(addr, ReadAppData_Hook, (LPVOID *)&ReadAppData_);
                    }
                  } else if (func == "ssl3_write_app_data") {
                    write_hooked = true;
                    if (chrome_version <= 60) {
                      ATLTRACE("%s - old (%d): 0x%p", (LPCSTR)func, offset, addr);
                      MH_CreateHook(addr, WriteAppDataOld_Hook, (LPVOID *)&WriteAppDataOld_);
                    } else {
                      ATLTRACE("%s (%d): 0x%p", (LPCSTR)func, offset, addr);
                      MH_CreateHook(addr, WriteAppData_Hook, (LPVOID *)&WriteAppData_);
                    }
                  }
                }
              }
              line = offsets.Tokenize("\n", pos);
            }
          }
          free(buff);
        }
        CloseHandle(file_handle);
      }
    }
  }

  if (read_hooked && write_hooked) {
    ok = true;
    g_hook = this; 
    MH_EnableHook(MH_ALL_HOOKS);
  }

  return ok;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int ChromeSSLHook::New(void *ssl) {
  int ret = -1;
  ATLTRACE(_T("0x%08x - ChromeSSLHook::New"), ssl);
  SOCKET s;
  if (!sockets_.SslSocketLookup(ssl, s))
    sockets_.SetSslFd(ssl);
  if (New_)
    ret = New_(ssl);
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void ChromeSSLHook::Free(void *ssl) {
  ATLTRACE(_T("0x%08x - ChromeSSLHook::Free"), ssl);
  sockets_.SslRemoveSocketLookup(ssl);
  if (Free_)
    Free_(ssl);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int ChromeSSLHook::Connect(void *ssl) {
  int ret = -1;
  ATLTRACE(_T("0x%08x - ChromeSSLHook::Connect"), ssl);
  SOCKET s;
  if (!sockets_.SslSocketLookup(ssl, s))
    sockets_.SetSslFd(ssl);
  if (Connect_)
    ret = Connect_(ssl);
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int ChromeSSLHook::ReadAppDataOld2(void *ssl, uint8_t *buf, int len, int peek) {
  int ret = -1;
  if (ReadAppDataOld2_)
    ret = ReadAppDataOld2_(ssl, buf, len, peek);
  ATLTRACE(_T("0x%08x - ChromeSSLHook::ReadAppDataOld2 - %d bytes"), ssl, ret);
  if (ret > 0) {
    SOCKET s = INVALID_SOCKET;
    if (sockets_.SslSocketLookup(ssl, s)) {
      if (buf && !test_state_._exit) {
        DataChunk chunk((LPCSTR)buf, ret);
        sockets_.DataIn(s, chunk, true);
      }
    } else {
      ATLTRACE("0x%08X - ChromeSSLHook::ReadAppDataOld2 - Unmapped socket", ssl);
    }
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int ChromeSSLHook::ReadAppDataOld(void *ssl, int *out_got_handshake, uint8_t *buf, int len, int peek) {
  int ret = -1;
  ATLTRACE(_T("0x%08x - ChromeSSLHook::ReadAppDataOld"), ssl);
  if (ReadAppDataOld_)
    ret = ReadAppDataOld_(ssl, out_got_handshake, buf, len, peek);
  if (out_got_handshake && *out_got_handshake) {
    ATLTRACE(_T("0x%08x - ChromeSSLHook::ReadAppDataOld (got handshake) - %d bytes"), ssl, ret);
    return ret;
  }
  ATLTRACE(_T("0x%08x - ChromeSSLHook::ReadAppDataOld - %d bytes"), ssl, ret);
  if (ret > 0) {
    SOCKET s = INVALID_SOCKET;
    if (sockets_.SslSocketLookup(ssl, s)) {
      if (buf && !test_state_._exit) {
        DataChunk chunk((LPCSTR)buf, ret);
        sockets_.DataIn(s, chunk, true);
      }
    } else {
      ATLTRACE("0x%08X - ChromeSSLHook::ReadAppDataOld - Unmapped socket", ssl);
    }
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int ChromeSSLHook::ReadAppData(void *ssl, bool *out_got_handshake, uint8_t *buf, int len, int peek) {
  int ret = -1;
  ATLTRACE(_T("0x%08x - ChromeSSLHook::ReadAppData"), ssl);
  if (ReadAppData_)
    ret = ReadAppData_(ssl, out_got_handshake, buf, len, peek);
  if (out_got_handshake && *out_got_handshake) {
    ATLTRACE(_T("0x%08x - ChromeSSLHook::ReadAppData (got handshake) - %d bytes"), ssl, ret);
    return ret;
  }
  ATLTRACE(_T("0x%08x - ChromeSSLHook::ReadAppData - %d bytes"), ssl, ret);
  if (ret > 0) {
    SOCKET s = INVALID_SOCKET;
    if (sockets_.SslSocketLookup(ssl, s)) {
      if (buf && !test_state_._exit) {
        DataChunk chunk((LPCSTR)buf, ret);
        sockets_.DataIn(s, chunk, true);
      }
    } else {
      ATLTRACE("0x%08X - ChromeSSLHook::ReadAppData - Unmapped socket", ssl);
    }
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int ChromeSSLHook::WriteAppDataOld(void *ssl, const void *buf, int len) {
  int ret = -1;
  ATLTRACE(_T("0x%08x - ChromeSSLHook::WriteAppData - %d bytes"), ssl, len);
  if (WriteAppDataOld_) {
    SOCKET s = INVALID_SOCKET;
    if (sockets_.SslSocketLookup(ssl, s)) {
      if (buf && !test_state_._exit) {
        DataChunk chunk((LPCSTR)buf, len);
        sockets_.DataOut(s, chunk, true);
      }
    } else {
      ATLTRACE("0x%08X - ChromeSSLHook::WriteAppData - Unmapped socket", ssl);
      sockets_.SetSslFd(ssl);
    }
    ret = WriteAppDataOld_(ssl, buf, len);
  }
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int ChromeSSLHook::WriteAppData(void *ssl, int *out_needs_handshake, const uint8_t *buf, int len) {
  int ret = -1;
  ATLTRACE(_T("0x%08x - ChromeSSLHook::WriteAppData - %d bytes"), ssl, len);
  if (WriteAppData_) {
    SOCKET s = INVALID_SOCKET;
    if (sockets_.SslSocketLookup(ssl, s)) {
      if (buf && !test_state_._exit) {
        DataChunk chunk((LPCSTR)buf, len);
        sockets_.DataOut(s, chunk, true);
      }
    } else {
      ATLTRACE("0x%08X - ChromeSSLHook::WriteAppData - Unmapped socket", ssl);
      sockets_.SetSslFd(ssl);
    }
    ret = WriteAppData_(ssl, out_needs_handshake, buf, len);
  }
  return ret;
}
