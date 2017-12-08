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
#include "TestState.h"
#include <atlutil.h>
#include <Mmsystem.h>
#include "Psapi.h"

CTestState::CTestState(void):
	hTimer(0)
	,lastBytes(0)
	,lastCpuIdle(0)
  ,lastCpuKernel(0)
  ,lastCpuUser(0)
	,lastTime(0)
	,imageCount(0)
	,lastImageTime(0)
	,lastRealTime(0)
	,cacheCleared(false)
  ,heartbeatEvent(NULL)
{
	// Load the ad regular expressions from disk.
	LoadAdPatterns();
}

CTestState::~CTestState(void)
{
  if( heartbeatEvent )
    CloseHandle(heartbeatEvent);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CTestState::Reset(void)
{
	__super::Reset();
	
	EnterCriticalSection(&cs);
	currentState = READYSTATE_UNINITIALIZED;
	painted = false;
	SetBrowserWindowUpdated(true);
	LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
	Do all of the startup checks and evaluations
-----------------------------------------------------------------------------*/
void CTestState::DoStartup(CString& szUrl, bool initializeDoc)
{
	USES_CONVERSION;
	CString msg;
	
	if( !active && available )
	{
		msg.Format(_T("[Pagetest] *** DoStartup() - '%s'\n"), (LPCTSTR)szUrl);
		OutputDebugString(msg);
		
		bool ok = true;

		CheckABM();

		domElementId.Empty();
		domRequest.Empty();
		domRequestType = END;
		endRequest.Empty();

		if( interactive )
		{
			checkOpt = true;

			if( runningScript )
			{
				CString szEventName = szUrl;				// default this to the url for right now
				if( !script_eventName.IsEmpty() )
					szEventName = script_eventName;
				domElementId = script_domElement;
				domRequest = script_domRequest;
				domRequestType = script_domRequestType;
				endRequest = script_endRequest;
				
				if( script_timeout != -1 )
					timeout = script_timeout;

				if( script_activity_timeout )
					activityTimeout = script_activity_timeout;

				if( !szEventName.IsEmpty() && szEventName == somEventName )
					ok = false;
				else
					somEventName = szEventName;
			}
		}
		else
		{
			// load the automation settings from the registry
			CRegKey key;		
			if( key.Open(HKEY_CURRENT_USER, _T("Software\\America Online\\SOM"), KEY_READ | KEY_WRITE) == ERROR_SUCCESS )
			{
				CString szEventName = szUrl;				// default this to the url for right now

				TCHAR buff[100000];
				ULONG len = sizeof(buff) / sizeof(TCHAR);

				if( key.QueryStringValue(_T("EventName"), buff, &len) == ERROR_SUCCESS )
					szEventName = buff;

				if( runningScript )
				{
					if( script_active )
					{
						if( !script_eventName.IsEmpty() )
						{
							if( szEventName.IsEmpty() )
								szEventName = script_eventName;
							else
							{
								if( !szEventName.Replace(_T("%STEP%"), (LPCTSTR)script_eventName) )
									szEventName += CString(_T("_")) + script_eventName;
							}
						}
						domElementId = script_domElement;
						domRequest = script_domRequest;
						domRequestType = script_domRequestType;
						endRequest = script_endRequest;
					}
					else
						ok = false;
				}
				else
				{
					len = sizeof(buff) / sizeof(TCHAR);
					if( key.QueryStringValue(_T("DOM Element ID"), buff, &len) == ERROR_SUCCESS )
						if( lstrlen(buff) )
							domElementId = buff;
					key.DeleteValue(_T("DOM Element ID"));
				}

				len = sizeof(buff) / sizeof(TCHAR);
				logFile.Empty();
				if( key.QueryStringValue(_T("IEWatchLog"), buff, &len) == ERROR_SUCCESS )
					logFile = buff;
					
				len = sizeof(buff) / sizeof(TCHAR);
				linksFile.Empty();
				if( key.QueryStringValue(_T("Links File"), buff, &len) == ERROR_SUCCESS )
					linksFile = buff;
				key.DeleteValue(_T("Links File"));

				len = sizeof(buff) / sizeof(TCHAR);
				s404File.Empty();
				if( key.QueryStringValue(_T("404 File"), buff, &len) == ERROR_SUCCESS )
					s404File = buff;
				key.DeleteValue(_T("404 File"));

				len = sizeof(buff) / sizeof(TCHAR);
				htmlFile.Empty();
				if( key.QueryStringValue(_T("HTML File"), buff, &len) == ERROR_SUCCESS )
					htmlFile = buff;
				key.DeleteValue(_T("HTML File"));

				len = sizeof(buff) / sizeof(TCHAR);
				cookiesFile.Empty();
				if( key.QueryStringValue(_T("Cookies File"), buff, &len) == ERROR_SUCCESS )
					cookiesFile = buff;
				key.DeleteValue(_T("Cookies File"));

				// if we're running a script, the block list will come from the script
				if( !runningScript )
				{
					len = sizeof(buff) / sizeof(TCHAR);
					blockRequests.RemoveAll();
					if( key.QueryStringValue(_T("Block"), buff, &len) == ERROR_SUCCESS )
					{
						CString block = buff;
						int pos = 0;
						CString token = block.Tokenize(_T(" "), pos);
						while( pos >= 0 )
						{
							token.Trim();
							blockRequests.AddTail(token);
							token = block.Tokenize(_T(" "), pos);
						}
					}
					key.DeleteValue(_T("Block"));
				}

				len = sizeof(buff) / sizeof(TCHAR);
				basicAuth.Empty();
				if( key.QueryStringValue(_T("Basic Auth"), buff, &len) == ERROR_SUCCESS )
				{
					basicAuth = buff;
					script_basicAuth = buff;
				}
				key.DeleteValue(_T("Basic Auth"));

				if( ok )
				{
					if( runningScript )
						logUrl[0]=0;
					else
					{
						len = _countof(logUrl);
						key.QueryStringValue(_T("URL"), logUrl, &len);
					}
					key.QueryDWORDValue(_T("Cached"), cached);
					includeObjectData = 1;
					key.QueryDWORDValue(_T("Include Object Data"), includeObjectData);
					saveEverything = 0;
					key.QueryDWORDValue(_T("Save Everything"), saveEverything);
					captureVideo = 0;
					key.QueryDWORDValue(_T("Capture Video"), captureVideo);
					checkOpt = 1;
					key.QueryDWORDValue(_T("Check Optimizations"), checkOpt);
					ignoreSSL = 0;
					key.QueryDWORDValue(_T("ignoreSSL"), ignoreSSL);
					blockads = 0;
					key.QueryDWORDValue(_T("blockads"), blockads);
					pngScreenShot = 0;
					key.QueryDWORDValue(_T("pngScreenShot"), pngScreenShot);
					imageQuality = JPEG_DEFAULT_QUALITY;
					key.QueryDWORDValue(_T("imageQuality"), imageQuality);
          imageQuality = max(JPEG_DEFAULT_QUALITY, min(100, imageQuality));
					bodies = 0;
					key.QueryDWORDValue(_T("bodies"), bodies);
					htmlbody = 0;
					key.QueryDWORDValue(_T("htmlbody"), htmlbody);
					keepua = 0;
					key.QueryDWORDValue(_T("keepua"), keepua);
					minimumDuration = 0;
					key.QueryDWORDValue(_T("minimumDuration"), minimumDuration);
					clearShortTermCacheSecs = 0;
					key.QueryDWORDValue(_T("clearShortTermCacheSecs"), clearShortTermCacheSecs);
					noHeaders = 0;
					key.QueryDWORDValue(_T("No Headers"), noHeaders);
					noImages = 0;
					key.QueryDWORDValue(_T("No Images"), noImages);

					len = sizeof(buff) / sizeof(TCHAR);
					customHost.Empty();
					if( key.QueryStringValue(_T("Host"), buff, &len) == ERROR_SUCCESS )
						customHost = buff;

          if( !heartbeatEvent )
          {
					  len = sizeof(buff) / sizeof(TCHAR);
					  if( key.QueryStringValue(_T("Heartbeat Event"), buff, &len) == ERROR_SUCCESS )
              heartbeatEvent = OpenEvent(EVENT_MODIFY_STATE, FALSE, buff);
          }
          if( heartbeatEvent )
            SetEvent(heartbeatEvent);

					if( !runningScript )
					{
						len = _countof(descriptor);
						key.QueryStringValue(_T("Descriptor"), descriptor, &len);

						// delete values that shouldn't be re-used
						key.DeleteValue(_T("Descriptor"));
						key.DeleteValue(_T("URL"));
						key.DeleteValue(_T("Cached"));
						key.DeleteValue(_T("Save Everything"));
						key.DeleteValue(_T("ignoreSSL"));
						key.DeleteValue(_T("Host"));
					}

				  len = sizeof(buff) / sizeof(TCHAR);
				  if( key.QueryStringValue(_T("customRules"), buff, &len) == ERROR_SUCCESS && len > 1 ) {
            CString rules = buff;
            int pos = 0;
            CString rule = rules.Tokenize(_T("\n"), pos);
            while (pos >= 0) {
              rule = rule.Trim();
              if (rule.GetLength()) {
                int separator = rule.Find(_T('='));
                if (separator > 0) {
                  CString name = rule.Left(separator).Trim();
                  rule = rule.Mid(separator + 1).Trim();
                  int separator = rule.Find(_T('\t'));
                  if (separator > 0) {
                    CString mime = rule.Left(separator).Trim();
                    rule = rule.Mid(separator + 1).Trim();
                    if (name.GetLength() && mime.GetLength() && rule.GetLength()) {
                      CCustomRule newrule;
                      newrule.name = name;
                      newrule.mime = mime;
                      newrule.regex = rule;
                      customRules.AddTail(newrule);
                    }
                  }
                }
              }
              rule = rules.Tokenize(_T("\n"), pos);
            }
				  }
          customMetrics.RemoveAll();
				  len = sizeof(buff) / sizeof(TCHAR);
				  if( key.QueryStringValue(_T("customMetricsFile"), buff, &len) == ERROR_SUCCESS && len > 1 ) {
            HANDLE hFile = CreateFile(buff, GENERIC_READ, 0, 0, OPEN_EXISTING, 0, 0);
            if (hFile != INVALID_HANDLE_VALUE) {
              DWORD custom_len = GetFileSize(hFile, NULL);
              if (custom_len) {
                char * custom_metrics = (char *)malloc(custom_len + 1);
                char * decoded = (char *)malloc(custom_len + 1);
                if (custom_metrics && decoded) {
                  custom_metrics[custom_len] = 0;
                  DWORD bytes = 0;
                  if (ReadFile(hFile, custom_metrics, custom_len, &bytes, 0) && bytes == custom_len) {
                    char * line = strtok(custom_metrics, "\r\n");
                    while (line) {
                      CStringA metric_line(line);
                      int divider = metric_line.Find(":");
                      if (divider > 0) {
                        CCustomMetric metric;
                        metric.name = (LPCTSTR)CA2T((LPCSTR)metric_line.Left(divider));
                        CStringA code = metric_line.Mid(divider + 1);
                        int nDestLen = custom_len;
                        if (Base64Decode((LPCSTR)code, code.GetLength(), (BYTE*)decoded, &nDestLen) && nDestLen) {
                          decoded[nDestLen] = 0;
                          metric.code = (LPCTSTR)CA2T(decoded);
                          customMetrics.AddTail(metric);
                        }
                      }
                      line = strtok(NULL, "\r\n");
                    }
                  }
                  free(decoded);
                  free(custom_metrics);
                }
              }
              CloseHandle(hFile);
            }
          }

				  key.DeleteValue(_T("Basic Auth"));

					// make sure the event name has changed
					// this is to prevent a page with navigate script on it 
					// from adding test entries to the log file
					if( !szEventName.IsEmpty() && szEventName == somEventName )
					{
						msg.Format(_T("[Pagetest] *** Ingoring event, event name has not changed - '%s'\n"), (LPCTSTR)somEventName);
						OutputDebugString(msg);
						ok = false;
					}
					else
						somEventName = szEventName;
				}

				key.Close();
			}
			else
				ok = false;

			// load iewatch settings
			if( ok )
			{
				if( script_activity_timeout )
					activityTimeout = script_activity_timeout;

				if( key.Open(HKEY_CURRENT_USER, _T("SOFTWARE\\AOL\\ieWatch"), KEY_READ) == ERROR_SUCCESS )
				{
					if( runningScript && script_timeout != -1 )
						timeout = script_timeout;
					else
						key.QueryDWORDValue(_T("Timeout"), timeout);
					
					key.Close();
				}		
				
				if( key.Open(HKEY_LOCAL_MACHINE, _T("SOFTWARE\\AOL\\ieWatch"), KEY_READ) == ERROR_SUCCESS )
				{
					key.QueryDWORDValue(_T("Include Header"), includeHeader);
					key.Close();
				}		
			}
			#ifdef _DEBUG
			timeout = timeout * 10;
			#endif
		}

    // Delete short lifetime cache elements if configured (Blaze patch)
    // TODO: replace this with proper cache aging if we can figure out how to do it
    if( ok && cached && clearShortTermCacheSecs > 0 )
      ClearShortTermCache(clearShortTermCacheSecs);

		// clear the cache if necessary (extra precaution)
		if( ok && !cached && !cacheCleared )
		{
      HANDLE hEntry;
	    DWORD len, entry_size = 0;
      GROUPID id;
      INTERNET_CACHE_ENTRY_INFO * info = NULL;
      HANDLE hGroup = FindFirstUrlCacheGroup(0, CACHEGROUP_SEARCH_ALL, 0, 0, &id, 0);
      if (hGroup) {
	      do {
          len = entry_size;
          hEntry = FindFirstUrlCacheEntryEx(NULL, 0, 0xFFFFFFFF, id, info, &len, NULL, NULL, NULL);
          if (!hEntry && GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
            entry_size = len;
            info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
            if (info) {
              hEntry = FindFirstUrlCacheEntryEx(NULL, 0, 0xFFFFFFFF, id, info, &len, NULL, NULL, NULL);
            }
          }
          if (hEntry && info) {
            bool ok = true;
            do {
              DeleteUrlCacheEntry(info->lpszSourceUrlName);
              len = entry_size;
              if (!FindNextUrlCacheEntryEx(hEntry, info, &len, NULL, NULL, NULL)) {
                if (GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
                  entry_size = len;
                  info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
                  if (info) {
                    if (!FindNextUrlCacheEntryEx(hEntry, info, &len, NULL, NULL, NULL)) {
                      ok = false;
                    }
                  }
                } else {
                  ok = false;
                }
              }
            } while (ok);
          }
          if (hEntry) {
            FindCloseUrlCache(hEntry);
          }
          DeleteUrlCacheGroup(id, CACHEGROUP_FLAG_FLUSHURL_ONDELETE, 0);
	      } while(FindNextUrlCacheGroup(hGroup, &id,0));
	      FindCloseUrlCache(hGroup);
      }

      len = entry_size;
      hEntry = FindFirstUrlCacheEntryEx(NULL, 0, 0xFFFFFFFF, 0, info, &len, NULL, NULL, NULL);
      if (!hEntry && GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
        entry_size = len;
        info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
        if (info) {
          hEntry = FindFirstUrlCacheEntryEx(NULL, 0, 0xFFFFFFFF, 0, info, &len, NULL, NULL, NULL);
        }
      }
      if (hEntry && info) {
        bool ok = true;
        do {
          DeleteUrlCacheEntry(info->lpszSourceUrlName);
          len = entry_size;
          if (!FindNextUrlCacheEntryEx(hEntry, info, &len, NULL, NULL, NULL)) {
            if (GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
              entry_size = len;
              info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
              if (info) {
                if (!FindNextUrlCacheEntryEx(hEntry, info, &len, NULL, NULL, NULL)) {
                  ok = false;
                }
              }
            } else {
              ok = false;
            }
          }
        } while (ok);
      }
      if (hEntry) {
        FindCloseUrlCache(hEntry);
      }

      len = entry_size;
      hEntry = FindFirstUrlCacheEntry(NULL, info, &len);
      if (!hEntry && GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
        entry_size = len;
        info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
        if (info) {
          hEntry = FindFirstUrlCacheEntry(NULL, info, &len);
        }
      }
      if (hEntry && info) {
        bool ok = true;
        do {
          DeleteUrlCacheEntry(info->lpszSourceUrlName);
          len = entry_size;
          if (!FindNextUrlCacheEntry(hEntry, info, &len)) {
            if (GetLastError() == ERROR_INSUFFICIENT_BUFFER && len) {
              entry_size = len;
              info = (INTERNET_CACHE_ENTRY_INFO *)realloc(info, len);
              if (info) {
                if (!FindNextUrlCacheEntry(hEntry, info, &len)) {
                  ok = false;
                }
              }
            } else {
              ok = false;
            }
          }
        } while (ok);
      }
      if (hEntry) {
        FindCloseUrlCache(hEntry);
      }
      if (info)
	      free(info);

			cacheCleared = true;
		}
		
		if( ok )
		{
			// check for any machine-wide overrides
			CRegKey keyMachine;		
			if( keyMachine.Open(HKEY_LOCAL_MACHINE, _T("Software\\America Online\\Pagetest"), KEY_READ) == ERROR_SUCCESS )
			{
				DWORD val = checkOpt;
				if( ERROR_SUCCESS == keyMachine.QueryDWORDValue(_T("Check Optimizations"), val) )
					checkOpt = val;
				keyMachine.Close();
			}

			// parse any test options that came in on the url
			ParseTestOptions();
			
			msg.Format(_T("[Pagetest] *** DoStartup() - Starting measurement - '%s'\n"), (LPCTSTR)somEventName);
			OutputDebugString(msg);

			// create the dialog if we need to
			Create();

			// delete any old data
			Reset();

			// track the document that everything belongs to
			if( initializeDoc )
			{
				EnterCriticalSection(&cs);
				currentDoc = nextDoc;
				nextDoc++;
				LeaveCriticalSection(&cs);
			}
			
			EnterCriticalSection(&cs);
			active = true;
			available = false;
			reportSt = NONE;
			
			// collect the starting TCP stats
			GetTcpStatistics(&tcpStatsStart);

			// keep the activity tracking up to date
			QueryPerfCounter(lastRequest);
			lastActivity = lastRequest;

      startTime = CTime::GetCurrentTime();
			url = szUrl;
			GetCPUTime(startCPU, startCPUtotal);
			
			LeaveCriticalSection(&cs);

			StartTimer(1, 100);
		}
	}
	else
	{
		msg.Format(_T("[Pagetest] *** DoStartup() - event dropped because we are already active or not available - '%s'\n"), (LPCTSTR)szUrl);
		OutputDebugString(msg);
	}
}

/*-----------------------------------------------------------------------------
	See if the test is complete
-----------------------------------------------------------------------------*/
void CTestState::CheckComplete()
{
	ATLTRACE(_T("[Pagetest] - Checking to see if the test is complete\n"));

  if( heartbeatEvent )
    SetEvent(heartbeatEvent);

	if( active )
	{
		CString buff;
		bool expired = false;
    bool done = false;

	  __int64 now;
	  QueryPerfCounter(now);
	  DWORD elapsed =  (DWORD)((now - start) / freq);

    bool keepOpen = false;
    if (minimumDuration && elapsed < minimumDuration)
      keepOpen = true;

    // only do the request checking if we're actually active
    if( active )
    {
      EnterCriticalSection(&cs);
  		
		  // has our timeout expired?
		  if( !keepOpen && timeout && start )
		  {
			  if( elapsed > timeout )
			  {
				  buff.Format(_T("[Pagetest] - Test timed out (timout set to %d sec)\n"), timeout);
				  OutputDebugString(buff);
  				
				  expired = true;
			  }
			  else
			  {
				  ATLTRACE(_T("[Pagetest] - Elapsed test time: %d sec\n"), elapsed);
			  }
		  }
		  else
		  {
			  ATLTRACE(_T("[Pagetest] - Start time not logged yet\n"));
		  }

		  LeaveCriticalSection(&cs);

		  // see if the DOM element we're interested in appeared yet
		  CheckDOM();

		  // only exit if there isn't an outstanding doc or request
		  if( !keepOpen && ((lastRequest && !currentDoc) || expired || forceDone || errorCode) )
		  {
			  done = forceDone || errorCode != 0;
  			
			  if( !done )
			  {
				  // count the number of open wininet requests
				  EnterCriticalSection(&cs);
				  openRequests = 0;
				  POSITION pos = winInetRequestList.GetHeadPosition();
				  while( pos )
				  {
					  CWinInetRequest * r = winInetRequestList.GetNext(pos);
            if( r && r->valid && !r->end )
            {
              ATLTRACE(_T("[Pagetest] (0x%p) %s%s\n"), r->hRequest, r->host, r->object);
						  openRequests++;
            }
				  }
				  LeaveCriticalSection(&cs);


				  ATLTRACE(_T("[Pagetest] - %d openRequests"), openRequests);

				  // did the DOM element arrive yet (if we're looking for one?)
				  if( (domElement || (domElementId.IsEmpty() && domRequest.IsEmpty())) && requiredRequests.IsEmpty() && !script_waitForJSDone )
				  {
					  // see if we are done (different logic if we're in abm mode or not)
					  if( abm )
					  {
              DWORD elapsed = now > lastActivity && lastActivity ? (DWORD)((now - lastActivity ) / (freq / 1000)) : 0;
              DWORD elapsedRequest = now > lastRequest && lastRequest ? (DWORD)((now - lastRequest ) / (freq / 1000)) : 0;
						  if ( (!openRequests && elapsed > activityTimeout) ||					// no open requests and it's been longer than 2 seconds since the last request
							   (!openRequests && elapsedRequest > REQUEST_ACTIVITY_TIMEOUT) ||	// no open requests and it's been longer than 30 seconds since the last traffic on the wire
							   (openRequests && elapsedRequest > FORCE_ACTIVITY_TIMEOUT) )	// open requests but it's been longer than 60 seconds since the last one (edge case) that touched the wire
						  {
							  done = true;
                expired = false;
							  OutputDebugString(_T("[Pagetest] ***** Measured as Web 2.0\n"));
						  }
					  }
					  else
					  {
						  if( lastDoc )	// make sure we actually measured a document - shouldn't be possible to not be set but just to be safe
						  {
							  DWORD elapsed = (DWORD)((now - lastDoc) / (freq / 1000));
							  if( elapsed > DOC_TIMEOUT )
							  {
								  done = true;
                  expired = false;
								  OutputDebugString(_T("[Pagetest] ***** Measured as Web 1.0\n"));
							  }
						  }
					  }
				  }
			  }
			  else
			  {
				  buff.Format(_T("[Pagetest] - Force exit. Error code = %d (0x%08X)\n"), errorCode, errorCode);
				  OutputDebugString(buff);
			  }
      }
    }
			
		if ( !keepOpen && (expired || done) )
		{
		  CString buff;
		  buff.Format(_T("[Pagetest] ***** Page Done\n")
					  _T("[Pagetest]          Document ended: %0.3f sec\n")
					  _T("[Pagetest]          Last Activity:  %0.3f sec\n")
					  _T("[Pagetest]          DOM Element:  %0.3f sec\n"),
					  !endDoc ? 0.0 : (double)(endDoc-start) / (double)freq,
					  !lastRequest ? 0.0 : (double)(lastRequest-start) / (double)freq,
					  !domElement ? 0.0 : (double)(domElement-start) / (double)freq);
		  OutputDebugString(buff);

      // see if we are combining multiple script steps (in which case we need to start again)
      if( runningScript && script_combineSteps && script_combineSteps != 1 && !script.IsEmpty() )
      {
        if( script_combineSteps > 1 )
          script_combineSteps--;

        // do some basic resetting
        end = 0;
        lastRequest = 0;
        lastActivity = 0;
        endDoc = 0;

        ContinueScript(false);
      }
      else
      {
        GetCPUTime(endCPU, endCPUtotal);
        
		    // keep track of the end time in case there wasn't a document
		    if( !end || abm )
			    end = lastRequest;

		    // put some text on the browser window to indicate we're done
		    double sec = (start && end > start) ? (double)(end - start) / (double)freq: 0;
		    if( !expired )
			    reportSt = TIMER;
		    else
			    reportSt = QUIT_NOEND;

		    RepaintWaterfall();

		    // kill the background timer
		    if( hTimer )
		    {
			    DeleteTimerQueueTimer(NULL, hTimer, NULL);
			    hTimer = 0;
			    timeEndPeriod(1);
		    }

		    // get a screen shot of the fully loaded page
		    if( saveEverything )
        {
          FindBrowserWindow();
			    screenCapture.Capture(hBrowserWnd, CapturedImage::FULLY_LOADED);
        }

		    // write out any results (this will also kill the timer)
		    FlushResults();
      }
    }
	}
}

/*-----------------------------------------------------------------------------
	See if the browser's readystate has changed
-----------------------------------------------------------------------------*/
void CTestState::CheckReadyState(void)
{
  if (!m_spChromeFrame)
  {
	  // figure out the old state (first non-complete browser window)
	  EnterCriticalSection(&cs);
	  READYSTATE oldState = READYSTATE_COMPLETE;
	  POSITION pos = browsers.GetHeadPosition();
	  while( pos && oldState == READYSTATE_COMPLETE )
	  {
		  CBrowserTracker tracker = browsers.GetNext(pos);
		  if( tracker.state != READYSTATE_COMPLETE )
			  oldState = tracker.state;
	  }
  	
	  // update the state for all browsers in this thread
	  CAtlList<CComPtr<IWebBrowser2>> browsers2;
	  pos = browsers.GetHeadPosition();
	  while( pos )
	  {
		  POSITION oldPos = pos;
		  CBrowserTracker tracker = browsers.GetNext(pos);
		  if(tracker.browser && tracker.threadId == GetCurrentThreadId())
			  tracker.browser->get_ReadyState(&(browsers.GetAt(oldPos).state));
	  }

	  // see what the new state is
	  READYSTATE newState = READYSTATE_COMPLETE;
	  pos = browsers.GetHeadPosition();
	  while( pos && newState == READYSTATE_COMPLETE )
	  {
		  CBrowserTracker tracker = browsers.GetNext(pos);
		  if( tracker.state != READYSTATE_COMPLETE )
			  newState = tracker.state;
	  }
	  LeaveCriticalSection(&cs);

	  if( newState != oldState )
	  {
		  currentState = newState;
		  CString state;
		  switch(currentState)
		  {
			  case READYSTATE_UNINITIALIZED: state = "Uninitialized"; break;
			  case READYSTATE_LOADING: state = "Loading"; break;
			  case READYSTATE_LOADED: state = "Loaded"; break;
			  case READYSTATE_INTERACTIVE: state = "Interactive"; break;
			  case READYSTATE_COMPLETE: 
					  {
						  state = "Complete"; 
  						
						  // force a DocumentComplete in case we never got notified
						  if( active && currentDoc )
							  DocumentComplete(url);
					  }
					  break;
			  default: state = "Unknown"; break;
		  }
  		
		  CString buff;
		  buff.Format(_T("Browser ReadyState changed to %s\n"), (LPCTSTR)state);
      StatusUpdate(buff);
		  OutputDebugString(buff);
	  }
  }
}


/*-----------------------------------------------------------------------------
	Check to see if a specific DOM element we're looking for has been loaded yet
-----------------------------------------------------------------------------*/
void CTestState::CheckDOM(void)
{
	// don't bother if we already found it
	if(!domElementId.IsEmpty() && !domElement && startRender)
	{
		if( FindDomElementByAttribute(domElementId) )
		{
			QueryPerfCounter(domElement);
			lastRequest = lastActivity = domElement;
		
			CString buff;
			buff.Format(_T("[Pagetest] * DOM Element ID '%s' appeared\n"), (LPCTSTR)domElementId);
			OutputDebugString(buff);
			
			if( saveEverything )
      {
        FindBrowserWindow();
        screenCapture.Capture(hBrowserWnd, CapturedImage::DOM_ELEMENT);
      }
		}
	}
}

/*-----------------------------------------------------------------------------
	Check to see if anything was drawn to the screen
-----------------------------------------------------------------------------*/
void CTestState::PaintEvent(int x, int y, int width, int height) {
  if (active) {
    SetBrowserWindowUpdated(true);
    CheckWindowPainted();
  }
}

/*-----------------------------------------------------------------------------
	Check to see if anything was drawn to the screen
-----------------------------------------------------------------------------*/
void CTestState::CheckWindowPainted()
{
	if( active && !painted && hBrowserWnd && ::IsWindow(hBrowserWnd) && BrowserWindowUpdated() )
	{
		// grab a screen shot of the window
    GdiFlush();
    screenCapture.Lock();
    SetBrowserWindowUpdated(false);
		__int64 now;
		QueryPerfCounter(now);
    const DWORD START_RENDER_MARGIN = 30;

    // grab a screen shot
    CapturedImage captured_img(hBrowserWnd,CapturedImage::START_RENDER);
    captured_img._capture_time.QuadPart = now;
    CxImage img;
    if (captured_img.Get(img) && 
        img.GetWidth() > START_RENDER_MARGIN * 2 &&
        img.GetHeight() > START_RENDER_MARGIN * 2) 
    {
      int bpp = img.GetBpp();
      if (bpp >= 15) 
      {
        int height = img.GetHeight();
        int width = img.GetWidth();
        // 24-bit gets a fast-path where we can just compare full rows
        if (bpp <= 24 ) 
        {
          DWORD row_bytes = 3 * (width - (START_RENDER_MARGIN * 2));
          char * white = (char *)malloc(row_bytes);
          if (white) 
          {
            memset(white, 0xFFFFFFFF, row_bytes);
            for (DWORD row = START_RENDER_MARGIN; row < height - START_RENDER_MARGIN && !painted; row++) 
            {
              char * image_bytes = (char *)img.GetBits(row) + START_RENDER_MARGIN;
              if (memcmp(image_bytes, white, row_bytes))
                painted = true;
            }
            free (white);
          }
        } 
        else 
        {
          for (DWORD row = START_RENDER_MARGIN; row < height - START_RENDER_MARGIN && !painted; row++) 
          {
            for (DWORD x = START_RENDER_MARGIN; x < width - START_RENDER_MARGIN && !painted; x++) 
            {
              RGBQUAD pixel = img.GetPixelColor(x, row, false);
              if (pixel.rgbBlue != 255 || pixel.rgbRed != 255 || pixel.rgbGreen != 255)
                painted = true;
            }
          }
        }
      }
    }

    if (painted) {
			startRender = now;
			OutputDebugString(_T("[Pagetest] * Render Start (Painted)"));
      screenCapture._captured_images.AddTail(captured_img);
    }
    else
      captured_img.Free();

    screenCapture.Unlock();
	}
}

/*-----------------------------------------------------------------------------
	Parse the test options string
-----------------------------------------------------------------------------*/
void CTestState::ParseTestOptions()
{
	TCHAR buff[4096];
	if( !testOptions.IsEmpty() )
	{
		int pos = 0;
		do
		{
			// commands are separated by & just like query parameters
			CString token = testOptions.Tokenize(_T("&"), pos);
			if( token.GetLength() )
			{
				int index = token.Find(_T('='));
				if( index > 0 )
				{
					CString command = token.Left(index).Trim();
					if( command.GetLength() )
					{
						// any values need to be escaped since it  is passed in on the url so un-escape it
						CString tmp = token.Mid(index + 1);
						DWORD len;
						if( AtlUnescapeUrl((LPCTSTR)tmp, buff, &len, _countof(buff)) )
						{
							CString value = buff;
							value = value.Trim();
						
							// now handle the actual command
							if( !command.CompareNoCase(_T("ptBlock")) )
							{
								// block the specified request
								blockRequests.AddTail(value);
							}
							if( !command.CompareNoCase(_T("ptAds")) )
							{
								// block aol-specific ad calls
								if( !value.CompareNoCase(_T("none")) || !value.CompareNoCase(_T("block")) )
								{
									blockRequests.AddTail(_T("adsWrapper.js"));
									blockRequests.AddTail(_T("adsWrapperAT.js"));
									blockRequests.AddTail(_T("adsonar.js"));
									blockRequests.AddTail(_T("sponsored_links1.js"));
									blockRequests.AddTail(_T("switcher.dmn.aol.com"));
								}
							}
						}
					}
				}
			}
		}while( pos >= 0 );
	}

	// see if the DOM element was really a DOM request in hiding
	if( domElementId.GetLength() )
	{
		int pos = 0;
		CString action = domElementId.Tokenize(_T("="), pos).Trim();
		if( pos != -1 )
		{
			CString val = domElementId.Tokenize(_T("="), pos).Trim();
			if( val.GetLength() )
			{
				if( !action.CompareNoCase(_T("RequestEnd")) )
				{
					domRequest = val;
					domRequestType = END;
					domElementId.Empty();
				}
				else if( !action.CompareNoCase(_T("RequestTTFB")) )
				{
					domRequest = val;
					domRequestType = TTFB;
					domElementId.Empty();
				}
				else if( !action.CompareNoCase(_T("RequestStart")) )
				{
					domRequest = val;
					domRequestType = START;
					domElementId.Empty();
				}
			}
		}
	}
}

VOID CALLBACK BackgroundTimer(PVOID lpParameter, BOOLEAN TimerOrWaitFired)
{
	if( lpParameter )
		((CTestState *)lpParameter)->BackgroundTimer();
}

/*-----------------------------------------------------------------------------
	Measurement is starting, kick off the background stuff
-----------------------------------------------------------------------------*/
void CTestState::StartMeasuring(void)
{
	// create thee background timer to fire every 100ms
	if( !hTimer && saveEverything && (!runningScript || script_logData) )
	{
		lastBytes = 0;
		lastCpuIdle = 0;
		lastCpuKernel = 0;
		lastCpuUser = 0;
		lastTime = 0;
		imageCount = 0;
		lastImageTime = 0;
		lastRealTime = 0;
		SetBrowserWindowUpdated(true);

		// now find just the browser control
		FindBrowserWindow();
    if( hMainWindow )
    {
			::SetWindowPos(hMainWindow, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOACTIVATE | SWP_NOMOVE | SWP_NOSIZE);
			::UpdateWindow(hMainWindow);
    }

		timeBeginPeriod(1);
		CreateTimerQueueTimer(&hTimer, NULL, ::BackgroundTimer, this, 100, 100, WT_EXECUTEDEFAULT);

		// Force a grab/stats capture now
		BackgroundTimer();
	}
}

/*-----------------------------------------------------------------------------
	Do the 100ms periodic checking
-----------------------------------------------------------------------------*/
void CTestState::BackgroundTimer(void)
{
	// queue up a message in case we're having timer problems
	CheckStuff();
  FindBrowserWindow();

	// timer will only be running while we're active
	EnterCriticalSection(&csBackground);
	const DWORD imageIncrements = 20;	// allow for X screen shots at each increment

	__int64 now;
	QueryPerfCounter(now);
	if( active )
	{
		CProgressData data;
    data.sampleTime = now;

		DWORD ms = 0;
		if( start && now > start )
			ms = (DWORD)((now - start) / msFreq);

		// round to the closest 100ms
		data.ms = ((ms + 50) / 100) * 100;

		// don't re-do everything if we get a burst of timer callbacks
		if( data.ms != lastTime || !lastTime )
		{
			DWORD msElapsed = 0;
			if( data.ms > lastTime )
				msElapsed = data.ms - lastTime;

			double elapsed = 0;
			if( now > lastRealTime && lastRealTime)
				elapsed = (double)(now - lastRealTime) / (double)freq;
			lastRealTime = now;

			// figure out the bandwidth
      if (elapsed > 0) {
        double bits = (bwBytesIn - lastBytes) * 8;
        data.bpsIn = (DWORD)(bits / elapsed);
      }

			// calculate CPU utilization
			FILETIME idle, kernel, user;
			if( GetSystemTimes( &idle, &kernel, &user) )
			{
				ULARGE_INTEGER k, u, i;
				k.LowPart = kernel.dwLowDateTime;
				k.HighPart = kernel.dwHighDateTime;
				u.LowPart = user.dwLowDateTime;
				u.HighPart = user.dwHighDateTime;
				i.LowPart = idle.dwLowDateTime;
				i.HighPart = idle.dwHighDateTime;
				if( lastCpuIdle || lastCpuKernel || lastCpuUser )
				{
          __int64 idle = i.QuadPart - lastCpuIdle;
          __int64 kernel = k.QuadPart - lastCpuKernel;
          __int64 user = u.QuadPart - lastCpuUser;
          int cpu_utilization = (int)((((kernel + user) - idle) * 100) / (kernel + user));
          data.cpu = max(min(cpu_utilization, 100), 0);
				}
        lastCpuIdle = i.QuadPart;
        lastCpuKernel = k.QuadPart;
        lastCpuUser = u.QuadPart;
			}

			// get the memory use (working set - task-manager style)
			PROCESS_MEMORY_COUNTERS mem;
			mem.cb = sizeof(mem);
			if( GetProcessMemoryInfo(GetCurrentProcess(), &mem, sizeof(mem)) )
				data.mem = mem.WorkingSetSize / 1024;

			// interpolate across multiple time periods
			if( msElapsed > 100 )
			{
				DWORD chunks = msElapsed / 100;
				for( DWORD i = 1; i < chunks; i++ )
				{
					CProgressData d;
					d.ms = lastTime + (i * 100);
					d.cpu = data.cpu;				// CPU time was already spread over the period
					d.bpsIn = data.bpsIn / chunks;	// split bandwidth evenly across the time slices
					d.mem = data.mem;				// just assign them all the same memory use (could interpolate but probably not worth it)
					progressData.AddTail(d);
				}

				data.bpsIn /= chunks;	// bandwidth is the only measure in the main chunk that needs to be adjusted
			}

			bool grabImage = false;
      if( !lastImageTime )
      {
        if( captureVideo && hBrowserWnd && IsWindow(hBrowserWnd) )
          grabImage = true;
      }
			else if( painted && captureVideo && hBrowserWnd && IsWindow(hBrowserWnd) && BrowserWindowUpdated() )
			{
				// see what time increment we are in
				// we go from 0.1 second to 1 second to 5 second intervals
				// as we get more and more screen shots
				DWORD minTime = 100;
				if( imageCount >= imageIncrements )
					minTime = 1000;
				if( imageCount >= imageIncrements * 2 )
					minTime = 5000;

				if( data.ms > lastImageTime && (data.ms - lastImageTime) >= minTime )
					grabImage = true;
			}

			if( grabImage )
			{
				ATLTRACE(_T("[Pagetest] - Grabbing video frame : %d ms\n"), data.ms);
        if( painted )
				  SetBrowserWindowUpdated(false);
        screenCapture.Capture(hBrowserWnd, CapturedImage::VIDEO);
				imageCount++;
				lastImageTime = data.ms;
				if( !lastImageTime )
					lastImageTime = 1;
      }

			progressData.AddTail(data);
			lastTime = data.ms;
		}
		lastBytes = bwBytesIn;
	}

	LeaveCriticalSection(&csBackground);
}

/*-----------------------------------------------------------------------------
	Delete any cache items with a lifetime less than cacheTTL
-----------------------------------------------------------------------------*/
#define RATIO_100NANO_TO_SECOND ((_int64)10000000)
void CTestState::ClearShortTermCache(DWORD cacheTTL)
{
  DWORD cacheEntryInfoBufferSizeInitial = 0;
  DWORD cacheEntryInfoBufferSize = 0;
  DWORD dwError;
  LPINTERNET_CACHE_ENTRY_INFO lpCacheEntry;
  HANDLE hCacheDir;

  // Determine the size of the first entry, if it exists
  hCacheDir = FindFirstUrlCacheEntry(NULL,0,&cacheEntryInfoBufferSizeInitial);
  if (hCacheDir == NULL && GetLastError() == ERROR_NO_MORE_ITEMS)
    return;

  // Get the current time in a large integer (seems like a weird way to do it, but that's what MSDN dictates...)
  SYSTEMTIME curSysTime;
  GetSystemTime(&curSysTime);
  FILETIME curFileTime;
  SystemTimeToFileTime(&curSysTime, &curFileTime);
  ULONGLONG curTimeSecs = ((((ULONGLONG) curFileTime.dwHighDateTime) << 32) + curFileTime.dwLowDateTime) / RATIO_100NANO_TO_SECOND;

  // Read the first entry
  cacheEntryInfoBufferSize = cacheEntryInfoBufferSizeInitial;
  lpCacheEntry = (LPINTERNET_CACHE_ENTRY_INFO)HeapAlloc(GetProcessHeap(), HEAP_ZERO_MEMORY, cacheEntryInfoBufferSize);
  hCacheDir = FindFirstUrlCacheEntry(NULL, lpCacheEntry, &cacheEntryInfoBufferSizeInitial);
  // Iterate the current and next entries
  BOOL retVal = (hCacheDir != NULL);
  while(retVal)
  {
    cacheEntryInfoBufferSizeInitial = cacheEntryInfoBufferSize;

    // Find out the current time in secs
    ULONGLONG cacheItemTimeSecs = ((((ULONGLONG) lpCacheEntry->ExpireTime.dwHighDateTime) << 32) + lpCacheEntry->ExpireTime.dwLowDateTime) / RATIO_100NANO_TO_SECOND;

    // If the item expires in less than the given limit, delete it
    if (cacheItemTimeSecs < (curTimeSecs + cacheTTL))
  		DeleteUrlCacheEntry(lpCacheEntry->lpszSourceUrlName);

    // Get the next record
  	retVal = FindNextUrlCacheEntry(hCacheDir, lpCacheEntry, &cacheEntryInfoBufferSizeInitial);		
  	if (!retVal)
  	{
  		// If we have no more items, break
  		dwError = GetLastError();
  		if (dwError == ERROR_NO_MORE_ITEMS)
  		{
  			break;
  		}
  		// Otherwise, if the error was insufficient buffer, increase the buffer size
  		if (dwError == ERROR_INSUFFICIENT_BUFFER && cacheEntryInfoBufferSizeInitial > cacheEntryInfoBufferSize)
  		{
  			cacheEntryInfoBufferSize = cacheEntryInfoBufferSizeInitial;
  			// Re-allocate to a larger size
  			lpCacheEntry = (LPINTERNET_CACHE_ENTRY_INFO)HeapReAlloc(GetProcessHeap(),HEAP_ZERO_MEMORY, lpCacheEntry, cacheEntryInfoBufferSize);
  			if (lpCacheEntry)
  				retVal = FindNextUrlCacheEntry(hCacheDir, lpCacheEntry, &cacheEntryInfoBufferSizeInitial);					
  		}
  		else
  			break;
  	}
  }
  
  HeapFree(GetProcessHeap(),0,lpCacheEntry);
  
  // Cleanup the cache dir handle
  FindCloseUrlCache(hCacheDir);
}
