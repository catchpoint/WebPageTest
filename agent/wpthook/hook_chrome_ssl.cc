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

#include "hook_chrome_ssl.h"
static ChromeSSLHook* g_hook = NULL;

/*
// From Chrome /src/third_party/boringssl/src/ssl/internal.h
// August 2016 (Chrome 54+)
struct ssl_protocol_method_st {
  char is_dtls;         // (2 byte padded) (signature)
  uint16_t min_version; // (2 bytes) (signature)
  uint16_t max_version; // (4 bytes padded) (signature)
  uint16_t (*version_from_wire)(uint16_t wire_version); // 0
  uint16_t (*version_to_wire)(uint16_t version);        // 1
  int (*ssl_new)(SSL *ssl);                             // 2
  void (*ssl_free)(SSL *ssl);                           // 3
  int (*ssl_get_message)(SSL *ssl, int msg_type,        // 4
                         enum ssl_hash_message_t hash_message);
  int (*hash_current_message)(SSL *ssl);                // 5
  void (*release_current_message)(SSL *ssl, int free_buffer); // 6
  int (*read_app_data)(SSL *ssl, int *out_got_handshake,  //7
                       uint8_t *buf, int len, int peek);
  int (*read_change_cipher_spec)(SSL *ssl);             // 8
  void (*read_close_notify)(SSL *ssl);                  // 9
  int (*write_app_data)(SSL *ssl, const void *buf_, int len); // 10
  int (*dispatch_alert)(SSL *ssl);                      // 11
  int (*supports_cipher)(const SSL_CIPHER *cipher);     // 12
  int (*init_message)(SSL *ssl, CBB *cbb, CBB *body, uint8_t type); // 13
  int (*finish_message)(SSL *ssl, CBB *cbb);            // 14
  int (*write_message)(SSL *ssl);                       // 15
  int (*send_change_cipher_spec)(SSL *ssl);             // 16
  void (*expect_flight)(SSL *ssl);                      // 17
  void (*received_flight)(SSL *ssl);                    // 18
  int (*set_read_state)(SSL *ssl, SSL_AEAD_CTX *aead_ctx);  // 19
  int (*set_write_state)(SSL *ssl, SSL_AEAD_CTX *aead_ctx); // 20
};

// Chrome 53
struct ssl_protocol_method_st {
  char is_dtls;                                                           // Signature
  int (*ssl_new)(SSL *ssl);                                               // 0
  void (*ssl_free)(SSL *ssl);                                             // 1
  long (*ssl_get_message)(SSL *ssl, int msg_type,                         // 2
                          enum ssl_hash_message_t hash_message, int *ok);
  int (*ssl_read_app_data)(SSL *ssl, uint8_t *buf, int len, int peek);    // 3
  int (*ssl_read_change_cipher_spec)(SSL *ssl);                           // 4
  void (*ssl_read_close_notify)(SSL *ssl);                                // 5
  int (*ssl_write_app_data)(SSL *ssl, const void *buf_, int len);         // 6
  int (*ssl_dispatch_alert)(SSL *ssl);                                    // 7
  int (*supports_cipher)(const SSL_CIPHER *cipher);                       // 8
  unsigned int hhlen;                                                     // 9
  int (*set_handshake_header)(SSL *ssl, int type, unsigned long len);     // 10
  int (*do_write)(SSL *ssl);                                              // 11
  int (*send_change_cipher_spec)(SSL *ssl, int a, int b);                 // 12
  void (*expect_flight)(SSL *ssl);                                        // 13
  void (*received_flight)(SSL *ssl);                                      // 14
};


// Nov 2015
typedef struct ssl_protocol_method_st {
  char is_dtls;                                                           // Signature
  int (*ssl_new)(void *ssl);                                              // 0
  void (*ssl_free)(void *ssl);                                            // 1
  int (*ssl_accept)(void *ssl);                                           // 2
  int (*ssl_connect)(void *ssl);                                          // 3
  long (*ssl_get_message)(void *ssl, int header_state, int body_state,    // 4
                          int msg_type, long max, 
                          enum ssl_hash_message_t hash_message, int *ok);
  int (*ssl_read_app_data)(void *ssl, uint8_t *buf, int len, int peek);   // 5
  int (*ssl_read_change_cipher_spec)(void *ssl);                          // 6
  void (*ssl_read_close_notify)(void *ssl);                               // 7
  int (*ssl_write_app_data)(void *ssl, const void *buf_, int len);        // 8
  int (*ssl_dispatch_alert)(void *ssl);                                   // 9
  int (*supports_cipher)(void *cipher);                                   // 10
  unsigned int hhlen;                                                     // 11 (value = 4 (DWORD))
  int (*set_handshake_header)(void *ssl, int type, unsigned long len);    // 12
  int (*do_write)(void *ssl);                                             // 13
} SSL_METHODS;
*/

typedef struct {
  DWORD max_chrome_ver;
  DWORD min_chrome_ver;
  DWORD count;
  DWORD signature_len;
  const char * signature_bytes;
  const void **hhlen;
  int hhlen_index;
  int ssl_new_index;
  int ssl_free_index;
  int ssl_connect_index;
  int ssl_begin_handshake_index;
  int ssl_read_app_data_old_index;
  int ssl_read_app_data_index;
  int ssl_write_app_data_index;
} SSL_METHODS_SIGNATURE;

static SSL_METHODS_SIGNATURE methods_signatures[] = {
  // August 2016 - hhlen is switched for ssl max DWORD
  { 0,          // No max, current signature
    54,         // Started in Chrome 54
    21,         // count
    8,          // 8-byte signature
    "\x0\x0\x0\x3\x4\x3\x0\x0", // signature
    0,          // hhlen
    -1,         // hhlen_index
    2,          // ssl_new_index
    3,          // ssl_free_index
    -1,         // ssl_connect_index
    -1,         // ssl_begin_handshake_index
    -1,         // ssl_read_app_data_old_index
    7,          // ssl_read_app_data_index
    10}         // ssl_write_app_data_index

  //#ifndef _WIN64
  // Chrome 53
  ,{53,         // Ended in Chrome 53
    53,         // Started in Chrome 53
    14,         // count
    4,          // Signature len
    "\x0\x0\x0\x0", // signature
    (const void **)4,          // hhlen
    9,          // hhlen_index
    0,          // ssl_new_index
    1,          // ssl_free_index
    -1,         // ssl_connect_index
    -1,         // ssl_begin_handshake_index
    3,          // ssl_read_app_data_old_index
    -1,         // ssl_read_app_data_index
    6}          // ssl_write_app_data_index

  // Nov 2015
  ,{52,         // Ended in Chrome 52
    0,          // No start version
    13,         // count
    4,          // Signature len
    "\x0\x0\x0\x0", // signature
    (const void **)4,          // hhlen value
    11,         // hhlen_index
    0,          // ssl_new_index
    1,          // ssl_free_index
    3,          // ssl_connect_index
    -1,         // ssl_begin_handshake_index
    5,          // ssl_read_app_data_old_index
    -1,         // ssl_read_app_data_index
    8}          // ssl_write_app_data_index
  //#endif
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
  ATLTRACE("Looking for Chrome SSL hook for Chrome version %d\n", chrome_version);

  void ** methods_addr = NULL;
  int signature = -1;
  DWORD match_count = 0;
  if (module) {
    char * base_addr = (char *)module;
    MODULEINFO module_info;
    if (GetModuleInformation(GetCurrentProcess(), module, &module_info, sizeof(module_info))) {
      char * end_addr = base_addr + module_info.SizeOfImage;
      PIMAGE_DOS_HEADER pDos = (PIMAGE_DOS_HEADER)base_addr;
      PIMAGE_NT_HEADERS pNT = (PIMAGE_NT_HEADERS)(pDos->e_lfanew + base_addr);
      if (pNT->Signature == IMAGE_NT_SIGNATURE) {
        PIMAGE_SECTION_HEADER pSection = 0;
        for (int i = 0 ;i < pNT->FileHeader.NumberOfSections; i ++) {
          pSection = (PIMAGE_SECTION_HEADER)((char *)pNT + sizeof(IMAGE_NT_HEADERS) + (sizeof(IMAGE_SECTION_HEADER)*i));
          if (!strcmp((char*)pSection->Name, ".rdata") && pSection->SizeOfRawData > max_methods_struct_size) {
            // Scan for a matching signature
            int count = 0;
            char * compare;
            char * addr = (char *)(base_addr + pSection->VirtualAddress);
            DWORD len = pSection->SizeOfRawData - max_methods_struct_size;
            while (len) {
              compare = addr;

              // All signatures start with at least a 3-byte 0 value
              if (!memcmp(compare, "\x0\x0\x0", 3)) {
                // go through our list of matching signatures
                for (int signum = 0; signum < _countof(methods_signatures); signum++) {
                  SSL_METHODS_SIGNATURE * sig = &methods_signatures[signum];
                  if (chrome_version >= sig->min_chrome_ver && (!sig->max_chrome_ver || chrome_version <= sig->max_chrome_ver)) {
                    // see if the signature matches
                    if (!memcmp(compare, sig->signature_bytes, sig->signature_len)) {
                      void ** functions = (void **)&compare[sig->signature_len];
                      // if hhlen is defined, make sure it matches
                      if (sig->hhlen_index < 0 || functions[sig->hhlen_index] == sig->hhlen) {
                        // see if all other entries are addresses in the chrome.dll address range
                        bool ok = true;
                        for (DWORD entry = 0; entry < sig->count; entry++) {
                          if (entry != sig->hhlen_index) {
                            if (functions[entry] < base_addr || functions[entry] > end_addr) {
                              ok = false;
                              break;
                            }
                          }
                        }
                        if (ok) {
                          // Scan the next 1KB to see if the reference to boringssl is present (possibly flaky, verify with several builds)
                          char * mem = compare;
                          bool found = false;
                          for (int str_offset = 0; str_offset < 1024 && !found && mem < end_addr; str_offset++) {
                            if (!memcmp(&mem[str_offset], "boringssl", 9))
                              found = true;
                          }
                          if (found) {
                            match_count++;
                            ATLTRACE("Chrome ssl methods structure found (signature %d) at 0x%p\n", signum, compare);
                            if (!methods_addr) {
                              methods_addr = functions;
                              signature = signum;
                            }
                          } else {
                            ATLTRACE("Signature match but ssl_lib.c string not found (signature %d) at 0x%p\n", signum, compare);
                          }
                        }
                      }
                    }
                  }
                }
              }

              // Structure is pointer-aligned in memory
              len -= sizeof(void *);
              addr += sizeof(void *);
            }
          }
        }
      }
    }
  }

  // To be safe, only hook if we find EXACTLY one match
  if (match_count == 1 && methods_addr && signature >= 0) {
    g_hook = this; 

    ATLTRACE("Overwriting Chrome ssl methods structure (signature %d) at 0x%p", signature, methods_addr);

    // Hook the functions now that we have in-memory addresses for them
    MH_CreateHook(methods_addr[methods_signatures[signature].ssl_new_index], New_Hook, (LPVOID *)&New_);
    MH_CreateHook(methods_addr[methods_signatures[signature].ssl_free_index], Free_Hook, (LPVOID *)&Free_);
    if (methods_signatures[signature].ssl_connect_index >= 0)
      MH_CreateHook(methods_addr[methods_signatures[signature].ssl_connect_index], Connect_Hook, (LPVOID *)&Connect_);
    if (methods_signatures[signature].ssl_begin_handshake_index >= 0)
      MH_CreateHook(methods_addr[methods_signatures[signature].ssl_begin_handshake_index], BeginHandshake_Hook, (LPVOID *)&BeginHandshake_);
    if (methods_signatures[signature].ssl_read_app_data_old_index >= 0)
      MH_CreateHook(methods_addr[methods_signatures[signature].ssl_read_app_data_old_index], ReadAppDataOld_Hook, (LPVOID *)&ReadAppDataOld_);
    if (methods_signatures[signature].ssl_read_app_data_index >= 0)
      MH_CreateHook(methods_addr[methods_signatures[signature].ssl_read_app_data_index], ReadAppData_Hook, (LPVOID *)&ReadAppData_);
    MH_CreateHook(methods_addr[methods_signatures[signature].ssl_write_app_data_index], WriteAppData_Hook, (LPVOID *)&WriteAppData_);

    MH_EnableHook(MH_ALL_HOOKS);

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
