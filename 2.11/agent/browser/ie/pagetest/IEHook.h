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

// IEHook.h : Declaration of the CIEHook

#pragma once
#include "resource.h"       // main symbols
#include <ExDispID.h>
#include "WsHook.h"
#include "WinInetHook.h"
#include "SchannelHook.h"
#include "GDIHook.h"
#include "chrome_tab_h.h"

// Chrome Frame callback helper
// Callback description for onload, onloaderror, onmessage
static _ATL_FUNC_INFO g_single_param = {CC_STDCALL, VT_EMPTY, 1, {VT_VARIANT}};
// Simple class that forwards the callbacks.
template <typename T>
class DispCallback
    : public IDispEventSimpleImpl<1, DispCallback<T>, &IID_IDispatch> {
 public:
  typedef HRESULT (T::*Method)(const VARIANT* param);

  DispCallback(T* owner, Method method) : owner_(owner), method_(method) {
  }

  BEGIN_SINK_MAP(DispCallback)
    SINK_ENTRY_INFO(1, IID_IDispatch, DISPID_VALUE, OnCallback, &g_single_param)
  END_SINK_MAP()

  virtual ULONG STDMETHODCALLTYPE AddRef() {
    return owner_->AddRef();
  }
  virtual ULONG STDMETHODCALLTYPE Release() {
    return owner_->Release();
  }

  STDMETHOD(OnCallback)(VARIANT param) {
    return (owner_->*method_)(&param);
  }

  IDispatch* ToDispatch() {
    return reinterpret_cast<IDispatch*>(this);
  }

  T* owner_;
  Method method_;
};

// IIEHook
[
	object,
	uuid("59A9D08C-033F-40C8-82B7-7917BA99F236"),
	dual,	helpstring("IIEHook Interface"),
	pointer_default(unique)
]
__interface IIEHook : IDispatch
{
};



// CIEHook
[
	coclass,
	threading(apartment),
	aggregatable(never),
	vi_progid("Pagetest.IEHook"),
	progid("Pagetest.IEHook.1"),
	version(1.0),
	uuid("00000000-0000-0000-0000-04F456A2D199"),
	helpstring("IEHook Class")
]
class ATL_NO_VTABLE CIEHook : 
	public IObjectWithSiteImpl<CIEHook>,
	public IOleCommandTarget,
	public IDispEventImpl<1, CIEHook, &DIID_DWebBrowserEvents2, &LIBID_SHDocVw, 1, 1>,
   	public IIEHook
{
public:
  CIEHook():
      onloaderror_(this, &CIEHook::OnLoadError)
      , onload_(this, &CIEHook::OnLoad)
  {
	}

	DECLARE_PROTECT_FINAL_CONSTRUCT()

	BEGIN_SINK_MAP(CIEHook)
		SINK_ENTRY_EX(1, DIID_DWebBrowserEvents2, DISPID_BEFORENAVIGATE2, OnBeforeNavigate2 )
		SINK_ENTRY_EX(1, DIID_DWebBrowserEvents2, DISPID_DOCUMENTCOMPLETE, OnDocumentComplete )
		SINK_ENTRY_EX(1, DIID_DWebBrowserEvents2, DISPID_DOWNLOADBEGIN, OnDownloadBegin )
		SINK_ENTRY_EX(1, DIID_DWebBrowserEvents2, DISPID_DOWNLOADCOMPLETE, OnDownloadComplete )
		SINK_ENTRY_EX(1, DIID_DWebBrowserEvents2, DISPID_NAVIGATECOMPLETE2, OnNavigateComplete )
		SINK_ENTRY_EX(1, DIID_DWebBrowserEvents2, DISPID_NAVIGATEERROR, OnNavigateError )
		SINK_ENTRY_EX(1, DIID_DWebBrowserEvents2, DISPID_NEWWINDOW2, OnNewWindow2 )
		SINK_ENTRY_EX(1, DIID_DWebBrowserEvents2, DISPID_NEWWINDOW3, OnNewWindow3 )
		SINK_ENTRY_EX(1, DIID_DWebBrowserEvents2, DISPID_ONQUIT, OnQuit )
		SINK_ENTRY_EX(1, DIID_DWebBrowserEvents2, DISPID_STATUSTEXTCHANGE, OnStatusTextChange )
		SINK_ENTRY_EX(1, DIID_DWebBrowserEvents2, DISPID_TITLECHANGE, OnTitleChange )
	END_SINK_MAP()

	HRESULT FinalConstruct(){return S_OK;}
	void FinalRelease(){}

	STDMETHOD_(void,OnBeforeNavigate2)( IDispatch *pDisp, VARIANT * url, VARIANT * Flags, VARIANT * TargetFrameName, VARIANT * PostData, VARIANT * Headers, VARIANT_BOOL * Cancel );
	STDMETHOD_(void,OnDocumentComplete)( IDispatch *pDisp, VARIANT * url );
	STDMETHOD_(void,OnDownloadBegin)( VOID );
	STDMETHOD_(void,OnDownloadComplete)( VOID );
	STDMETHOD_(void,OnNavigateComplete)( IDispatch *pDisp, VARIANT * url );
	STDMETHOD_(void,OnNavigateError)( IDispatch *pDisp, VARIANT *url, VARIANT *TargetFrameName, VARIANT *StatusCode, VARIANT_BOOL *Cancel);
	STDMETHOD_(void,OnNewWindow2)( IDispatch ** pDisp, VARIANT_BOOL *cancel );
	STDMETHOD_(void,OnNewWindow3)( IDispatch **ppDisp, VARIANT_BOOL *Cancel, DWORD dwFlags, BSTR bstrUrlContext, BSTR bstrUrl);
	STDMETHOD_(void,OnQuit)( VOID );
	STDMETHOD_(void,OnStatusTextChange)( BSTR bstrStatus );
	STDMETHOD_(void,OnTitleChange)( BSTR bstrTitle );

	// IOleObjectWithSite Methods
	STDMETHOD(SetSite)(IUnknown *pUnkSite);

	// IOleCommandTarget Methods
	STDMETHOD_(HRESULT,QueryStatus)(const GUID *pguidCmdGroup, ULONG cCmds, OLECMD prgCmds[], OLECMDTEXT *pCmdText);
	STDMETHOD_(HRESULT,Exec)(const GUID *pguidCmdGroup, DWORD nCmdID, DWORD nCmdExecOpt, VARIANT *pvaIn, VARIANT *pvaOut);

  // Chrome Frame Callbacks
  HRESULT OnLoad(const VARIANT* param);
  HRESULT OnLoadError(const VARIANT* param);
  DispCallback<CIEHook> onloaderror_;
  DispCallback<CIEHook> onload_;

private:
	// Smart pointer to browser
	CComQIPtr<IWebBrowser2, &IID_IWebBrowser2> m_spWebBrowser2;
	CComQIPtr<IChromeFrame, &IID_IChromeFrame> m_spChromeFrame;
	
	CComPtr<IClassFactory> m_spCFHTTP;
	CComPtr<IClassFactory> m_spCFHTTPS;
	void InstallHooks(void);
	HRESULT RemoveHooks(void);
	bool BlockPopups();
  bool AttachChromeFrame();
};

