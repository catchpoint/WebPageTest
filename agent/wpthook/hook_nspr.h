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

typedef PRFileDesc* (*PFN_SSL_ImportFD)(PRFileDesc *model, PRFileDesc *fd);
typedef PROsfd (*PFN_PR_FileDesc2NativeHandle)(PRFileDesc *fd);

class TestState;
class TrackSockets;

class NsprHook
{
public:
  NsprHook(TrackSockets& sockets, TestState& test_state);
  ~NsprHook();
  void Init();

  void SetSslFd(PRFileDesc *fd);

  // NSPR hooks
  PRFileDesc* SSL_ImportFD(PRFileDesc *model, PRFileDesc *fd);
  PRStatus PR_ConnectContinue(PRFileDesc *fd, PRInt16 out_flags);
  PRStatus PR_Close(PRFileDesc *fd);
  PRInt32 PR_Write(PRFileDesc *fd, const void *buf, PRInt32 amount);
  PRInt32 PR_Read(PRFileDesc *fd, void *buf, PRInt32 amount);
private:
  TestState& _test_state;
  TrackSockets& _sockets;
  NCodeHookIA32* _hook;

  template <typename U> void GetFunctionByName(
      const std::string& dll, const std::string& funcName, U& func);

  PFN_SSL_ImportFD _SSL_ImportFD;
  PRConnectcontinueFN _PR_ConnectContinue;
  PRCloseFN  _PR_Close;
  PRReadFN   _PR_Read;
  PRWriteFN  _PR_Write;
  
  PFN_PR_FileDesc2NativeHandle _PR_FileDesc2NativeHandle;
};
