#pragma once
#include "urlmgrbase.h"

class CUrlMgrFile :
	public CUrlMgrBase
{
public:
	CUrlMgrFile(CLog &logRef);
	virtual ~CUrlMgrFile(void);

	virtual void Start(void);
	virtual bool GetNextUrl(CTestInfo &info);
	virtual bool RunRepeatView(CTestInfo &info);
	virtual void UrlFinished(CTestInfo &info);

	CString urlFilesDir;

protected:	
	CString workDir;

	void UploadResults(CTestInfo &info);
	bool LocateFile(CString& file);
};
