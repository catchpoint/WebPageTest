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
#include "BrowserEvents.h"

CBrowserEvents::CBrowserEvents(void):
	currentFrame(0)
{
}

CBrowserEvents::~CBrowserEvents(void)
{
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CBrowserEvents::Reset(void)
{
	__super::Reset();
	
	EnterCriticalSection(&cs);

	currentFrame = 0;
	navigatedURLs.RemoveAll();
	lastStatus.Empty();

	LeaveCriticalSection(&cs);
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CBrowserEvents::BeforeNavigate(CString & szUrl)
{
    ATLTRACE(_T("[Pagetest] - CBrowserEvents::BeforeNavigate - url = %s"), (LPCTSTR)szUrl);
    
    CheckReadyState();
    
	// only count http and https url's (skip about: and javascript:)
	if( !szUrl.Left(4).CompareNoCase(_T("http")) )
	{
		EnterCriticalSection(&cs);
		
		// if we don't have a page we're tracking yet, start now
		if( !active && available )
		{
			LeaveCriticalSection(&cs);
			
			DoStartup(szUrl, true);
			
			EnterCriticalSection(&cs);
			navigatedURLs.AddTail(szUrl);
			LeaveCriticalSection(&cs);

			CString buff;
			buff.Format(_T("[Pagetest] * Before Navigate - %s\n"), (LPCTSTR)szUrl);
			OutputDebugString(buff);
			
			CheckStuff();

			// create an event for the page
			CPageEvent * p = new CPageEvent(currentDoc);
			AddEvent(p);

			EnterCriticalSection(&cs);
		}
		else if(active)
		{
			CString buff;
			buff.Format(_T("[Pagetest] * Before Navigate - %s\n"), (LPCTSTR)szUrl);
			OutputDebugString(buff);
			
			navigatedURLs.AddTail(szUrl);
			LeaveCriticalSection(&cs);
			
			CheckStuff();

			// track the document that everything belongs to
			EnterCriticalSection(&cs);
			currentDoc = nextDoc;
			nextDoc++;

			QueryPerfCounter(lastRequest);
			lastActivity = lastRequest;
		}

		LeaveCriticalSection(&cs);
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CBrowserEvents::NavigateComplete(CComPtr<IWebBrowser2> browser, CString & szUrl)
{
  #ifndef PAGETEST_EXE
	if( active && browser && webpagetestDom )
	{
	  CComPtr<IDispatch> spDoc;
	  if( SUCCEEDED(browser->get_Document(&spDoc)) && spDoc )
	  {
		  CComQIPtr<IHTMLDocument2> doc = spDoc;
	    CComPtr<IHTMLWindow2> spWindow;
      if( doc && SUCCEEDED(doc->get_parentWindow(&spWindow)) && spWindow )
      {
        CComQIPtr<IDispatchEx> spWndEx = spWindow;
        if( spWndEx )
        {
          DISPID dispid;
          if( SUCCEEDED(spWndEx->GetDispID(L"webpagetest", fdexNameEnsure, &dispid) ) )
          {
            IDispatch * ptr;
            if( SUCCEEDED(webpagetestDom->QueryInterface(IID_IDispatch, (void**)&ptr)) && ptr )
            {
              VARIANT dispatch;
              dispatch.vt = VT_DISPATCH;
              dispatch.pdispVal = ptr;

              DISPPARAMS disp;
              disp.rgvarg = &dispatch;
              disp.cArgs = 1;
              disp.cNamedArgs = 0;
              disp.rgdispidNamedArgs = NULL;

              HRESULT hr = spWndEx->Invoke(dispid, IID_NULL, LOCALE_USER_DEFAULT, DISPATCH_PROPERTYPUT, &disp, NULL, NULL, NULL);
              if( SUCCEEDED(hr) )
              {
                ATLTRACE(_T("[Pagetest] - Attached webpagetest object to the window"));
              }
            }
          }
        }
      }
    }
  }
  #endif
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CBrowserEvents::DocumentComplete(CString & szUrl, DWORD code)
{
	CheckReadyState();
	
	// make sure we are actually measuring something
	if( active )
	{
		CheckStuff();

		EnterCriticalSection(&cs);

		// if we got an error code, use it
		if( code )
			errorCode = code;

    // update the end time
		QueryPerfCounter(lastActivity);
    end = lastActivity;
		endDoc = end;
		lastDoc = lastActivity;
		GetCPUTime(docCPU, docCPUtotal);

		// throw away any objects that happen outside of a document load
		currentDoc = 0;

		LeaveCriticalSection(&cs);

		// grab a screen shot of the document complete event
		if( saveEverything )
    {
      FindBrowserWindow();
      screenCapture.Capture(hBrowserWnd, CapturedImage::DOCUMENT_COMPLETE);
    }

		// update the waterfall
		RepaintWaterfall();
	}
	else if(szUrl == _T("about:blank"))
	{
    FindBrowserWindow();
		ResizeWindow();

		// reset the UI on an about:blank navigation		
		if( interactive && !available )
		{
			Reset();
			available = true;
		}

		// see if we have an url to test
		testUrl.Empty();
		testOptions.Empty();
		HKEY hKey;
		if( RegOpenKeyEx(HKEY_CURRENT_USER, _T("SOFTWARE\\AOL\\ieWatch"), 0, KEY_READ | KEY_WRITE, &hKey) == ERROR_SUCCESS )
		{
			// get the url value out
			TCHAR buff[4096];
			DWORD buffLen = sizeof(buff);
			if( RegQueryValueEx(hKey, _T("url"), 0, 0, (LPBYTE)buff, &buffLen) == ERROR_SUCCESS )
			{
				// delete the value since we already got it and we get a new value there for every run
				RegDeleteValue(hKey, _T("url"));
				
				// split off any options that were embedded in the url
				CString tmp = buff;
				int index = tmp.Find(_T("??pt"));
				if( index >= 0 )
				{
					testUrl = tmp.Left(index);
					testOptions = tmp.Mid(index + 2);
				}
				else
					testUrl = buff;
				
				// if we have an url to test, launch it
				if( testUrl.GetLength() ) {
					if( !testUrl.Left(9).CompareNoCase(_T("script://")) ) {
						CString script = testUrl.Right(testUrl.GetLength() - 9);
						LoadScript(script);
					}
					StartTimer(2, 100);
				}
			}

			RegCloseKey(hKey);
		}
	}
	else
	{
		CString buff;
		buff.Format(_T("[Pagetest] * Document Complete (not active) - %s\n"), (LPCTSTR)szUrl);
		OutputDebugString(buff);
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CBrowserEvents::ieQuit(void)
{
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CBrowserEvents::StatusUpdate(CString status)
{
	if( active )
	{
		__int64 now;
		QueryPerfCounter(now);
		CStatusUpdate stat(status, now);

		EnterCriticalSection(&cs);

		// only update it if it is actually a new status
		if( status.Compare(lastStatus) )
		{
			statusUpdates.AddTail(stat);
			lastStatus = status;
		}

		LeaveCriticalSection(&cs);
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CBrowserEvents::TitleChange(CString title)
{
	if( active )
	{
		__int64 now;
		QueryPerfCounter(now);

		EnterCriticalSection(&cs);
    if( !titleTime )
      titleTime = now;
    title.Replace(_T('\t'), _T(' '));
    pageTitle = title;
		LeaveCriticalSection(&cs);
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CBrowserEvents::JSDone(void)
{
	QueryPerfCounter(lastRequest);
  if( end )
    end = lastRequest;

  // clear the JSDone flag and see if we're finished
  script_waitForJSDone = false;
}
