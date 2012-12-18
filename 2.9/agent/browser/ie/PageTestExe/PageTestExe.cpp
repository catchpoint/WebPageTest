
// PageTestExe.cpp : Defines the class behaviors for the application.
//

#include "stdafx.h"
#include "afxwinappex.h"
#include "PageTestExe.h"
#include "MainFrm.h"

#include "PageTestExeDoc.h"
#include "PageTestExeView.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#endif

#ifndef DEBUG
typedef LRESULT(__stdcall * LPDISPATCHMESSAGEW)(__in CONST MSG *lpMsg);
LPDISPATCHMESSAGEW	_DispatchMessageW = NULL;
NCodeHookIA32	dispHook;

LRESULT WINAPI DispatchMessageW_hook(__in CONST MSG *lpMsg)
{
	LRESULT result = 0;

	__try
	{
		if( _DispatchMessageW )
			result = _DispatchMessageW(lpMsg);
	}
	__except(1)
	{
	}
	
	return result;
}
#endif //DEBUG
    

// CPageTestExeApp

BEGIN_MESSAGE_MAP(CPageTestExeApp, CWinApp)
	ON_COMMAND(ID_APP_ABOUT, &CPageTestExeApp::OnAppAbout)
	// Standard file based document commands
	ON_COMMAND(ID_FILE_NEW, &CWinApp::OnFileNew)
	ON_COMMAND(ID_FILE_OPEN, &CWinApp::OnFileOpen)
	// Standard print setup command
	ON_COMMAND(ID_FILE_PRINT_SETUP, &CWinApp::OnFilePrintSetup)
END_MESSAGE_MAP()


// CPageTestExeApp construction

CPageTestExeApp::CPageTestExeApp()
{

	// TODO: add construction code here,
	// Place all significant initialization in InitInstance
}

// The one and only CPageTestExeApp object

CPageTestExeApp theApp;


// CPageTestExeApp initialization

BOOL CPageTestExeApp::InitInstance()
{
	// hook winsock
	WinsockInstallHooks();
	
	// hook wininet
	WinInetInstallHooks();
	
	GDIInstallHooks();
	
	// InitCommonControlsEx() is required on Windows XP if an application
	// manifest specifies use of ComCtl32.dll version 6 or later to enable
	// visual styles.  Otherwise, any window creation will fail.
	INITCOMMONCONTROLSEX InitCtrls;
	InitCtrls.dwSize = sizeof(InitCtrls);
	// Set this to include all the common control classes you want to use
	// in your application.
	InitCtrls.dwICC = ICC_WIN95_CLASSES;
	InitCommonControlsEx(&InitCtrls);

	CWinApp::InitInstance();

	// hook the browser wndProc (to supress crashes)
	#ifndef DEBUG
	if( !_DispatchMessageW )
		_DispatchMessageW = dispHook.createHookByName("user32.dll", "DispatchMessageW", DispatchMessageW_hook);
	#endif
	
	if (!AfxSocketInit())
	{
		AfxMessageBox(IDP_SOCKETS_INIT_FAILED);
		return FALSE;
	}

	// Initialize OLE libraries
	if (!AfxOleInit())
	{
		AfxMessageBox(IDP_OLE_INIT_FAILED);
		return FALSE;
	}
	AfxEnableControlContainer();

	SetRegistryKey(_T("AOL"));
	//LoadStdProfileSettings(4);  // Load standard INI file options (including MRU)

	// Register the application's document templates.  Document templates
	//  serve as the connection between documents, frame windows and views
	CSingleDocTemplate* pDocTemplate;
	pDocTemplate = new CSingleDocTemplate(
		IDR_MAINFRAME,
		RUNTIME_CLASS(CPageTestExeDoc),
		RUNTIME_CLASS(CMainFrame),       // main SDI frame window
		RUNTIME_CLASS(CPageTestExeView));
	if (!pDocTemplate)
		return FALSE;
	AddDocTemplate(pDocTemplate);

	// Parse command line for standard shell commands, DDE, file open
	CCommandLineInfo cmdInfo;
	ParseCommandLine(cmdInfo);

	// Dispatch commands specified on the command line.  Will return FALSE if
	// app was launched with /RegServer, /Register, /Unregserver or /Unregister.
	if (!ProcessShellCommand(cmdInfo))
		return FALSE;

	// The one and only window has been initialized, so show and update it
	m_pMainWnd->ShowWindow(SW_SHOW);
	m_pMainWnd->UpdateWindow();

	return TRUE;
}

int CPageTestExeApp::ExitInstance()
{
	OutputDebugString(_T("[PagetestExe] - ExitInstance\n"));
	WinInetRemoveHooks();
	WinsockRemoveHooks();

	return CWinApp::ExitInstance();
}

// override the Run so we can put an exception handler aaround the message loop (pre-translate causes some grief)
int CPageTestExeApp::Run()
{
	// acquire and dispatch messages until a WM_QUIT message is received.
	for(;;)
	{
		__try
		{
			// pump message, but quit on WM_QUIT
			if (!PumpMessage())
				return ExitInstance();
		}
		__except(1)
		{
		}

	}
}

// CAboutDlg dialog used for App About

class CExeAboutDlg : public CDialog
{
public:
	CExeAboutDlg();

// Dialog Data
	enum { IDD = IDD_ABOUTBOX };

protected:
	virtual void DoDataExchange(CDataExchange* pDX);    // DDX/DDV support

// Implementation
protected:
	DECLARE_MESSAGE_MAP()
};

CExeAboutDlg::CExeAboutDlg() : CDialog(CExeAboutDlg::IDD)
{
}

void CExeAboutDlg::DoDataExchange(CDataExchange* pDX)
{
	CDialog::DoDataExchange(pDX);
}

BEGIN_MESSAGE_MAP(CExeAboutDlg, CDialog)
END_MESSAGE_MAP()

// App command to run the dialog
void CPageTestExeApp::OnAppAbout()
{
	CExeAboutDlg aboutDlg;
	aboutDlg.DoModal();
}

// CPageTestExeApp message handlers

