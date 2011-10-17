// WptBHO.cpp : Implementation of WptBHO

#include "stdafx.h"
#include "resource.h"
#include "wptbho_i.h"
#include "dllmain.h"
#include "xdlldata.h"
#include "wptbho.h"

/*-----------------------------------------------------------------------------
  Main entry point that is called when IE starts up
-----------------------------------------------------------------------------*/
STDMETHODIMP WptBHO::SetSite(IUnknown *pUnkSite) {
  if (pUnkSite) {
    OutputDebugString(_T("[WptBHO] - SetSite\n"));
    _web_browser = pUnkSite;
    DispEventAdvise(pUnkSite, &DIID_DWebBrowserEvents2);
  } else {
    OutputDebugString(_T("[WptBHO] - SetSite releasing\n"));
    DispEventUnadvise(_web_browser, &DIID_DWebBrowserEvents2);
    _wpt.Stop();
    _web_browser.Release();
  }
  return IObjectWithSiteImpl<WptBHO>::SetSite(pUnkSite);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) WptBHO::OnBeforeNavigate2(IDispatch *pDisp, VARIANT * vUrl,
            VARIANT * Flags, VARIANT * TargetFrameName, VARIANT * PostData, 
            VARIANT * Headers, VARIANT_BOOL * Cancel ) {
  CString url;
  if (vUrl)
    url = *vUrl;

  CComPtr<IUnknown> unknown_browser = _web_browser;
  CComPtr<IUnknown> unknown_frame = pDisp;
  if (unknown_browser && unknown_frame && unknown_browser == unknown_frame) {
    OutputDebugString(CString(_T("[WptBHO] - OnBeforeNavigate2: ")) + url);
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
    OutputDebugString(CString(_T("[WptBHO] - DocumentComplete: ")) + url);
    if (!url.CompareNoCase(_T("about:blank")))
      _wpt.Start(_web_browser);
    _wpt.OnLoad();
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) WptBHO::OnNavigateComplete(IDispatch *pDisp, 
            VARIANT * vUrl) {
  CString url;
  if (vUrl)
    url = *vUrl;
    
  CComPtr<IUnknown> unknown_browser = _web_browser;
  CComPtr<IUnknown> unknown_frame = pDisp;
  if (unknown_browser && unknown_frame && unknown_browser == unknown_frame) {
    OutputDebugString(CString(_T("[WptBHO] - NavigateComplete: ")) + url);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) WptBHO::OnNavigateError(IDispatch *pDisp, VARIANT *vUrl, 
            VARIANT *TargetFrameName, VARIANT *StatusCode, 
            VARIANT_BOOL *Cancel) {
  DWORD code = 0;
  if( StatusCode )
    code = StatusCode->lVal;
  if( !code )
    code = -1;
  CString url;
  if (vUrl)
    url = *vUrl;

  CComPtr<IUnknown> unknown_browser = _web_browser;
  CComPtr<IUnknown> unknown_frame = pDisp;
  if (unknown_browser && unknown_frame && unknown_browser == unknown_frame) {
    CString buff;
    buff.Format(_T("[WptBHO] - NavigateError (%d): "), code);
    OutputDebugString(buff + url);
    _wpt.OnLoad();
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) WptBHO::OnQuit(VOID) {
  OutputDebugString(_T("[WptBHO] - OnQuit\n"));
  _wpt.OnLoad();
}

/*-----------------------------------------------------------------------------
  See if we need to block all popup windows
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) WptBHO::OnNewWindow2(IDispatch ** pDisp, 
            VARIANT_BOOL *Cancel) {
  OutputDebugString(_T("[WptBHO] - OnNewWindow2\n"));
  if (_wpt._active && Cancel) {
    OutputDebugString(_T("[WptBHO] - OnNewWindow2 - blocking\n"));
    *Cancel = VARIANT_TRUE;
  }
}

/*-----------------------------------------------------------------------------
  See if we need to block all popup windows
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) WptBHO::OnNewWindow3(IDispatch **ppDisp, 
            VARIANT_BOOL *Cancel, DWORD dwFlags, BSTR bstrUrlContext, 
            BSTR bstrUrl) {
  OutputDebugString(_T("[WptBHO] - OnNewWindow3\n"));
  if (_wpt._active && Cancel) 	{
    OutputDebugString(_T("[WptBHO] - OnNewWindow3 - blocking\n"));
    *Cancel = VARIANT_TRUE;
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) WptBHO::OnStatusTextChange(BSTR bstrStatus) {
  CString status(bstrStatus);
  status.Trim();
  if (status.GetLength()) {
    OutputDebugString(CString(_T("[WptBHO] - Status: ")) + status);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP_(void) WptBHO::OnTitleChange(BSTR bstrTitle) {
  CString title(bstrTitle);
  if( title.GetLength() && title.CompareNoCase(_T("about:blank"))) {
    OutputDebugString(CString(_T("[WptBHO] - Title Set: ")) + title);
    _wpt.OnTitle(title);
  }
}
