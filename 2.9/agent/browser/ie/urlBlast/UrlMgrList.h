#pragma once
#include "urlmgrbase.h"

class CUrlMgrList :
	public CUrlMgrBase
{
public:
	CUrlMgrList(CLog &logRef);
	virtual ~CUrlMgrList(void);

	virtual void Start(void);

	virtual bool GetNextUrl(CTestInfo &info);
	virtual bool RunRepeatView(CTestInfo &info);
	virtual void UrlFinished(CTestInfo &info);

	// configuration
	CString				urlFileList;
	double				sampleRate;
	DWORD				minInterval;
	DWORD				testType;

protected:
	CAtlList<CString>	urlFiles;

	CStringArray		urls;
	CStringArray		events;
	CDWordArray			urlTypes;
	CStringArray		domElements;

	HCRYPTPROV			hCryptProv;
	DWORD				includeObject;
	CTime				lastLoad;

	void LoadUrls(void);
	void LoadUrlFile(CString& urlFile);
	bool LocateFile(CString& file);
};
