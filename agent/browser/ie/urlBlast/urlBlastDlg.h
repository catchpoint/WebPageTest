// urlBlastDlg.h : header file
//

#pragma once
#include "afxwin.h"
#include "URLBlaster.h"

// CurlBlastDlg dialog
class CurlBlastDlg : public CDialog
{
// Construction
public:
	CurlBlastDlg(CWnd* pParent = NULL);	// standard constructor

// Dialog Data
	enum { IDD = IDD_URLBLAST_DIALOG };

	protected:
	virtual void DoDataExchange(CDataExchange* pDX);	// DDX/DDV support


// Implementation
protected:
	HICON m_hIcon;

	// Generated message map functions
	virtual BOOL OnInitDialog();
	afx_msg void OnPaint();
	afx_msg HCURSOR OnQueryDragIcon();
	afx_msg LRESULT OnUpdateUI(WPARAM wParal, LPARAM lParam);
	DECLARE_MESSAGE_MAP()
	virtual void OnCancel();
	virtual void OnOK();

public:
	afx_msg void OnClose();
	CStatic status;
	void ThreadProc(void);
	void SetStatus(CString status);
	void Alive();

protected:
	void DoStartup(void);
	CURLBlaster * worker;
	void KillWorker(void);
  void InstallFlash();
  void CheckAlive();
  HANDLE hRunningThread;
  HANDLE hMustExit;

	CStatic rate;
	__int64 start;
	__int64 freq;
	CStatic cpu;
	__int64 firstIdleTime;
	__int64 firstKernelTime;
	__int64 firstUserTime;
	__int64 lastIdleTime;
	__int64 lastKernelTime;
	__int64 lastUserTime;
	__int64 lastUpload;
	__int64 lastAlive;
	CRITICAL_SECTION cs;

	CString logFile;
	int startupDelay;
	int testID;
	int configID;
	DWORD timeout;
	DWORD checkOpt;
	CLog	log;
	bool	running;
	CString customEventText;
	bool bDrWatson;
	CString	accountBase;
	CString	password;
	CString preLaunch;
	CString postLaunch;
	int	browserWidth;
	int browserHeight;
	DWORD debug;
	DWORD pipeIn;
	DWORD pipeOut;
	SECURITY_ATTRIBUTES nullDacl;
	SECURITY_DESCRIPTOR SD;
	CString dynaTrace;
	int ec2;
  int useCurrentAccount;
  HMODULE hHookDll;
  int keepDNS;
  DWORD clearShortTermCacheSecs;
  CIpfw ipfw;
  HANDLE testingMutex;
  CString m_status;

	void LoadSettings(void);
	CUrlManager urlManager;
	CString computerName;
	void KillProcs(void);
  void ClearTemp(void);

	void CloseDialogs(void);
  void StopService(CString serviceName);
	void SetupScreen(void);
	void GetEC2Config();
	bool GetUrlText(CString url, CString &response);
  void InstallSystemGDIHook();
  void RemoveSystemGDIHook();
};
