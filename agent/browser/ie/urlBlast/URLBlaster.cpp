#include "StdAfx.h"
#include "URLBlaster.h"
#include "urlBlast.h"
#include "urlBlastDlg.h"
#include <process.h>
#include <shlwapi.h>
#include <Userenv.h>
#include <Aclapi.h>
#include <Lm.h>
#include <WtsApi32.h>
#include "TraceRoute.h"
#include "log.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CURLBlaster::CURLBlaster(HWND hWnd, CLog &logRef, CIpfw &ipfwRef, HANDLE &testingMutexRef, CurlBlastDlg &dlgRef)
: userName(_T(""))
, hLogonToken(NULL)
, hProfile(NULL)
, password(_T("2dialit"))
, accountBase(_T("user"))
, hThread(NULL)
, index(0)
, count(0)
, hDlg(hWnd)
, urlManager(NULL)
, timeout(60)
, browserPID(0)
, userSID(NULL)
, log(logRef)
, pipeIn(0)
, pipeOut(0)
, hDynaTrace(NULL)
, useBitBlt(0)
, winpcap(logRef)
, keepDNS(0)
, heartbeatEvent(NULL)
, ipfw(ipfwRef)
, testingMutex(testingMutexRef)
, dlg(dlgRef)
{
	InitializeCriticalSection(&cs);
	hMustExit = CreateEvent(0, TRUE, FALSE, NULL );
	srand(GetTickCount());
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CURLBlaster::~CURLBlaster(void)
{
	SetEvent(hMustExit);
	
	// wait for the thread to exit (up to 2 hours)
	if( hThread )
	{
		WaitForSingleObject(hThread, 7200);
		CloseHandle(hThread);
	}
	
	if( hLogonToken )
	{
		if( hProfile && hProfile != HKEY_CURRENT_USER )
			UnloadUserProfile( hLogonToken, hProfile );

		CloseHandle( hLogonToken );
	}

  if( heartbeatEvent )
    CloseHandle(heartbeatEvent);
		
	CloseHandle( hMustExit );
	EnterCriticalSection(&cs);
	if( userSID )
	{
		HeapFree(GetProcessHeap(), 0, (LPVOID)userSID);
		userSID = 0;
	}
	LeaveCriticalSection(&cs);
	DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
static unsigned __stdcall ThreadProc( void* arg )
{
	CURLBlaster * blaster = (CURLBlaster *)arg;
	if( blaster )
		blaster->ThreadProc();
		
	return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CURLBlaster::Start(int userIndex)
{
	bool ret = false;

	TCHAR path[MAX_PATH];
  if( hProfile )
  {
    TCHAR name[1024];
    DWORD len = _countof(name);
    if( GetUserName(name, &len) )
    {
      userName = name;

      if( SHGetSpecialFolderPath(NULL, path, CSIDL_PROFILE, FALSE))
        profile = path;
    }
  }
  else
  {
	  // store off which user this worker belongs to
	  index = userIndex;
	  userName.Format(_T("%s%d"), (LPCTSTR)accountBase, index);
	  DWORD len = _countof(path);
    profile = CString(_T("C:\\Documents and Settings"));
	  if( GetProfilesDirectory(path, &len) )
		  profile = path;
	  profile += _T("\\");
	  profile += userName;
  }

  if( !dynaTrace.IsEmpty() && SHGetSpecialFolderPath(NULL, path, CSIDL_PROFILE, FALSE))
  {
    dynaTraceSessions = path;
    dynaTraceSessions += _T("\\.dynaTrace\\ajax\\browser\\iesessions");

    // create the registry entries to turn it on
    HKEY hKey;
    if( RegCreateKeyEx(HKEY_LOCAL_MACHINE, _T("System\\CurrentControlSet\\Control\\Session Manager\\Environment"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
    {
	    LPCTSTR szTrue = _T("true");
	    RegSetValueEx(hKey, _T("DT_AE_AGENTACTIVE"), 0, REG_SZ, (const LPBYTE)szTrue, (lstrlen(szTrue) + 1) * sizeof(TCHAR));
	    RegSetValueEx(hKey, _T("DT_IE_AGENT_ACTIVE"), 0, REG_SZ, (const LPBYTE)szTrue, (lstrlen(szTrue) + 1) * sizeof(TCHAR));

      LPCTSTR szSession = _T("WebPagetest");
	    RegSetValueEx(hKey, _T("DT_AE_AGENTNAME"), 0, REG_SZ, (const LPBYTE)szSession, (lstrlen(szSession) + 1) * sizeof(TCHAR));
	    RegSetValueEx(hKey, _T("DT_IE_SESSION_NAME"), 0, REG_SZ, (const LPBYTE)szSession, (lstrlen(szSession) + 1) * sizeof(TCHAR));

	    RegCloseKey(hKey);
      DWORD result;
      SendMessageTimeoutA(HWND_BROADCAST, WM_SETTINGCHANGE, 0, (LPARAM)"Environment", SMTO_ABORTIFHUNG, 5000, &result);
    }
  }
	
	info.userName = userName;

  windir = _T("c:\\windows");
  if( GetWindowsDirectory(path, _countof(path)) )
    windir = path;
	
	// default directories
  if( profile.GetLength() )
  {
	  cookies = profile + _T("\\Cookies");
	  history = profile + _T("\\Local Settings\\History");
	  tempFiles = profile + _T("\\Local Settings\\Temporary Internet Files");
	  webCache = profile + _T("\\Local Settings\\Application Data\\Microsoft\\Windows\\WebCache");
	  tempDir = profile + _T("\\Local Settings\\Temp");
	  desktopPath = profile + _T("\\Local Settings\\Desktop");
	  silverlight = profile + _T("\\Local Settings\\Application Data\\Microsoft\\Silverlight");
	  recovery = profile + _T("\\Local Settings\\Application Data\\Microsoft\\Internet Explorer\\Recovery\\Active");
	  flash = profile + _T("\\Application Data\\Macromedia\\Flash Player\\#SharedObjects");
    domStorage = profile + _T("\\Local Settings\\Application Data\\Microsoft\\Internet Explorer\\DOMStore");
  }

  // Get WinPCap ready (install it if necessary)
  winpcap.Initialize();

  // create a heartbeat event that the browser plugin can fire for when scripts are running
	SECURITY_ATTRIBUTES nullDacl;
	ZeroMemory(&nullDacl, sizeof(nullDacl));
	nullDacl.nLength = sizeof(nullDacl);
	nullDacl.bInheritHandle = FALSE;
	SECURITY_DESCRIPTOR SD;
	if( InitializeSecurityDescriptor(&SD, SECURITY_DESCRIPTOR_REVISION) )
		if( SetSecurityDescriptorDacl(&SD, TRUE,(PACL)NULL, FALSE) )
			nullDacl.lpSecurityDescriptor = &SD;
  heartbeatEventName.Format(_T("Global\\URLBlast Heartbeat %d"), userIndex);
  heartbeatEvent = CreateEvent(&nullDacl, FALSE, FALSE, heartbeatEventName);

	// spawn the worker thread
	ResetEvent(hMustExit);
	hThread = (HANDLE)_beginthreadex(0, 0, ::ThreadProc, this, 0, 0);
	if( hThread )
		ret = true;
	
	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CURLBlaster::Stop(void)
{
	SetEvent(hMustExit);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CURLBlaster::ThreadProc(void)
{
	if( DoUserLogon() )
	{
		log.Trace(_T("Running..."));
		dlg.SetStatus(_T("Running..."));

		// start off with IPFW in a clean state
    WaitForSingleObject(testingMutex, INFINITE);
		ResetIpfw();
	  Launch(_T("RunDll32.exe InetCpl.cpl,ClearMyTracksByProcess 6655"));
    ReleaseMutex(testingMutex);

		while( WaitForSingleObject(hMustExit,0) == WAIT_TIMEOUT )
		{
		  dlg.Alive();
		  
			// get the url to test
      WaitForSingleObject(testingMutex, INFINITE);
      dlg.SetStatus(_T("Checking for work..."));
			if(	GetUrl() )
			{
        if( info.testType.GetLength() )
        {
          // running a custom test
          do
          {
            if( !info.testType.CompareNoCase(_T("traceroute")) )
            {
              CTraceRoute tracert(info);
              tracert.Run();
            }

            urlManager->UrlFinished(info);
          }while( !info.done );
        }
        else if( !info.zipFileDir.IsEmpty() )
				{
					EncodeVideo();
					urlManager->UrlFinished(info);
				}
				else
				{
					// loop for as many runs as are needed for the current request
					do
					{
            OutputDebugString(_T("[UrlBlast] - Clearing Cache"));
            dlg.SetStatus(_T("[UrlBlast] - Clearing Cache"));
						ClearCache();

						dlg.Alive();
						if( Launch(preLaunch) )
						{
							LaunchBrowser();
              
							// record the cleared cache view
							if( urlManager->RunRepeatView(info) ) {
							  dlg.Alive();
								LaunchBrowser();
							}

							Launch(postLaunch);
						}

            dlg.SetStatus(_T("Uploading test run..."));
						urlManager->UrlFinished(info);
					}while( !info.done );
				}
        ReleaseMutex(testingMutex);
        dlg.Alive();
        OutputDebugString(_T("[UrlBlast] - Test complete"));
        dlg.SetStatus(_T("[UrlBlast] - Test complete"));
			}
			else
      {
        ReleaseMutex(testingMutex);
        dlg.Alive();
        dlg.SetStatus(_T("Waiting for next test..."));
				Sleep(500 + (rand() % 500));
      }
		}
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CURLBlaster::DoUserLogon(void)
{
	bool ret = false;
	
  if( hProfile )
    ret = true;
  else
  {
	  log.Trace(_T("Logging on user:%s, password:%s"), (LPCTSTR)userName, (LPCTSTR)password);
  	
	  // create the account if it doesn't exist
	  USER_INFO_0 * userInfo = NULL;
	  if( !NetUserGetInfo( NULL, userName, 0, (LPBYTE *)&userInfo ) )
		  NetApiBufferFree(userInfo);
	  else
	  {
		  USER_INFO_1 info;
		  memset(&info, 0, sizeof(info));
		  wchar_t name[1000];
		  wchar_t pw[PWLEN];
		  lstrcpyW(name, CT2W(userName));
		  lstrcpyW(pw, CT2W(password));
  		
		  info.usri1_name = name;
		  info.usri1_password = pw;
		  info.usri1_priv = USER_PRIV_USER;
		  info.usri1_comment = L"UrlBlast testing user account";
		  info.usri1_flags = UF_SCRIPT | UF_DONT_EXPIRE_PASSWD;

		  if( !NetUserAdd(NULL, 1, (LPBYTE)&info, NULL) )
		  {
			  CString msg;
			  msg.Format(_T("Created user account '%s'"), (LPCTSTR)userName);
			  log.LogEvent(event_Info, 0, msg);
  			
			  // hide the account from the welcome screen
			  HKEY hKey;
			  if( RegCreateKeyEx(HKEY_LOCAL_MACHINE, _T("SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon\\SpecialAccounts\\UserList"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
			  {
				  DWORD val = 0;
				  RegSetValueEx(hKey, userName, 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
				  RegCloseKey(hKey);
			  }
		  }
		  else
		  {
			  CString msg;
			  msg.Format(_T("Failed to create user account '%s'"), (LPCTSTR)userName);
			  log.LogEvent(event_Error, 0, msg);
		  }
	  }
  	
	  // log the user on
	  if( LogonUser(userName, NULL, password, LOGON32_LOGON_INTERACTIVE, LOGON32_PROVIDER_DEFAULT, &hLogonToken) )
	  {
		  TCHAR szUserName[100];
		  lstrcpy( szUserName, (LPCTSTR)userName);

		  // get the SID for the account
		  EnterCriticalSection(&cs);
		  TOKEN_USER * user = NULL;
		  DWORD userLen = 0;
		  DWORD len = 0;
		  GetTokenInformation(hLogonToken, TokenUser, &user, userLen, &len);
		  if( len )
		  {
			  user = (TOKEN_USER *)HeapAlloc(GetProcessHeap(), HEAP_ZERO_MEMORY, len);
			  userLen = len;
			  if( user )
			  {
				  if( GetTokenInformation(hLogonToken, TokenUser, user, userLen, &len) )
				  {
					  if( user->User.Sid && IsValidSid(user->User.Sid) )
					  {
						  len = GetLengthSid(user->User.Sid);
						  userSID = HeapAlloc(GetProcessHeap(), HEAP_ZERO_MEMORY, len);
						  if( userSID )
							  CopySid(len, userSID, user->User.Sid);
					  }
				  }
				  HeapFree(GetProcessHeap(), 0, (LPVOID)user);

			  }
		  }
		  LeaveCriticalSection(&cs);
  		
		  log.Trace(_T("Logon ok, loading user profile"));
  		
		  // load their profile
		  PROFILEINFO userProfile;
		  memset( &userProfile, 0, sizeof(userProfile) );
		  userProfile.dwSize = sizeof(userProfile);
		  userProfile.lpUserName = szUserName;

		  if( LoadUserProfile( hLogonToken, &userProfile ) )
		  {
			  hProfile = userProfile.hProfile;
  			
			  log.Trace(_T("Profile loaded, locating profile directory"));
  			
			  // close the IE settings from the main OS user to the URLBlast user
			  CloneIESettings();

			  // figure out where their directories are
			  TCHAR path[MAX_PATH];
			  DWORD len = _countof(path);
			  if( GetUserProfileDirectory(hLogonToken, path, &len) )
			  {
				  profile = path;
  				
				  HKEY hKey;
				  if( SUCCEEDED(RegOpenKeyEx((HKEY)hProfile, _T("Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders"), 0, KEY_READ, &hKey)) )
				  {
					  len = _countof(path);
					  if( SUCCEEDED(RegQueryValueEx(hKey, _T("Cookies"), 0, 0, (LPBYTE)path, &len)) )
						  cookies = path;

					  len = _countof(path);
					  if( SUCCEEDED(RegQueryValueEx(hKey, _T("History"), 0, 0, (LPBYTE)path, &len)) )
						  history = path;

					  len = _countof(path);
					  if( SUCCEEDED(RegQueryValueEx(hKey, _T("Cache"), 0, 0, (LPBYTE)path, &len)) )
						  tempFiles = path;

					  len = _countof(path);
					  if( SUCCEEDED(RegQueryValueEx(hKey, _T("Desktop"), 0, 0, (LPBYTE)path, &len)) )
						  desktopPath = path;

					  len = _countof(path);
					  if( SUCCEEDED(RegQueryValueEx(hKey, _T("Local AppData"), 0, 0, (LPBYTE)path, &len)) )
					  {
						  silverlight = path;
              recovery = silverlight + _T("\\Microsoft\\Internet Explorer\\Recovery\\Active");
						  webCache = silverlight + _T("\\Microsoft\\Windows\\WebCache");
						  silverlight += _T("\\Microsoft\\Silverlight");
					  }

					  len = _countof(path);
					  if( SUCCEEDED(RegQueryValueEx(hKey, _T("Local Settings"), 0, 0, (LPBYTE)path, &len)) )
					  {
              tempDir = path;
              tempDir += _T("\\Temp");
            }
            else
            {
					    len = _countof(path);
					    if( SUCCEEDED(RegQueryValueEx(hKey, _T("Local AppData"), 0, 0, (LPBYTE)path, &len)) )
					    {
                tempDir = path;
                tempDir += _T("\\Temp");
					    }
            }

					  len = _countof(path);
					  if( SUCCEEDED(RegQueryValueEx(hKey, _T("AppData"), 0, 0, (LPBYTE)path, &len)) )
					  {
						  flash = path;
						  flash += _T("\\Macromedia\\Flash Player\\#SharedObjects");
					  }

					  RegCloseKey(hKey);
				  }

				  if( SUCCEEDED(RegOpenKeyEx((HKEY)hProfile, _T("Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings\\5.0\\Cache\\Extensible Cache\\DOMStore"), 0, KEY_READ, &hKey)) )
				  {
					  len = _countof(path);
					  if( SUCCEEDED(RegQueryValueEx(hKey, _T("CachePath"), 0, 0, (LPBYTE)path, &len)) )
						  domStorage = path;
            
            RegCloseKey(hKey);
          }

				  cookies.Replace(_T("%USERPROFILE%"), profile);
				  history.Replace(_T("%USERPROFILE%"), profile);
				  tempFiles.Replace(_T("%USERPROFILE%"), profile);
				  webCache.Replace(_T("%USERPROFILE%"), profile);
				  tempDir.Replace(_T("%USERPROFILE%"), profile);
				  desktopPath.Replace(_T("%USERPROFILE%"), profile);
				  silverlight.Replace(_T("%USERPROFILE%"), profile);
				  recovery.Replace(_T("%USERPROFILE%"), profile);
				  flash.Replace(_T("%USERPROFILE%"), profile);
				  domStorage.Replace(_T("%USERPROFILE%"), profile);
        }
  			
			  ret = true;
		  }
	  }
	  else
	  {
		  log.Trace(_T("Logon failed: %d"), GetLastError());
		  CString msg;
		  msg.Format(_T("Logon failed for '%s'"), (LPCTSTR)userName);
		  log.LogEvent(event_Error, 0, msg);
	  }

	  if( ret )
		  log.Trace(_T("DoUserLogon successful for %s"), (LPCTSTR)userName);
	  else
		  log.Trace(_T("DoUserLogon failed for %s"), (LPCTSTR)userName);
  }
	
	return ret;
}

int cacheCount;

/*-----------------------------------------------------------------------------
	Launch a process in the given user space that will delete the appropriate folders
-----------------------------------------------------------------------------*/
void CURLBlaster::ClearCache(void)
{
	// delete the cookies, history and temporary internet files for this user
	DeleteDirectory( cookies, false );
	DeleteDirectory( history, false );
  DeleteDirectory( domStorage, false );
	cacheCount = 0;
	DeleteDirectory( tempFiles, false );
	DeleteDirectory( webCache, false );
	DeleteDirectory( tempDir, false );
	CString buff;
	buff.Format(_T("%d files found in cache\n"), cacheCount);
	OutputDebugString(buff);
	DeleteDirectory( silverlight, false );
	DeleteDirectory( recovery, false );
	DeleteDirectory( flash, false );
  DeleteFile(desktopPath + _T("\\debug.log"));  // delete the desktop debug log from page speed - argh!
  DeleteDirectory( windir + _T("\\temp"), false );  // delete the global windows temp directory

  // delete the local storage quotas from the registry
  DeleteRegKey((HKEY)hProfile, _T("Software\\Microsoft\\Internet Explorer\\LowRegistry\\DOMStorage"), false);
  DeleteRegKey((HKEY)hProfile, _T("Software\\Microsoft\\Internet Explorer\\DOMStorage"), false);

  // flush the certificate revocation caches
  if (info.clearCerts) {
    Launch(_T("certutil.exe -urlcache * delete"));
    Launch(_T("certutil.exe -setreg chain\\ChainCacheResyncFiletime @now"));
  }

  // clear the wininet cache if we are running as the current user
  if (hProfile == HKEY_CURRENT_USER) {
    HANDLE hEntry;
	  DWORD len, entry_size = 0;
    GROUPID id;
    INTERNET_CACHE_ENTRY_INFO * info = NULL;
    HANDLE hGroup = FindFirstUrlCacheGroup(0, CACHEGROUP_SEARCH_ALL, 0, 0, &id, 0);
    if (hGroup) {
	    do {
        len = entry_size;
        hEntry = FindFirstUrlCacheEntryEx(NULL, 0, 0xFFFFFFFF, id, info, &len, NULL, NULL, NULL);
        if (!hEntry && GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
          entry_size = len;
          info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
          if (info) {
            hEntry = FindFirstUrlCacheEntryEx(NULL, 0, 0xFFFFFFFF, id, info, &len, NULL, NULL, NULL);
          }
        }
        if (hEntry && info) {
          bool ok = true;
          do {
            DeleteUrlCacheEntry(info->lpszSourceUrlName);
            len = entry_size;
            if (!FindNextUrlCacheEntryEx(hEntry, info, &len, NULL, NULL, NULL)) {
              if (GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
                entry_size = len;
                info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
                if (info) {
                  if (!FindNextUrlCacheEntryEx(hEntry, info, &len, NULL, NULL, NULL)) {
                    ok = false;
                  }
                }
              } else {
                ok = false;
              }
            }
          } while (ok);
        }
        if (hEntry) {
          FindCloseUrlCache(hEntry);
        }
        DeleteUrlCacheGroup(id, CACHEGROUP_FLAG_FLUSHURL_ONDELETE, 0);
	    } while(FindNextUrlCacheGroup(hGroup, &id,0));
	    FindCloseUrlCache(hGroup);
    }

    len = entry_size;
    hEntry = FindFirstUrlCacheEntryEx(NULL, 0, 0xFFFFFFFF, 0, info, &len, NULL, NULL, NULL);
    if (!hEntry && GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
      entry_size = len;
      info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
      if (info) {
        hEntry = FindFirstUrlCacheEntryEx(NULL, 0, 0xFFFFFFFF, 0, info, &len, NULL, NULL, NULL);
      }
    }
    if (hEntry && info) {
      bool ok = true;
      do {
        DeleteUrlCacheEntry(info->lpszSourceUrlName);
        len = entry_size;
        if (!FindNextUrlCacheEntryEx(hEntry, info, &len, NULL, NULL, NULL)) {
          if (GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
            entry_size = len;
            info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
            if (info) {
              if (!FindNextUrlCacheEntryEx(hEntry, info, &len, NULL, NULL, NULL)) {
                ok = false;
              }
            }
          } else {
            ok = false;
          }
        }
      } while (ok);
    }
    if (hEntry) {
      FindCloseUrlCache(hEntry);
    }

    len = entry_size;
    hEntry = FindFirstUrlCacheEntry(NULL, info, &len);
    if (!hEntry && GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
      entry_size = len;
      info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
      if (info) {
        hEntry = FindFirstUrlCacheEntry(NULL, info, &len);
      }
    }
    if (hEntry && info) {
      bool ok = true;
      do {
        DeleteUrlCacheEntry(info->lpszSourceUrlName);
        len = entry_size;
        if (!FindNextUrlCacheEntry(hEntry, info, &len)) {
          if (GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
            entry_size = len;
            info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
            if (info) {
              if (!FindNextUrlCacheEntry(hEntry, info, &len)) {
                ok = false;
              }
            }
          } else {
            ok = false;
          }
        }
      } while (ok);
    }
    if (hEntry) {
      FindCloseUrlCache(hEntry);
    }
    if (info)
	    free(info);
  }

  // delete any .tmp files in our directory or the root directory of the drive.
  // Not sure where they are coming from but they collect over time.
	TCHAR path[MAX_PATH];
  if (GetModuleFileName(NULL, path, _countof(path))) {
		*PathFindFileName(path) = NULL;
    CString dir = path;
    WIN32_FIND_DATA fd;
    HANDLE find = FindFirstFile(dir + _T("\\*.tmp"), &fd);
    if (find != INVALID_HANDLE_VALUE) {
      do {
        DeleteFile(dir + CString(_T("\\")) + fd.cFileName);
      } while(FindNextFile(find, &fd));
      FindClose(find);
    }
    find = FindFirstFile(_T("C:\\*.tmp"), &fd);
    if (find != INVALID_HANDLE_VALUE) {
      do {
        DeleteFile(CString(_T("C:\\")) + fd.cFileName);
      } while(FindNextFile(find, &fd));
      FindClose(find);
    }
  }
  
  // This magic value is the combination of the following bitflags:
  // #define CLEAR_HISTORY         0x0001 // Clears history
  // #define CLEAR_COOKIES         0x0002 // Clears cookies
  // #define CLEAR_CACHE           0x0004 // Clears Temporary Internet Files folder
  // #define CLEAR_CACHE_ALL       0x0008 // Clears offline favorites and download history
  // #define CLEAR_FORM_DATA       0x0010 // Clears saved form data for form auto-fill-in
  // #define CLEAR_PASSWORDS       0x0020 // Clears passwords saved for websites
  // #define CLEAR_PHISHING_FILTER 0x0040 // Clears phishing filter data
  // #define CLEAR_RECOVERY_DATA   0x0080 // Clears webpage recovery data
  // #define CLEAR_PRIVACY_ADVISOR 0x0800 // Clears tracking data
  // #define CLEAR_SHOW_NO_GUI     0x0100 // Do not show a GUI when running the cache clearing
  //
  // Bitflags available but not used in this magic value are as follows:
  // #define CLEAR_USE_NO_THREAD      0x0200 // Do not use multithreading for deletion
  // #define CLEAR_PRIVATE_CACHE      0x0400 // Valid only when browser is in private browsing mode
  // #define CLEAR_DELETE_ALL         0x1000 // Deletes data stored by add-ons
  // #define CLEAR_PRESERVE_FAVORITES 0x2000 // Preserves cached data for "favorite" websites

  // Use the command-line version of cache clearing in case WinInet didn't work
  // 6655 = 0x19FF
  HANDLE hAsync = NULL;
  Launch(_T("RunDll32.exe InetCpl.cpl,ClearMyTracksByProcess 6655"), &hAsync);
  if (hAsync)
    CloseHandle(hAsync);

	cached = false;
}

/*-----------------------------------------------------------------------------
	Launch the browser and wait for it to exit
-----------------------------------------------------------------------------*/
bool CURLBlaster::LaunchBrowser(void)
{
	bool ret = false;
	info.testResult = -1;

	// flush the DNS cache
  OutputDebugString(_T("[UrlBlast] - Flushing DNS"));
  if( !keepDNS ) {
    dlg.SetStatus(_T("Flushing DNS..."));
	  FlushDNS();
	}

  // move the cursor to the top-left corner
  SetCursorPos(0,0);
  ShowCursor(FALSE);
	
	if( !info.url.IsEmpty() )
	{
		STARTUPINFOW si;
		memset(&si, 0, sizeof(si));
		si.cb = sizeof(si);

    OutputDebugString(_T("[UrlBlast] - Configuring IPFW"));
    dlg.SetStatus(_T("Configuring IPFW..."));
		if( ConfigureIpfw() )
		{
			if( ConfigureIE() )
			{
				ConfigurePagetest();

        CString browser;
        if( info.browser.GetLength() )
	      {
		      // check to see if the browser is in the same directory - otherwise let the path find it
		      browser = info.browser;
          TCHAR buff[MAX_PATH];
		      if( GetModuleFileName(NULL, buff, _countof(buff)) )
		      {
			      lstrcpy( PathFindFileName(buff), PathFindFileName(browser) );
			      if( GetFileAttributes(buff) != INVALID_FILE_ATTRIBUTES )
				      browser = buff;
		      }
	      }
				
				// build the launch command for IE
				TCHAR exe[MAX_PATH];
				TCHAR commandLine[MAX_PATH + 1024];
				if( !info.url.Left(6).CompareNoCase(_T("run://")) )
				{
					// we're launching a custom exe
					CString cmd = info.url.Mid(6);
					CString options;
					int index = cmd.Find(' ');
					if( index > 0 )
					{
						options = cmd.Mid(index + 1);
						cmd = cmd.Left(index);
					}
					cmd.Trim();
					options.Trim();
					
					// get the full path for the exe
					lstrcpy(exe, cmd);

					// build the command line
					lstrcpy( commandLine, _T("\"") );
					lstrcat( commandLine, exe );
					lstrcat( commandLine, _T("\"") );
					if( options.GetLength() )
						lstrcat( commandLine, CString(" ") + options );
				}
        else if( browser.GetLength() )
				{
					// custom browser
					lstrcpy( exe, browser );

					// build the command line
					lstrcpy( commandLine, _T("\"") );
					lstrcat( commandLine, exe );
					lstrcat( commandLine, _T("\"") );
				}
				else
				{
					// we're launching IE
					SHGetFolderPath(NULL, CSIDL_PROGRAM_FILES, 0, SHGFP_TYPE_CURRENT, exe);
					PathAppend(exe, _T("Internet Explorer\\iexplore.exe"));
					
					// give it an about:blank command line for launch
					lstrcpy( commandLine, _T("\"") );
					lstrcat( commandLine, exe );
					lstrcat( commandLine, _T("\" about:blank") );

					// see if we need to launch dynaTrace
					LaunchDynaTrace();
				}

        // start a packet capture if we need to
        if( !info.tcpdumpFile.IsEmpty() )
          winpcap.StartCapture(info.tcpdumpFile);
				
				PROCESS_INFORMATION pi;
				
				log.Trace(_T("Launching... user='%s', path='%s', command line='%s'"), (LPCTSTR)userName, (LPCTSTR)exe, (LPCTSTR)commandLine);
				
        OutputDebugString(_T("[UrlBlast] - Launching Browser"));
        dlg.SetStatus(_T("Launching Browser..."));

				// launch internet explorer as our user
        if( heartbeatEvent )
          ResetEvent(heartbeatEvent);
				EnterCriticalSection(&cs);
        bool ok = false;
        if( hProfile == HKEY_CURRENT_USER )
        {
				  if( CreateProcess(CT2W(exe), CT2W(commandLine), NULL, NULL, FALSE, 0, NULL, NULL, &si, &pi) )
            ok = true;
        }
        else
        {
				  if( CreateProcessWithLogonW(CT2W((LPCTSTR)userName), NULL, CT2W((LPCTSTR)password), 0, CT2W(exe), CT2W(commandLine), 0, NULL, NULL, &si, &pi) )
            ok = true;
        }

        if( ok )
				{
				  dlg.SetStatus(_T("Waiting for test to complete..."));
				  
					// keep track of the process ID for the browser we care about
					browserPID = pi.dwProcessId;
					LeaveCriticalSection(&cs);
					
					// boost the browser priority
					SetPriorityClass(pi.hProcess, ABOVE_NORMAL_PRIORITY_CLASS);
					
					log.LogEvent(event_BrowserLaunch, 0, (LPCTSTR)eventName.Left(1000));
					
					// wait for it to exit - give it up to double the timeout value
					// TODO:  have urlManager specify the timeout
				  int multiple = 2;
          if( info.runningScript )
					  multiple = 10;
          if( heartbeatEvent )
          {
            HANDLE handles[2];
            handles[0] = heartbeatEvent;
            handles[1] = pi.hProcess;
            DWORD forceEnd = GetTickCount() + (timeout * multiple * 1000);
            DWORD waitResult;

            // keep looping as long as we keep getting heartbeats
            do 
            {
              waitResult = WaitForMultipleObjects(2, handles, FALSE, timeout * 1000);
              if( waitResult == WAIT_OBJECT_0 + 1 )
                ret = true;
            } while( waitResult == WAIT_OBJECT_0 && GetTickCount() < forceEnd);
          }
          else
          {
					  if( WaitForSingleObject(pi.hProcess, timeout * multiple * 1000) == WAIT_OBJECT_0 )
              ret = true;
          }

          if( ret )
					{
						count++;
						cached = true;
						if( hDlg )
							PostMessage(hDlg, MSG_UPDATE_UI, 0, 0);
					}
					else
					{
						log.LogEvent(event_TerminatedBrowser, 0, (LPCTSTR)eventName.Left(1000));
						TerminateProcess(pi.hProcess, 0);	// kill the browser if it didn't exit on it's own
					}
          OutputDebugString(_T("[UrlBlast] - Browser Finished"));
					
					EnterCriticalSection(&cs);
					browserPID = 0;
					LeaveCriticalSection(&cs);
					
					CloseHandle(pi.hThread);
					CloseHandle(pi.hProcess);
					
					// get the result
					HKEY hKey;
					if( RegCreateKeyEx((HKEY)hProfile, _T("SOFTWARE\\AOL\\ieWatch"), 0, 0, 0, KEY_READ | KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
					{
						info.cpu = 0;
						DWORD len = sizeof(info.cpu);
						RegQueryValueEx(hKey, _T("cpu"), 0, 0, (LPBYTE)&info.cpu, &len);
								
						RegDeleteValue(hKey, _T("Result"));
						RegDeleteValue(hKey, _T("cpu"));
						
						RegCloseKey(hKey);
					}

					// clean up any processes that may have been spawned
					KillProcs();
				}
				else
				{
					LeaveCriticalSection(&cs);
					LPVOID lpvMessageBuffer;
					FormatMessage(FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM, NULL, GetLastError(),  MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT),  (LPTSTR)&lpvMessageBuffer, 0, NULL);
					LPCTSTR szMsg = (LPCTSTR)lpvMessageBuffer;
					LocalFree(lpvMessageBuffer);

					CString msg;
					msg.Format(_T("Failed to launch browser '%s' - %s"), (LPCTSTR)szMsg, (LPCTSTR)exe);
					log.LogEvent(event_Error, 0, msg);
				}

        // stop the tcpdump if we started one
        if( !info.tcpdumpFile.IsEmpty() )
          winpcap.StopCapture();

				CloseDynaTrace();
			}

      OutputDebugString(_T("[UrlBlast] - Resetting IPFW"));
			ResetIpfw();
		}
	}

  // restore the cursor
  ShowCursor(TRUE);
	
	return ret;
}

/*-----------------------------------------------------------------------------
	Get the next url to test
-----------------------------------------------------------------------------*/
bool CURLBlaster::GetUrl(void)
{
	bool ret = false;
	info.Reset();

	// get a new url from the central url manager
	if( urlManager->GetNextUrl(info) )
	{
		info.eventText += customEventText;
		
		ret = true;
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
	Store the stuff pagetest needs in the registry
-----------------------------------------------------------------------------*/
void CURLBlaster::ConfigurePagetest(void)
{
	if( hProfile )
	{
		// tell it what url to test
		HKEY hKey;
		if( RegCreateKeyEx((HKEY)hProfile, _T("SOFTWARE\\AOL\\ieWatch"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
		{
			RegSetValueEx(hKey, _T("url"), 0, REG_SZ, (const LPBYTE)(LPCTSTR)info.url, (info.url.GetLength() + 1) * sizeof(TCHAR));
			DWORD block = 1;
			RegSetValueEx(hKey, _T("Block All Popups"), 0, REG_DWORD, (const LPBYTE)&block, sizeof(block));
			RegSetValueEx(hKey, _T("Timeout"), 0, REG_DWORD, (const LPBYTE)&timeout, sizeof(timeout));
			
			// tell ieWatch where to place the browser window
			DWORD val = 0;
			RegSetValueEx(hKey, _T("Window Left"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
			RegSetValueEx(hKey, _T("Window Top"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
			val = pos.right;
			RegSetValueEx(hKey, _T("Window Width"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
			val = pos.bottom;
			RegSetValueEx(hKey, _T("Window Height"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));

			// delete any old results from the reg key
			RegDeleteValue(hKey, _T("Result"));
			RegDeleteValue(hKey, _T("cpu"));

			RegCloseKey(hKey);
		}
		
		// create the event name
		DWORD isCached = 0;
		CString cachedString;
		if( cached )
		{
			cachedString = _T("Cached-");
			isCached = 1;
		}
		else
		{
			cachedString = _T("Cleared Cache-");
		}

		eventName = cachedString + info.eventText + _T("^");
		if( info.runningScript )
		{
			TCHAR script[MAX_PATH];
			lstrcpy(script, info.url.Right(info.url.GetLength() - 9));
			eventName += PathFindFileName(script);
		}
		else
			eventName += info.url;
		
		// give it the event name and log file location
		if( RegCreateKeyEx((HKEY)hProfile, _T("SOFTWARE\\America Online\\SOM"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
		{
			RegDeleteValue(hKey, _T("IEWatchLog"));
			if( !info.logFile.IsEmpty() )
				RegSetValueEx(hKey, _T("IEWatchLog"), 0, REG_SZ, (const LPBYTE)(LPCTSTR)info.logFile, (info.logFile.GetLength() + 1) * sizeof(TCHAR));
			
			RegDeleteValue(hKey, _T("Links File"));
			if( info.harvestLinks && !info.linksFile.IsEmpty() )
			{
				DeleteFile(info.linksFile);
				RegSetValueEx(hKey, _T("Links File"), 0, REG_SZ, (const LPBYTE)(LPCTSTR)info.linksFile, (info.linksFile.GetLength() + 1) * sizeof(TCHAR));			
			}
				
			RegDeleteValue(hKey, _T("404 File"));
			if( !info.s404File.IsEmpty() )
				RegSetValueEx(hKey, _T("404 File"), 0, REG_SZ, (const LPBYTE)(LPCTSTR)info.s404File, (info.s404File.GetLength() + 1) * sizeof(TCHAR));			

			RegDeleteValue(hKey, _T("HTML File"));
			if( !info.htmlFile.IsEmpty() )
				RegSetValueEx(hKey, _T("HTML File"), 0, REG_SZ, (const LPBYTE)(LPCTSTR)info.htmlFile, (info.htmlFile.GetLength() + 1) * sizeof(TCHAR));			

			RegDeleteValue(hKey, _T("Cookies File"));
			if( !info.cookiesFile.IsEmpty() )
				RegSetValueEx(hKey, _T("Cookies File"), 0, REG_SZ, (const LPBYTE)(LPCTSTR)info.cookiesFile, (info.cookiesFile.GetLength() + 1) * sizeof(TCHAR));			

			RegSetValueEx(hKey, _T("EventName"), 0, REG_SZ, (const LPBYTE)(LPCTSTR)eventName, (eventName.GetLength() + 1) * sizeof(TCHAR));
			RegSetValueEx(hKey, _T("Cached"), 0, REG_DWORD, (const LPBYTE)&isCached, sizeof(isCached));
			RegSetValueEx(hKey, _T("URL"), 0, REG_SZ, (const LPBYTE)(LPCTSTR)info.url, (info.url.GetLength() + 1) * sizeof(TCHAR));
			RegSetValueEx(hKey, _T("DOM Element ID"), 0, REG_SZ, (const LPBYTE)(LPCTSTR)info.domElement, (info.domElement.GetLength() + 1) * sizeof(TCHAR));
			RegSetValueEx(hKey, _T("Check Optimizations"), 0, REG_DWORD, (const LPBYTE)&info.checkOpt, sizeof(info.checkOpt));
      RegSetValueEx(hKey, _T("No Headers"), 0, REG_DWORD, (const LPBYTE)&info.noHeaders, sizeof(info.noHeaders));
      RegSetValueEx(hKey, _T("No Images"), 0, REG_DWORD, (const LPBYTE)&info.noImages, sizeof(info.noImages));
      RegSetValueEx(hKey, _T("Run"), 0, REG_DWORD, (const LPBYTE)&info.currentRun, sizeof(info.currentRun));
			
			RegSetValueEx(hKey, _T("Include Object Data"), 0, REG_DWORD, (const LPBYTE)&info.includeObjectData, sizeof(info.includeObjectData));


			RegSetValueEx(hKey, _T("ignoreSSL"), 0, REG_DWORD, (const LPBYTE)&info.ignoreSSL, sizeof(info.ignoreSSL));
			RegSetValueEx(hKey, _T("clearShortTermCacheSecs"), 0, REG_DWORD, (const LPBYTE)&info.clearShortTermCacheSecs, sizeof(info.clearShortTermCacheSecs));
			
			CString descriptor = _T("Launch");
			RegSetValueEx(hKey, _T("Descriptor"), 0, REG_SZ, (const LPBYTE)(LPCTSTR)descriptor, (descriptor.GetLength() + 1) * sizeof(TCHAR));

			DWORD abm = 1;
			if( info.urlType == 1 )
				abm = 0;
			RegSetValueEx(hKey, _T("ABM"), 0, REG_DWORD, (const LPBYTE)&abm, sizeof(abm));

			DWORD val = 0;
			if( info.saveEverything )
				val = 1;
			RegSetValueEx(hKey, _T("Save Everything"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));

			val = 0;
			if( info.captureVideo )
				val = 1;
			RegSetValueEx(hKey, _T("Capture Video"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));

		  RegSetValueEx(hKey, _T("pngScreenShot"), 0, REG_DWORD, (const LPBYTE)&info.pngScreenShot, sizeof(info.pngScreenShot));
		  RegSetValueEx(hKey, _T("imageQuality"), 0, REG_DWORD, (const LPBYTE)&info.imageQuality, sizeof(info.imageQuality));
      RegSetValueEx(hKey, _T("bodies"), 0, REG_DWORD, (const LPBYTE)&info.bodies, sizeof(info.bodies));
      RegSetValueEx(hKey, _T("htmlbody"), 0, REG_DWORD, (const LPBYTE)&info.htmlbody, sizeof(info.htmlbody));
      RegSetValueEx(hKey, _T("keepua"), 0, REG_DWORD, (const LPBYTE)&info.keepua, sizeof(info.keepua));
      RegSetValueEx(hKey, _T("minimumDuration"), 0, REG_DWORD, (const LPBYTE)&info.minimumDuration, sizeof(info.minimumDuration));
      RegSetValueEx(hKey, _T("customRules"), 0, REG_SZ, (const LPBYTE)(LPCTSTR)info.customRules, (info.customRules.GetLength() + 1) * sizeof(TCHAR));
			RegDeleteValue(hKey, _T("customMetricsFile"));
      if (info.customMetrics.GetLength() &&
          info.customMetricsFile.GetLength()) {
        HANDLE hFile = CreateFile(info.customMetricsFile, GENERIC_WRITE, 0, 0, CREATE_ALWAYS, 0, 0);
        if (hFile != INVALID_HANDLE_VALUE) {
          DWORD dwBytes;
          WriteFile(hFile, (LPCSTR)info.customMetrics, info.customMetrics.GetLength(), &dwBytes, 0);
          CloseHandle(hFile);
          RegSetValueEx(hKey, _T("customMetricsFile"), 0, REG_SZ, (const LPBYTE)(LPCTSTR)info.customMetricsFile, (info.customMetricsFile.GetLength() + 1) * sizeof(TCHAR));
        }
      }

		  // Add the blockads bit.
		  RegSetValueEx(hKey, _T("blockads"), 0, REG_DWORD, (const LPBYTE)&info.blockads, sizeof(info.blockads));


			RegDeleteValue(hKey, _T("Block"));
			if( !info.block.IsEmpty() )
				RegSetValueEx(hKey, _T("Block"), 0, REG_SZ, (const LPBYTE)(LPCTSTR)info.block, (info.block.GetLength() + 1) * sizeof(TCHAR));
				
			RegDeleteValue(hKey, _T("Basic Auth"));
			if( !info.basicAuth.IsEmpty() )
				RegSetValueEx(hKey, _T("Basic Auth"), 0, REG_SZ, (const LPBYTE)(LPCTSTR)info.basicAuth, (info.basicAuth.GetLength() + 1) * sizeof(TCHAR));

			RegDeleteValue(hKey, _T("Host"));
			if( !info.host.IsEmpty() )
				RegSetValueEx(hKey, _T("Host"), 0, REG_SZ, (const LPBYTE)(LPCTSTR)info.host, (info.host.GetLength() + 1) * sizeof(TCHAR));

      RegSetValueEx(hKey, _T("Heartbeat Event"), 0, REG_SZ, (const LPBYTE)(LPCTSTR)heartbeatEventName, (heartbeatEventName.GetLength() + 1) * sizeof(TCHAR));

			RegCloseKey(hKey);
		}
		
	}
}

/*-----------------------------------------------------------------------------
	Setup the IE settings so we don't get a bunch of dialogs
-----------------------------------------------------------------------------*/
bool CURLBlaster::ConfigureIE(void)
{
	bool ret = false;

	if( hProfile )
	{
		ret = true;

		// Set some basic IE options
		HKEY hKey;
		if( RegCreateKeyEx((HKEY)hProfile, _T("Software\\Microsoft\\Internet Explorer\\Main"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
		{
			LPCTSTR szVal = _T("yes");
			RegSetValueEx(hKey, _T("DisableScriptDebuggerIE"), 0, REG_SZ, (const LPBYTE)szVal, (lstrlen(szVal) + 1) * sizeof(TCHAR));

			szVal = _T("no");
			RegSetValueEx(hKey, _T("FormSuggest PW Ask"), 0, REG_SZ, (const LPBYTE)szVal, (lstrlen(szVal) + 1) * sizeof(TCHAR));
			RegSetValueEx(hKey, _T("Friendly http errors"), 0, REG_SZ, (const LPBYTE)szVal, (lstrlen(szVal) + 1) * sizeof(TCHAR));
			RegSetValueEx(hKey, _T("Use FormSuggest"), 0, REG_SZ, (const LPBYTE)szVal, (lstrlen(szVal) + 1) * sizeof(TCHAR));

			DWORD val = 1;
			RegSetValueEx(hKey, _T("NoUpdateCheck"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
			RegSetValueEx(hKey, _T("NoJITSetup"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
			RegSetValueEx(hKey, _T("NoWebJITSetup"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
			RegSetValueEx(hKey, _T("UseSWRender"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));

			RegCloseKey(hKey);
		}
		
	  if( RegCreateKeyEx(HKEY_LOCAL_MACHINE, _T("Software\\Microsoft\\Internet Explorer\\Main\\FeatureControl\\FEATURE_DOWNLOAD_INITIATOR_HTTP_HEADER"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
	  {
		  DWORD val = 1;
		  RegSetValueEx(hKey, _T("*"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
		  RegCloseKey(hKey);
	  }

	  if( RegCreateKeyEx(HKEY_LOCAL_MACHINE, _T("Software\\Wow6432Node\\Microsoft\\Internet Explorer\\Main\\FeatureControl\\FEATURE_DOWNLOAD_INITIATOR_HTTP_HEADER"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
	  {
		  DWORD val = 1;
		  RegSetValueEx(hKey, _T("*"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
		  RegCloseKey(hKey);
	  }

		if( RegCreateKeyEx((HKEY)hProfile, _T("Software\\Microsoft\\Internet Explorer\\InformationBar"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
		{
			DWORD val = 0;
			RegSetValueEx(hKey, _T("FirstTime"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));

			RegCloseKey(hKey);
		}

		if( RegCreateKeyEx((HKEY)hProfile, _T("Software\\Microsoft\\Internet Explorer\\IntelliForms"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
		{
			DWORD val = 0;
			RegSetValueEx(hKey, _T("AskUser"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));

			RegCloseKey(hKey);
		}

		if( RegCreateKeyEx((HKEY)hProfile, _T("Software\\Microsoft\\Internet Explorer\\Security"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
		{
			LPCTSTR szVal = _T("Query");
			RegSetValueEx(hKey, _T("Safety Warning Level"), 0, REG_SZ, (const LPBYTE)szVal, (lstrlen(szVal) + 1) * sizeof(TCHAR));

			szVal = _T("Medium");
			RegSetValueEx(hKey, _T("Sending_Security"), 0, REG_SZ, (const LPBYTE)szVal, (lstrlen(szVal) + 1) * sizeof(TCHAR));

			szVal = _T("Low");
			RegSetValueEx(hKey, _T("Viewing_Security"), 0, REG_SZ, (const LPBYTE)szVal, (lstrlen(szVal) + 1) * sizeof(TCHAR));

			RegCloseKey(hKey);
		}

		if( RegCreateKeyEx((HKEY)hProfile, _T("Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
		{
			DWORD val = 1;
			RegSetValueEx(hKey, _T("AllowCookies"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
			RegSetValueEx(hKey, _T("EnableHttp1_1"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
			RegSetValueEx(hKey, _T("ProxyHttp1.1"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
			RegSetValueEx(hKey, _T("EnableNegotiate"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));

			val = 0;
			RegSetValueEx(hKey, _T("WarnAlwaysOnPost"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
			RegSetValueEx(hKey, _T("WarnonBadCertRecving"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
			RegSetValueEx(hKey, _T("WarnOnPost"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
			RegSetValueEx(hKey, _T("WarnOnPostRedirect"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
			RegSetValueEx(hKey, _T("WarnOnZoneCrossing"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
			//RegSetValueEx(hKey, _T("ProxyEnable"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
			
			RegCloseKey(hKey);
		}

		if( RegCreateKeyEx((HKEY)hProfile, _T("Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings\\5.0\\Cache\\Content"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
		{
			DWORD val = 131072;
			RegSetValueEx(hKey, _T("CacheLimit"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
			RegCloseKey(hKey);
		}

		if( RegCreateKeyEx((HKEY)hProfile, _T("Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings\\Cache\\Content"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
		{
			DWORD val = 131072;
			RegSetValueEx(hKey, _T("CacheLimit"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
			RegCloseKey(hKey);
		}

		// reset the toolbar layout (to make sure the sidebar isn't open)		
		if( RegCreateKeyEx((HKEY)hProfile, _T("Software\\Microsoft\\Internet Explorer\\Toolbar\\WebBrowser"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
		{
			RegDeleteValue(hKey, _T("ITBarLayout"));
			RegCloseKey(hKey);
		}
		
		// Tweak the security zone to eliminate some warnings
		if( RegCreateKeyEx((HKEY)hProfile, _T("Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings\\Zones\\3"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
		{
			DWORD val = 0;
			
			// don't warn about posting data
			RegSetValueEx(hKey, _T("1601"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));

			// don't warn about mixed content
			RegSetValueEx(hKey, _T("1609"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));

			RegCloseKey(hKey);
		}

	  // see what version of IE is installed
	  DWORD ver = 0;
	  CRegKey key;
	  if( SUCCEEDED(key.Open(HKEY_LOCAL_MACHINE, _T("SOFTWARE\\Microsoft\\Internet Explorer"), KEY_READ)) )
	  {
		  TCHAR buff[1024];
		  ULONG len;
		  len = _countof(buff);
		  if( SUCCEEDED(key.QueryStringValue(_T("Version"), buff, &len)) )
			  ver = _ttol(buff);
	  }

	  // Disable IE7  emulation for IE8
	  if( ver >= 8 )
	  {
		  if( RegCreateKeyEx(HKEY_LOCAL_MACHINE, _T("Software\\Microsoft\\Internet Explorer\\Main\\FeatureControl\\FEATURE_BROWSER_EMULATION"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
		  {
			  DWORD val = 8000;
        if( ver > 8 )
          val = 9000;
			  RegSetValueEx(hKey, _T("pagetest.exe"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
			  RegCloseKey(hKey);
		  }
		  if( RegCreateKeyEx((HKEY)hProfile, _T("Software\\Microsoft\\Internet Explorer\\Main\\FeatureControl\\FEATURE_BROWSER_EMULATION"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
		  {
        RegDeleteValue(hKey, _T("pagetest.exe"));
			  RegCloseKey(hKey);
		  }
  		
		  // set up IE8/9 connection settings
		  if( RegCreateKeyEx(HKEY_LOCAL_MACHINE, _T("SOFTWARE\\Microsoft\\Internet Explorer\\MAIN\\FeatureControl\\FEATURE_MAXCONNECTIONSPERSERVER"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
		  {
			  DWORD val = 6;
			  RegSetValueEx(hKey, _T("pagetest.exe"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
			  RegCloseKey(hKey);
		  }
		  if( RegCreateKeyEx((HKEY)hProfile, _T("SOFTWARE\\Microsoft\\Internet Explorer\\MAIN\\FeatureControl\\FEATURE_MAXCONNECTIONSPERSERVER"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
		  {
        RegDeleteValue(hKey, _T("pagetest.exe"));
			  RegCloseKey(hKey);
		  }
		  if( RegCreateKeyEx(HKEY_LOCAL_MACHINE, _T("SOFTWARE\\Microsoft\\Internet Explorer\\MAIN\\FeatureControl\\FEATURE_MAXCONNECTIONSPER1_0SERVER"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
		  {
			  DWORD val = 6;
			  RegSetValueEx(hKey, _T("pagetest.exe"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
			  RegCloseKey(hKey);
		  }
		  if( RegCreateKeyEx((HKEY)hProfile, _T("SOFTWARE\\Microsoft\\Internet Explorer\\MAIN\\FeatureControl\\FEATURE_MAXCONNECTIONSPER1_0SERVER"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
		  {
        RegDeleteValue(hKey, _T("pagetest.exe"));
			  RegCloseKey(hKey);
		  }
	  }

    // configure the compatibility view settings
	  if( RegCreateKeyEx((HKEY)hProfile, _T("SOFTWARE\\Microsoft\\Internet Explorer\\BrowserEmulation"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
	  {
		  DWORD val = 1;
      if (info.standards)
        val = 0;
		  RegSetValueEx(hKey, _T("MSCompatibilityMode"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
		  RegCloseKey(hKey);
	  }

    // configure javascript
	  if( RegCreateKeyEx((HKEY)hProfile, _T("Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings\\Zones\\3"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
	  {
		  DWORD val = 0;
      if (info.noscript)
        val = 3;
		  RegSetValueEx(hKey, _T("1400"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
		  RegCloseKey(hKey);
	  }


    // configure Chrome Frame to be the default renderer (if it is installed)
		if( RegCreateKeyEx((HKEY)hProfile, _T("Software\\Google\\ChromeFrame"), 0, 0, 0, KEY_WRITE, 0, &hKey, 0) == ERROR_SUCCESS )
		{
			DWORD val = 1;
			RegSetValueEx(hKey, _T("IsDefaultRenderer"), 0, REG_DWORD, (const LPBYTE)&val, sizeof(val));
			RegCloseKey(hKey);
		}
  }

	return ret;
}

/*-----------------------------------------------------------------------------
	Recusrively copy the IE settings
-----------------------------------------------------------------------------*/
void CURLBlaster::CloneIESettings(void)
{
	CloneRegKey( HKEY_CURRENT_USER, (HKEY)hProfile, _T("Software\\Microsoft\\Internet Explorer") );
	CloneRegKey( HKEY_CURRENT_USER, (HKEY)hProfile, _T("Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings") );
}

/*-----------------------------------------------------------------------------
	Recusrively copy a registry key
-----------------------------------------------------------------------------*/
void CURLBlaster::CloneRegKey(HKEY hSrc, HKEY hDest, LPCTSTR subKey)
{
	HKEY src;
	if( RegOpenKeyEx(hSrc, subKey, 0, KEY_READ, &src) == ERROR_SUCCESS )
	{
		HKEY dest;
		if( RegCreateKeyEx(hDest, subKey, 0, 0, 0, KEY_WRITE, 0, &dest, 0) == ERROR_SUCCESS )
		{
			// copy all of the values over
			DWORD nameSize = 16384;
			DWORD valSize = 32767;
			
			TCHAR * name = new TCHAR[nameSize];
			LPBYTE data = new BYTE[valSize];
			DWORD nameLen = nameSize;
			DWORD dataLen = valSize;

			DWORD type;
			DWORD index = 0;
			while( RegEnumValue(src, index, name, &nameLen, 0, &type, data, &dataLen) == ERROR_SUCCESS )
			{
				RegSetValueEx(dest, name, 0, type, data, dataLen);
				
				index++;
				nameLen = nameSize;
				dataLen = valSize;
			}
			
			// copy all of the sub-keys over
			index = 0;
			nameLen = nameSize;
			while( RegEnumKeyEx(src, index, name, &nameLen, 0, 0, 0, 0) == ERROR_SUCCESS )
			{
        // don't copy the search providers key, this can triggere IE messages
        if( _tcsicmp(name, _T("SearchScopes")) )
				  CloneRegKey(src, dest, name);
				
				index++;
				nameLen = nameSize;
			}

			delete [] name;
			delete [] data;
			
			RegCloseKey(dest);
		}
		
		RegCloseKey(src);
	}
}

/*-----------------------------------------------------------------------------
	Encode a video job
-----------------------------------------------------------------------------*/
void CURLBlaster::EncodeVideo(void)
{
	TCHAR path[MAX_PATH];
	if( GetModuleFileName(NULL, path, _countof(path)) )
	{
		lstrcpy(PathFindFileName(path), _T("x264.exe"));
		CString exe(path);
		CString cmd = CString(_T("\"")) + exe + _T("\" --crf 24 --profile baseline --preset slow --threads 1 --keyint 10 --min-keyint 1 -o video.mp4 video.avs");

		PROCESS_INFORMATION pi;
		STARTUPINFO si;
		memset( &si, 0, sizeof(si) );
		si.cb = sizeof(si);
		si.dwFlags = STARTF_USESHOWWINDOW;
		si.wShowWindow = SW_HIDE;
		log.Trace(_T("Executing '%s' in '%s'"), (LPCTSTR)cmd, (LPCTSTR)info.zipFileDir);
		if( CreateProcess((LPCTSTR)exe, (LPTSTR)(LPCTSTR)cmd, 0, 0, FALSE, IDLE_PRIORITY_CLASS , 0, (LPCTSTR)info.zipFileDir, &si, &pi) )
		{
			if (WaitForSingleObject(pi.hProcess, 5 * 60 * 1000) == WAIT_ABANDONED)
			  TerminateProcess(pi.hProcess, 0);
			CloseHandle(pi.hThread);
			CloseHandle(pi.hProcess);
			log.Trace(_T("Successfully ran '%s'"), (LPCTSTR)cmd);
		}
		else
			log.Trace(_T("Execution failed '%s'"), (LPCTSTR)cmd);
	}
	
	// terminate any stray x264.exe processes
	WTS_PROCESS_INFO * proc = NULL;
	DWORD count = 0;
	if( WTSEnumerateProcesses(WTS_CURRENT_SERVER_HANDLE, 0, 1, &proc, &count) ) {
		for( DWORD i = 0; i < count; i++ ) {
			if( !lstrcmpi(PathFindFileName(proc[i].pProcessName), _T("x264.exe")) ) {
				HANDLE hProc = OpenProcess(PROCESS_TERMINATE, FALSE, proc[i].ProcessId);
				if( hProc ) {
					TerminateProcess(hProc, 0);
					CloseHandle(hProc);
				}
			}
		}
		
		WTSFreeMemory(proc);
	}
}

/*-----------------------------------------------------------------------------
	Launch the given exe and ensure that we get a clean return code
-----------------------------------------------------------------------------*/
bool CURLBlaster::Launch(CString cmd, HANDLE * phProc)
{
	bool ret = false;

	if( cmd.GetLength() )
	{
		PROCESS_INFORMATION pi;
		STARTUPINFO si;
		memset( &si, 0, sizeof(si) );
		si.cb = sizeof(si);
		si.dwFlags = STARTF_USESHOWWINDOW;
		si.wShowWindow = SW_HIDE;
		log.Trace(_T("Executing '%s'"), (LPCTSTR)cmd);
		if( CreateProcess(NULL, (LPTSTR)(LPCTSTR)cmd, 0, 0, FALSE, NORMAL_PRIORITY_CLASS , 0, NULL, &si, &pi) )
		{
			if( phProc )
			{
				*phProc = pi.hProcess;
				CloseHandle(pi.hThread);
			}
			else
			{
				WaitForSingleObject(pi.hProcess, 60 * 60 * 1000);

				DWORD code;
				if( GetExitCodeProcess(pi.hProcess, &code) && code == 0 )
					ret = true;

				CloseHandle(pi.hThread);
				CloseHandle(pi.hProcess);
				log.Trace(_T("Successfully ran '%s'"), (LPCTSTR)cmd);
			}
		}
		else
			log.Trace(_T("Execution failed '%s'"), (LPCTSTR)cmd);
	}
	else
		ret = true;

	return ret;
}

/*-----------------------------------------------------------------------------
	Set up bandwidth throttling
-----------------------------------------------------------------------------*/
bool CURLBlaster::ConfigureIpfw(void)
{
	bool ret = false;

	if( pipeIn && pipeOut && info.ipfw && info.bwIn && info.bwOut )
	{
		// split the latency across directions
		DWORD latency = info.latency / 2;

		CString buff;
		buff.Format(_T("[urlblast] - Throttling: %d Kbps in, %d Kbps out, %d ms latency, %0.2f plr"), info.bwIn, info.bwOut, info.latency, info.plr );
		OutputDebugString(buff);

		// create the inbound pipe
		if( ipfw.SetPipe(pipeIn, info.bwIn, latency, info.plr / 100.0) )
		{
			// make up for odd values
			if( info.latency % 2 )
				latency++;

			// create the outbound pipe
			if( ipfw.SetPipe(pipeOut, info.bwOut, latency, info.plr / 100.0) )
				ret = true;
			else
				ipfw.SetPipe(pipeIn, 0, 0, 0);
		}
	}
	else
		ret = true;

	return ret;
}

/*-----------------------------------------------------------------------------
	Remove the bandwidth throttling
-----------------------------------------------------------------------------*/
void CURLBlaster::ResetIpfw(void)
{
	if( pipeIn )
		ipfw.SetPipe(pipeIn, 0, 0, 0);
	if( pipeOut )
		ipfw.SetPipe(pipeOut, 0, 0, 0);
}

/*-----------------------------------------------------------------------------
	Terminate any procs that are running under our test user account
	in case something got spawned while testing
-----------------------------------------------------------------------------*/
void CURLBlaster::KillProcs()
{
	#ifndef _DEBUG
	
	WTS_PROCESS_INFO * proc = NULL;
	DWORD count = 0;
	if( hProfile != HKEY_CURRENT_USER && WTSEnumerateProcesses(WTS_CURRENT_SERVER_HANDLE, 0, 1, &proc, &count) )
	{
		for( DWORD i = 0; i < count; i++ )
		{
			// see if the SID matches
			if( userSID && proc[i].pUserSid && IsValidSid(userSID) && IsValidSid(proc[i].pUserSid) )
			{
				if( EqualSid(proc[i].pUserSid, userSID ) )
				{
					HANDLE hProc = OpenProcess(PROCESS_TERMINATE, FALSE, proc[i].ProcessId);
					if( hProc )
					{
						TerminateProcess(hProc, 0);
						CloseHandle(hProc);
					}
				}
			}
		}
		
		WTSFreeMemory(proc);
	}
	#endif
}

typedef int (CALLBACK* DNSFLUSHPROC)();

/*-----------------------------------------------------------------------------
	Flush the OS DNS cache
-----------------------------------------------------------------------------*/
void CURLBlaster::FlushDNS()
{
	bool flushed = false;
	HINSTANCE		hDnsDll;

	log.Trace(_T("Flushing DNS cache"));

	hDnsDll = LoadLibrary(_T("dnsapi.dll"));
	if( hDnsDll )
	{
		DNSFLUSHPROC pDnsFlushProc = (DNSFLUSHPROC)GetProcAddress(hDnsDll, "DnsFlushResolverCache");
		if( pDnsFlushProc )
		{
			int ret = pDnsFlushProc();
			if( ret == ERROR_SUCCESS)
			{
				flushed = true;
				log.Trace(_T("Successfully flushed the DNS resolved cache"));
			}
			else
				log.Trace(_T("DnsFlushResolverCache returned %d"), ret);
		}
		else
			log.Trace(_T("Failed to load dnsapi.dll"));

		FreeLibrary(hDnsDll);
	}
	else
		log.Trace(_T("Failed to load dnsapi.dll"));

  if( !flushed ) {
    HANDLE hProc = NULL;
		Launch(_T("ipconfig.exe /flushdns"), &hProc);
    // Let it run asynchronously.  It will complete well before the browser launches
    if (hProc)
      CloseHandle(hProc);
  }
}

/*-----------------------------------------------------------------------------
	Launch Dynatrace (if necessary)
-----------------------------------------------------------------------------*/
void CURLBlaster::LaunchDynaTrace()
{
	if( !dynaTrace.IsEmpty() )
	{
    // delete the existing dynatrace sessions
    if( dynaTraceSessions.GetLength() )
      DeleteDirectory(dynaTraceSessions, false);

		Launch(dynaTrace, &hDynaTrace);
		WaitForInputIdle(hDynaTrace, 30000);
	}
}

/*-----------------------------------------------------------------------------
	Close Dynatrace (if necessary)
-----------------------------------------------------------------------------*/
void CURLBlaster::CloseDynaTrace()
{
	if( hDynaTrace )
	{
		HWND hWnd = FindWindow(NULL, _T("dynaTrace AJAX Edition"));
		PostMessage(hWnd, WM_CLOSE, 0, 0);
		if( WaitForSingleObject(hDynaTrace, 60000) == WAIT_TIMEOUT )
			TerminateProcess(hDynaTrace,0);
		CloseHandle(hDynaTrace);

		// zip up the profile data to our test results folder
    if( dynaTraceSessions.GetLength() )
			ZipDir(dynaTraceSessions, info.logFile + _T("_dynaTrace.dtas"), _T(""), NULL);
	}
}

/*-----------------------------------------------------------------------------
	Archive (and delete) the given directory
-----------------------------------------------------------------------------*/
int CURLBlaster::ZipDir(CString dir, CString dest, CString depth, zipFile file)
{
	bool top = false;
  int count = 0;

	// start by creating an empty zip file
	if( !file )
	{
		file = zipOpen(CT2A(dest), APPEND_STATUS_CREATE);
		top = true;
	}

	if( file )
	{
		WIN32_FIND_DATA fd;
		HANDLE hFind = FindFirstFile( dir + _T("\\*.*"), &fd );
		if( hFind != INVALID_HANDLE_VALUE )
		{
			do
			{
				// skip over . and ..
				if( lstrcmp(fd.cFileName, _T(".")) && lstrcmp(fd.cFileName, _T("..")) )
				{
					if( fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY )
					{
						CString d = fd.cFileName;
						if( depth.GetLength() )
							d = depth + CString(_T("\\")) + fd.cFileName;

						count += ZipDir( dir + CString(_T("\\")) + fd.cFileName, dest, d, file);
						RemoveDirectory(dir + CString(_T("\\")) + fd.cFileName);
					}
					else
					{
						CString archiveFile;
						if( depth.GetLength() )
							archiveFile = depth + CString(_T("/"));
						archiveFile += fd.cFileName;

						CString filePath = dir + CString(_T("\\")) + fd.cFileName;

						// add the file to the zip archive
						HANDLE hFile = CreateFile( filePath, GENERIC_READ, FILE_SHARE_READ, 0, OPEN_EXISTING, 0, 0);
						if( hFile != INVALID_HANDLE_VALUE )
						{
							DWORD size = GetFileSize(hFile, 0);
							if( size )
							{
								BYTE * mem = (BYTE *)malloc(size);
								if( mem )
								{
									DWORD bytes;
									if( ReadFile(hFile, mem, size, &bytes, 0) && size == bytes )
									{
										// add the file to the archive
										if( !zipOpenNewFileInZip( file, CT2A(archiveFile), 0, 0, 0, 0, 0, 0, Z_DEFLATED, Z_BEST_COMPRESSION ) )
										{
											// write the file to the archive
											zipWriteInFileInZip( file, mem, size );
											zipCloseFileInZip( file );
                      count++;
										}
									}
									
									free(mem);
								}
							}
							
							CloseHandle( hFile );
						}

						DeleteFile(filePath);
					}
				}
			}while( FindNextFile(hFind, &fd) );
			FindClose(hFind);
		}
	}

	// if we're done with the root, delete everything
	if( top && file )
  {
		zipClose(file, 0);
    if( !count )
      DeleteFile(dest);
  }

  return count;
}
