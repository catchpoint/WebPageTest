// WptBHO.h : Declaration of the WptBHO

#pragma once
#include "resource.h"       // main symbols
#include "wptbho_i.h"
#include "wpt.h"

#if defined(_WIN32_WCE) && !defined(_CE_DCOM) && !defined(_CE_ALLOW_SINGLE_THREADED_OBJECTS_IN_MTA)
#error "Single-threaded COM objects are not properly supported on Windows CE platform, such as the Windows Mobile platforms that do not include full DCOM support. Define _CE_ALLOW_SINGLE_THREADED_OBJECTS_IN_MTA to force ATL to support creating single-thread COM object's and allow use of it's single-threaded COM object implementations. The threading model in your rgs file was set to 'Free' as that is the only threading model supported in non DCOM Windows CE platforms."
#endif

// WptBHO
class ATL_NO_VTABLE WptBHO :
  public CComObjectRootEx<CComSingleThreadModel>,
  public CComCoClass<WptBHO, &CLSID_WptBHO>,
  public IObjectWithSiteImpl<WptBHO>,
  public IDispEventImpl<1, WptBHO, &DIID_DWebBrowserEvents2, &LIBID_SHDocVw, 1, 1>,
  public IDispatchImpl<IWptBHO, &IID_IWptBHO, &LIBID_wptbhoLib, /*wMajor =*/ 1, /*wMinor =*/ 0>
{
public:
  WptBHO(){
  }

DECLARE_REGISTRY_RESOURCEID(IDR_WPTBHO)

DECLARE_NOT_AGGREGATABLE(WptBHO)

BEGIN_COM_MAP(WptBHO)
  COM_INTERFACE_ENTRY(IWptBHO)
  COM_INTERFACE_ENTRY(IDispatch)
  COM_INTERFACE_ENTRY(IObjectWithSite)
END_COM_MAP()

  DECLARE_PROTECT_FINAL_CONSTRUCT()
  BEGIN_SINK_MAP(WptBHO)
    SINK_ENTRY_EX(1, DIID_DWebBrowserEvents2, DISPID_BEFORENAVIGATE2, OnBeforeNavigate2 )
    SINK_ENTRY_EX(1, DIID_DWebBrowserEvents2, DISPID_DOCUMENTCOMPLETE, OnDocumentComplete )
    SINK_ENTRY_EX(1, DIID_DWebBrowserEvents2, DISPID_NAVIGATEERROR, OnNavigateError )
    SINK_ENTRY_EX(1, DIID_DWebBrowserEvents2, DISPID_NEWWINDOW2, OnNewWindow2 )
    SINK_ENTRY_EX(1, DIID_DWebBrowserEvents2, DISPID_NEWWINDOW3, OnNewWindow3 )
    SINK_ENTRY_EX(1, DIID_DWebBrowserEvents2, DISPID_ONQUIT, OnQuit )
    SINK_ENTRY_EX(1, DIID_DWebBrowserEvents2, DISPID_STATUSTEXTCHANGE, OnStatusTextChange )
    SINK_ENTRY_EX(1, DIID_DWebBrowserEvents2, DISPID_TITLECHANGE, OnTitleChange )
  END_SINK_MAP()

  HRESULT FinalConstruct()
  {
    return S_OK;
  }

  void FinalRelease()
  {
  }

  STDMETHOD_(void,OnBeforeNavigate2)( IDispatch *pDisp, VARIANT * vUrl, 
              VARIANT * Flags, VARIANT * TargetFrameName, VARIANT * PostData, 
              VARIANT * Headers, VARIANT_BOOL * Cancel );
  STDMETHOD_(void,OnDocumentComplete)( IDispatch *pDisp, VARIANT * vUrl );
  STDMETHOD_(void,OnNavigateError)( IDispatch *pDisp, VARIANT *vUrl, 
              VARIANT *TargetFrameName, VARIANT *StatusCode, 
              VARIANT_BOOL *Cancel);
  STDMETHOD_(void,OnNewWindow2)( IDispatch ** pDisp, VARIANT_BOOL *cancel );
  STDMETHOD_(void,OnNewWindow3)( IDispatch **ppDisp, VARIANT_BOOL *Cancel, 
              DWORD dwFlags, BSTR bstrUrlContext, BSTR bstrUrl);
  STDMETHOD_(void,OnQuit)( VOID );
  STDMETHOD_(void,OnStatusTextChange)( BSTR bstrStatus );
  STDMETHOD_(void,OnTitleChange)( BSTR bstrTitle );

public:
  // IObjectWithSite
  STDMETHOD(SetSite)(IUnknown *pUnkSite);

private:
  CComQIPtr<IWebBrowser2> _web_browser;
  Wpt   _wpt;

// leave this public empty to support the DECLARE_PROTECT_FINAL_CONSTRUCT macro
public:
};

OBJECT_ENTRY_AUTO(__uuidof(WptBHO), WptBHO)
