#pragma once
#include "UrlManager.h"
#include "../pagetest/ipfw.h"
#include "WinPCap.h"

#define MSG_UPDATE_UI (WM_APP + 1)
#define MSG_CONTINUE_STARTUP (WM_APP + 2)

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
	CURLBlaster(HWND hWnd, CLog &logRef);
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
	CIpfw ipfw;

	CString errorLog;
	CUrlManager * urlManager;
	int testType;
	DWORD labID;
	DWORD dialerID;
	DWORD connectionType;
	DWORD timeout;
	CString ipAddress;
	DWORD experimental;
	CRect pos;
	DWORD sequentialErrors;
	HANDLE	hClearedCache;
	HANDLE	hRun;
	CRect	desktop;
	CString customEventText;
	DWORD screenShotErrors;
	CTestInfo info;
	CString preLaunch;
	CString postLaunch;
	CString dynaTrace;
	bool	topspeed;
	DWORD pipeIn;
	DWORD pipeOut;
	DWORD useBitBlt;
	
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
	
	// directories
	CString	profile;
	CString cookies;
	CString history;
	CString tempFiles;
	CString silverlight;
	CString flash;

  bool Launch(CString cmd, HANDLE * phProc = NULL);
	void LaunchDynaTrace();
	void CloseDynaTrace();
	void ZipDir(CString dir, CString dest, CString depth, zipFile file);
};

// utility routine
void DeleteDirectory( LPCTSTR inPath, bool remove = true );
