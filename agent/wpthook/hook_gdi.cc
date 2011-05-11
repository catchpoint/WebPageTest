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
#include "hook_gdi.h"
#include "test_state.h"

static CGDIHook * pHook = NULL;

/******************************************************************************
*******************************************************************************
**																			                                     **
**							              	Stub Functions								               **
**							                                    												 **
*******************************************************************************
******************************************************************************/

BOOL __stdcall BitBlt_Hook( HDC hdc, int x, int y, int cx, int cy, HDC hdcSrc, 
                                                   int x1, int y1, DWORD rop) {
  BOOL ret = FALSE;
  if(pHook)
    ret = pHook->BitBlt( hdc, x, y, cx, cy, hdcSrc, x1, y1, rop);
  return ret;
}

BOOL __stdcall EndPaint_Hook(HWND hWnd, CONST PAINTSTRUCT *lpPaint) {
  BOOL ret = FALSE;
  if(pHook)
    ret = pHook->EndPaint(hWnd, lpPaint);
  return ret;
}

/******************************************************************************
*******************************************************************************
**																		                                    	 **
**								              CGDIHook Class							                 **
**															                                     				 **
*******************************************************************************
******************************************************************************/

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CGDIHook::CGDIHook(TestState& test_state):
  _test_state(test_state) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CGDIHook::Init() {
  if (!pHook)
    pHook = this;

  _BitBlt = hook.createHookByName("gdi32.dll", "BitBlt", BitBlt_Hook);
  _EndPaint = hook.createHookByName("user32.dll", "EndPaint", EndPaint_Hook);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CGDIHook::~CGDIHook(void) {
  if( pHook == this )
    pHook = NULL;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL CGDIHook::BitBlt( HDC hdc, int x, int y, int cx, int cy, HDC hdcSrc, 
                                              int x1, int y1, DWORD rop) {
  BOOL ret = FALSE;

  HWND wnd = WindowFromDC(hdc);

  if( _BitBlt )
    ret = _BitBlt( hdc, x, y, cx, cy, hdcSrc, x1, y1, rop);

  if (_test_state._active && wnd == _test_state._document_window) {
    _test_state._screen_updated = true;
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL CGDIHook::EndPaint(HWND hWnd, CONST PAINTSTRUCT *lpPaint) {
  BOOL ret = FALSE;

  if( _EndPaint )
    ret = _EndPaint(hWnd, lpPaint);

  if (_test_state._active && hWnd == _test_state._document_window)
    _test_state.CheckStartRender();

  return ret;
}
