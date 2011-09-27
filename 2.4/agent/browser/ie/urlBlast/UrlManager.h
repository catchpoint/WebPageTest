#pragma once

#include "UrlMgrList.h"
#include "UrlMgrFile.h"
#include "UrlMgrHttp.h"
#include "UrlMgrCrawler.h"
#include "UrlMgrCrawlerDemand.h"

class CUrlManager
{
public:
	CUrlManager(CLog &logRef);
	virtual ~CUrlManager(void);
	
	// manager state
	void	Start();
	void	Stop();
	bool	Done();
	void	GetStatus(CString &status);
	
	// test management
	bool GetNextUrl(CTestInfo &info);
	void HarvestedLinks(CTestInfo &info);
	bool RunRepeatView(CTestInfo &info);
	void UrlFinished(CTestInfo &info);
	bool NeedReboot();

	// config settors
	void	SetLogFile(CString file);
	void	SetCheckOpt(DWORD check);
	
	// mgrList
	void	SetUrlList(CString list);
	void	SetObjectSampleRate(double rate);
	
	// mgrFiles
	void	SetFilesDir(CString dir);
	
	// mgrHttp
	void	SetHttp(CString http);
	void	SetHttpKey(CString key);
	void	SetHttpLocation(CString location);
	void	SetHttpProxy(CString proxy);
	void	SetNoUpdate(bool noUpdate);
	void	SetHttpEC2Instance(CString instance);

	// mgrCrawler
	void	SetCrawlerConfig(CString configFile);
	
	// mgrDemandCrawler
	void	SetCrawlerFilesDir(CString dir);
	
	// shared
	void	SetMinInterval(DWORD interval);
	void	SetTestType(DWORD type);

protected:
	CRITICAL_SECTION cs;

	DWORD			testType;
	__int64			lastUrlTime;	// time when the last url was handed out
	DWORD			urlWait;		// minimum amount of time in between urls
	__int64			freq;
	CString			logFile;
	DWORD			checkOpt;
	bool			capturingVideo;	// flag to indicate we're currently running a video capture so don't allow any other tests through
	int				executingTests;	// count of tests currently executing
	
	CUrlMgrList		mgrList;		// lists of urls stored in files
	CUrlMgrFile		mgrFile;		// on-demand files in a provided directory
	CUrlMgrHttp		mgrHttp;		// on-demand files fetched from the server
	CUrlMgrCrawler	mgrCrawler;		// web crawler
	CUrlMgrCrawlerDemand	mgrCrawlerDemand;		// on-demand web crawler
	CLog&			log;
};
