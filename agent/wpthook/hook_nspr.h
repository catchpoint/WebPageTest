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

typedef PRFileDesc* (*PFN_SSL_ImportFD)(PRFileDesc *model, PRFileDesc *fd);
typedef PRStatus (*PFN_PR_Close)(PRFileDesc *fd);
typedef PRStatus (*PFN_PR_ConnectContinue)(PRFileDesc *fd, PRInt16 out_flags);

typedef PRInt32 (*PFN_PR_Write)(PRFileDesc*, const void*, PRInt32);
typedef PRInt32 (*PFN_PR_Send)(PRFileDesc*, const void*, PRInt32, PRIntn,
                               PRIntervalTime);
typedef PRInt32 (*PFN_PR_Read)(PRFileDesc*, void*, PRInt32);
typedef PRInt32 (*PFN_PR_Recv)(PRFileDesc*, void*, PRInt32, PRIntn,
                               PRIntervalTime);

typedef PROsfd (*PFN_PR_FileDesc2NativeHandle)(PRFileDesc *fd);


class TestState;
class TrackSockets;

class NsprHook
{
public:
  NsprHook(TrackSockets& sockets, TestState& test_state);
  ~NsprHook();
  void Init();

  // NSPR hooks
  PRFileDesc* SSL_ImportFD(PRFileDesc *model, PRFileDesc *fd);
  PRStatus PR_ConnectContinue(PRFileDesc *fd, PRInt16 out_flags);
  PRStatus PR_Close(PRFileDesc *fd);

  PRInt32 PR_Write(PRFileDesc *fd, const void *buf, PRInt32 amount);
  PRInt32 PR_Send(PRFileDesc *fd, const void *buf, PRInt32 amount, PRIntn flags,
                  PRIntervalTime timeout);
  PRInt32 PR_Read(PRFileDesc *fd, void *buf, PRInt32 amount);
  PRInt32 PR_Recv(PRFileDesc *fd, void *buf, PRInt32 amount, PRIntn flags,
                  PRIntervalTime timeout);

private:
  TestState& _test_state;
  TrackSockets& _sockets;
  CAtlMap<PRFileDesc*, SOCKET> _ssl_sockets;
  NCodeHookIA32  hook;
  void DumpOsfd(LPCTSTR name, PRFileDesc *fd);
  template <typename U> void GetFunctionByName(
      const std::string& dll, const std::string& funcName, U& func);

  PFN_SSL_ImportFD _SSL_ImportFD;
  PFN_PR_ConnectContinue _PR_ConnectContinue;
  PFN_PR_Close  _PR_Close;

  PFN_PR_Read   _PR_Read;
  PFN_PR_Recv   _PR_Recv;
  PFN_PR_Write  _PR_Write;
  PFN_PR_Send   _PR_Send;

  PFN_PR_FileDesc2NativeHandle _PR_FileDesc2NativeHandle;
};
