#include "StdAfx.h"
#include "CleanupThread.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CCleanupThread::CCleanupThread(void):
	hThread(NULL)
	, mustExit(false)
	, m_hWnd(NULL)
{
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CCleanupThread::~CCleanupThread(void)
{
	mustExit = true;
	
	// wait for the thread to exit
	if( hThread )
	{
		if( WaitForSingleObject(hThread, 5000) == WAIT_TIMEOUT )
			TerminateThread(hThread, 0);
		CloseHandle(hThread);
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
static unsigned __stdcall ThreadProc( void* arg )
{
	CCleanupThread * thread = (CCleanupThread *)arg;
	if( thread )
		thread->ThreadProc();
		
	return 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CCleanupThread::Start(HWND hWnd)
{
	m_hWnd = hWnd;
	
	// spawn the worker thread
	mustExit = false;
	hThread = (HANDLE)_beginthreadex(0, 0, ::ThreadProc, this, 0, 0);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CCleanupThread::Stop(void)
{
	mustExit = true;
	
	// wait for the thread to exit
	if( hThread )
	{
		if( WaitForSingleObject(hThread, 5000) == WAIT_TIMEOUT )
			TerminateThread(hThread, 0);
		CloseHandle(hThread);
		hThread = NULL;
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CCleanupThread::ThreadProc(void)
{
	while( !mustExit )
	{
		CloseDialogs();
		Sleep(500);
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CCleanupThread::CloseDialogs(void)
{
	// if there are any explorer windows open, disable this code (for local debugging and other work)
	if( !::FindWindow(_T("CabinetWClass"), NULL ) )
	{
		HWND hDesktop = ::GetDesktopWindow();
		HWND hWnd = ::GetWindow(hDesktop, GW_CHILD);
		TCHAR szClass[100];
		TCHAR szTitle[1025];
		CArray<HWND> hDlg;
		const TCHAR * szKeepOpen[] = {	_T("urlblast"), 
										_T("task manager"), 
										_T("aol pagetest"), 
										_T("network delay simulator"), 
										_T("Choose file") };

		// build a list of dialogs to close
		while(hWnd)
		{
			if(hWnd != m_hWnd)
			{
				if(::IsWindowVisible(hWnd))
					if(::GetClassName(hWnd, szClass, 100))
						if((!lstrcmp(szClass,_T("#32770"))||!lstrcmp(szClass,_T("Internet Explorer_Server")))) // check window title for all classes
						{
							bool bKill = true;

							// make sure it is not in our list of windows to keep
							if(::GetWindowText( hWnd, szTitle, 1024))
							{
								ATLTRACE(_T("[UrlBlast] - Killing Dialog: %s\n"), szTitle);
								
								_tcslwr_s(szTitle, _countof(szTitle));
								for(int i = 0; i < _countof(szKeepOpen) && bKill; i++)
								{
									if(_tcsstr(szTitle, szKeepOpen[i]))
										bKill = false;
								}
								
								// do we have to terminate the process that owns it?
								if( !lstrcmp(szTitle, _T("server busy")) )
								{
									ATLTRACE(_T("[UrlBlast] - Terminating process\n"));
									DWORD pid;
									GetWindowThreadProcessId(hWnd, &pid);
									HANDLE hProcess = OpenProcess(PROCESS_TERMINATE, FALSE, pid);
									if( hProcess )
									{
										TerminateProcess(hProcess, 0);
										CloseHandle(hProcess);
									}
								}
							}
						
							if(bKill)
								hDlg.Add(hWnd);	
						}
					        			
			}

			hWnd = ::GetWindow(hWnd, GW_HWNDNEXT);
		}

		// close all of the dialogs
		for(int i = 0; i < hDlg.GetSize(); i++)
		{
			//see if there is an OK button
			HWND hOk = ::FindWindowEx(hDlg[i], 0, 0, _T("OK"));
			if( hOk )
			{
				int id = ::GetDlgCtrlID(hOk);
				if( !id )
					id = IDOK;
				::PostMessage(hDlg[i],WM_COMMAND,id,0);
			}
			else
				::PostMessage(hDlg[i],WM_CLOSE,0,0);
		}
	}
}

