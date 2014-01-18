#pragma once
#include "urlmgrbase.h"
#include <afxinet.h>

class CUrlMgrHttp :
	public CUrlMgrBase
{
public:
	CUrlMgrHttp(CLog &logRef);
	virtual ~CUrlMgrHttp(void);

	virtual void Start(void);
	virtual bool GetNextUrl(CTestInfo &info);
	virtual bool RunRepeatView(CTestInfo &info);
	virtual void UrlFinished(CTestInfo &info);
	virtual bool NeedReboot();

	CString urlFilesUrl;
	CString location;
	CString proxy;
	CString key;
	CString ec2Instance;
	CString pcName;
	bool	noUpdate;

protected:	
	CString workDir;
	CString host;
	INTERNET_PORT port;
	CString getWork;
	CString workDone;
	CString resultImage;
	DWORD	nextCheck;
	bool	videoSupported;
	DWORD	lastSuccess;
	DWORD	majorVer;
	DWORD	minorVer;
	DWORD	buildNo;
	DWORD	revisionNo;
	CString verString;
  DWORD requestFlags;
  CString dnsServers;
	
	bool	GetJob(CStringA &job, CStringA &script, bool& zip, bool& update);
	void	UploadImages(CTestInfo &info);
	bool	ZipResults(CTestInfo &info, CString& zipFilePath);
	bool	UploadFile(CString url, CTestInfo &info, CString& file, CString fileName);
	bool	BuildFormData(CTestInfo &info, CStringA& headers, CStringA& body, CStringA& footer, DWORD fileSize, DWORD &requestLen, CString fileName );
	void	InstallUpdate(CString path);
  void  DeleteResults(CTestInfo &info);
  void  UpdateDNSServers();
  bool  CrackUrl(CString url, CString &host, unsigned short &port, CString& object, DWORD &secure_flag);
};
