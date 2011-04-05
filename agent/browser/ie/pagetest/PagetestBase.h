/*
Copyright (c) 2005-2007, AOL, LLC.

All rights reserved.

Redistribution and use in source and binary forms, with or without modification, 
are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, 
		this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice, 
		this list of conditions and the following disclaimer in the documentation 
		and/or other materials provided with the distribution.
    * Neither the name of the company nor the names of its contributors may be 
		used to endorse or promote products derived from this software without 
		specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

#pragma once

#include <atlhost.h>
#include "SocketInfo.h"
#include "TrackedEvent.h"
#include "screen_capture.h"
#ifndef PAGETEST_EXE
#include "WebPagetestDOM.h"
#endif

#define JPEG_DEFAULT_QUALITY 30
#define JPEG_VIDEO_QUALITY 75

typedef enum {
	END,
	START,
	TTFB
} MEASUREMENT_POINT;


class CBrowserTracker
{
public:
	CBrowserTracker(void):threadId(0),state(READYSTATE_UNINITIALIZED){}
	CBrowserTracker(const CBrowserTracker &src){*this = src;}
	CBrowserTracker(CComPtr<IWebBrowser2> Browser):browser(Browser),state(READYSTATE_UNINITIALIZED){threadId = GetCurrentThreadId();}
	virtual ~CBrowserTracker(void){}
	const CBrowserTracker& operator =(const CBrowserTracker &src)
	{
		browser = src.browser;
		threadId = src.threadId;
		state = src.state;
		return src;
	}
	
	CComPtr<IWebBrowser2>	browser;
	DWORD					threadId;
	READYSTATE				state;
};

class CProgressData
{
public:
	CProgressData(void):ms(0),bpsIn(0),cpu(0.0),mem(0),sampleTime(0){}
	CProgressData(const CProgressData& src){*this = src;}
	~CProgressData(){	}
	const CProgressData& operator =(const CProgressData& src)
	{
		ms = src.ms;
		bpsIn = src.bpsIn;
		cpu = src.cpu;
		mem = src.mem;
    sampleTime = src.sampleTime;

		return src;
	}

	DWORD		ms;			// milliseconds since start
  __int64 sampleTime;
	DWORD		bpsIn;	// inbound bandwidth
	double  cpu;		// CPU utilization
	DWORD		mem;		// Working set size (in KB)
};

class CStatusUpdate
{
public:
	CStatusUpdate(CString stat, __int64 statTime = 0):status(stat), tm(statTime){if(!tm) QueryPerformanceCounter((LARGE_INTEGER *)&tm);}
	CStatusUpdate(const CStatusUpdate& src){*this = src;}
	~CStatusUpdate(){}
	const CStatusUpdate& operator =(const CStatusUpdate& src)
	{
		status =  src.status;
		tm = src.tm;

		return src;
	}

	CString		status;	// status text
	__int64		tm;
};

class CPagetestBase
{
public:
	CPagetestBase(void);
	virtual ~CPagetestBase(void);

	CAtlList<CTrackedEvent *>	events;			// all events
	CAtlList<CDnsLookup *>		dns;			// DNS only events
	CAtlList<CSocketConnect *>	connects;		// Socket connections
	CAtlList<CSocketRequest *>	requests;		// Socket requests
	CAtlList<CWinInetRequest *>	winInetRequestList;				// reverse-order list of winInet requests
	CAtlMap<SOCKET, CSocketInfo *>		openSockets;			// hash of the currently open sockets
	CAtlMap<HINTERNET, CWinInetRequest *>	winInetRequests;	// hash of WinInet requests that are currently pending
	CAtlMap<DWORD, CSocketRequest *>		requestSocketIds;	// hash of socket ID's to socket requests
	CAtlMap<DWORD, HWND>		threadWindows;
	CAtlList<CString>			navigatedURLs;	// URLs that we navigated to
	CAtlList<CStatusUpdate>		statusUpdates;	// List of status updates and when they happened

	CRITICAL_SECTION			cs;
	CRITICAL_SECTION			csBackground;
	bool						active;			// are we currently timing anything
	bool						available;		// Are we available to time?  Don't if the user hasn't closed the UI
  bool            capturingAFT; // are we capturing AFT (if so we need to artifically extend the time)?
	bool						processed;		// have the results been processed?
	DWORD						abm;			// Activity measurement mode (0 = none, 1 = web 2.0, 2 = auto)
	DWORD						currentDoc;		// what is the ID of the current document (to assign to objects)?
	DWORD						nextDoc;		// what's the next Doc ID to assign when navigation starts?
	DWORD						cached;			// are we running a cached test?

	DWORD						out;			// number of bytes sent out
	DWORD						in;				// number of bytes received

	DWORD						out_doc;		// number of bytes sent out
	DWORD						in_doc;			// number of bytes received

	int							openRequests;	// count of outstanding requests
	CString						url;			// url for the request
	DWORD						errorCode;		// error code for the page load if there was one
	bool						interactive;	// are we in interactive more?
	CString						domElementId;	// DOM element ID to look for
	CString						domRequest;		// user experience request
	CAtlList<CString>			requiredRequests;	// list of requests that are required before the test can complete
	MEASUREMENT_POINT			domRequestType;	// what part of the request to trigger off of?
	CString						endRequest;		// request to force end
	CAtlList<CString>			blockRequests;	// which requests to block
	CString						basicAuth;		// basic auth login to use
  DWORD           aft;          // above-the fold measurement enabled?
  DWORD           aftMinChanges;
  DWORD           aftEarlyCutoff;
	HWND						hMainWindow;	// main app window
	HWND		        hBrowserWnd;
	CString						userAgent;		// custom user agent string
	CAtlArray<struct in_addr>	dnsServers;		// DNS servers to use for lookups (if overriding the default)

	// timing support
	__int64						freq;			// timer frequency
	__int64						msFreq;			// frequency for milliseconds
	__int64						start;			// time that the request started
	__int64						end;			// time of last Operation
	__int64						endDoc;			// time of last Document complete
	__int64						lastDoc;		// time of last Document complete
	__int64						firstByte;		// time to first byte
	__int64						lastActivity;   // time that something last happened (won't be recorded)
	__int64						lastRequest;    // time of last URL request.
	__int64						domElement;		// time when the DOM element appeared (only if looking for a specific DOM element)
	__int64						startRender;	// time when the UI started to render
	__int64						basePage;		// time when the base page completed
	CAtlList<__int64>			layoutChanged;	// times when the page dimensions changed
	CTime						startTime;
	bool						haveBasePage;	// do we already have the base page identified?
	DWORD						basePageRedirects;	// number of redirects for the base page
	CString						basePageHost;
	DWORD						ieMajorVer;		// version of IE that is running

	// URLBlast support
	CString						testUrl;
	CString						testOptions;
	bool						exitWhenDone;
	DWORD						timeout;
	DWORD						ignoreSSL;
	CString						customHost;

	// scripting support
	bool	runningScript;
	DWORD	script_ABM;
	
	// optimization scores
	CString optReport;
	int	gzipScore;
	int	doctypeScore;
	int keepAliveScore;
	int staticCdnScore;
	int oneCdnScore;
	int cacheScore;
	int combineScore;
	int cookieScore;
	int minifyScore;
	int compressionScore;
	int etagScore;
	
	// screen shots of various stages
  ScreenCapture screenCapture;
	CAtlList<CProgressData> progressData;
	
	CAtlList<CBrowserTracker> browsers;
	//CComQIPtr<IWebBrowser2, &IID_IWebBrowser2> m_spWebBrowser2;

  // DOM interface (for Javascript calling out)
  #ifndef PAGETEST_EXE
  CComObject<CWebPagetestDOM>	* webpagetestDom;
  #endif

	SECURITY_ATTRIBUTES nullDacl;
	SECURITY_DESCRIPTOR SD;

	virtual void	DeleteImages(void);
	virtual void	Reset(void);
	virtual void	DoStartup(CString& szUrl, bool initializeDoc = false) = 0;
	virtual void	ResizeWindow(void) = 0;
	virtual void	StopTimers() = 0;
	virtual void	StartTimer(UINT_PTR id, UINT elapse) = 0;
	virtual void	Create(void) = 0;
	virtual DWORD	CheckABM(void);
	virtual void	AddEvent(CTrackedEvent * e);
	virtual void	RepaintWaterfall(DWORD minInterval = 100) = 0;
	virtual void	UpdateWaterfall(bool now = false) = 0;
	virtual void	CheckStuff(void) = 0;
	virtual void	CheckReadyState(void) = 0;
	virtual void	AddBrowser(CComPtr<IWebBrowser2> browser);
	virtual void	RemoveBrowser(CComPtr<IWebBrowser2> browser);
	virtual void	SaveImage(BOOL drawWaterfall, LPCTSTR fileName = NULL) = 0;
	virtual void	FlushResults(void) = 0;
	virtual void	LogError(bool scriptError = false) = 0;
	virtual void	TestComplete(void) = 0;
	virtual void	StartMeasuring(void) = 0;
  bool FindBrowserWindow();
  HWND FindBrowserDocument(HWND parent_window);
	
	typedef enum{
		equal = 0,
		left = 1,
		mid = 2
	}attrOperator;
	
	virtual CComPtr<IHTMLElement>	FindDomElementByAttribute(CString attrVal);	// combined attribute and value separated by '
	virtual CComPtr<IHTMLElement>	FindDomElementByAttribute(CString &tag, CString &attribute, CString &value, attrOperator &op);
	virtual CComPtr<IHTMLElement>	FindDomElementByAttribute(CString &tag, CString &attribute, CString &value, attrOperator &op, CComPtr<IHTMLDocument2> doc);
};