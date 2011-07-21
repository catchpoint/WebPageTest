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

#include "ncodehook/NCodeHookInstantiation.h"
#define MDCPUCFG "md/_winnt.cfg"
#include "prio.h"
typedef struct TRANSMIT_FILE_BUFFERS TRANSMIT_FILE_BUFFERS;
#include "private/pprio.h"

typedef enum _SECStatus {
    SECWouldBlock = -2,
    SECFailure = -1,
    SECSuccess = 0
} SECStatus;

typedef struct PRAddrInfo PRAddrInfo;
typedef struct PRHostEnt PrHostEnt;

typedef PRFileDesc* (*PFN_PR_Socket)(PRInt32 domain, PRInt32 type, PRInt32 proto);
typedef PRFileDesc* (*PFN_SSL_ImportFD)(PRFileDesc *model, PRFileDesc *fd);
typedef SECStatus (*PFN_SSL_SetURL)(PRFileDesc *fd, const char *url);
typedef PRStatus (*PFN_PR_Connect)(PRFileDesc *fd, const PRNetAddr *addr, PRIntervalTime timeout);
typedef PRStatus (*PFN_PR_ConnectContinue)(PRFileDesc *fd, PRInt16 out_flags);

typedef PRInt32 (*PFN_PR_Write)(PRFileDesc*, const void*, PRInt32);
typedef PRInt32 (*PFN_PR_Send)(PRFileDesc*, const void*, PRInt32, PRIntn, PRIntervalTime);
typedef PRInt32 (*PFN_PR_Read)(PRFileDesc*, void*, PRInt32);
typedef PRInt32 (*PFN_PR_Recv)(PRFileDesc*, void*, PRInt32, PRIntn, PRIntervalTime);

typedef PRAddrInfo* (*PFN_PR_GetAddrInfoByName)(const char *hostname, PRUint16 af, PRIntn flags);
typedef PRStatus (*PFN_PR_GetHostByName)(const char *hostname, char *buf, PRIntn bufsize, PRHostEnt *hostentry);

typedef PROsfd (*PFN_PR_FileDesc2NativeHandle)(PRFileDesc *fd);

class NsprHook
{
public:
  NsprHook();
  ~NsprHook();
  void Init();

  // NSPR hooks
  PRFileDesc* PR_Socket(PRInt32 domain, PRInt32 type, PRInt32 proto);
  PRFileDesc* SSL_ImportFD(PRFileDesc *model, PRFileDesc *fd);
  SECStatus SSL_SetURL(PRFileDesc *fd, const char *url);
  PRStatus PR_Connect(PRFileDesc *fd, const PRNetAddr *addr, PRIntervalTime timeout);
  PRStatus PR_ConnectContinue(PRFileDesc *fd, PRInt16 out_flags);

  PRInt32 PR_Write(PRFileDesc *fd, const void *buf, PRInt32 amount);
  PRInt32 PR_Send(PRFileDesc *fd, const void *buf, PRInt32 amount, PRIntn flags, PRIntervalTime timeout);
  PRInt32 PR_Read(PRFileDesc *fd, void *buf, PRInt32 amount);
  PRInt32 PR_Recv(PRFileDesc *fd, void *buf, PRInt32 amount, PRIntn flags, PRIntervalTime timeout);

  PRAddrInfo* PR_GetAddrInfoByName(const char *hostname, PRUint16 af, PRIntn flags);
  PRStatus PR_GetHostByName(const char *hostname, char *buf, PRIntn bufsize, PRHostEnt *hostentry);

  PROsfd PR_FileDesc2NativeHandle(PRFileDesc *fd);

private:
  void DumpOsfd(LPCTSTR name, PRFileDesc *fd);
  template <typename U> void GetFunctionByName(const std::string& dll, const std::string& funcName, U& func);

  bool hooked;
  NCodeHookIA32		  hook;

  PFN_PR_Socket    _PR_Socket;
  PFN_SSL_ImportFD _SSL_ImportFD;
  PFN_SSL_SetURL   _SSL_SetURL;
  PFN_PR_Connect   _PR_Connect;
  PFN_PR_ConnectContinue  _PR_ConnectContinue;

  PFN_PR_Read   _PR_Read;
  PFN_PR_Recv   _PR_Recv;
  PFN_PR_Write  _PR_Write;
  PFN_PR_Send   _PR_Send;

  PFN_PR_GetAddrInfoByName  _PR_GetAddrInfoByName;
  PFN_PR_GetHostByName  _PR_GetHostByName;

  PFN_PR_FileDesc2NativeHandle _PR_FileDesc2NativeHandle;
};
