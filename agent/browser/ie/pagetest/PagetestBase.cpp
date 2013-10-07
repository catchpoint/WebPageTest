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
#include "WatchDlg.h"

CPagetestBase::CPagetestBase(void):
	available(false)
	, abm(1)
	, openRequests(0)
	, testUrl(_T(""))
	, timeout(240)
  , activityTimeout(ACTIVITY_TIMEOUT)
	, exitWhenDone(false)
	, interactive(false)
	, runningScript(false)
	, cached(-1)
	, script_ABM(-1)
	, haveBasePage(false)
	, processed(false)
	, basePageRedirects(0)
	, hMainWindow(NULL)
	, hBrowserWnd(NULL)
	, ieMajorVer(0)
	, ignoreSSL(0)
	, blockads(0)
  , imageQuality(JPEG_DEFAULT_QUALITY)
  , pngScreenShot(0)
  , bodies(0)
  , htmlbody(0)
  , keepua(0)
  , minimumDuration(0)
  , clearShortTermCacheSecs(0)
  , _SetGDIWindow(NULL)
  , _SetGDIWindowUpdated(NULL)
  , _GDIWindowUpdated(NULL)
  , windowUpdated(false)
  , hGDINotifyWindow(NULL)
  , titleTime(0)
  , currentRun(0)
{
	QueryPerfFrequency(freq);
	msFreq = freq / (__int64)1000;
	
	winInetRequests.InitHashTable(257);
	requestSocketIds.InitHashTable(257);
	threadWindows.InitHashTable(257);
	openSockets.InitHashTable(257);
  client_ports.InitHashTable(257);

	// create a NULL DACL we will re-use everywhere we do file access
	ZeroMemory(&nullDacl, sizeof(nullDacl));
	nullDacl.nLength = sizeof(nullDacl);
	nullDacl.bInheritHandle = FALSE;
	if( InitializeSecurityDescriptor(&SD, SECURITY_DESCRIPTOR_REVISION) )
		if( SetSecurityDescriptorDacl(&SD, TRUE,(PACL)NULL, FALSE) )
			nullDacl.lpSecurityDescriptor = &SD;

	InitializeCriticalSection(&cs);
	InitializeCriticalSection(&csBackground);

	// figure out what version of IE is installed
	CRegKey key;
	if( key.Open(HKEY_LOCAL_MACHINE, _T("SOFTWARE\\Microsoft\\Internet Explorer"), KEY_READ) == ERROR_SUCCESS )
	{
		TCHAR buff[1024];
		ULONG len = _countof(buff);
		if( key.QueryStringValue(_T("Version"), buff, &len ) == ERROR_SUCCESS )
			ieMajorVer = _ttoi(buff);

		key.Close();
	}

  // connect to the global GDI hook if it is present
	TCHAR hookDll[MAX_PATH];
	if( GetModuleFileName(reinterpret_cast<HMODULE>(&__ImageBase), hookDll, _countof(hookDll)) )
  {
    lstrcpy(PathFindFileName(hookDll), _T("wptghook.dll"));
    HMODULE hHookDll = LoadLibrary(hookDll);
    if (hHookDll)
    {
      _SetGDIWindow = (SETGDIWINDOW)GetProcAddress(hHookDll, "_SetGDIWindow@12");
      _SetGDIWindowUpdated = (SETGDIWINDOWUPDATED)GetProcAddress(hHookDll, "_SetGDIWindowUpdated@4");
      _GDIWindowUpdated = (GDIWINDOWUPDATED)GetProcAddress(hHookDll, "_GDIWindowUpdated@0");
    }
  }

  // load some settings that we need before starting
  if( key.Open(HKEY_CURRENT_USER, _T("Software\\America Online\\SOM"), KEY_READ | KEY_WRITE) == ERROR_SUCCESS ) {
    key.QueryDWORDValue(_T("Run"), currentRun);
		key.QueryDWORDValue(_T("Cached"), cached);
    key.Close();
  }

  // Instantiate the DOM interface that we're going to attach to the DOM for script to interact
  #ifndef PAGETEST_EXE
  if( SUCCEEDED(CComObject<CWebPagetestDOM>::CreateInstance(&webpagetestDom)) )
    webpagetestDom->AddRef();
  #endif
}

CPagetestBase::~CPagetestBase(void)
{
  #ifndef PAGETEST_EXE
  if( webpagetestDom )
    webpagetestDom->Release();
  #endif

	DeleteCriticalSection(&cs);
	DeleteCriticalSection(&csBackground);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CPagetestBase::DeleteImages(void)
{
  screenCapture.Free();
  progressData.RemoveAll();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CPagetestBase::Reset(void)
{
	ATLTRACE(_T("[Pagetest] - ***** CPagetestBase::Reset\n"));
	
	EnterCriticalSection(&cs);

	// put in a little protection against crashes
	__try
	{
		// clear out all of our lists (objects will be deleted from the event list)
		dns.RemoveAll();
		connects.RemoveAll();
		requests.RemoveAll();
		winInetRequests.RemoveAll();
		winInetRequestList.RemoveAll();
		requestSocketIds.RemoveAll();

		// delete all of the events we're tracking
		while( !events.IsEmpty() )
		{
			CTrackedEvent * event = events.RemoveHead();
			if( event )
				delete event;
		}

		// reset any information about the page
		out = 0;
		in = 0;

		out_doc = 0;
		in_doc = 0;

		start = 0;
		end = 0;
		endDoc = 0;
		lastDoc = 0;
		firstByte = 0;
		domElement = 0;
		startRender = 0;
		basePage = 0;
    titleTime = 0;
    pageTitle.Empty();
		layoutChanged.RemoveAll();
		active = false;
		url.Empty();
    startCPU.dwHighDateTime = startCPU.dwLowDateTime = 0;
    docCPU.dwHighDateTime = docCPU.dwLowDateTime = 0;
    endCPU.dwHighDateTime = endCPU.dwLowDateTime = 0;
    startCPUtotal.dwHighDateTime = startCPUtotal.dwLowDateTime = 0;
    docCPUtotal.dwHighDateTime = docCPUtotal.dwLowDateTime = 0;
    endCPUtotal.dwHighDateTime = endCPUtotal.dwLowDateTime = 0;
		
		gzipScore = -1;
		doctypeScore = -1;
		keepAliveScore = -1;
		oneCdnScore = -1;
		staticCdnScore = -1;
		cacheScore = -1;
		combineScore = -1;
		cookieScore = -1;
		minifyScore = -1;
		compressionScore = -1;
		progressiveJpegScore = -1;
		etagScore = -1;
    adultSite = 0;

		errorCode = 0;

		currentDoc = 0;
		nextDoc = 1;
		
		openRequests = 0;

		haveBasePage = false;
		basePageRedirects = 0;
		processed = false;

		statusUpdates.RemoveAll();
		DeleteImages();

    m_spChromeFrame.Release();
    dev_tools_.Reset();

	}__except(EXCEPTION_EXECUTE_HANDLER)
	{
	}
	
	LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
	Check to see if we're supposed to be doing activity-based measurement
-----------------------------------------------------------------------------*/
DWORD CPagetestBase::CheckABM(void)
{
	EnterCriticalSection(&cs);
	
	abm = -1;
	if( runningScript )
		abm = script_ABM;
	
	if( abm == -1 )
	{
		// check the abm flag and if it is set, use that as the end of document measurement
		// this should be removed when the analysts can use the activity time field instead
		abm = 1;
		CRegKey key;
		if( key.Open(HKEY_CURRENT_USER, _T("Software\\America Online\\SOM"), KEY_READ) == ERROR_SUCCESS )
		{
			key.QueryDWORDValue(_T("ABM"), abm);
			key.Close();
		}
	}

	LeaveCriticalSection(&cs);
	
	return abm;
}

/*-----------------------------------------------------------------------------
	Add an event to the end of the queue.  By having this as a virtual function
	the other classes can subclass it and get notice when the list changes
-----------------------------------------------------------------------------*/
void CPagetestBase::AddEvent(CTrackedEvent * e)
{
	ATLTRACE(_T("[Pagetest] - *** (0x%08X) - AddEvent\n"), GetCurrentThreadId());

	EnterCriticalSection(&cs);
	
	// don't start measuring until there is actual activity
	if( !start && e && e->type == CTrackedEvent::etWinInetRequest )
	{
		StartMeasuring();

		// update the real start time
		start = e->start;
		firstByte = 0;

		// change the start time of all existing events
		POSITION pos = events.GetHeadPosition();
		while(pos)
		{
			CTrackedEvent * event = events.GetNext(pos);
			if( event )
			{
				event->start = start;
				if( event->end )
					event->end = start + 1;
			}
		}
	}
	
	events.AddTail(e);
	LeaveCriticalSection(&cs);

	ATLTRACE(_T("[Pagetest] - *** (0x%08X) - AddEvent complete\n"), GetCurrentThreadId());
}

/*-----------------------------------------------------------------------------
	WndProc for the thread-specific windows
-----------------------------------------------------------------------------*/
LRESULT CALLBACK ThreadWindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam)
{
	LRESULT ret = 0;
	
	if( uMsg == UWM_CHECK_STUFF && dlg )
	{
		BOOL handled = FALSE;
		ret = dlg->OnCheckStuff(uMsg, wParam, lParam, handled);
	}
	else if( uMsg == UWM_DESTROY )
		DestroyWindow(hwnd);
	else
		ret = DefWindowProc(hwnd, uMsg, wParam, lParam);
	
	return ret;
}

/*-----------------------------------------------------------------------------
	Add a browser interface to the list of browser interfaces
-----------------------------------------------------------------------------*/
void CPagetestBase::AddBrowser(CComPtr<IWebBrowser2> browser)
{
	CBrowserTracker tracker(browser);

	EnterCriticalSection(&cs);
	browsers.AddTail(tracker);

  if( !hMainWindow )
    browser->get_HWND((LONG *)&hMainWindow);
	
	// create a window for the thread if necessary
	HWND hWnd = NULL;
	if( !threadWindows.Lookup(tracker.threadId, hWnd) )
	{
		LeaveCriticalSection(&cs);

		TCHAR wndClassName[100];
		wsprintf(wndClassName, _T("Pagetest Thread Window %08X"), tracker.threadId);
		
		WNDCLASS wndClass;
		memset(&wndClass, 0, sizeof(wndClass));
		wndClass.lpszClassName = wndClassName;
		wndClass.lpfnWndProc = ThreadWindowProc;
		wndClass.hInstance = _AtlBaseModule.GetModuleInstance();
		if( RegisterClass(&wndClass) )
		{
			hWnd = ::CreateWindow(wndClassName, wndClassName, WS_POPUP, 0, 0, 0, 0, NULL, NULL, _AtlBaseModule.GetModuleInstance(), NULL);
			if( hWnd )
			{
				EnterCriticalSection(&cs);
				threadWindows.SetAt(tracker.threadId, hWnd);
				LeaveCriticalSection(&cs);
			}
		}
	}
	else
		LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
	Remove a browser interface
-----------------------------------------------------------------------------*/
void CPagetestBase::RemoveBrowser(CComPtr<IWebBrowser2> browser)
{
	EnterCriticalSection(&cs);
	bool keepWindow = false;
	DWORD thread = GetCurrentThreadId();
	POSITION pos = browsers.GetHeadPosition();
	while(pos)
	{
		POSITION oldPos = pos;
		CBrowserTracker tracker = browsers.GetNext(pos);
		if( tracker.browser == browser )
			browsers.RemoveAt(oldPos);
		else if( tracker.threadId == thread )
			keepWindow = true;
	}
	
	// see if we can kill the window for this thread
	if( !keepWindow )
	{
		HWND hWnd = NULL;
		if( threadWindows.Lookup(thread, hWnd) )
		{
			threadWindows.RemoveKey(thread);
			if( hWnd && ::IsWindow(hWnd) )
				::PostMessage(hWnd, UWM_DESTROY, 0, 0);
		}
	}
	LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
	Locate the first HTML element on the DOM of any of the browsers that
	matches the attribute we're looking for
	The attrVal contains a concatenated attribute and value in attribute=value form
-----------------------------------------------------------------------------*/
CComPtr<IHTMLElement> CPagetestBase::FindDomElementByAttribute(CString attrVal)
{
	CComPtr<IHTMLElement> result;

	CString attribute = _T("id");
	CString value = attrVal;
	value.Trim();
	
	// = or ' are delimiters for a direct full comparison
	int index = attrVal.Find('=');
	if( index == -1 )
		index = attrVal.Find('\'');
	
	// < is the delimiter to compare the left of the string
	int index2 = attrVal.Find('<');
	attrOperator op = equal;
	if( index2 != -1 && (index2 < index || index == -1) )
	{
		index = index2;
		op = left;
	}

	// ^ is the delimiter to do a substring match
	int index3 = attrVal.Find('^');
	if( index3 != -1 && (index3 < index || index == -1) && (index3 < index2 || index2 == -1) )
	{
		index = index3;
		op = mid;
	}
	
	if( index != -1 )
	{
		attribute = attrVal.Left(index);
		value = attrVal.Right(attrVal.GetLength() - index - 1);
		value.Trim();
		value.Trim(_T("\""));	// allow for the value to be in quotes
	}
	
	// see if there is a specific tag we're looking for - i.e. div:xxx=yy or A:xxx=yy
	index = attribute.Find(':');
	CString tag;
	if( index != -1 )
	{
		tag = attribute.Left(index);
		attribute = attribute.Right(attribute.GetLength() - index - 1);
	}
	
	attribute.Trim();
	
	result = FindDomElementByAttribute(tag, attribute, value, op);
	
	return result;
}

/*-----------------------------------------------------------------------------
  Converts a IHTMLWindow2 object to a IWebBrowser2.
  Returns NULL in case of failure.
-----------------------------------------------------------------------------*/
CComQIPtr<IWebBrowser2> HtmlWindowToHtmlWebBrowser(
    CComQIPtr<IHTMLWindow2> window) {
  CComQIPtr<IWebBrowser2> browser;
  CComQIPtr<IServiceProvider> provider = window;
  if (provider)
    provider->QueryService(IID_IWebBrowserApp, IID_IWebBrowser2,
                           (void**)&browser);
  return browser;
}

/*-----------------------------------------------------------------------------
	Convert a window to a document, accounting for cross-domain security
  issues.
-----------------------------------------------------------------------------*/
CComQIPtr<IHTMLDocument2> HtmlWindowToHtmlDocument(
    CComQIPtr<IHTMLWindow2> window) {
  CComQIPtr<IHTMLDocument2> document;
  if (!SUCCEEDED(window->get_document(&document))) {
    CComQIPtr<IWebBrowser2>  browser = HtmlWindowToHtmlWebBrowser(window);
    if (browser) {
      CComQIPtr<IDispatch> disp;
      if(SUCCEEDED(browser->get_Document(&disp)) && disp)
        document = disp;
    }
  }
  return document;
}


/*-----------------------------------------------------------------------------
	Locate the first HTML element on the DOM of any of the browsers that
	matches the attribute we're looking for
-----------------------------------------------------------------------------*/
CComPtr<IHTMLElement> CPagetestBase::FindDomElementByAttribute(CString &tag, CString &attribute, CString &value, attrOperator &op)
{
	CComPtr<IHTMLElement> result;
	
	POSITION pos = browsers.GetHeadPosition();
	while(pos && !result)
	{
		CBrowserTracker tracker = browsers.GetNext(pos);
		if( tracker.threadId == GetCurrentThreadId() && tracker.browser )
		{
			CComPtr<IDispatch> spDoc;
			if( SUCCEEDED(tracker.browser->get_Document(&spDoc)) && spDoc )
			{
				CComQIPtr<IHTMLDocument2> doc = spDoc;
        if( doc )
				  result = FindDomElementByAttribute(tag, attribute, value, op, doc);
			}
		}
	}
	
	return result;
}

/*-----------------------------------------------------------------------------
	Locate the first HTML element on the DOM in the given document that
	matches the attribute we're looking for
	
	This will recursively search any frames within the document
-----------------------------------------------------------------------------*/
CComPtr<IHTMLElement> CPagetestBase::FindDomElementByAttribute(CString &tag, CString &attribute, CString &value, attrOperator &op, CComPtr<IHTMLDocument2> doc)
{
	CComPtr<IHTMLElement> result;
	CComBSTR attrib(attribute);
	
	bool innerText = false;
	bool innerHtml = false;
	bool sourceIndex = false;
	if( !attribute.CompareNoCase(_T("innerText")) )
		innerText = true;
	else if( !attribute.CompareNoCase(_T("innerHtml")) )
		innerHtml = true;
	else if( !attribute.CompareNoCase(_T("sourceIndex")) )
		sourceIndex = true;

	// force class to className (it's a special case where the attribute is different on the DOM)
	if( !attribute.CompareNoCase(_T("class")) )
		attribute = _T("className");

	if( doc )
	{
		// get all of the elements
		if( !result )
		{
			bool ok = false;
			if( !sourceIndex && !innerText && !innerHtml && op == equal && tag.IsEmpty() && (!attribute.CompareNoCase(_T("id"))) )
			{
				CComQIPtr<IHTMLDocument3> doc3 = doc;
				if( doc3 )
				{
					ok = true;
					_bstr_t val = value;
					
					doc3->getElementById(val, &result);
				}
			}

			if( !ok )
			{
				// have to manually walk all of the elements
				CComPtr<IHTMLElementCollection> coll;
				ok = false;
				
				// if we're looking for name, short-cut and do a direct search
				if( !tag.IsEmpty() || (!attribute.CompareNoCase(_T("name")) && op == equal) )
				{
					CComQIPtr<IHTMLDocument3> doc3 = doc;
					if( doc3 )
					{
						ok = true;
						if( !attribute.CompareNoCase(_T("name")) && op == equal )
						{
							_bstr_t name = value;
							doc3->getElementsByName(name, &coll);
						}
						else if( !tag.IsEmpty() )
						{
							_bstr_t tagName = tag;
							doc3->getElementsByTagName(tagName, &coll);
						}
					}
				}
				
				if( !ok )
					if( SUCCEEDED(doc->get_all(&coll)) )
						ok = true;
				
				if( ok && coll )
				{
					long count = 0;
					if( SUCCEEDED(coll->get_length(&count)) )
					{
						for( long i = 0; i < count && !result; i++ )
						{
							_variant_t index = i;
							CComPtr<IDispatch> item;
							if( SUCCEEDED(coll->item(index, index, &item)) && item )
							{
								CComQIPtr<IHTMLElement> element = item;
								if( element )
								{
									ok = false;
									
									// see if we're looking for a particular element type
									if( tag.IsEmpty() )
										ok = true;
									else
									{
										_bstr_t elementTag;
										if( SUCCEEDED(element->get_tagName(elementTag.GetAddress())) )
										{
											CString elTag = elementTag;
											if( !tag.CompareNoCase(elTag) )
												ok = true;
										}
									}
									
									if( ok )
									{								
										_variant_t varVal;
										_bstr_t text;
										
										if( sourceIndex )
										{
											long index;
											if( SUCCEEDED(element->get_sourceIndex(&index)) )
											{
												long lValue = _ttol(value);
												if( index == lValue )
													result = element;
											}
										}
										else
										{
											if( innerText )
												element->get_innerText(text.GetAddress());
											else if (innerHtml)
												element->get_innerHTML(text.GetAddress());
											else if( SUCCEEDED(element->getAttribute(attrib, 0, &varVal)) )
											{
												if( varVal.vt != VT_EMPTY && varVal.vt != VT_NULL && varVal.vt != VT_ERROR )
													text = (_bstr_t)varVal;
											}

											CString val = text;
											val.Trim();
											if( val.GetLength() )
											{
												switch( op )
												{
													case equal:
														{
															if( val == value )
																result = element;
														}break;
													
													case left:
														{
															if( val.Left(value.GetLength()) == value )
																result = element;
														}break;

													case mid:
														{
															if( val.Find(value) > -1 )
																result = element;
														}break;
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}

		// recursively check in any iFrames
		if( !result )
		{
			// walk all of the frames on the document
			CComPtr<IHTMLFramesCollection2> frames;
			if( SUCCEEDED(doc->get_frames(&frames)) && frames )
			{
				// for each frame, walk all of the elements in the frame
				long count = 0;
				if( SUCCEEDED(frames->get_length(&count)) )
				{
					for( long i = 0; i < count && !result; i++ )
					{
						_variant_t index = i;
						_variant_t varFrame;
						
						if( SUCCEEDED(frames->item(&index, &varFrame)) )
						{
							CComQIPtr<IHTMLWindow2> window(varFrame);
							if( window )
							{
								CComQIPtr<IHTMLDocument2> frameDoc;
								frameDoc = HtmlWindowToHtmlDocument(window);
								if( frameDoc )
									result = FindDomElementByAttribute(tag, attribute, value, op, frameDoc);
							}
						}
					}
				}
			}
		}
	}
	
	return result;
}

/*-----------------------------------------------------------------------------
  Recursively count the number of DOM elements on the page
-----------------------------------------------------------------------------*/
DWORD CPagetestBase::CountDOMElements(CComQIPtr<IHTMLDocument2> &doc)
{
  DWORD count = 0;

  if( doc )
  {
    // count the number of elements on the current document
		CComPtr<IHTMLElementCollection> coll;
		if( SUCCEEDED(doc->get_all(&coll)) && coll )
		{
			long nodes = 0;
			if( SUCCEEDED(coll->get_length(&nodes)) )
        count += nodes;
      coll.Release();
    }

    // Recursively walk any iFrames
    IHTMLFramesCollection2 * frames = NULL;
    if (doc->get_frames(&frames) && frames) {
      long num_frames = 0;
      if (SUCCEEDED(frames->get_length(&num_frames))) {
        for (long i = 0; i < num_frames; i++) {
          _variant_t index = i;
          _variant_t varFrame;
          if (SUCCEEDED(frames->item(&index, &varFrame))) {
            CComQIPtr<IHTMLWindow2> window(varFrame);
            if (window) {
              CComQIPtr<IHTMLDocument2> frameDoc;
              frameDoc = HtmlWindowToHtmlDocument(window);
              if (frameDoc)
                count += CountDOMElements(frameDoc);
            }
          }
        }
      }
      frames->Release();
    }
  }

  return count;
}

/*-----------------------------------------------------------------------------
  Find what we assume is the browser document window:
  Largest child window that:
  - Is visible
  - Takes > 80% of the parent window's space
  - Recursively checks the largest child
-----------------------------------------------------------------------------*/
HWND CPagetestBase::FindBrowserDocument(HWND parent_window) 
{
  HWND document_window = NULL;
  RECT rect;
  DWORD biggest_child = 0;

  if (GetWindowRect(parent_window, &rect)) 
  {
    DWORD parent_pixels = abs(rect.right - rect.left) * abs(rect.top - rect.bottom);
    DWORD cutoff = (DWORD)((double)parent_pixels * 0.8);
    if (parent_pixels) 
    {
      HWND child = GetWindow(parent_window, GW_CHILD);
      while (child) 
      {
        if (IsWindowVisible(child) && GetWindowRect(child, &rect)) 
        {
          DWORD child_pixels = abs(rect.right - rect.left) * abs(rect.top - rect.bottom);
          if (child_pixels > biggest_child && child_pixels > cutoff) 
          {
            document_window = child;
            biggest_child = child_pixels;
          }
        }
        child = GetWindow(child, GW_HWNDNEXT);
      }
    }
  }

  if (document_window) 
  {
    HWND child_window = FindBrowserDocument(document_window);
    if (child_window)
      document_window = child_window;
  }

  return document_window;
}

/*-----------------------------------------------------------------------------
  Find the top-level and document windows for the browser
-----------------------------------------------------------------------------*/
bool CPagetestBase::FindBrowserWindow() 
{
  bool found = false;
  hBrowserWnd = NULL;

  if (FindBrowserWindows(GetCurrentProcessId(), hMainWindow, hBrowserWnd) &&
      hBrowserWnd) {
    found = true;
    if( _SetGDIWindow )
      _SetGDIWindow(hBrowserWnd, hGDINotifyWindow, UWM_CHECK_PAINT);
  }

  return found;
}

/*-----------------------------------------------------------------------------
  Recursively check to see if the given window has a child of the same class
  A buffer is passed so we don't have to keep re-allocating it on the stack
-----------------------------------------------------------------------------*/
bool CPagetestBase::HasVisibleChildDocument(HWND parent, const TCHAR * class_name, 
                            TCHAR * buff, DWORD buff_len) {
  bool has_child_document = false;
  HWND wnd = ::GetWindow(parent, GW_CHILD);
  while (wnd && !has_child_document) {
    if (IsWindowVisible(wnd)) {
      if (GetClassName(wnd, buff, buff_len) && !lstrcmp(buff, class_name)) {
        has_child_document = true;
      } else {
        has_child_document = HasVisibleChildDocument(wnd, class_name, 
                                                      buff, buff_len);
      }
    }
    wnd = ::GetNextWindow(wnd , GW_HWNDNEXT);
  }
  return has_child_document;
}

/*-----------------------------------------------------------------------------
  See if the given window is a browser document window.
  A browser document window is detected as:
  - Having a window class of a known type
  - Not having any visible child windows of the same type
-----------------------------------------------------------------------------*/
bool CPagetestBase::IsBrowserDocument(HWND wnd) {
  bool is_document = false;
  TCHAR class_name[100];
  if (GetClassName(wnd, class_name, _countof(class_name))) {
    if (!lstrcmp(class_name, _T("Internet Explorer_Server"))) {
      if (!HasVisibleChildDocument(wnd, _T("Internet Explorer_Server"), 
          class_name, _countof(class_name))) {
        is_document = true;
      }
    }
  }
  return is_document;
}

/*-----------------------------------------------------------------------------
  Recursively find the highest visible window for the fiven process
-----------------------------------------------------------------------------*/
HWND CPagetestBase::FindDocumentWindow(DWORD process_id, HWND parent) {
  HWND document_window = NULL;
  HWND wnd = ::GetWindow(parent, GW_CHILD);
  while (wnd && !document_window) {
    if (IsWindowVisible(wnd)) {
      DWORD pid;
      GetWindowThreadProcessId(wnd, &pid);
      if (pid == process_id && IsBrowserDocument(wnd)) {
        document_window = wnd;
      } else {
        document_window = FindDocumentWindow(process_id, wnd);
      }
    }
    wnd = ::GetNextWindow(wnd , GW_HWNDNEXT);
  }
  return document_window;
}

/*-----------------------------------------------------------------------------
  Find the top-level and document windows for the browser
-----------------------------------------------------------------------------*/
bool CPagetestBase::FindBrowserWindows(DWORD process_id, HWND& frame_window, 
                          HWND& document_window) {
  bool found = false;
  // find a known document window that belongs to this process
  document_window = FindDocumentWindow(process_id, ::GetDesktopWindow());
  if (document_window) {
    found = true;
    frame_window = GetAncestor(document_window, GA_ROOTOWNER);
  }
  return found;
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool  CPagetestBase::BrowserWindowUpdated()
{
  bool ret = windowUpdated;
  if (_GDIWindowUpdated)
    ret = _GDIWindowUpdated();
  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool  CPagetestBase::IsAdRequest(CString fullUrl)
{
  POSITION pos = adPatterns.GetHeadPosition();
  while( pos ) 
  {
    CString blockPattern = adPatterns.GetNext(pos);
	if( fullUrl.Find(blockPattern) != -1 )
    {
	  ATLTRACE(_T("[Pagetest] - *** IsAdRequest: Matched - %s"), fullUrl);
	  return true;
    }
  }
  return false;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void  CPagetestBase::LoadAdPatterns()
{
  TCHAR iniFile[MAX_PATH];
  iniFile[0] = 0;
  GetModuleFileName(reinterpret_cast<HMODULE>(&__ImageBase), iniFile, _countof(iniFile));
  lstrcpy( PathFindFileName(iniFile), _T("adblock.txt") );

  CString fileName = CString(iniFile);
  HANDLE hFile = CreateFile(fileName, GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, 0, OPEN_EXISTING, 0, 0);

  if( hFile != INVALID_HANDLE_VALUE )
  {
	  DWORD len = GetFileSize(hFile,NULL);
	  if( len )
	  {
		  LPBYTE szUrl = (LPBYTE)malloc(len + 1);
		  DWORD read;
		  if( ReadFile(hFile, szUrl, len, &read, 0) )
		  {
			  CString file((const char *)szUrl);
			  free(szUrl);
			  int pos = 0;
			  CString line = file.Tokenize(_T("\r\n"), pos);
			   while( pos >= 0 )
			   {
				   line.Trim();
				   adPatterns.AddTail(line);
				   // on to the next line
				   line = file.Tokenize(_T("\r\n"), pos);
			   }
		  }
		  else
		  {
			  // Free the memory allocated incase the file can't be read.
  			  free(szUrl);
		  }
	  }
	  CloseHandle(hFile);
  }
  else
  {
  	  ATLTRACE(_T("[Pagetest] - *** LoadAdPatterns: Error loading file. %s"), iniFile);
  }
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void  CPagetestBase::SetBrowserWindowUpdated(bool updated)
{
  windowUpdated = updated;
  if (_SetGDIWindowUpdated)
    _SetGDIWindowUpdated(updated);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CPagetestBase::ChromeFrame(CComPtr<IChromeFrame> chromeFrame)
{
  m_spChromeFrame = chromeFrame;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CPagetestBase::GetCPUTime(FILETIME &cpu_time, FILETIME &total_time) {
  FILETIME idle_time, kernel_time, user_time;
  if (GetSystemTimes(&idle_time, &kernel_time, &user_time)) {
    ULARGE_INTEGER k, u, i, combined, total;
    k.LowPart = kernel_time.dwLowDateTime;
    k.HighPart = kernel_time.dwHighDateTime;
    u.LowPart = user_time.dwLowDateTime;
    u.HighPart = user_time.dwHighDateTime;
    i.LowPart = idle_time.dwLowDateTime;
    i.HighPart = idle_time.dwHighDateTime;
    total.QuadPart = (k.QuadPart + u.QuadPart);
    combined.QuadPart = total.QuadPart - i.QuadPart;
    cpu_time.dwHighDateTime = combined.HighPart;
    cpu_time.dwLowDateTime = combined.LowPart;
    total_time.dwHighDateTime = total.HighPart;
    total_time.dwLowDateTime = total.LowPart;
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
double CPagetestBase::GetElapsedMilliseconds(FILETIME &start, FILETIME &end) {
  double elapsed = 0;
  ULARGE_INTEGER s, e;
  s.LowPart = start.dwLowDateTime;
  s.HighPart = start.dwHighDateTime;
  e.LowPart = end.dwLowDateTime;
  e.HighPart = end.dwHighDateTime;
  if (e.QuadPart > s.QuadPart)
    elapsed = (double)(e.QuadPart - s.QuadPart) / 10000.0;

  return elapsed;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int CPagetestBase::GetCPUUtilization(FILETIME &start, FILETIME &end, FILETIME &startTotal, FILETIME &endTotal) {
  int utilization = 0;
  double cpu = GetElapsedMilliseconds(start, end);
  double total = GetElapsedMilliseconds(startTotal, endTotal);
  if (cpu > 0.0 && total > 0.0)
    utilization = min((int)(((cpu / total) * 100) + 0.5), 100);
  return utilization;
}