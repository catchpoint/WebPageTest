#include "stdafx.h"
#include "crash.h"
#include <Dbghelp.h>

CLog * crashLog = NULL;
typedef BOOL(WINAPI * LPMINIDUMPWRITEDUMP)(HANDLE hProcess, DWORD ProcessId, HANDLE hFile, MINIDUMP_TYPE DumpType, PMINIDUMP_EXCEPTION_INFORMATION ExceptionParam, PMINIDUMP_USER_STREAM_INFORMATION UserStreamParam, PMINIDUMP_CALLBACK_INFORMATION CallbackParam);

LONG WINAPI CrashFilter(struct _EXCEPTION_POINTERS* pep)
{
	bool captured = false;
	HMODULE hLib = LoadLibrary(_T("Dbghelp.dll"));
	if( hLib )
	{
		LPMINIDUMPWRITEDUMP _MiniDumpWriteDump = (LPMINIDUMPWRITEDUMP)GetProcAddress(hLib, "MiniDumpWriteDump");
		if( _MiniDumpWriteDump )
		{
			TCHAR path[MAX_PATH];
			if( GetModuleFileName(NULL, path, MAX_PATH) )
			{
				// create a NULL DACL we will re-use everywhere we do file access
				SECURITY_ATTRIBUTES nullDacl;
				ZeroMemory(&nullDacl, sizeof(nullDacl));
				nullDacl.nLength = sizeof(nullDacl);
				nullDacl.bInheritHandle = FALSE;
				SECURITY_DESCRIPTOR SD;
				if( InitializeSecurityDescriptor(&SD, SECURITY_DESCRIPTOR_REVISION) )
					if( SetSecurityDescriptorDacl(&SD, TRUE,(PACL)NULL, FALSE) )
						nullDacl.lpSecurityDescriptor = &SD;

				lstrcpy(PathFindFileName(path), _T("urlblast.dmp"));
				HANDLE hFile = CreateFile( path, GENERIC_READ | GENERIC_WRITE, 0, &nullDacl, CREATE_ALWAYS, 0, 0);
				if( hFile != INVALID_HANDLE_VALUE )
				{
					captured = true;
					MINIDUMP_EXCEPTION_INFORMATION mdei; 
					mdei.ThreadId           = GetCurrentThreadId(); 
					mdei.ExceptionPointers  = pep; 
					mdei.ClientPointers     = FALSE; 
					MINIDUMP_TYPE mdt       = MiniDumpNormal; 

					BOOL rv = _MiniDumpWriteDump( GetCurrentProcess(), GetCurrentProcessId(), hFile, mdt, (pep != 0) ? &mdei : 0, 0, 0 ); 
					if( crashLog )
					{
						if( !rv ) 
							crashLog->LogEvent( event_Error, 0, _T("Unhandled Exception - MiniDumpWriteDump failed.") ); 
						else 
							crashLog->LogEvent( event_Error, 0, _T("Unhandled Exception - Minidump created.") ); 
					}

					CloseHandle( hFile );
				}
			}
		}

		FreeLibrary(hLib);
	}

	if( crashLog && !captured )
		crashLog->LogEvent( event_Error, 0, _T("Unhandled exception"));

	return EXCEPTION_CONTINUE_SEARCH;
}
