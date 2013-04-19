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

// CIEHook.cpp : Implementation of CIEHook

#include "stdafx.h"
#include ".\iehook.h"
#include "WatchDlg.h"

bool loaded = false;
bool hooked = false;

#ifndef DEBUG
typedef LRESULT(__stdcall * LPDISPATCHMESSAGEW)(__in CONST MSG *lpMsg);
LPDISPATCHMESSAGEW	_DispatchMessageW = NULL;
NCodeHookIA32	dispHook;

LRESULT WINAPI DispatchMessageW_hook(__in CONST MSG *lpMsg)
{
	LRESULT result = 0;

	__try
	{
		if( _DispatchMessageW )
			result = _DispatchMessageW(lpMsg);
	}
	__except(1)
	{
	}
	
	return result;
}
#endif //DEBUG

static const TCHAR * GLOBAL_TESTING_MUTEX = _T("Global\\wpt_testing_active");

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP CIEHook::SetSite(IUnknown *pUnkSite)
{
	//MessageBox(NULL, _T("Attach Debugger"), _T("Pagetest"), MB_OK);

	OutputDebugString(_T("[Pagetest] ***** CIEHook::SetSite\n"));

  // do nothing if wptdriver is running a test
  // this makes sure that we aren't double-hooking the browser
  HANDLE active_mutex = OpenMutex(SYNCHRONIZE, FALSE, GLOBAL_TESTING_MUTEX);
  if (!active_mutex) {
	  if (!pUnkSite)
	  {
		  ATLTRACE(_T("[Pagetest] - SetSite(): pUnkSite is NULL\n"));
	  }
	  else
	  {
		  CComQIPtr<IWebBrowser2, &IID_IWebBrowser2> browser = pUnkSite;

		  if( loaded && BlockPopups() )
		  {
			  OutputDebugString(_T("[Pagetest] CIEHook::SetSite - popup detected, killing browser window\n"));
			  browser->Quit();
		  }
		  else
		  {
			  loaded = true;
			  CWatchDlg::CreateDlg();
  		
			  // sink events for the new browser window
			  DispEventAdvise(pUnkSite, &DIID_DWebBrowserEvents2);
  			
			  if( !m_spWebBrowser2 )
				  m_spWebBrowser2 = pUnkSite;

			  if( dlg && browser)
				  dlg->AddBrowser(browser);

			  if (m_spWebBrowser2 )
			  {
				  InstallHooks();
			  }
			  else
			  {
				  ATLTRACE(_T("[Pagetest] - QI for IWebBrowser2 failed\n"));
			  }
		  }
	  }
  } else {
	  ATLTRACE(_T("[Pagetest] - Not hooking, wptdriver test is active\n"));
  }
	
	return S_OK;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CIEHook::InstallHooks(void)
{
	if( !hooked )
	{
		hooked = true;

		// load ourselves to make sure we stay loaded until the browser goes away
		// otherwise some of the API hooks will crash
		LoadLibrary(_T("Pagetest.dll"));

		// hook the browser wndProc (to supress crashes)
		#ifndef DEBUG
		if( !_DispatchMessageW )
			_DispatchMessageW = dispHook.createHookByName("user32.dll", "DispatchMessageW", DispatchMessageW_hook);
		#endif

		ATLTRACE(_T("[Pagetest] - Installing Hooks"));
		
		// Install our API hooks
		WinsockInstallHooks();
		WinInetInstallHooks();
    SchannelInstallHooks();
		GDIInstallHooks();
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HRESULT CIEHook::RemoveHooks(void)
{
	HRESULT hr = E_FAIL;
	
	ATLASSERT(m_spWebBrowser2);
	if (m_spWebBrowser2)
	{
		hr = DispEventUnadvise(m_spWebBrowser2, &DIID_DWebBrowserEvents2);

		if( dlg )
			dlg->RemoveBrowser(m_spWebBrowser2);
	}
		
	CWatchDlg::DestroyDlg();	

  if( m_spChromeFrame )
  {
    CComVariant dummy(static_cast<IDispatch*>(NULL));
    m_spChromeFrame->put_onload(dummy);
    m_spChromeFrame->put_onloaderror(dummy);
    m_spChromeFrame.Release();
  }

	m_spWebBrowser2.Release();
	
	ATLASSERT(SUCCEEDED(hr));
	return hr;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) CIEHook::OnBeforeNavigate2( IDispatch *pDisp, VARIANT * url, VARIANT * Flags, VARIANT * TargetFrameName, VARIANT * PostData, VARIANT * Headers, VARIANT_BOOL * Cancel )
{
	CString szUrl;
	if( url )
		szUrl = *url;

	CString szFrameName;
	if( TargetFrameName )
		szFrameName = *TargetFrameName;
		
  // Is this for the top frame window?
  // Check COM identity: compare IUnknown interface pointers.
  IUnknown* pUnkBrowser = NULL;
  IUnknown* pUnkDisp = NULL;
  if( SUCCEEDED( m_spWebBrowser2->QueryInterface(IID_IUnknown, (void**)&pUnkBrowser) ) )
  {
    if( SUCCEEDED( pDisp->QueryInterface(IID_IUnknown, (void**)&pUnkDisp) ) )
    {
		  if( dlg )
		  {
			  if (pUnkBrowser == pUnkDisp)
			  {
				  ATLTRACE(_T("[Pagetest] - OnBeforeNavigate2 - url = %s\n"), (LPCTSTR)szUrl);
          if( m_spChromeFrame )
          {
            CComVariant dummy(static_cast<IDispatch*>(NULL));
            m_spChromeFrame->put_onload(dummy);
            m_spChromeFrame->put_onloaderror(dummy);
            m_spChromeFrame.Release();
          }
				  dlg->BeforeNavigate(szUrl);
			  }
			  else
			  {
				  ATLTRACE(_T("[Pagetest] - OnBeforeNavigate2 : starting frame - frame(0x%08x) = %s, url = %s\n"), pUnkDisp, (LPCTSTR)szFrameName, (LPCTSTR)szUrl);
			  }
		  }
		
      pUnkDisp->Release();
    }
    pUnkBrowser->Release();
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) CIEHook::OnDocumentComplete( IDispatch *pDisp, VARIANT * url )
{
	CString szUrl;
	if( url )
		szUrl = *url;

  IUnknown* pUnkBrowser = NULL;
  IUnknown* pUnkDisp = NULL;

  // Is this the DocumentComplete event for the top frame window?
  // Check COM identity: compare IUnknown interface pointers.
  if( SUCCEEDED( m_spWebBrowser2->QueryInterface(IID_IUnknown, (void**)&pUnkBrowser) ) )
  {
    if( SUCCEEDED( pDisp->QueryInterface(IID_IUnknown, (void**)&pUnkDisp) ) )
    {
			if( dlg )
			{
				if (pUnkBrowser == pUnkDisp)
				{
					CString buff;
					buff.Format(_T("[Pagetest] * Document Complete (main frame) - url = %s\n"), (LPCTSTR)szUrl);
					OutputDebugString(buff);

          if( !AttachChromeFrame() )
            dlg->DocumentComplete(szUrl);
				}
				else
				{
					CString buff;
					buff.Format(_T("[Pagetest] * Document Complete (frame 0x%08x) - url = %s\n"), pUnkDisp, (LPCTSTR)szUrl);
					OutputDebugString(buff);
				}
			}

      pUnkDisp->Release();
    }
    pUnkBrowser->Release();
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) CIEHook::OnDownloadBegin( VOID )
{
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) CIEHook::OnDownloadComplete( VOID )
{
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) CIEHook::OnNavigateComplete( IDispatch *pDisp, VARIANT * url )
{
	CString szUrl;
	if( url )
		szUrl = *url;
		
  IUnknown* pUnkBrowser = NULL;
  IUnknown* pUnkDisp = NULL;

  // Is this the DocumentComplete event for the top frame window?
  // Check COM identity: compare IUnknown interface pointers.
  if( SUCCEEDED( m_spWebBrowser2->QueryInterface(IID_IUnknown, (void**)&pUnkBrowser) ) )
  {
    if( SUCCEEDED( pDisp->QueryInterface(IID_IUnknown, (void**)&pUnkDisp) ) )
    {
			if( dlg )
			{
				if (pUnkBrowser == pUnkDisp)
				{
					CString buff;
					buff.Format(_T("[Pagetest] * OnNavigateComplete (main frame) - url = %s\n"), (LPCTSTR)szUrl);
					OutputDebugString(buff);

          dlg->NavigateComplete(m_spWebBrowser2, szUrl);
				}
			}

      pUnkDisp->Release();
    }
    pUnkBrowser->Release();
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) CIEHook::OnNavigateError( IDispatch *pDisp, VARIANT *url, VARIANT *TargetFrameName, VARIANT *StatusCode, VARIANT_BOOL *Cancel)
{
	// extract the error code and pass it on
	DWORD code = 0;
	if( StatusCode )
		code = StatusCode->lVal;
	if( !code )
		code = -1;
	
	CString szUrl;
	if( url )
		szUrl = *url;

	CString szFrameName;
	if( TargetFrameName )
		szFrameName = *TargetFrameName;
		
    // Is this for the top frame window?
    // Check COM identity: compare IUnknown interface pointers.
    // send a complete notification since the browser doesn't
    IUnknown* pUnkBrowser = NULL;
    IUnknown* pUnkDisp = NULL;
    if( SUCCEEDED( m_spWebBrowser2->QueryInterface(IID_IUnknown, (void**)&pUnkBrowser) ) )
    {
        if( SUCCEEDED( pDisp->QueryInterface(IID_IUnknown, (void**)&pUnkDisp) ) )
        {
			if( dlg )
			{
				if (pUnkBrowser == pUnkDisp)
				{
					ATLTRACE(_T("[Pagetest] - OnNavigateError - %d, url = %s\n"), code, (LPCTSTR)szUrl);
					dlg->DocumentComplete(szUrl, code);
				}
				else
				{
					ATLTRACE(_T("[Pagetest] - OnNavigateError - %d, frame 0x%08x url = %s\n"), code, pUnkDisp, (LPCTSTR)szUrl);
				}
			}

            pUnkDisp->Release();
        }
        pUnkBrowser->Release();
    }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) CIEHook::OnQuit( VOID )
{
	OutputDebugString(_T("[Pagetest] - OnQuit\n"));
	
	if( dlg )
		dlg->ieQuit();

	RemoveHooks();
}

/*-----------------------------------------------------------------------------
	See if we need to block all popup windows
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) CIEHook::OnNewWindow2( IDispatch ** pDisp, VARIANT_BOOL *Cancel )
{
	ATLTRACE(_T("[Pagetest] - OnNewWindow2\n"));
	OutputDebugString(_T("[Pagetest] - OnNewWindow2\n"));
	
	if( BlockPopups() && Cancel )
	{
		ATLTRACE(_T("[Pagetest] - OnNewWindow2 - blocking\n"));
		OutputDebugString(_T("[Pagetest] - OnNewWindow2 - blocking\n"));
		*Cancel = VARIANT_TRUE;
	}
}

/*-----------------------------------------------------------------------------
	See if we need to block all popup windows
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) CIEHook::OnNewWindow3( IDispatch **ppDisp, VARIANT_BOOL *Cancel, DWORD dwFlags, BSTR bstrUrlContext, BSTR bstrUrl)
{
	ATLTRACE(_T("[Pagetest] - OnNewWindow3\n"));
	OutputDebugString(_T("[Pagetest] - OnNewWindow3\n"));
	
	if( BlockPopups() && Cancel )
	{
		ATLTRACE(_T("[Pagetest] - OnNewWindow3 - blocking\n"));
		OutputDebugString(_T("[Pagetest] - OnNewWindow3 - blocking\n"));
		*Cancel = VARIANT_TRUE;
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP_(HRESULT) CIEHook::QueryStatus(const GUID *pguidCmdGroup, ULONG cCmds, OLECMD prgCmds[], OLECMDTEXT *pCmdText)
{
	for( ULONG i = 0; i < cCmds; i++ )
		prgCmds[i].cmdf = OLECMDF_SUPPORTED | OLECMDF_ENABLED;
	
	return S_OK;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP_(HRESULT) CIEHook::Exec(const GUID *pguidCmdGroup, DWORD nCmdID, DWORD nCmdExecOpt, VARIANT *pvaIn, VARIANT *pvaOut)
{
	// display the dialog
	if( dlg )
		dlg->EnableUI();
		
	return S_OK;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CIEHook::BlockPopups()
{
	bool ret = false;

	CRegKey key;
	if( key.Open(HKEY_CURRENT_USER, _T("SOFTWARE\\AOL\\ieWatch"), KEY_READ) == ERROR_SUCCESS )
	{
		DWORD block = 0;
		if( key.QueryDWORDValue(_T("Block All Popups"), block) == ERROR_SUCCESS )
		{
			if( block )
				ret = true;
		}
	}
	
	return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) CIEHook::OnStatusTextChange( BSTR bstrStatus )
{
	CString status(bstrStatus);
	if( dlg )
		dlg->StatusUpdate(status);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) CIEHook::OnTitleChange( BSTR bstrTitle )
{
	CString title(bstrTitle);
  if( dlg && title.CompareNoCase(_T("about:blank")) )
		dlg->TitleChange(title);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CIEHook::AttachChromeFrame()
{
  bool ret = false;

  // see if we are running Chrome Frame
  if( !m_spChromeFrame )
  {
    CComPtr<IDispatch> spDoc;
    if( SUCCEEDED(m_spWebBrowser2->get_Document(&spDoc)) && spDoc )
      m_spChromeFrame = spDoc;
  }
  
  if (m_spChromeFrame)
  {
    CComVariant onloaderror(onloaderror_.ToDispatch());
    CComVariant onload(onload_.ToDispatch());
    if( SUCCEEDED(m_spChromeFrame->put_onload(onload)) &&
        SUCCEEDED(m_spChromeFrame->put_onloaderror(onloaderror)) )
    {
      OutputDebugString(_T("[Pagetest] Attached to Chrome Frame onload notification"));
      dlg->ChromeFrame(m_spChromeFrame);
      ret = true;
    }
    else
      OutputDebugString(_T("[Pagetest] Failed to Attach to Chrome Frame onload notification"));
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HRESULT CIEHook::OnLoad(const VARIANT* param) 
{
  if (dlg)
  {
    CString url(param->bstrVal);

    CString buff;
		buff.Format(_T("[Pagetest] * Chrome Frame OnLoad - url = %s\n"), (LPCTSTR)url);
		OutputDebugString(buff);

    dlg->DocumentComplete(url);
  }

  return S_OK;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
HRESULT CIEHook::OnLoadError(const VARIANT* param) 
{
  if (dlg)
  {
    CString url(param->bstrVal);

    CString buff;
		buff.Format(_T("[Pagetest] * Chrome Frame OnLoadError - url = %s\n"), (LPCTSTR)url);
		OutputDebugString(buff);

    dlg->DocumentComplete(url, 99995);
  }

  return S_OK;
}
