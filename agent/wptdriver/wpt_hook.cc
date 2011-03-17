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

#include "StdAfx.h"
#include "wpt_hook.h"
#include "../wpthook/window_messages.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptHook::WptHook(void):
  _wpthook_window(NULL) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptHook::~WptHook(void) {
}

/*-----------------------------------------------------------------------------
  Find the window running in the remote browser
-----------------------------------------------------------------------------*/
bool WptHook::Connect(DWORD timeout) {
  bool ret = false;

  DWORD end = GetTickCount() + timeout;
  do {
    _wpthook_window = FindWindow(wpthook_window_class, NULL);
    if (!_wpthook_window)
      Sleep(100);
  } while (!_wpthook_window && GetTickCount() < end);

  if (_wpthook_window)
    ret = true;

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptHook::Disconnect() {
  _wpthook_window = NULL;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptHook::Start(bool async) {
  bool ret = false;

  if (!_wpthook_window)
    Connect();

  if (_wpthook_window) {
    if( async )
      ret = PostMessage(_wpthook_window, WPT_START, 0, 0) != 0;
    else {
      DWORD result;
      ret = SendMessageTimeout(_wpthook_window, WPT_START, 0, 0, 
                                SMTO_BLOCK, 10000, &result) != 0;
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptHook::Stop(bool async) {
  bool ret = false;

  if (!_wpthook_window)
    Connect();

  if (_wpthook_window) {
    if( async )
      ret = PostMessage(_wpthook_window, WPT_STOP, 0, 0) != 0;
    else {
      DWORD result;
      ret = SendMessageTimeout(_wpthook_window, WPT_STOP, 0, 0, 
                                SMTO_BLOCK, 10000, &result) != 0;
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptHook::OnNavigate(bool async) {
  bool ret = false;

  if (!_wpthook_window)
    Connect();

  if (_wpthook_window) {
    if (async)
      ret = PostMessage(_wpthook_window, WPT_ON_NAVIGATE, 0, 0) != 0;
    else {
      DWORD result;
      ret = SendMessageTimeout(_wpthook_window, WPT_ON_NAVIGATE, 0, 0, 
                                SMTO_BLOCK, 10000, &result) != 0;
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptHook::OnLoad(bool async) {
  bool ret = false;

  if (!_wpthook_window)
    Connect();

  if (_wpthook_window) {
    if (async)
      ret = PostMessage(_wpthook_window, WPT_ON_LOAD, 0, 0) != 0;
    else {
      DWORD result;
      ret = SendMessageTimeout(_wpthook_window, WPT_ON_LOAD, 0, 0, 
                                SMTO_BLOCK, 10000, &result) != 0;
    }
  }

  return ret;
}
