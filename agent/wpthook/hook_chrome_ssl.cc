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
#ifndef _WIN64
static ChromeSSLHook* g_hook = NULL;

/*
// From Chrome /src/third_party/boringssl/src/ssl/internal.h
// August 2016
struct ssl_protocol_method_st {
  char is_dtls;         // 0 (2 byte padded) - 0
  uint16_t min_version; // (2 bytes) - 0
  uint16_t max_version; // (4 bytes padded) - 1
  uint16_t (*version_from_wire)(uint16_t wire_version); // 2
  uint16_t (*version_to_wire)(uint16_t version);        // 3
  int (*ssl_new)(SSL *ssl);                             // 4
  void (*ssl_free)(SSL *ssl);                           // 5
  int (*ssl_get_message)(SSL *ssl, int msg_type,        // 6
                         enum ssl_hash_message_t hash_message);
  int (*hash_current_message)(SSL *ssl);                // 7
  void (*release_current_message)(SSL *ssl, int free_buffer); // 8
  int (*read_app_data)(SSL *ssl, int *out_got_handshake,  //9
                       uint8_t *buf, int len, int peek);
  int (*read_change_cipher_spec)(SSL *ssl);             // 10
  void (*read_close_notify)(SSL *ssl);                  // 11
  int (*write_app_data)(SSL *ssl, const void *buf_, int len); // 12
  int (*dispatch_alert)(SSL *ssl);                      // 13
  int (*supports_cipher)(const SSL_CIPHER *cipher);     // 14
  int (*init_message)(SSL *ssl, CBB *cbb, CBB *body, uint8_t type); // 15
  int (*finish_message)(SSL *ssl, CBB *cbb);            // 16
  int (*write_message)(SSL *ssl);                       // 17
  int (*send_change_cipher_spec)(SSL *ssl);             // 18
  void (*expect_flight)(SSL *ssl);                      // 19
  void (*received_flight)(SSL *ssl);                    // 20
  int (*set_read_state)(SSL *ssl, SSL_AEAD_CTX *aead_ctx);  // 21
  int (*set_write_state)(SSL *ssl, SSL_AEAD_CTX *aead_ctx); // 22
};

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
  DWORD signature;
  DWORD hhlen;
  DWORD hhlen_index;
  DWORD addr_start_index;
  DWORD ssl_new_index;
  DWORD ssl_free_index;
  DWORD ssl_connect_index;
  DWORD ssl_begin_handshake_index;
  DWORD ssl_read_app_data_old_index;
  DWORD ssl_read_app_data_index;
  DWORD ssl_write_app_data_index;
} SSL_METHODS_SIGNATURE;

static SSL_METHODS_SIGNATURE methods_signatures[] = {
  // July 2016 - hhlen is switched for ssl max DWORD
  { 22,         // count
    0x03000000, // signature
    0x00000304, // hhlen
    1,          // hhlen_index
    2,          // addr_start_index
    4,          // ssl_new_index
    5,          // ssl_free_index
    0,          // ssl_connect_index
    0,          // ssl_begin_handshake_index
    0,          // ssl_read_app_data_old_index
    9,         // ssl_read_app_data_index
    12},        // ssl_write_app_data_index

  // Nov 2015
  {15, 0x00000000, 4, 12, 1, 1, 2, 4, 0, 6, 0, 9},
  {14, 0x00000000, 4, 11, 1, 1, 2, 4, 0, 6, 0, 8}   // May 2015
};

static const DWORD max_methods_struct_size = 80;


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

int __cdecl BeginHandshake_Hook(void *ssl) {
  return g_hook ? g_hook->BeginHandshake(ssl) : 0;
}

int __cdecl ReadAppDataOld_Hook(void *ssl, uint8_t *buf, int len, int peek) {
  return g_hook ? g_hook->ReadAppDataOld(ssl, buf, len, peek) : -1;
}

int __cdecl ReadAppData_Hook(void *ssl, int *out_got_handshake, uint8_t *buf, int len, int peek) {
  return g_hook ? g_hook->ReadAppData(ssl, out_got_handshake, buf, len, peek) : -1;
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
    New_(NULL),
    Free_(NULL),
    Connect_(NULL),
    BeginHandshake_(NULL),
    ReadAppDataOld_(NULL),
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
  // - starting with a 0 DWORD (for dtls) or 0x03000000 for newer packed version
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
              if ((compare[0] == 0 || compare[0] == 0x03000000) && compare[6] >= base_addr && compare[6] <= end_addr) {
                // go through our list of matching signatures
                for (int signum = 0; signum < _countof(methods_signatures); signum++) {
                  SSL_METHODS_SIGNATURE * sig = &methods_signatures[signum];
                  // see if the first dword matches
                  if (compare[0] == sig->signature) {
                    // see if hhlen matches
                    if (compare[sig->hhlen_index] == sig->hhlen) {
                      // see if all other entries are addresses in the chrome.dll address range
                      bool ok = true;
                      for (DWORD entry = sig->addr_start_index; entry < sig->count; entry++) {
                        if (entry != sig->hhlen_index) {
                          if (compare[entry] < base_addr || compare[entry] > end_addr) {
                            ok = false;
                            break;
                          }
                        }
                      }
                      if (ok) {
                        // Scan the next 1KB to see if the reference to boringssl is present (possibly flaky, verify with several builds)
                        char * mem = (char *)compare;
                        bool found = false;
                        for (int str_offset = 0; str_offset < 1024 && !found && (DWORD)mem < end_addr; str_offset++) {
                          if (!memcmp(&mem[str_offset], "boringssl", 9))
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
    New_ = (PFN_SSL3_NEW)hook_->createHook(
        (PFN_SSL3_NEW)methods_addr[methods_signatures[signature].ssl_new_index],
        New_Hook);
    Free_ = (PFN_SSL3_FREE)hook_->createHook(
        (PFN_SSL3_FREE)methods_addr[methods_signatures[signature].ssl_free_index],
        Free_Hook);
    if (methods_signatures[signature].ssl_connect_index) {
      ATLTRACE("Hooking Connect");
      Connect_ = (PFN_SSL3_CONNECT)hook_->createHook(
          (PFN_SSL3_CONNECT)methods_addr[methods_signatures[signature].ssl_connect_index],
          Connect_Hook);
    }
    if (methods_signatures[signature].ssl_begin_handshake_index) {
      ATLTRACE("Hooking BeginHandshake");
      BeginHandshake_ = (PFN_SSL3_BEGIN_HANDSHAKE)hook_->createHook(
          (PFN_SSL3_BEGIN_HANDSHAKE)methods_addr[methods_signatures[signature].ssl_begin_handshake_index],
          BeginHandshake_Hook);
    }
    if (methods_signatures[signature].ssl_read_app_data_old_index) {
      ReadAppDataOld_ = (PFN_SSL3_READ_APP_DATA_OLD)hook_->createHook(
          (PFN_SSL3_READ_APP_DATA_OLD)methods_addr[methods_signatures[signature].ssl_read_app_data_old_index],
          ReadAppDataOld_Hook);
    }
    if (methods_signatures[signature].ssl_read_app_data_index) {
      ReadAppData_ = (PFN_SSL3_READ_APP_DATA)hook_->createHook(
          (PFN_SSL3_READ_APP_DATA)methods_addr[methods_signatures[signature].ssl_read_app_data_index],
          ReadAppData_Hook);
    }
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
int ChromeSSLHook::BeginHandshake(void *ssl) {
  int ret = 0;
  ATLTRACE(_T("0x%08x - ChromeSSLHook::BeginHandshake"), ssl);
  SOCKET s;
  if (!sockets_.SslSocketLookup(ssl, s))
    sockets_.SetSslFd(ssl);
  if (BeginHandshake_)
    ret = BeginHandshake_(ssl);
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int ChromeSSLHook::ReadAppDataOld(void *ssl, uint8_t *buf, int len, int peek) {
  int ret = -1;
  if (ReadAppDataOld_)
    ret = ReadAppDataOld_(ssl, buf, len, peek);
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
int ChromeSSLHook::ReadAppData(void *ssl, int *out_got_handshake, uint8_t *buf, int len, int peek) {
  int ret = -1;
  if (ReadAppData_)
    ret = ReadAppData_(ssl, out_got_handshake, buf, len, peek);
  if (out_got_handshake && *out_got_handshake)
    return ret;
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
int ChromeSSLHook::WriteAppData(void *ssl, const void *buf, int len) {
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
    ret = WriteAppData_(ssl, buf, len);
  }
  return ret;
}
#endif // _WIN64