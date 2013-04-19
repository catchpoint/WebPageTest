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

// DetailsDlg.cpp : Implementation of CDetailsDlg

#include "stdafx.h"
#include "DetailsDlg.h"


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CDetailsDlg::CDetailsDlg(CTrackedEvent * item):
	w(NULL)
{
	if( item && item->type == CTrackedEvent::etWinInetRequest )
		w = (CWinInetRequest *)item;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LRESULT CDetailsDlg::OnInitDialog(UINT uMsg, WPARAM wParam, LPARAM lParam, BOOL& bHandled)
{
	CAxDialogImpl<CDetailsDlg>::OnInitDialog(uMsg, wParam, lParam, bHandled);
	bHandled = TRUE;
	
	// build the tabs
	TCHAR text[100];
	HWND hTab = GetDlgItem(IDC_TABS).m_hWnd;
	TC_ITEM item;
	item.mask = TCIF_TEXT;
	item.pszText = text;

	lstrcpy(text, _T("Response Headers"));
	TabCtrl_InsertItem(hTab, 0, &item);

	lstrcpy(text, _T("Request Headers"));
	TabCtrl_InsertItem(hTab, 1, &item);

	lstrcpy(text, _T("Details"));
	TabCtrl_InsertItem(hTab, 2, &item);

	if( w && w->body && w->bodyLen)
	{
		CString mime = w->response.contentType;
		mime.MakeLower();
		if( mime.Find(_T("text")) >= 0 || mime.Find(_T("javascript")) >= 0 || mime.Find(_T("json")) >= 0  || mime.Find(_T("x-amf")) >= 0 )
		{
			lstrcpy(text, _T("Content"));
			TabCtrl_InsertItem(hTab, 3, &item);
		}
	}
	
	UpdateText();
	MoveControls();
	
	// set the dialog title
	if( w )
		SetWindowText(w->host + CString(_T(" - ")) + w->object);
	
	return 1;  // Let the system set the focus
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LRESULT CDetailsDlg::OnClose(UINT /*uMsg*/, WPARAM /*wParam*/, LPARAM /*lParam*/, BOOL& /*bHandled*/)
{
	DestroyWindow();
	return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LRESULT CDetailsDlg::OnSize(UINT /*uMsg*/, WPARAM /*wParam*/, LPARAM /*lParam*/, BOOL& /*bHandled*/)
{
	MoveControls();
	return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CDetailsDlg::MoveControls(void)
{
	CRect client;
	GetClientRect(client);

	GetDlgItem(IDC_TABS).MoveWindow(client);
	TabCtrl_AdjustRect(GetDlgItem(IDC_TABS).m_hWnd, false, client);
	GetDlgItem(IDC_DETAILS).MoveWindow(client);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LRESULT CDetailsDlg::OnTcnSelchangeTabs(int /*idCtrl*/, LPNMHDR pNMHDR, BOOL& /*bHandled*/)
{
	UpdateText();
	return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CDetailsDlg::UpdateText(void)
{
	int index = TabCtrl_GetCurSel(GetDlgItem(IDC_TABS));
	CString text;
	
	if( w )
	{
		switch(index)
		{
			case 0:
				text = w->inHeaders;
				break;
				
			case 1:
				text = w->outHeaders;
				break;
				
			case 2:
				text = _T("Under Construction");
				break;
				
			case 3:
				text = (LPCSTR)w->body;
				break;
		}
	}
	
	text.Replace(_T("\n"), _T("\r\n"));
	GetDlgItem(IDC_DETAILS).SetWindowText(text);
}
