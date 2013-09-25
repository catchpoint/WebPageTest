#pragma once

#include "UrlMgrHttp.h"

class CUrlManager
{
public:
	CUrlManager(CLog &logRef);
	virtual ~CUrlManager(void);
	
	// manager state
	void	Start();
	void	Stop();
	void	GetStatus(CString &status);
	
	// test management
	bool GetNextUrl(CTestInfo &info);
	bool RunRepeatView(CTestInfo &info);
	void UrlFinished(CTestInfo &info);

	// config settors
	void	SetLogFile(CString file);
	void	SetCheckOpt(DWORD check);
	
	// mgrHttp
	void	SetHttp(CString http);
	void	SetHttpKey(CString key);
	void	SetHttpLocation(CString location);
	void	SetHttpProxy(CString proxy);
	void	SetNoUpdate(bool noUpdate);
	void	SetHttpEC2Instance(CString instance);
	
protected:
	CRITICAL_SECTION cs;

	CString	  logFile;
	DWORD			checkOpt;
	
	CUrlMgrHttp		mgrHttp;		// on-demand files fetched from the server
	CLog&			log;
};
