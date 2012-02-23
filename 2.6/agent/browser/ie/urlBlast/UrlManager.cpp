#include "StdAfx.h"
#include "UrlManager.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CUrlManager::CUrlManager(CLog &logRef):
lastUrlTime(0)
, urlWait(0)
, testType(0)
, checkOpt(1)
, capturingVideo(false)
, executingTests(0)
, log(logRef)
, mgrList(logRef)
, mgrFile(logRef)
, mgrHttp(logRef)
, mgrCrawler(logRef)
, mgrCrawlerDemand(logRef)
{
	QueryPerformanceFrequency((LARGE_INTEGER *)&freq);
	freq = freq / (__int64)1000;
	
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
	mgrList.Start();
	mgrFile.Start();
	mgrHttp.Start();
	mgrCrawler.Start();

	LeaveCriticalSection(&cs);	
}

/*-----------------------------------------------------------------------------
	Stop - about to exit (test threads have all ended)
-----------------------------------------------------------------------------*/
void CUrlManager::Stop()
{
	EnterCriticalSection(&cs);

	// Stop each of the url managers
	mgrList.Stop();
	mgrFile.Stop();
	mgrHttp.Stop();
	mgrCrawler.Stop();

	LeaveCriticalSection(&cs);	
}

/*-----------------------------------------------------------------------------
	Are we done testing? (really only applies to the crawler)
-----------------------------------------------------------------------------*/
bool CUrlManager::Done()
{
	bool ret = true;
	
	if( testType == 6 )
		ret = mgrCrawler.Done();
	
	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlManager::GetStatus(CString &status)
{
	status.Empty();
	if( testType == 6 )
		mgrCrawler.GetStatus(status);
	else if( testType == 4 )
		mgrFile.GetStatus(status);
	else
	{
		mgrList.GetStatus(status);
		mgrFile.GetStatus(status);
		mgrHttp.GetStatus(status);
		mgrCrawler.GetStatus(status);
	}
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
	
	EnterCriticalSection(&cs);
	
	__int64 now;
	QueryPerformanceCounter((LARGE_INTEGER *)&now);
	
	// make sure we're not handing out urls too quickly (simultaneously specifically)
	// This is to prevent too much contention between browsers launching at the same time
	// and impacting each other
	DWORD elapsed = (DWORD)((now - lastUrlTime) / freq);
	if( !lastUrlTime || elapsed > urlWait )
	{
		// http gets first priority
		info.reserved = 4;
		ret = mgrHttp.GetNextUrl(info);
		if( !ret )
		{
			// try servicing a one-off url first
			info.reserved = 2;
			ret = mgrFile.GetNextUrl(info);
			if( !ret )
			{
				// if we're running in crawler mode, try a crawler URL next
				if( testType == 6 )
				{
					info.reserved = 3;
					ret = mgrCrawler.GetNextUrl(info);
				}
					
				// last resort, fall back to the URL list
				if( !ret && testType != 4 )
				{
					info.reserved = 1;
					ret = mgrList.GetNextUrl(info);
				}
			}
		}
	}
	
	if( ret )
	{
		log.Trace(_T("Url to be tested: %s"), (LPCTSTR)info.url);
		lastUrlTime = now;
	}
	
	LeaveCriticalSection(&cs);

	EnterCriticalSection(&cs);
	if( ret )
	{
		// hold the test up if we are currently capturing video
		// don't do it for more than 5 minutes though to prevent failure
		DWORD count = 0;
		while( capturingVideo && count < 300)
		{
			LeaveCriticalSection(&cs);
			Sleep(1000);
			EnterCriticalSection(&cs);
			count++;
		}

		if( info.captureVideo )
		{
			capturingVideo = true;

			// wait until there are no pending tests (wait only up to 5 minutes though)
			count = 0;
			while( executingTests > 0 && count < 300 )
			{
				LeaveCriticalSection(&cs);
				Sleep(1000);
				EnterCriticalSection(&cs);
				count++;
			}
		}

		executingTests++;
	}
	LeaveCriticalSection(&cs);

	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlManager::HarvestedLinks(CTestInfo &info)
{
	EnterCriticalSection(&cs);
	switch( info.reserved )
	{
		case 1: mgrList.HarvestedLinks(info); break;
		case 2: mgrFile.HarvestedLinks(info); break;
		case 3: mgrCrawler.HarvestedLinks(info); break;
		case 4: mgrHttp.HarvestedLinks(info); break;
	}
	LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CUrlManager::RunRepeatView(CTestInfo &info)
{
	bool ret = true;
	
	EnterCriticalSection(&cs);
	switch( info.reserved )
	{
		case 1: ret = mgrList.RunRepeatView(info); break;
		case 2: ret = mgrFile.RunRepeatView(info); break;
		case 3: ret = mgrCrawler.RunRepeatView(info); break;
		case 4: ret = mgrHttp.RunRepeatView(info); break;
	}
	LeaveCriticalSection(&cs);
	
	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlManager::UrlFinished(CTestInfo &info)
{
	EnterCriticalSection(&cs);
	switch( info.reserved )
	{
		case 1: mgrList.UrlFinished(info); break;
		case 2: mgrFile.UrlFinished(info); break;
		case 3: mgrCrawler.UrlFinished(info); break;
		case 4: mgrHttp.UrlFinished(info); break;
	}

	if( info.done )
	{
		// reset the video capture flag
		if( info.captureVideo )
			capturingVideo = false;

		// decrement the test count
		executingTests--;
		if( executingTests < 0 )
			executingTests = 0;		// shouldn't be possible, but just to be safe
	}
	LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlManager::SetUrlList(CString list)
{
	mgrList.urlFileList = list;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlManager::SetObjectSampleRate(double rate)
{
	mgrList.sampleRate = rate;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlManager::SetFilesDir(CString dir)
{
	mgrFile.urlFilesDir = dir;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlManager::SetCrawlerConfig(CString configFile)
{
	mgrCrawler.configFile = configFile;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlManager::SetCrawlerFilesDir(CString dir)
{
	mgrCrawlerDemand.urlFilesDir = dir;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlManager::SetMinInterval(DWORD interval)
{
	mgrList.minInterval = interval;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CUrlManager::SetTestType(DWORD type)
{
	testType = type;
	mgrList.testType = type;
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

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CUrlManager::NeedReboot()
{
	return mgrList.NeedReboot() || 
			mgrFile.NeedReboot() || 
			mgrHttp.NeedReboot() || 
			mgrCrawler.NeedReboot();
}