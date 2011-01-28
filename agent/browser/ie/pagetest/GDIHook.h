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

typedef BOOL(__stdcall * LPREDRAWWINDOW)(HWND hWnd, CONST RECT *lprcUpdate, HRGN hrgnUpdate, UINT flags);
typedef BOOL(__stdcall * LPBITBLT)( HDC hdc, int x, int y, int cx, int cy, HDC hdcSrc, int x1, int y1, DWORD rop);
typedef HDC(__stdcall * LPBEGINPAINT)(HWND hWnd, LPPAINTSTRUCT lpPaint);
typedef BOOL(__stdcall * LPENDPAINT)(HWND hWnd, CONST PAINTSTRUCT *lpPaint);

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
	
	BOOL	RedrawWindow(HWND hWnd, CONST RECT *lprcUpdate, HRGN hrgnUpdate, UINT flags);
	BOOL	BitBlt( HDC hdc, int x, int y, int cx, int cy, HDC hdcSrc, int x1, int y1, DWORD rop);
	HDC		BeginPaint(HWND hWnd, LPPAINTSTRUCT lpPaint);
	BOOL	EndPaint(HWND hWnd, CONST PAINTSTRUCT *lpPaint);

private:
	NCodeHookIA32	hook;

	LPREDRAWWINDOW	_RedrawWindow;
	LPBITBLT		_BitBlt;
	LPBEGINPAINT	_BeginPaint;
	LPENDPAINT		_EndPaint;
};
