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
	afx_msg LRESULT OnContinueStartup(WPARAM wParal, LPARAM lParam);
	DECLARE_MESSAGE_MAP()
	virtual void OnCancel();
	virtual void OnOK();

public:
	afx_msg void OnClose();
	CStatic status;
	afx_msg void OnTimer(UINT_PTR nIDEvent);
	void ClearCaches(void);

protected:
	void DoStartup(void);
	CArray<CURLBlaster *> workers;
	void KillWorkers(void);

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

	CString logFile;
	int startupDelay;
	int threadCount;
	int testID;
	int configID;
	DWORD timeout;
	CString aliveFile;
	CString urlFilesDir;
	int testType;
	int rebootInterval;
	int clearCacheInterval;
	DWORD screenShotErrors;
	DWORD checkOpt;
	CStatic rebooting;
	DWORD labID;
	DWORD dialerID;
	DWORD connectionType;
	int uploadLogsInterval;
	CStringArray uploadLogFiles;
	CStringArray addresses;
	CLog	log;
	bool	running;
	DWORD	minInterval;
	CString customEventText;
	bool bDrWatson;
	DWORD	ifIndex;			// interface to add IP addresses to
	CList<ULONG>	ipContexts;	// added IP address contexts we need to delete when we exit
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

	void LoadSettings(void);
	CUrlManager urlManager;
	CString computerName;
	bool CheckReboot(bool force = false);
	void WriteAlive(void);
	void CheckUploadLogs(void);
	void UploadLogs(void);
	void KillProcs(void);

	void CloseDialogs(void);
	DWORD experimental;
	void CheckExit(void);
	void DisableDNSCache(void);
	void Defrag(void);
	void SetupScreen(void);
	void GetEC2Config();
	bool GetUrlText(CString url, CString &response);
  void ConfigureDummynet();
};
