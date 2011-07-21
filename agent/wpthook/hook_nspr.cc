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

#include "hook_nspr.h"

static NsprHook* pHook = NULL;

// Stub Functions

PRFileDesc* PR_Socket_Hook(PRInt32 domain, PRInt32 type, PRInt32 proto) {
  PRFileDesc* ret = NULL;
  if (pHook) {
    ret = pHook->PR_Socket(domain, type, proto);
  }
  return ret;
}

PRFileDesc* SSL_ImportFD_Hook(PRFileDesc *model, PRFileDesc *fd) {
  PRFileDesc* ret = NULL;
  if (pHook) {
    ret = pHook->SSL_ImportFD(model, fd);
  }
  return ret;
}

SECStatus SSL_SetURL_Hook(PRFileDesc *fd, const char *url) {
  SECStatus ret = SECFailure;
  if (pHook) {
    ret = pHook->SSL_SetURL(fd, url);
  }
  return ret;
}

PRStatus PR_Connect_Hook(PRFileDesc *fd, const PRNetAddr *addr, PRIntervalTime timeout) {
  PRStatus ret = PR_FAILURE;
  if (pHook) {
    ret = pHook->PR_Connect(fd, addr, timeout);
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

PRInt32 PR_Send_Hook(PRFileDesc *fd, const void *buf, PRInt32 amount, PRIntn flags, PRIntervalTime timeout) {
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

PRInt32 PR_Recv_Hook(PRFileDesc *fd, void *buf, PRInt32 amount, PRIntn flags, PRIntervalTime timeout) {
  PRInt32 ret = -1;
  if (pHook) {
    ret = pHook->PR_Recv(fd, buf, amount, flags, timeout);
  }
  return ret;
}

PRAddrInfo* PR_GetAddrInfoByName_Hook(const char *hostname, PRUint16 af, PRIntn flags) {
  PRAddrInfo* ret = NULL;
  if (pHook) {
    ret = pHook->PR_GetAddrInfoByName(hostname, af, flags);
  }
  return ret;
}

PRStatus PR_GetHostByName_Hook(const char *hostname, char *buf, PRIntn bufsize, PRHostEnt *hostentry) {
  PRStatus ret = PR_FAILURE;
  if (pHook) {
    ret = pHook->PR_GetHostByName(hostname, buf, bufsize, hostentry);
  }
  return ret;
}

PROsfd PR_FileDesc2NativeHandle_Hook(PRFileDesc *fd) {
  PROsfd ret = 0;
  if (pHook) {
    ret = pHook->PR_FileDesc2NativeHandle(fd);
  }
  return ret;
}

// end of C hook functions


NsprHook::NsprHook() {
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
  WptTrace(loglevel::kProcess, _T("[wpthook] NsprHook::Init()\n"));
  _PR_Socket = hook.createHookByName("nspr4.dll", "PR_Socket", PR_Socket_Hook);
  _SSL_ImportFD = hook.createHookByName("ssl3.dll", "SSL_ImportFD", SSL_ImportFD_Hook);
  _SSL_SetURL = hook.createHookByName("ssl3.dll", "SSL_SetURL", SSL_SetURL_Hook);
  _PR_Connect = hook.createHookByName("nspr4.dll", "PR_Connect", PR_Connect_Hook);
  _PR_ConnectContinue = hook.createHookByName("nspr4.dll", "PR_ConnectContinue", PR_ConnectContinue_Hook);

  _PR_Send = hook.createHookByName("nspr4.dll", "PR_Send", PR_Send_Hook);
  _PR_Write = hook.createHookByName("nspr4.dll", "PR_Write", PR_Write_Hook);
  _PR_Read = hook.createHookByName("nspr4.dll", "PR_Read", PR_Read_Hook);
  _PR_Recv = hook.createHookByName("nspr4.dll", "PR_Recv", PR_Recv_Hook);

  _PR_GetAddrInfoByName = hook.createHookByName("nspr4.dll", "PR_GetAddrInfoByName", PR_GetAddrInfoByName_Hook);
  _PR_GetHostByName = hook.createHookByName("nspr4.dll", "PR_GetHostByName", PR_GetHostByName_Hook);
  _PR_FileDesc2NativeHandle = hook.createHookByName("nspr4.dll", "PR_FileDesc2NativeHandle", PR_FileDesc2NativeHandle_Hook);
  //GetFunctionByName("nspr4.dll", "PR_FileDesc2NativeHandle", _PR_FileDesc2NativeHandle);
}

// NSPR hooks
PRFileDesc* NsprHook::PR_Socket(PRInt32 domain, PRInt32 type, PRInt32 proto) {
  PRFileDesc* ret = NULL;
  if (_PR_Socket) {
    ret = pHook->_PR_Socket(domain, type, proto);
    DumpOsfd(_T("_PR_Socket"), ret);
  }
  return ret;
}

PRFileDesc* NsprHook::SSL_ImportFD(PRFileDesc *model, PRFileDesc *fd) {
  PRFileDesc* ret = NULL;
  if (_SSL_ImportFD) {
    ret = _SSL_ImportFD(model, fd);
    DumpOsfd(_T("_SSL_import"), fd);
  }
  return ret;
}

SECStatus NsprHook::SSL_SetURL(PRFileDesc *fd, const char *url) {
  SECStatus ret = SECFailure;
  if (_SSL_SetURL) {
    ret = _SSL_SetURL(fd, url);
    DumpOsfd(_T("_SSL_SetURL"), fd);
  }
  return ret;
}

PRStatus NsprHook::PR_Connect(PRFileDesc *fd, const PRNetAddr *addr, PRIntervalTime timeout) {
  PRStatus ret = PR_FAILURE;
  if (_PR_Connect) {
    ret = _PR_Connect(fd, addr, timeout);
    DumpOsfd(_T("_PR_Connect"), fd);
  }
  return ret;
}

PRStatus NsprHook::PR_ConnectContinue(PRFileDesc *fd, PRInt16 out_flags) {
  PRStatus ret = PR_FAILURE;
  if (_PR_ConnectContinue) {
    ret = _PR_ConnectContinue(fd, out_flags);
    DumpOsfd(_T("_PR_ConnectContinue"), fd);
  }
  return ret;
}


PRInt32 NsprHook::PR_Write(PRFileDesc *fd, const void *buf, PRInt32 amount) {
  PRInt32 ret = -1;
  if (_PR_Write) {
    ret = _PR_Write(fd, buf, amount);
    DumpOsfd(_T("_PR_Write"), fd);
  }
  return ret;
}

PRInt32 NsprHook::PR_Send(PRFileDesc *fd, const void *buf, PRInt32 amount, PRIntn flags, PRIntervalTime timeout) {
  PRInt32 ret = -1;
  if (_PR_Send) {
    ret = _PR_Send(fd, buf, amount, flags, timeout);
    DumpOsfd(_T("_PR_Send"), fd);
  }
  return ret;
}

PRInt32 NsprHook::PR_Read(PRFileDesc *fd, void *buf, PRInt32 amount) {
  PRInt32 ret = -1;
  if (_PR_Read) {
    ret = _PR_Read(fd, buf, amount);
    DumpOsfd(_T("_PR_Read"), fd);
  }
  return ret;
}

PRInt32 NsprHook::PR_Recv(PRFileDesc *fd, void *buf, PRInt32 amount, PRIntn flags, PRIntervalTime timeout) {
  PRInt32 ret = -1;
  if (_PR_Send) {
    ret = _PR_Recv(fd, buf, amount, flags, timeout);
    DumpOsfd(_T("_PR_Recv"), fd);
  }
  return ret;
}

PRAddrInfo* NsprHook::PR_GetAddrInfoByName(const char *hostname, PRUint16 af, PRIntn flags) {
  PRAddrInfo* ret = NULL;
  if (_PR_GetAddrInfoByName) {
    WptTrace(loglevel::kProcess, _T("[wpthook] Call _PR_GetAddrInfoByName(%s)\n"), hostname);
    ret = _PR_GetAddrInfoByName(hostname, af, flags);
  }
  return ret;
}

PRStatus NsprHook::PR_GetHostByName(const char *hostname, char *buf, PRIntn bufsize, PRHostEnt *hostentry) {
  PRStatus ret = PR_FAILURE;
  if (_PR_GetHostByName) {
    WptTrace(loglevel::kProcess, _T("[wpthook] Call _PR_GetHostByName(%s)\n"), hostname);
    ret = _PR_GetHostByName(hostname, buf, bufsize, hostentry);
  }
  return ret;
}

PROsfd NsprHook::PR_FileDesc2NativeHandle(PRFileDesc *fd) {
  PROsfd ret = 0;
  if (_PR_FileDesc2NativeHandle) {
    ret = _PR_FileDesc2NativeHandle(fd);
  }
  return ret;
}


void NsprHook::DumpOsfd(LPCTSTR name, PRFileDesc *fd) {
#ifdef DEBUG
  CString message = name;
  message.Format(_T("%s: i:(fd, osfd): 0:(%d, %d)"), name, (int)fd, _PR_FileDesc2NativeHandle(fd));
  int i = -1;
  for (PRFileDesc* t = fd->higher; t; t = t->higher) {
    message.AppendFormat(_T(", %d:(%d, %d)"), i, (int)t, _PR_FileDesc2NativeHandle(t));
    i--;
  }
  i = 1;
  for (PRFileDesc* t = fd->lower; t; t = t->lower) {
    message.AppendFormat(_T(", %d:(%d, %d)"), i, (int)t, _PR_FileDesc2NativeHandle(t));
    i++;
  }
  WptTrace(loglevel::kProcess, message);
#endif
}

template <typename U>
void NsprHook::GetFunctionByName(const string& dll_name, const string& function_name, U& function_ptr) {
	HMODULE dll = LoadLibraryA(dll_name.c_str());
	function_ptr = (U)GetProcAddress(dll, function_name.c_str());
	FreeLibrary(dll);
}