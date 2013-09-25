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
	DWORD	debug;
	void LogMachineInfo(void);
protected:
	void GetWindowsVersion(DWORD& ver, CString& val);
	SECURITY_ATTRIBUTES nullDacl;
	SECURITY_DESCRIPTOR SD;
};

extern "C" {
bool WINAPI WptCheckLogLevel(int level);
void WINAPI WptLogMessage(const WCHAR * msg);
}
