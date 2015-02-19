// urlBlastDlg.cpp : implementation file
//

#include "stdafx.h"
#include "urlBlast.h"
#include "urlBlastDlg.h"
#include <WtsApi32.h>
#include <Iphlpapi.h>
#include <Winsock2.h>
#include <math.h>
#include <Userenv.h>
#include "crash.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#endif


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CurlBlastDlg::CurlBlastDlg(CWnd* pParent /*=NULL*/)
	: CDialog(CurlBlastDlg::IDD, pParent)
	, start(0)
	, freq(0)
	, firstIdleTime(0)
	, firstKernelTime(0)
	, firstUserTime(0)
	, lastIdleTime(0)
	, lastKernelTime(0)
	, lastUserTime(0)
	, logFile(_T(""))
	, startupDelay(1000)
	, computerName(_T(""))
	, lastUpload(0)
	, testID(0)
	, configID(0)
	, timeout(0)
	, running(false)
	, checkOpt(1)
	, bDrWatson(false)
	, accountBase(_T("user"))
	, password(_T("2dialit"))
	, browserWidth(1024)
	, browserHeight(768)
	, debug(0)
	, urlManager(log)
	, pipeIn(0)
	, pipeOut(0)
	, ec2(0)
  , useCurrentAccount(0)
  , hHookDll(NULL)
  , keepDNS(0)
  , worker(NULL)
  , hRunningThread(NULL)
  , hMustExit(NULL)
  , lastAlive(0)
{
	m_hIcon = AfxGetApp()->LoadIcon(IDR_MAINFRAME);
	hMustExit = CreateEvent(NULL, TRUE, FALSE, NULL);
  testingMutex = CreateMutex(NULL, FALSE, _T("Global\\WebPagetest"));
  InitializeCriticalSection(&cs);
	
	// handle crash events
	crashLog = &log;
	SetUnhandledExceptionFilter(CrashFilter);

	// create a NULL DACL we will re-use everywhere we do file access
	ZeroMemory(&nullDacl, sizeof(nullDacl));
	nullDacl.nLength = sizeof(nullDacl);
	nullDacl.bInheritHandle = FALSE;
	if( InitializeSecurityDescriptor(&SD, SECURITY_DESCRIPTOR_REVISION) )
		if( SetSecurityDescriptorDacl(&SD, TRUE,(PACL)NULL, FALSE) )
			nullDacl.lpSecurityDescriptor = &SD;

	// randomize the random number generator
	FILETIME ft;
	GetSystemTimeAsFileTime(&ft);
	srand(ft.dwLowDateTime);
	
	// get the computer name
	TCHAR buff[MAX_COMPUTERNAME_LENGTH + 1];
	DWORD len = _countof(buff);
	if( GetComputerName(buff, &len) )
		computerName = buff;
		
	// let our process kill processes from other users
	HANDLE hToken;
	if( OpenProcessToken( GetCurrentProcess() , TOKEN_ADJUST_PRIVILEGES | TOKEN_QUERY , &hToken) )
	{
		TOKEN_PRIVILEGES tp;
		
		if( LookupPrivilegeValue( NULL , SE_DEBUG_NAME, &tp.Privileges[0].Luid ) )
		{
			tp.PrivilegeCount = 1;
			tp.Privileges[0].Attributes = SE_PRIVILEGE_ENABLED;
			AdjustTokenPrivileges( hToken , FALSE , &tp , 0 , (PTOKEN_PRIVILEGES) 0 , 0 ) ;
		}
		
		CloseHandle(hToken);
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CurlBlastDlg::DoDataExchange(CDataExchange* pDX)
{
	CDialog::DoDataExchange(pDX);
	DDX_Control(pDX, IDC_STATUS, status);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BEGIN_MESSAGE_MAP(CurlBlastDlg, CDialog)
	ON_WM_PAINT()
	ON_WM_QUERYDRAGICON()
	//}}AFX_MSG_MAP
	ON_WM_CLOSE()
	ON_MESSAGE(MSG_UPDATE_UI, OnUpdateUI)
END_MESSAGE_MAP()

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
static unsigned __stdcall ThreadProc( void* arg )
{
	CurlBlastDlg * dlg = (CurlBlastDlg *)arg;
	if( dlg )
		dlg->ThreadProc();
		
	return 0;
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BOOL CurlBlastDlg::OnInitDialog()
{
	CDialog::OnInitDialog();
	
	// Set the icon for this dialog.  The framework does this automatically
	//  when the application's main window is not a dialog
	SetIcon(m_hIcon, TRUE);			// Set big icon
	SetIcon(m_hIcon, FALSE);		// Set small icon
	
	// set the window title (include the machine name)
	CString title = computerName + _T(" - URL Blast");
	SetWindowText(title);
	
	// disable font smoothing
	SystemParametersInfo(SPI_SETFONTSMOOTHING, FALSE, NULL, SPIF_UPDATEINIFILE);

	// spawn the worker thread
	ResetEvent(hMustExit);
	hRunningThread = (HANDLE)_beginthreadex(0, 0, ::ThreadProc, this, 0, 0);

	// start up minimized
	ShowWindow(SW_MINIMIZE);
  ClipCursor(NULL);
  SetCursorPos(0,0);
	
	return TRUE;  // return TRUE  unless you set the focus to a control
}

void CurlBlastDlg::SetStatus(CString status) {
  m_status = status;
  PostMessage(MSG_UPDATE_UI);
}

/*-----------------------------------------------------------------------------
  Background thread for managing the state of the agent
-----------------------------------------------------------------------------*/
void CurlBlastDlg::ThreadProc(void)
{
	LoadSettings();

  // configure the desktop resolution
  WaitForSingleObject(testingMutex, INFINITE);
	SetupScreen();
  ReleaseMutex(testingMutex);
	
	// wait for the statup delay
	SetStatus(_T("Starting up..."));
	DWORD ms = startupDelay;
	while( ms > 0 && WaitForSingleObject(hMustExit,0) == WAIT_TIMEOUT) {
	  Sleep(500);
	  ms -= 500;
	}

  // launch the watchdog
  TCHAR path[MAX_PATH];
  GetModuleFileName(NULL, path, MAX_PATH);
  lstrcpy(PathFindFileName(path), _T("wptwatchdog.exe"));
  CString watchdog;
  watchdog.Format(_T("\"%s\" %d"), path, GetCurrentProcessId());
  HANDLE process = NULL;
  LaunchProcess(watchdog, &process);
  if (process)
    CloseHandle(process);
	
	if (WaitForSingleObject(hMustExit,0) == WAIT_TIMEOUT) {
	  DoStartup();
	}

  // handle the periodic cleanup until it is time to exit  
  Alive();
  DWORD msCleanup = 500;
  DWORD msTemp = 20000;
  while(WaitForSingleObject(hMustExit,0) == WAIT_TIMEOUT) {
    if (!msCleanup) {
				CloseDialogs();
				KillProcs();
				msCleanup = 500;
    } else
      msCleanup -= 500;
    
    if (!msTemp) {
      if (WaitForSingleObject(testingMutex, 0) != WAIT_TIMEOUT) {
        ClearTemp();
        msTemp = 20000;
        ReleaseMutex(testingMutex);
      }
    } else
      msTemp -= 500;

    CheckAlive();
    Sleep(500);
  }

	// signal and wait for all of the workers to finish
	KillWorker();

	// shut down the url manager
	urlManager.Stop();
}

/*-----------------------------------------------------------------------------
// If you add a minimize button to your dialog, you will need the code below
//  to draw the icon.  For MFC applications using the document/view model,
//  this is automatically done for you by the framework.
-----------------------------------------------------------------------------*/
void CurlBlastDlg::OnPaint()
{
	if (IsIconic())
	{
		CPaintDC dc(this); // device context for painting

		SendMessage(WM_ICONERASEBKGND, reinterpret_cast<WPARAM>(dc.GetSafeHdc()), 0);

		// Center icon in client rectangle
		int cxIcon = GetSystemMetrics(SM_CXICON);
		int cyIcon = GetSystemMetrics(SM_CYICON);
		CRect rect;
		GetClientRect(&rect);
		int x = (rect.Width() - cxIcon + 1) / 2;
		int y = (rect.Height() - cyIcon + 1) / 2;

		// Draw the icon
		dc.DrawIcon(x, y, m_hIcon);
	}
	else
	{
		CDialog::OnPaint();
	}
}

/*-----------------------------------------------------------------------------
// The system calls this function to obtain the cursor to display while the user drags
//  the minimized window.
-----------------------------------------------------------------------------*/
HCURSOR CurlBlastDlg::OnQueryDragIcon()
{
	return static_cast<HCURSOR>(m_hIcon);
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CurlBlastDlg::OnCancel()
{
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CurlBlastDlg::OnOK()
{
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CurlBlastDlg::OnClose()
{
	log.Trace(_T("OnClose()"));
	
	CWaitCursor w;
	
	SetStatus(_T("Waiting to exit..."));
	SetEvent(hMustExit);
	if (hRunningThread) {
	  WaitForSingleObject(hRunningThread, INFINITE);
	  CloseHandle(hRunningThread);
	}
	
  RemoveSystemGDIHook();

	crashLog = NULL;
  CloseHandle( testingMutex );
	
	CDialog::OnOK();
}

typedef HRESULT (STDAPICALLTYPE* DLLREGISTERSERVER)(void);

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CurlBlastDlg::DoStartup(void)
{
	QueryPerfFrequency(freq);

  InstallFlash();

	log.LogEvent(event_Started);
	log.LogMachineInfo();
	
	// register pagetest if we have a dll locally
	TCHAR pagetest[MAX_PATH];
	if( GetModuleFileName(NULL, pagetest, _countof(pagetest)) )
	{
		lstrcpy( PathFindFileName(pagetest), _T("pagetest.dll") );
		HMODULE hPagetest = LoadLibrary(pagetest);
		if( hPagetest )
		{
			SetStatus(_T("Registering pagetest..."));
			DLLREGISTERSERVER proc = (DLLREGISTERSERVER)GetProcAddress(hPagetest, "DllRegisterServer");
			if( proc )
				proc();
			FreeLibrary(hPagetest);
		}
	}

  InstallSystemGDIHook();

  // stop services that can interfere with our measurements
	SetStatus(_T("Stoping services..."));
  StopService(_T("WinDefend")); // defender
  StopService(_T("wscsvc"));    // security center

  // kill the action center (next reboot)
	HKEY hKey;
	if( SUCCEEDED(RegOpenKeyEx(HKEY_CURRENT_USER, _T("Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer"), 0, KEY_SET_VALUE, &hKey)) )
	{
		DWORD val = 1;
		RegSetValueEx(hKey, _T("HideSCAHealth"), 0, REG_DWORD, (LPBYTE)&val, sizeof(val));
		RegCloseKey(hKey);
	}
	if( SUCCEEDED(RegOpenKeyEx(HKEY_LOCAL_MACHINE, _T("Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer"), 0, KEY_SET_VALUE, &hKey)) )
	{
		RegDeleteValue(hKey, _T("HideSCAHealth"));
		RegCloseKey(hKey);
	}

	// set the OS to not boost foreground processes
	if( SUCCEEDED(RegOpenKeyEx(HKEY_LOCAL_MACHINE, _T("SYSTEM\\CurrentControlSet\\Control\\PriorityControl"), 0, KEY_SET_VALUE, &hKey)) )
	{
		DWORD val = 0x18;
		RegSetValueEx(hKey, _T("Win32PrioritySeparation"), 0, REG_DWORD, (LPBYTE)&val, sizeof(val));
		
		RegCloseKey(hKey);
	}

  // block IE9 automatic install
	if( SUCCEEDED(RegCreateKeyEx(HKEY_LOCAL_MACHINE, _T("SOFTWARE\\Microsoft\\Internet Explorer\\Setup\\9.0"), 0, 0, 0, KEY_READ | KEY_WRITE, NULL, &hKey, NULL)) )
	{
		DWORD val = 1;
		RegSetValueEx(hKey, _T("DoNotAllowIE90"), 0, REG_DWORD, (LPBYTE)&val, sizeof(val));
		
		RegCloseKey(hKey);
	}

  // block IE10 automatic install
	if( SUCCEEDED(RegCreateKeyEx(HKEY_LOCAL_MACHINE, _T("SOFTWARE\\Microsoft\\Internet Explorer\\Setup\\10.0"), 0, 0, 0, KEY_READ | KEY_WRITE, NULL, &hKey, NULL)) )
	{
		DWORD val = 1;
		RegSetValueEx(hKey, _T("DoNotAllowIE10"), 0, REG_DWORD, (LPBYTE)&val, sizeof(val));
		
		RegCloseKey(hKey);
	}

  // block IE11 automatic install
	if( SUCCEEDED(RegCreateKeyEx(HKEY_LOCAL_MACHINE, _T("SOFTWARE\\Microsoft\\Internet Explorer\\Setup\\11.0"), 0, 0, 0, KEY_READ | KEY_WRITE, NULL, &hKey, NULL)) ) {
		DWORD val = 1;
		RegSetValueEx(hKey, _T("DoNotAllowIE11"), 0, REG_DWORD, (LPBYTE)&val, sizeof(val));
		RegCloseKey(hKey);
	}

	// start up the url manager
	urlManager.Start();
	
	// create all of the worker
	SetStatus(_T("Starting worker..."));
	
	CRect desktop(0,0,browserWidth,browserHeight);

	// launch the worker thread
	worker = new CURLBlaster(m_hWnd, log, ipfw, testingMutex, *this);
	
	// pass on configuration information
	worker->errorLog		  = logFile;
	worker->urlManager		= &urlManager;
	worker->timeout		  = timeout;
	worker->desktop		  = desktop;
	worker->customEventText= customEventText;
	worker->accountBase	= accountBase;
	worker->password		  = password;
	worker->preLaunch		= preLaunch;
	worker->postLaunch		= postLaunch;
	worker->dynaTrace		= dynaTrace;
	worker->pipeIn			  = pipeIn;
	worker->pipeOut		  = pipeOut;
	worker->useBitBlt		= 1;
  worker->keepDNS      = keepDNS;
	
	// force 1024x768 for screen shots
	worker->pos.right = browserWidth;
	worker->pos.bottom = browserHeight;
	
  if( useCurrentAccount )
    worker->hProfile = HKEY_CURRENT_USER;
		
	worker->Start(1);

	SetStatus(_T("Running..."));
	running = true;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CurlBlastDlg::KillWorker(void)
{
  // kill the watchdog
  HWND watchdog = ::FindWindow(_T("Urlblast_Watchdog"), NULL);
  if (watchdog)
    ::SendMessageTimeout(watchdog, WM_CLOSE, 0, 0, 0, 10000, NULL);

  // signal the worker to stop
  if (worker) {
    worker->Stop();
    delete worker;
    worker = NULL;
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LRESULT CurlBlastDlg::OnUpdateUI(WPARAM wParal, LPARAM lParam)
{
  // update the status message from the main thread
  status.SetWindowText(m_status);
	return 0;
}

/*-----------------------------------------------------------------------------
	Load the settings from urlBlaster.ini in the same directory as the exe
-----------------------------------------------------------------------------*/
void CurlBlastDlg::LoadSettings(void)
{
	USES_CONVERSION;

	TCHAR buff[1024];
	TCHAR iniFile[MAX_PATH];
	iniFile[0] = 0;
	GetModuleFileName(NULL, iniFile, _countof(iniFile));
	lstrcpy( PathFindFileName(iniFile), _T("urlBlast.ini") );

	startupDelay		    = GetPrivateProfileInt(_T("Configuration"), _T("Startup Delay"), 10, iniFile) * 1000;
	timeout				      = GetPrivateProfileInt(_T("Configuration"), _T("Timeout"), 120, iniFile);
	checkOpt			      = GetPrivateProfileInt(_T("Configuration"), _T("Check Optimizations"), 1, iniFile);
	browserWidth		    = GetPrivateProfileInt(_T("Configuration"), _T("Browser Width"), 1024, iniFile);
	browserHeight		    = GetPrivateProfileInt(_T("Configuration"), _T("Browser Height"), 768, iniFile);
	debug				        = GetPrivateProfileInt(_T("Configuration"), _T("debug"), 0, iniFile);
	pipeIn				      = GetPrivateProfileInt(_T("Configuration"), _T("pipe in"), 1, iniFile);
	pipeOut				      = GetPrivateProfileInt(_T("Configuration"), _T("pipe out"), 2, iniFile);
	ec2					        = GetPrivateProfileInt(_T("Configuration"), _T("ec2"), 0, iniFile);
  useCurrentAccount   = GetPrivateProfileInt(_T("Configuration"), _T("Use Current Account"), 0, iniFile);;
  keepDNS		          = GetPrivateProfileInt(_T("Configuration"), _T("Keep DNS"), keepDNS, iniFile);

	log.debug = debug;

	// stop using these as soon as is humanly possible - it's an ugly hack and we now have the connection type
	// explicitly in the config file
	testID				= GetPrivateProfileInt(_T("Configuration"), _T("Test ID"), 0, iniFile);
	configID			= GetPrivateProfileInt(_T("Configuration"), _T("Config ID"), 0, iniFile);

	// account informatiion
	if( GetPrivateProfileString(_T("Configuration"), _T("account"), _T(""), buff, _countof(buff), iniFile ) )
		accountBase = buff;
	if( GetPrivateProfileString(_T("Configuration"), _T("password"), _T(""), buff, _countof(buff), iniFile ) )
		password = buff;

	// pre and post launch commands
	if( GetPrivateProfileString(_T("Configuration"), _T("pre launch"), _T(""), buff, _countof(buff), iniFile ) )
		preLaunch = buff;
	if( GetPrivateProfileString(_T("Configuration"), _T("post launch"), _T(""), buff, _countof(buff), iniFile ) )
		postLaunch = buff;

	// dynatrace path
	if( GetPrivateProfileString(_T("Configuration"), _T("dynaTrace"), _T(""), buff, _countof(buff), iniFile ) )
		dynaTrace = buff;

	if( GetPrivateProfileString(_T("Configuration"), _T("Log File"), _T("c:\\urlBlast"), buff, _countof(buff), iniFile ) )
	{
		logFile = buff;
		logFile.Replace(_T("%MACHINE%"), computerName);
		urlManager.SetLogFile(logFile);
	}
	log.SetLogFile(logFile);

	if( GetPrivateProfileString(_T("Configuration"), _T("Event Text"), _T(""), buff, _countof(buff), iniFile ) )
		customEventText = buff;
	
	double objectSampleRate = 100.0;
	if( GetPrivateProfileString(_T("Configuration"), _T("Object Sample Rate"), _T("100.0"), buff, _countof(buff), iniFile ) )
		objectSampleRate = _tstof(buff);

	if( GetPrivateProfileString(_T("Configuration"), _T("Url Files Url"), _T(""), buff, _countof(buff), iniFile ) )
	{
		CString http = buff;
		if( http.Right(1) != '/' )
			http += "/";
		urlManager.SetHttp(http);
	}

	if( GetPrivateProfileString(_T("Configuration"), _T("Location Key"), _T(""), buff, _countof(buff), iniFile ) )
		urlManager.SetHttpKey(buff);

	if( GetPrivateProfileString(_T("Configuration"), _T("Proxy"), _T(""), buff, _countof(buff), iniFile ) )
		urlManager.SetHttpProxy(buff);

	if( GetPrivateProfileInt(_T("Configuration"), _T("No Update"), 0, iniFile ) )
		urlManager.SetNoUpdate(true);

	if( GetPrivateProfileString(_T("Configuration"), _T("Location"), _T(""), buff, _countof(buff), iniFile ) )
		urlManager.SetHttpLocation(buff);

	// set up the global url manager settings
	urlManager.SetCheckOpt(checkOpt);

	// make sure the directory for the log file exists
	TCHAR szDir[MAX_PATH];
	lstrcpy(szDir, (LPCTSTR)logFile);
	LPTSTR szFile = PathFindFileName(szDir);
	*szFile = 0;
	if( lstrlen(szDir) > 3 )
		SHCreateDirectoryEx(NULL, szDir, NULL);

	// see if we need to get the EC2 configuration
	if( ec2 )
		GetEC2Config();
}

/*-----------------------------------------------------------------------------
	Kill any Dr. Watson windows that are open (we already killed the browser process)
-----------------------------------------------------------------------------*/
void CurlBlastDlg::KillProcs(void)
{
	#ifndef _DEBUG
	
	WTS_PROCESS_INFO * proc = NULL;
	DWORD count = 0;
	if( WTSEnumerateProcesses(WTS_CURRENT_SERVER_HANDLE, 0, 1, &proc, &count) )
	{
		for( DWORD i = 0; i < count; i++ )
		{
			bool terminate = false;
			
			// check for Dr. Watson
			if( !lstrcmpi(PathFindFileName(proc[i].pProcessName), _T("dwwin.exe")) )
			{
				if( !bDrWatson )
				{
					log.LogEvent(event_KilledDrWatson);
					bDrWatson = true;
				}
				terminate = true;
			}
			else if(lstrcmpi(PathFindFileName(proc[i].pProcessName), _T("iexplore.exe")))
			{
			  if (worker) {
					EnterCriticalSection( &(worker->cs) );
					// make sure it's not the browser we launched
					if( proc[i].ProcessId != worker->browserPID 
						&& worker->userSID && proc[i].pUserSid 
						&& IsValidSid(worker->userSID) && IsValidSid(proc[i].pUserSid) )
					{
						// see if the SID matches
						if( EqualSid(proc[i].pUserSid, worker->userSID ) )
							terminate = true;
					}
					LeaveCriticalSection( &(worker->cs) );
			  }
			}

			if( terminate )
			{
				HANDLE hProc = OpenProcess(PROCESS_TERMINATE, FALSE, proc[i].ProcessId);
				if( hProc )
				{
					TerminateProcess(hProc, 0);
					CloseHandle(hProc);
				}
			}
		}
		
		WTSFreeMemory(proc);
	}
	#endif
}

/*-----------------------------------------------------------------------------
	Close any dialog windows that may be open
-----------------------------------------------------------------------------*/
void CurlBlastDlg::CloseDialogs(void)
{
	TCHAR szTitle[1025];
  // make sure wptdriver isn't doing a software install
  bool installing = false;
  HWND hWptDriver = ::FindWindow(_T("wptdriver_wnd"), NULL);
  if (hWptDriver) {
    if (::GetWindowText(hWptDriver, szTitle, _countof(szTitle))) {
      CString title = szTitle;
      title.MakeLower();
      if (title.Find(_T(" software")) >= 0)
        installing = true;
    }
  }

	// if there are any explorer windows open, disable this code (for local debugging and other work)
	if( !installing && !::FindWindow(_T("CabinetWClass"), NULL ) )
	{
		HWND hDesktop = ::GetDesktopWindow();
		HWND hWnd = ::GetWindow(hDesktop, GW_CHILD);
		TCHAR szClass[100];
		CArray<HWND> hDlg;
		const TCHAR * szKeepOpen[] = { 
			_T("urlblast")
			, _T("url blast")
			, _T("task manager")
			, _T("aol pagetest")
			, _T("choose file")
			, _T("network delay simulator") 
			, _T("shut down windows")
      , _T("vmware")
      , _T("security essentials")
		};

		// build a list of dialogs to close
		while(hWnd)
		{
			if(hWnd != m_hWnd)
			{
				if(::IsWindowVisible(hWnd))
					if(::GetClassName(hWnd, szClass, 100))
						if((!lstrcmp(szClass,_T("#32770"))||!lstrcmp(szClass,_T("Internet Explorer_Server")))) // check window title for all classes
						{
							bool bKill = true;

							// make sure it is not in our list of windows to keep
							if(::GetWindowText( hWnd, szTitle, 1024))
							{
								log.Trace(_T("Killing Dialog: %s"), szTitle);
								
								_tcslwr_s(szTitle, _countof(szTitle));
								for(int i = 0; i < _countof(szKeepOpen) && bKill; i++)
								{
									if(_tcsstr(szTitle, szKeepOpen[i]))
										bKill = false;
								}
								
								// do we have to terminate the process that owns it?
								if( !lstrcmp(szTitle, _T("server busy")) )
								{
									log.Trace(_T("Terminating process"));
									DWORD pid;
									GetWindowThreadProcessId(hWnd, &pid);
									HANDLE hProcess = OpenProcess(PROCESS_TERMINATE, FALSE, pid);
									if( hProcess )
									{
										TerminateProcess(hProcess, 0);
										CloseHandle(hProcess);
									}
								}
							}
						
							if(bKill)
								hDlg.Add(hWnd);	
						}
					        			
			}

			hWnd = ::GetWindow(hWnd, GW_HWNDNEXT);
		}

		// close all of the dialogs
		for(int i = 0; i < hDlg.GetSize(); i++)
		{
			//see if there is an OK button
			HWND hOk = ::FindWindowEx(hDlg[i], 0, 0, _T("OK"));
			if( hOk )
			{
				int id = ::GetDlgCtrlID(hOk);
				if( !id )
					id = IDOK;
				::PostMessage(hDlg[i],WM_COMMAND,id,0);
			}
			else
				::PostMessage(hDlg[i],WM_CLOSE,0,0);
		}
	}
}

/*-----------------------------------------------------------------------------
  Stop the given service
-----------------------------------------------------------------------------*/
void CurlBlastDlg::StopService(CString serviceName)
{
	SC_HANDLE scm = OpenSCManager(NULL, NULL, SC_MANAGER_ALL_ACCESS);
	if( scm )
	{
		SC_HANDLE svc = OpenService(scm, serviceName, GENERIC_READ | GENERIC_EXECUTE);
		if( svc )
		{
			// stop the service
			SERVICE_STATUS status;
			if( ControlService(svc, SERVICE_CONTROL_STOP, &status) )
			{
				// wait for it to actually stop
				while( status.dwCurrentState != SERVICE_STOPPED )
				{
					Sleep(500);
					if( !QueryServiceStatus(svc, &status) )
						status.dwCurrentState = SERVICE_STOPPED;
				}
			}
			
			CloseServiceHandle(svc);
		}
		
		CloseServiceHandle(scm);
	}
}

/*-----------------------------------------------------------------------------
	Set the screen resolution if it is currently too low
-----------------------------------------------------------------------------*/
void CurlBlastDlg::SetupScreen(void)
{
  DEVMODE mode;
  memset(&mode, 0, sizeof(mode));
  mode.dmSize = sizeof(mode);
  CStringA settings;
  DWORD x = 0, y = 0, bpp = 0;

  int index = 0;
  DWORD targetWidth = 1920;
  DWORD targetHeight = 1200;
  DWORD min_bpp = 15;
  while( EnumDisplaySettings( NULL, index, &mode) ) {
    index++;
    bool use_mode = false;
    log.Trace(_T("Available desktop resolution: %dx%d - %d bpp"), mode.dmPelsWidth, mode.dmPelsHeight, mode.dmBitsPerPel);
    if (x >= targetWidth && y >= targetHeight && bpp >= 24) {
      // we already have at least one suitable resolution.  
      // Make sure we didn't overshoot and pick too high of a resolution
      // or see if a higher bpp is available
      if (mode.dmPelsWidth >= targetWidth && mode.dmPelsWidth <= x &&
          mode.dmPelsHeight >= targetHeight && mode.dmPelsHeight <= y &&
          mode.dmBitsPerPel >= bpp)
        use_mode = true;
    } else {
      if (mode.dmPelsWidth == x && mode.dmPelsHeight == y) {
        if (mode.dmBitsPerPel >= bpp)
          use_mode = true;
      } else if ((mode.dmPelsWidth >= targetWidth ||
                  mode.dmPelsWidth >= x) &&
                 (mode.dmPelsHeight >= targetHeight ||
                  mode.dmPelsHeight >= y) && 
                 mode.dmBitsPerPel >= min_bpp) {
          use_mode = true;
      }
    }
    if (use_mode) {
        x = mode.dmPelsWidth;
        y = mode.dmPelsHeight;
        bpp = mode.dmBitsPerPel;
    }
  }

  log.Trace(_T("Preferred desktop resolution: %dx%d - %d bpp"), x, y, bpp);

  // get the current settings
  if (x && y && bpp && 
    EnumDisplaySettings(NULL, ENUM_CURRENT_SETTINGS, &mode)) {
    if (mode.dmPelsWidth < x || 
        mode.dmPelsHeight < y || 
        mode.dmBitsPerPel < bpp) {
      DEVMODE newMode;
      memcpy(&newMode, &mode, sizeof(mode));
      
      newMode.dmFields = DM_BITSPERPEL | DM_PELSWIDTH | DM_PELSHEIGHT;
      newMode.dmBitsPerPel = bpp;
      newMode.dmPelsWidth = x;
      newMode.dmPelsHeight = y;
      ChangeDisplaySettings( &newMode, CDS_UPDATEREGISTRY | CDS_GLOBAL );
      log.Trace(_T("Changed desktop resolution: %dx%d - %d bpp"), x, y, bpp);
    }
  }
}

/*-----------------------------------------------------------------------------
	Dynamically configure the location and server for an EC2 instance
-----------------------------------------------------------------------------*/
void CurlBlastDlg::GetEC2Config()
{
	log.Trace(_T("GetEC2Config"));

	CString server, location, locationKey;

	CString userData;
	if( GetUrlText(_T("http://169.254.169.254/latest/user-data"), userData) )
	{
		int pos = 0;
		do{
			CString token = userData.Tokenize(_T(" &"), pos).Trim();
			if( token.GetLength() )
			{
				int split = token.Find(_T('='), 0);
				if( split > 0 )
				{
					CString key = token.Left(split).Trim();
					CString value = token.Mid(split + 1).Trim();

					if( key.GetLength() )
					{
						if( !key.CompareNoCase(_T("wpt_server")) && value.GetLength() )
							server = CString(_T("http://")) + value + _T("/work/");
						else if( !key.CompareNoCase(_T("wpt_location")) && value.GetLength() )
							location = value; 
						else if( !key.CompareNoCase(_T("wpt_key")) )
							locationKey = value; 
						else if( !key.CompareNoCase(_T("wpt_timeout")) && value.GetLength() )
							timeout = _ttol(value); 
						else if( !key.CompareNoCase(_T("wpt_keep_DNS")) && value.GetLength() )
							keepDNS = _ttol(value); 
					}
				}
			}
		}while(pos > 0);
	}

	if( location.IsEmpty() )
	{
		// build the location name automatically from the availability zone
		CString zone;
		if( GetUrlText(_T("http://169.254.169.254/latest/meta-data/placement/availability-zone"), zone) )
		{
			int pos = zone.Find('-');
			if( pos )
			{
				pos = zone.Find('-', pos + 1);
				if( pos )
				{
					// figure out the browser version
					TCHAR buff[1024];
					CRegKey key;
					CString ieVer;
					if( SUCCEEDED(key.Open(HKEY_LOCAL_MACHINE, _T("SOFTWARE\\Microsoft\\Internet Explorer"), KEY_READ)) )
					{
						DWORD len = _countof(buff);
						if( SUCCEEDED(key.QueryStringValue(_T("Version"), buff, &len)) )
						{
							ieVer = buff;
							ieVer.Trim();
							ULONG ver = _ttol(ieVer);
							ieVer.Format(_T("%d"), ver);
							location = CString(_T("ec2-")) + zone.Left(pos).Trim() + CString(_T("-IE")) + ieVer;
						}
					}
				}
			}
		}
	}

	CString instance;
	GetUrlText(_T("http://169.254.169.254/latest/meta-data/instance-id"), instance);
	instance = instance.Trim();

	log.Trace(_T("EC2 server: %s"), (LPCTSTR)server);
	log.Trace(_T("EC2 location: %s"), (LPCTSTR)location);
	log.Trace(_T("EC2 locationKey: %s"), (LPCTSTR)locationKey);
	log.Trace(_T("EC2 Instance ID: %s"), (LPCTSTR)instance);

	if( !server.IsEmpty() )
		urlManager.SetHttp(server);

	if( !location.IsEmpty() )
		urlManager.SetHttpLocation(location);

	if( !locationKey.IsEmpty() )
		urlManager.SetHttpKey(locationKey);

	if( !instance.IsEmpty() )
		urlManager.SetHttpEC2Instance(instance);

  // force EC2 to use the current OS user account
  useCurrentAccount = 1;
}

/*-----------------------------------------------------------------------------
	Get a string response from the given url (used for querying the EC2 instance config)
-----------------------------------------------------------------------------*/
bool CurlBlastDlg::GetUrlText(CString url, CString &response)
{
	bool ret = false;

	try
	{
		// set up the session
		CInternetSession * session = new CInternetSession();
		if( session )
		{
			DWORD timeout = 10000;
			session->SetOption(INTERNET_OPTION_CONNECT_TIMEOUT, &timeout, sizeof(timeout), 0);
			session->SetOption(INTERNET_OPTION_RECEIVE_TIMEOUT, &timeout, sizeof(timeout), 0);
			session->SetOption(INTERNET_OPTION_SEND_TIMEOUT, &timeout, sizeof(timeout), 0);
			session->SetOption(INTERNET_OPTION_DATA_SEND_TIMEOUT, &timeout, sizeof(timeout), 0);
			session->SetOption(INTERNET_OPTION_DATA_RECEIVE_TIMEOUT, &timeout, sizeof(timeout), 0);

			CInternetFile * file = (CInternetFile *)session->OpenURL(url);
			if( file )
			{
				char buff[4097];
				DWORD len = sizeof(buff) - 1;
				UINT bytes = 0;
				do
				{
					bytes = file->Read(buff, len);
					if( bytes )
					{
						ret = true;
						buff[bytes] = 0;	// NULL-terminate it
						response += CA2T(buff);
					}
				}while( bytes );

				file->Close();
				delete file;
			}

			session->Close();
			delete session;
		}
	}
	catch(CInternetException * e)
	{
		e->Delete();
	}	
	catch(...)
	{
	}

	log.Trace(_T("EC2 '%s' -> '%s'"), (LPCTSTR)url, (LPCTSTR)response);

	return ret;
}

typedef void (__stdcall * WPTGHOOK_INSTALLHOOK)(void);
typedef void (__stdcall * WPTGHOOK_REMOVEHOOK)(void);

/*-----------------------------------------------------------------------------
	See if wptghook.dll is present and install the system-wide hook if it is
-----------------------------------------------------------------------------*/
void CurlBlastDlg::InstallSystemGDIHook()
{
  TCHAR dll[MAX_PATH];
  if( GetModuleFileName(NULL, dll, _countof(dll)) )
  {
    lstrcpy(PathFindFileName(dll), _T("wptghook.dll"));
    hHookDll = LoadLibrary(dll);
    if (hHookDll)
    {
      WPTGHOOK_INSTALLHOOK _installHook = (WPTGHOOK_INSTALLHOOK)GetProcAddress(hHookDll, "_InstallHook@0");
      if( _installHook )
        _installHook();
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CurlBlastDlg::RemoveSystemGDIHook()
{
  if (hHookDll)
  {
    WPTGHOOK_REMOVEHOOK _removeHook = (WPTGHOOK_REMOVEHOOK)GetProcAddress(hHookDll, "_RemoveHook@0");
    if( _removeHook )
      _removeHook();
  }
}

/*-----------------------------------------------------------------------------
  Clear out the temp files folder
-----------------------------------------------------------------------------*/
void CurlBlastDlg::ClearTemp()
{
  TCHAR path[MAX_PATH];
  if( GetTempPath(_countof(path), path) )
  {
    TCHAR longPath[MAX_PATH];
    if( GetLongPathName(path, longPath, _countof(longPath)) )
      DeleteDirectory(longPath, false);
  }

  // Clean out any old windows update downloads (over 1 month old)
  const unsigned __int64 TICKS_PER_MONTH = 10000000ui64 * 60ui64 * 60ui64 * 24ui64 * 30L;
  FILETIME now;
  GetSystemTimeAsFileTime(&now);
  ULARGE_INTEGER keep_start;
  keep_start.LowPart = now.dwLowDateTime;
  keep_start.HighPart = now.dwHighDateTime;
  keep_start.QuadPart -= TICKS_PER_MONTH;
  TCHAR dir[MAX_PATH];
  GetWindowsDirectory(dir, MAX_PATH);
  lstrcat(dir, _T("\\SoftwareDistribution\\Download\\"));
  CString downloads(dir);
  WIN32_FIND_DATA fd;
  HANDLE hFind = FindFirstFile(downloads + _T("*.*"), &fd);
  if (hFind != INVALID_HANDLE_VALUE) {
    do {
      if (lstrcmp(fd.cFileName, _T(".")) && lstrcmp(fd.cFileName, _T(".."))) {
        ULARGE_INTEGER file_time;
        file_time.LowPart = fd.ftLastWriteTime.dwLowDateTime;
        file_time.HighPart = fd.ftLastWriteTime.dwHighDateTime;
        if (file_time.QuadPart < keep_start.QuadPart) {
          if (fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY)
            DeleteDirectory(downloads + fd.cFileName, true);
          else
            DeleteFile(downloads + fd.cFileName);
        }
      }
    } while (FindNextFile(hFind, &fd));
    FindClose(hFind);
  }
}

/*-----------------------------------------------------------------------------
  Install/update the flash player if the executable is local 
  (delivered as part of an update)
-----------------------------------------------------------------------------*/
void CurlBlastDlg::InstallFlash()
{
    // try launching the current version of the installer from the same directory we are in
	  TCHAR path[MAX_PATH];
	  if( GetModuleFileName(NULL, path, _countof(path)) )
	  {
		  lstrcpy(PathFindFileName(path), _T("flash.exe"));
		  CString exe(path);
		  CString cmd = CString(_T("\"")) + exe + _T("\" -install");

		  PROCESS_INFORMATION pi;
		  STARTUPINFO si;
		  memset( &si, 0, sizeof(si) );
		  si.cb = sizeof(si);
		  si.dwFlags = STARTF_USESHOWWINDOW;
		  si.wShowWindow = SW_HIDE;
		  if( CreateProcess((LPCTSTR)exe, (LPTSTR)(LPCTSTR)cmd, 0, 0, FALSE, IDLE_PRIORITY_CLASS , 0, NULL, &si, &pi) )
		  {
			  WaitForSingleObject(pi.hProcess, 60 * 60 * 1000);
			  CloseHandle(pi.hThread);
			  CloseHandle(pi.hProcess);
        DeleteFile(path);
			  log.Trace(_T("Updated/installed flash"), (LPCTSTR)cmd);
		  }
	  }
}

void CurlBlastDlg::CheckAlive()
{
  EnterCriticalSection(&cs);
  if (lastAlive && freq) {
    __int64 now;
    QueryPerfCounter(now);
    int elapsed = 0;
    if (now > lastAlive)
      elapsed = (int)((now - lastAlive) / freq);
    // If we haven't seen an alive ping from the worker in the last 30 minutes,
    // force quite and let the watchdog restart us
    if (elapsed > 1800)
      exit(1);
  }
  LeaveCriticalSection(&cs);
}

void CurlBlastDlg::Alive()
{
  EnterCriticalSection(&cs);
  QueryPerfCounter(lastAlive);
  LeaveCriticalSection(&cs);
}
