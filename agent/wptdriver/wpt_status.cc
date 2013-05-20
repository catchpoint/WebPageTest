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
#include "wpt_status.h"


WptStatus::WptStatus(HWND hMainWnd):
  _wnd(hMainWnd) {
}


WptStatus::~WptStatus(void) {
}

/*-----------------------------------------------------------------------------
  Set the status message (thread safe) and update the UI
-----------------------------------------------------------------------------*/
void WptStatus::Set(const TCHAR * format, ...) {
  va_list args;
  va_start( args, format );

  int len = _vsctprintf( format, args ) + 1;
  if (len <= _countof(_tmp_buffer)) {
      if( _vstprintf_s( _tmp_buffer, len, format, args ) > 0 )
        _status = _tmp_buffer;
  } else {
    TCHAR * buff = (TCHAR *)malloc( len * sizeof(TCHAR) );
    if (buff) {
      if( _vstprintf_s( buff, len, format, args ) > 0 )
        _status = buff;

      free( buff );
    }
  }
  OutputDebugString(_status + _T("\n"));

  PostMessage(_wnd, UWM_UPDATE_STATUS, 0, 0);
}

/*-----------------------------------------------------------------------------
  Called from the main thread to update the title
-----------------------------------------------------------------------------*/
void WptStatus::OnUpdateStatus(void) {
  SendMessage(_wnd, WM_SETTEXT, 0, 
              (LPARAM)(const TCHAR *)(_status + _T(" - wptdriver")));
  InvalidateRect(_wnd, NULL, TRUE);
}

/*-----------------------------------------------------------------------------
  Called from the main thread to update the message in the UI
-----------------------------------------------------------------------------*/
void WptStatus::OnPaint(HWND window) {
  PAINTSTRUCT ps;
  HDC device_context = BeginPaint(window, &ps);
  if (device_context) {
    RECT rect;
    GetClientRect(window, &rect);
    rect.left += 10;
    rect.top += 10;
    DrawText(device_context, (const TCHAR *)_status, 
      _status.GetLength(), &rect, DT_LEFT | DT_TOP);
  }
  EndPaint(window, &ps);
}