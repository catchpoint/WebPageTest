#pragma once

class CCleanupThread
{
public:
	CCleanupThread(void);
	~CCleanupThread(void);
	void Start(HWND hWnd);
	void Stop(void);
	void ThreadProc(void);

protected:
	HANDLE	hThread;
	bool	mustExit;
	HWND	m_hWnd;
	
public:
	void CloseDialogs(void);
	void KillProcs(void);
};
