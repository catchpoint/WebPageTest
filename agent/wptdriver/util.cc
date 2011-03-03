#include "stdafx.h"

/*-----------------------------------------------------------------------------
  Launch the provided process and wait for it to finish 
  (unless process_handle is provided in which case it will return immediately)
-----------------------------------------------------------------------------*/
bool LaunchProcess(CString command_line, HANDLE * process_handle){
	bool ret = false;

	if( command_line.GetLength() )
	{
		PROCESS_INFORMATION pi;
		STARTUPINFO si;
		memset( &si, 0, sizeof(si) );
		si.cb = sizeof(si);
		si.dwFlags = STARTF_USESHOWWINDOW;
		si.wShowWindow = SW_HIDE;
		if( CreateProcess(NULL, (LPTSTR)(LPCTSTR)command_line, 0, 0, FALSE, 
                      NORMAL_PRIORITY_CLASS , 0, NULL, &si, &pi) )
		{
			if( process_handle )
			{
				*process_handle = pi.hProcess;
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
			}
		}
	}
	else
		ret = true;

	return ret;
}

/*-----------------------------------------------------------------------------
	recursively delete the given directory
-----------------------------------------------------------------------------*/
void DeleteDirectory( LPCTSTR directory, bool remove )
{
	if( lstrlen(directory) )
	{
    // allocate off of the heap so we don't blow the stack
		TCHAR * path = new TCHAR[MAX_PATH];	
		lstrcpy( path, directory );
		PathAppend( path, _T("*.*") );
		
		WIN32_FIND_DATA fd;
		HANDLE hFind = FindFirstFile(path, &fd);
		if (hFind != INVALID_HANDLE_VALUE)
		{
			do
			{
				if (lstrcmp(fd.cFileName, _T(".")) && lstrcmp(fd.cFileName, _T("..")))
				{
					lstrcpy( path, directory );
					PathAppend( path, fd.cFileName );
					
					if( fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY )
						DeleteDirectory(path);
					else
						DeleteFile(path);
				}
			}while(FindNextFile(hFind, &fd));
			
			FindClose(hFind);
		}
		
		delete [] path;
		
		// remove the actual directory
		if( remove )
			RemoveDirectory(directory);
	}
}
