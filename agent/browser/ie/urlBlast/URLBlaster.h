#pragma once
#include "UrlManager.h"
#include "WinPCap.h"
#include "../../../wptdriver/ipfw.h"

#define MSG_UPDATE_UI (WM_APP + 1)
#define MSG_CONTINUE_STARTUP (WM_APP + 2)

class CurlBlastDlg;

class CSpeed
{
public:
	CSpeed():connType(0){addr.S_un.S_addr = 0; mask.S_un.S_addr = 0;}
	CSpeed(const CSpeed& src){*this = src;}
	~CSpeed(void){}
	const CSpeed & operator =(const CSpeed& src)
	{
		connType = src.connType;
		addr.S_un.S_addr = src.addr.S_un.S_addr;
		mask.S_un.S_addr = src.mask.S_un.S_addr;
		
		return src;
	}
	
	DWORD	connType;
	IN_ADDR	addr;
	IN_ADDR	mask;
};

class CURLBlaster
{
public:
	CURLBlaster(HWND hWnd, CLog &logRef, CIpfw &ipfwRef, HANDLE &testingMutexRef, CurlBlastDlg &dlgRef);
	~CURLBlaster(void);
	bool Start(int userIndex);
	void Stop(void);
	CString userName;
	void ThreadProc(void);
	HANDLE hThread;
	HANDLE hMustExit;
	HANDLE hLogonToken;
	HANDLE hProfile;
	CString password;
	CString accountBase;
	int index;
	DWORD count;
	HWND hDlg;
	CIpfw &ipfw;

	CString errorLog;
	CUrlManager * urlManager;
	DWORD timeout;
	CRect pos;
	CRect	desktop;
	CString customEventText;
	CTestInfo info;
	CString preLaunch;
	CString postLaunch;
	CString dynaTrace;
  CString dynaTraceSessions;
	DWORD pipeIn;
	DWORD pipeOut;
	DWORD useBitBlt;
  int keepDNS;
	
	CRITICAL_SECTION cs;
	DWORD browserPID;
	PSID userSID;

protected:
	bool DoUserLogon(void);
	void ClearCache(void);
	bool LaunchBrowser(void);
	bool GetUrl(void);
	void ConfigurePagetest(void);
	bool ConfigureIE(void);
	void CloneIESettings(void);
	void CloneRegKey(HKEY hSrc, HKEY hDest, LPCTSTR subKey);
	void EncodeVideo(void);
	bool ConfigureIpfw();
	void ResetIpfw();
	void KillProcs();
	void FlushDNS();
	CLog	&log;
	bool	cached;
	CString eventName;
	HANDLE hDynaTrace;
  CWinPCap  winpcap;
  HANDLE &testingMutex;
  CString heartbeatEventName;
  HANDLE  heartbeatEvent;
  CurlBlastDlg &dlg;
	
	// directories
	CString	profile;
	CString cookies;
	CString history;
	CString tempFiles;
  CString tempDir;
	CString silverlight;
	CString recovery;
	CString flash;
  CString domStorage;
	CString desktopPath;
	CString windir;
	CString webCache;

  bool Launch(CString cmd, HANDLE * phProc = NULL);
	void LaunchDynaTrace();
	void CloseDynaTrace();
	int ZipDir(CString dir, CString dest, CString depth, zipFile file);
};
