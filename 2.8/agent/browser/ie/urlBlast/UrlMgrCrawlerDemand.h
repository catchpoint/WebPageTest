#pragma once
#include "urlmgrcrawlerbase.h"

class CUrlMgrCrawlerDemand :
	public CUrlMgrCrawlerBase
{
public:
	CUrlMgrCrawlerDemand(CLog &logRef);
	virtual ~CUrlMgrCrawlerDemand(void);

	virtual bool GetNextUrl(CTestInfo &info);
	virtual void UrlFinished(CTestInfo &info);
	
	CString urlFilesDir;
	
protected:
	HANDLE	hUrlFile;
	CString	urlFile;
	CString fileBase;
};
