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

// hook_nspr.cc - Code for intercepting Nspr SSL API calls

#include "StdAfx.h"

#include "request.h"
#include "test_state.h"
#include "track_sockets.h"
#include "wpt_test_hook.h"
#include "MinHook.h"

#include "hook_nspr.h"

static NsprHook* g_hook = NULL;

// Stub Functions
PRFileDesc* SSL_ImportFD_Hook(PRFileDesc *model, PRFileDesc *fd) {
  return g_hook->SSL_ImportFD(model, fd);
}

PRStatus PR_Close_Hook(PRFileDesc *fd) {
  return g_hook->PR_Close(fd);
}

PRInt32 PR_Write_Hook(PRFileDesc *fd, const void *buf, PRInt32 amount) {
  return g_hook->PR_Write(fd, buf, amount);
}

PRInt32 PR_Read_Hook(PRFileDesc *fd, void *buf, PRInt32 amount) {
  return g_hook->PR_Read(fd, buf, amount);
}

SECStatus SSL_SetURL_Hook(PRFileDesc *fd, const char *url) {
  return g_hook->SSL_SetURL(fd, url);
}

/*-----------------------------------------------------------------------------
  Ignore all certificate errors by forcing all certificate validations
  to succeed.
-----------------------------------------------------------------------------*/
SECStatus PR_CALLBACK AuthenticateCertificate(void *arg,
    PRFileDesc *fd, PRBool checkSig, PRBool isServer) {
  return SECSuccess;
}

// end of C hook functions


NsprHook::NsprHook(TrackSockets& sockets, TestState& test_state,
                   WptTestHook& test) :
    _sockets(sockets),
    _test_state(test_state),
    _test(test),
    _SSL_ImportFD(NULL),
    _PR_Close(NULL),
    _PR_Read(NULL),
    _PR_Write(NULL),
    _PR_FileDesc2NativeHandle(NULL),
    _SSL_AuthCertificateHook(NULL),
    _SSL_SetURL(NULL) {
}

NsprHook::~NsprHook() {
  if (g_hook == this) {
    g_hook = NULL;
  }
}

void NsprHook::Init() {
  if (g_hook)
    return;
  g_hook = this; 


  GetFunctionByName("nss3.dll", "PR_FileDesc2NativeHandle", _PR_FileDesc2NativeHandle);
  if (!_PR_FileDesc2NativeHandle)
    GetFunctionByName("nspr4.dll", "PR_FileDesc2NativeHandle", _PR_FileDesc2NativeHandle);

  if (_PR_FileDesc2NativeHandle != NULL) {
    // Hook Firefox.
    ATLTRACE("[wpthook] NsprHook::Init()");

    LoadLibrary(_T("nss3.dll"));
    LoadLibrary(_T("nspr4.dll"));
    LoadLibrary(_T("ssl3.dll"));

    MH_CreateHookApi(L"nss3.dll", "SSL_ImportFD", SSL_ImportFD_Hook, (LPVOID *)&_SSL_ImportFD);
    if (!_SSL_ImportFD)
      MH_CreateHookApi(L"ssl3.dll", "SSL_ImportFD", SSL_ImportFD_Hook, (LPVOID *)&_SSL_ImportFD);

    MH_CreateHookApi(L"nss3.dll", "PR_Close", PR_Close_Hook, (LPVOID *)&_PR_Close);
    if (!_PR_Close)
      MH_CreateHookApi(L"nspr4.dll", "PR_Close", PR_Close_Hook, (LPVOID *)&_PR_Close);

    MH_CreateHookApi(L"nss3.dll", "PR_Write", PR_Write_Hook, (LPVOID *)&_PR_Write);
    if (!_PR_Write)
      MH_CreateHookApi(L"nspr4.dll", "PR_Write", PR_Write_Hook, (LPVOID *)&_PR_Write);

    MH_CreateHookApi(L"nss3.dll", "PR_Read", PR_Read_Hook, (LPVOID *)&_PR_Read);
    if (!_PR_Read)
      MH_CreateHookApi(L"nspr4.dll", "PR_Read", PR_Read_Hook, (LPVOID *)&_PR_Read);

    GetFunctionByName("nss3.dll", "SSL_AuthCertificateHook", _SSL_AuthCertificateHook);
    if (!_SSL_AuthCertificateHook)
      GetFunctionByName("ssl3.dll", "SSL_AuthCertificateHook", _SSL_AuthCertificateHook);

    MH_CreateHookApi(L"nss3.dll", "SSL_SetURL", SSL_SetURL_Hook, (LPVOID *)&_SSL_SetURL);
    if (!_SSL_SetURL)
      MH_CreateHookApi(L"ssl3.dll", "SSL_SetURL", SSL_SetURL_Hook, (LPVOID *)&_SSL_SetURL);

    MH_EnableHook(MH_ALL_HOOKS);
  }
}

void NsprHook::SetSslFd(PRFileDesc *fd) {
  _sockets.SetSslFd(fd);
}

// NSPR hooks
PRFileDesc* NsprHook::SSL_ImportFD(PRFileDesc *model, PRFileDesc *fd) {
  PRFileDesc* ret = NULL;
  if (_SSL_ImportFD) {
    ret = _SSL_ImportFD(model, fd);
    if (ret != NULL) {
      _sockets.SetSslFd(ret);
      if (_PR_FileDesc2NativeHandle)
        _sockets.SetSslSocket(_PR_FileDesc2NativeHandle(ret));
    }
  }
  return ret;
}

PRStatus NsprHook::PR_Close(PRFileDesc *fd) {
  PRStatus ret = PR_FAILURE;
  if (_PR_Close) {
    ret = _PR_Close(fd);
    _sockets.ClearSslFd(fd);
  }
  return ret;
}

/*-----------------------------------------------------------------------------
  For SSL connections on Firefox, PR_Write fails for the first few calls while
  SSL handshake takes place. During the handshake, PR_FileDesc2NativeHandle
  returns a different number that is not the SSL socket number. The workaround
  is to keep a mapping of file descriptors to SSL socket numbers.
-----------------------------------------------------------------------------*/
PRInt32 NsprHook::PR_Write(PRFileDesc *fd, const void *buf, PRInt32 amount) {
  PRInt32 ret = -1;
  if (_PR_Write) {
    DataChunk chunk((LPCSTR)buf, amount);
    PRInt32 original_amount = amount;
    SOCKET s = INVALID_SOCKET;
    if (buf && !_test_state._exit && _sockets.SslSocketLookup(fd, s)) {
      _sockets.ModifyDataOut(s, chunk, true);
    }
    ret = _PR_Write(fd, chunk.GetData(), (PRInt32)chunk.GetLength());
    if (ret > 0 && s != INVALID_SOCKET) {
      _sockets.DataOut(s, chunk, true);
      ret = original_amount;
    }
  }
  return ret;
}

PRInt32 NsprHook::PR_Read(PRFileDesc *fd, void *buf, PRInt32 amount) {
  PRInt32 ret = -1;
  if (_PR_Read) {
    ret = _PR_Read(fd, buf, amount);
    if (ret > 0 && buf && !_test_state._exit) {
      SOCKET s = INVALID_SOCKET;
      if (_sockets.SslSocketLookup(fd, s)) {
        _sockets.DataIn(s, DataChunk((LPCSTR)buf, ret), true);
      }
    }
  }
  return ret;
}

template <typename U>
void NsprHook::GetFunctionByName(LPCSTR dll_name, LPCSTR function_name, U& function_ptr) {
  HMODULE dll = LoadLibraryA(dll_name);
  function_ptr = dll ? (U)GetProcAddress(dll, function_name) : NULL;
}

SECStatus NsprHook::SSL_SetURL(PRFileDesc *fd, const char *url) {
  SECStatus ret = SECFailure;
  // Force our own certificate validator in the path.
  // This call is made after Firefox sets their auth hook so we
  // just override theirs
  if (_test._ignore_ssl && _SSL_AuthCertificateHook != NULL)
    _SSL_AuthCertificateHook(fd, AuthenticateCertificate, NULL);
  if (_SSL_SetURL)
    ret = _SSL_SetURL(fd, url);
  return ret;
}