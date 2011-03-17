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

#pragma once

typedef enum {
	event_Started = 0,
	event_LogUpload,
	event_Reboot,
	event_BrowserLaunch,
	event_CPUString,
	event_CPUMHz,
	event_TotalRAM,
	event_DiskSize,
	event_DiskFree,
	event_OSVersion,
	event_ComputerName,
	event_IEVersion,
	event_URLBlastVersion,
	event_ProfilesReset,
	event_SequentialErrors,
	event_TerminatedBrowser,
	event_KilledDrWatson,
	event_Warning,
	event_Error,
	event_Info,
	event_Debug,
	event_Max
}LOG_EVENT;

const LPCTSTR events[] = {
	_T("URLBlast Started"),
	_T("Log Files Upload"),
	_T("System Reboot"),
	_T("Browser Launched"),
	_T("CPU String"),
	_T("CPU MHz"),
	_T("Total RAM (MB)"),
	_T("Disk Size (MB)"),
	_T("Disk Free (MB)"),
	_T("OS Version"),
	_T("Computer Name"),
	_T("IE Version"),
	_T("URLBlast Version"),
	_T("Profiles Reset"),
	_T("Too Many Sequential Errors"),
	_T("Terminated Hung Browser"),
	_T("Terminated Dr. Watson"),
	_T("Warning"),
	_T("Error"),
	_T("Info"),
	_T("Debug"),
};

class CLog
{
public:
	CLog(void);
	~CLog(void);
	void LogEvent(LOG_EVENT eventId, DWORD result = 0, LPCTSTR txt = NULL);
	void Trace(LPCTSTR format, ...);
	void SetLogFile(CString file);

	CString logFile;
	DWORD	dialerId;
	DWORD	labID;
	DWORD	debug;
	void LogMachineInfo(void);
protected:
	void GetWindowsVersion(DWORD& ver, CString& val);
	SECURITY_ATTRIBUTES nullDacl;
	SECURITY_DESCRIPTOR SD;
};
