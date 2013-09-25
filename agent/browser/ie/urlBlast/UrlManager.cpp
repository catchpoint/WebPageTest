#include "StdAfx.h"
#include "UrlManager.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CUrlManager::CUrlManager(CLog &logRef):
checkOpt(1)
, log(logRef)
, mgrHttp(logRef)
{
	InitializeCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CUrlManager::~CUrlManager(void)
{
	DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
	Startup (after everything has been initialized)
-----------------------------------------------------------------------------*/
void CUrlManager::Start()
{
	EnterCriticalSection(&cs);

	// initialize each of the url managers
	mgrHttp.Start();

	LeaveCriticalSection(&cs);	
}

/*-----------------------------------------------------------------------------
	Stop - about to exit (test threads have all ended)
-----------------------------------------------------------------------------*/
void CUrlManager::Stop()
{
	EnterCriticalSection(&cs);

	// Stop each of the url managers
	mgrHttp.Stop();

	LeaveCriticalSection(&cs);	
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlManager::GetStatus(CString &status)
{
	EnterCriticalSection(&cs);
	status.Empty();
	mgrHttp.GetStatus(status);
	LeaveCriticalSection(&cs);	
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CUrlManager::GetNextUrl(CTestInfo &info)
{
	bool ret = false;
	info.Reset();

	// set some default values
	info.logFile = logFile;
	info.checkOpt = checkOpt;
	
	info.reserved = 4;
	EnterCriticalSection(&cs);
	ret = mgrHttp.GetNextUrl(info);
	LeaveCriticalSection(&cs);
	if( ret )
		log.Trace(_T("Url to be tested: %s"), (LPCTSTR)info.url);

	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CUrlManager::RunRepeatView(CTestInfo &info)
{
	bool ret = true;
	
	EnterCriticalSection(&cs);
	ret = mgrHttp.RunRepeatView(info);
	LeaveCriticalSection(&cs);
	
	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlManager::UrlFinished(CTestInfo &info)
{
	EnterCriticalSection(&cs);
	mgrHttp.UrlFinished(info);
	LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlManager::SetLogFile(CString file)
{
	logFile = file;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlManager::SetCheckOpt(DWORD check)
{
	checkOpt = check;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlManager::SetHttp(CString http)
{
	mgrHttp.urlFilesUrl = http;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlManager::SetHttpKey(CString key)
{
	mgrHttp.key = key;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlManager::SetHttpLocation(CString location)
{
	mgrHttp.location = location;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlManager::SetHttpProxy(CString proxy)
{
	mgrHttp.proxy = proxy;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlManager::SetNoUpdate(bool noUpdate)
{
	mgrHttp.noUpdate = noUpdate;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlManager::SetHttpEC2Instance(CString instance)
{
	mgrHttp.ec2Instance = instance;
}
