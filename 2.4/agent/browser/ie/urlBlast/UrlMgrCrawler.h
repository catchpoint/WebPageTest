#pragma once
#include "urlmgrcrawlerbase.h"

class CUrlMgrCrawler :
	public CUrlMgrCrawlerBase
{
public:
	CUrlMgrCrawler(CLog &logRef);
	virtual ~CUrlMgrCrawler(void);
	
	virtual void Start(void);
	
	CString configFile;
};
