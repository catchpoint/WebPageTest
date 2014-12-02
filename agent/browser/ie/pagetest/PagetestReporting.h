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
#include "ScriptEngine.h"

namespace pagespeed {
	class PagespeedInput;
	class Results;
}

class CCDNEntry
{
public:
	CCDNEntry(void):isCDN(false){}
	CCDNEntry(const CCDNEntry& src){ *this = src; }
	~CCDNEntry(void){}
	const CCDNEntry& operator =(const CCDNEntry& src)
	{
		name = src.name;
		isCDN = src.isCDN;
		provider = src.provider;
		return src;
	}

	CString name;
	CString provider;
	bool	isCDN;
};

class CPagetestReporting :
	public CScriptEngine
{
public:
	CPagetestReporting(void);
	virtual ~CPagetestReporting(void);

	enum _report_state
	{
		NONE,
		QUIT,
		QUIT_NOEND,
		DOC_END,
		TIMER,
		DOC_DONE
	};

	double			tmDoc;			// calculated time to doc complete
	double			tmLoad;			// calculated load time
	double			tmActivity;		// calculated time to fully loaded
	double			tmFirstByte;	// calculated time to first byte
	double			tmStartRender;	// calculated time to render start
	double			tmDOMElement;	// calculated time to DOM Element
	double			tmLastActivity;	// time to last activity
	double			tmBasePage;		// time to the base page being complete
	int				reportSt;		// Done Reporting?
	DWORD			basePageResult;	// result of the base page
  CString   basePageCDN;    // CDN used by the base page (if any)
  CString   basePageRTT;    // RTT for the base page
  DWORD     basePageAddressCount;
  DWORD     msVisualComplete; // Visually complete time (only available with video capture)

	DWORD			nDns;			// number of DNS lookups
	DWORD			nConnect;		// number of connects
	DWORD			nRequest;		// number of requests
	DWORD			nReq200;		// number of requests OK
	DWORD			nReq302;		// number of redirects
	DWORD			nReq304;		// number of "Not Modified"
	DWORD			nReq404;		// number of "Not Found"
	DWORD			nReqOther;		// number of other reequests

	DWORD			nDns_doc;		// number of DNS lookups
	DWORD			nConnect_doc;	// number of connects
	DWORD			nRequest_doc;	// number of requests
	DWORD			nReq200_doc;	// number of requests OK
	DWORD			nReq302_doc;	// number of redirects
	DWORD			nReq304_doc;	// number of "Not Modified"
	DWORD			nReq404_doc;	// number of "Not Found"
	DWORD			nReqOther_doc;	// number of other reequests

	DWORD			measurementType;	// is the page web 1.0 or 2.0?

	CString			logFile;		// base file name for the log file
	CString			linksFile;		// location where we should save all links found on the page to
	CString			s404File;		// location where we should save all 404's from the page
	CString			htmlFile;		// location where we should save the page html out to
	CString			cookiesFile;	// location where we should save the cookies out to
	DWORD			saveEverything;	// Do we save out a waterfall image, reports and everything we have?
	DWORD			captureVideo;	// do we save out the images necessary to construct a video?
	DWORD			checkOpt;		// Do we run the optimization checks?
  DWORD     noHeaders;
  DWORD     noImages;
	CString			somEventName;	// name for the current web test
	MIB_TCPSTATS	tcpStatsStart;	// TCP stats at the start of the document
	MIB_TCPSTATS	tcpStats;		// TCP stats calculated
	double			tcpRetrans;		// rate of TCP retransmits (basically packet loss)
	TCHAR			descriptor[100];
	TCHAR			logUrl[1000];
	DWORD			build;
	CString			version;
	DWORD			includeHeader;
	DWORD			includeObjectData;
	DWORD			includeObjectData_Now;
	CString			guid;
	CString			pageUrl;
	SOCKADDR_IN		pageIP;			// IP address for the page (first IP address used basically)

	DWORD	totalFlagged;		// total number of flagged connections on the page
	DWORD	maxSimFlagged;		// Maximum number of simultaneous flagged connections
	DWORD	flaggedRequests;	// number of flagged requests
	CAtlList<CString>	blockedRequests;	// list of requests that were blocked
	CAtlList<CString>	blockedAdRequests;	// list of ad requests that were blocked

	// optimization aggregates
	DWORD	gzipTotal;
	DWORD	gzipTarget;
	DWORD	minifyTotal;
	DWORD	minifyTarget;
	DWORD	compressTotal;
	DWORD	compressTarget;

	virtual void	Reset(void);
	virtual void	ProcessResults(void);
	virtual void	FlushResults(void);

	// database-friendly report
	virtual void	GenerateLabReport(bool fIncludeHeader, CString &szLogFile);

	// detailed reporting information
	virtual void	ReportRequest(CString & szReport, CWinInetRequest * r);
	virtual void	GenerateReport(CString &szReport);
	virtual void	ReportPageData(CString & buff, bool fIncludeHeader);
	virtual void	ReportObjectData(CString & buff, bool fIncludeHeader);

	// internal helpers
	virtual void	GenerateGUID(void);

protected:
	CString	GenerateSummaryStats(void);

	// optimization checks
	void CheckOptimization(void);
	void CheckGzip();
	void CheckKeepAlive();
	void CheckCDN();
	void CheckCache();
	void CheckCombine();
	void CheckCookie();
	void CheckMinify();
	void CheckImageCompression();
	void CheckProgressiveJpeg();
	void CheckEtags();
	void CheckPageSpeed();
	void ProtectedCheckPageSpeed();
  void CheckCustomRules();
	void SaveHTML(void);
	void SaveCookies(void);
	void Log404s(void);
	void PopulatePageSpeedInput(pagespeed::PagespeedInput* input);
	void GetNavTiming(long &load_start, long &load_end, long &dcl_start, long &dcl_end, long &first_paint);
	void SaveUserTiming(CString file);
  void SaveCustomMetrics(CString file);
	CString GetCustomMetric(CString js);
	CRITICAL_SECTION csCDN;

	CAtlList<DWORD>	otherResponseCodes;
	CStringA html;
	pagespeed::Results* pagespeedResults;

	bool IsCDN(CWinInetRequest * w, CString &provider);
	CAtlList<CCDNEntry> cdnLookups;
private:
	void SaveUrls(void);
	void GetLinks(CComQIPtr<IHTMLDocument2> &doc, CAtlList<CStringA> &urls);
	void SaveProgressImage(CxImage &img, CString file, bool resize, DWORD quality);
	void SaveStatusUpdates(CString file);
  void SaveBodies(CString file);
  void SaveCustomMatches(CString file);
	void SortEvents();
  void SaveVideo();
  bool ImagesAreDifferent(CxImage * img1, CxImage* img2);
  void SaveHistogram(CxImage& image, CString file);
  CStringA JSONEscape(CStringA src);
  bool FindJPEGMarker(BYTE * buff, DWORD len, DWORD &pos,
                      BYTE * &marker, DWORD &marker_len);
};

