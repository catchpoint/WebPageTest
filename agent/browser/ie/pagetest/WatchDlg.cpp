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

// WatchDlg.cpp : Implementation of CWatchDlg

#include "stdafx.h"
#include ".\watchdlg.h"
#include "AboutDlg.h"
#include <Commdlg.h>
#include <Richedit.h>

CWatchDlg * dlg = NULL;
DWORD refCount = 0;
DWORD tlsIndex = TLS_OUT_OF_INDEXES;

// Colors used for the UI
const COLORREF colorPage			= RGB(255,220,220);
const COLORREF colorPageSelected	= RGB(255,172,172);
const COLORREF colorDns				= RGB(210,252,255);
const COLORREF colorDnsSelected		= RGB(152,248,255);
const COLORREF colorSocket			= RGB(255,231,208);
const COLORREF colorSocketSelected	= RGB(255,205,158);
const COLORREF colorRequest			= RGB(220,255,220);
const COLORREF colorRequestSelected	= RGB(172,255,172);

const COLORREF colorEven			= RGB(255,255,255);
const COLORREF colorOdd				= RGB(240,240,240);

const COLORREF colorError			= RGB(255,  0,  0);
const COLORREF colorWarning			= RGB(255,255,  0);

const COLORREF colorWhite			= RGB(255,255,255);
const COLORREF colorBlack			= RGB(  0,  0,  0);

const COLORREF colorWaterfallDns			= RGB(  0,123,132);
const COLORREF colorWaterfallSocket			= RGB(255,123,  0);
const COLORREF colorWaterfallSSL			= RGB(207, 37,223);
const COLORREF colorWaterfallRequestTTFB	= RGB(  0,255,  0);
const COLORREF colorWaterfallRequest		= RGB(  0,123,255);

const COLORREF colorStart	= RGB(  0,  0,  0);
const COLORREF colorRender	= RGB( 40,188,  0);
const COLORREF colorLayout	= RGB(255,  0,  0);
const COLORREF colorDOMElement	= RGB(242,131,  0);
const COLORREF colorDone	= RGB(  0,  0,255);
const COLORREF colorDone20	= RGB(  0,  0,128);
const COLORREF colorTime	= RGB(192,192,192);

const double scale[] = {1, 2, 5};

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnInitDialog(UINT uMsg, WPARAM wParam, LPARAM lParam, BOOL& bHandled)
{
  hGDINotifyWindow = m_hWnd;
	CAxDialogImpl<CWatchDlg>::OnInitDialog(uMsg, wParam, lParam, bHandled);
	bHandled = TRUE;

	hSmallIcon = (HICON)LoadImage(_AtlBaseModule.GetModuleInstance(), MAKEINTRESOURCE(IDI_ACTIVE), IMAGE_ICON, GetSystemMetrics(SM_CXSMICON), GetSystemMetrics(SM_CYSMICON), LR_DEFAULTCOLOR);
	if( hSmallIcon )
		SetIcon(hSmallIcon,0);

	hBigIcon = (HICON)LoadImage(_AtlBaseModule.GetModuleInstance(), MAKEINTRESOURCE(IDI_ACTIVE), IMAGE_ICON, GetSystemMetrics(SM_CXICON), GetSystemMetrics(SM_CYICON), LR_DEFAULTCOLOR);
	if( hBigIcon )
		SetIcon(hBigIcon,1);
		
	hCross = (HICON)LoadImage(_AtlBaseModule.GetModuleInstance(), MAKEINTRESOURCE(IDI_CROSS), IMAGE_ICON, 16, 16, LR_DEFAULTCOLOR);
	hCheck = (HICON)LoadImage(_AtlBaseModule.GetModuleInstance(), MAKEINTRESOURCE(IDI_CHECK), IMAGE_ICON, 16, 16, LR_DEFAULTCOLOR);
	hWarn = (HICON)LoadImage(_AtlBaseModule.GetModuleInstance(), MAKEINTRESOURCE(IDI_WARN), IMAGE_ICON, 16, 16, LR_DEFAULTCOLOR);
	hLock = (HICON)LoadImage(_AtlBaseModule.GetModuleInstance(), MAKEINTRESOURCE(IDI_LOCK), IMAGE_ICON, 16, 16, LR_DEFAULTCOLOR);
	hStar = (HICON)LoadImage(_AtlBaseModule.GetModuleInstance(), MAKEINTRESOURCE(IDI_STAR), IMAGE_ICON, 16, 16, LR_DEFAULTCOLOR);
	
	// Create a bunch of stuff for the tree painting
	HWND hWaterfall = GetDlgItem(IDC_WATERFALL).m_hWnd;
	m_nIndent = TreeView_GetIndent(hWaterfall);
	
	defaultFont = GetDlgItem(IDC_WATERFALL).GetFont();
	defaultHeight = TreeView_GetItemHeight(hWaterfall);

	LOGFONT logf;
	memset(&logf, 0, sizeof(logf));
	logf.lfHeight = -9;
	logf.lfQuality = PROOF_QUALITY;
	logf.lfOutPrecision = OUT_TT_PRECIS;
	lstrcpyn( logf.lfFaceName, _T("Microsoft Sans Serif"), sizeof(logf.lfFaceName) );
	smallFont = CreateFontIndirect(&logf);

	hBrPage				= CreateSolidBrush( colorPage );
	hBrPageSelected		= CreateSolidBrush( colorPageSelected );
	hBrDns				= CreateSolidBrush( colorDns );
	hBrDnsSelected		= CreateSolidBrush( colorDnsSelected );
	hBrSocket			= CreateSolidBrush( colorSocket );
	hBrSocketSelected	= CreateSolidBrush( colorSocketSelected );
	hBrRequest			= CreateSolidBrush( colorRequest );
	hBrRequestSelected	= CreateSolidBrush( colorRequestSelected );
	hBrEven				= CreateSolidBrush( colorEven );
	hBrOdd				= CreateSolidBrush( colorOdd );
	hBrError			= CreateSolidBrush( colorError );
	hBrWarning			= CreateSolidBrush( colorWarning );
	
	hBrWhite			= CreateSolidBrush( colorWhite );
	hBrBlack			= CreateSolidBrush( colorBlack );
	
	hBrWaterfallDns			= CreateSolidBrush( colorWaterfallDns );
	hBrWaterfallSocket		= CreateSolidBrush( colorWaterfallSocket );
	hBrWaterfallSSL			= CreateSolidBrush( colorWaterfallSSL );
	hBrWaterfallRequestTTFB	= CreateSolidBrush( colorWaterfallRequestTTFB );
	hBrWaterfallRequest		= CreateSolidBrush( colorWaterfallRequest );

	hPenBlack			= CreatePen(PS_SOLID, 1, colorBlack); 
	hPenStart			= CreatePen(PS_SOLID, 1, colorStart); 
	hPenRender			= CreatePen(PS_SOLID, 2, colorRender); 
	hPenLayout			= CreatePen(PS_SOLID, 2, colorLayout); 
	hPenDOMElement		= CreatePen(PS_SOLID, 2, colorDOMElement); 
	hPenDone			= CreatePen(PS_SOLID, 2, colorDone); 
	hPenDone20			= CreatePen(PS_SOLID, 2, colorDone20); 
	hPenTime			= CreatePen(PS_DASH, 1, colorTime);

	// set up the various tabs
	TCITEM item;
	item.mask = TCIF_TEXT | TCIF_PARAM;
	item.pszText = _T("Waterfall");
	item.lParam = 0;
	SendDlgItemMessage(IDC_TABS, TCM_INSERTITEM, item.lParam, (LPARAM)&item);
	
	// load up the last position for the window
	WINDOWPLACEMENT pl;
	ULONG len = sizeof(pl);
	if( settings.QueryBinaryValue(_T("Placement"), &pl, &len) == ERROR_SUCCESS )
	{
		// TODO: make sure it's actually on the screen
		pl.showCmd = SW_HIDE;
		SetWindowPlacement(&pl);
	}

	MoveControls();
	
	settings.QueryDWORDValue(_T("View Warnings"), warnings);
	CheckMenuItem(GetMenu(), ID_VIEW_OPTIMIZATIONWARNINGS, warnings ? MF_BYCOMMAND | MF_CHECKED : MF_BYCOMMAND | MF_UNCHECKED);

	settings.QueryDWORDValue(_T("Font Size"), fontSize);
	
	if( fontSize )
	{
		GetDlgItem(IDC_WATERFALL).SetFont(smallFont,0);

		if( !smallHeight )
			smallHeight = TreeView_GetItemHeight(hWaterfall) - 2;
		TreeView_SetItemHeight(hWaterfall, smallHeight);

		CheckMenuItem(GetMenu(), ID_FONT_NORMAL, MF_BYCOMMAND | MF_UNCHECKED);
		CheckMenuItem(GetMenu(), ID_FONT_SMALL, MF_BYCOMMAND | MF_CHECKED);
	}
	
	return 1;  // Let the system set the focus
}

/*-----------------------------------------------------------------------------
	Reset all of the UI (make sure this is on the UI thread)
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnResetUI(UINT /*uMsg*/, WPARAM /*wParam*/, LPARAM /*lParam*/, BOOL& /*bHandled*/)
{
	// clear the tree control
	if( IsWindow() && GetDlgItem(IDC_WATERFALL).IsWindow() )
	{
		TreeView_DeleteAllItems(GetDlgItem(IDC_WATERFALL));
		hInsertAfter = 0;
		hBottom = 0;
	}
		
	// forget what was selected
	selectedItem = 0;
		
	// disable the save menu items
	if( IsWindow() )
	{
		HMENU hMenu = GetMenu();
		if( hMenu )
		{
			EnableMenuItem(hMenu, ID_FILE_NEW, MF_BYCOMMAND | MF_GRAYED);
			EnableMenuItem(hMenu, ID_FILE_SAVEOBJECTDATA, MF_BYCOMMAND | MF_GRAYED);
			EnableMenuItem(hMenu, ID_FILE_SAVEREPORT, MF_BYCOMMAND | MF_GRAYED);
			EnableMenuItem(hMenu, ID_FILE_SAVEOPTIMIZATIONREPORT, MF_BYCOMMAND | MF_GRAYED);
			EnableMenuItem(hMenu, ID_FILE_EXPORTWATERFALL, MF_BYCOMMAND | MF_GRAYED);
			EnableMenuItem(hMenu, ID_TOOLS_STOPMEASUREMENT, MF_BYCOMMAND | MF_GRAYED);

			waterfall = true;
		}
	}
	
	// hide the edit control and show the waterfall
	GetDlgItem(IDC_RICHEDIT).ShowWindow(SW_HIDE);
	GetDlgItem(IDC_WATERFALL).ShowWindow(SW_SHOW);
	
	// set the rich edit options
	GetDlgItem(IDC_RICHEDIT).SendMessage(EM_SETOPTIONS, ECOOP_OR, ECO_SAVESEL);
	
	// remove the optimization tabs
	TabCtrl_SetCurSel(GetDlgItem(IDC_TABS), 0);
	TabCtrl_DeleteItem(GetDlgItem(IDC_TABS), 3);
	TabCtrl_DeleteItem(GetDlgItem(IDC_TABS), 2);
	TabCtrl_DeleteItem(GetDlgItem(IDC_TABS), 1);
	
	// remember where the window was
	RememberPosition();

	return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWatchDlg::TestComplete(void)
{
	if( TabCtrl_GetItemCount(GetDlgItem(IDC_TABS)) <= 1 )
	{
		// add the optimization tabs
		TCITEM item;
		item.mask = TCIF_TEXT | TCIF_PARAM;
		item.pszText = _T("Checklist");
		item.lParam = 1;
		SendDlgItemMessage(IDC_TABS, TCM_INSERTITEM, item.lParam, (LPARAM)&item);
		item.pszText = _T("Optimization Report");
		item.lParam = 2;
		SendDlgItemMessage(IDC_TABS, TCM_INSERTITEM, item.lParam, (LPARAM)&item);
		item.pszText = _T("Load Details");
		item.lParam = 3;
		SendDlgItemMessage(IDC_TABS, TCM_INSERTITEM, item.lParam, (LPARAM)&item);
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWatchDlg::Reset(void)
{
	EnterCriticalSection(&cs);
	if( IsWindow() )
		PostMessage(UWM_RESET_UI);
	LeaveCriticalSection(&cs);
	
	__super::Reset();
	
	StopTimers();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnTimer(UINT uMsg, WPARAM wParam, LPARAM /*lParam*/, BOOL& /*bHandled*/)
{
	switch ( wParam )
	{
	    case 1 :	// Activity timer
	        {
				CheckReadyState();
				CheckComplete();
		    }
	        break;

		case 2 :	// urlblaster navigation
			{
				KillTimer(2);
				
				if( !started )
				{
					available = true;
					started = true;
				}
				
				// navigate to the test url - make sure we can't accidentally do this more than once
				if( !testUrl.IsEmpty() )
				{
					exitWhenDone = true;

					//see if it is a script
					if( !testUrl.Left(9).CompareNoCase(_T("script://")) )
					{
						CString script = testUrl.Right(testUrl.GetLength() - 9);
						testUrl.Empty();
						RunScript(script);
					}
					else
					{
						CComBSTR url = testUrl;
						testUrl.Empty();
						if( !browsers.IsEmpty() )
						{
							CBrowserTracker tracker = browsers.GetHead();
							if( tracker.browser && tracker.threadId == GetCurrentThreadId() )
							{
								OutputDebugString(_T("[Pagetest] - Navigating URL\n"));
								tracker.browser->Navigate(url, 0, 0, 0, 0);
							}
						}
					}
				}
			}
			break;
			
		case TIMER_SCRIPT:
			KillTimer(TIMER_SCRIPT);
			ContinueScript(false);
			break;
			
	    default :
	        break;
	}

	return 0;
}

/*-----------------------------------------------------------------------------
	Display the UI and go into interactive mode
-----------------------------------------------------------------------------*/
void CWatchDlg::EnableUI(void)
{
	if( !started )
	{
		Reset();
		available = true;
		started = true;
	}

	interactive = true;
	ShowWindow(SW_SHOW);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnClose(UINT /*uMsg*/, WPARAM /*wParam*/, LPARAM /*lParam*/, BOOL& /*bHandled*/)
{
	// remember where the window was
	RememberPosition();
	
	// just hide the window
	ShowWindow(SW_HIDE);
	
	// close any of the details dialogs that are open
	POSITION pos = detailsDialogs.GetHeadPosition();
	while( pos )
	{
		CDetailsDlg * dlg = detailsDialogs.GetNext(pos);
		if( dlg )
		{
			if( dlg->IsWindow() )
				dlg->SendMessage(WM_CLOSE);
				
			delete dlg;
		}
	}
	detailsDialogs.RemoveAll();
	
	// reset everything
	Reset();
	
	// mark us as available for new navigations
	available = true;
	interactive = false;
	
	return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnDestroy(UINT /*uMsg*/, WPARAM /*wParam*/, LPARAM /*lParam*/, BOOL& /*bHandled*/)
{
	// close any of the details dialogs that are open
	POSITION pos = detailsDialogs.GetHeadPosition();
	while( pos )
	{
		CDetailsDlg * dlg = detailsDialogs.GetNext(pos);
		if( dlg )
		{
			dlg->DestroyWindow();
			delete dlg;
		}
	}
	detailsDialogs.RemoveAll();

	if( hSmallIcon )
		DestroyIcon(hSmallIcon);

	if( hBigIcon )
		DestroyIcon(hBigIcon);
		
	if( hCross )
		DestroyIcon(hCross);

	if( hCheck )
		DestroyIcon(hCheck);

	if( hWarn )
		DestroyIcon(hWarn);

	if( hLock )
		DestroyIcon(hLock);

	if( hStar )
		DestroyIcon(hStar);

	return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnSize(UINT /*uMsg*/, WPARAM /*wParam*/, LPARAM /*lParam*/, BOOL& /*bHandled*/)
{
	// resize all of the controls to match
	MoveControls();
	RepaintWaterfall();
	return 0;
}

/*-----------------------------------------------------------------------------
	Remember where the window is positioned
-----------------------------------------------------------------------------*/
void CWatchDlg::RememberPosition(void)
{
	// make sure we're storing a valid position
	if( IsWindow() && !IsIconic() && !IsZoomed() )
	{
		WINDOWPLACEMENT pl;
		if( GetWindowPlacement(&pl) )
			settings.SetValue(_T("Placement"), REG_BINARY, &pl, sizeof(pl));
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWatchDlg::MoveControls(void)
{
	CRect rect;
	GetClientRect(rect);

	// move the tab control
	GetDlgItem(IDC_TABS).MoveWindow(rect);
	
	// move the tree and edit controls
	TabCtrl_AdjustRect(GetDlgItem(IDC_TABS), FALSE, (LPRECT)rect);
	GetDlgItem(IDC_RICHEDIT).MoveWindow(rect);
	GetDlgItem(IDC_WATERFALL).MoveWindow(rect);
}

/*-----------------------------------------------------------------------------
	Create the dialog - with ref counting
-----------------------------------------------------------------------------*/
void CWatchDlg::CreateDlg(void)
{
	refCount++;
	
	if( !dlg )
	{
		ATLTRACE(_T("[Pagetest] - ***** CWatchDlg::CreateDlg - creating dlg\n"));
		
		tlsIndex = TlsAlloc();
		CWatchDlg * tmp;
		tmp = new CWatchDlg();
		tmp->Create();
		
		dlg = tmp;
	}
}

/*-----------------------------------------------------------------------------
	Destroy the dialog - with ref counting
-----------------------------------------------------------------------------*/
void CWatchDlg::DestroyDlg(void)
{
	ATLTRACE(_T("[Pagetest] - CWatchDlg::DestroyDlg\n"));
	refCount--;
	CWatchDlg * tmp = dlg;

	// write out any results
	// we do this now because a browser window was closed (most likely the one we were tracking)
	if( !refCount && tmp )
	{
		dlg = NULL;

		if ( tmp->active ) 
		{
			tmp->reportSt = QUIT_NOEND;
			if ( !tmp->end )
				QueryPerfCounter(tmp->end);

			tmp->FlushResults();
		}

		tmp->Destroy();
		delete tmp;
	}

	ATLTRACE(_T("[Pagetest] - CWatchDlg::DestroyDlg - complete\n"));
}

/*-----------------------------------------------------------------------------
	Create the dialog
-----------------------------------------------------------------------------*/
void CWatchDlg::Create(void)
{
	EnterCriticalSection(&cs);
	if( !IsWindow() )
	{
		// initialize for Rich Edit 2
		LoadLibraryA("RICHED20.DLL");

		CAxDialogImpl<CWatchDlg>::Create(NULL);
	}
	LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
	Destroy the dialog
-----------------------------------------------------------------------------*/
void CWatchDlg::Destroy(void)
{
	ATLTRACE(_T("[Pagetest] - CWatchDlg::Destroy()"));
	EnterCriticalSection(&cs);
	
	// delete any open sockets that never got closed
	POSITION pos = openSockets.GetStartPosition();
	while( pos )
	{
		CSocketInfo * info = openSockets.GetNextValue(pos);
		if( info )
			delete info;
	}
	openSockets.RemoveAll();
	
	if( IsWindow() )
	{
		// remember where the window was
		RememberPosition();
		DestroyWindow();
	}

	// clean up our drawing items
	DeleteObject(hBrPage);
	DeleteObject(hBrPageSelected);
	DeleteObject(hBrDns);
	DeleteObject(hBrDnsSelected);
	DeleteObject(hBrSocket);
	DeleteObject(hBrSocketSelected);
	DeleteObject(hBrRequest);
	DeleteObject(hBrRequestSelected);
	DeleteObject(hBrWhite);
	DeleteObject(hBrBlack);
	DeleteObject(hBrEven);
	DeleteObject(hBrOdd);
	DeleteObject(hBrError);
	DeleteObject(hBrWarning);
	DeleteObject(hBrWaterfallDns);
	DeleteObject(hBrWaterfallSocket);
	DeleteObject(hBrWaterfallSSL);
	DeleteObject(hBrWaterfallRequestTTFB);
	DeleteObject(hBrWaterfallRequest);

	DeleteObject(hPenBlack);
	DeleteObject(hPenStart);
	DeleteObject(hPenRender);
	DeleteObject(hPenLayout);
	DeleteObject(hPenDOMElement);
	DeleteObject(hPenDone);
	DeleteObject(hPenDone20);
	DeleteObject(hPenTime);

	hBrPage				= NULL;
	hBrPageSelected		= NULL;
	hBrDns				= NULL;
	hBrDnsSelected		= NULL;
	hBrSocket			= NULL;
	hBrSocketSelected	= NULL;
	hBrRequest			= NULL;
	hBrRequestSelected	= NULL;
	hBrWhite			= NULL;
	hBrBlack			= NULL;
	hBrEven				= NULL;
	hBrOdd				= NULL;
	hBrError			= NULL;
	hBrWarning				= NULL;
	hBrWaterfallDns			= NULL;
	hBrWaterfallSocket		= NULL;
	hBrWaterfallSSL			= NULL;
	hBrWaterfallRequestTTFB	= NULL;
	hBrWaterfallRequest		= NULL;

	hPenBlack			= NULL;
	hPenStart			= NULL;
	hPenRender			= NULL;
	hPenLayout			= NULL;
	hPenDOMElement		= NULL;
	hPenDone			= NULL;
	hPenDone20			= NULL;
	hPenTime			= NULL;

	browsers.RemoveAll();	

	LeaveCriticalSection(&cs);

	ATLTRACE(_T("[Pagetest] - CWatchDlg::Destroy() - complete"));
}

int targetWidth = 0;
int targetHeight = 0;
WNDPROC originalWndProc = NULL;
LRESULT APIENTRY wndProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam) 
{
	LRESULT ret = CallWindowProc(originalWndProc, hwnd, uMsg, wParam, lParam); 

	if( targetWidth && targetHeight )
	{
		if(uMsg == WM_GETMINMAXINFO && lParam)
		{
			MINMAXINFO * info = (MINMAXINFO *)lParam;
			info->ptMaxSize.x = targetWidth;
			info->ptMaxSize.y = targetHeight;
		}

		if(uMsg == WM_WINDOWPOSCHANGING && lParam)
		{
			WINDOWPOS * pos = (WINDOWPOS *)lParam;
			pos->cx = targetWidth;
			pos->cy = targetHeight;
		}
	}

    return ret;
} 

/*-----------------------------------------------------------------------------
  Make sure any IE window is set to be topmost and the correct size
-----------------------------------------------------------------------------*/
BOOL CALLBACK PositionBrowser(HWND hwnd, LPARAM lParam) {
  TCHAR class_name[1024];
  if (lParam && IsWindowVisible(hwnd) && 
    GetClassName(hwnd, class_name, _countof(class_name))) {
    _tcslwr(class_name);
    if (_tcsstr(class_name, _T("ieframe"))) {
      RECT * rect = (RECT *)lParam;
      ::SetWindowPos(hwnd, HWND_TOPMOST, rect->left, rect->top, rect->right, rect->bottom, SWP_NOACTIVATE);
      ::UpdateWindow(hwnd);
    }
  }
  return TRUE;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWatchDlg::ResizeWindow(DWORD width, DWORD height)
{
	DWORD left = 0, top = 0;
  if (!width || !height) {
	  CRegKey key;
	  if( key.Open(HKEY_CURRENT_USER, _T("Software\\AOL\\ieWatch"), KEY_READ) == ERROR_SUCCESS )
	  {
		  key.QueryDWORDValue(_T("Window Left"), left);
		  key.QueryDWORDValue(_T("Window Top"), top);
		  key.QueryDWORDValue(_T("Window Width"), width);
		  key.QueryDWORDValue(_T("Window Height"), height);
  	    
      key.DeleteValue(_T("Window Left"));
      key.DeleteValue(_T("Window Top"));
      key.DeleteValue(_T("Window Width"));
      key.DeleteValue(_T("Window Height"));

	    key.Close();
    }
	}
  if( height && width && hMainWindow && ::IsWindow(hMainWindow) ) {
    RECT rect;
    rect.left = left;
    rect.top = top;
    rect.right = width;
    rect.bottom = height;

    EnumWindows(::PositionBrowser, (LPARAM)&rect);

		::ShowWindow(hMainWindow, SW_RESTORE);	// make sure it is not maximized
		::SetWindowPos(hMainWindow, HWND_TOPMOST, left, top, width, height, SWP_NOACTIVATE);
    ::UpdateWindow(hMainWindow);
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWatchDlg::StopTimers()
{
	EnterCriticalSection(&cs);
	// put in a little protection against crashes
	__try
	{
		if( IsWindow() )
		{
			KillTimer(1);
			KillTimer(2);
		}
	}__except(EXCEPTION_EXECUTE_HANDLER)
	{
	}
	LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWatchDlg::StartTimer(UINT_PTR id, UINT elapse)
{
	SetTimer(id, elapse, NULL );
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CWatchDlg::UpdateWaterfall(bool now)
{
	if( interactive || saveEverything )
	{
		if( now )
			SendMessage(UWM_UPDATE_WATERFALL);
		else
			PostMessage(UWM_UPDATE_WATERFALL);
	}
}

/*-----------------------------------------------------------------------------
	Keep track of events as they are added so we can display it in the tree
-----------------------------------------------------------------------------*/
void CWatchDlg::AddEvent(CTrackedEvent * e)
{
	ATLTRACE(_T("[Pagetest] - Adding event 0x%p of type %d\n"), e, e->type);
	__super::AddEvent(e);
	UpdateWaterfall();
}

/*-----------------------------------------------------------------------------
	Update the waterfall display
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnUpdateWaterfall(UINT /*uMsg*/, WPARAM /*wParam*/, LPARAM /*lParam*/, BOOL& /*bHandled*/)
{
	// only update it as we're running if it's visible, otherwise do it after we've processed the results
	if( interactive || processed )
	{
		int maxIndex = -1;

		if( !hInsertAfter )
		{
			// enable the save menu items
			HMENU hMenu = GetMenu();
			if( hMenu )
			{
				EnableMenuItem(hMenu, ID_FILE_NEW, MF_BYCOMMAND | MF_ENABLED);
				EnableMenuItem(hMenu, ID_FILE_SAVEOBJECTDATA, MF_BYCOMMAND | MF_ENABLED);
				EnableMenuItem(hMenu, ID_FILE_SAVEREPORT, MF_BYCOMMAND | MF_ENABLED);
				EnableMenuItem(hMenu, ID_FILE_SAVEOPTIMIZATIONREPORT, MF_BYCOMMAND | MF_ENABLED);
				EnableMenuItem(hMenu, ID_FILE_EXPORTWATERFALL, MF_BYCOMMAND | MF_ENABLED);
				EnableMenuItem(hMenu, ID_TOOLS_STOPMEASUREMENT, MF_BYCOMMAND | MF_ENABLED);
			}

			// make sure we have a blank row at the top and bottom of the waterfall to draw our time scale
			TVINSERTSTRUCT item;
			memset(&item, 0, sizeof(item));
			item.hParent = NULL;
			item.hInsertAfter = TVI_LAST;
			item.itemex.mask = TVIF_PARAM;
			item.itemex.lParam = 0;
			hInsertAfter = TreeView_InsertItem(GetDlgItem(IDC_WATERFALL), &item);
			hBottom = TreeView_InsertItem(GetDlgItem(IDC_WATERFALL), &item);
		}
		
		// loop through all of the events and see which ones aren't in the tree
		POSITION pos = events.GetHeadPosition();
		while( pos )
		{
			CTrackedEvent * e = events.GetNext(pos);
			if( e && !e->hTreeItem )
			{
				bool ok = false;
				int rows = 1;
				
				// add the event to the tree view
				switch( e->type )
				{
					case CTrackedEvent::etPage: 
							ok = true; 
							break;

					case CTrackedEvent::etWinInetRequest:  
							{
								CWinInetRequest * r = (CWinInetRequest *)e;
								if( r->valid )
								{
									ok = true; 
									rows = 6;
								}
							}
							break;
				}
				
				if( ok )
				{
					maxIndex++;
					e->treeIndex = maxIndex;
					
					// insert the base item
					TVINSERTSTRUCT item;
					memset(&item, 0, sizeof(item));
					item.hParent = NULL;
					item.hInsertAfter = hInsertAfter;
					item.itemex.mask = TVIF_TEXT | TVIF_PARAM | TVIF_CHILDREN;
					item.itemex.lParam = (LPARAM)e;
					item.itemex.cChildren = 1;
					item.itemex.pszText = LPSTR_TEXTCALLBACK;
					hInsertAfter = e->hTreeItem = TreeView_InsertItem(GetDlgItem(IDC_WATERFALL), &item);
					
					// insert the child item for the details
					item.hParent = e->hTreeItem;
					item.itemex.mask = TVIF_PARAM | TVIF_INTEGRAL;
					item.itemex.iIntegral = rows;
					TreeView_InsertItem(GetDlgItem(IDC_WATERFALL), &item);
					
					// scroll the tree view into view
					if( hBottom )
						TreeView_EnsureVisible(GetDlgItem(IDC_WATERFALL), hBottom);
					else
						TreeView_EnsureVisible(GetDlgItem(IDC_WATERFALL), e->hTreeItem);
				}
			}
			else if(e && e->treeIndex > maxIndex)
				maxIndex = e->treeIndex;
		}

		// repaint the UI NOW
		GetDlgItem(IDC_WATERFALL).Invalidate(0);
		GetDlgItem(IDC_WATERFALL).UpdateWindow();
	}
	
	return 0;
}

/*-----------------------------------------------------------------------------
	Handle custom drawing of the waterfall
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnNMCustomdrawWaterfall(int /*idCtrl*/, LPNMHDR pNMHDR, BOOL& bHandled)
{
	LPNMTVCUSTOMDRAW pCustomDraw = reinterpret_cast<LPNMTVCUSTOMDRAW>(pNMHDR);
	LRESULT ret = CDRF_DODEFAULT;
	bHandled = TRUE;

	switch(pCustomDraw->nmcd.dwDrawStage)
	{
		case CDDS_PREPAINT: ret = CDRF_NOTIFYITEMDRAW; break;
		
		case CDDS_ITEMPREPAINT:
				{
					CRect rect(pCustomDraw->nmcd.rc);
					HDC hDC = pCustomDraw->nmcd.hdc;
					
					// Create a memory DC for the drawing and then blit it to the screen
					HDC hMemDC = CreateCompatibleDC(hDC);
					if( hMemDC )
					{
						HBITMAP hBitmap = CreateCompatibleBitmap(hDC, rect.Width(), rect.Height());
						if( hBitmap )
						{
							HBITMAP oldBitmap = (HBITMAP)SelectObject(hMemDC, hBitmap);
							
							CRect memRect(0,0,0,0);
							memRect.right = rect.Width();
							memRect.bottom = rect.Height();
							
							// fill in the whole rect as white for starters
							FillRect(hMemDC, memRect, hBrWhite);
							
							HFONT hFont = defaultFont;
							if( fontSize )								
								hFont = smallFont;
								
							HFONT oldFont = (HFONT)SelectObject(hMemDC, hFont);
							
							// draw the actual item
							CTrackedEvent * e = (CTrackedEvent *)pCustomDraw->nmcd.lItemlParam;
							if( pCustomDraw->iLevel )
								DrawDetails(pCustomDraw, e, hMemDC, memRect);
							else
								DrawItem(pCustomDraw, e, hMemDC, memRect, waterfall);
								
							// blit it to the screen
							BitBlt(hDC, rect.left, rect.top, rect.Width(), rect.Height(), hMemDC, 0, 0, SRCCOPY );

							SelectObject(hMemDC, oldFont);
							SelectObject(hMemDC, oldBitmap);
							DeleteObject(hBitmap);
						}
						
						DeleteDC(hMemDC);
					}

					ret = CDRF_SKIPDEFAULT;
				}
				break;
    }
	
	return ret;
}

/*-----------------------------------------------------------------------------
	Figure out what the background color should be for the item
-----------------------------------------------------------------------------*/
void CWatchDlg::GetBackgroundColor(CTrackedEvent * e, bool selected, HBRUSH &brush, COLORREF &color)
{
	brush = hBrEven;
	color = colorEven;
	
	if( e )
	{
		if(!selected && !e->highlighted)
		{
			if( e->treeIndex % 2)
			{
				brush = hBrOdd;
				color = colorOdd;
			}
		}
		else
		{
			switch(e->type)
			{
				case CTrackedEvent::etPage:
						if( selected )
						{
							brush = hBrPageSelected;
							color = colorPageSelected;
						}
						else
						{
							brush = hBrPage;
							color = colorPage;
						}
						break;
						
				case CTrackedEvent::etWinInetRequest:
						{
							CWinInetRequest * r = (CWinInetRequest *)e;
							if( r->dnsStart )
							{
								if( selected )
								{
									brush = hBrDnsSelected;
									color = colorDnsSelected;
								}
								else
								{
									brush = hBrDns;
									color = colorDns;
								}
							}
							else if( r->socketConnect )
							{
								if( selected )
								{
									brush = hBrSocketSelected;
									color = colorSocketSelected;
								}
								else
								{
									brush = hBrSocket;
									color = colorSocket;
								}
							}
							else
							{
								if( selected )
								{
									brush = hBrRequestSelected;
									color = colorRequestSelected;
								}
								else
								{
									brush = hBrRequest;
									color = colorRequest;
								}
							}
						}
						break;
			}
		}
	}
}

/*-----------------------------------------------------------------------------
	Draw the waterfall line for the specified item
-----------------------------------------------------------------------------*/
void CWatchDlg::DrawItem(LPNMTVCUSTOMDRAW pCustomDraw, CTrackedEvent * e, HDC hDC, CRect &rect, BOOL drawWaterfall)
{
	bool selected = false;
	if( pCustomDraw )
		selected = pCustomDraw->nmcd.uItemState & CDIS_SELECTED;

	CSocketRequest * r = 0;
	CWinInetRequest * w = 0;
	if( e && e->type == CTrackedEvent::etWinInetRequest )
	{
		w = (CWinInetRequest *)e;
		r = (CSocketRequest *)w->linkedRequest;
	}
	
	// fill in the background color
	HBRUSH hBrush;
	COLORREF color;

	if( drawWaterfall )
		GetBackgroundColor(e, selected, hBrush, color);
	else
	{
		if( selected )
		{
			hBrush = hBrDnsSelected;
			color = colorDnsSelected;
		}
		else if( e && e->treeIndex % 2)
		{
			hBrush = hBrOdd;
			color = colorOdd;
		}
		else
		{
			hBrush = hBrEven;
			color = colorEven;
		}
	}
	
	// highlight warnings and errors
	if( w && ((w->result >= 300 && w->result != -1) || (!active && (int)(w->result) < 0)) )
	{
		if( w->result != 401 && (w->result >= 400 || (int)(w->result) < 0) )
		{
			hBrush = hBrError;
			color = colorError;
		}
		else
		{
			hBrush = hBrWarning;
			color = colorWarning;
		}
	}
	else if( r && ((r->response.code >= 300 && r->response.code != -1) || (!active && (int)(r->response.code) < 0)) )
	{
		if( r->response.code != 401 && (r->response.code >= 400 || (int)(r->response.code) < 0) )
		{
			hBrush = hBrError;
			color = colorError;
		}
		else
		{
			hBrush = hBrWarning;
			color = colorWarning;
		}
	}

	if( hBrush )
		FillRect(hDC, rect, hBrush);
	
	CRect rcText(rect);
	rcText.DeflateRect(0,0, 3 * rect.Width() / 4, 0);

	SetTextColor(hDC, colorBlack);
	SetBkColor(hDC, color);

	if( e )
	{
		// draw the +/- expanding button (only when painting the tree view, not when printing)
		if( pCustomDraw )
		{
			// get the state of the box
			UINT expanded = TreeView_GetItemState(GetDlgItem(IDC_WATERFALL), e->hTreeItem, TVIS_EXPANDED);
			int h = rcText.Height();
			int x = rcText.left + (m_nIndent - 9) / 2;
			int y = rcText.top + (h - 9) / 2 + 1; 
			HPEN hOldPen = (HPEN) ::SelectObject(hDC, hPenBlack); 
			HBRUSH hOldBrush = (HBRUSH) ::SelectObject(hDC, hBrWhite); // 
			
			// Draw the box
			Rectangle(hDC, x, y, x+9, y+9); 

			// Now, the - or + sign
			LineHorz(hDC, x + 2, x + 7, y + 4);  // '-' 
			if(!(expanded & TVIS_EXPANDED)) 
				LineVert(hDC, x + 4, y + 2, y + 7); // '+' 

			SelectObject(hDC, hOldPen); 
			SelectObject(hDC, hOldBrush); 
			
			// shrink our drawing box to accomodate for the expanding box
			rcText.left += m_nIndent;
		}
	
		// draw an optimization warning if necessary
/*		if( warnings && r && r->warning )
		{
			DrawIconEx(hDC, rcText.left, rcText.top, hWarn, 0, 0, 0, 0, DI_NORMAL);
			rcText.left += 16;
		}
*/		
		// draw the star icon if it is a request to a network of interest
		if( w && w->flagged )
		{
			DrawIconEx(hDC, rcText.left, rcText.top, hStar, 0, 0, 0, 0, DI_NORMAL);
			rcText.left += 16;
		}

		// draw the lock icon if it is a secure request
		if( w && w->secure )
		{
			DrawIconEx(hDC, rcText.left, rcText.top, hLock, 0, 0, 0, 0, DI_NORMAL);
			rcText.left += 16;
		}
	
		// draw the text for the item
		CString text;
		GetItemText(e, text, pCustomDraw ? false : true);
		rcText.left += 2;
		DrawText(hDC, text, -1, rcText, DT_LEFT | DT_NOPREFIX | DT_SINGLELINE | DT_VCENTER);
	}
	
	// draw the waterfall entry or optimization report for this item
	if( drawWaterfall )
		DrawItemWaterfall( e, hDC, rect);
	else
		DrawItemChecklist( e, hDC, rect);
}

/*-----------------------------------------------------------------------------
	Draw the waterfall line for the specified item
-----------------------------------------------------------------------------*/
void CWatchDlg::DrawItemWaterfall(CTrackedEvent * e, HDC hDC, CRect &rect)
{
	if( lastRequest && start )
	{
		CRect rc(rect);
		rc.DeflateRect(rect.Width() / 4, 0, 2, 0);
		
		double width = rc.Width();
		double range = (double)(lastRequest - start);
		
		// draw the time scale lines
		HPEN hOldPen = (HPEN)SelectObject(hDC, hPenTime); 
		if( range > 0 )
		{
			int maxIndex = _countof(scale) - 1;
			int index = maxIndex;
			double mult = 1;
			double inc = (mult * scale[index]) * freq;
			while( range / inc < 20 )
			{
				index--;
				if( index < 0 )
				{
					index = maxIndex;
					mult /= 10;
				}
				inc = (mult * scale[index]) * freq;
			}
			while( range / inc > 20 )
			{
				index++;
				if( index > maxIndex )
				{
					index = 0;
					mult *= 10;
				}
				inc = (mult * scale[index]) * freq;
			}
			double pos = inc;
			double tmInc = mult * scale[index];
			double tm = tmInc;
			while( pos < range )
			{
				int x = (int)((pos / range) * width);
				if( e )
					LineVert(hDC, rc.left + x, rc.top, rc.bottom); 
				else
				{
					CRect textRect(rc);
					int offset = (int)(((range / inc) * width) / 2);
					textRect.left = rc.left + x - offset;
					textRect.right = rc.left + x + offset;
					CString val;
					if( tmInc < 1 )
					{
						if( tmInc < 0.1 )
							val.Format(_T("%0.2f"), tm);
						else
							val.Format(_T("%0.1f"), tm);
					}
					else
						val.Format(_T("%0.0f"), tm);
					DrawText(hDC, val, -1, textRect, DT_CENTER | DT_VCENTER | DT_NOPREFIX | DT_SINGLELINE);
				}
				tm += tmInc;
				pos += inc;
			}
		}

		// draw the start, render and done lines
		int s = 0, l = 0, d = 0;
		SelectObject(hDC, hPenStart); 
		LineVert(hDC, rc.left, rc.top, rc.bottom); 
		if( startRender && startRender >= start && startRender <= lastRequest)
		{
			s = (int)(((double)(startRender - start) / range) * width);
			SelectObject(hDC, hPenRender); 
			LineVert(hDC, rc.left + s, rc.top, rc.bottom); 
		}

		// draw the layout changed lines
		POSITION pos = layoutChanged.GetHeadPosition();
		while( pos )
		{
			__int64 layout = layoutChanged.GetNext(pos);
			if( layout && layout >= start && layout <= lastRequest)
			{
				l = (int)(((double)(layout - start) / range) * width);
				l <= s ? l = s + 2 : 0;
				SelectObject(hDC, hPenLayout); 
				LineVert(hDC, rc.left + l, rc.top, rc.bottom); 
			}
		}

		// draw the DOM element time
		if( domElement && domElement >= start && domElement <= lastRequest)
		{
			d = (int)(((double)(domElement - start) / range) * width);
			d == s ? d+=2:0;
			d == l ? d+=2:0;
			SelectObject(hDC, hPenDOMElement); 
			LineVert(hDC, rc.left + d, rc.top, rc.bottom); 
		}

		// draw the document complete line
		if( !currentDoc && endDoc && endDoc >= start && endDoc <= lastRequest)
		{
			int x = (int)(((double)(endDoc - start) / range) * width);
			x == s ? x+=2:0;
			x == l ? x+=2:0;
			x == d ? x+=2:0;
			SelectObject(hDC, hPenDone); 
			LineVert(hDC, rc.left + x, rc.top, rc.bottom); 
		}

		SelectObject(hDC, hOldPen); 

		if( e )
		{
			DWORD responseCode = 0;
			
			// put a gap between rows
			rc.DeflateRect(0, 1, 0, 1);

			HBRUSH hBr = NULL, hBr3 = NULL, hBr4 = NULL, hBr5 = NULL, hBrSSL = NULL;
			COLORREF c1, c3, c4, c5, cSSL;
			double x1 = 0.0, x2 = 0.0, x3 = 0.0, x4 = 0.0, x5 = 0.0, xSSL = 0.0;

			__int64 startTime = e->start;
			__int64 endTime = e->end;
			
			if( !endTime || endTime > lastRequest)
				endTime = lastRequest;
				
			if( startTime < start )
				startTime = start;
			if( startTime > lastRequest )
				startTime = lastRequest;
			
			if( startTime )
				x1 = (double)(startTime - start) / range;
				
			if( e->type == CTrackedEvent::etWinInetRequest )
			{
				CWinInetRequest * r = (CWinInetRequest *)e;

				if( r->dnsStart )
				{
					hBr = hBrWaterfallDns;
					c1 = colorWaterfallDns;
				}
				
				if( r->socketConnect && r->socketConnect >= start && r->socketConnect <= lastRequest )
				{
					x3 = (double)(r->socketConnect - start) / range;
					hBr3 = hBrWaterfallSocket;
					c3 = colorWaterfallSocket;

					if( r->secure )
					{
						xSSL = (double)(r->socketConnected - start) / range;
						hBrSSL = hBrWaterfallSSL;
						cSSL = colorWaterfallSSL;
					}
				}
				
				if( r->requestSent && r->requestSent >= start && r->requestSent <= lastRequest )
				{
					x4 = (double)(r->requestSent - start) / range;
					hBr4 = hBrWaterfallRequestTTFB;
					c4 = colorWaterfallRequestTTFB;
				}

				if( r->firstByte && r->firstByte >= start && r->firstByte <= lastRequest )
				{
					x5 = (double)(r->firstByte - start) / range;
					hBr5 = hBrWaterfallRequest;
					c5 = colorWaterfallRequest;
				}
				
				responseCode = r->result;
			}

			if( endTime && endTime >= start && endTime <= lastRequest )
				x2 = (double)(endTime - start) / range;
			
			// draw the actual rectangles
			CRect drawRect(rc);
			drawRect.left = rc.left + (LONG)(width * x1);
			drawRect.right = rc.left + (LONG)(width * x2);
			// make sure at least a line shows up
			if( drawRect.right <= drawRect.left )
				drawRect.right = drawRect.left + 1;

			if( hBr )
				DrawBar(hDC, drawRect, c1);
			
			if( hBr3 )
			{
				CRect drawRect2(rc);
				drawRect2.left = rc.left + (LONG)(width * x3);
				drawRect2.right = rc.left + (LONG)(width * x2);
				// make sure at least a line shows up
				if( drawRect2.right <= drawRect2.left )
					drawRect2.right = drawRect2.left + 1;
				DrawBar(hDC, drawRect2, c3);
			}

			if( hBrSSL )
			{
				CRect drawRect2(rc);
				drawRect2.left = rc.left + (LONG)(width * xSSL);
				drawRect2.right = rc.left + (LONG)(width * x2);
				// make sure at least a line shows up
				if( drawRect2.right <= drawRect2.left )
					drawRect2.right = drawRect2.left + 1;
				DrawBar(hDC, drawRect2, cSSL);
			}

			if( hBr4 )
			{
				CRect drawRect2(rc);
				drawRect2.left = rc.left + (LONG)(width * x4);
				drawRect2.right = rc.left + (LONG)(width * x2);
				// make sure at least a line shows up
				if( drawRect2.right <= drawRect2.left )
					drawRect2.right = drawRect2.left + 1;
				DrawBar(hDC, drawRect2, c4);
			}

			if( hBr5 )
			{
				CRect drawRect2(rc);
				drawRect2.left = rc.left + (LONG)(width * x5);
				drawRect2.right = rc.left + (LONG)(width * x2);
				// make sure at least a line shows up
				if( drawRect2.right <= drawRect2.left )
					drawRect2.right = drawRect2.left + 1;
				DrawBar(hDC, drawRect2, c5);
			}
			
			// put a label next to the box with the time it took
			if( endTime && endTime >= startTime && endTime <= lastRequest )
			{
				CString szTime;
				szTime.Format(_T("%d ms"), e->end > e->start ? (DWORD)((e->end - e->start) / msFreq) : 0);
				
				// do we need to include the response code?
				if( (responseCode >= 300 && responseCode != -1) || (!active && (int)responseCode < 100) )
				{
					CString buff;
					buff.Format(_T(" (%d)"), responseCode);
					szTime += buff;
				}

				// figure out which side to put it on
				CRect leftRect(rc);
				CRect rightRect(rc);
				leftRect.right = drawRect.left - 2;
				rightRect.left = drawRect.right + 2;
				
				DWORD align;
				if( leftRect.Width() > rightRect.Width() )
				{
					drawRect = leftRect;
					align = DT_RIGHT;
				}
				else
				{
					drawRect = rightRect;
					align = DT_LEFT;
				}
				DrawText(hDC, szTime, -1, drawRect, align | DT_NOPREFIX | DT_SINGLELINE | DT_VCENTER);
			}
		}
	}
}

/*-----------------------------------------------------------------------------
	Draw the optimization checklist for the specified item
-----------------------------------------------------------------------------*/
void CWatchDlg::DrawItemChecklist(CTrackedEvent * e, HDC hDC, CRect &rect)
{
	const int standards = 9;
	
	// get the underlying request for this line
	CWinInetRequest * w = 0;
	if( e && e->type == CTrackedEvent::etWinInetRequest )
		w = (CWinInetRequest *)e;

	// draw the columns
	CRect rc(rect);
	rc.DeflateRect(rect.Width() / 4, 0, 0, 0);
	
	// draw the start, render and done lines
	int x = rc.left;
	int width = rc.Width() / standards;
	HPEN hOldPen = (HPEN)SelectObject(hDC, hPenStart); 

	for( int i = 0; i < standards; i++ )
	{
		LineVert(hDC, x, rc.top, rc.bottom); 
		x+=width;
	}
	
	if( !e )
	{
		// draw the column headers
		CRect drawRect(rc);
		drawRect.right = drawRect.left + width;
		DrawText(hDC, _T("Cache Static"), -1, drawRect, DT_CENTER | DT_NOPREFIX | DT_SINGLELINE | DT_VCENTER);

		drawRect.left += width;
		drawRect.right += width;
		DrawText(hDC, _T("Use a CDN"), -1, drawRect, DT_CENTER | DT_NOPREFIX | DT_SINGLELINE | DT_VCENTER);

		drawRect.left += width;
		drawRect.right += width;
		DrawText(hDC, _T("Combine CSS/JS"), -1, drawRect, DT_CENTER | DT_NOPREFIX | DT_SINGLELINE | DT_VCENTER);

		drawRect.left += width;
		drawRect.right += width;
		DrawText(hDC, _T("GZIP text"), -1, drawRect, DT_CENTER | DT_NOPREFIX | DT_SINGLELINE | DT_VCENTER);

		drawRect.left += width;
		drawRect.right += width;
		DrawText(hDC, _T("Compress Images"), -1, drawRect, DT_CENTER | DT_NOPREFIX | DT_SINGLELINE | DT_VCENTER);
		
		drawRect.left += width;
		drawRect.right += width;
		DrawText(hDC, _T("Keep-Alive"), -1, drawRect, DT_CENTER | DT_NOPREFIX | DT_SINGLELINE | DT_VCENTER);

		drawRect.left += width;
		drawRect.right += width;
		DrawText(hDC, _T("Cookies"), -1, drawRect, DT_CENTER | DT_NOPREFIX | DT_SINGLELINE | DT_VCENTER);

		drawRect.left += width;
		drawRect.right += width;
		DrawText(hDC, _T("Minify JS"), -1, drawRect, DT_CENTER | DT_NOPREFIX | DT_SINGLELINE | DT_VCENTER);

		drawRect.left += width;
		drawRect.right += width;
		DrawText(hDC, _T("No ETags"), -1, drawRect, DT_CENTER | DT_NOPREFIX | DT_SINGLELINE | DT_VCENTER);
	}
	else if( e->type == CTrackedEvent::etPage )
	{
		CString buff;
		
		// draw the scores
		CRect drawRect(rc);
		drawRect.right = drawRect.left + width;
		buff.Format(_T("%d%%"), cacheScore);
		DrawText(hDC, cacheScore > -1 ? buff : _T("N/A"), -1, drawRect, DT_CENTER | DT_NOPREFIX | DT_SINGLELINE | DT_VCENTER);

		drawRect.left += width;
		drawRect.right += width;
		buff.Format(_T("%d%%"), staticCdnScore);
		DrawText(hDC, staticCdnScore > -1 ? buff : _T("N/A"), -1, drawRect, DT_CENTER | DT_NOPREFIX | DT_SINGLELINE | DT_VCENTER);

		drawRect.left += width;
		drawRect.right += width;
		buff.Format(_T("%d%%"), combineScore);
		DrawText(hDC, combineScore > -1 ? buff : _T("N/A"), -1, drawRect, DT_CENTER | DT_NOPREFIX | DT_SINGLELINE | DT_VCENTER);

		drawRect.left += width;
		drawRect.right += width;
		buff.Format(_T("%d%%"), gzipScore);
		DrawText(hDC, gzipScore > -1 ? buff : _T("N/A"), -1, drawRect, DT_CENTER | DT_NOPREFIX | DT_SINGLELINE | DT_VCENTER);

		drawRect.left += width;
		drawRect.right += width;
		buff.Format(_T("%d%%"), compressionScore);
		DrawText(hDC, compressionScore > -1 ? buff : _T("N/A"), -1, drawRect, DT_CENTER | DT_NOPREFIX | DT_SINGLELINE | DT_VCENTER);
		
		drawRect.left += width;
		drawRect.right += width;
		buff.Format(_T("%d%%"), keepAliveScore);
		DrawText(hDC, keepAliveScore > -1 ? buff : _T("N/A"), -1, drawRect, DT_CENTER | DT_NOPREFIX | DT_SINGLELINE | DT_VCENTER);

		drawRect.left += width;
		drawRect.right += width;
		buff.Format(_T("%d%%"), cookieScore);
		DrawText(hDC, cookieScore > -1 ? buff : _T("N/A"), -1, drawRect, DT_CENTER | DT_NOPREFIX | DT_SINGLELINE | DT_VCENTER);

		drawRect.left += width;
		drawRect.right += width;
		buff.Format(_T("%d%%"), minifyScore);
		DrawText(hDC, minifyScore > -1 ? buff : _T("N/A"), -1, drawRect, DT_CENTER | DT_NOPREFIX | DT_SINGLELINE | DT_VCENTER);

		drawRect.left += width;
		drawRect.right += width;
		buff.Format(_T("%d%%"), etagScore);
		DrawText(hDC, etagScore > -1 ? buff : _T("N/A"), -1, drawRect, DT_CENTER | DT_NOPREFIX | DT_SINGLELINE | DT_VCENTER);
	}
	else if( w )
	{
		CRect drawRect(rc);
		drawRect.left += (width / 2) - 8;
		
		if( w->cacheScore == 100 )
			DrawIconEx(hDC, drawRect.left, drawRect.top, hCheck, 0, 0, 0, 0, DI_NORMAL);
		else if( w->cacheScore == 0 )
			DrawIconEx(hDC, drawRect.left, drawRect.top, hCross, 0, 0, 0, 0, DI_NORMAL);
		else if( w->cacheScore > 0 && w->cacheScore < 100)
			DrawIconEx(hDC, drawRect.left, drawRect.top, hWarn, 0, 0, 0, 0, DI_NORMAL);

		drawRect.left += width;
		if( w->staticCdnScore == 100 )
			DrawIconEx(hDC, drawRect.left, drawRect.top, hCheck, 0, 0, 0, 0, DI_NORMAL);
		else if( w->staticCdnScore == 0 )
			DrawIconEx(hDC, drawRect.left, drawRect.top, hCross, 0, 0, 0, 0, DI_NORMAL);

		drawRect.left += width;
		if( w->combineScore == 100 )
			DrawIconEx(hDC, drawRect.left, drawRect.top, hCheck, 0, 0, 0, 0, DI_NORMAL);
		else if( w->combineScore == 0 )
			DrawIconEx(hDC, drawRect.left, drawRect.top, hCross, 0, 0, 0, 0, DI_NORMAL);

		drawRect.left += width;
		if( w->gzipScore == 100 )
			DrawIconEx(hDC, drawRect.left, drawRect.top, hCheck, 0, 0, 0, 0, DI_NORMAL);
		else if( w->gzipScore == 0 )
			DrawIconEx(hDC, drawRect.left, drawRect.top, hCross, 0, 0, 0, 0, DI_NORMAL);

		drawRect.left += width;
		if( w->compressionScore == 100 )
			DrawIconEx(hDC, drawRect.left, drawRect.top, hCheck, 0, 0, 0, 0, DI_NORMAL);
		else if( w->compressionScore == 0 )
			DrawIconEx(hDC, drawRect.left, drawRect.top, hCross, 0, 0, 0, 0, DI_NORMAL);
		else if( w->compressionScore > 0 && w->compressionScore < 100)
			DrawIconEx(hDC, drawRect.left, drawRect.top, hWarn, 0, 0, 0, 0, DI_NORMAL);

		drawRect.left += width;
		if( w->keepAliveScore == 100 )
			DrawIconEx(hDC, drawRect.left, drawRect.top, hCheck, 0, 0, 0, 0, DI_NORMAL);
		else if( w->keepAliveScore == 0 )
			DrawIconEx(hDC, drawRect.left, drawRect.top, hCross, 0, 0, 0, 0, DI_NORMAL);

		drawRect.left += width;
		if( w->cookieScore == 100 )
			DrawIconEx(hDC, drawRect.left, drawRect.top, hCheck, 0, 0, 0, 0, DI_NORMAL);
		else if( w->cookieScore == 0 )
			DrawIconEx(hDC, drawRect.left, drawRect.top, hCross, 0, 0, 0, 0, DI_NORMAL);
		else if( w->cookieScore > 0 && w->cookieScore < 100)
			DrawIconEx(hDC, drawRect.left, drawRect.top, hWarn, 0, 0, 0, 0, DI_NORMAL);

		drawRect.left += width;
		if( w->minifyScore == 100 )
			DrawIconEx(hDC, drawRect.left, drawRect.top, hCheck, 0, 0, 0, 0, DI_NORMAL);
		else if( w->minifyScore == 0 )
			DrawIconEx(hDC, drawRect.left, drawRect.top, hCross, 0, 0, 0, 0, DI_NORMAL);
		else if( w->minifyScore > 0 && w->minifyScore < 100)
			DrawIconEx(hDC, drawRect.left, drawRect.top, hWarn, 0, 0, 0, 0, DI_NORMAL);

		drawRect.left += width;
		if( w->etagScore == 100 )
			DrawIconEx(hDC, drawRect.left, drawRect.top, hCheck, 0, 0, 0, 0, DI_NORMAL);
		else if( w->etagScore == 0 )
			DrawIconEx(hDC, drawRect.left, drawRect.top, hCross, 0, 0, 0, 0, DI_NORMAL);

	}
}

/*-----------------------------------------------------------------------------
	Draw the details for the specific item
-----------------------------------------------------------------------------*/
void CWatchDlg::DrawDetails(LPNMTVCUSTOMDRAW pCustomDraw, CTrackedEvent * e, HDC hDC, CRect &rect)
{
	bool selected = false;
	if( pCustomDraw )
		selected = pCustomDraw->nmcd.uItemState & CDIS_SELECTED;

	HBRUSH hBrush;
	COLORREF color;
	GetBackgroundColor(e, selected, hBrush, color);
	if( hBrush )
		FillRect(hDC, rect, hBrush);
		
	// draw the actual text
	CRect rcText(rect);
	rcText.DeflateRect(m_nIndent,2, 2, 2);
	CString text;
	GetDetailText(e, text);
	rect.left += 4;
	SetTextColor(hDC, colorBlack);
	SetBkColor(hDC, color);
	DrawText(hDC, text, -1, rcText, DT_LEFT | DT_NOPREFIX | DT_TOP);
}

/*-----------------------------------------------------------------------------
	Get the text to display for a single item
-----------------------------------------------------------------------------*/
void CWatchDlg::GetItemText(CTrackedEvent * e, CString &text, bool includeIndex)
{
	switch(e->type)
	{
		case CTrackedEvent::etPage:
				{
					text = url;
					int index = text.Find(_T('?'));
					if( index > 0 )
						text = text.Left(index);
					text = text.Left(50);
				}
				break;

		case CTrackedEvent::etWinInetRequest:
				{
					CWinInetRequest * r = (CWinInetRequest*)e;
					CString obj = r->object;
					int index = obj.Find(_T('?'));
					if( index > 0 )
						obj = obj.Left(index);

					CString object = PathFindFileName(obj);
					if( object.GetLength() > 25 )
						object = CString(_T("...")) + object.Right(25);
					text = r->host + CString(_T(" - ")) + object;
				}
				break;
	}
	
	if( e && e->treeIndex && includeIndex)
	{
		CString buff;
		buff.Format(_T("%d: "), e->treeIndex);
		text = buff + text;
	}
}

/*-----------------------------------------------------------------------------
	Get the text for the detail view
-----------------------------------------------------------------------------*/
void CWatchDlg::GetDetailText(CTrackedEvent * e, CString & text)
{
	DWORD msLoad = e->end < e->start ? 0 : (DWORD)((e->end - e->start)/msFreq);
	CString buff;
	
	switch(e->type)
	{
		case CTrackedEvent::etPage:
				text = url;
				break;

		case CTrackedEvent::etWinInetRequest:
				{
					CWinInetRequest * w = (CWinInetRequest *)e;
					text = _T("Time: ");
					if( w->tmLoad )
					{
						buff.Format(_T("%d ms"), w->tmLoad);
						text += buff;
					}
					text += _T("\r\n     ");

					if( w->tmDNS != -1 )
					{
						buff.Format(_T("DNS: %d ms, "), w->tmDNS);
						text += buff;
					}
					if( w->socketConnect )
					{
						buff.Format(_T("Socket Connect: %d ms, "), w->tmSocket);
						text += buff;

						if( w->secure )
						{
							buff.Format(_T("SSL: %d ms, "), w->tmSSL);
							text += buff;
						}
					}

					buff.Format(_T("Request time: %d ms, "), w->tmRequest);
					text += buff;

					buff.Format(_T("Content download: %d ms"), w->tmDownload);
					text += buff;
					
					buff.Format(_T("\r\nResponse Code: %d"), w->result);
					text += buff;
					
					text += _T("\r\nHost: ");
					text += w->host;
					if( w->peer.sin_addr.S_un.S_addr )
					{
						text += _T(" (");
						text += CA2T(inet_ntoa(w->peer.sin_addr));
						text += _T(")");
					}
					
					text += _T("\r\nUrl: ");
					text += w->scheme + CString(_T("//")) + w->host + w->object;
					
					if( w->socketId )
					{
						buff.Format(_T("\r\nSocket ID: %d"), w->socketId);
						text += buff;
					}

					buff.Format(_T("\r\nBytes: %d in, %d out"), w->in, w->out);
					text += buff;
				}
				break;
	}
}

/*-----------------------------------------------------------------------------
	Force the waterfall to redraw
-----------------------------------------------------------------------------*/
void CWatchDlg::RepaintWaterfall(DWORD minInterval)
{
	static DWORD lastRepaint = 0;

	EnterCriticalSection(&cs);
		
	DWORD now = GetTickCount();
	if( interactive && (!lastRepaint || now < lastRepaint || now - lastRepaint > minInterval) )
	{
		lastRepaint = now;
		PostMessage(UWM_REPAINT_WATERFALL);
	}
	
	LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
	Force the waterfall to redraw
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnRepaintWaterfall(UINT /*uMsg*/, WPARAM /*wParam*/, LPARAM /*lParam*/, BOOL& /*bHandled*/)
{
	GetDlgItem(IDC_WATERFALL).Invalidate(0);
	return 0;
}

/*-----------------------------------------------------------------------------
	Force the waterfall to redraw
-----------------------------------------------------------------------------*/
void CWatchDlg::CheckStuff(void)
{
	EnterCriticalSection(&cs);

	// only check every 50 ms at most to avoid pounding the browser
	__int64 now;
	QueryPerfCounter(now);
	if( now < lastCheck || (now - lastCheck) / msFreq > 50 )
	{
		// post messages to all of the thread windows
		POSITION pos = threadWindows.GetStartPosition();
		while( pos )
		{
			HWND hWnd = threadWindows.GetNextValue(pos);
			if( hWnd && ::IsWindow(hWnd) )
				::PostMessage(hWnd, UWM_CHECK_STUFF, 0, 0);
		}
		
		lastCheck = now;
	}
	LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnCheckStuff(UINT /*uMsg*/, WPARAM /*wParam*/, LPARAM /*lParam*/, BOOL& /*bHandled*/)
{
	// see if the readystate changed or if our DOM elements are available yet
	if( active )
	{
		CheckReadyState();
		CheckDOM();
		CheckComplete();
	}
	
	return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnCheckPaint(UINT /*uMsg*/, WPARAM /*wParam*/, LPARAM /*lParam*/, BOOL& /*bHandled*/)
{
	if( active && !painted )
    CheckWindowPainted();

	return 0;
}

/*-----------------------------------------------------------------------------
	Remove the highlighted attribute from everything
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnTvnSelchangingWaterfall(int /*idCtrl*/, LPNMHDR pNMHDR, BOOL& bHandled)
{
	LPNMTREEVIEW pNMTreeView = reinterpret_cast<LPNMTREEVIEW>(pNMHDR);
	bHandled = TRUE;
	selectedItem = NULL;

	// loop through all of the events and see which ones aren't in the tree
	POSITION pos = events.GetHeadPosition();
	while( pos )
	{
		CTrackedEvent * e = events.GetNext(pos);
		if( e )
			e->highlighted = false;
	}
	
	RepaintWaterfall();

	return 0;
}

/*-----------------------------------------------------------------------------
	Selected a new element, highlight related events
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnTvnSelchangedWaterfall(int /*idCtrl*/, LPNMHDR pNMHDR, BOOL& bHandled)
{
	__try
	{
		// make sure we aren't in the process of a reset
		if( events.GetCount() )
		{
			LPNMTREEVIEW pNMTreeView = reinterpret_cast<LPNMTREEVIEW>(pNMHDR);
			bHandled = TRUE;
			
			CTrackedEvent * selected = (CTrackedEvent *)pNMTreeView->itemNew.lParam;
			if( selected )
			{
				selectedItem = selected;
				DWORD socketID = 0;
				
				// figure out the socket ID
				if( selected->type == CTrackedEvent::etWinInetRequest )
				{
					CWinInetRequest * r = (CWinInetRequest*)selected;
					socketID = r->socketId;
				}
				
				// loop through and highlight everything that shares the same socket ID
				POSITION pos = events.GetHeadPosition();
				while( pos )
				{
					CTrackedEvent * e = events.GetNext(pos);
					if( e )
					{
						if( e == selected )
							e->highlighted = true;
						else
						{
							if( e->type == CTrackedEvent::etWinInetRequest )
							{
								CWinInetRequest * r = (CWinInetRequest*)e;
								if( socketID == r->socketId )
									e->highlighted = true;
							}
						}
					}
				}
			}

			RepaintWaterfall();
		}
	}__except(EXCEPTION_EXECUTE_HANDLER)
	{
	}

	return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnTvnGetdispinfoWaterfall(int /*idCtrl*/, LPNMHDR pNMHDR, BOOL& /*bHandled*/)
{
	LPNMTVDISPINFO pTVDispInfo = reinterpret_cast<LPNMTVDISPINFO>(pNMHDR);
	CTrackedEvent * e = (CTrackedEvent *)pTVDispInfo->item.lParam;
	if( e && pTVDispInfo->item.mask & TVIF_TEXT )
	{
		CString text;
		GetItemText(e, text);
		lstrcpyn(pTVDispInfo->item.pszText, text, pTVDispInfo->item.cchTextMax);
	}

	return 0;
}

/*-----------------------------------------------------------------------------
	Redraw the waterfall when an item expands in case the scroll bar comes into play
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnTvnItemexpandedWaterfall(int /*idCtrl*/, LPNMHDR pNMHDR, BOOL& bHandled)
{
	LPNMTREEVIEW pNMTreeView = reinterpret_cast<LPNMTREEVIEW>(pNMHDR);
	bHandled = TRUE;

	RepaintWaterfall();

	return 0;
}

/*-----------------------------------------------------------------------------
	They double-clicked on an item, create the details dialog for it
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnNMDblclkWaterfall(int /*idCtrl*/, LPNMHDR pNMHDR, BOOL& /*bHandled*/)
{
	// bring up a details dialog for the selected item
	if( selectedItem )
	{
		CDetailsDlg * dlg = new CDetailsDlg(selectedItem);
		dlg->Create(m_hWnd);

		if( hSmallIcon )
			dlg->SetIcon(hSmallIcon,0);

		if( hBigIcon )
			dlg->SetIcon(hBigIcon,1);

		dlg->ShowWindow(SW_NORMAL);
		
		detailsDialogs.AddTail(dlg);
	}
	
	return 1;
}

/*-----------------------------------------------------------------------------
	They changed tabs
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnTabChanged(int /*idCtrl*/, LPNMHDR pNMHDR, BOOL& bHandled)
{
	bHandled = TRUE;

	int tab = TabCtrl_GetCurSel(GetDlgItem(IDC_TABS));
	
	if( tab >= 2 )	// report
	{
		GetDlgItem(IDC_WATERFALL).ShowWindow(SW_HIDE);
		GetDlgItem(IDC_RICHEDIT).ShowWindow(SW_SHOW);
		
		SETTEXTEX settings;
		settings.flags = ST_DEFAULT;
		settings.codepage = sizeof(TCHAR) == sizeof(char) ? CP_ACP : 1200;
		
		// Fill in the contents of the rich edit control based on which they selected
		if( tab != 2 )
		{
			CString szReport;
			GenerateReport(szReport);
			GetDlgItem(IDC_RICHEDIT).SendMessage(EM_SETTEXTEX, (WPARAM)&settings, (LPARAM)(LPCTSTR)szReport);
		}
	}
	else
	{
		GetDlgItem(IDC_RICHEDIT).ShowWindow(SW_HIDE);
		GetDlgItem(IDC_WATERFALL).ShowWindow(SW_SHOW);
		
		waterfall = tab == 0;
		RepaintWaterfall();
	}
	
	return 0;
}

/*-----------------------------------------------------------------------------
	Draw a 3-d bar
-----------------------------------------------------------------------------*/
void CWatchDlg::DrawBar(HDC hDC, CRect rect, COLORREF color)
{
	int r = GetRValue(color);
	int g = GetGValue(color);
	int b = GetBValue(color);
	
	// build the highlight color
	int hr = (int)((255 - r) * 0.3 + r);
	int hg = (int)((255 - g) * 0.3 + g);
	int hb = (int)((255 - b) * 0.3 + b);
	
	// darken the shadow color a bit
	r = (int)(r * 0.8);
	g = (int)(g * 0.8);
	b = (int)(b * 0.8);
	
	int mid = (int)(((rect.top - rect.bottom) * 0.75) + rect.bottom);

	TRIVERTEX        vert[2] ;
	GRADIENT_RECT    gRect;
	vert [0] .x      = rect.left;
	vert [0] .y      = rect.top;
	vert [0] .Red    = MAKEWORD(0,r);
	vert [0] .Green  = MAKEWORD(0,g);
	vert [0] .Blue   = MAKEWORD(0,b);
	vert [0] .Alpha  = 0;

	vert [1] .x      = rect.right;
	vert [1] .y      = mid; 
	vert [1] .Red    = MAKEWORD(0,hr);
	vert [1] .Green  = MAKEWORD(0,hg);
	vert [1] .Blue   = MAKEWORD(0,hb);
	vert [1] .Alpha  = 0;

	// draw the top half
	gRect.UpperLeft  = 0;
	gRect.LowerRight = 1;
	GradientFill(hDC,vert,2,&gRect,1,GRADIENT_FILL_RECT_V);	

	// draw the bottom half
	vert [1] .x      = rect.left;

	vert [0] .x      = rect.right;
	vert [0] .y      = rect.bottom;

	gRect.UpperLeft  = 1;
	gRect.LowerRight = 0;
	GradientFill(hDC,vert,2,&gRect,1,GRADIENT_FILL_RECT_V);	
}

/******************************************************************************
							Menu Handlers
******************************************************************************/

/*-----------------------------------------------------------------------------
	File->New
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnFileNew(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/)
{
	// reset everything
	Reset();
	
	// mark us as available for new navigations
	available = true;

	return 0;
}

/*-----------------------------------------------------------------------------
	Save a report view of the data
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnFileSaveReport(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/)
{
	TCHAR szFile[MAX_PATH];
	szFile[0] = 0;
	
	OPENFILENAME ofn;
	memset(&ofn, 0, sizeof(ofn));
	ofn.lStructSize = sizeof(ofn);
	ofn.hwndOwner = m_hWnd;
	ofn.lpstrFilter = _T("Report Files (*.txt)\0*.txt\0All Files (*.*)\0*.*\0\0");
	ofn.lpstrFile = szFile;
	ofn.nMaxFile = _countof(szFile);
	ofn.Flags = OFN_OVERWRITEPROMPT | OFN_PATHMUSTEXIST;
	ofn.lpstrDefExt = _T("txt");
	
	if( GetSaveFileName(&ofn) )
	{
		// create the file
		HANDLE hFile = CreateFile(szFile, GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ, &nullDacl, CREATE_ALWAYS, 0, 0);
		if( hFile != INVALID_HANDLE_VALUE )
		{
			CString szReport;
			GenerateReport(szReport);
			
			DWORD written;
			CT2A str((LPCTSTR)szReport);
			WriteFile(hFile, (LPCSTR)str, szReport.GetLength(), &written, 0);
			
			CloseHandle(hFile);
		}
	}
	
	return 0;
}

/*-----------------------------------------------------------------------------
	Save the optimization report
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnFileSaveOptimizationReport(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/)
{
	return 0;
}

/*-----------------------------------------------------------------------------
	Bring up the about box
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnHelpAbout(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/)
{
	CAboutDlg dlg;
	dlg.version = version;
	dlg.DoModal();
	
	return 0;
}

/*-----------------------------------------------------------------------------
	Toggle the viewing of optimization warnings
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnViewOptimizationWarnings(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/)
{
	if( warnings )
	{
		warnings = 0;
		CheckMenuItem(GetMenu(), ID_VIEW_OPTIMIZATIONWARNINGS, MF_BYCOMMAND | MF_UNCHECKED);
	}
	else
	{
		warnings = 1;
		CheckMenuItem(GetMenu(), ID_VIEW_OPTIMIZATIONWARNINGS, MF_BYCOMMAND | MF_CHECKED);
	}
		
	// toggle the setting
	settings.SetDWORDValue(_T("View Warnings"), warnings);
	
	RepaintWaterfall();

	return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnFontSmall(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/)
{
	CheckMenuItem(GetMenu(), ID_FONT_NORMAL, MF_BYCOMMAND | MF_UNCHECKED);
	CheckMenuItem(GetMenu(), ID_FONT_SMALL, MF_BYCOMMAND | MF_CHECKED);
	DWORD newSize = 1;
	if( newSize != fontSize )
	{
		fontSize = newSize;
		settings.SetDWORDValue(_T("Font Size"), fontSize);

		GetDlgItem(IDC_WATERFALL).SetFont(smallFont,0);
		HWND hWaterfall = GetDlgItem(IDC_WATERFALL).m_hWnd;
		if( !smallHeight )
			smallHeight = TreeView_GetItemHeight(hWaterfall) - 2;
		TreeView_SetItemHeight(hWaterfall, smallHeight);
		
		RepaintWaterfall();
	}

	return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnFontNormal(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/)
{
	CheckMenuItem(GetMenu(), ID_FONT_NORMAL, MF_BYCOMMAND | MF_CHECKED);
	CheckMenuItem(GetMenu(), ID_FONT_SMALL, MF_BYCOMMAND | MF_UNCHECKED);
	DWORD newSize = 0;
	if( newSize != fontSize )
	{
		fontSize = newSize;
		settings.SetDWORDValue(_T("Font Size"), fontSize);

		GetDlgItem(IDC_WATERFALL).SetFont(defaultFont,0);
		TreeView_SetItemHeight(GetDlgItem(IDC_WATERFALL), defaultHeight);

		RepaintWaterfall();
	}

	return 0;
}

/*-----------------------------------------------------------------------------
	Save an image of the tree view (either waterfall or optimization checklist)
-----------------------------------------------------------------------------*/
void CWatchDlg::SaveImage(BOOL drawWaterfall, LPCTSTR fileName)
{
	// calculate the height
	HWND hWaterfall = GetDlgItem(IDC_WATERFALL);

	int count = 0;
	HTREEITEM hItem = TreeView_GetRoot(hWaterfall);
	while( hItem )					
	{
		count++;
		hItem = TreeView_GetNextSibling(hWaterfall, hItem);
	}
	int itemHeight = defaultHeight;
	int height = itemHeight * count + 2;
	int width = 1000;
	if( height )
	{
		// create an in-memory bitmap of the waterfall (1000xwhatever)
		HDC hdcScreen = CreateDC(_T("DISPLAY"), NULL, NULL, NULL);
		if( hdcScreen )
		{
			HDC hDC = CreateCompatibleDC(hdcScreen);
			if( hDC )
			{
				HBITMAP hBitmap = CreateCompatibleBitmap(hdcScreen, width, height);
				if( hBitmap )
				{
					HBITMAP oldBitmap = (HBITMAP)SelectObject(hDC, hBitmap);
					HFONT hFont = defaultFont;
					HFONT oldFont = (HFONT)SelectObject(hDC, defaultFont);

					CRect rect(0, 0, width, height);
					FillRect(hDC, rect, hBrBlack);

					// loop through all of the items
					int top = 1;
					HTREEITEM hItem = TreeView_GetRoot(hWaterfall);
					while( hItem )					
					{
						// fill in the whole rect as white for starters
						CRect rect(1, top, width - 2, top + itemHeight);
						FillRect(hDC, rect, hBrWhite);
						
						TV_ITEM item;
						memset(&item, 0, sizeof(item));
						item.hItem = hItem;
						item.mask = TVIF_PARAM;
						if( TreeView_GetItem(hWaterfall, &item) )
						{
							CTrackedEvent * e = (CTrackedEvent *)item.lParam;
							if( e )
							{
								bool highlighted = e->highlighted;
								e->highlighted = false;
								DrawItem(NULL, e, hDC, rect, drawWaterfall);
								e->highlighted = highlighted;
							}
							else
								DrawItem(NULL, e, hDC, rect, drawWaterfall);
						}
					
						// on to the next item
						top += itemHeight;
						hItem = TreeView_GetNextSibling(hWaterfall, hItem);
					}

					CxImage img;
					if( img.CreateFromHBITMAP(hBitmap) )
					{
						TCHAR szFile[MAX_PATH];
						szFile[0] = 0;

						if( fileName )
							img.Save(fileName, CXIMAGE_FORMAT_PNG);
						else
						{
							OPENFILENAME ofn;
							memset(&ofn, 0, sizeof(ofn));
							ofn.lStructSize = sizeof(ofn);
							ofn.hwndOwner = m_hWnd;
							ofn.lpstrFilter = _T("PNG Images (*.png)\0*.png\0All Files (*.*)\0*.*\0\0");
							ofn.lpstrFile = szFile;
							ofn.nMaxFile = _countof(szFile);
							ofn.Flags = OFN_OVERWRITEPROMPT | OFN_PATHMUSTEXIST;
							ofn.lpstrDefExt = _T("png");
							
							if( GetSaveFileName(&ofn) )
								img.Save(szFile, CXIMAGE_FORMAT_PNG);
						}
					}

					SelectObject(hDC, oldFont);
					SelectObject(hDC, oldBitmap);
				}

				DeleteDC(hDC);
			}
			DeleteDC(hdcScreen);
		}
	}
}

/*-----------------------------------------------------------------------------
	Export the waterfall as a png
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnFileExportWaterfall(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/)
{
	SaveImage(TRUE);
	return 0;
}

/*-----------------------------------------------------------------------------
	Export the optimization chart as a png
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnFileExportOptimizationChart(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/)
{
	SaveImage(FALSE);
	return 0;
}

/*-----------------------------------------------------------------------------
	Stop the current measurement
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnToolsStopMeasurement(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/)
{
	if( !end )
		end = lastRequest;
	FlushResults();
	return 0;
}

/*-----------------------------------------------------------------------------
	Run a script file
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnFileRunscript(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/)
{
	TCHAR szFile[MAX_PATH];
	szFile[0] = 0;
	
	OPENFILENAME ofn;
	memset(&ofn, 0, sizeof(ofn));
	ofn.lStructSize = sizeof(ofn);
	ofn.hwndOwner = m_hWnd;
	ofn.lpstrFilter = _T("Script File (*.pts)\0*.pts\0All Files (*.*)\0*.*\0\0");
	ofn.lpstrFile = szFile;
	ofn.nMaxFile = _countof(szFile);
	ofn.Flags = OFN_FILEMUSTEXIST;
	ofn.lpstrDefExt = _T("pts");
	
	if( GetOpenFileName(&ofn) )
		if( !RunScript(szFile) )
			MessageBox(_T("Error loading script!"), _T("AOL Pagetest"), MB_OK | MB_ICONERROR);
	
	return 0;
}

/*-----------------------------------------------------------------------------
	Launch the main pagetest portal
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnHelpPagetestontheweb(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/)
{
	ShellExecute(m_hWnd, _T("open"), _T("http://pagetest.sourceforge.net"), NULL, NULL, SW_SHOWNORMAL);
	return 0;
}

/*-----------------------------------------------------------------------------
	Launch the pagetest quick start guide
-----------------------------------------------------------------------------*/
LRESULT CWatchDlg::OnHelpQuickstartguide(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/)
{
	ShellExecute(m_hWnd, _T("open"), _T("http://pagetest.wiki.sourceforge.net/Quick+Start+Guide"), NULL, NULL, SW_SHOWNORMAL);
	return 0;
}
