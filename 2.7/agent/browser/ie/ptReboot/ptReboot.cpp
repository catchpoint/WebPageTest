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

int APIENTRY _tWinMain(HINSTANCE hInstance,
                     HINSTANCE hPrevInstance,
                     LPTSTR    lpCmdLine,
                     int       nCmdShow)
{
	UNREFERENCED_PARAMETER(hPrevInstance);
	UNREFERENCED_PARAMETER(lpCmdLine);

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
	
	InitiateSystemShutdown( NULL, _T("Pagetest reboot requested."), 0, TRUE, TRUE );

	return 0;
}

