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

class TestState;
class TrackSockets;
class WptTestHook;

typedef int (__cdecl *PFN_SSL3_CONNECT)(void *ssl);
typedef int (__cdecl *PFN_SSL3_READ_APP_DATA)(void *ssl, uint8_t *buf, int len, int peek);
typedef int (__cdecl *PFN_SSL3_WRITE_APP_DATA)(void *ssl, const void *buf, int len);

class ChromeSSLHook
{
public:
  ChromeSSLHook(TrackSockets& sockets, TestState& test_state, WptTestHook& test);
  ~ChromeSSLHook();
  void Init();

  int Connect(void *ssl);
  int ReadAppData(void *ssl, uint8_t *buf, int len, int peek);
  int WriteAppData(void *ssl, const void *buf, int len);

private:
  TestState& test_state_;
  TrackSockets& sockets_;
  WptTestHook& test_;
  NCodeHookIA32* hook_;
  CRITICAL_SECTION cs;

  PFN_SSL3_CONNECT        Connect_;
  PFN_SSL3_READ_APP_DATA  ReadAppData_;
  PFN_SSL3_WRITE_APP_DATA WriteAppData_;
};
