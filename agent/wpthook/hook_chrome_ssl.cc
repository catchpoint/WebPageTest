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
  DWORD ssl_new_index;
  DWORD ssl_connect_index;
  DWORD ssl_free_index;
  DWORD ssl_read_app_data_index;
  DWORD ssl_write_app_data_index;
} SSL_METHODS_SIGNATURE;

static SSL_METHODS_SIGNATURE methods_signatures[] = {
  {15, 4, 12, 1, 4, 2, 6, 9},  // Nov 2015
  {14, 4, 11, 1, 4, 2, 6, 8}   // May 2015
};

static const DWORD max_methods_struct_size = 60;


// Stub Functions

// end of C hook functions


ChromeSSLHook::ChromeSSLHook(TrackSockets& sockets, TestState& test_state,
                             WptTestHook& test) :
    _sockets(sockets),
    _test_state(test_state),
    _test(test),
    _hook(NULL) {
}

ChromeSSLHook::~ChromeSSLHook() {
  if (g_hook == this) {
    g_hook = NULL;
  }
  delete _hook;  // remove all the hooks
}

void ChromeSSLHook::Init() {
  OutputDebugStringA("ChromeSSLHook::Init");
  if (_hook || g_hook) {
    return;
  }

  // only install for chrome.exe
  TCHAR path[MAX_PATH];
  GetModuleFileName(NULL, path, _countof(path));
  if (lstrcmpi(PathFindFileName(path), _T("chrome.exe"))) {
    return;
  }

  _hook = new NCodeHookIA32();
  g_hook = this; 

  // Locate the global SSL_METHODS structure from s3_meth.c in memory
  // - in the .rdata section of chrome.dll
  // - starting with a 0 DWORD (for dtls)
  // - with a 4 DWORD for the hhlen at the appropriate offset
  // - with all other entries pointing to addresses within chrome.dll
  CStringA buff;
  HMODULE module = GetModuleHandleA("chrome.dll");
  if (module) {
    DWORD base_addr = (DWORD)module;
    MODULEINFO module_info;
    if (GetModuleInformation(GetCurrentProcess(), module, &module_info, sizeof(module_info))) {
      DWORD end_addr = base_addr + module_info.SizeOfImage;
      PIMAGE_DOS_HEADER pDos = (PIMAGE_DOS_HEADER)base_addr;
      PIMAGE_NT_HEADERS pNT = (PIMAGE_NT_HEADERS)(pDos->e_lfanew + base_addr);
      if (pNT->Signature == IMAGE_NT_SIGNATURE) {
        PIMAGE_SECTION_HEADER pSection = 0;
        int i = 0;
        for (i = 0 ;i < pNT->FileHeader.NumberOfSections; i ++) {
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
                for (int i = 0; i < _countof(methods_signatures); i++) {
                  SSL_METHODS_SIGNATURE * sig = &methods_signatures[i];
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
                      buff.Format("******* match found of signature %d at 0x%08X (offset %d)", i, (DWORD)addr, (DWORD)addr - base_addr);
                      OutputDebugStringA(buff);
                      break;
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
  OutputDebugStringA("ChromeSSLHook::Init - Done");
}
