#pragma once
#include "log.h"

class CTestInfo
{
public:
	CTestInfo(){Reset();}
	void Reset(void)
	{
		zipFileDir.Empty();
		logFile.Empty();
		url.Empty();
		eventText.Empty();
		domElement.Empty();
		urlType = 0;
		includeObjectData = 1;
		harvestLinks = false;
		saveEverything = false;
		captureVideo = false;
		checkOpt = 1;
		connections = 0;
		reserved = 0;
		context = NULL;
		testResult = 0;
		runningScript = false;
		block.Empty();
		basicAuth.Empty();
		done = true;
		ignoreSSL = 0;
		bwIn = 0;
		bwOut = 0;
		latency = 0;
		plr = 0;
		ipfw = false;
		host.Empty();
    browser.Empty();
    tcpdump = false;
    standards = 0;
    noscript = 0;
	  blockads = 0;
    tcpdumpFile.Empty();
    testType.Empty();
    noOpt = 0;
    noImages = 0;
    noHeaders = 0;
    pngScreenShot = 0;
    imageQuality = 0;
    bodies = 0;
    htmlbody = 0;
    keepua = 0;
    minimumDuration=0;
    clearShortTermCacheSecs=0;
    currentRun = 0;
    cached = false;
    clearCerts = false;
    cpu = 0;
    customRules.Empty();
    customMetrics.Empty();
	}
	
	CString zipFileDir;			  // If we got a custom job (video rendering only currently)
	CString userName;			    // account name tied to this test
	CString logFile;			    // where the results should be stored
	CString url;				      // URL to be tested
	CString eventText;			  // Friendly text
	CString	domElement;			  // DOM element to look for
	DWORD	urlType;			      // web 1.0, 2.0 or automatic?
	DWORD	includeObjectData;	// should object data be included?
	bool	harvestLinks;		    // should the links be harvested from the page (crawler)?
	CString linksFile;		    // where the harvested links should be stored
	CString s404File;			    // where the 404's should be logged
	CString htmlFile;			    // where the base page HTML be stored
	CString cookiesFile;	    // where the cookies should be stored
	bool	saveEverything;	    // should everything be saved out (images, etc)?
	bool	captureVideo;		    // do we save out the images necessary to construct a video?
	DWORD	checkOpt;			      // should optimizations be checked?
	DWORD	connections;		    // number of parallel browser connections
	bool	runningScript;	    // are we runnning a script?
	CString	scriptFile;		    // location of the script file
	CString block;				    // Requests to block
	CString	basicAuth;		    // Auth string (user name:password)
	bool	done;				        // done after this run
	DWORD	ignoreSSL;			    // ignore SSL errors?
	CString	host;				      // custom host header
  CString browser;          // custom browser?
  CString testType;         // custom test type? (traceroute)
  DWORD noOpt;              // disable optimization checks?
  DWORD noImages;           // disable screen shots
  DWORD noHeaders;          // disable storing the full headers
  DWORD pngScreenShot;       // High-quality screen shot (png)
  DWORD imageQuality;       // Quality of jpeg images
  DWORD bodies;             // save the content of text responses?
  DWORD htmlbody;           // save the content of only the base HTML response
  DWORD minimumDuration;    // minimum test duration
  DWORD clearShortTermCacheSecs;  // in repeat view, delete objects with a expires of less than X seconds
  DWORD keepua;             // preserve the original User Agent string
  CString customRules;      // custom rule set (newline delimited)
  CStringA customMetrics;      // custom metrics (newline delimited)
  CString customMetricsFile;  // File where the custom metrics command data was stored (delete after each test)
  DWORD currentRun;
  bool cached;              // are we testing a cached run?
  bool clearCerts;          // do we need to clear the OS certificate cache?

	DWORD	bwIn;				    // bandwidth in
	DWORD	bwOut;				  // bandwidth out
	DWORD	latency;			  // latency
	double	plr;				  // packet loss
	bool	ipfw;				    // do we need to do a custom bandwidth?
  DWORD  tcpdump;       // packet capture?
  DWORD standards;
  DWORD noscript;
  DWORD  blockads;
  CString tcpdumpFile;
  DWORD cpu;

	DWORD	reserved;			  // reserved for internal use
	void *	context;			// contect information for internal use
	
	DWORD	testResult;			// result code from the test
};

class CUrlMgrBase
{
public:
	CUrlMgrBase(CLog &logRef);
	virtual ~CUrlMgrBase(void);

	virtual void Start(void){}
	virtual void Stop(void){}

	virtual bool GetNextUrl(CTestInfo &info) = 0;
	virtual bool RunRepeatView(CTestInfo &info){return true;}
	virtual void UrlFinished(CTestInfo &info){}
	virtual void GetStatus(CString &status){}
	virtual bool NeedReboot(){return false;}

protected:
	CLog &log;
	SECURITY_ATTRIBUTES nullDacl;
	SECURITY_DESCRIPTOR SD;
};
