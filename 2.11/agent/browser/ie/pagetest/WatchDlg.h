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

// WatchDlg.h : Declaration of the CWatchDlg

#pragma once

#include "resource.h"       // main symbols
#include "teststate.h"
#include "detailsdlg.h"

// CWatchDlg
class CWatchDlg : 
	public CAxDialogImpl<CWatchDlg>
	, public CTestState
{
public:
	CWatchDlg():
		m_nIndent(0)
		, hBrPage(NULL)
		, hBrPageSelected(NULL)
		, hBrDns(NULL)
		, hBrDnsSelected(NULL)
		, hBrSocket(NULL)
		, hBrSocketSelected(NULL)
		, hBrRequest(NULL)
		, hBrRequestSelected(NULL)
		, hBrWhite(NULL)
		, hBrBlack(NULL)
		, hBrEven(NULL)
		, hBrOdd(NULL)
		, hBrError(NULL)
		, hBrWarning(NULL)
		, hBrWaterfallDns(NULL)
		, hBrWaterfallSocket(NULL)
		, hBrWaterfallSSL(NULL)
		, hBrWaterfallRequestTTFB(NULL)
		, hBrWaterfallRequest(NULL)
		, hPenBlack(NULL)
		, hPenStart(NULL)
		, hPenRender(NULL)
		, hPenLayout(NULL)
		, hPenDOMElement(NULL)
		, hPenDone(NULL)
		, hPenDone20(NULL)
		, hPenTime(NULL)
		, warnings(1)
		, waterfall(1)
		, smallFont(0)
		, defaultFont(0)
		, fontSize(0)
		, defaultHeight(0)
		, smallHeight(0)
		, selectedItem(0)
		, hBigIcon(0)
		, hSmallIcon(0)
		, hCross(0)
		, hCheck(0)
		, hWarn(0)
		, hLock(0)
		, hStar(0)
		, hInsertAfter(0)
		, hBottom(0)
		, lastCheck(0)
		, started(false)
		{
		// open up the registry key for settings
		settings.Create(HKEY_CURRENT_USER, _T("Software\\AOL\\Pagetest"));
		
		Reset();
	}

	~CWatchDlg()
	{
		Destroy();
		settings.Close();
	}
	
	enum { IDD = IDD_WATCHDLG };

BEGIN_MSG_MAP(CWatchDlg)
	MESSAGE_HANDLER(WM_INITDIALOG, OnInitDialog)
	MESSAGE_HANDLER(WM_TIMER, OnTimer)
	MESSAGE_HANDLER(WM_CLOSE, OnClose)
	MESSAGE_HANDLER(WM_SIZE, OnSize)
	MESSAGE_HANDLER(UWM_UPDATE_WATERFALL, OnUpdateWaterfall)
	MESSAGE_HANDLER(UWM_REPAINT_WATERFALL, OnRepaintWaterfall)
	MESSAGE_HANDLER(UWM_RESET_UI, OnResetUI)
	MESSAGE_HANDLER(UWM_CHECK_STUFF, OnCheckStuff)
  MESSAGE_HANDLER(UWM_CHECK_PAINT, OnCheckPaint)
	NOTIFY_HANDLER(IDC_WATERFALL, NM_CUSTOMDRAW, OnNMCustomdrawWaterfall)
	NOTIFY_HANDLER(IDC_WATERFALL, TVN_SELCHANGING, OnTvnSelchangingWaterfall)
	NOTIFY_HANDLER(IDC_WATERFALL, TVN_SELCHANGED, OnTvnSelchangedWaterfall)
	NOTIFY_HANDLER(IDC_WATERFALL, TVN_ITEMEXPANDED, OnTvnItemexpandedWaterfall)
	NOTIFY_HANDLER(IDC_WATERFALL, NM_DBLCLK, OnNMDblclkWaterfall)
	COMMAND_ID_HANDLER(ID_FILE_NEW, OnFileNew)
	COMMAND_ID_HANDLER(ID_FILE_SAVEREPORT, OnFileSaveReport)
	COMMAND_ID_HANDLER(ID_FILE_SAVEOPTIMIZATIONREPORT, OnFileSaveOptimizationReport)
	COMMAND_ID_HANDLER(ID_FILE_EXPORTWATERFALL, OnFileExportWaterfall)
	COMMAND_ID_HANDLER(ID_FILE_EXPORTOPTIMIZATIONCHART, OnFileExportOptimizationChart)
	COMMAND_ID_HANDLER(ID_HELP_ABOUT, OnHelpAbout)
	COMMAND_ID_HANDLER(ID_VIEW_OPTIMIZATIONWARNINGS, OnViewOptimizationWarnings)
	COMMAND_ID_HANDLER(ID_FONT_SMALL, OnFontSmall)
	COMMAND_ID_HANDLER(ID_FONT_NORMAL, OnFontNormal)
	COMMAND_ID_HANDLER(ID_TOOLS_STOPMEASUREMENT, OnToolsStopMeasurement)
	NOTIFY_HANDLER(IDC_WATERFALL, TVN_GETDISPINFO, OnTvnGetdispinfoWaterfall)
	MESSAGE_HANDLER(WM_DESTROY, OnDestroy)
	COMMAND_ID_HANDLER(ID_FILE_RUNSCRIPT, OnFileRunscript)
	COMMAND_ID_HANDLER(ID_HELP_PAGETESTONTHEWEB, OnHelpPagetestontheweb)
	COMMAND_ID_HANDLER(ID_HELP_QUICKSTARTGUIDE, OnHelpQuickstartguide)
	NOTIFY_HANDLER(IDC_TABS, TCN_SELCHANGE, OnTabChanged)
	CHAIN_MSG_MAP(CAxDialogImpl<CWatchDlg>)
END_MSG_MAP()

private:
	CRegKey						settings;		// key where the settings are stored

public:

// Handler prototypes:
//  LRESULT MessageHandler(UINT uMsg, WPARAM wParam, LPARAM lParam, BOOL& bHandled);
//  LRESULT CommandHandler(WORD wNotifyCode, WORD wID, HWND hWndCtl, BOOL& bHandled);
//  LRESULT NotifyHandler(int idCtrl, LPNMHDR pnmh, BOOL& bHandled);

	LRESULT OnInitDialog(UINT uMsg, WPARAM wParam, LPARAM lParam, BOOL& bHandled);
	LRESULT OnClose(UINT /*uMsg*/, WPARAM /*wParam*/, LPARAM /*lParam*/, BOOL& /*bHandled*/);
	LRESULT OnSize(UINT /*uMsg*/, WPARAM /*wParam*/, LPARAM /*lParam*/, BOOL& /*bHandled*/);
	LRESULT OnTimer(UINT /*uMsg*/, WPARAM /*wParam*/, LPARAM /*lParam*/, BOOL& /*bHandled*/);
	LRESULT OnUpdateWaterfall(UINT /*uMsg*/, WPARAM /*wParam*/, LPARAM /*lParam*/, BOOL& /*bHandled*/);
	LRESULT OnRepaintWaterfall(UINT /*uMsg*/, WPARAM /*wParam*/, LPARAM /*lParam*/, BOOL& /*bHandled*/);
	LRESULT OnResetUI(UINT /*uMsg*/, WPARAM /*wParam*/, LPARAM /*lParam*/, BOOL& /*bHandled*/);
	LRESULT OnCheckStuff(UINT /*uMsg*/, WPARAM /*wParam*/, LPARAM /*lParam*/, BOOL& /*bHandled*/);
	LRESULT OnCheckPaint(UINT /*uMsg*/, WPARAM /*wParam*/, LPARAM /*lParam*/, BOOL& /*bHandled*/);
	
	virtual void Create(void);
	void Destroy(void);
	static void CreateDlg(void);
	static void DestroyDlg(void);

	virtual void Reset(void);
	void MoveControls(void);
	void RememberPosition(void);

	virtual void	ResizeWindow(DWORD width = 0, DWORD height = 0);

	virtual void	StopTimers();
	virtual void	StartTimer(UINT_PTR id, UINT elapse);
	virtual void	AddEvent(CTrackedEvent * e);
	LRESULT OnNMCustomdrawWaterfall(int /*idCtrl*/, LPNMHDR pNMHDR, BOOL& /*bHandled*/);
	virtual void GetBackgroundColor(CTrackedEvent * e, bool selected, HBRUSH &brush, COLORREF &color);
	virtual void DrawItem(LPNMTVCUSTOMDRAW pCustomDraw, CTrackedEvent * e, HDC hDC, CRect &rect, BOOL drawWaterfall);
	virtual void DrawDetails(LPNMTVCUSTOMDRAW pCustomDraw, CTrackedEvent * e, HDC hDC, CRect &rect);
	virtual void DrawItemWaterfall(CTrackedEvent * e, HDC hDC, CRect &rect);
	virtual void DrawItemChecklist(CTrackedEvent * e, HDC hDC, CRect &rect);
	virtual void SaveImage(BOOL drawWaterfall, LPCTSTR fileName = NULL);
	virtual void TestComplete(void);
	virtual void UpdateWaterfall(bool now = false);
	
	// drawing stuff
	void LineVert(HDC hDC, int x, int y0, int y1)
	{
		POINT	line[2] = {{x,y0},{x,y1}};
		Polyline(hDC, line, 2);
	}
	void LineHorz(HDC hDC, int x0, int x1, int y)
	{
		POINT	line[2] = {{x0,y},{x1,y}};
		Polyline(hDC, line, 2);
	}

	UINT m_nIndent;
	HBRUSH	hBrPage;
	HBRUSH	hBrPageSelected;
	HBRUSH	hBrDns;
	HBRUSH	hBrDnsSelected;
	HBRUSH	hBrSocket;
	HBRUSH	hBrSocketSelected;
	HBRUSH	hBrRequest;
	HBRUSH	hBrRequestSelected;
	HBRUSH	hBrWhite;
	HBRUSH	hBrBlack;
	HBRUSH	hBrEven;
	HBRUSH	hBrOdd;
	HBRUSH	hBrError;
	HBRUSH	hBrWarning;
	HBRUSH hBrWaterfallDns;
	HBRUSH hBrWaterfallSocket;
	HBRUSH hBrWaterfallSSL;
	HBRUSH hBrWaterfallRequestTTFB;
	HBRUSH hBrWaterfallRequest;
	HPEN	hPenBlack;
	HPEN	hPenStart;
	HPEN	hPenRender;
	HPEN	hPenDOMElement;
	HPEN	hPenLayout;
	HPEN	hPenDone;
	HPEN	hPenDone20;
	HPEN	hPenTime;
	HFONT	smallFont;
	HFONT	defaultFont;
	int		defaultHeight;
	int		smallHeight;
	HICON	hBigIcon;
	HICON	hSmallIcon;
	HICON	hCross;
	HICON	hCheck;
	HICON	hWarn;
	HICON	hLock;
	HICON	hStar;
	HTREEITEM hInsertAfter;
	HTREEITEM hBottom;
	__int64 lastCheck;
	bool	started;

	CTrackedEvent *			selectedItem;
	CAtlList<CDetailsDlg *>	detailsDialogs;

	virtual void GetItemText(CTrackedEvent * e, CString &text, bool includeIndex = false);
	virtual void RepaintWaterfall(DWORD minInterval = 100);
	virtual void CheckStuff(void);
	virtual void EnableUI(void);
	LRESULT OnTvnSelchangingWaterfall(int /*idCtrl*/, LPNMHDR pNMHDR, BOOL& /*bHandled*/);
	LRESULT OnTvnSelchangedWaterfall(int /*idCtrl*/, LPNMHDR pNMHDR, BOOL& /*bHandled*/);
	virtual void GetDetailText(CTrackedEvent * e, CString & text);
	LRESULT OnTvnItemexpandedWaterfall(int /*idCtrl*/, LPNMHDR pNMHDR, BOOL& /*bHandled*/);
	LRESULT OnFileNew(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/);
	LRESULT OnAccNew(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/);
	LRESULT OnFileSaveReport(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/);
	LRESULT OnFileSaveOptimizationReport(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/);
	LRESULT OnFileExportWaterfall(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/);
	LRESULT OnFileExportOptimizationChart(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/);
	LRESULT OnHelpAbout(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/);
	LRESULT OnViewOptimizationWarnings(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/);
	DWORD warnings;
	DWORD waterfall;
	DWORD fontSize;
	LRESULT OnFontSmall(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/);
	LRESULT OnFontNormal(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/);
	LRESULT OnToolsStopMeasurement(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/);
	LRESULT OnNMDblclkWaterfall(int /*idCtrl*/, LPNMHDR pNMHDR, BOOL& /*bHandled*/);
	LRESULT OnTvnGetdispinfoWaterfall(int /*idCtrl*/, LPNMHDR pNMHDR, BOOL& /*bHandled*/);
	LRESULT OnDestroy(UINT /*uMsg*/, WPARAM /*wParam*/, LPARAM /*lParam*/, BOOL& /*bHandled*/);
	LRESULT OnFileRunscript(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/);
	LRESULT OnHelpPagetestontheweb(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/);
	LRESULT OnHelpQuickstartguide(WORD /*wNotifyCode*/, WORD /*wID*/, HWND /*hWndCtl*/, BOOL& /*bHandled*/);
	LRESULT OnTabChanged(int /*idCtrl*/, LPNMHDR pNMHDR, BOOL& /*bHandled*/);
	
	void DrawBar(HDC hDC, CRect rect, COLORREF color);
};

// global single instance of the dialog
extern CWatchDlg * dlg;
extern DWORD tlsIndex;