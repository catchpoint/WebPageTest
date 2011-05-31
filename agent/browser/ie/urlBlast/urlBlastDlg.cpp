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
	, threadCount(1)
	, computerName(_T(""))
	, aliveFile(_T(""))
	, testType(0)
	, rebootInterval(0)
	, clearCacheInterval(-1)
	, labID(0)
	, dialerID(0)
	, connectionType(0)
	, uploadLogsInterval(0)
	, lastUpload(0)
	, testID(0)
	, configID(0)
	, timeout(0)
	, experimental(0)
	, running(false)
	, minInterval(5)
	, screenShotErrors(0)
	, checkOpt(1)
	, bDrWatson(false)
	, ifIndex(0)
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
  , clearShortTermCacheSecs(0)
{
	m_hIcon = AfxGetApp()->LoadIcon(IDR_MAINFRAME);
	
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
	DDX_Control(pDX, IDC_RATE, rate);
	DDX_Control(pDX, IDC_CPU, cpu);
	DDX_Control(pDX, IDC_REBOOT, rebooting);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
BEGIN_MESSAGE_MAP(CurlBlastDlg, CDialog)
	ON_WM_PAINT()
	ON_WM_QUERYDRAGICON()
	//}}AFX_MSG_MAP
	ON_WM_CLOSE()
	ON_WM_TIMER()
	ON_MESSAGE(MSG_UPDATE_UI, OnUpdateUI)
	ON_MESSAGE(MSG_CONTINUE_STARTUP, OnContinueStartup)
END_MESSAGE_MAP()


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

	// start up minimized
	ShowWindow(SW_MINIMIZE);
	
	LoadSettings();

	SetupScreen();
	
	rebooting.SetWindowText(_T(""));
	status.SetWindowText(_T("Starting up..."));
	SetTimer(1,startupDelay,NULL);

	return TRUE;  // return TRUE  unless you set the focus to a control
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
	
	KillTimer(1);
	KillTimer(2);
	KillTimer(3);

	status.SetWindowText(_T("Waiting to exit..."));
	
	// signal and wait for all of the workers to finish
	KillWorkers();

	// upload our current log files
	UploadLogs();
	
	// shut down the url manager
	urlManager.Stop();

  RemoveSystemGDIHook();

	crashLog = NULL;
	
	CDialog::OnOK();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CurlBlastDlg::OnTimer(UINT_PTR nIDEvent)
{
	switch( nIDEvent )
	{
		case 1: // startup delay
			{
				KillTimer(nIDEvent);
				DoStartup();
			}
			break;
			
		case 2:	// periodic timer
			{
				// close any open dialog windows
				CloseDialogs();
				
				// see if it is time to upload the log files
				CheckUploadLogs();
				
				// see if it is time to reboot
				CheckReboot();
				
				// do we need to exit?
				CheckExit();
				
				// see if we need to update the "alive" file
				WriteAlive();
				
				// kill any debug windows that are open
				KillProcs();

				// update the UI
				PostMessage(MSG_UPDATE_UI);
			}
			break;

    case 3: // slow periodic timer
      {
        // clear the temp folder
        ClearTemp();
      }
      break;
	}
}

typedef HRESULT (STDAPICALLTYPE* DLLREGISTERSERVER)(void);

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
unsigned __stdcall ClearCachesThreadProc( void* arg )
{
	CurlBlastDlg * dlg = (CurlBlastDlg *)arg;
	if( dlg )
		dlg->ClearCaches();
		
	return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CurlBlastDlg::DoStartup(void)
{
	QueryPerformanceFrequency((LARGE_INTEGER *)&freq);

	log.dialerId = dialerID;
	log.labID = labID;
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
			status.SetWindowText(_T("Registering pagetest..."));
			DLLREGISTERSERVER proc = (DLLREGISTERSERVER)GetProcAddress(hPagetest, "DllRegisterServer");
			if( proc )
				proc();
			FreeLibrary(hPagetest);
		}
	}

  InstallSystemGDIHook();

	status.SetWindowText(_T("Configuring Dummynet..."));
  ConfigureDummynet();
	
	// disable the DNS cache
	status.SetWindowText(_T("Disabling DNS cache..."));
	DisableDNSCache();

  // stop services that can interfere with our measurements
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
	if( SUCCEEDED(RegCreateKeyEx(HKEY_LOCAL_MACHINE, _T("SOFTWARE\\Microsoft\\Internet Explorer\\Setup\\9.0"), 0, NULL, REG_OPTION_NON_VOLATILE, NULL, NULL, &hKey, NULL)) )
	{
		DWORD val = 1;
		RegSetValueEx(hKey, _T("DoNotAllowIE90"), 0, REG_DWORD, (LPBYTE)&val, sizeof(val));
		
		RegCloseKey(hKey);
	}
	
	// clear the caches on a background thread
	HANDLE hThread = (HANDLE)_beginthreadex(0, 0, ::ClearCachesThreadProc, this, 0, 0);
	if( hThread )
		CloseHandle(hThread);
	
	// run a periodic timer for doing housekeeping work
	SetTimer(2, 500, NULL);
  SetTimer(3, 20000, NULL);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CurlBlastDlg::KillWorkers(void)
{
	// signal all of the workers to stop
	CURLBlaster * blaster;
	for( int i = 0; i < workers.GetCount(); i++ )
	{
		blaster = workers[i];
		if( blaster )
			blaster->Stop();
	}
	
	// now delete all of the workers (which will cause a blocking wait until it is actually finished)
	for( int i = 0; i < workers.GetCount(); i++ )
	{
		blaster = workers[i];
		if( blaster )
			delete blaster;
	}
	
	// clear the array
	workers.RemoveAll();
	
	// wipe out any IP addresses we added
	while( !ipContexts.IsEmpty() )
	{
		ULONG context = ipContexts.RemoveHead();
		DeleteIPAddress(context);
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
LRESULT CurlBlastDlg::OnUpdateUI(WPARAM wParal, LPARAM lParam)
{
	// only update every 100ms at most
	static DWORD lastTime = 0;
	static DWORD lastCount = 0;
	DWORD tick = GetTickCount();
	if( lastTime && (tick - lastTime > 100) )
	{
		__int64 now;
		QueryPerformanceCounter((LARGE_INTEGER *)&now);

		// update the count of url's hit so far
		DWORD count = 0;
		for( int i = 0; i < workers.GetCount(); i++ )
		{
			CURLBlaster * blaster = workers[i];
			if( blaster )
				count += blaster->count;
		}
		
		// calculate the rate
		if( start )
		{
			if( count != lastCount )
			{
				lastCount = count;
				
				CString buff;
				buff.Format(_T("Completed %d URLs...\n"), count);
				
				CString stat;
				urlManager.GetStatus(stat);
				buff += stat;

				status.SetWindowText(buff);
			
				double sec = (double)(now - start) / (double)freq;
				if( sec != 0.0 )
				{
					double ups = (double)count / sec;
					DWORD upd = (DWORD)(ups * 60.0 * 60.0 * 24.0);

					buff.Format(_T("Rate: %d urls/day"), upd);
					rate.SetWindowText(buff);
				}
			}
		}
		else
		{
			start = now;
			lastUpload = start;
		}
			
		// calculate the CPU usage
		__int64 idleTime, kernelTime, userTime;
		if( GetSystemTimes((FILETIME*)&idleTime, (FILETIME*)&kernelTime, (FILETIME*)&userTime) )
		{
			if( firstIdleTime )
			{
				__int64 idle = idleTime - firstIdleTime;
				__int64 kernel = kernelTime - firstKernelTime;
				__int64 user = userTime - firstUserTime;
				__int64 sys = kernel + user;
				if( sys )
				{
					int avg = (int)( (sys - idle) * 100 / sys );

					idle = idleTime - lastIdleTime;
					kernel = kernelTime - lastKernelTime;
					user = userTime - lastUserTime;
					sys = kernel + user;

					if( sys )
					{
						int last = (int)( ((kernel + user) - idle) * 100 / (kernel + user) );
						
						CString buff;
						buff.Format(_T("CPU Usage: %d%% (%d%% instantaneous)"), avg, last);
						cpu.SetWindowText(buff);
					}
				}
			}
			else
			{
				firstIdleTime = idleTime;
				firstKernelTime = kernelTime;
				firstUserTime = userTime;
			}
			
			lastIdleTime = idleTime;
			lastKernelTime = kernelTime;
			lastUserTime = userTime;
		}
	}
	
	lastTime = tick;

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
	threadCount			    = GetPrivateProfileInt(_T("Configuration"), _T("Thread Count"), 1, iniFile);
	timeout				      = GetPrivateProfileInt(_T("Configuration"), _T("Timeout"), 120, iniFile);
	testType			      = GetPrivateProfileInt(_T("Configuration"), _T("Test Type"), 4, iniFile);
	rebootInterval		  = GetPrivateProfileInt(_T("Configuration"), _T("Reboot Interval"), rebootInterval, iniFile);
	clearCacheInterval	= GetPrivateProfileInt(_T("Configuration"), _T("Clear Cache Interval"), 0, iniFile);
	labID				        = GetPrivateProfileInt(_T("Configuration"), _T("Lab ID"), -1, iniFile);
	dialerID			      = GetPrivateProfileInt(_T("Configuration"), _T("Dialer ID"), 0, iniFile);
	connectionType		  = GetPrivateProfileInt(_T("Configuration"), _T("Connection Type"), -1, iniFile);
	uploadLogsInterval	= GetPrivateProfileInt(_T("Configuration"), _T("Upload logs interval"), 0, iniFile);
	experimental		    = GetPrivateProfileInt(_T("Configuration"), _T("Experimental"), 0, iniFile);
	minInterval			    = GetPrivateProfileInt(_T("Configuration"), _T("Min Interval"), 5, iniFile);
	screenShotErrors	  = GetPrivateProfileInt(_T("Configuration"), _T("Screen Shot Errors"), 0, iniFile);
	checkOpt			      = GetPrivateProfileInt(_T("Configuration"), _T("Check Optimizations"), 1, iniFile);
	browserWidth		    = GetPrivateProfileInt(_T("Configuration"), _T("Browser Width"), 1024, iniFile);
	browserHeight		    = GetPrivateProfileInt(_T("Configuration"), _T("Browser Height"), 768, iniFile);
	debug				        = GetPrivateProfileInt(_T("Configuration"), _T("debug"), 0, iniFile);
	pipeIn				      = GetPrivateProfileInt(_T("Configuration"), _T("pipe in"), 1, iniFile);
	pipeOut				      = GetPrivateProfileInt(_T("Configuration"), _T("pipe out"), 2, iniFile);
	ec2					        = GetPrivateProfileInt(_T("Configuration"), _T("ec2"), 0, iniFile);
  useCurrentAccount   = GetPrivateProfileInt(_T("Configuration"), _T("Use Current Account"), 0, iniFile);;
  keepDNS		          = GetPrivateProfileInt(_T("Configuration"), _T("Keep DNS"), keepDNS, iniFile);
  clearShortTermCacheSecs	= GetPrivateProfileInt(_T("Configuration"), _T("Clear Short Cache Secs"), clearShortTermCacheSecs, iniFile);

	log.debug = debug;

	// Default to 1 thread if it was set to zero
	if( !threadCount )
		threadCount = 1;

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

	if( GetPrivateProfileString(_T("Configuration"), _T("Upload log file"), _T(""), buff, _countof(buff), iniFile ) )
	{
		CString uploadLogFile = buff;

		// add the test ID and config ID as necessary
		CString id;
		id.Format(_T("%d"), testID);
		uploadLogFile.Replace(_T("%TESTID%"), id);
		id.Format(_T("%d"), configID);
		uploadLogFile.Replace(_T("%CONFIGID%"), id);

		uploadLogFiles.Add(uploadLogFile);
	}

	// get any additional upload log files
	int index = 2;
	TCHAR val[34];
	while( GetPrivateProfileString(_T("Configuration"), CString(_T("Upload log file ")) + _itot(index, val, 10), _T(""), buff, _countof(buff), iniFile ) )
	{
		CString uploadLogFile = buff;

		// add the test ID and config ID as necessary
		CString id;
		id.Format(_T("%d"), testID);
		uploadLogFile.Replace(_T("%TESTID%"), id);
		id.Format(_T("%d"), configID);
		uploadLogFile.Replace(_T("%CONFIGID%"), id);

		uploadLogFiles.Add(uploadLogFile);

		index++;
	}

	if( GetPrivateProfileString(_T("Configuration"), _T("Alive File"), _T(""), buff, _countof(buff), iniFile ) )
	{
		aliveFile = buff;
		aliveFile.Replace(_T("%MACHINE%"), computerName);
	}

	if( GetPrivateProfileString(_T("Configuration"), _T("Url List"), _T(""), buff, _countof(buff), iniFile ) )
	{
		urlManager.SetUrlList(buff);
		urlManager.SetObjectSampleRate(objectSampleRate);
	}

	if( GetPrivateProfileString(_T("Configuration"), _T("Url Files Dir"), _T(""), buff, _countof(buff), iniFile ) )
	{
		CString dir = buff;
		if( dir.Right(1) != '\\' )
			dir += "\\";
		urlManager.SetFilesDir(dir);
	}

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

	if( GetPrivateProfileString(_T("Configuration"), _T("Crawler Config"), _T(""), buff, _countof(buff), iniFile ) )
		urlManager.SetCrawlerConfig(buff);

	if( GetPrivateProfileString(_T("Configuration"), _T("Crawler Files Dir"), _T(""), buff, _countof(buff), iniFile ) )
		urlManager.SetCrawlerFilesDir(buff);

	// set up the global url manager settings
	urlManager.SetMinInterval(minInterval);
	urlManager.SetTestType(testType);
	urlManager.SetCheckOpt(checkOpt);

	// see if we need to figure out the Dialer ID or Lab ID from the machine name
	if( !dialerID )
	{
		// find the index of the first number in the machine name
		int index = -1;
		int len = computerName.GetLength();
		for( int i = 0; i < len && index == -1; i++ )
			if( _istdigit(computerName[i]) )
				index = i;
				
		if( !dialerID && index != -1 )
			dialerID = _ttol(computerName.Right(len - index));
			
		if( !labID )
		{
			CString baseName = computerName.Left(index);
			labID = GetPrivateProfileInt(_T("Labs"), baseName, -1, iniFile);
		}
	}
	
	// make sure the directory for the log file exists
	TCHAR szDir[MAX_PATH];
	lstrcpy(szDir, (LPCTSTR)logFile);
	LPTSTR szFile = PathFindFileName(szDir);
	*szFile = 0;
	if( lstrlen(szDir) > 3 )
		SHCreateDirectoryEx(NULL, szDir, NULL);

	// get the machine's IP addresses
	addresses.RemoveAll();
  if( threadCount > 1 )
  {
	  PMIB_IPADDRTABLE pIPAddrTable;
	  DWORD dwSize = sizeof(MIB_IPADDRTABLE);
	  pIPAddrTable = (MIB_IPADDRTABLE*)malloc(dwSize);
	  if( pIPAddrTable )
	  {
		  DWORD ret = GetIpAddrTable(pIPAddrTable, &dwSize, TRUE);
		  if( ret == ERROR_INSUFFICIENT_BUFFER) 
		  {
			  free( pIPAddrTable );
			  pIPAddrTable = (MIB_IPADDRTABLE *) malloc ( dwSize );
			  if(pIPAddrTable)
				  ret = GetIpAddrTable(pIPAddrTable, &dwSize, TRUE);
		  }
  		
		  if( ret == NO_ERROR )
		  {
			  // figure out which interface has the default gateway on it (we only want those addresses)
			  IPAddr ipAddr = 0x0100A398;	// 152.163.0.1
			  DWORD iface;
			  if( GetBestInterface(ipAddr, &iface) == NO_ERROR )
			  {
				  ifIndex = iface;
				  for( DWORD i = 0; i < pIPAddrTable->dwNumEntries; i++ )
				  {
					  if( pIPAddrTable->table[i].dwIndex == iface )
					  {
						  in_addr addr;
						  addr.S_un.S_addr = pIPAddrTable->table[i].dwAddr;
						  addresses.Add(A2T(inet_ntoa(addr)));
					  }
				  }
			  }
		  }
  		
		  if( pIPAddrTable )
			  free(pIPAddrTable);
	  }
  }

	// see if we need to get the EC2 configuration
	if( ec2 )
		GetEC2Config();

	// adjust the clear cache interval and reboot interval +- 20% to level out the dialers
	if( clearCacheInterval )
		clearCacheInterval = clearCacheInterval + (rand() % (int)((double)clearCacheInterval * 0.4)) - (int)((double)clearCacheInterval * 0.2);
	if( rebootInterval )
		rebootInterval = rebootInterval + (rand() % (int)((double)rebootInterval * 0.4)) - (int)((double)rebootInterval * 0.2);
}

/*-----------------------------------------------------------------------------
	Check to see if it is time to reboot
-----------------------------------------------------------------------------*/
bool CurlBlastDlg::CheckReboot(bool force)
{
	bool ret = false;

	// force a reboot if we are having issues (like not checking for work for 30 minutes)
	if( urlManager.NeedReboot() )
		force = true;
	
	bool reboot = force;

	if( force || (rebootInterval && start && testType != 6) )
	{
		__int64 now;
		QueryPerformanceCounter((LARGE_INTEGER *)&now);
		
		int minutes = (DWORD)(((now - start) / freq) / 60);
		int remaining = 0;
		if( minutes < rebootInterval )
			remaining = rebootInterval - minutes;
			
		// check to see if we're having browsing problems and if so, force a reboot
		// all threads must have had 2 consecutive errors before we decide to reboot
//		CURLBlaster * blaster;
		bool rebootErrors = false;
/*		if( workers.GetCount() )
		{
			rebootErrors = true;
			for( int i = 0; i < workers.GetCount() && rebootErrors; i++ )
			{
				blaster = workers[i];
				if( blaster && blaster->sequentialErrors < 2 )
					rebootErrors = false;
			}
		}
*/		
		if( rebootErrors )
			log.LogEvent(event_SequentialErrors);
		
		if( remaining && !rebootErrors )
		{
			CString buff;
			buff.Format(_T("Rebooting in %d minute(s)"), remaining);
			rebooting.SetWindowText(buff);
		}
		else if( running )
			reboot = true;
			
		if( reboot )
		{
			ret = true;
			
			// shut everything down and reboot
			CWaitCursor w;
			
			KillTimer(1);
			KillTimer(2);

			rebooting.SetWindowText(_T("Rebooting NOW!"));
			status.SetWindowText(_T("Preparing to reboot..."));
			
			// signal and wait for all of the workers to finish
			KillWorkers();
			
			if( rebootErrors )
				log.LogEvent(event_Reboot, 1, _T("Error count exceeded"));
			else
				log.LogEvent(event_Reboot);
			
			// upload our current log files
			UploadLogs();
			
			// ok, do the actual reboot
			HANDLE hToken;
			if( OpenProcessToken( GetCurrentProcess() , TOKEN_ADJUST_PRIVILEGES | TOKEN_QUERY , &hToken) )
			{
				TOKEN_PRIVILEGES tp;
				
				if( LookupPrivilegeValue( NULL , SE_SHUTDOWN_NAME , &tp.Privileges[0].Luid ) )
				{
					tp.PrivilegeCount = 1;
					tp.Privileges[0].Attributes = SE_PRIVILEGE_ENABLED;
					AdjustTokenPrivileges( hToken , FALSE , &tp , 0 , (PTOKEN_PRIVILEGES) 0 , 0 ) ;
				}
				
				CloseHandle(hToken);
			}
			
			InitiateSystemShutdown( NULL, _T("URL Blast reboot interval expired."), 0, TRUE, TRUE );
		}
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
	Check to see if we need to write out the alive file 
	(every 60 seconds if one is configured)
-----------------------------------------------------------------------------*/
void CurlBlastDlg::WriteAlive(void)
{
	static DWORD lastWrite = 0;

	if( aliveFile.GetLength() )
	{
		DWORD now = GetTickCount();
		if( now < lastWrite || now - lastWrite > 60000 || !lastWrite )
		{
			// make sure the directory for the alive file exists
			TCHAR szDir[MAX_PATH];
			lstrcpy(szDir, (LPCTSTR)aliveFile);
			LPTSTR szFile = PathFindFileName(szDir);
			*szFile = 0;
			if( lstrlen(szDir) > 3 )
				SHCreateDirectoryEx(NULL, szDir, NULL);

			lastWrite = now;
			HANDLE hFile = CreateFile(aliveFile, GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE, &nullDacl, CREATE_ALWAYS, 0, 0);
			if( hFile != INVALID_HANDLE_VALUE )
				CloseHandle(hFile);
		}
	}
}

/*-----------------------------------------------------------------------------
	Check to see if we need to upload our log files
-----------------------------------------------------------------------------*/
void CurlBlastDlg::CheckUploadLogs(void)
{
	if( uploadLogsInterval && lastUpload && testType != 6 )
	{
		__int64 now;
		QueryPerformanceCounter((LARGE_INTEGER *)&now);
		int elapsed = (int)(((now - lastUpload) / freq) / 60);
		if( elapsed >= uploadLogsInterval )
		{
			// record this even if it didn't work so we don't try again right away
			lastUpload = now;	

			// make sure we're not going to reboot soon (which would also upload the log files)
			// otherwise just let the reboot do the upload
			bool upload = true;
			if( rebootInterval && start )
			{
				int minutes = (DWORD)(((now - start) / freq) / 60);
				int remaining = 0;
				if( minutes < rebootInterval )
					remaining = rebootInterval - minutes;
					
				if( remaining < (uploadLogsInterval / 2) )
					upload = false;
			}
						
			// upload the actual log files
			if( upload )
				UploadLogs();
		}
	}
}

/*-----------------------------------------------------------------------------
	Upload the log files
-----------------------------------------------------------------------------*/
void CurlBlastDlg::UploadLogs(void)
{
	bool ok = false;
	
	status.SetWindowText(_T("Uploading log files..."));

	// make sure they are really supposed to be uploaded
	if( uploadLogsInterval && uploadLogFiles.GetCount() )
	{
		// make sure all of the logs exist (even if they are empty)
		HANDLE hFile = CreateFile(logFile + _T("_IEWPG.txt"), GENERIC_READ | GENERIC_WRITE, 0, &nullDacl, OPEN_ALWAYS, 0, 0);
		if( hFile != INVALID_HANDLE_VALUE )
			CloseHandle(hFile);
		hFile = CreateFile(logFile + _T("_IEWTR.txt"), GENERIC_READ | GENERIC_WRITE, 0, &nullDacl, OPEN_ALWAYS, 0, 0);
		if( hFile != INVALID_HANDLE_VALUE )
			CloseHandle(hFile);
		hFile = CreateFile(logFile + _T("_log.txt"), GENERIC_READ | GENERIC_WRITE, 0, &nullDacl, OPEN_ALWAYS, 0, 0);
		if( hFile != INVALID_HANDLE_VALUE )
			CloseHandle(hFile);
			
		// build the date part of the file name
		CTime t = CTime::GetCurrentTime();

		// open (and lock) the local log files
		DWORD startMS = GetTickCount();
		HANDLE hSrc1 = INVALID_HANDLE_VALUE;
		do
		{
			hSrc1 = CreateFile(logFile + _T("_IEWPG.txt"), GENERIC_READ | GENERIC_WRITE, 0, 0, OPEN_EXISTING, 0, 0);
			if( hSrc1 == INVALID_HANDLE_VALUE )
				Sleep(100);
		}while( hSrc1 == INVALID_HANDLE_VALUE && GetTickCount() < startMS + 10000 );
		
		if( hSrc1 != INVALID_HANDLE_VALUE )
		{
			startMS = GetTickCount();
			HANDLE hSrc2 = INVALID_HANDLE_VALUE;
			do
			{
				hSrc2 = CreateFile(logFile + _T("_IEWTR.txt"), GENERIC_READ | GENERIC_WRITE, 0, 0, OPEN_EXISTING, 0, 0);
				if( hSrc2 == INVALID_HANDLE_VALUE )
					Sleep(100);
			}while( hSrc2 == INVALID_HANDLE_VALUE && GetTickCount() < startMS + 10000 );
			
			if( hSrc2 != INVALID_HANDLE_VALUE )
			{
				startMS = GetTickCount();
				HANDLE hSrc3 = INVALID_HANDLE_VALUE;
				do
				{
					hSrc3 = CreateFile(logFile + _T("_log.txt"), GENERIC_READ | GENERIC_WRITE, 0, 0, OPEN_EXISTING, 0, 0);
					if( hSrc3 == INVALID_HANDLE_VALUE )
						Sleep(100);
				}while( hSrc3 == INVALID_HANDLE_VALUE && GetTickCount() < startMS + 10000 );
				
				if( hSrc3 != INVALID_HANDLE_VALUE )
				{
					// loop through all of the log files
					for( int index = 0; index < uploadLogFiles.GetCount(); index++ )
					{
						CString uploadLogFile = uploadLogFiles[index];
						
						// build the destination log file root
						CString destFile = uploadLogFile;
						
						destFile.Replace(_T("%MACHINE%"), computerName);
						
						destFile.Replace(_T("%DATE%"), (LPCTSTR)t.Format(_T("%Y%m%d")));
						destFile.Replace(_T("%TIME%"), (LPCTSTR)t.Format(_T("%H%M%S")));
						
						// make sure the directory for the log file exists
						TCHAR szDir[MAX_PATH];
						lstrcpy(szDir, (LPCTSTR)destFile);
						LPTSTR szFile = PathFindFileName(szDir);
						*szFile = 0;
						if( lstrlen(szDir) > 3 )
							SHCreateDirectoryEx(NULL, szDir, NULL);

						// open (and lock) the remote log files
						startMS = GetTickCount();
						HANDLE hDest1 = INVALID_HANDLE_VALUE;
						do
						{
							hDest1 = CreateFile(destFile + _T("_IEWPG.txt"), GENERIC_WRITE, 0, &nullDacl, OPEN_ALWAYS, 0, 0);
							if( hDest1 == INVALID_HANDLE_VALUE )
								Sleep(100);
						}while( hDest1 == INVALID_HANDLE_VALUE && GetTickCount() < startMS + 10000 );

						if( hDest1 != INVALID_HANDLE_VALUE )
						{
							startMS = GetTickCount();
							HANDLE hDest2 = INVALID_HANDLE_VALUE;
							do
							{
								hDest2 = CreateFile(destFile + _T("_IEWTR.txt"), GENERIC_WRITE, 0, &nullDacl, OPEN_ALWAYS, 0, 0);
								if( hDest2 == INVALID_HANDLE_VALUE )
									Sleep(100);
							}while( hDest2 == INVALID_HANDLE_VALUE && GetTickCount() < startMS + 10000 );
							
							if( hDest2 != INVALID_HANDLE_VALUE )
							{
								startMS = GetTickCount();
								HANDLE hDest3 = INVALID_HANDLE_VALUE;
								do
								{
									hDest3 = CreateFile(destFile + _T("_log.txt"), GENERIC_WRITE, 0, &nullDacl, OPEN_ALWAYS, 0, 0);
									if( hDest3 == INVALID_HANDLE_VALUE )
										Sleep(100);
								}while( hDest3 == INVALID_HANDLE_VALUE && GetTickCount() < startMS + 10000 );
								
								if( hDest3 != INVALID_HANDLE_VALUE )
								{
									// move to the beginning of the source files
									SetFilePointer(hSrc1, 0, 0, FILE_BEGIN);
									SetFilePointer(hSrc2, 0, 0, FILE_BEGIN);
									SetFilePointer(hSrc3, 0, 0, FILE_BEGIN);

									// move to the end of the output files (in case they already existed)
									SetFilePointer(hDest1, 0, 0, FILE_END);
									SetFilePointer(hDest2, 0, 0, FILE_END);
									SetFilePointer(hDest3, 0, 0, FILE_END);
									
									// copy the log files over
									BYTE buff[8192];
									DWORD bytes, written;

									while( ReadFile(hSrc1, buff, sizeof(buff), &bytes, 0) && bytes )
										WriteFile(hDest1, buff, bytes, &written, 0);

									while( ReadFile(hSrc2, buff, sizeof(buff), &bytes, 0) && bytes )
										WriteFile(hDest2, buff, bytes, &written, 0);

									while( ReadFile(hSrc3, buff, sizeof(buff), &bytes, 0) && bytes )
										WriteFile(hDest3, buff, bytes, &written, 0);
										
									ok = true;
										
									CloseHandle(hDest3);
								}
								CloseHandle(hDest2);
							}
							CloseHandle(hDest1);
						}
					}

					// truncate the source files (only if the upload was successful)
					if( ok )
					{
						SetFilePointer(hSrc1, 0, 0, FILE_BEGIN);
						SetFilePointer(hSrc2, 0, 0, FILE_BEGIN);
						SetFilePointer(hSrc3, 0, 0, FILE_BEGIN);
						SetEndOfFile(hSrc1);
						SetEndOfFile(hSrc2);
						SetEndOfFile(hSrc3);
					}

					CloseHandle(hSrc3);
				}
				CloseHandle(hSrc2);
			}
			CloseHandle(hSrc1);
		}
	}
	
	if( ok )
		log.LogEvent(event_LogUpload);
	else
		log.LogEvent(event_LogUpload, 1);
	log.LogMachineInfo();
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
				// kill any processes that belong to our test users thaat we did not launch (and that aren't IE)
				CURLBlaster * blaster;
				for( int j = 0; j < workers.GetCount() && !terminate; j++ )
				{
					blaster = workers[j];
					if( blaster )
					{
						EnterCriticalSection( &(blaster->cs) );
						// make sure it's not the browser we launched
						if( proc[i].ProcessId != blaster->browserPID 
							&& blaster->userSID && proc[i].pUserSid 
							&& IsValidSid(blaster->userSID) && IsValidSid(proc[i].pUserSid) )
						{
							// see if the SID matches
							if( EqualSid(proc[i].pUserSid, blaster->userSID ) )
								terminate = true;
						}
						LeaveCriticalSection( &(blaster->cs) );
					}
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
	// if there are any explorer windows open, disable this code (for local debugging and other work)
	if( !::FindWindow(_T("CabinetWClass"), NULL ) )
	{
		HWND hDesktop = ::GetDesktopWindow();
		HWND hWnd = ::GetWindow(hDesktop, GW_CHILD);
		TCHAR szClass[100];
		TCHAR szTitle[1025];
		CArray<HWND> hDlg;
		const TCHAR * szKeepOpen[] = { 
			_T("urlblast")
			, _T("url blast")
			, _T("task manager")
			, _T("aol pagetest")
			, _T("choose file")
			, _T("network delay simulator") 
			, _T("shut down windows")
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
	See if we need to exit
-----------------------------------------------------------------------------*/
void CurlBlastDlg::CheckExit(void)
{
	if( running && testType == 6 )
		if( urlManager.Done() )
		{
			log.Trace(_T("CheckExit() - exiting"));
			
			// if we are crawling, do we need to upload logs or reboot?
			if( testType == 6 )
			{
				if( rebootInterval && start )
					CheckReboot(true);
				else
					OnClose();
			}
			else
				OnClose();
		}
}

/*-----------------------------------------------------------------------------
	Disable the DNS caching service
-----------------------------------------------------------------------------*/
void CurlBlastDlg::DisableDNSCache(void)
{
	// only disable the DNS cache if we are running more than one thread, otherwise we'll just rely on the dns flush
	if( threadCount > 1 )
	{
		SC_HANDLE scm = OpenSCManager(NULL, NULL, SC_MANAGER_ALL_ACCESS);
		if( scm )
		{
			SC_HANDLE svc = OpenService(scm, _T("dnscache"), GENERIC_READ | GENERIC_EXECUTE);
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
-----------------------------------------------------------------------------*/
void CurlBlastDlg::ClearCaches(void)
{
	bool forceClear = false;
	
	// find any user.machine name directories that indicate a user profile gone bad
	WIN32_FIND_DATA fd;
	CString dir = _T("C:\\Documents and Settings");
	TCHAR path[MAX_PATH];
	DWORD len = _countof(path);
	if( GetProfilesDirectory( path, &len ) )
		dir = path;
	dir += _T("\\");
	HANDLE hFind = FindFirstFile(dir + _T("user*.*"), &fd);
	if( hFind != INVALID_HANDLE_VALUE )
	{
		do
		{
			if( lstrlen(PathFindExtension(fd.cFileName)) > 1 )
				forceClear = true;
		}while(!forceClear && FindNextFile(hFind, &fd));
		FindClose(hFind);
	}
	
	if( forceClear || clearCacheInterval > 0 )
	{
		COleDateTime currentDate(time(0));
		DATE date = 1;
		
		HKEY hKey;
		if( SUCCEEDED(RegCreateKeyEx(HKEY_LOCAL_MACHINE, _T("SOFTWARE\\AOL\\UrlBlast"), 0, 0, 0, KEY_READ | KEY_WRITE, 0, &hKey, 0)))
		{
			bool clear = true;
			DWORD bytes = sizeof(date);
			if( SUCCEEDED(RegQueryValueEx(hKey, _T("Cache Cleared Date"), 0, 0, (LPBYTE)&date, &bytes)) )
			{
				COleDateTime lastClear(date);
				COleDateTimeSpan elapsed = currentDate - lastClear;
				if(elapsed.GetDays() < clearCacheInterval)
					clear = false;
			}
				
			if( forceClear || clear )
			{
				// delete the user profiles
				status.SetWindowText(_T("Clearing browser caches..."));
				
				hFind = FindFirstFile(dir + _T("user*.*"), &fd);
				if( hFind != INVALID_HANDLE_VALUE )
				{
					do
					{
						TCHAR path[MAX_PATH + 1];
						DWORD len = sizeof(path);
						memset(path, 0, sizeof(path));
						lstrcpy(path, dir);
						lstrcat(path, fd.cFileName);
						
						SHFILEOPSTRUCT op;
						memset(&op, 0, sizeof(op));
						op.wFunc = FO_DELETE;
						op.pFrom = path;
						op.fFlags = FOF_SILENT | FOF_NOCONFIRMATION | FOF_NOERRORUI | FOF_NOCONFIRMMKDIR;
						
						SHFileOperation(&op);
					}while(FindNextFile(hFind, &fd));
					FindClose(hFind);
				}
				
				// defrag the hard drive
				status.SetWindowText(_T("Defragmenting the hard drive..."));
				Defrag();
				
				// store the time things were cleared
				date = currentDate;
				RegSetValueEx(hKey, _T("Cache Cleared Date"), 0, REG_BINARY, (LPBYTE)&date, sizeof(date));
				
				log.LogEvent(event_ProfilesReset);
				log.LogMachineInfo();
			}

			RegCloseKey(hKey);
		}
	}
	
	// continue the startup process
	PostMessage(MSG_CONTINUE_STARTUP);
}

/*-----------------------------------------------------------------------------
	Defrag the hard drive
-----------------------------------------------------------------------------*/
void CurlBlastDlg::Defrag(void)
{
	TCHAR cmd[100];
	lstrcpy( cmd, _T("defrag c: -f -v") );
	
	STARTUPINFO si;
	memset(&si, 0, sizeof(si));
	si.cb = sizeof(si);
	
	PROCESS_INFORMATION pi;
	if( CreateProcess(NULL, cmd, 0, 0, FALSE, 0, 0, 0, &si, &pi) )
	{
		WaitForSingleObject(pi.hProcess, INFINITE);
		CloseHandle(pi.hThread);
		CloseHandle(pi.hProcess);
	}
}

/*-----------------------------------------------------------------------------
	Background processing is complete, start up the actual testing
-----------------------------------------------------------------------------*/
LRESULT CurlBlastDlg::OnContinueStartup(WPARAM wParal, LPARAM lParam)
{
	// flag as running and see if we need to reboot
	if( !CheckReboot() )
	{
		// start up the url manager
		urlManager.Start();
		
		// create all of the workers
		status.SetWindowText(_T("Starting workers..."));
		
		// see if we had enough addresses to use (we need one extra if we are binding to specific addresses)
		if( addresses.GetCount() <= threadCount )
			addresses.RemoveAll();
			
		CRect desktop(0,0,browserWidth,browserHeight);

		// launch the worker threads	
		DWORD useBitBlt = 0;
		if( threadCount == 1 )
			useBitBlt = 1;
		HANDLE * cacheHandles = new HANDLE[threadCount];
		HANDLE * runHandles = new HANDLE[threadCount];
		for( int i = 0; i < threadCount; i++ )
		{
			CString buff;
			buff.Format(_T("Starting user%d..."), i+1);
			status.SetWindowText(buff);
			
			CURLBlaster * blaster = new CURLBlaster(m_hWnd, log);
			workers.Add(blaster);
			
			cacheHandles[i] = blaster->hClearedCache;
			runHandles[i] = blaster->hRun;

			// pass on configuration information
			blaster->errorLog		  = logFile;
			blaster->testType		  = testType;
			blaster->urlManager		= &urlManager;
			blaster->labID			  = labID;
			blaster->dialerID		  = dialerID;
			blaster->connectionType	= connectionType;
			blaster->timeout		  = timeout;
			blaster->experimental	= experimental;
			blaster->desktop		  = desktop;
			blaster->customEventText= customEventText;
			blaster->screenShotErrors = screenShotErrors;
			blaster->accountBase	= accountBase;
			blaster->password		  = password;
			blaster->preLaunch		= preLaunch;
			blaster->postLaunch		= postLaunch;
			blaster->dynaTrace		= dynaTrace;
			blaster->pipeIn			  = pipeIn;
			blaster->pipeOut		  = pipeOut;
			blaster->useBitBlt		= useBitBlt;
      blaster->keepDNS      = keepDNS;
      blaster->clearShortTermCacheSecs = clearShortTermCacheSecs;
			
			// force 1024x768 for screen shots
			blaster->pos.right = browserWidth;
			blaster->pos.bottom = browserHeight;
			
			// hand an address to the thread to use (hand them out backwards)
			if( !addresses.IsEmpty() )
				blaster->ipAddress = addresses[addresses.GetCount() - i - 1];

      if( useCurrentAccount )
        blaster->hProfile = HKEY_CURRENT_USER;
				
			blaster->Start(i+1);
		}

		status.SetWindowText(_T("Clearing caches..."));

		// wait for all of the threads to finish clearing their caches
		WaitForMultipleObjects(threadCount, cacheHandles, TRUE, INFINITE);
		
		// start the threads running (1/2 second apart)
		for( int i = 0; i < threadCount; i++ )
		{
			CString buff;
			buff.Format(_T("Starting user%d..."), i+1);
			status.SetWindowText(buff);
			
			SetEvent(runHandles[i]);
			Sleep(500);
		}
		
		delete [] cacheHandles;
		delete [] runHandles;
		
		// send a UI update message
		PostMessage(MSG_UPDATE_UI);

		status.SetWindowText(_T("Running..."));
	}
	running = true;
	
	return 0;
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

	// Go through the possible modes to find the best candidate (>=1024x768 with the highest bpp)
	int index = 0;
	while( EnumDisplaySettings( NULL, index, &mode) )
	{
		index++;

		if( mode.dmPelsWidth >= (DWORD)browserWidth && mode.dmPelsHeight >= (DWORD)browserHeight && mode.dmBitsPerPel > bpp )
		{
			x = mode.dmPelsWidth;
			y = mode.dmPelsHeight;
			bpp = mode.dmBitsPerPel;
		}
	}

	// get the current settings
	if( x && y && bpp && EnumDisplaySettings( NULL, ENUM_CURRENT_SETTINGS, &mode) )
	{
		if( mode.dmPelsWidth < x || mode.dmPelsHeight < y || mode.dmBitsPerPel < bpp )
		{
			DEVMODE newMode;
			memcpy(&newMode, &mode, sizeof(mode));
			
			newMode.dmFields = DM_BITSPERPEL | DM_PELSWIDTH | DM_PELSHEIGHT;
			newMode.dmBitsPerPel = bpp;
			newMode.dmPelsWidth = x;
			newMode.dmPelsHeight = y;
			ChangeDisplaySettings( &newMode, CDS_UPDATEREGISTRY | CDS_GLOBAL );
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
						else if( !key.CompareNoCase(_T("wpt_threads")) && value.GetLength() )
							threadCount = _ttol(value); 
						else if( !key.CompareNoCase(_T("wpt_timeout")) && value.GetLength() )
							timeout = _ttol(value); 
						else if( !key.CompareNoCase(_T("wpt_reboot_interval")) && value.GetLength() )
							rebootInterval = _ttol(value); 
						else if( !key.CompareNoCase(_T("wpt_defrag_interval")) && value.GetLength() )
							clearCacheInterval = _ttol(value); 
						else if( !key.CompareNoCase(_T("wpt_keep_DNS")) && value.GetLength() )
							keepDNS = _ttol(value); 
						else if( !key.CompareNoCase(_T("wpt_clear_short_cache_secs")) && value.GetLength() )
							clearShortTermCacheSecs = _ttol(value); 
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

/*-----------------------------------------------------------------------------
	Run ipfw.cmd if it exists in the dummynet folder below our current directory
-----------------------------------------------------------------------------*/
void CurlBlastDlg::ConfigureDummynet()
{
	TCHAR dir[MAX_PATH];
	if( GetModuleFileName(NULL, dir, _countof(dir)) )
	{
    *PathFindFileName(dir) = 0;
    lstrcat(dir, _T("dummynet\\"));

    TCHAR command[1024];
    wsprintf(command, _T("cmd /C \"%sipfw.cmd\""), dir);

    log.Trace(_T("Running %s in %s"), command, dir);
	  STARTUPINFO si;
	  memset(&si, 0, sizeof(si));
	  si.cb = sizeof(si);
  	
	  PROCESS_INFORMATION pi;
	  if( CreateProcess(NULL, command, 0, 0, FALSE, 0, 0, dir, &si, &pi) )
	  {
		  WaitForSingleObject(pi.hProcess, INFINITE);
		  CloseHandle(pi.hThread);
		  CloseHandle(pi.hProcess);
	  }
  }
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
}