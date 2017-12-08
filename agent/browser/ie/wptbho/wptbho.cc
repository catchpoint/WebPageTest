// WptBHO.cpp : Implementation of WptBHO

#include "stdafx.h"
#include "resource.h"
#include "wptbho_i.h"
#include "dllmain.h"
#include "xdlldata.h"
#include "wptbho.h"
#include "Shobjidl.h"

/*-----------------------------------------------------------------------------
  Main entry point that is called when IE starts up
-----------------------------------------------------------------------------*/
STDMETHODIMP WptBHO::SetSite(IUnknown *pUnkSite) {
  ATLTRACE(_T("[WptBHO] SetSite\n"));
  if (pUnkSite) {
    if (!_web_browser) {
      _web_browser = pUnkSite;
      // Set up ServiceProvider for intercepting auth requests
      basicAuthDismissed = false;
      CComQIPtr<IServiceProvider> sp(_web_browser);
      if (sp) {
        CComPtr<IProfferService> theProfferService;
        HRESULT hr1 = sp->QueryService(SID_SProfferService, IID_IProfferService, (LPVOID*)&theProfferService);
        if (SUCCEEDED(hr1) && theProfferService != 0)
        {
          DWORD cookie;
          theProfferService->ProfferService(IID_IAuthenticate, this, &cookie);
        }
      }
      _wpt.InstallHook();
      DispEventAdvise(pUnkSite, &DIID_DWebBrowserEvents2);
    }
  } else {
    DispEventUnadvise(_web_browser, &DIID_DWebBrowserEvents2);
    _wpt.Stop();
    _web_browser.Release();
  }
  ATLTRACE(_T("[WptBHO] SetSite complete\n"));
  return IObjectWithSiteImpl<WptBHO>::SetSite(pUnkSite);
}


HRESULT STDMETHODCALLTYPE WptBHO::Authenticate(
  __RPC__deref_out_opt HWND *phwnd,
  __RPC__deref_out_opt LPWSTR *pszUsername,
  __RPC__deref_out_opt LPWSTR *pszPassword) {
  ATLTRACE(_T("[WptBHO] Request for Authentication"));
  basicAuthDismissed = true;
  return E_ACCESSDENIED;
}

HRESULT STDMETHODCALLTYPE WptBHO::QueryService(REFGUID guidService, REFIID riid, void** ppvObject) {    
  if (guidService == IID_IAuthenticate && riid == IID_IAuthenticate) {
    return QueryInterface(IID_IAuthenticate, ppvObject);
  }
  return INET_E_DEFAULT_ACTION;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) WptBHO::OnBeforeNavigate2(IDispatch *pDisp, VARIANT * vUrl,
            VARIANT * Flags, VARIANT * TargetFrameName, VARIANT * PostData, 
            VARIANT * Headers, VARIANT_BOOL * Cancel ) {
  CString url;
  if (vUrl)
    url = *vUrl;
  ATLTRACE(_T("[WptBHO] OnBeforeNavigate2 - %s"), url);
  CComPtr<IUnknown> unknown_browser = _web_browser;
  CComPtr<IUnknown> unknown_frame = pDisp;
  if (unknown_browser && unknown_frame && unknown_browser == unknown_frame) {
    _wpt.OnNavigate();
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) WptBHO::OnDocumentComplete(IDispatch *pDisp, 
            VARIANT * vUrl) {
  CString url;
  if (vUrl)
    url = *vUrl;

  CComPtr<IUnknown> unknown_browser = _web_browser;
  CComPtr<IUnknown> unknown_frame = pDisp;
  if (unknown_browser && unknown_frame && unknown_browser == unknown_frame) {
    _wpt.OnLoad();
    if (!url.CompareNoCase(_T("about:blank"))) {
      _wpt.Install(_web_browser);
    } else if(!url.CompareNoCase(_T("http://127.0.0.1:8888/blank.html"))) {
      _wpt.Start();
    }
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) WptBHO::OnNavigateError(IDispatch *pDisp, VARIANT *vUrl, 
            VARIANT *TargetFrameName, VARIANT *StatusCode, 
            VARIANT_BOOL *Cancel) {
  DWORD code = 0;
  // if we forcibly dismissed a basic auth dialog, the
  // returned status code is invalid. Use 401 instead.
  if (basicAuthDismissed) {
    code = 401;
    basicAuthDismissed = true;
  } else if (StatusCode) {
    code = StatusCode->lVal;
  }
  if (!code) {
    code = -1;
  }
  CString url;
  if (vUrl)
    url = *vUrl;

  CComPtr<IUnknown> unknown_browser = _web_browser;
  CComPtr<IUnknown> unknown_frame = pDisp;
  if (unknown_browser && unknown_frame && unknown_browser == unknown_frame) {
    CString buff;
    buff.Format(_T("[WptBHO] - NavigateError (%d)"), code);
    ATLTRACE(buff);
    _wpt.OnNavigateError(code);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) WptBHO::OnQuit(VOID) {
  _wpt.OnLoad();
}

/*-----------------------------------------------------------------------------
  See if we need to block all popup windows
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) WptBHO::OnNewWindow2(IDispatch ** pDisp, 
            VARIANT_BOOL *Cancel) {

  if (_wpt._active && Cancel) {
    *Cancel = VARIANT_TRUE;
  }
}

/*-----------------------------------------------------------------------------
  See if we need to block all popup windows
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) WptBHO::OnNewWindow3(IDispatch **ppDisp, 
            VARIANT_BOOL *Cancel, DWORD dwFlags, BSTR bstrUrlContext, 
            BSTR bstrUrl) {

  if (_wpt._active && Cancel) 	{
    *Cancel = VARIANT_TRUE;
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) WptBHO::OnStatusTextChange(BSTR bstrStatus) {
  CString status(bstrStatus);
  status.Trim();
  if (status.GetLength()) {
    _wpt.OnStatus(status);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) WptBHO::OnTitleChange(BSTR bstrTitle) {
  CString title(bstrTitle);
  if( title.GetLength() && title.CompareNoCase(_T("about:blank"))) {
    _wpt.OnTitle(title);
  }
}
