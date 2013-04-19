/*
Copyright (c) 2005-2007, AOL, LLC.

All rights reserved.

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

#pragma once
#include "ncodehook/NCodeHookInstantiation.h"

/******************************************************************************
*******************************************************************************
**																			 **
**								Function Prototypes							 **
**																			 **
*******************************************************************************
******************************************************************************/

typedef BOOL(__stdcall * LPENDPAINT)(HWND hWnd, CONST PAINTSTRUCT *lpPaint);
typedef int (__stdcall * LPRELEASEDC)(HWND hWnd, HDC hDC);
typedef BOOL(__stdcall * LPINVALIDATERECT)(HWND hWnd, const RECT *lpRect,
                                           BOOL bErase);
typedef BOOL(__stdcall * LPINVALIDATERGN)(HWND hWnd, HRGN hRgn, BOOL bErase);
typedef int(__stdcall * LPDRAWTEXTA)(HDC hDC, LPCSTR lpchText, int nCount,
                                     LPRECT lpRect, UINT uFormat);
typedef int(__stdcall * LPDRAWTEXTW)(HDC hDC, LPCWSTR lpchText, int nCount,
                                     LPRECT lpRect, UINT uFormat);
typedef int(__stdcall * LPDRAWTEXTEXA)(HDC hdc, LPSTR lpchText, int cchText,
                                       LPRECT lpRect, UINT dwDTFormat,
                                       LPDRAWTEXTPARAMS lpDTParams);
typedef int(__stdcall * LPDRAWTEXTEXW)(HDC hdc, LPWSTR lpchText, int cchText,
                                       LPRECT lpRect, UINT dwDTFormat,
                                       LPDRAWTEXTPARAMS lpDTParams);
typedef BOOL(__stdcall * LPBITBLT)(HDC hdcDest, int nXDest, int nYDest,
    int nWidth, int nHeight, HDC hdcSrc, int nXSrc, int nYSrc, DWORD dwRop);

/******************************************************************************
*******************************************************************************
**																			 **
**								CGDIHook Class								 **
**																			 **
*******************************************************************************
******************************************************************************/
void GDIInstallHooks(void);
void GDIRemoveHooks(void);

class CGDIHook
{
public:
	CGDIHook(void);
	~CGDIHook(void);
	
	BOOL	EndPaint(HWND hWnd, CONST PAINTSTRUCT *lpPaint);
  int   ReleaseDC(HWND hWnd, HDC hDC);
  BOOL  InvalidateRect(HWND hWnd, const RECT *lpRect, BOOL bErase);
  BOOL  InvalidateRgn(HWND hWnd, HRGN hRgn, BOOL bErase);
  int   DrawTextA(HDC hDC, LPCSTR lpchText, int nCount, LPRECT lpRect,
                  UINT uFormat);
  int   DrawTextW(HDC hDC, LPCWSTR lpchText, int nCount, LPRECT lpRect,
                  UINT uFormat);
  int   DrawTextExA(HDC hdc, LPSTR lpchText, int cchText, LPRECT lpRect,
                    UINT dwDTFormat, LPDRAWTEXTPARAMS lpDTParams);
  int   DrawTextExW(HDC hdc, LPWSTR lpchText, int cchText, LPRECT lpRect,
                    UINT dwDTFormat, LPDRAWTEXTPARAMS lpDTParams);
  BOOL  BitBlt(HDC hdcDest, int nXDest, int nYDest,
    int nWidth, int nHeight, HDC hdcSrc, int nXSrc, int nYSrc, DWORD dwRop);

private:
  void SendPaintEvent(int x, int y, int width, int height);
  bool IsDocumentWindow(HWND hWnd);
  bool IsDocumentDC(HDC hdc);

	NCodeHookIA32	hook;

	LPENDPAINT        EndPaint_;
  LPRELEASEDC       ReleaseDC_;
  LPINVALIDATERECT  InvalidateRect_;
  LPINVALIDATERGN   InvalidateRgn_;
  LPDRAWTEXTA       DrawTextA_;
  LPDRAWTEXTW       DrawTextW_;
  LPDRAWTEXTEXA     DrawTextExA_;
  LPDRAWTEXTEXW     DrawTextExW_;
  LPBITBLT          BitBlt_;
};
