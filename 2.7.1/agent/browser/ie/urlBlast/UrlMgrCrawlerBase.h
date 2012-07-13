#pragma once
#include "urlmgrbase.h"

typedef CAtlList<CString>	CURLList;

class CUrlMgrCrawlerBase :
	public CUrlMgrBase
{
public:
	CUrlMgrCrawlerBase(CLog &logRef, LPCTSTR workDirBase);
	virtual ~CUrlMgrCrawlerBase(void);

	virtual void Start(void){}
	virtual bool Done();

	virtual bool GetNextUrl(CTestInfo &info);
	virtual void HarvestedLinks(CTestInfo &info);
	virtual bool RunRepeatView(CTestInfo &info){return false;}
	virtual void UrlFinished(CTestInfo &info);
	virtual void GetStatus(CString &status);

protected:
	int depth;
	int currentDepth;
	CString	rejectFile;
	CStringArray	urls;
	CAtlList<CString>	domains;
	CAtlMap<DWORD, CURLList*>	allUrls;
	CAtlList<CString>	nextLevel;
	CAtlList<CString>	rejectedHosts;
	DWORD				pendingUrls;
	DWORD				tested;
	bool				done;
	bool				running;
	CString				workDir;
	DWORD				maxUrls;

	bool AddTld(CString host);
	bool IsNewUrl(CString url);
	bool IsDomainOk(CString url, CString pageUrl);
	void Reset();
	void ClearWorkDir();
};
