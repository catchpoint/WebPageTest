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
extern bool wpt_capturing_screen;

/******************************************************************************
*******************************************************************************
**																			                                     **
**							              	Stub Functions								               **
**							                                    												 **
*******************************************************************************
******************************************************************************/

BOOL __stdcall EndPaint_Hook(HWND hWnd, CONST PAINTSTRUCT *lpPaint) {
  BOOL ret = FALSE;
  if(pHook)
    ret = pHook->EndPaint(hWnd, lpPaint);
  return ret;
}

int __stdcall ReleaseDC_Hook(HWND hWnd, HDC hDC) {
  int ret = 0;
  if(pHook)
    ret = pHook->ReleaseDC(hWnd, hDC);
  return ret;
}

BOOL __stdcall SetWindowTextA_Hook(HWND hWnd, LPCSTR text)
{
  BOOL ret = FALSE;
  if(pHook)
    ret = pHook->SetWindowTextA(hWnd, text);
  return ret;
}

BOOL __stdcall SetWindowTextW_Hook(HWND hWnd, LPCWSTR text)
{
  BOOL ret = FALSE;
  if(pHook)
    ret = pHook->SetWindowTextW(hWnd, text);
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
  _document_windows.InitHashTable(257);
  InitializeCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CGDIHook::Init() {
  if (!pHook)
    pHook = this;

  _EndPaint = hook.createHookByName("user32.dll", "EndPaint", EndPaint_Hook);
  _ReleaseDC = hook.createHookByName("user32.dll","ReleaseDC",ReleaseDC_Hook);
  _SetWindowTextA = hook.createHookByName("user32.dll", "SetWindowTextA", 
                                            SetWindowTextA_Hook);
  _SetWindowTextW = hook.createHookByName("user32.dll", "SetWindowTextW", 
                                            SetWindowTextW_Hook);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CGDIHook::~CGDIHook(void) {
  DeleteCriticalSection(&cs);
  if( pHook == this )
    pHook = NULL;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL CGDIHook::EndPaint(HWND hWnd, CONST PAINTSTRUCT *lpPaint) {
  BOOL ret = FALSE;

  if( _EndPaint )
    ret = _EndPaint(hWnd, lpPaint);

  bool is_document = false;
  if (!_document_windows.Lookup(hWnd, is_document)) {
    is_document = IsBrowserDocument(hWnd);
    _document_windows.SetAt(hWnd, is_document);
  }

  if (hWnd && hWnd != _test_state._document_window && 
      !_test_state._exit && _test_state._active && is_document) {
    _test_state.SetDocument(hWnd);
  }

  if (!_test_state._exit && _test_state._active && 
        hWnd == _test_state._document_window) {
    _test_state._screen_updated = true;
    _test_state.CheckStartRender();
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int CGDIHook::ReleaseDC(HWND hWnd, HDC hDC)
{
  int ret = 0;

  if( _ReleaseDC )
    ret = _ReleaseDC(hWnd, hDC);

  bool is_document = false;
  if (!_document_windows.Lookup(hWnd, is_document)) {
    is_document = IsBrowserDocument(hWnd);
    _document_windows.SetAt(hWnd, is_document);
  }

  if (hWnd && hWnd != _test_state._document_window && 
      !_test_state._exit && _test_state._active && is_document) {
    _test_state.SetDocument(hWnd);
  }

  if (!wpt_capturing_screen && !_test_state._exit && _test_state._active && 
        hWnd == _test_state._document_window) {
    _test_state._screen_updated = true;
    _test_state.CheckStartRender();
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL CGDIHook::SetWindowTextA(HWND hWnd, LPCSTR text)
{
  BOOL ret = false;

  if (_SetWindowTextA)
    ret = _SetWindowTextA(hWnd, text);

  if (!_test_state._exit && _test_state._active && 
        hWnd == _test_state._frame_window) {
    CString title((LPCTSTR)CA2T(text));
    if( title.Left(11) != _T("about:blank") && 
        title.Compare(_T("Blank")) )
      _test_state.TitleSet(title);
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL CGDIHook::SetWindowTextW(HWND hWnd, LPCWSTR text)
{
  BOOL ret = false;

  if (_SetWindowTextW)
    ret = _SetWindowTextW(hWnd, text);

  if (!_test_state._exit && _test_state._active && 
        hWnd == _test_state._frame_window) {
    CString title((LPCTSTR)CW2T(text));
    if( title.Left(11) != _T("about:blank") )
      _test_state.TitleSet(title);
  }

  return ret;
}
