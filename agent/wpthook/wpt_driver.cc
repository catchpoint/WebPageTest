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
#include "wpt_driver.h"
#include "window_messages.h"


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptDriver::WptDriver(void):
  _wptdriver_window(NULL) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptDriver::~WptDriver(void) {
}

/*-----------------------------------------------------------------------------
  Find the window running in the remote browser
-----------------------------------------------------------------------------*/
bool WptDriver::Connect(DWORD timeout) {
  bool ret = false;

  ATLTRACE2(_T("[wpthook] WptDriver::Connect"));

  DWORD end = GetTickCount() + timeout;
  do {
    _wptdriver_window = FindWindow(wptdriver_window_class, NULL);
    if (!_wptdriver_window)
      Sleep(100);
  } while (!_wptdriver_window && GetTickCount() < end);

  if (_wptdriver_window){
    ATLTRACE2(_T("[wpthook] Connected to wptdriver"));
    ret = true;
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptDriver::Disconnect() {
  _wptdriver_window = NULL;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptDriver::Done(bool async) {
  bool ret = false;

  ATLTRACE2(_T("[wpthook] WptDriver::Done"));

  if (_wptdriver_window){
    if (async)
      ret = PostMessage(_wptdriver_window, WPT_HOOK_DONE, 0, 0) != 0;
    else {
      DWORD result;
      ret = SendMessageTimeout(_wptdriver_window, WPT_HOOK_DONE, 0, 0, 
                                SMTO_BLOCK, 10000, &result) != 0;
    }
  }

  return ret;
}

