/******************************************************************************
Copyright (c) 2010, Google Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without 
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, 
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of the <ORGANIZATION> nor the names of its contributors 
    may be used to endorse or promote products derived from this software 
    without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE 
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL 
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER 
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, 
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
******************************************************************************/

#include "StdAfx.h"
#include "Log.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CLog::CLog(void):
	dialerId(0)
	,labID(0)
	,logFile(_T(""))
	,debug(0) {
	// create a NULL DACL we will re-use everywhere we do file access
	ZeroMemory(&nullDacl, sizeof(nullDacl));
	nullDacl.nLength = sizeof(nullDacl);
	nullDacl.bInheritHandle = FALSE;
	if( InitializeSecurityDescriptor(&SD, SECURITY_DESCRIPTOR_REVISION) )
		if( SetSecurityDescriptorDacl(&SD, TRUE,(PACL)NULL, FALSE) )
			nullDacl.lpSecurityDescriptor = &SD;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CLog::~CLog(void) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CLog::SetLogFile(CString file) {
	logFile = file;
	DeleteFile(logFile + _T("_log.txt"));
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CLog::Trace(LPCTSTR format, ...) {
	va_list args;
	va_start( args, format );

	int len = _vsctprintf( format, args ) + 1;
	if (len) {
		TCHAR * buff = (TCHAR *)malloc( len * sizeof(TCHAR) );
		if (buff) {
			if( _vstprintf_s( buff, len, format, args ) > 0 )
				LogEvent(event_Debug, 0, buff);

			free( buff );
		}
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CLog::LogEvent(LOG_EVENT eventId, DWORD result, LPCTSTR txt) {
	if (eventId < event_Max) {
		if (eventId == event_Debug) {
			ATLTRACE(_T("[urlblast] - %s\n"), txt);
		}

		if (eventId != event_Debug || debug) {
			LPCTSTR val = _T("");
			if( txt )
				val = txt;
				
			// write out the actual error
			TCHAR buff[5000];
			wsprintf(buff, _T("%s\t%d\t%d\t%d\t%d\t%d\t%s\t%s\r\n"), 
					(LPCTSTR)(CTime::GetCurrentTime().Format(_T("%Y/%m/%d %H:%M:%S"))),
					labID, dialerId, 1, eventId, result, events[eventId], val);

			// open and lock the log file
			DWORD startMS = GetTickCount();
			HANDLE hFile = CreateFile(logFile + _T("_log.txt"), GENERIC_WRITE, 0, 
                                 &nullDacl, OPEN_ALWAYS, 0, 0);
			if (hFile != INVALID_HANDLE_VALUE) {
				DWORD bytes;
				SetFilePointer(hFile, 0, 0, FILE_END);
				CT2A str(buff);
				WriteFile(hFile, (LPCSTR)str, lstrlen(buff), &bytes, 0);
				CloseHandle(hFile);
			}
		}
	}
}

/*-----------------------------------------------------------------------------
	Log basic information about the PC
-----------------------------------------------------------------------------*/
void CLog::LogMachineInfo(void) {
	CString val;
	TCHAR buff[1024];
	ULONG len;

	CRegKey key;
	if (SUCCEEDED(key.Open(HKEY_LOCAL_MACHINE, 
      _T("HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0"), KEY_READ))) {
		// CPUID
		len = _countof(buff);
		if (SUCCEEDED(key.QueryStringValue(_T("ProcessorNameString"),buff,&len))) {
			val = buff;
			val.Trim();
			LogEvent(event_CPUString, 0, val);
		}
		
		// Speed
		DWORD speed;
		if (SUCCEEDED(key.QueryDWORDValue(_T("~MHz"), speed)))
			LogEvent(event_CPUMHz, speed);
	}
			
	// Total RAM
	MEMORYSTATUSEX mem;
	mem.dwLength = sizeof(mem);
	if (GlobalMemoryStatusEx(&mem)) {
		DWORD mb = (DWORD)(mem.ullTotalPhys / (unsigned __int64)1048576);
		LogEvent(event_TotalRAM, mb);
	}
	
	// HDD size
	unsigned __int64 total, free;
	if (GetDiskFreeSpaceEx(NULL, (PULARGE_INTEGER)&free, (PULARGE_INTEGER)&total,
        NULL)) {
		DWORD dwTotal = (DWORD)(total / (unsigned __int64)1048576);
		DWORD dwFree = (DWORD)(free / (unsigned __int64)1048576);
		LogEvent(event_DiskSize, dwTotal);
		LogEvent(event_DiskFree, dwFree);
	}
	
	// OS
	DWORD ver;
	GetWindowsVersion(ver, val);
	LogEvent(event_OSVersion, ver, val);
	
	// Computer Name
	len = _countof(buff);
	if (GetComputerName(buff, &len)) {
		val = buff;
		val.Trim();
		LogEvent(event_ComputerName, 0, val);
	}

	// screen resolution
	DEVMODE mode;
	memset(&mode, 0, sizeof(mode));
	mode.dmSize = sizeof(mode);
	if (EnumDisplaySettings( NULL, ENUM_CURRENT_SETTINGS, &mode)) {
		CString buff;
		buff.Format(_T("Screen: %d x %d - %d bpp"), mode.dmPelsWidth, 
        mode.dmPelsHeight, mode.dmBitsPerPel);
		LogEvent(event_Info, 0, buff);
	}

	// IE
	if (SUCCEEDED(key.Open(HKEY_LOCAL_MACHINE, 
      _T("SOFTWARE\\Microsoft\\Internet Explorer"), KEY_READ))) {
		len = _countof(buff);
		if (SUCCEEDED(key.QueryStringValue(_T("Version"), buff, &len))) {
			val = buff;
			val.Trim();
			ver = _ttol(val);
			LogEvent(event_IEVersion, ver, val);
		}
	}
	
	// app version
	TCHAR file[MAX_PATH];
	if (GetModuleFileName(NULL, file, _countof(file))) {
		DWORD unused;
		DWORD infoSize = GetFileVersionInfoSize(file, &unused);
		if (infoSize) {
			LPBYTE pVersion = new BYTE[infoSize];
			if (GetFileVersionInfo(file, 0, infoSize, pVersion)) {
				VS_FIXEDFILEINFO * info = NULL;
				UINT size = 0;
				if (VerQueryValue(pVersion, _T("\\"), (LPVOID*)&info, &size)) {
					if (info) {
						ver = LOWORD(info->dwFileVersionLS);
						val.Format(_T("%d.%d.%d.%d"), HIWORD(info->dwFileVersionMS), 
                LOWORD(info->dwFileVersionMS), HIWORD(info->dwFileVersionLS), 
                LOWORD(info->dwFileVersionLS) );
						LogEvent(event_URLBlastVersion, ver, val);
					}
				}
			}

			delete [] pVersion;
		}
	}
}

/*-----------------------------------------------------------------------------
	Jump through all of the hoops to figure out the windows version
-----------------------------------------------------------------------------*/
void CLog::GetWindowsVersion(DWORD& ver, CString& val) {
	ver = 0;
	val = _T("Windows");
	
	OSVERSIONINFOEX info;
	info.dwOSVersionInfoSize = sizeof(info);
	if (GetVersionEx((LPOSVERSIONINFO)&info)) {
		ver = info.dwMajorVersion;
		switch (info.dwMajorVersion) {
			case 4:	val += _T(" NT"); break;
			case 5:	{
					switch( info.dwMinorVersion )
					{
						case 0: val += _T(" 2000"); break;
						case 1: val += _T(" XP"); break;
						case 2: val += _T(" Server 2003"); break;
					}
				}
				break;
				
			case 6:	{
					if( info.wProductType == VER_NT_WORKSTATION )
						val += _T(" Vista");
					else
						val += _T(" Server 2008");
				}
		}

		// add on the service pack		
		if( lstrlen(info.szCSDVersion) ) {
			val += _T(" ");
			val += info.szCSDVersion;
		}
		
		// dump the full build information as well
		CString verStr;
		verStr.Format(_T(" (%d.%d.%d  SP %d.%d  Suite 0x%08X  Product %d)"), 
			info.dwMajorVersion, info.dwMinorVersion, info.dwBuildNumber,
			info.wServicePackMajor, info.wServicePackMinor, info.wSuiteMask,
			info.wProductType);
		val += verStr;
	}
}

