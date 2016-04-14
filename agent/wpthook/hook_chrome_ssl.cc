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

#include "hook_chrome_ssl.h"

static ChromeSSLHook* g_hook = NULL;

/*
// From Chrome /src/third_party/boringssl/src/ssl/internal.h
// Nov 2015
typedef struct ssl_protocol_method_st {
  char is_dtls;     // 0 (DWORD)
  int (*ssl_new)(void *ssl);
  void (*ssl_free)(void *ssl);
  int (*ssl_accept)(void *ssl);
  int (*ssl_connect)(void *ssl);
  long (*ssl_get_message)(void *ssl, int header_state, int body_state,
                          int msg_type, long max,
                          enum ssl_hash_message_t hash_message, int *ok);
  int (*ssl_read_app_data)(void *ssl, uint8_t *buf, int len, int peek);
  int (*ssl_read_change_cipher_spec)(void *ssl);
  void (*ssl_read_close_notify)(void *ssl);
  int (*ssl_write_app_data)(void *ssl, const void *buf_, int len);
  int (*ssl_dispatch_alert)(void *ssl);
  int (*supports_cipher)(void *cipher);
  unsigned int hhlen; // 4 (DWORD)
  int (*set_handshake_header)(void *ssl, int type, unsigned long len);
  int (*do_write)(void *ssl);
} SSL_METHODS;

// May 2015
typedef struct ssl_protocol_method_st {
  char is_dtls;        // 0 (DWORD)
  int (*ssl_new)(void *ssl);
  void (*ssl_free)(void *ssl);
  int (*ssl_accept)(void *ssl);
  int (*ssl_connect)(void *ssl);
  long (*ssl_get_message)(void *ssl, int header_state, int body_state,
                          int msg_type, long max,
                          enum ssl_hash_message_t hash_message, int *ok);
  int (*ssl_read_app_data)(void *ssl, uint8_t *buf, int len, int peek);
  void (*ssl_read_close_notify)(void *ssl);
  int (*ssl_write_app_data)(void *ssl, const void *buf_, int len);
  int (*ssl_dispatch_alert)(void *ssl);
  int (*supports_cipher)(void *cipher);
  unsigned int hhlen; // 4 (DWORD)
  int (*set_handshake_header)(void *ssl, int type, unsigned long len);
  int (*do_write)(void *ssl);
} SSL_METHODS_1;
*/

typedef struct {
  DWORD count;
  DWORD hhlen;
  DWORD hhlen_index;
  DWORD ssl_connect_index;
  DWORD ssl_read_app_data_index;
  DWORD ssl_write_app_data_index;
} SSL_METHODS_SIGNATURE;

static SSL_METHODS_SIGNATURE methods_signatures[] = {
  {15, 4, 12, 4, 6, 9},  // Nov 2015
  {14, 4, 11, 4, 6, 8}   // May 2015
};

static const DWORD max_methods_struct_size = 60;


// Stub Functions
int __cdecl Connect_Hook(void *ssl) {
  return g_hook ? g_hook->Connect(ssl) : -1;
}

int __cdecl ReadAppData_Hook(void *ssl, uint8_t *buf, int len, int peek) {
  return g_hook ? g_hook->ReadAppData(ssl, buf, len, peek) : -1;
}

int __cdecl WriteAppData_Hook(void *ssl, const void *buf, int len) {
  return g_hook ? g_hook->WriteAppData(ssl, buf, len) : -1;
}

// end of C hook functions
ChromeSSLHook::ChromeSSLHook(TrackSockets& sockets, TestState& test_state,
                             WptTestHook& test) :
    sockets_(sockets),
    test_state_(test_state),
    test_(test),
    hook_(NULL),
    Connect_(NULL),
    ReadAppData_(NULL),
    WriteAppData_(NULL) {
  InitializeCriticalSection(&cs);
}

ChromeSSLHook::~ChromeSSLHook() {
  if (g_hook == this) {
    g_hook = NULL;
  }
  delete hook_;  // remove all the hooks
  DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
  Scan through memory for the static mapping of ssl functions
-----------------------------------------------------------------------------*/
void ChromeSSLHook::Init() {
  EnterCriticalSection(&cs);
  if (hook_ || g_hook) {
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
  // - starting with a 0 DWORD (for dtls)
  // - with a 4 DWORD for the hhlen at the appropriate offset
  // - with all other entries pointing to addresses within chrome.dll
  CStringA buff;
  HMODULE module = GetModuleHandleA("chrome.dll");
  DWORD * methods_addr = NULL;
  DWORD signature = 0;
  DWORD match_count = 0;
  if (module) {
    DWORD base_addr = (DWORD)module;
    MODULEINFO module_info;
    if (GetModuleInformation(GetCurrentProcess(), module, &module_info, sizeof(module_info))) {
      DWORD end_addr = base_addr + module_info.SizeOfImage;
      PIMAGE_DOS_HEADER pDos = (PIMAGE_DOS_HEADER)base_addr;
      PIMAGE_NT_HEADERS pNT = (PIMAGE_NT_HEADERS)(pDos->e_lfanew + base_addr);
      if (pNT->Signature == IMAGE_NT_SIGNATURE) {
        PIMAGE_SECTION_HEADER pSection = 0;
        for (int i = 0 ;i < pNT->FileHeader.NumberOfSections; i ++) {
          pSection = (PIMAGE_SECTION_HEADER)((DWORD)pNT + sizeof(IMAGE_NT_HEADERS) + (sizeof(IMAGE_SECTION_HEADER)*i));
          if (!strcmp((char*)pSection->Name, ".rdata") && pSection->SizeOfRawData > max_methods_struct_size) {
            // Scan for a matching signature
            int count = 0;
            DWORD * compare;
            LPBYTE addr = (LPBYTE)(base_addr + pSection->VirtualAddress);
            DWORD len = pSection->SizeOfRawData - max_methods_struct_size;
            while (len) {
              compare = (DWORD *)addr;

              // Starts with 0 for dtls and 2nd entry in the address range
              if (compare[0] == 0 && compare[1] >= base_addr && compare[1] <= end_addr) {
                // go through our list of matching signatures
                for (int signum = 0; signum < _countof(methods_signatures); signum++) {
                  SSL_METHODS_SIGNATURE * sig = &methods_signatures[signum];
                  // see if hhlen matches
                  if (compare[sig->hhlen_index] == sig->hhlen) {
                    // see if all other entries are addresses in the chrome.dll address range
                    bool ok = true;
                    for (DWORD entry = 1; entry < sig->count; entry++) {
                      if (entry != sig->hhlen_index) {
                        if (compare[entry] < base_addr || compare[entry] > end_addr) {
                          ok = false;
                          break;
                        }
                      }
                    }
                    if (ok) {
                      // Scan the next 1KB to see if the reference to ssl_lib.c is present (possibly flaky, verify with several builds)
                      char * mem = (char *)compare;
                      bool found = false;
                      for (int str_offset = 0; str_offset < 1024 && !found && (DWORD)mem < end_addr; str_offset++) {
                        if (!memcmp(&mem[str_offset], "ssl_lib.c", 10)) // Include the NULL terminator
                          found = true;
                      }
                      if (found) {
                        match_count++;
                        ATLTRACE("Chrome ssl methods structure found (signature %d) at 0x%08X\n", signum, (DWORD)compare);
                        if (!methods_addr) {
                          methods_addr = compare;
                          signature = signum;
                        }
                      } else {
                        ATLTRACE("Signature match but ssl_lib.c string not found (signature %d) at 0x%08X\n", signum, (DWORD)compare);
                      }
                    }
                  }
                }
              }

              // Structure is DWORD-aligned in memory
              len -= 4;
              addr += 4;
            }
          }
        }
      }
    }
  }

  // To be safe, only hook if we find EXACTLY one match
  if (match_count == 1 && methods_addr) {
    hook_ = new NCodeHookIA32();
    g_hook = this; 

    ATLTRACE("Overwriting Chrome ssl methods structure (signature %d) at 0x%08X", signature, (DWORD)methods_addr);

    // Hook the functions now that we have in-memory addresses for them
    Connect_ = (PFN_SSL3_CONNECT)hook_->createHook(
        (PFN_SSL3_CONNECT)methods_addr[methods_signatures[signature].ssl_connect_index],
        Connect_Hook);
    ReadAppData_ = (PFN_SSL3_READ_APP_DATA)hook_->createHook(
        (PFN_SSL3_READ_APP_DATA)methods_addr[methods_signatures[signature].ssl_read_app_data_index],
        ReadAppData_Hook);
    WriteAppData_ = (PFN_SSL3_WRITE_APP_DATA)hook_->createHook(
        (PFN_SSL3_WRITE_APP_DATA)methods_addr[methods_signatures[signature].ssl_write_app_data_index],
        WriteAppData_Hook);
  } else if (match_count > 1) {
    g_hook = this; 
    ATLTRACE("Too many Chrome ssl methods structures found (%d matches)", match_count);
  } else {
    ATLTRACE("Chrome ssl methods structure NOT found");
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int ChromeSSLHook::Connect(void *ssl) {
  int ret = -1;
  SOCKET s;
  if (!sockets_.SslSocketLookup(ssl, s))
    sockets_.SetSslFd(ssl);
  if (Connect_)
    ret = Connect_(ssl);
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int ChromeSSLHook::ReadAppData(void *ssl, uint8_t *buf, int len, int peek) {
  int ret = -1;
  if (ReadAppData_)
    ret = ReadAppData_(ssl, buf, len, peek);
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
int ChromeSSLHook::WriteAppData(void *ssl, const void *buf, int len) {
  int ret = -1;
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
    ret = WriteAppData_(ssl, buf, len);
  }
  return ret;
}
