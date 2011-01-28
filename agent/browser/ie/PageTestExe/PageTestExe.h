
// PageTestExe.h : main header file for the PageTestExe application
//
#pragma once

#ifndef __AFXWIN_H__
	#error "include 'stdafx.h' before including this file for PCH"
#endif

#include "resource.h"       // main symbols
#include "../pagetest/WsHook.h"
#include "../pagetest/WinInetHook.h"
#include "../pagetest/GDIHook.h"
#include "../pagetest/WatchDlg.h"


// CPageTestExeApp:
// See PageTestExe.cpp for the implementation of this class
//

class CPageTestExeApp : public CWinApp
{
public:
	CPageTestExeApp();


// Overrides
public:
	virtual BOOL InitInstance();

// Implementation
	afx_msg void OnAppAbout();
	DECLARE_MESSAGE_MAP()
	virtual int ExitInstance();
	virtual int Run();
};

extern CPageTestExeApp theApp;
