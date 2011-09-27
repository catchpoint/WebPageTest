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

#include "hook_nspr.h"

static NsprHook* pHook = NULL;

// Stub Functions

PRFileDesc* SSL_ImportFD_Hook(PRFileDesc *model, PRFileDesc *fd) {
  PRFileDesc* ret = NULL;
  if (pHook) {
    ret = pHook->SSL_ImportFD(model, fd);
  }
  return ret;
}

PRStatus PR_ConnectContinue_Hook(PRFileDesc *fd, PRInt16 out_flags) {
  PRStatus ret = PR_FAILURE;
  if (pHook) {
    ret = pHook->PR_ConnectContinue(fd, out_flags);
  }
  return ret;
}

PRStatus PR_Close_Hook(PRFileDesc *fd) {
  PRStatus ret = PR_FAILURE;
  if (pHook) {
    ret = pHook->PR_Close(fd);
  }
  return ret;
}

PRInt32 PR_Send_Hook(PRFileDesc *fd, const void *buf, PRInt32 amount,
                     PRIntn flags, PRIntervalTime timeout) {
  PRInt32 ret = -1;
  if (pHook) {
    ret = pHook->PR_Send(fd, buf, amount, flags, timeout);
  }
  return ret;
}

PRInt32 PR_Write_Hook(PRFileDesc *fd, const void *buf, PRInt32 amount) {
  PRInt32 ret = -1;
  if (pHook) {
    ret = pHook->PR_Write(fd, buf, amount);
  }
  return ret;
}

PRInt32 PR_Read_Hook(PRFileDesc *fd, void *buf, PRInt32 amount) {
  PRInt32 ret = -1;
  if (pHook) {
    ret = pHook->PR_Read(fd, buf, amount);
  }
  return ret;
}

PRInt32 PR_Recv_Hook(PRFileDesc *fd, void *buf, PRInt32 amount,
                     PRIntn flags, PRIntervalTime timeout) {
  PRInt32 ret = -1;
  if (pHook) {
    ret = pHook->PR_Recv(fd, buf, amount, flags, timeout);
  }
  return ret;
}

// end of C hook functions


NsprHook::NsprHook(TrackSockets& sockets, TestState& test_state) :
    _sockets(sockets),
    _test_state(test_state) {
  _ssl_sockets.InitHashTable(257);
}

NsprHook::~NsprHook() {
  if (pHook == this) {
    pHook = NULL;
  }
}

void NsprHook::Init() {
  if (!pHook) {
    pHook = this;
  }
  GetFunctionByName(
      "nspr4.dll", "PR_FileDesc2NativeHandle", _PR_FileDesc2NativeHandle);
  if (_PR_FileDesc2NativeHandle != NULL) {
    WptTrace(loglevel::kProcess, _T("[wpthook] NsprHook::Init()\n"));
    _SSL_ImportFD = hook.createHookByName(
        "ssl3.dll", "SSL_ImportFD", SSL_ImportFD_Hook);
    _PR_ConnectContinue = hook.createHookByName(
        "nspr4.dll", "PR_ConnectContinue", PR_ConnectContinue_Hook);
    _PR_Close = hook.createHookByName("nspr4.dll", "PR_Close", PR_Close_Hook);
    _PR_Send = hook.createHookByName("nspr4.dll", "PR_Send", PR_Send_Hook);
    _PR_Write = hook.createHookByName("nspr4.dll", "PR_Write", PR_Write_Hook);
    _PR_Read = hook.createHookByName("nspr4.dll", "PR_Read", PR_Read_Hook);
    _PR_Recv = hook.createHookByName("nspr4.dll", "PR_Recv", PR_Recv_Hook);
  }
  else {
    HANDLE process = GetCurrentProcess();
    MODULEENTRY32 module;
    module.modBaseAddr = 0;
    GetModuleByName(process, _T("chrome.dll"), &module);
    if (module.modBaseAddr) {
      CString data_dir = CreateAppDataDir();
      CString offsets_filename = GetHookOffsetsFileName(data_dir, module.szExePath);
      HookOffsets offsets;
      GetSavedHookOffsets(offsets_filename, &offsets);
      DWORD64 offset = 0;
      if (offsets.Lookup(CStringA("SSL_ImportFD"), offset) && offset) {
        PFN_SSL_ImportFD real_func = (PFN_SSL_ImportFD)(module.modBaseAddr + offset);
        _SSL_ImportFD = hook.createHook(real_func, SSL_ImportFD_Hook);
      }
      if (offsets.Lookup(CStringA("ssl_Read"), offset) && offset) {
        PFN_PR_Read real_func = (PFN_PR_Read)(module.modBaseAddr + offset);
        _PR_Read = hook.createHook(real_func, PR_Read_Hook);
      }
      if (offsets.Lookup(CStringA("ssl_Write"), offset) && offset) {
        PFN_PR_Write real_func = (PFN_PR_Write)(module.modBaseAddr + offset);
        _PR_Write = hook.createHook(real_func, PR_Write_Hook);
      }
      if (offsets.Lookup(CStringA("ssl_Close"), offset) && offset) {
        PFN_PR_Close real_func = (PFN_PR_Close)(module.modBaseAddr + offset);
        _PR_Close = hook.createHook(real_func, PR_Close_Hook);
      }
    }
  }
}

// NSPR hooks
PRFileDesc* NsprHook::SSL_ImportFD(PRFileDesc *model, PRFileDesc *fd) {
  PRFileDesc* ret = NULL;
  if (_SSL_ImportFD) {
    ret = _SSL_ImportFD(model, fd);
    if (ret != NULL) {
      SOCKET s = GetSocket(fd);
      _sockets.SetIsSsl(s, true);
      _ssl_sockets.SetAt(fd, s);
      WptTrace(loglevel::kProcess,
               _T("[wpthook] NsprHook::SSL_ImportFD(fd=%d, socket=%d)"), fd, s);
    }
  }
  return ret;
}

PRStatus NsprHook::PR_ConnectContinue(PRFileDesc *fd, PRInt16 out_flags) {
  PRStatus ret = PR_FAILURE;
  if (_PR_ConnectContinue) {
    ret = _PR_ConnectContinue(fd, out_flags);
    if (!ret) {
      SOCKET s = GetSocket(fd);
      _sockets.Connected(s);
      WptTrace(loglevel::kProcess,
         _T("[wpthook] NsprHook::PR_ConnectContinue(fd=%d, socket=%d)"), fd, s);
    }
  }
  return ret;
}

PRStatus NsprHook::PR_Close(PRFileDesc *fd) {
  PRStatus ret = PR_FAILURE;
  if (_PR_Close) {
    ret = _PR_Close(fd);
    _ssl_sockets.RemoveKey(fd);
    WptTrace(loglevel::kProcess, _T("[wpthook] NsprHook::PR_Close(fd=%d)"), fd);
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
    if (buf && !_test_state._exit && _ssl_sockets.Lookup(fd, s)) {
      _sockets.ModifyDataOut(s, chunk);
    }
    ret = _PR_Write(fd, chunk.GetData(), chunk.GetLength());
    WptTrace(loglevel::kProcess, _T("[wpthook] NsprHook::PR_Write")
        _T("(fd=%d, socket=%d, amount=%d, orig_amount=%d) -> %d"),
       fd, s, amount, original_amount, ret);
    if (ret > 0 && s != INVALID_SOCKET) {
      _sockets.DataOut(s, chunk);
      ret = original_amount;
    }
  }
  return ret;
}

PRInt32 NsprHook::PR_Send(PRFileDesc *fd, const void *buf, PRInt32 amount,
                          PRIntn flags, PRIntervalTime timeout) {
  PRInt32 ret = -1;
  if (_PR_Send) {
    DataChunk chunk((LPCSTR)buf, amount);
    PRInt32 original_amount = amount;
    SOCKET s = INVALID_SOCKET;
    if (buf && !_test_state._exit && _ssl_sockets.Lookup(fd, s)) {
      _sockets.ModifyDataOut(s, chunk);
    }
    ret = _PR_Send(fd, chunk.GetData(), chunk.GetLength(), flags, timeout);
    WptTrace(loglevel::kProcess, _T("[wpthook] NsprHook::PR_Send")
        _T("(fd=%d, socket=%d, amount=%d, orig_amount=%d) -> %d"),
       fd, s, amount, original_amount, ret);
    if (ret > 0 && s != INVALID_SOCKET) {
      _sockets.DataOut(s, chunk);
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
      if (_ssl_sockets.Lookup(fd, s)) {
        WptTrace(loglevel::kProcess, _T("[wpthook] NsprHook::PR_Read")
                 _T("(fd=%d, socket=%d, amount=%d) -> %d"),
                 fd, s, amount, ret);
        _sockets.DataIn(s, DataChunk((LPCSTR)buf, ret));
      }
    }
  }
  return ret;
}

PRInt32 NsprHook::PR_Recv(PRFileDesc *fd, void *buf, PRInt32 amount,
                          PRIntn flags, PRIntervalTime timeout) {
  PRInt32 ret = -1;
  if (_PR_Send) {
    ret = _PR_Recv(fd, buf, amount, flags, timeout);
    if (ret > 0 && buf && !_test_state._exit) {
      SOCKET s = INVALID_SOCKET;
      if (_ssl_sockets.Lookup(fd, s)) {
        WptTrace(loglevel::kProcess, _T("[wpthook] NsprHook::PR_Recv")
                 _T("(fd=%d, socket=%d, amount=%d) -> %d"),
                 fd, s, amount, ret);
        _sockets.DataIn(s, DataChunk((LPCSTR)buf, ret));
      }
    }
  }
  return ret;
}

SOCKET NsprHook::GetSocket(PRFileDesc *fd) {
  SOCKET s = INVALID_SOCKET;
  if (_PR_FileDesc2NativeHandle) {
    s = _PR_FileDesc2NativeHandle(fd);
  }
  return s;
}

template <typename U>
void NsprHook::GetFunctionByName(const string& dll_name,
                                 const string& function_name, U& function_ptr) {
  HMODULE dll = LoadLibraryA(dll_name.c_str());
  if (dll) {
    function_ptr = (U)GetProcAddress(dll, function_name.c_str());
    FreeLibrary(dll);
  } else {
    function_ptr = NULL;
  }
}
