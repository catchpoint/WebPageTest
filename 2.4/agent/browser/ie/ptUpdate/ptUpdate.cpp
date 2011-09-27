#define WINVER 0x0500           // Change this to the appropriate value to target other versions of Windows.
#define _WIN32_WINNT 0x0501     // Change this to the appropriate value to target other versions of Windows.
#define _WIN32_WINDOWS 0x0410 // Change this to the appropriate value to target Windows Me or later.
#define _WIN32_IE 0x0500        // Change this to the appropriate value to target other versions of IE.
#define WIN32_LEAN_AND_MEAN             // Exclude rarely-used stuff from Windows headers

// Windows Header Files:
#include <windows.h>

// C RunTime Header Files
#include <stdlib.h>
#include <malloc.h>
#include <memory.h>
#include <tchar.h>

#include <shellapi.h>
#include <shlwapi.h>
#include <WtsApi32.h>
#include <Psapi.h>

bool FindUrlBlast(TCHAR * dstPath);
void TerminateProcs(void);
void Reboot(void);

int APIENTRY _tWinMain(HINSTANCE hInstance,
                     HINSTANCE hPrevInstance,
                     LPTSTR    lpCmdLine,
                     int       nCmdShow)
{
	UNREFERENCED_PARAMETER(hPrevInstance);
	UNREFERENCED_PARAMETER(lpCmdLine);

	// figure out the path we are updating to (where urlblast is running)
	TCHAR dstPath[MAX_PATH];
	if( FindUrlBlast(dstPath) )
	{
		TerminateProcs();

		// figure out the source path
		TCHAR thisProc[MAX_PATH];
		TCHAR srcPath[MAX_PATH];
		GetModuleFileName(NULL, thisProc, MAX_PATH);
		lstrcpy( srcPath, thisProc );
		*PathFindFileName(srcPath) = 0;

		TCHAR search[MAX_PATH];
		TCHAR dstFile[MAX_PATH];
		TCHAR srcFile[MAX_PATH];

		lstrcpy(search, srcPath);
		lstrcat(search, _T("*.*"));
		WIN32_FIND_DATA fd;
		HANDLE hFind = FindFirstFile(search, &fd);
		if( hFind != INVALID_HANDLE_VALUE )
		{
			do
			{
				if( !(fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) )
				{
					lstrcpy( srcFile, srcPath );
					lstrcat( srcFile, fd.cFileName );
					if( lstrcmpi(srcFile, thisProc) )
					{
            // special-case ipfw.cmd
						lstrcpy( dstFile, dstPath );
            if( !lstrcmpi(fd.cFileName, L"ipfw.cmd") )
						  lstrcat( dstFile, L"dummynet\\" );
						lstrcat( dstFile, fd.cFileName );
						CopyFile(srcFile, dstFile, FALSE);
					}
				}

			}while( FindNextFile(hFind, &fd) );

			FindClose(hFind);
		}

		// Start urlblast back up
    lstrcpy( dstFile, dstPath );
    lstrcat( dstFile, _T("urlblast.exe") );
		if( (int)ShellExecute(NULL, NULL, dstFile, NULL, dstPath, SW_SHOWMINNOACTIVE) <= 32 )
      Reboot();
	}

	return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool FindUrlBlast(TCHAR * dstPath)
{
	bool found = false;
	*dstPath = 0;

	WTS_PROCESS_INFO * proc = NULL;
	DWORD count = 0;
	if( WTSEnumerateProcesses(WTS_CURRENT_SERVER_HANDLE, 0, 1, &proc, &count) )
	{
		for( DWORD i = 0; i < count && !found ; i++ )
		{
			// check for urlblast.exe
			TCHAR * file = PathFindFileName(proc[i].pProcessName);
			if( !lstrcmpi(file, _T("urlblast.exe")) )
			{
				found = true;

				TCHAR path[MAX_PATH];
				HANDLE hProc = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, proc[i].ProcessId);
				if( hProc )
				{
					if( GetModuleFileNameEx(hProc, NULL, path, MAX_PATH) )
					{
						*PathFindFileName(path) = 0;
						lstrcpy( dstPath, path );
						if( lstrlen(dstPath) )
							found = true;
					}

					CloseHandle(hProc);
				}
			}
		}

		WTSFreeMemory(proc);
	}

	return found;
}

/*-----------------------------------------------------------------------------
	Kill any processes that we need closed
-----------------------------------------------------------------------------*/
void TerminateProcs(void)
{
	HWND hDesktop = ::GetDesktopWindow();
	HWND hWnd = ::GetWindow(hDesktop, GW_CHILD);
	TCHAR szTitle[1025];
	const TCHAR * szClose[] = { 
		_T("urlblast")
		, _T("url blast")
		, _T("internet explorer")
		, _T("pagetest")
	};
  const TCHAR * szKeep[] = {
    _T("wptdriver")
  };

	// Send close messages to everything
	while(hWnd)
	{
		if(::IsWindowVisible(hWnd))
		{
			if(::GetWindowText( hWnd, szTitle, 1024))
			{
				bool bKill = false;
				_tcslwr_s(szTitle, _countof(szTitle));
				for(int i = 0; i < _countof(szClose) && !bKill; i++)
				{
					if(_tcsstr(szTitle, szClose[i]))
						bKill = true;
				}
				if( bKill )
				for(int i = 0; i < _countof(szKeep) && bKill; i++)
				{
					if(_tcsstr(szTitle, szKeep[i]))
						bKill = false;
				}
				
				if( bKill )
					::PostMessage(hWnd,WM_CLOSE,0,0);
			}
		}

		hWnd = ::GetWindow(hWnd, GW_HWNDNEXT);
	}

	// go through and kill any procs that are still running
	// (wait long enough for them to exit gracefully first)
	const TCHAR * procs[] = { 
		_T("urlblast.exe")
		, _T("iexplore.exe")
		, _T("pagetest.exe")
	};

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

	// go through and kill any matching procs
	WTS_PROCESS_INFO * proc = NULL;
	DWORD count = 0;
	if( WTSEnumerateProcesses(WTS_CURRENT_SERVER_HANDLE, 0, 1, &proc, &count) )
	{
		for( DWORD i = 0; i < count; i++ )
		{
			TCHAR * file = proc[i].pProcessName;
			bool kill = false;

			for(int j = 0; j < _countof(procs) && !kill; j++)
			{
				if( !lstrcmpi(PathFindFileName(proc[i].pProcessName), procs[j]) )
					kill = true;
			}

			if( kill )
			{
				HANDLE hProc = OpenProcess(SYNCHRONIZE | PROCESS_TERMINATE, FALSE, proc[i].ProcessId);
				if( hProc )
				{
					// give it 2 minutes to exit on it's own
					if( WaitForSingleObject(hProc, 120000) != WAIT_OBJECT_0 )
						TerminateProcess(hProc, 0);
					CloseHandle(hProc);
				}
			}
		}

		WTSFreeMemory(proc);
	}
}

/*-----------------------------------------------------------------------------
	Reboot the system
-----------------------------------------------------------------------------*/
void Reboot(void)
{
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
	
	InitiateSystemShutdown( NULL, _T("Pagetest update installed."), 0, TRUE, TRUE );
}
