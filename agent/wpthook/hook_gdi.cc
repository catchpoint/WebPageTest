/*
Redistribution and use in source and binary forms, with or without modification, 
are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, 
    this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice, 
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.
    * Neither the name of the company nor the names of its contributors may be 
    used to endorse or promote products derived from this software without 
    specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

#include "StdAfx.h"
#include "hook_gdi.h"

static CGDIHook * pHook = NULL;


/******************************************************************************
*******************************************************************************
**																			                                     **
**							              	Stub Functions								               **
**							                                    												 **
*******************************************************************************
******************************************************************************/

BOOL __stdcall RedrawWindow_Hook(HWND hWnd, CONST RECT *lprcUpdate, 
                                                   HRGN hrgnUpdate, UINT flags)
{
  BOOL ret = FALSE;
  __try{
    if(pHook)
      ret = pHook->RedrawWindow(hWnd, lprcUpdate, hrgnUpdate, flags);
  }__except(1){}
  return ret;
}

BOOL __stdcall BitBlt_Hook( HDC hdc, int x, int y, int cx, int cy, HDC hdcSrc, 
                                                     int x1, int y1, DWORD rop)
{
  BOOL ret = FALSE;
  __try{
    if(pHook)
      ret = pHook->BitBlt( hdc, x, y, cx, cy, hdcSrc, x1, y1, rop);
  }__except(1){}
  return ret;
}

HDC	__stdcall BeginPaint_Hook(HWND hWnd, LPPAINTSTRUCT lpPaint)
{
  HDC ret = NULL;
  __try{
    if(pHook)
      ret = pHook->BeginPaint(hWnd, lpPaint);
  }__except(1){}
  return ret;
}

BOOL __stdcall EndPaint_Hook(HWND hWnd, CONST PAINTSTRUCT *lpPaint)
{
  BOOL ret = FALSE;
  __try{
    if(pHook)
      ret = pHook->EndPaint(hWnd, lpPaint);
  }__except(1){}
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
CGDIHook::CGDIHook(void)
{
  if (!pHook)
    pHook = this;

  ATLTRACE2(_T("[wpthook] CGDIHook::CGDIHook\n"));

  _RedrawWindow = hook.createHookByName("user32.dll", "RedrawWindow", 
                                                            RedrawWindow_Hook);
  _BitBlt = hook.createHookByName("gdi32.dll", "BitBlt", BitBlt_Hook);
  _BeginPaint = hook.createHookByName("user32.dll", "BeginPaint", 
                                                              BeginPaint_Hook);
  _EndPaint = hook.createHookByName("user32.dll", "EndPaint", EndPaint_Hook);

  ATLTRACE2(_T("[wpthook] CGDIHook::CGDIHook Complete\n"));
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CGDIHook::~CGDIHook(void)
{
  if( pHook == this )
    pHook = NULL;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL CGDIHook::RedrawWindow(HWND hWnd, CONST RECT *lprcUpdate, HRGN hrgnUpdate,
                                                                    UINT flags)
{
  BOOL ret = FALSE;

//  ATLTRACE2(_T("[wpthook] CGDIHook::RedrawWindow\n"));

  if( _RedrawWindow )
    ret = _RedrawWindow( hWnd, lprcUpdate, hrgnUpdate, flags );

/*
  if( dlg && (dlg->active || dlg->capturingAFT) && !dlg->painted && !dlg->captureVideo )
  {
    TCHAR className[1000] = {0};
    GetClassName(hWnd, className, _countof(className));

    if( !lstrcmp(className, _T("Internet Explorer_Server")) )
    {
      // check to see if anything has been drawn to the screen
      dlg->CheckPaint(hWnd);
    }
  }
*/

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL CGDIHook::BitBlt( HDC hdc, int x, int y, int cx, int cy, HDC hdcSrc, 
                                                    int x1, int y1, DWORD rop)
{
  BOOL ret = FALSE;

//  ATLTRACE2(_T("[wpthook] CGDIHook::BitBlt\n"));

  if( _BitBlt )
    ret = _BitBlt( hdc, x, y, cx, cy, hdcSrc, x1, y1, rop);
/*
  if( dlg && (dlg->active || dlg->capturingAFT) )
  {
    HWND hWnd = WindowFromDC(hdc);
    if( hWnd == dlg->hBrowserWnd )
      dlg->windowUpdated = true;
  }
*/
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HDC	CGDIHook::BeginPaint(HWND hWnd, LPPAINTSTRUCT lpPaint)
{
  HDC ret = NULL;

//  ATLTRACE2(_T("[wpthook] CGDIHook::BeginPaint\n"));
/*
  if( dlg )
    dlg->OnBeginPaint(hWnd);
*/
  if( _BeginPaint )
    ret = _BeginPaint(hWnd, lpPaint);

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL CGDIHook::EndPaint(HWND hWnd, CONST PAINTSTRUCT *lpPaint)
{
  BOOL ret = FALSE;

//  ATLTRACE2(_T("[wpthook] CGDIHook::EndPaint\n"));

  if( _EndPaint )
    ret = _EndPaint(hWnd, lpPaint);

/*
  if( dlg )
  {
    dlg->OnEndPaint(hWnd);
    if( dlg->captureVideo && !dlg->painted && hWnd == dlg->hBrowserWnd)
      dlg->CheckPaint(hWnd, true);
  }
*/

  return ret;
}
