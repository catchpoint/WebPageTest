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

#include "StdAfx.h"
#include "resource.h"
#include "PagetestReporting.h"
#include <shlobj.h>
#include <atlenc.h>
#include "cdn.h"
#include "zlib/zlib.h"
#include "jsmin/JSMin.h"
#include "PageSpeed/include/pagespeed/core/engine.h"
#include "PageSpeed/include/pagespeed/core/pagespeed_init.h"
#include "PageSpeed/include/pagespeed/core/pagespeed_input.h"
#include "PageSpeed/include/pagespeed/core/pagespeed_version.h"
#include "PageSpeed/include/pagespeed/formatters/proto_formatter.h"
#include "PageSpeed/include/pagespeed/image_compression/image_attributes_factory.h"
#include "PageSpeed/include/pagespeed/l10n/localizer.h"
#include "PageSpeed/include/pagespeed/platform/ie/ie_dom.h"
#include "PageSpeed/include/pagespeed/proto/formatted_results_to_json_converter.h"
#include "PageSpeed/include/pagespeed/proto/formatted_results_to_text_converter.h"
#include "PageSpeed/include/pagespeed/proto/pagespeed_output.pb.h"
#include "PageSpeed/include/pagespeed/proto/pagespeed_proto_formatter.pb.h"
#include "PageSpeed/include/pagespeed/rules/rule_provider.h"
#include "PageSpeed/include/googleurl/base/logging.h"
#include <regex>
#include <string>
#include <sstream>
using namespace std::tr1;
#include "AFT.h"
#include "../urlblast/zip/zip.h"

EXTERN_C IMAGE_DOS_HEADER __ImageBase;
CPagetestReporting * reporting = NULL;

CPagetestReporting::CPagetestReporting(void):
	reportSt(NONE)
	, experimental(0)
	, includeHeader(0)
	, labID(-1)
	, dialerID(-1)
	, connectionType(-1)
	, build(0)
	, guid(_T(""))
	, includeObjectData(1)
	, saveEverything(0)
	, captureVideo(0)
	, screenShotErrors(0)
	, checkOpt(1)
  , noHeaders(0)
  , noImages(0)
	, totalFlagged(0)
	, maxSimFlagged(0)
	, flaggedRequests(0)
	, gzipTotal(0)
	, gzipTarget(0)
	, minifyTotal(0)
	, minifyTarget(0)
	, compressTotal(0)
	, compressTarget(0)
	, pagespeedResults(NULL)
{
	descriptor[0] = 0;
	logUrl[0] = 0;
	InitializeCriticalSection(&csCDN);
		
	// figure out the version number of Pagetest
	TCHAR file[MAX_PATH];
	if( GetModuleFileName(reinterpret_cast<HMODULE>(&__ImageBase), file, _countof(file)) )
	{
		// get the version info block for the app
		DWORD unused;
		DWORD infoSize = GetFileVersionInfoSize(file, &unused);
		LPBYTE pVersion = NULL;
		if(infoSize)  
			pVersion = (LPBYTE)malloc( infoSize );

		if(pVersion)
		{
			if(GetFileVersionInfo(file, 0, infoSize, pVersion))
			{
				// get the fixed file info
				VS_FIXEDFILEINFO * info = NULL;
				UINT size = 0;
				if( VerQueryValue(pVersion, _T("\\"), (LPVOID*)&info, &size) )
				{
					if( info )
					{
						build = LOWORD(info->dwFileVersionLS);
						version.Format(_T("%d.%d.%d.%d"), HIWORD(info->dwFileVersionMS), LOWORD(info->dwFileVersionMS), HIWORD(info->dwFileVersionLS), LOWORD(info->dwFileVersionLS) );
					}
				}
			}

			free( pVersion );
		}
	}
}

CPagetestReporting::~CPagetestReporting(void)
{
	DeleteCriticalSection(&csCDN);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CPagetestReporting::Reset(void)
{
	__super::Reset();
	
	EnterCriticalSection(&cs);
	
	// put in a little protection against crashes
	__try
	{
		// reset any information about the page
		nDns = 0;
		nConnect = 0;
		nRequest = 0;
		nReq200 = 0;
		nReq302 = 0;
		nReq304 = 0;
		nReq404 = 0;
		nReqOther = 0;
		otherResponseCodes.RemoveAll();

		nDns_doc = 0;
		nConnect_doc = 0;
		nRequest_doc = 0;
		nReq200_doc = 0;
		nReq302_doc = 0;
		nReq304_doc = 0;
		nReq404_doc = 0;
		nReqOther_doc = 0;
		
		measurementType = 0;
		
		tmDoc = 0;
		tmLoad = 0;
		tmActivity = 0;
		tmLastActivity = 0;
		tmFirstByte = 0;
		tmStartRender = 0;
		tmDOMElement = 0;
		tmBasePage = 0;
    msAFT = 0;
    msVisualComplete = 0;
		reportSt = NONE;
		
		basePageResult = -1;
		html.Empty();

		totalFlagged = 0;
		maxSimFlagged = 0;
		flaggedRequests = 0;
		
		gzipTotal = 0;
		gzipTarget = 0;
		minifyTotal = 0;
		minifyTarget = 0;
		compressTotal = 0;
		compressTarget = 0;
		
		memset( &tcpStatsStart, 0, sizeof(tcpStatsStart) );
		memset( &tcpStats, 0, sizeof(tcpStats) );
		tcpRetrans = 0;
		
		blockedRequests.RemoveAll();
		blockedAdRequests.RemoveAll();
		if (pagespeedResults != NULL) {
			delete pagespeedResults;
			pagespeedResults = NULL;
		}
	}__except(EXCEPTION_EXECUTE_HANDLER)
	{
	}
	
	LeaveCriticalSection(&cs);
}

// Helper that populates the set of Page Speed rules used by Page Test.
void PopulatePageSpeedRules(std::vector<pagespeed::Rule*>* rules)
{
	// Don't save the optimized versions of resources in the 
	// results structure, in order to conserve memory.
	const bool save_optimized_content = false;
	pagespeed::rule_provider::AppendPageSpeedRules(
		save_optimized_content,
		rules);

	// Now remove any incompatible rules.
	std::vector<std::string> incompatible_rule_names;
	pagespeed::InputCapabilities capabilities(
		pagespeed::InputCapabilities::DOM |
		pagespeed::InputCapabilities::ONLOAD |
		pagespeed::InputCapabilities::PARENT_CHILD_RESOURCE_MAP |
		pagespeed::InputCapabilities::REQUEST_HEADERS |
		pagespeed::InputCapabilities::RESPONSE_BODY |
		pagespeed::InputCapabilities::REQUEST_START_TIMES);
	pagespeed::rule_provider::RemoveIncompatibleRules(
		rules,
		&incompatible_rule_names,
		capabilities);
	if (!incompatible_rule_names.empty())
	{
		ATLTRACE(_T("[Pagetest] - Removing %d incompatible rules.\n"), 
			incompatible_rule_names.size());
	}
}

/*-----------------------------------------------------------------------------
	Protected formatting - crashes at times when running against amazon.com
-----------------------------------------------------------------------------*/
bool PageSpeedFormatResults(pagespeed::Engine& engine, pagespeed::Results& pagespeedResults, pagespeed::Formatter * formatter)
{
  bool ret = false;

  ATLTRACE(_T("[Pagetest] - PageSpeedFormatResults\n"));

  __try
  {
    ret = engine.FormatResults(pagespeedResults, formatter);
  }__except(EXCEPTION_EXECUTE_HANDLER)
	{
	}

  ATLTRACE(_T("[Pagetest] - PageSpeedFormatResults Complete\n"));

  return ret;
}

/*-----------------------------------------------------------------------------
	OK, time to generate any results
-----------------------------------------------------------------------------*/
void CPagetestReporting::FlushResults(void)
{
	ATLTRACE(_T("[Pagetest] - ***** CPagetestReporting::FlushResults\n"));
	
	// update the ending TCP stats
	GetTcpStatistics(&tcpStats);

	// Stop any pending timers if we have them
	StopTimers();

	EnterCriticalSection(&cs);
	if( active || capturingAFT )
	{
		active = false;
    capturingAFT = false;
		LeaveCriticalSection(&cs);
		
		// make sure we got at least one document complete, otherwise we really have no data
		if(end)
		{
			ATLTRACE(_T("[Pagetest] - ***** CPagetestReporting::FlushResults - Processing Results\n"));
			
			// lower the process priority while doing the background processing
			HANDLE hProcess = GetCurrentProcess();
			DWORD oldPriority = GetPriorityClass(hProcess);
			SetPriorityClass(hProcess, BELOW_NORMAL_PRIORITY_CLASS);
			Sleep(0);

			// generate the GUID to use for this event
			GenerateGUID();

      if (script_logData) {
			  ProcessResults();
			  LogError();
      }

			ATLTRACE(_T("[Pagetest] - ***** CPagetestReporting::FlushResults - Results Processed\n"));

			if( !interactive )
			{
				// build the actual waterfall
				UpdateWaterfall(true);

				if( !logFile.IsEmpty() )
				{
					ATLTRACE(_T("[Pagetest] - ***** CPagetestReporting::FlushResults - Generating Lab Report\n"));

					DWORD msDoc = endDoc < start ? 0 : (DWORD)((endDoc - start)/msFreq);
					DWORD msDone = lastRequest < start ? 0 : (DWORD)((lastRequest - start)/msFreq);
          msDone = max(msDoc, msDone);
					DWORD msRender = (DWORD)(tmStartRender * 1000.0);
					DWORD msDom = (DWORD)(tmDOMElement * 1000.0);

          if( saveEverything && script_logData )
					{
						CString step;
						//if( runningScript )
						//	step.Format(_T("-%d"), scriptStep);
						
						ATLTRACE(_T("[Pagetest] - ***** CPagetestReporting::FlushResults - Saving Images\n"));
							
						// write out the screen shot
            if( !noImages )
            {
              CxImage image;
              if( screenCapture.GetImage(CapturedImage::FULLY_LOADED, image) )
              {
                if (pngScreenShot)
                  image.Save(logFile+step+_T("_screen.png"), CXIMAGE_FORMAT_PNG);
						    SaveProgressImage(image, logFile+step+_T("_screen.jpg"), true, imageQuality);
              }
  						
						  // save out the other screen shots we have gathered
              if( screenCapture.GetImage(CapturedImage::START_RENDER, image) )
						    SaveProgressImage(image, logFile+step+_T("_screen_render.jpg"), true, imageQuality);
              if( screenCapture.GetImage(CapturedImage::DOM_ELEMENT, image) )
						    SaveProgressImage(image, logFile+step+_T("_screen_dom.jpg"), true, imageQuality);
              if( screenCapture.GetImage(CapturedImage::DOCUMENT_COMPLETE, image) )
						    SaveProgressImage(image, logFile+step+_T("_screen_doc.jpg"), true, imageQuality);
            }

						ATLTRACE(_T("[Pagetest] - ***** CPagetestReporting::FlushResults - Saving Reports\n"));
						
						// save the report
            HANDLE hFile = INVALID_HANDLE_VALUE;
            if( !noHeaders )
            {
						  hFile = CreateFile(logFile+step+_T("_report.txt"), GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ, &nullDacl, CREATE_ALWAYS, 0, 0);
						  if( hFile != INVALID_HANDLE_VALUE )
						  {
							  CString szReport;
							  GenerateReport(szReport);
							  DWORD written;
							  CT2A str((LPCTSTR)szReport, CP_UTF8);
							  WriteFile(hFile, (LPCSTR)str, lstrlenA(str), &written, 0);
							  CloseHandle(hFile);
						  }
            }
						
						// save the page speed report
						hFile = CreateFile(logFile+step+_T("_pagespeed.txt"), GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ, &nullDacl, CREATE_ALWAYS, 0, 0);
						if( hFile != INVALID_HANDLE_VALUE )
						{
							std::vector<pagespeed::Rule*> rules;
							PopulatePageSpeedRules(&rules);
	
							ATLTRACE(_T("[Pagetest] - ***** CPagetestReporting::FlushResults - Initializing Page Speed engine\n"));

							// Ownership of rules is transferred to the Engine instance.
							pagespeed::Engine engine(&rules);
							engine.Init();

							ATLTRACE(_T("[Pagetest] - ***** CPagetestReporting::FlushResults - Formatting Page Speed results\n"));

							pagespeed::l10n::BasicLocalizer localizer;
							pagespeed::FormattedResults formatted_results;
							formatted_results.set_locale(localizer.GetLocale());
							pagespeed::formatters::ProtoFormatter formatter(&localizer, &formatted_results);
							if ( pagespeedResults && PageSpeedFormatResults(engine, *pagespeedResults, &formatter) )
							{
								DWORD written;
								std::string pagespeedReport;
								pagespeed::proto::FormattedResultsToJsonConverter::Convert(formatted_results, &pagespeedReport);
								WriteFile(hFile, pagespeedReport.c_str(), pagespeedReport.size(), &written, 0);
							}
							else
							{
								ATLTRACE(_T("[Pagetest] - ***** Failed to write PageSpeed results."));
							}
							CloseHandle(hFile);
						}

						// save out the status updates
            ATLTRACE(_T("[Pagetest] - ***** CPagetestReporting::FlushResults - Saving Status Updates\n"));
            if( !noHeaders )
						  SaveStatusUpdates(logFile+step+_T("_status.txt"));

            if( bodies )
              SaveBodies(logFile+step+_T("_bodies.zip"));

            if( aft )
              msAFT = CalculateAFT();

            if( captureVideo )
            {
              ATLTRACE(_T("[Pagetest] - ***** CPagetestReporting::FlushResults - Saving video\n"));
              SaveVideo();
            }

            // save out the progress data
            if( !noHeaders )
            {
						  EnterCriticalSection(&csBackground);
						  CStringA progress;
						  POSITION pos = progressData.GetHeadPosition();
						  while( pos )
						  {
							  if( progress.IsEmpty() )
								  progress = "Offset Time (ms),Bandwidth In (kbps),CPU Utilization (%),Memory Use (KB)\r\n";

							  CProgressData data = progressData.GetNext(pos);
                DWORD ms = data.sampleTime < start ? 0 : (DWORD)((data.sampleTime - start)/msFreq);
							  CStringA buff;
							  buff.Format("%d,%d,%0.2f,%d\r\n", ms, data.bpsIn, data.cpu, data.mem );
							  progress += buff;
						  }
						  LeaveCriticalSection(&csBackground);
						  hFile = CreateFile(logFile+step+_T("_progress.csv"), GENERIC_WRITE, 0, &nullDacl, CREATE_ALWAYS, 0, 0);
						  if( hFile != INVALID_HANDLE_VALUE )
						  {
							  DWORD dwBytes;
							  WriteFile(hFile, (LPCSTR)progress, progress.GetLength(), &dwBytes, 0);
							  CloseHandle(hFile);
						  }
            }
          }

          // delete the image data
          screenCapture.Free();

					// only save the result data if we did not fail because of what looks like a network connection problem
					if( saveEverything || !(errorCode == 0x800C0005 && nRequest == 1 && nReqOther == 1) )
						GenerateLabReport(saveEverything ? true : false, logFile);
        }
				
				// Save out a list of urls from this page (if necessary) - used for crawling
				SaveUrls();
				
				// save out the page HTML if appropriaite
				SaveHTML();

				// save out the cookies if appropriaite
				SaveCookies();

				// log any 404's if needed
				Log404s();
			
				// store the result in the registry
				CRegKey key;
				if( key.Open(HKEY_CURRENT_USER, _T("Software\\AOL\\ieWatch"), KEY_WRITE) == ERROR_SUCCESS )
				{
					key.SetDWORDValue(_T("Result"), errorCode);
					key.Close();
				}

				available = true;
			}
			
			// restore the process priority
			SetPriorityClass(hProcess, oldPriority);

			reportSt = DOC_DONE;
		}
	}
	else
		LeaveCriticalSection(&cs);

	ATLTRACE(_T("[Pagetest] - ***** CPagetestReporting::FlushResults - done with results processing\n"));

  // reset the test state
  Reset();

	// are we running a script?
	if( runningScript )
		ContinueScript(true);
	else
	{
		// see if we were running as part of urlBlaster
		// the exit from a script will be handled directly in the script engine
		if( exitWhenDone )
		{
			CComPtr<IWebBrowser2>	browser;
			
			ATLTRACE(_T("[Pagetest] - Exiting\n"));
      available = false;
			EnterCriticalSection(&cs);
			POSITION pos = browsers.GetHeadPosition();
			while(pos)
			{
				CBrowserTracker tracker = browsers.GetNext(pos);
				if( tracker.browser && tracker.threadId == GetCurrentThreadId())
					browser = tracker.browser;
			}
			LeaveCriticalSection(&cs);
			
			if( browser )
				browser->Quit();
			
			if( hMainWindow )
				::PostMessage(hMainWindow, WM_CLOSE, 0, 0);
		}
		else
		{
			ATLTRACE(_T("[Pagetest] - Not Exiting\n"));
			
			TestComplete();
		}
	}

	ATLTRACE(_T("[Pagetest] - ***** CPagetestReporting::FlushResults Complete\n"));
}

/*-----------------------------------------------------------------------------
	Go through all the data and do the parsing/calculating once
-----------------------------------------------------------------------------*/
void CPagetestReporting::ProcessResults(void)
{
	firstByte = 0;
	pageIP.sin_addr.S_un.S_addr = 0;
	
	OutputDebugString(_T("[Pagetest] - Processing Results\n"));
	
	// if it was just a single js file or something similar, treat it as successful
	if( errorCode == 200 )
		errorCode = 0;
	
	// figure out the TCP retransmits
	if( tcpStats.dwOutSegs >= tcpStatsStart.dwOutSegs )
		tcpStats.dwOutSegs = tcpStats.dwOutSegs - tcpStatsStart.dwOutSegs;
	else
		tcpStats.dwOutSegs = -1;

	if( tcpStats.dwRetransSegs >= tcpStatsStart.dwRetransSegs )
		tcpStats.dwRetransSegs = tcpStats.dwRetransSegs - tcpStatsStart.dwRetransSegs;
	else
		tcpStats.dwRetransSegs = -1;
		
	if(tcpStats.dwOutSegs != -1 && tcpStats.dwOutSegs && tcpStats.dwRetransSegs != -1)
		tcpRetrans = ((double)tcpStats.dwRetransSegs / (double)(tcpStats.dwRetransSegs + tcpStats.dwOutSegs)) * 100.0;
	else
		tcpRetrans = -1.0;
		
	// determine what url to use for reporting
	pageUrl = url;
	if( !script_url.IsEmpty() )
	{
		pageUrl = script_url;
		lstrcpy(logUrl, (LPCTSTR)script_url);
	}
	else if(lstrlen(logUrl))
		pageUrl = logUrl;

	if( pageUrl.Left(4) != _T("http") )
		pageUrl = CString("http://") + pageUrl;

	// update the event name in case we're running a script
	if( runningScript && !script_eventName.IsEmpty() )
	{
		if( somEventName.IsEmpty() )
			somEventName = script_eventName;
		else
			somEventName.Replace(_T("%STEP%"), (LPCTSTR)script_eventName);
	}
	
	// reset the bytes in and out (will be calculated off of the actual requests)	
	in = 0;
	in_doc = 0;
	out = 0;
	out_doc = 0;

	// sort the events by start time
	SortEvents();
	
	// walk the list and calculate each event
	__int64	earliest = 0;
	POSITION pos = events.GetHeadPosition();
	while( pos )
	{
		POSITION oldPos = pos;
		CTrackedEvent * event = events.GetNext(pos);
		if( event )
		{
			if( !event->end )
				event->end = max(lastRequest, end);

			if( event->end > event->start )
				event->elapsed = event->end < event->start ? 0 : ((double)(event->end - event->start)) / (double)freq;
			event->offset = event->start < start ? 0 : ((double)(event->start - start)) / (double)freq;
			
			ATLTRACE(_T("[Pagetest] - Checking event 0x%p - type %d\n"), event, event->type);
			CWinInetRequest * w = (CWinInetRequest *)event;

			if( event->type == CTrackedEvent::etWinInetRequest && (w->valid) )
			{
				ATLTRACE(_T("[Pagetest] - Url: %s"), (LPCTSTR)(w->host + w->object));

				// don't processes any cached responses for the aggregate results
				if( !w->fromNet )
					w->ignore = true;

				// do any post-processing				
				w->Process();
				
				if( !w->linkedRequest )
				{
					ATLTRACE(_T("[Pagetest] - Request not linked: %s"), (LPCTSTR)(w->host + w->object));
				}
				
				// keep track of the earliest start time to set the actual test start time
				if( w->start && (!earliest || w->start < earliest)  )
					earliest = w->start;

				// re-run the checks for the DOM Element time to make sure we get the first occurrence
				CString request = w->host + w->object;
				if( !domRequest.IsEmpty() && request.Find(domRequest) > -1 )
				{
					__int64 de = w->end;
					switch(domRequestType)
					{
						case START: de = w->start; break;
						case TTFB: de = w->firstByte; break;
					}
					if( de < domElement && de > 0 )
						domElement = de;
				}

				if( !w->ignore )
				{
					// calculate bytes only for the wininet events						
					in += w->in;
					out += w->out;
					if( w->docID )
					{
						in_doc += w->in;
						out_doc += w->out;
					}
					
					// count the DNS lookups
					if( w->dnsStart )
					{
						nDns++; 
						if( w->docID )
							nDns_doc++; 
					}
					
					// count the socket connections
					if( w->socketConnect )
					{
						nConnect++;
						if( w->docID )
							nConnect_doc++;
					}

					// histogram the different response codes
					nRequest++;
					switch(w->result)
					{
						case 200: nReq200++; break;
						case 302: nReq302++; break;
						case 304: nReq304++; break;
						case 404: nReq404++; break;
						default: nReqOther++; otherResponseCodes.AddTail(w->result); break;
					}

					if( event->docID )
					{
						nRequest_doc++;
						switch(w->result)
						{
							case 200: nReq200_doc++; break;
							case 302: nReq302_doc++; break;
							case 304: nReq304_doc++; break;
							case 404: nReq404_doc++; break;
							default: nReqOther_doc++; break;
						}
					}
					
					// take the TTFB from the first request
					if( !firstByte )
						firstByte = w->firstByte;
					
					// flag errors based on the wininet events
					if( !errorCode && (w->result >= 400 || w->result < 0) )
					{
						if( w->docID || abm == 1 )
							errorCode = 99999;
					}
						
					// get the IP address of the first request
					if( !pageIP.sin_addr.S_un.S_addr && w->peer.sin_addr.S_un.S_addr )
						memcpy( &pageIP, &w->peer, sizeof(pageIP) );
						
					// see if the request is flagged
					if( w->flagged )
						flaggedRequests++;
						
					// see if it is the base page
					if( w->basePage )
					{
						basePage = w->end;
						basePageResult = w->result;
						if( html.IsEmpty() && w->body )
							html = w->body;
							
						// use the ttfb of the base page (override the earlier ttfb)
						if( w->firstByte )
							firstByte = w->firstByte;
					}
				}
			}

			// remove invalid requests from the list
			if( event->type == CTrackedEvent::etWinInetRequest && !(w->valid) )
			{
				events.RemoveAt(oldPos);
				delete event;
			}
		}
	}

	// move the start time to the start of the first request (non-scripted tests or the first step in a scripted test)
	if( earliest && (!runningScript || scriptStep == 1) )
		start = earliest;

	// Calculate summary results
	tmLastActivity = lastRequest < start ? 0 : ((double)(lastRequest - start)) / (double)freq;
	tmFirstByte = firstByte < start ? 0 : ((double)(firstByte - start)) / (double)freq;
	tmStartRender = startRender < start ? 0 : ((double)(startRender - start)) / (double)freq;
	tmDOMElement = domElement < start ? 0 : ((double)(domElement - start)) / (double)freq;
	if( domElement && !tmDOMElement )
		tmDOMElement = 1;
	tmBasePage = basePage < start ? 0 : ((double)(basePage - start)) / (double)freq;
	
	if( (!errorCode || errorCode == 99999) && !endDoc )
	{
		if( script_waitForJSDone || !requiredRequests.IsEmpty() || (!domElementId.IsEmpty() && !domElement) )
		{
			errorCode = 99996;
		}
		else if ( reportSt == QUIT_NOEND )
		{
			if ( errorCode == 99999 )
				errorCode = 99998;
			else
				errorCode = 99997;
		}
	}
	
	// script errors override all other error codes
	if( script_error )
		errorCode = 88888;

	// figure out if the page is web 1.0 or 2.0	
	measurementType = 1;
	if( abm == 1 )
		measurementType = 2;
	
	// pick the load time based on the measurement type (either endDoc or lastActivity)
	if( measurementType == 1 )
		end = endDoc;
	else
		end = lastRequest;

	tmDoc = endDoc < start ? 0 : ((double)(endDoc - start)) / (double)freq;
	tmActivity = lastRequest < start ? 0 : ((double)(lastRequest - start)) / (double)freq;
  tmLoad = tmActivity = max(tmActivity, tmDoc);
  tmLastActivity = tmActivity;

	if( (!errorCode || errorCode == 99999) && (!tmDoc || tmDoc > timeout * 1000) )
		errorCode = 99997;
	
	// If it was web 1.0, use the document stats for the page stats
	// remove this when the database is ready to handle both views
/*	if( measurementType == 1 )
	{
		out = out_doc;
		in = in_doc;
		nDns = nDns_doc;
		nConnect = nConnect_doc;
		nRequest = nRequest_doc;
		nReq200 = nReq200_doc;
		nReq302 = nReq302_doc;
		nReq304 = nReq304_doc;
		nReq404 = nReq404_doc;
		nReqOther = nReqOther_doc;
	}
*/	
	ATLTRACE(_T("[Pagetest] - Running optimization checks\n"));

	// check the page optimization
	CheckOptimization();
	
	processed = true;
}

/*-----------------------------------------------------------------------------
	Generate a log file of the event for lab/automated testing
-----------------------------------------------------------------------------*/
void CPagetestReporting::GenerateLabReport(bool fIncludeHeader, CString &szLogFile)
{
	includeObjectData_Now = includeObjectData;
	
	if( !runningScript || script_logData )
	{
		// see if there was a registry override for including the header
		if( includeHeader )
			fIncludeHeader = true;
		
		// go into a loop trying to open both files (in case they are in use by someone else)
		// need to hold onto a lock to both to make sure our data lines up
		CString szFile = szLogFile + "_IEWPG.txt";

		// make sure the directory exists
		TCHAR szDir[MAX_PATH];
		lstrcpy(szDir, (LPCTSTR)szFile);
		LPTSTR szFilePos = PathFindFileName(szDir);
		*szFilePos = 0;
		if( lstrlen(szDir) > 3 )
			SHCreateDirectoryEx(NULL, szDir, NULL);
			
		ATLTRACE(_T("[Pagetest] - ***** CPagetestReporting::FlushResults - Creating Log file '%s'\n"), (LPCTSTR)szFile);

		HANDLE hPageFile = INVALID_HANDLE_VALUE;
		do
		{
			hPageFile = CreateFile(szFile, GENERIC_READ | GENERIC_WRITE, 0, &nullDacl, OPEN_ALWAYS, 0, 0 );
			if( hPageFile == INVALID_HANDLE_VALUE )
				Sleep(10);
				
		}while( hPageFile == INVALID_HANDLE_VALUE );

		szFile = szLogFile + _T("_IEWTR.txt");

		// make sure the directory exists
		lstrcpy(szDir, (LPCTSTR)szFile);
		szFilePos = PathFindFileName(szDir);
		*szFilePos = 0;
		if( lstrlen(szDir) > 3 )
			SHCreateDirectoryEx(NULL, szDir, NULL);
			
		ATLTRACE(_T("[Pagetest] - ***** CPagetestReporting::FlushResults - Creating Log file '%s'\n"), (LPCTSTR)szFile);

		HANDLE hObjectFile = INVALID_HANDLE_VALUE;
		if( includeObjectData || (errorCode != 0 && errorCode != 99999) )
		{
			// force object data
			includeObjectData_Now = 1;
			
			do
			{
				hObjectFile = CreateFile(szFile, GENERIC_READ | GENERIC_WRITE, 0, &nullDacl, OPEN_ALWAYS, 0, 0 );
				if( hObjectFile == INVALID_HANDLE_VALUE )
					Sleep(10);
			}while( hObjectFile == INVALID_HANDLE_VALUE );
		}
		
		CString result;
		DWORD written = 0;
		
		ATLTRACE(_T("[Pagetest] - ***** CPagetestReporting::FlushResults - Writing page data\n"));

		// write out the page data
		if( hPageFile != INVALID_HANDLE_VALUE )
		{
			bool header = fIncludeHeader;
			if( SetFilePointer( hPageFile, 0, 0, FILE_END ) )
				header = false;
				
			ReportPageData(result, header);
			if( !result.IsEmpty() )
			{
				CT2A str((LPCTSTR)result, CP_UTF8);
				WriteFile( hPageFile, (LPCSTR)str, lstrlenA(str), &written, 0 );
			}
			
			CloseHandle( hPageFile );

			ATLTRACE(_T("[Pagetest] - ***** CPagetestReporting::FlushResults - Writing object data\n"));

			if( hObjectFile != INVALID_HANDLE_VALUE )
			{
				header = fIncludeHeader;
				if( SetFilePointer( hObjectFile, 0, 0, FILE_END ) )
					header = false;
				
				ReportObjectData(result, header);
				if( !result.IsEmpty() )
				{
					CT2A str((LPCTSTR)result, CP_UTF8);
					WriteFile( hObjectFile, (LPCSTR)str, lstrlenA(str), &written, 0 );
				}
			
				CloseHandle( hObjectFile );
			}
		}
		else
		{
			if( hPageFile != INVALID_HANDLE_VALUE )
				CloseHandle( hPageFile );
				
			if( hObjectFile != INVALID_HANDLE_VALUE )
				CloseHandle( hObjectFile );
		}
	}
}

/*-----------------------------------------------------------------------------
	Dump the page-level data into the supplied buffer
-----------------------------------------------------------------------------*/
void CPagetestReporting::ReportPageData(CString & buff, bool fIncludeHeader)
{
	buff.Empty();
	
	// page-level calculations
	DWORD msLoadDoc = endDoc < start ? 0 : (DWORD)((endDoc - start)/msFreq);
	DWORD msLoad = msLoadDoc;
	DWORD msActivity = lastRequest < start ? 0 : (DWORD)((lastRequest - start)/msFreq);
  msActivity = max(msActivity, msLoad);
	DWORD msTTFB = firstByte < start ? 0 : (DWORD)((firstByte - start)/msFreq);
	DWORD msStartRender = (DWORD)(tmStartRender * 1000.0);
	DWORD msDomElement = (DWORD)(tmDOMElement * 1000.0);
	DWORD msBasePage = (DWORD)(tmBasePage * 1000.0);
	DWORD msTitle = titleTime < start ? 0 : (DWORD)((titleTime - start)/msFreq);

  // count the DOM elements on the page
  DWORD domElements = 0;
  if( !browsers.IsEmpty() )
  {
    CBrowserTracker tracker = browsers.GetHead();
	  CComPtr<IDispatch> spDoc;
	  if( SUCCEEDED(tracker.browser->get_Document(&spDoc)) && spDoc )
    {
      CComQIPtr<IHTMLDocument2> doc = spDoc;
      if( doc )
        domElements = CountDOMElements(doc);
    }
  }

	CA2T ip(inet_ntoa(pageIP.sin_addr));
	
	// split up the url
	URL_COMPONENTS parts;
	memset(&parts, 0, sizeof(parts));
	TCHAR host[10000];
	memset(host, 0, sizeof(host));
	parts.lpszHostName = host;
	parts.dwHostNameLength = _countof(host);
	parts.dwStructSize = sizeof(parts);
	InternetCrackUrl((LPCTSTR)url, url.GetLength(), 0, &parts);
	
/*	if( reportSt == QUIT_NOEND )
	{
		msLoad = 0;
		msActivity = 0;
	}
*/	
	CString szDate = startTime.Format(_T("%m/%d/%Y"));
	CString szTime = startTime.Format(_T("%H:%M:%S"));

  // get the Page Speed version
  CString pageSpeedVersion;
  pagespeed::Version ver;
  pagespeed::GetPageSpeedVersion(&ver);
  if( ver.has_major() && ver.has_minor() )
    pageSpeedVersion.Format(_T("%d.%d"), ver.major(), ver.minor());
	
	if( fIncludeHeader )
	{
		buff = _T("Date\tTime\tEvent Name\tURL\t")
				_T("Load Time (ms)\tTime to First Byte (ms)\tunused\tBytes Out\tBytes In\tDNS Lookups\tConnections\t")
				_T("Requests\tOK Responses\tRedirects\tNot Modified\tNot Found\tOther Responses\t")
				_T("Error Code\tTime to Start Render (ms)\tSegments Transmitted\tSegments Retransmitted\tPacket Loss (out)\t")
				_T("Activity Time(ms)\tDescriptor\tLab ID\tDialer ID\tConnection Type\tCached\tEvent URL\tPagetest Build\t")
				_T("Measurement Type\tExperimental\tDoc Complete Time (ms)\tEvent GUID\tTime to DOM Element (ms)\tIncludes Object Data\t")
				_T("Cache Score\tStatic CDN Score\tOne CDN Score\tGZIP Score\tCookie Score\tKeep-Alive Score\tDOCTYPE Score\tMinify Score\tCombine Score\t")
				_T("Bytes Out (Doc)\tBytes In (Doc)\tDNS Lookups (Doc)\tConnections (Doc)\t")
				_T("Requests (Doc)\tOK Responses (Doc)\tRedirects (Doc)\tNot Modified (Doc)\tNot Found (Doc)\tOther Responses (Doc)\tCompression Score\t")
				_T("Host\tIP Address\tETag Score\tFlagged Requests\tFlagged Connections\tMax Simultaneous Flagged Connections\t")
				_T("Time to Base Page Complete (ms)\tBase Page Result\tGzip Total Bytes\tGzip Savings\tMinify Total Bytes\tMinify Savings\t")
        _T("Image Total Bytes\tImage Savings\tBase Page Redirects\tOptimization Checked\tAFT (ms)\tDOM Elements\tPage Speed Version\t")
				_T("Page Title\tTime to Title\tLoad Event Start\tLoad Event End\tDOM Content Ready Start\tDOM Content Ready End\tVisually Complete (ms)\r\n");
	}
	else
		buff.Empty();

	TCHAR result[10000];
	_stprintf_s(result, _countof(result), _T("%s\t%s\t%s\t%s\t")
										_T("%d\t%d\t%d\t%d\t%d\t%d\t%d\t")
										_T("%d\t%d\t%d\t%d\t%d\t%d\t")
										_T("%d\t%d\t%d\t%d\t%0.3f\t")
										_T("%d\t%s\t%d\t%d\t%d\t%d\t%s\t%d\t")
										_T("%d\t%d\t%d\t%s\t%d\t%d\t")
										_T("%d\t%d\t%d\t%d\t%d\t%d\t%d\t%d\t%d\t")
										_T("%d\t%d\t%d\t%d\t")
										_T("%d\t%d\t%d\t%d\t%d\t%d\t")
										_T("%d\t%s\t%s\t%d\t%d\t%d\t%d\t")
										_T("%d\t%d\t%d\t%d\t%d\t%d\t%d\t%d\t%d\t%d\t")
                    _T("%d\t%d\t%s\t%s\t%d\t0\t0\t0\t0\t%d")
										_T("\r\n"),
			(LPCTSTR)szDate, (LPCTSTR)szTime, (LPCTSTR)somEventName, (LPCTSTR)pageUrl,
			msLoad, msTTFB, 0, out, in, nDns, nConnect, 
			nRequest, nReq200, nReq302, nReq304, nReq404, nReqOther, 
			errorCode, msStartRender, tcpStats.dwOutSegs, tcpStats.dwRetransSegs, tcpRetrans,
			msActivity, descriptor, labID, dialerID, connectionType, cached, logUrl, build,
			measurementType, experimental, msLoadDoc, (LPCTSTR)guid, msDomElement, includeObjectData_Now ? 1 : 0, 
			cacheScore, staticCdnScore, oneCdnScore, gzipScore, cookieScore, keepAliveScore, doctypeScore, minifyScore, combineScore,
			out_doc, in_doc, nDns_doc, nConnect_doc, 
			nRequest_doc, nReq200_doc, nReq302_doc, nReq304_doc, nReq404_doc, nReqOther_doc,
			compressionScore, host, (LPCTSTR)ip, etagScore, flaggedRequests, totalFlagged, maxSimFlagged,
			msBasePage, basePageResult, gzipTotal, gzipTotal - gzipTarget, minifyTotal, minifyTotal - minifyTarget, compressTotal, compressTotal - compressTarget, basePageRedirects, checkOpt,
      msAFT, domElements, (LPCTSTR)pageSpeedVersion, (LPCTSTR)pageTitle, msTitle, msVisualComplete);
	buff += result;
}

/*-----------------------------------------------------------------------------
	Dump the object-level data into the supplied buffer
-----------------------------------------------------------------------------*/
void CPagetestReporting::ReportObjectData(CString & buff, bool fIncludeHeader)
{
	buff.Empty();
	
	if( includeObjectData_Now )
	{
		// page-level calculations (included as the first row in the object data)
		DWORD msLoadDoc = endDoc < start ? 0 : (DWORD)((endDoc - start)/msFreq);
		DWORD msLoad = msLoadDoc;
		DWORD msActivity = lastRequest < start ? 0 : (DWORD)((lastRequest - start)/msFreq);
    msActivity = max(msActivity, msLoad);
		DWORD msTTFB = firstByte < start ? 0 : (DWORD)((firstByte - start)/msFreq);
		DWORD msStartRender = (DWORD)(tmStartRender * 1000.0);
		DWORD sequence = 0;
		
		CA2T ip(inet_ntoa(pageIP.sin_addr));

		if( reportSt == QUIT_NOEND )
		{
			msLoad = 0;
			msActivity = 0;
		}
		
		CString szDate = startTime.Format(_T("%m/%d/%Y"));
		CString szTime = startTime.Format(_T("%H:%M:%S"));
		CString result;
		
		if( fIncludeHeader )
		{
			buff = _T("Date\tTime\tEvent Name\t")
					_T("IP Address\tAction\tHost\tURL\t")
					_T("Response Code\tTime to Load (ms)\tTime to First Byte (ms)\tStart Time (ms)\tBytes Out\tBytes In\t")
					_T("Object Size\tCookie Size (out)\tCookie Count(out)\tExpires\tCache Control\tContent Type\tContent Encoding\tTransaction Type\tSocket ID\tDocument ID\tEnd Time (ms)\t")
					_T("Descriptor\tLab ID\tDialer ID\tConnection Type\tCached\tEvent URL\tPagetest Build\t")
					_T("Measurement Type\tExperimental\tEvent GUID\tSequence Number\t")
					_T("Cache Score\tStatic CDN Score\tGZIP Score\tCookie Score\tKeep-Alive Score\tDOCTYPE Score\tMinify Score\tCombine Score\tCompression Score\tETag Score\tFlagged\t")
					_T("Secure\tDNS Time\tConnect Time\tSSL Time\tGzip Total Bytes\tGzip Savings\tMinify Total Bytes\tMinify Savings\tImage Total Bytes\tImage Savings\tCache Time (sec)")
					_T("\tReal Start Time (ms)\tFull Time to Load (ms)\tOptimization Checked\tCDN Provider")
					_T("\r\n");
		}
		else
			buff.Empty();
			
		// page-level data
		result.Format(	_T("%s\t%s\t%s\t")
						_T("%s\t%s\t%s\t%s\t")
						_T("%d\t%d\t%d\t%d\t%d\t%d\t")
						_T("%d\t%d\t%d\t%s\t%s\t%s\t%s\t%d\t%d\t%d\t%d\t")
						_T("%s\t%d\t%d\t%d\t%d\t%s\t%d\t")
						_T("%d\t%d\t%s\t%d\t")
						_T("%d\t%d\t%d\t%d\t%d\t")
						_T("%d\t%d\t%d\t%d\t%d\t%d\t")
						_T("%d\t%s\t%s\t%s")
						_T("\t%d\t%d\t%d\t%d\t%d\t%d\t%s\t%d\t%s")
						_T("\r\n"),
				(LPCTSTR)szDate, (LPCTSTR)szTime, (LPCTSTR)somEventName, 
				(LPCTSTR)ip, _T(""), _T(""), (LPCTSTR)pageUrl,
				errorCode, msLoad, msTTFB, msStartRender, out, in,
				0, 0, 0, _T(""), _T(""), _T(""), _T(""), CTrackedEvent::etPage, 0, 0, msLoadDoc,
				descriptor, labID, dialerID, connectionType, cached, logUrl, build,
				measurementType, experimental, (LPCTSTR)guid, sequence++,
				cacheScore, staticCdnScore, gzipScore, cookieScore, keepAliveScore, 
				doctypeScore, minifyScore, combineScore, compressionScore, etagScore, flaggedRequests,
				0, _T(""), _T(""), _T(""),
				gzipTotal, gzipTotal - gzipTarget, minifyTotal, minifyTotal - minifyTarget, 
        compressTotal, compressTotal - compressTarget, _T(""), checkOpt, _T("") );
		buff += result;

		// loop through all of the requests on the page
		POSITION pos = events.GetHeadPosition();
		while( pos )
		{
			CTrackedEvent * event = events.GetNext(pos);
			if( event )
			{
				DWORD msOffset;
				DWORD msEndOffset;
				result.Empty();
				CWinInetRequest * w = (CWinInetRequest *)event;

				if( event->type == CTrackedEvent::etWinInetRequest && w->valid )
				{
					CA2T ip(inet_ntoa(w->peer.sin_addr));

					// values that need null/blank defaults instead of -1
					CString tmDns;
					if( (int)w->tmDNS >= 0 )
						tmDns.Format(_T("%d"), w->tmDNS );
					CString tmSocket;
					if( (int)w->tmSocket >= 0 )
						tmSocket.Format(_T("%d"), w->tmSocket );
					CString tmSSL;
					if( (int)w->tmSSL >= 0 )
						tmSSL.Format(_T("%d"), w->tmSSL );
					
					// calculate the times as milliseconds
					msLoad = w->tmRequest + w->tmDownload;
					if( w->requestSent )
						msOffset = w->requestSent < start ? 0 : (DWORD)((w->requestSent - start)/msFreq);
					else
					{
						msOffset = w->start < start ? 0 : (DWORD)((w->start - start)/msFreq);
						msOffset += w->tmDNS + w->tmSocket + w->tmSSL;
					}
					msEndOffset = msLoad + msOffset;
					msTTFB = w->tmRequest;
					DWORD msFullLoad = w->end < w->start ? 0 : (DWORD)((w->end - w->start)/msFreq);
					DWORD msRealOffset = w->start < start ? 0 : (DWORD)((w->start - start)/msFreq);
					
					int contentLen = w->in - w->inHeaders.GetLength();
					
					// values that need null/blank defaults instead of -1
					CString ttl;
					if( (int)w->ttl != -1 )
						ttl.Format(_T("%d"), w->ttl);

					DWORD reqType = CTrackedEvent::etSocketRequest;
					if( !w->fromNet )
						reqType = CTrackedEvent::etCachedRequest;
					
					result.Format(	_T("%s\t%s\t%s\t%s\t")
									_T("%s\t%s\t%s\t")
									_T("%d\t%d\t%d\t%d\t%d\t%d\t")
									_T("%d\t%d\t%d\t")
									_T("%s\t%s\t")
									_T("%s\t%s\t")
									_T("%d\t%d\t%d\t%d\t")
									_T("%s\t%d\t%d\t%d\t%d\t%s\t%d\t")
									_T("%d\t%d\t%s\t%d\t")
									_T("%d\t%d\t%d\t%d\t%d\t")
									_T("%d\t%d\t%d\t%d\t%d\t%d\t")
									_T("%d\t%s\t%s\t%s")
									_T("\t%d\t%d\t%d\t%d\t%d\t%d\t%s")
									_T("\t%d\t%d\t%d\t%s")
									_T("\r\n"),
							(LPCTSTR)szDate, (LPCTSTR)szTime, (LPCTSTR)somEventName, (LPTSTR)ip, 
							(LPCTSTR)w->verb, (LPCTSTR)w->host, (LPCTSTR)w->object,
							w->result, msLoad, msTTFB, msOffset, w->out, w->in,
							contentLen, w->request.cookieSize, w->request.cookieCount,
							(LPCTSTR)w->response.expires, (LPCTSTR)w->response.cacheControl,
							(LPCTSTR)w->response.contentType, (LPCTSTR)w->response.contentEncoding, 
							reqType, w->socketId, w->docID, msEndOffset,
							descriptor, labID, dialerID, connectionType, cached, logUrl, build,
							measurementType, experimental, (LPCTSTR)guid, sequence++,
							w->cacheScore, w->staticCdnScore, w->gzipScore, w->cookieScore, w->keepAliveScore, 
							w->doctypeScore, w->minifyScore, w->combineScore, w->compressionScore, w->etagScore, w->flagged?1:0,
							w->secure, (LPCTSTR)tmDns, (LPCTSTR)tmSocket, (LPCTSTR)tmSSL,
							w->gzipTotal, w->gzipTotal - w->gzipTarget, w->minifyTotal, w->minifyTotal - w->minifyTarget, w->compressTotal, w->compressTotal - w->compressTarget, (LPCTSTR)ttl,
              msRealOffset, msFullLoad, checkOpt, (LPCTSTR)w->cdnProvider );
					buff += result;
				}
			}
		}
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CString	CPagetestReporting::GenerateSummaryStats(void)
{
	CString szBuff;
	CString szReport;

	// dump out summary results
	szBuff.Format(_T("Results for '%s':\n\n"), (LPCTSTR)url);
	szReport += szBuff;
	if(errorCode)
	{
		szBuff.Format(_T("Error loading page: %d (0x%08X)\n"), errorCode, errorCode);
		szReport += szBuff;
	}
	szBuff.Format(_T("Page load time: %0.3f seconds\n"), tmLoad);
	szReport += szBuff;
	szBuff.Format(_T("Time to first byte: %0.3f seconds\n"), tmFirstByte);
	szReport += szBuff;
	if( tmBasePage > 0.0 )
	{
		szBuff.Format(_T("Time to Base Page Downloaded: %0.3f seconds\n"), tmBasePage);
		szReport += szBuff;
	}
	szBuff.Format(_T("Time to Start Render: %0.3f seconds\n"), tmStartRender);
	szReport += szBuff;
	if( !domElementId.IsEmpty() )
	{
		szBuff.Format(_T("Time to DOM Element(%s): %0.3f seconds\n"), (LPCTSTR)domElementId, tmDOMElement);
		szReport += szBuff;
	}
	szBuff.Format(_T("Time to Document Complete: %0.3f seconds\n"), tmDoc);
	szReport += szBuff;
	szBuff.Format(_T("Time to Fully Loaded: %0.3f seconds\n"), tmActivity);
	szReport += szBuff;
	szBuff.Format(_T("Bytes sent out: %0.3f KB\n"), (double)out / 1024.0);
	szReport += szBuff;
	szBuff.Format(_T("Bytes received: %0.3f KB\n"), (double)in / 1024.0);
	szReport += szBuff;
	szBuff.Format(_T("DNS Lookups: %d\n"), nDns);
	szReport += szBuff;
	szBuff.Format(_T("Connections: %d\n"), nConnect);
	szReport += szBuff;
	szBuff.Format(_T("Requests: %d\n"), nRequest);
	szReport += szBuff;
	szBuff.Format(_T("   OK Requests:  %d\n"), nReq200);
	szReport += szBuff;
	szBuff.Format(_T("   Redirects:    %d\n"), nReq302);
	szReport += szBuff;
	szBuff.Format(_T("   Not Modified: %d\n"), nReq304);
	szReport += szBuff;
	szBuff.Format(_T("   Not Found:    %d\n"), nReq404);
	szReport += szBuff;
	if( nReqOther )
	{
		szBuff.Format(_T("   Other:        %d ("), nReqOther);
		szReport += szBuff;
		
		POSITION pos = otherResponseCodes.GetHeadPosition();
		while( pos )
		{
			DWORD code = otherResponseCodes.GetNext(pos);
			szBuff.Format(_T("%d"), code);
			if( pos )
				szBuff += _T(", ");
			szReport += szBuff;
		}
		
		szReport += _T(")\n");
	}
	else
	{
		szBuff.Format(_T("   Other:        %d\n"), nReqOther);
		szReport += szBuff;
	}
	if( basePageResult != -1 )
	{
		szBuff.Format(_T("Base Page Response: %d\n"), basePageResult);
		szReport += szBuff;
	}
	if( basePageRedirects )
	{
		szBuff.Format(_T("Base Page Redirects: %d\n"), basePageRedirects);
		szReport += szBuff;
	}
	szReport += _T("\n");
	
	return szReport;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CPagetestReporting::GenerateReport(CString &szReport)
{
	CString szBuff;
	
	szReport.Empty();

	// start out with the summary stats	
	szReport = GenerateSummaryStats();
	
	DWORD count;
	POSITION pos;
	
	if( !blockedRequests.IsEmpty() )
	{
		szReport += _T("\nBlocked Requests:\n");
		pos = blockedRequests.GetHeadPosition();
		while( pos )
		{
			CString request = blockedRequests.GetNext(pos);
			if( request.GetLength() )
				szReport += request + _T("\n");
		}
		szReport += _T("\n");
	}

	if( !blockedAdRequests.IsEmpty() )
	{
		szReport += _T("\nBlocked Ad Requests:\n");
		pos = blockedAdRequests.GetHeadPosition();
		while( pos )
		{
			CString request = blockedAdRequests.GetNext(pos);
			if( request.GetLength() )
				szReport += request + _T("\n");
		}
		szReport += _T("\n");
	}

	// dump the individual requests
	szReport += _T("\nRequest details:\n\n");
	count = 0;
	pos = events.GetHeadPosition();
	while( pos )
	{
		CTrackedEvent * event = events.GetNext(pos);
		if( event && event->type == CTrackedEvent::etWinInetRequest )
		{
			CWinInetRequest * r = (CWinInetRequest *)event;
			if( r->valid && r->fromNet )
			{
				count++;
				szBuff.Format(_T("Request %d:\n"), count);
				szReport += szBuff;
				
				ReportRequest( szBuff, r );
				szReport += szBuff;

				szReport += _T("\n");
			}
		}
	}

	szReport.Replace(_T("\n"), _T("\r\n"));
}

/*-----------------------------------------------------------------------------
	Generate the detailled report for a single request
-----------------------------------------------------------------------------*/
void CPagetestReporting::SaveBodies(CString file)
{
	zipFile zip = zipOpen(CT2A(file), APPEND_STATUS_CREATE);
	if( zip )
	{
	  DWORD count = 0;
    DWORD bodiesCount = 0;
	  POSITION pos = events.GetHeadPosition();
	  while( pos )
	  {
		  CTrackedEvent * event = events.GetNext(pos);
		  if( event && event->type == CTrackedEvent::etWinInetRequest )
		  {
			  CWinInetRequest * r = (CWinInetRequest *)event;
			  CString mime = r->response.contentType;
			  mime.MakeLower();
        if( r->valid && r->fromNet )
        {
				  count++;
          if(r->result == 200 && r->body && r->bodyLen &&
             (mime.Find(_T("text/")) >= 0 || mime.Find(_T("javascript")) >= 0 || mime.Find(_T("json")) >= 0) )
			    {
            CStringA name;
            name.Format("%03d-response.txt", count);
						// add the file to the archive
						if( !zipOpenNewFileInZip( zip, name, 0, 0, 0, 0, 0, 0, Z_DEFLATED, Z_BEST_COMPRESSION ) )
						{
							// write the file to the archive
              zipWriteInFileInZip( zip, r->body, r->bodyLen );
							zipCloseFileInZip( zip );
              bodiesCount++;
						}
          }
        }
		  }
	  }
		zipClose(zip, 0);
    if(!bodiesCount)
      DeleteFile(file);
  }
}

/*-----------------------------------------------------------------------------
	Generate the detailled report for a single request
-----------------------------------------------------------------------------*/
void CPagetestReporting::ReportRequest(CString & szReport, CWinInetRequest * r)
{
	szReport.Empty();
	
	if( r )
	{
		CString szBuff;
		
		szBuff.Format(_T("      Action: %s\n"), (LPCTSTR)r->verb );
		szReport += szBuff;
		szBuff.Format(_T("      Url: %s\n"), (LPCTSTR)(r->scheme + CString(_T("//")) + r->host + r->object) );
		szReport += szBuff;
		szBuff.Format(_T("      Host: %s\n"), (LPCTSTR)r->host );
		szReport += szBuff;
		szBuff.Format(_T("      Result code: %d\n"), r->result );
		szReport += szBuff;
		szBuff.Format(_T("      Transaction time: %0.3f seconds\n"), r->elapsed );
		szReport += szBuff;
		szBuff.Format(_T("      Time to first byte: %0.3f seconds\n"), (double)r->tmRequest / 1000.0 );
		szReport += szBuff;
		szBuff.Format(_T("      Document: %d\n"), r->docID );
		szReport += szBuff;
		szBuff.Format(_T("      Socket: %d\n"), r->socketId );
		szReport += szBuff;
		szBuff.Format(_T("      Request size (out): %d Bytes\n"), r->out );
		szReport += szBuff;
		szBuff.Format(_T("      Response size (in): %d Bytes\n"), r->in );
		szReport += szBuff;

		szBuff.Format(_T("      Request Object Size (out): %d Bytes\n"), r->out - r->outHeaders.GetLength() );
		szReport += szBuff;
		szBuff.Format(_T("      Response Object Size (in): %d Bytes\n"), r->in - r->inHeaders.GetLength() );
		szReport += szBuff;
		szBuff.Format(_T("      Response Object Size (bodylen): %d Bytes\n"), r->bodyLen );
		szReport += szBuff;

		szReport +=   _T("  Request Headers:\n");
		int pos = 0;
		while( pos >= 0 )
		{
			CString line = r->outHeaders.Tokenize(_T("\r\n"), pos);
			line.Trim();
			if( line.GetLength() )
				szReport += CString(_T("      ")) + line + _T("\n");
		}

		szReport += _T("  Response Headers:\n");
		
		pos = 0;
		while( pos >= 0 )
		{
			CString line = r->inHeaders.Tokenize(_T("\r\n"), pos);
			line.Trim();
			if( line.GetLength() )
				szReport += CString(_T("      ")) + line + _T("\n");
		}

		if ( !r->cachedInHeaders.IsEmpty() ) 
		{
			szReport += _T("  Cached Response Headers:\n");

			pos = 0;
			while( pos >= 0 )
			{
				CString line = r->cachedInHeaders.Tokenize(_T("\r\n"), pos);
				line.Trim();
				if( line.GetLength() )
					szReport += CString(_T("      ")) + line + _T("\n");
			}
		}
	}
}

/*-----------------------------------------------------------------------------
	Generate a base64 encoded GUID to use for the current report item
-----------------------------------------------------------------------------*/
void CPagetestReporting::GenerateGUID(void)
{
	guid.Empty();
	
	GUID guidVal;
	if( SUCCEEDED(CoCreateGuid(&guidVal)) )
	{
		char buff[100];
		memset(buff,0,sizeof(buff));
		int len = _countof(buff);
		if( Base64Encode((LPBYTE)&guidVal, sizeof(guidVal), buff, &len, ATL_BASE64_FLAG_NOPAD | ATL_BASE64_FLAG_NOCRLF) )
		{
			guid = buff;
		}
	}
}

/*-----------------------------------------------------------------------------
	Wrap the pagespeed check in an exception filter just in case something
	goes horribly wrong
-----------------------------------------------------------------------------*/
void CPagetestReporting::ProtectedCheckPageSpeed()
{
	__try{
		CheckPageSpeed();
	}__except(1){}
}

/*-----------------------------------------------------------------------------
	Check the various optimization rules to see how the page did
-----------------------------------------------------------------------------*/
void CPagetestReporting::CheckOptimization(void)
{
	if( checkOpt )
	{
		// spawn some background threads to do the DNS lookups for the CDN checks so we
		// can have those going on while we do the CPU-intensive checks
		StartCDNLookups();

		CheckKeepAlive();
		CheckGzip();
		CheckImageCompression();
		CheckCache();
		CheckCombine();
		CheckCDN();
		CheckMinify();
		CheckCookie();
		CheckEtags();

		// Run all Page Speed checks.
		// This is the entry point that invokes the Page Speed engine.
		// only run them if we are running in one-off mode
		if( saveEverything )
			ProtectedCheckPageSpeed();

		RepaintWaterfall();
	}
}

/*-----------------------------------------------------------------------------
	Helper method that extracts the next HTTP header, and advances 
	inout_headerPos to the index of the start of the next HTTP header.
-----------------------------------------------------------------------------*/
bool GetNextHttpHeader(const CString& headers, int* inout_headerPos, CString* out_tag, CString* out_value) 
{
	CString line = headers.Tokenize(_T("\r\n"), *inout_headerPos);
	line = line.Trim();
	if( *inout_headerPos < 0 )
	{
		return false;
	}

	int separator = line.Find(_T(':'));
	if( separator <= 0 )
	{
		return false;
	}

	*out_tag = line.Left(separator).Trim();
	*out_value = line.Mid(separator + 1).Trim();
	return !out_tag->IsEmpty();
}

// We attempt to approximate the HTTP date of the response
// by looking at the last sync time of the cache entry. This should be a
// reasonable approximation of the HTTP date in cases where the response was 
// served from the origin server, but not necessarily in cases where the 
// response was served by an intermediate proxy that preserved the original 
// Date header. Still, this is better than using the current time.
CString SynthesizeDateHeaderForResource(const CString& url)
{
	CString retVal;

	// Remove the fragment from the URL, if any. GetUrlCacheEntryInfo does not
	// remove fragments on its own, and will fail if they are present.
	CString obUrlNoFragment = url;
	int fragmentIndex = obUrlNoFragment.Find('#');
	if (fragmentIndex > 0)
	{
		obUrlNoFragment = obUrlNoFragment.Left(fragmentIndex);
	}

	LPINTERNET_CACHE_ENTRY_INFO info = NULL;
	DWORD infoLen = 0;
	// Call GetUrlCacheEntryInfo with a zero-length buffer. We expect it to fail
	// with ERROR_INSUFFICIENT_BUFFER, but this lets us discover the required
	// buffer size so we can allocate a buffer and call it again.
	if (!GetUrlCacheEntryInfo(obUrlNoFragment, info, &infoLen))
	{
		if (ERROR_INSUFFICIENT_BUFFER == GetLastError()) 
		{
			info = static_cast<LPINTERNET_CACHE_ENTRY_INFO>(malloc(infoLen));
			memset(info, 0, infoLen);
			if (GetUrlCacheEntryInfo(obUrlNoFragment, info, &infoLen))
			{
				SYSTEMTIME lastSyncSystemTime;
				if (FileTimeToSystemTime(&info->LastSyncTime, &lastSyncSystemTime))
				{
					// Need to reserve the buffer size + 1 (for NULL character).
					const DWORD bufSize = (INTERNET_RFC1123_BUFSIZE + 1) * sizeof(TCHAR);
					TCHAR* buf = static_cast<TCHAR*>(malloc(bufSize));
					memset(buf, 0, bufSize);
					retVal;
					if (InternetTimeFromSystemTime(&lastSyncSystemTime, INTERNET_RFC1123_FORMAT, buf, bufSize))
					{
						retVal = buf;
					}
					free(buf);
				}
			}
			free(info);
		}
	}
	return retVal;
}

/*-----------------------------------------------------------------------------
	Copy the necessary data about resources (i.e. headers, response bodies,
	etc) into the PagespeedInput structure.
-----------------------------------------------------------------------------*/
void CPagetestReporting::PopulatePageSpeedInput(pagespeed::PagespeedInput* input)
{
	ATLTRACE(_T("[Pagetest] - PopulatePageSpeedInput\n"));

	POSITION pos = events.GetHeadPosition();
	while( pos )
	{
		CTrackedEvent * e = events.GetNext(pos);
		// TODO: should we skip e->ignore responses? 
		if( e && e->type == CTrackedEvent::etWinInetRequest )
		{
			CWinInetRequest * w = (CWinInetRequest *)e;
			pagespeed::Resource* resource = new pagespeed::Resource();
			const std::string response_body(reinterpret_cast<char*>(w->body), w->bodyLen);
			resource->SetResponseBody(response_body);

			if ( w->start > 0 )
			{
				int startMillis = (int)((w->start - start)/msFreq);
				resource->SetRequestStartTimeMillis(startMillis);
			}

			resource->SetRequestMethod(static_cast<LPSTR>(CT2CA(w->verb)));
			// NOTE: the scheme sometimes includes a colon, which we trim.
			CString obUrl = w->scheme;
			obUrl.TrimRight(':');
			obUrl += _T("://") + w->host + w->object;
			resource->SetRequestUrl(static_cast<LPSTR>(CT2CA(obUrl)));
			resource->SetResponseStatusCode(w->result);

			// Populate HTTP request headers.
			int headerPos = 0;
			CString key, value;
			// Skip the first header line (e.g. GET /foo HTTP/1.1).
			w->outHeaders.Tokenize(_T("\r\n"), headerPos);
			if (headerPos >= 0) 
			{
				while (GetNextHttpHeader(w->outHeaders, &headerPos, &key, &value)) 
				{
					resource->AddRequestHeader(
						static_cast<LPSTR>(CT2CA(key)),
						static_cast<LPSTR>(CT2CA(value)));
				}
			}

			// Populate HTTP response headers.
			headerPos = 0;
			// Skip the first header line (e.g. HTTP/1.1 200 OK).
			w->inHeaders.Tokenize(_T("\r\n"), headerPos);
			if (headerPos >= 0) 
			{
				while (GetNextHttpHeader(w->inHeaders, &headerPos, &key, &value)) 
				{
					resource->AddResponseHeader(
						static_cast<LPSTR>(CT2CA(key)),
						static_cast<LPSTR>(CT2CA(value)));
				}
			}

      // fake a gzip header for secure resources so page speed doesn't ding them
      // wininet removes this header so we can't see it
      if (w->secure)
					resource->AddResponseHeader("Content-Encoding", "gzip");

			// Next, merge the cached response headers from wininet.
			//
			// Note that by default wininet removes certain headers. See 
            // http://code.google.com/p/page-speed/issues/detail?id=321 for
			// information on how this impacts Page Speed.

			headerPos = 0;
			// Skip the first header line (e.g. HTTP/1.1 200 OK).
			w->cachedInHeaders.Tokenize(_T("\r\n"), headerPos);
			if (headerPos >= 0) 
			{
				while (GetNextHttpHeader(w->cachedInHeaders, &headerPos, &key, &value)) 
				{
					// Only add a cached header if it wasn't already present in the network
					// headers.
					// See http://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html#sec13.5.3 
					// for additional information about merging response headers.
					if (resource->GetResponseHeader(static_cast<LPSTR>(CT2CA(key))).empty()) {
						resource->AddResponseHeader(
							static_cast<LPSTR>(CT2CA(key)),
							static_cast<LPSTR>(CT2CA(value)));
					}
				}
			}

			// Check to see if the response includes a Date header. Responses 
			// served from the wininet cache have their Date header removed. Since
			// Page Speed wants to compute freshness lifetimes of resources, it needs
			// a Date header.
			if (resource->GetResponseHeader("Date").empty())
			{
				CString dateStr = SynthesizeDateHeaderForResource(obUrl);
				if (!dateStr.IsEmpty())
				{
					resource->AddResponseHeader("Date", static_cast<LPSTR>(CT2CA(dateStr)));
				}
			}
			if (input->AddResource(resource)) {
				if (w->basePage)
					input->SetPrimaryResourceUrl(resource->GetRequestUrl());
			}
		}
	}

	if (endDoc > 0) {
		if (endDoc > start) {
			input->SetOnloadTimeMillis((int)((endDoc - start)/msFreq));
		}
	} else {
		// Onload didn't fire yet.
		input->SetOnloadState(pagespeed::PagespeedInput::ONLOAD_NOT_YET_FIRED);
	}

	pos = browsers.GetHeadPosition();
	while( pos )
	{
		CBrowserTracker tracker = browsers.GetNext(pos);
		if( tracker.threadId == GetCurrentThreadId() && tracker.browser )
		{
			CComPtr<IDispatch> spDoc;
			if( SUCCEEDED(tracker.browser->get_Document(&spDoc)) && spDoc )
			{
				CComQIPtr<IHTMLDocument3> doc = spDoc;
				if ( doc )
				{
					pagespeed::DomDocument* psDoc = pagespeed::ie::CreateDocument(doc);
					if ( psDoc ) 
					{
						input->AcquireDomDocument(psDoc);
						break;
					}
				}
			}
		}
	}

	ATLTRACE(_T("[Pagetest] - CPagetestReporting::PopulatePageSpeedInput - complete\n"));
}

/*-----------------------------------------------------------------------------
	Run Page Speed checks
-----------------------------------------------------------------------------*/
void CPagetestReporting::CheckPageSpeed()
{
	ATLTRACE(_T("[Pagetest] - CheckPageSpeed\n"));

	// Instantiate an AtExitManager, which is required by some of the
	// internals of the Page Speed ruleset.
	if ( pagespeedResults != NULL ) 
	{
		delete pagespeedResults;
	}
	pagespeedResults = new pagespeed::Results();

	// TODO(bmcquade): we should only do this once, and should ShutDown on exit.
	// Ask Pat if there is a hook that gets invoked just once at startup.
	static bool didInit = false;
	if (!didInit) {
		didInit = true;
    #ifndef DEBUG
    logging::SetMinLogLevel(logging::LOG_NUM_SEVERITIES);
    #endif
		pagespeed::Init();
	}

	std::vector<pagespeed::Rule*> rules;
	PopulatePageSpeedRules(&rules);

	// Ownership of rules is transferred to the Engine instance.
	pagespeed::Engine engine(&rules);
	engine.Init();

	pagespeed::PagespeedInput input;
	PopulatePageSpeedInput(&input);
	input.AcquireImageAttributesFactory(
		new pagespeed::image_compression::ImageAttributesFactory());
	input.Freeze();

	// NOTE: ComputeResults may return false in cases where it successfully
	// computed results (e.g. the engine attempted to optimize an invalid
	// image response). Thus we need to ignore the return value. Future
	// versions of Page Speed will return false on actual failures, at
	// which point we should start looking at the return value.
	engine.ComputeResults(input, pagespeedResults);

	// Generate a plaintext version of the results to include with the text
	// optimization report (appended to buff).
	pagespeed::l10n::BasicLocalizer localizer;
	pagespeed::FormattedResults formatted_results;
	formatted_results.set_locale(localizer.GetLocale());
	pagespeed::formatters::ProtoFormatter formatter(&localizer, &formatted_results);
	if ( engine.FormatResults(*pagespeedResults, &formatter) )
	{
		std::string pagespeedReport;
		pagespeed::proto::FormattedResultsToTextConverter::Convert(formatted_results, &pagespeedReport);
	}

	ATLTRACE(_T("[Pagetest] - CheckPageSpeed complete\n"));
}

/*-----------------------------------------------------------------------------
	Check each text element to make sure it was gzip encoded
-----------------------------------------------------------------------------*/
void CPagetestReporting::CheckGzip()
{
	gzipScore = -1;
	int count = 0;
	int total = 0;
	DWORD totalBytes = 0;
	DWORD targetBytes = 0;
	
	ATLTRACE(_T("[Pagetest] - CheckGzip\n"));
	
	POSITION pos = events.GetHeadPosition();
	while( pos )
	{
		CTrackedEvent * e = events.GetNext(pos);
		if( e && e->type == CTrackedEvent::etWinInetRequest && !e->ignore )
		{
			CWinInetRequest * w = (CWinInetRequest *)e;
			CString mime = w->response.contentType;
			mime.MakeLower();
			if( w->result == 200
				&& (mime.Find(_T("text/")) >= 0 || mime.Find(_T("javascript")) >= 0 || mime.Find(_T("json")) >= 0) 
				&& mime.Find(_T("xml")) == -1 
				&& w->linkedRequest
				&& w->fromNet
				&& !w->secure )
			{
				CString enc = w->response.contentEncoding;
				enc.MakeLower();
				w->gzipScore = 0;
				totalBytes += w->in;
				DWORD target = w->in;
				
				if( enc.Find(_T("gzip")) >= 0 || enc.Find(_T("deflate")) >= 0 )
					w->gzipScore = 100;
				else if( w->in < 1400 )	// if it's less than 1 packet anyway, give it a pass
					w->gzipScore = 100;

				if( !w->gzipScore )
				{
					LPBYTE body = w->body;
					DWORD bodyLen = w->bodyLen;
					
					// try gzipping the item to see how much smaller it will be
					DWORD origSize = w->in;
					DWORD origLen = bodyLen;
					DWORD headSize = w->inHeaders.GetLength();
					if( origLen && body )
					{
						DWORD len = compressBound(origLen);
						if( len )
						{
							LPBYTE buff = (LPBYTE)malloc(len);
							if( buff )
							{
								if( compress2(buff, &len, body, origLen, 9) == Z_OK )
									target = len + headSize;
								
								free(buff);
							}
						}
						
						if( target < origSize )
							w->warning = true;
						else
						{
							target = origSize;
							w->gzipScore = 100;
						}
					}
				}

				w->gzipTotal = w->in;
				w->gzipTarget = target;
				
				targetBytes += target;
					
				if( w->gzipScore != -1 )
				{
					count++;
					total += w->gzipScore;
				}
			}
		}
	}

	gzipTotal = totalBytes;
	gzipTarget = targetBytes;
	
	// average the gzip scores of all of the objects for the page
	if( count && totalBytes )
		gzipScore = targetBytes * 100 / totalBytes;
}


/*-----------------------------------------------------------------------------
	Make sure any host that served more than one asset used keep-alives
-----------------------------------------------------------------------------*/
void CPagetestReporting::CheckKeepAlive()
{
	keepAliveScore = -1;
	int count = 0;
	int total = 0;
	
	ATLTRACE(_T("[Pagetest] - CheckKeepAlive\n"));
	
	POSITION pos = events.GetHeadPosition();
	while( pos )
	{
		CTrackedEvent * e = events.GetNext(pos);
		if( e && e->type == CTrackedEvent::etWinInetRequest && !e->ignore )
		{
			CWinInetRequest * w = (CWinInetRequest *)e;
			if( w->result == 200 && w->fromNet )
			{
				w->keepAliveScore = 0;

				CString conn = w->response.connection;
				conn.MakeLower();
				if( conn.Find(_T("keep-alive")) > -1 )
					w->keepAliveScore = 100;
				else
				{
					// see if there were any other requests from the same host
					CString host = w->host;
					bool needed = false;
					bool reused = false;
					
					POSITION pos2 = events.GetHeadPosition();
					while( pos2 )
					{
						CTrackedEvent * e2 = events.GetNext(pos2);
						if( e2 && e != e2 && e2->type == CTrackedEvent::etWinInetRequest && !e2->ignore )
						{
							CWinInetRequest * w2 = (CWinInetRequest *)e2;
							if( !w2->host.CompareNoCase(host) )
							{
								needed = true;
								if( w2->socketId == w->socketId )
									reused = true;
							}
						}
					}
					
					if( reused )
						w->keepAliveScore = 100;
					else if( needed )
					{
						// HTTP 1.1 defaults to keep-alive
						if( conn.Find(_T("close")) > -1 || w->response.ver < 1.1 )
							w->keepAliveScore = 0;
						else
							w->keepAliveScore = 100;
					}
					else
						w->keepAliveScore = -1;
				}

				if( !w->keepAliveScore )
					w->warning = true;

				if( w->keepAliveScore != -1 )
				{
					count++;
					total += w->keepAliveScore;
				}
			}
		}
	}

	// average the keep alive scores of all of the objects for the page
	if( count )
		keepAliveScore = total / count;
}

/*-----------------------------------------------------------------------------
	Make sure all static content is served from a CDN 
	and that only one CDN is used for all content
-----------------------------------------------------------------------------*/
void CPagetestReporting::CheckCDN()
{
	staticCdnScore = -1;
	oneCdnScore = -1;
	DWORD count = 0;
	int total = 0;
	CAtlArray<CString> cdnList;
	
	ATLTRACE(_T("[Pagetest] - CheckCDN\n"));

	// wait for the parallel lookup threads to complete
	count = hCDNThreads.GetCount();
	if( count )
	{
		WaitForMultipleObjects(count, hCDNThreads.GetData(), TRUE, INFINITE);
		for( DWORD i = 0; i < count; i++ )
			if( hCDNThreads[i] )
				CloseHandle(hCDNThreads[i]);

		hCDNThreads.RemoveAll();
	}
	
	// do the actual evaluation (all the host names should be looked up by now)
	count = 0;
	POSITION pos = events.GetHeadPosition();
	while( pos )
	{
		CTrackedEvent * e = events.GetNext(pos);
		if( e && e->type == CTrackedEvent::etWinInetRequest && !e->ignore )
		{
			CWinInetRequest * w = (CWinInetRequest *)e;
			CString mime = w->response.contentType;
			mime.MakeLower();
			CString exp = w->response.expires;
			exp.Trim();
			CString cache = w->response.cacheControl;
			cache.MakeLower();
			CString pragma = w->response.pragma;
			pragma.MakeLower();
			CString object = w->object;
			object.MakeLower();
			if( w->result == 200 &&
				w->fromNet &&
				exp != _T("0") && 
				exp != _T("-1") && 
				!(cache.Find(_T("no-store")) > -1) &&
				!(cache.Find(_T("no-cache")) > -1) &&
				!(pragma.Find(_T("no-cache")) > -1) &&
				!(mime.Find(_T("/html")) > -1)	&&
				!(mime.Find(_T("/xhtml")) > -1)	&&
				(	mime.Find(_T("shockwave-flash")) >= 0 || 
					object.Right(4) == _T(".swf") ||
					mime.Find(_T("text/")) >= 0 || 
					mime.Find(_T("javascript")) >= 0 || 
					mime.Find(_T("image/")) >= 0) )
			{
				w->staticCdnScore = 0;
				count++;
				
				CString host = w->host;
				host.MakeLower();

				if( IsCDN(w, w->cdnProvider) )
				{
					w->staticCdnScore = 100;
					
					// add it to the CDN list if we don't already have it
					bool found = false;
					for( size_t i = 0; i < cdnList.GetCount() && !found; i++ )
						if( !cdnList[i].CompareNoCase(host) )
							found = true;
							
					if( !found )
						cdnList.Add(w->host);
				}

				if( !w->staticCdnScore )
					w->warning = true;
				total += w->staticCdnScore;
			}
		}
	}

	size_t cnt = cdnList.GetCount();
	if( cnt )
	{
		if( cnt > 10 )
			oneCdnScore = 0;
		else
			oneCdnScore = 100 - ((int)(cnt - 1) * 10);
	}

	// average the CDN scores of all of the objects for the page
	if( count )
		staticCdnScore = total / count;
}

/*-----------------------------------------------------------------------------
  Convert a System Time into a "seconds since X" format suitable for math
-----------------------------------------------------------------------------*/
__int64 SystemTimeToSeconds(SYSTEMTIME& system_time) {
  __int64 seconds = 0;
  FILETIME file_time;
  if (SystemTimeToFileTime(&system_time, &file_time)) {
    LARGE_INTEGER convert;
    convert.HighPart = file_time.dwHighDateTime;
    convert.LowPart = file_time.dwLowDateTime;
    seconds = convert.QuadPart / 10000000;
  }
  return seconds;
}

/*-----------------------------------------------------------------------------
  See how much time is remaining for the object
  Returns false if the object is explicitly not cacheable
  (private or negative expires)
-----------------------------------------------------------------------------*/
bool GetExpiresRemaining(CWinInetRequest * w, bool& expiration_set, 
                                    int& seconds_remaining) {
  bool is_cacheable = true;
  expiration_set = false;
  seconds_remaining = 0;

  CStringA cache = CT2A(w->response.cacheControl.MakeLower());
  CStringA pragma = CT2A(w->response.pragma.MakeLower());

  if (cache.Find("no-store") != -1 || 
      cache.Find("no-cache") != -1 ||
      pragma.Find("no-cache") != -1) {
    is_cacheable = false;
  } else {
    CStringA date_string = CT2A(w->response.date.Trim());
    CStringA age_string = CT2A(w->response.age.Trim());
    CStringA expires_string = CT2A(w->response.expires.Trim());
    SYSTEMTIME sys_time;
    __int64 date_seconds = 0;
    if (date_string.GetLength() && 
        InternetTimeToSystemTimeA(date_string, &sys_time, 0)) {
        date_seconds = SystemTimeToSeconds(sys_time);
    }
    if (!date_seconds) {
      GetSystemTime(&sys_time);
      date_seconds = SystemTimeToSeconds(sys_time);
    }
    if (date_seconds) {
      if (expires_string.GetLength() && 
          InternetTimeToSystemTimeA(expires_string, &sys_time, 0)) {
        __int64 expires_seconds = SystemTimeToSeconds(sys_time);
        if (expires_seconds) {
          if (expires_seconds < date_seconds)
            is_cacheable = false;
          else {
            expiration_set = true;
            seconds_remaining = (int)(expires_seconds - date_seconds);
          }
        }
      }
    }
    if (is_cacheable && !expiration_set) {
      int index = cache.Find("max-age");
      if( index > -1 ) {
        int eq = cache.Find("=", index);
        if( eq > -1 ) {
          seconds_remaining = atol(cache.Mid(eq + 1).Trim());
          if (seconds_remaining) {
            expiration_set = true;
            if (age_string.GetLength()) {
              int age = atol(age_string);
              seconds_remaining -= age;
            }
          }
        }
      }
    }
  }

  return is_cacheable;
}

/*-----------------------------------------------------------------------------
	Check each static element to make sure it was cachable
-----------------------------------------------------------------------------*/
void CPagetestReporting::CheckCache()
{
	cacheScore = -1;
	int count = 0;
	int total = 0;

	ATLTRACE(_T("[Pagetest] - CheckCache\n"));
	
	POSITION pos = events.GetHeadPosition();
	while( pos )
	{
		CTrackedEvent * e = events.GetNext(pos);
		if( e && e->type == CTrackedEvent::etWinInetRequest && !e->ignore )
		{
			CWinInetRequest * w = (CWinInetRequest *)e;
			CString mime = w->response.contentType.Trim().MakeLower();
      bool expiration_set;
      int seconds_remaining;
      if (w->result == 200 && mime.Find(_T("/cache-manifest")) == -1 && 
          GetExpiresRemaining(w, expiration_set, seconds_remaining))
      {
        count++;
        w->cacheScore = 0;
        w->ttl = seconds_remaining;
        if( expiration_set ) 
        {
          // If age more than 7 days give 100
          // else if more than hour, give 50
          if( seconds_remaining >= 604800 )
            w->cacheScore = 100;
          else if( seconds_remaining >= 3600 )
            w->cacheScore = 50;
        }

        // Add the score to the total.
        total += w->cacheScore;
      }
    }
  }

  // average the Cache scores of all of the objects for the page
	if( count )
		cacheScore = total / count;
}

/*-----------------------------------------------------------------------------
	Check to make sure CSS and JS files are combined (at least into top-level domain)
-----------------------------------------------------------------------------*/
void CPagetestReporting::CheckCombine()
{
	combineScore = 100;	// default to 100 as "no applicable objects" is a success
	int count = 0;
	int total = 0;
	int jsCount = 0;
	int cssCount = 0;

	ATLTRACE(_T("[Pagetest] - CheckCombine\n"));
	
	POSITION pos = events.GetHeadPosition();
	while( pos )
	{
		CTrackedEvent * e = events.GetNext(pos);
		if( e && e->type == CTrackedEvent::etWinInetRequest && !e->ignore && e->start <= startRender )
		{
			CWinInetRequest * w = (CWinInetRequest *)e;
			CString mime = w->response.contentType;
			mime.MakeLower();
			CString exp = w->response.expires;
			exp.Trim();
			CString cache = w->response.cacheControl;
			cache.MakeLower();
			CString pragma = w->response.pragma;
			pragma.MakeLower();
			if( w->result == 200 &&
				w->fromNet &&
				exp != _T("0") && 
				exp != _T("-1") && 
				!(cache.Find(_T("no-store")) > -1) &&
				!(cache.Find(_T("no-cache")) > -1) &&
				!(pragma.Find(_T("no-cache")) > -1) &&
				(	mime.Find(_T("/css")) >= 0 || 
					mime.Find(_T("javascript")) >= 0 ) )
			{
				count++;
				w->combineScore = 0;
				
				if( mime.Find(_T("/css")) >= 0 )
					cssCount++;
				else
					jsCount++;
				
				int cnt = 0;
				
				POSITION pos2 = events.GetHeadPosition();
				while( pos2 )
				{
					CTrackedEvent * e2 = events.GetNext(pos2);
					if( e2 && e2->type == CTrackedEvent::etWinInetRequest && e2->start <= startRender )
					{
						CWinInetRequest * w2 = (CWinInetRequest *)e2;
						CString mime2 = w2->response.contentType;
						mime2.MakeLower();
						if( mime2 == mime )
						{
							exp = w2->response.expires;
							exp.Trim();
							cache = w2->response.cacheControl;
							cache.MakeLower();
							pragma = w2->response.pragma;
							pragma.MakeLower();
							if( exp != _T("0") && 
								exp != _T("-1") && 
								!(cache.Find(_T("no-store")) > -1) &&
								!(cache.Find(_T("no-cache")) > -1) &&
								!(pragma.Find(_T("no-cache")) > -1) )
							{
									cnt++;
							}
						}
					}
				}
				
				if( cnt <= 1 )
					w->combineScore = 100;

				if( !w->combineScore )
					w->warning = true;

				total += w->combineScore;
			}
		}
	}

	// average the Combine scores of all of the objects for the page
	if( count )
		combineScore = max(100 - ((max(jsCount,1) - 1)*10) - ((max(cssCount,1) - 1)*5), 0);
}

/*-----------------------------------------------------------------------------
	Check to make sure cookies are not set to the TLD
-----------------------------------------------------------------------------*/
void CPagetestReporting::CheckCookie()
{
	cookieScore = -1;
	int count = 0;
	int total = 0;
	DWORD totalBytes = 0;
	DWORD targetBytes = 0;
	
	ATLTRACE(_T("[Pagetest] - CheckCookie\n"));
	
	POSITION pos = events.GetHeadPosition();
	while( pos )
	{
		CTrackedEvent * e = events.GetNext(pos);
		if( e && e->type == CTrackedEvent::etWinInetRequest && !e->ignore )
		{
			CWinInetRequest * w = (CWinInetRequest *)e;
			CString mime = w->response.contentType;
			mime.MakeLower();
			CString exp = w->response.expires;
			exp.Trim();
			CString cache = w->response.cacheControl;
			cache.MakeLower();
			CString pragma = w->response.pragma;
			pragma.MakeLower();
			CString object = w->object;
			object.MakeLower();
			count++;
			int cnt = 0;
			CString failStr;
			
			// default to pass
			w->cookieScore = 100;
			
			// see if there were any cookies on the request
			if( w->fromNet && w->request.cookieSize )
			{
				totalBytes += w->request.cookieSize;
				
				// if it is a static object then it fails outright
				if( (w->result == 304 ||
					w->result == 200) &&
					exp != _T("0") && 
					exp != _T("-1") && 
					!(cache.Find(_T("no-store")) > -1) &&
					!(cache.Find(_T("no-cache")) > -1) &&
					!(pragma.Find(_T("no-cache")) > -1) &&
					!(mime.Find(_T("/html")) > -1)	&&
					!(mime.Find(_T("/xhtml")) > -1)	&&
					(	mime.Find(_T("shockwave-flash")) >= 0 || 
						object.Right(4) == _T(".swf") ||
						mime.Find(_T("text/")) >= 0 || 
						mime.Find(_T("javascript")) >= 0 || 
						mime.Find(_T("image/")) >= 0) )
				{
					w->cookieScore = 0;
				}
				else
				{
					w->cookieScore = 50;
					targetBytes += w->request.cookieSize;
				}
			}
			
			if( !w->cookieScore )
				w->warning = true;

			total += w->cookieScore;
		}
	}

	// average the cookie scores of all of the objects for the page
	if( count )
		cookieScore = total / count;
}

/*-----------------------------------------------------------------------------
	Check each js or html element to make sure it has been minified
-----------------------------------------------------------------------------*/
void CPagetestReporting::CheckMinify()
{
	minifyScore = -1;
	int count = 0;
	int total = 0;
	DWORD totalBytes = 0;
	DWORD targetBytes = 0;

	ATLTRACE(_T("[Pagetest] - CheckMinify\n"));
	
	POSITION pos = events.GetHeadPosition();
	while( pos )
	{
		CTrackedEvent * e = events.GetNext(pos);
		if( e && e->type == CTrackedEvent::etWinInetRequest && !e->ignore )
		{
			CWinInetRequest * w = (CWinInetRequest *)e;
			CString mime = w->response.contentType;
			mime.MakeLower();

			LPBYTE body = w->body;
			DWORD bodyLen = w->bodyLen;
			
			if( w->fromNet && w->result == 200 && 
					((mime.Find(_T("javascript")) >= 0 || mime.Find(_T("json")) >= 0) && 
					body && bodyLen))
			{
				count++;
				bool failed = false;
				totalBytes += w->in;
				DWORD target = w->in;
				DWORD origSize = w->in;
				DWORD origLen = bodyLen;
				DWORD headSize = w->inHeaders.GetLength();
			
				if( w->in < 1400 )
					w->minifyScore = 100;
				else
				{
					// run JSMin on the file and see how much smaller it is
					DWORD len = origLen;
					char * minified = new char [len];
					JSMin jsmin;
					if( jsmin.Minify((const char *)body, minified, len) )
					{
						// if the original content was gzipped, gzip the minified result as well
						CString enc = w->response.contentEncoding;
						enc.MakeLower();
						if( enc.Find(_T("gzip")) >= 0 )
						{
							DWORD cLen = compressBound(len);
							if( cLen )
							{
								LPBYTE buff = new BYTE[cLen];
								if( compress2(buff, &cLen, (LPBYTE)minified, len, 9) == Z_OK )
									target = cLen + headSize;
									
								delete [] buff;
							}
						}
						else
							target = len + headSize;
					}

					delete [] minified;

					// if minification saves 10% or more then it fails
					if( target > origSize )
						target = origSize;
						
					DWORD savings = origSize - target;
					if( savings > 5120 || ((double)target <= (double)origSize * 0.9) )
						w->minifyScore = 0;
					else if( savings > 1024 )
						w->minifyScore = 50;
					else
					{
						w->minifyScore = 100;
						target = origSize;
					}
				}

				targetBytes += target;

				w->minifyTotal = w->in;
				w->minifyTarget = target;
				total += w->minifyScore;
			}
		}
	}

	minifyTotal = totalBytes;
	minifyTarget = targetBytes;

	if( count && totalBytes )
		minifyScore = targetBytes * 100 / totalBytes;
}

/*-----------------------------------------------------------------------------
	Protect against malformed images
-----------------------------------------------------------------------------*/
static bool DecodeImage(CxImage& img, BYTE * buffer, DWORD size, DWORD imagetype)
{
	bool ret = false;
	
	__try{
		ret=img.Decode(buffer, size, imagetype);
	}__except(1){}
	
	return ret;
}

/*-----------------------------------------------------------------------------
	Check the images to make sure they have been compressed appropriately
-----------------------------------------------------------------------------*/
void CPagetestReporting::CheckImageCompression()
{
	compressionScore = -1;
	int count = 0;
	int total = 0;
	DWORD totalBytes = 0;
	DWORD targetBytes = 0;
	int imgNum = 0;

	ATLTRACE(_T("[Pagetest] - CheckImageCompression\n"));
	
	POSITION pos = events.GetHeadPosition();
	while( pos )
	{
		CTrackedEvent * e = events.GetNext(pos);
		if( e && e->type == CTrackedEvent::etWinInetRequest && !e->ignore )
		{
			CWinInetRequest * w = (CWinInetRequest *)e;
			CString mime = w->response.contentType;
			mime.MakeLower();
			
			LPBYTE body = w->body;
			DWORD bodyLen = w->bodyLen;
			
			if( w->fromNet && 
				w->result == 200 && 
				mime.Find(_T("image/")) >= 0 && 
				body && bodyLen)
			{
				DWORD size = bodyLen;
				DWORD target = size;
				count++;

				CxImage img;
				if( DecodeImage(img, body, bodyLen, CXIMAGE_FORMAT_UNKNOWN) )
				{
					DWORD type = img.GetType();
					
					switch( type )
					{
						case CXIMAGE_FORMAT_GIF:
						case CXIMAGE_FORMAT_PNG:
								{
									// all gif's and png's are considered compressed well
                  // until we can integrate Page Speed's Image checking
									w->compressionScore = 100;
								}
								break;
								
						case CXIMAGE_FORMAT_JPG:							
								{
									img.SetCodecOption(8, CXIMAGE_FORMAT_JPG);	// optimized encoding
									img.SetCodecOption(16, CXIMAGE_FORMAT_JPG);	// progressive
									
									img.SetJpegQuality(85);
									target = size = bodyLen;
									BYTE * mem = NULL;
									int len = 0;
									if( img.Encode(mem, len, CXIMAGE_FORMAT_JPG) )
									{
										img.FreeMemory(mem);
										
										target = (DWORD)len < size ? (DWORD)len : size;
                    w->compressionScore = 100;
                    if (target && target < size && size > 1400)
                    {
                      double ratio = (double)size / (double)target;
                      if (ratio >= 1.5)
                        w->compressionScore = 0;
                      else if (ratio >= 1.1)
                        w->compressionScore = 50;
                    }
									}
								}
								break;
								
						default:
								{
									w->compressionScore = 0;
								}
								break;
					}

					if( target > size )
						target = size;
						
					totalBytes += size;
					targetBytes += target;

					w->compressTotal = size;
					w->compressTarget = target;
				}
				else
				{
					w->compressionScore = 0;
				}

				if( !w->compressionScore )
					w->warning = true;

				total += w->compressionScore;
			}
		}
	}
	
	compressTotal = totalBytes;
	compressTarget = targetBytes;

	if( count && totalBytes )
		compressionScore = targetBytes * 100 / totalBytes;
}

/*-----------------------------------------------------------------------------
	Check to make sure there are no ETags
-----------------------------------------------------------------------------*/
void CPagetestReporting::CheckEtags()
{
	etagScore = -1;
	int count = 0;
	int total = 0;
	
	ATLTRACE(_T("[Pagetest] - CheckEtags\n"));
	
	POSITION pos = events.GetHeadPosition();
	while( pos )
	{
		CTrackedEvent * e = events.GetNext(pos);
		if( e && e->type == CTrackedEvent::etWinInetRequest && !e->ignore )
		{
			CWinInetRequest * w = (CWinInetRequest *)e;
			if( w->fromNet )
			{
				count++;
				
				// default to pass
				if( w->response.etag.IsEmpty() )
					w->etagScore = 100;
				else
					w->etagScore = 0;
				
				total += w->etagScore;
			}
		}
	}

	// average the cookie scores of all of the objects for the page
	if( count )
		etagScore = total / count;
}

/*-----------------------------------------------------------------------------
	Report any errors
-----------------------------------------------------------------------------*/
void CPagetestReporting::LogError(bool scriptError)
{
/*	
	if( !logFile.IsEmpty() && ((errorCode && errorCode != 99999) || scriptError))
	{
		DWORD code = errorCode;
		CString txt = _T("Pagetest result");
		if( scriptError )
		{
			txt = _T("Script Error");
			code = 88888;
		}
			
		// get the last script command that was issued
		CString cmd;
		if( runningScript )
			cmd = script_lastCommand;

		CString file = logFile + _T("_log.txt");

		// update the event name in case we're running a script
		if( runningScript && !script_eventName.IsEmpty() )
		{
			if( somEventName.IsEmpty() )
				somEventName = script_eventName;
			else
				somEventName.Replace(_T("%STEP%"), (LPCTSTR)script_eventName);
		}

		// make sure we have the proper script step
		CString eventName = somEventName;
		
		// write out the actual error
		TCHAR buff[1000];
		wsprintf(buff, _T("%s\t%d\t%d\t%d\t%d\t%d\t%s\t%s\t%s\t%d\t%s\t%s\r\n"), 
				(LPCTSTR)CTime::GetCurrentTime().Format(_T("%Y/%m/%d %H:%M:%S")),
				labID, dialerID, 0, 0, code, (LPCTSTR)txt, (LPCTSTR)somEventName, (LPCTSTR)url, abm + 1, (LPCTSTR)domElementId, (LPCTSTR)cmd);
					
		// open (and lock) the error log
		DWORD startMS = GetTickCount();
		HANDLE hFile = INVALID_HANDLE_VALUE;
		do
		{
			hFile = CreateFile(file, GENERIC_WRITE, 0, &nullDacl, OPEN_ALWAYS, 0, 0);
			if( hFile == INVALID_HANDLE_VALUE )
				Sleep(100);
		}while( hFile == INVALID_HANDLE_VALUE && GetTickCount() < startMS + 30000 );
		
		if( hFile != INVALID_HANDLE_VALUE )
		{
			DWORD bytes;
			SetFilePointer(hFile, 0, 0, FILE_END);
			CT2A str(buff);
			WriteFile(hFile, (LPSTR)str, lstrlen(buff), &bytes, 0);
			CloseHandle(hFile);
		}
	}
*/
}

/*-----------------------------------------------------------------------------
	See if the provided host belongs to a CDN
-----------------------------------------------------------------------------*/
bool CPagetestReporting::IsCDN(CWinInetRequest * w, CString &provider)
{
	bool ret = false;
	
	CString host = w->host;
	host.MakeLower();
	if( !host.IsEmpty() )
	{
		// make sure we haven't already identified it
		bool found = false;

		EnterCriticalSection(&csCDN);
		POSITION pos = cdnLookups.GetHeadPosition();
		while( pos && !found )
		{
			CCDNEntry &entry = cdnLookups.GetNext(pos);
			if( entry.name == host )
			{
				found = true;
				ret = entry.isCDN;
				provider = entry.provider;
			}
		}
		LeaveCriticalSection(&csCDN);
		
		if( !found )
		{
      // now check http headers for known CDNs (cheap check)
      int cdn_header_count = _countof(cdnHeaderList);
      for (int i = 0; i < cdn_header_count && !found; i++) {
        CDN_PROVIDER_HEADER * cdn_header = &cdnHeaderList[i];
        CString header = w->GetResponseHeader((LPCTSTR)CA2T(cdn_header->response_field));
        header.MakeLower();
        CString pattern = CA2T(cdn_header->pattern);
        pattern.MakeLower();
        if (pattern.GetLength() && header.GetLength() && 
          header.Find(pattern) >= 0) {
            found = true;
            ret = true;
            provider = cdn_header->name;
        }
      }
      if (!found) {
			  // look it up and look at the cname entries for the host
			  hostent * dnsinfo = gethostbyname(CT2A(host));
			  if( dnsinfo && !WSAGetLastError() )
			  {
				  // check all of the aliases
				  CAtlList<CStringA> names;
				  names.AddTail((LPCSTR)CT2A(host));
				  names.AddTail(dnsinfo->h_name);
				  char ** alias = dnsinfo->h_aliases;
				  while( *alias )
				  {
					  names.AddTail(*alias);
					  alias++;
				  }

				  // also try a reverse-lookup on the IP
				  if( w->peer.sin_addr.S_un.S_addr )
				  {
					  //DWORD addr = htonl(server.sin_addr.S_un.S_addr);
					  DWORD addr = w->peer.sin_addr.S_un.S_addr;
					  dnsinfo = gethostbyaddr((char *)&addr, sizeof(addr), AF_INET);
					  if( dnsinfo && !WSAGetLastError() )
					  {
						  if( dnsinfo->h_name )
							  names.AddTail(dnsinfo->h_name);

						  alias = dnsinfo->h_aliases;
						  while( *alias )
						  {
							  names.AddTail(*alias);
							  alias++;
						  }
					  }
				  }

				  POSITION pos = names.GetHeadPosition();
				  while( pos && !ret )
				  {				
					  CStringA name = names.GetNext(pos);
					  name.MakeLower();

					  CDN_PROVIDER * cdn = cdnList;
					  while( !ret && cdn->pattern)
					  {
						  if( name.Find(cdn->pattern) > -1 )
						  {
							  ret = true;
							  provider = cdn->name;
						  }

						  cdn++;
					  }
				  }
			  }
      }
			
			// add it to the list of resolved names
			EnterCriticalSection(&csCDN);
			CCDNEntry entry;
			entry.name = host;
			entry.isCDN = ret;
			entry.provider = provider;
			cdnLookups.AddHead(entry);
			LeaveCriticalSection(&csCDN);
		}
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
	If we were asked to, walk the page and save any links on it
-----------------------------------------------------------------------------*/
void CPagetestReporting::SaveUrls(void)
{
	if( !linksFile.IsEmpty() )
	{
		CAtlList<CStringA> urls;
		
		// walk through all browser windows
		POSITION pos = browsers.GetHeadPosition();
		while(pos)
		{
			CBrowserTracker tracker = browsers.GetNext(pos);
			if( tracker.threadId == GetCurrentThreadId() && tracker.browser )
			{
				CComPtr<IDispatch> spDoc;
				if( SUCCEEDED(tracker.browser->get_Document(&spDoc)) && spDoc )
				{
					CComQIPtr<IHTMLDocument2> doc = spDoc;
          if( doc )
          {
					  // get the collection of links on the main document
					  GetLinks( doc, urls);

					  // walk all of the frames on the document using OLE
					  // this is a little complicated because we need to bypass cross site scripting security
					  CComQIPtr<IOleContainer> ole(doc);
					  if(ole)
					  {
						  CComPtr<IEnumUnknown> objects;

						  // Get an enumerator for the frames
						  if( SUCCEEDED(ole->EnumObjects(OLECONTF_EMBEDDINGS, &objects)) && objects )
						  {
							  IUnknown* pUnk;
							  ULONG uFetched;

							  // Enumerate all the frames
							  while( S_OK == objects->Next(1, &pUnk, &uFetched) )
							  {
								  // QI for IWebBrowser here to see if we have an embedded browser
								  CComQIPtr<IWebBrowser2> browser(pUnk);
								  pUnk->Release();

								  if (browser)
								  {
									  CComPtr<IDispatch> disp;
									  if( SUCCEEDED(browser->get_Document(&disp)) && disp )
									  {
										  CComQIPtr<IHTMLDocument2> frameDoc(disp);
										  if (frameDoc)
											  GetLinks( frameDoc, urls);
									  }
								  }
							  }
						  }
					  }			

					  // walk all of the frames on the document using native support (OLE doesn't seem to grab them all)
					  CComPtr<IHTMLFramesCollection2> frames;
					  if( SUCCEEDED(doc->get_frames(&frames)) && frames )
					  {
						  // for each frame, walk all of the elements in the frame
						  long count = 0;
						  if( SUCCEEDED(frames->get_length(&count)) )
						  {
							  for( long i = 0; i < count; i++ )
							  {
								  _variant_t index = i;
								  _variant_t varFrame;
  								
								  if( SUCCEEDED(frames->item(&index, &varFrame)) )
								  {
									  CComQIPtr<IHTMLWindow2> window(varFrame);
									  if( window )
									  {
										  CComQIPtr<IHTMLDocument2> frameDoc;
										  if( SUCCEEDED(window->get_document(&frameDoc)) && frameDoc )
											  GetLinks( frameDoc, urls);
									  }
								  }
							  }
						  }
					  }
          }
				}
			}
		}

		// save out the urls that were found
		if( !urls.IsEmpty() )
		{
			HANDLE hFile = CreateFile(linksFile, GENERIC_WRITE, 0, &nullDacl, CREATE_ALWAYS, 0, 0);
			if( hFile != INVALID_HANDLE_VALUE )
			{
				POSITION pos = urls.GetHeadPosition();
				while( pos )
				{
					CStringA linkUrl = urls.GetNext(pos);
					linkUrl += "\r\n";
					DWORD bytes;
					WriteFile(hFile, (LPCSTR)linkUrl, linkUrl.GetLength(), &bytes, 0);
				}
				
				CloseHandle(hFile);
			}
		}
	}
}

/*-----------------------------------------------------------------------------
	Extract all of the links from the provided document
-----------------------------------------------------------------------------*/
void CPagetestReporting::GetLinks(CComQIPtr<IHTMLDocument2> &doc, CAtlList<CStringA> &urls)
{
	if( doc )
	{
		CComPtr<IHTMLElementCollection> coll;
		if( SUCCEEDED(doc->get_links(&coll)) && coll )
		{
			// walk through them all
			long count = 0;
			if( SUCCEEDED(coll->get_length(&count)) )
			{
				for( long i = 0; i < count; i++ )
				{
					_variant_t index = i;
					CComPtr<IDispatch> item;
					if( SUCCEEDED(coll->item(index, index, &item)) && item )
					{
						CStringA linkUrl;
						CComQIPtr<IHTMLLinkElement> link = item;
						if( link )
						{
							// get the href out
							_bstr_t bs_href;
							if( SUCCEEDED(link->get_href(bs_href.GetAddress())) )
							{
								CStringA href = bs_href;
								linkUrl = href;
							}
						}
						else
						{
							CComQIPtr<IHTMLAnchorElement> anchor = item;
							if( anchor )
							{
								// get the href out
								_bstr_t bs_href;
								if( SUCCEEDED(anchor->get_href(bs_href.GetAddress())) )
								{
									CStringA href = bs_href;
									linkUrl = href;
								}
							}
						}
						
						// only record http urls
						if( !linkUrl.IsEmpty() && linkUrl.Left(4) == "http")
						{
							// strip off any bookmarks from the url
							int index = linkUrl.Find("#");
							if( index > -1 )
								linkUrl = linkUrl.Left(index);
								
							// make sure we didn't already record this url
							bool found = false;
							POSITION pos = urls.GetHeadPosition();
							while( pos && !found )
								if( urls.GetNext(pos) == linkUrl )
									found = true;
							
							if( !found )
								urls.AddTail(linkUrl);
						}
					}
				}
			}
		}
	}
}

/*-----------------------------------------------------------------------------
	Save out the HTML of the page
-----------------------------------------------------------------------------*/
void CPagetestReporting::SaveHTML()
{
	if( !htmlFile.IsEmpty() )
	{
		// save out the base page html
		if( !html.IsEmpty() )
		{
			HANDLE hFile = CreateFile(htmlFile + _T("_page.html"), GENERIC_WRITE, 0, &nullDacl, CREATE_ALWAYS, 0, 0);
			if( hFile != INVALID_HANDLE_VALUE )
			{
				DWORD bytes;
				WriteFile(hFile, (LPCSTR)html, html.GetLength(), &bytes, 0);
				
				CloseHandle(hFile);
			}
		}

		// save out the DOM
		CComPtr<IWebBrowser2>	browser;
		POSITION pos = browsers.GetHeadPosition();
		while(pos)
		{
			CBrowserTracker tracker = browsers.GetNext(pos);
			if( tracker.browser && tracker.threadId == GetCurrentThreadId())
				browser = tracker.browser;
		}
		
		if( browser )
		{
			CComPtr<IDispatch> spDoc;
			if( SUCCEEDED(browser->get_Document(&spDoc)) && spDoc )
			{
				CComQIPtr<IHTMLDocument2> doc = spDoc;
				CComPtr<IHTMLElement> body;
				if( doc && SUCCEEDED(doc->get_body(&body)) && body )
				{
					CComPtr<IHTMLElement> parent;
					if( SUCCEEDED(body->get_parentElement(&parent)) && parent )
					{
						_bstr_t text;
						parent->get_outerHTML(text.GetAddress());
						CStringA bodyText = CT2A(text);

						HANDLE hFile = CreateFile(htmlFile + _T("_dom.html"), GENERIC_WRITE, 0, &nullDacl, CREATE_ALWAYS, 0, 0);
						if( hFile != INVALID_HANDLE_VALUE )
						{
							DWORD bytes;
							WriteFile(hFile, (LPCSTR)bodyText, bodyText.GetLength(), &bytes, 0);
							
							CloseHandle(hFile);
						}
					}
				}
			}
		}
	}
}

/*-----------------------------------------------------------------------------
	Save out all cookies
-----------------------------------------------------------------------------*/
void CPagetestReporting::SaveCookies()
{
	if( !cookiesFile.IsEmpty() )
	{
		CStringA cookies = "URL\tName\tValue\r\n";

		// enumerate all of the cookie files		
		DWORD buffLen = 40960;
		LPINTERNET_CACHE_ENTRY_INFOA info = (LPINTERNET_CACHE_ENTRY_INFOA)malloc(buffLen);
		if( info )
		{
			DWORD infoLen = buffLen;
			HANDLE hCache = FindFirstUrlCacheEntryA("cookie:", info, &infoLen);
			if( hCache )
			{
				do
				{
					// load each cookie file
					CStringA file = info->lpszLocalFileName;
					HANDLE hCookieFile = CreateFileA( file, GENERIC_READ, FILE_SHARE_READ, 0, OPEN_EXISTING, 0, 0);
					if( hCookieFile != INVALID_HANDLE_VALUE )
					{
						DWORD len = GetFileSize(hCookieFile, 0);
						if( len )
						{
							char * contents = (char *)malloc(len + 1);
							if( contents )
							{
								DWORD bytes;
								if( ReadFile( hCookieFile, contents, len, &bytes, 0) && len == bytes)
								{
									// NULL-terminate it
									contents[len] = 0;
									
									// extract each cookie
									CStringA buff = contents;
									buff.Replace("\n", "\n ");
									int pos = 0;
									CStringA cookie = buff.Tokenize("*", pos);
									while( pos >= 0 )
									{
										cookie.Trim();
										
										// parse the cookie
										CStringA cookieUrl;
										CStringA name;
										CStringA value;
										CStringA expires;
										int linePos = 0;
										int lineCount = 0;
										CStringA line = cookie.Tokenize("\r\n", linePos );
										while( linePos >= 0 )
										{
											line.Trim();
											lineCount++;
											
											switch( lineCount )
											{
												case 1: name = line; break;
												case 2: value = line; break;
												case 3: cookieUrl = line; break;
											}
											
											line = cookie.Tokenize("\r\n", linePos );
										}
										
										if( name.GetLength() && cookieUrl.GetLength() )
										{
											CStringA tmp;
											tmp.Format("%s\t%s\t%s\r\n", (LPCSTR)cookieUrl, (LPCSTR)name, (LPCSTR)value);
											cookies += tmp;
										}
										
										cookie = buff.Tokenize("*", pos);
									}
								}
								
								free(contents);
							}
						}
						CloseHandle( hCookieFile );
					}
					
					infoLen = buffLen;
				}while( FindNextUrlCacheEntryA(hCache, info, &infoLen) );

				FindCloseUrlCache(hCache);
			}
			
			free(info);
		}

		// write out the file
		HANDLE hFile = CreateFile(cookiesFile + _T("_cookies.txt"), GENERIC_WRITE, 0, &nullDacl, CREATE_ALWAYS, 0, 0);
		if( hFile != INVALID_HANDLE_VALUE )
		{
			DWORD bytes;
			WriteFile(hFile, (LPCSTR)cookies, cookies.GetLength(), &bytes, 0);

			CloseHandle(hFile);
		}
	}
}

/*-----------------------------------------------------------------------------
	Save out one of the intermediate screen shots
-----------------------------------------------------------------------------*/
void CPagetestReporting::SaveProgressImage(CxImage &img, CString file, bool resize, DWORD quality)
{
	if( img.IsValid() )
	{
		CxImage img2(img);

		// shrink the image down
		if( resize )
			img2.Resample2(img.GetWidth() / 2, img.GetHeight() / 2);
			
		// save it out
		img2.SetCodecOption(8, CXIMAGE_FORMAT_JPG);	// optimized encoding
		img2.SetCodecOption(16, CXIMAGE_FORMAT_JPG);	// progressive
		img2.SetJpegQuality((BYTE)min(quality, 100));
		img2.Save(file, CXIMAGE_FORMAT_JPG);
	}
}

/*-----------------------------------------------------------------------------
	Write out the browser status updates (tab-delimited)
-----------------------------------------------------------------------------*/
void CPagetestReporting::SaveStatusUpdates(CString file)
{
	if( statusUpdates.GetCount() )
	{
		HANDLE hFile = CreateFile( file, GENERIC_WRITE, 0, &nullDacl, CREATE_ALWAYS, 0, 0);
		if( hFile != INVALID_HANDLE_VALUE )
		{
			POSITION pos = statusUpdates.GetHeadPosition();
			while( pos )
			{
				CStatusUpdate stat = statusUpdates.GetNext(pos);
				if( stat.tm > start )
				{
					DWORD ms = (DWORD)((stat.tm - start) / msFreq);
					CString buff;
					buff.Format(_T("%d\t"), ms);
					buff += stat.status;
					buff += _T("\r\n");

					DWORD bytes;
          CT2A str(buff, CP_UTF8);
					WriteFile(hFile, (LPCSTR)str, lstrlenA(str), &bytes, 0 );
				}
			}

			CloseHandle(hFile);
		}
	}
}

/*-----------------------------------------------------------------------------
	Log the 404's from the page if we have been asked to
-----------------------------------------------------------------------------*/
void CPagetestReporting::Log404s()
{
	if( !s404File.IsEmpty() )
	{
		CStringA s404;

		// walk the list of requests looking for 404's
		POSITION pos = events.GetHeadPosition();
		while( pos )
		{
			CTrackedEvent * e = events.GetNext(pos);
			if( e && e->type == CTrackedEvent::etWinInetRequest )
			{
				CWinInetRequest * w = (CWinInetRequest *)e;
				if( w->result == 404 )
				{
					CString buff;
					CString obUrl = w->host + w->object;
					buff.Format(_T("%s\t%s\r\n"), logUrl, (LPCTSTR)obUrl);

					s404 += buff;
				}
			}
		}

		// write out the report if we have one
		if( !s404.IsEmpty() )
		{
			HANDLE hFile = INVALID_HANDLE_VALUE;
			do
			{
				hFile = CreateFile(s404File, GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ, &nullDacl, OPEN_ALWAYS, 0, 0);
				if( hFile == INVALID_HANDLE_VALUE )
					Sleep(10);
					
			}while( hFile == INVALID_HANDLE_VALUE );

			if( hFile != INVALID_HANDLE_VALUE )
			{
				SetFilePointer(hFile, 0, 0, FILE_END);

				DWORD bytes;
				WriteFile(hFile, (LPCSTR)s404, s404.GetLength(), &bytes, 0);
				CloseHandle(hFile);
			}
		}
	}
}

/*-----------------------------------------------------------------------------
	Sort the events by start time since some events actually start well after
	they were inserted into the list
-----------------------------------------------------------------------------*/
void CPagetestReporting::SortEvents()
{
	CAtlList<CTrackedEvent *>	tmp;

	// move all of the events over to a temporary list, making sure the start times are set correctly
	POSITION pos = events.GetHeadPosition();
	while( pos )
	{
		CTrackedEvent * e = events.GetNext(pos);
		if( e )
		{
			CWinInetRequest * w = (CWinInetRequest *)e;
			if( e->type == CTrackedEvent::etWinInetRequest && !w->start && w->created )
				w->start = w->created;

			if( e->start )
				tmp.AddTail(e);
		}
	}

	events.RemoveAll();

	pos = tmp.GetHeadPosition();
	while( pos )
	{
		CTrackedEvent * e = tmp.GetNext(pos);
		if( e )
		{
			if( events.IsEmpty() )
				events.AddTail(e);
			else
			{
				// figure out where to insert it
				bool inserted = false;
				POSITION next = events.GetHeadPosition();
				while( !inserted && next )
				{
					POSITION p = next;
					CTrackedEvent * n = events.GetNext(next);
					if( n )
					{
						if( e->start < n->start )
						{
							events.InsertBefore(p, e);
							inserted = true;
						}
					}
				}

				if( !inserted )
					events.AddTail(e);
			}
		}
	}
}

unsigned __stdcall cdnLookupThread( void* arg )
{
	if( reporting )
		((CPagetestReporting*)reporting)->cdnLookupThread((DWORD)arg);
		
	return 0;
}

/*-----------------------------------------------------------------------------
	Kick off some background threads for the different host names to do 
	all of the DNS lookups in parallel
-----------------------------------------------------------------------------*/
void CPagetestReporting::StartCDNLookups(void)
{
	// build a list of host names we care about
	cdnRequests.RemoveAll();

	POSITION pos = events.GetHeadPosition();
	while( pos )
	{
		CTrackedEvent * e = events.GetNext(pos);
		if( e && e->type == CTrackedEvent::etWinInetRequest && !e->ignore )
		{
			CWinInetRequest * w = (CWinInetRequest *)e;
			CString mime = w->response.contentType;
			mime.MakeLower();
			CString exp = w->response.expires;
			exp.Trim();
			CString cache = w->response.cacheControl;
			cache.MakeLower();
			CString pragma = w->response.pragma;
			pragma.MakeLower();
			CString object = w->object;
			object.MakeLower();
			if( w->result == 200 &&
				exp != _T("0") && 
				exp != _T("-1") && 
				!(cache.Find(_T("no-store")) > -1) &&
				!(cache.Find(_T("no-cache")) > -1) &&
				!(pragma.Find(_T("no-cache")) > -1) &&
				!(mime.Find(_T("/html")) > -1)	&&
				!(mime.Find(_T("/xhtml")) > -1)	&&
				(	mime.Find(_T("shockwave-flash")) >= 0 || 
					object.Right(4) == _T(".swf") ||
					mime.Find(_T("text/")) >= 0 || 
					mime.Find(_T("javascript")) >= 0 || 
					mime.Find(_T("image/")) >= 0) )
			{
				bool found = false;
				for( DWORD i = 0; i < cdnRequests.GetCount() && !found; i++ )
					if( !w->host.CompareNoCase(cdnRequests[i]->host) )
						found = true;

				if( !found )
					cdnRequests.Add(w);
			}
		}
	}

	// spawn threads to do each of the lookups
	DWORD count = cdnRequests.GetCount();
	if( count )
	{
		hCDNThreads.RemoveAll();
		reporting = this;
		for( DWORD i = 0; i < count; i++ )
		{
			unsigned int addr = 0;
			HANDLE hThread = (HANDLE)_beginthreadex( 0, 0, ::cdnLookupThread, (void *)i, 0, &addr);
			if( hThread )
				hCDNThreads.Add(hThread);
		}
	}
}

/*-----------------------------------------------------------------------------
	Thread doing the actual CDN lookups
-----------------------------------------------------------------------------*/
void CPagetestReporting::cdnLookupThread(DWORD index)
{
	// do a single lookup for the entry that is our responsibility
	if( index < cdnRequests.GetCount() )
	{
		// we don't care about the result right now, it will get cached for later
		CString provider;
		IsCDN(cdnRequests[index], provider);
	}
}

/*-----------------------------------------------------------------------------
	Calculate the AFT
-----------------------------------------------------------------------------*/
DWORD CPagetestReporting::CalculateAFT()
{
  DWORD msAFT = 0;
  ATLTRACE(_T("[Pagetest] - ***** CPagetestReporting::FlushResults - Calculating AFT\n"));
  CAFT aftEngine(aftMinChanges, aftEarlyCutoff);
  aftEngine.SetCrop(0, 12, 12, 0);

  screenCapture.Lock();
  CxImage * last_image = NULL;
  CString file_name;
  POSITION pos = screenCapture._captured_images.GetHeadPosition();
  while (pos) 
  {
    CapturedImage& image = screenCapture._captured_images.GetNext(pos);
    DWORD image_time = 0;
    if (image._capture_time.QuadPart > start)
      image_time = (DWORD)((image._capture_time.QuadPart - start) / msFreq);
    CxImage * img = new CxImage;
    if (image.Get(*img)) 
    {
      img->Resample2(img->GetWidth() / 2, img->GetHeight() / 2);
      if (last_image) 
      {
        if (ImagesAreDifferent(last_image, img)) 
        {
          aftEngine.AddImage( img, image_time );
        }
      } 
      else 
        aftEngine.AddImage( img, image_time );

      if (last_image)
        delete last_image;
      last_image = img;
    }
    else
      delete img;
  }

  bool confidence;
  CxImage imgAft;
  aftEngine.Calculate(msAFT, confidence, &imgAft);
  imgAft.Save(logFile + _T("_aft.png"), CXIMAGE_FORMAT_PNG);

  if (last_image)
    delete last_image;
  screenCapture.Unlock();

  return msAFT;
}

/*-----------------------------------------------------------------------------
	Save out the video
-----------------------------------------------------------------------------*/
void CPagetestReporting::SaveVideo()
{
  screenCapture.Lock();
  CxImage * last_image = NULL;
  CString file_name;
  POSITION pos = screenCapture._captured_images.GetHeadPosition();
  while (pos) 
  {
    CapturedImage& image = screenCapture._captured_images.GetNext(pos);
    DWORD image_time = 0;
    if (image._capture_time.QuadPart > start)
      image_time = (DWORD)((image._capture_time.QuadPart - start) / msFreq);

    // we save the frames in increments of 100ms, round it to the closest interval
    image_time = ((image_time + 50) / 100);
    CxImage * img = new CxImage;
    if (image.Get(*img)) 
    {
      // shrink it down to 400xX which is the size for a 2-video comparison
      int width = img->GetWidth();
      int height = img->GetHeight();
      int newWidth = min(400, width / 2);
      int newHeight = (int)((double)height * ((double)newWidth / (double)width));
      img->Resample2(newWidth, newHeight);
      if (last_image) 
      {
        if (ImagesAreDifferent(last_image, img)) {
          file_name.Format(_T("%s_progress_%04d.jpg"), (LPCTSTR)logFile, image_time);
          SaveProgressImage(*img, file_name, false, imageQuality);
          msVisualComplete = (DWORD)((image._capture_time.QuadPart - start) / msFreq);
        }
      } 
      else 
      {
        // always save the first image at time zero
        file_name = logFile + _T("_progress_0000.jpg");
        SaveProgressImage(*img, file_name, false, imageQuality);
      }

      if (last_image)
        delete last_image;
      last_image = img;
    }
    else
      delete img;
  }
  if (last_image)
    delete last_image;
  screenCapture.Unlock();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CPagetestReporting::ImagesAreDifferent(CxImage * img1, CxImage* img2) 
{
  bool different = true;

  if (img1 && img2 && img1->GetBpp() == img2->GetBpp())
  {
    // first, make them both the size of img1
    DWORD width = img1->GetWidth();
    DWORD height = img1->GetHeight();
    RGBQUAD black = {0,0,0,0};
    if (img2->GetWidth() > width)
      img2->Crop(0, 0, img2->GetWidth() - width, 0);
    if (img2->GetHeight() > height)
      img2->Crop(0, 0, 0, img2->GetHeight() - height);
    if (img2->GetWidth() < width)
      img2->Expand(0, 0, width - img2->GetWidth(), 0, black);
    if (img2->GetHeight() < height)
      img2->Expand(0, 0, 0, height - img2->GetHeight(), black);

    if (img1->GetWidth() == img2->GetWidth() && img1->GetHeight() == img2->GetHeight()) 
    {
      different = false;
      if (img1->GetBpp() >= 15) 
      {
        DWORD pixel_bytes = 3;
        if (img1->GetBpp() == 32)
          pixel_bytes = 4;
        DWORD width = img1->GetWidth();
        DWORD height = img1->GetHeight();
        DWORD row_length = width * pixel_bytes;
        for (DWORD row = 0; row < height && !different; row++) 
        {
          BYTE * r1 = img1->GetBits(row);
          BYTE * r2 = img2->GetBits(row);
          if (r1 && r2 && memcmp(r1, r2, row_length))
            different = true;
        }
      }
    }
  }

  return different;
}
