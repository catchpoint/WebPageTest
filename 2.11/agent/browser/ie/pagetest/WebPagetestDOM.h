// WebPagetestDOM.h : Declaration of the CWebPagetestDOM

#pragma once
#include "resource.h"       // main symbols



#if defined(_WIN32_WCE) && !defined(_CE_DCOM) && !defined(_CE_ALLOW_SINGLE_THREADED_OBJECTS_IN_MTA)
#error "Single-threaded COM objects are not properly supported on Windows CE platform, such as the Windows Mobile platforms that do not include full DCOM support. Define _CE_ALLOW_SINGLE_THREADED_OBJECTS_IN_MTA to force ATL to support creating single-thread COM object's and allow use of it's single-threaded COM object implementations. The threading model in your rgs file was set to 'Free' as that is the only threading model supported in non DCOM Windows CE platforms."
#endif


// IWebPagetestDOM
[
	object,
	uuid("B99A06EB-74B0-4DFA-A0AD-F7023293C7AB"),
	dual,	helpstring("IWebPagetestDOM Interface"),
	pointer_default(unique)
]
__interface IWebPagetestDOM : IDispatch
{
  [id(1)] HRESULT message([in] BSTR msg);
  [id(2)] HRESULT done(void);
};



// CWebPagetestDOM

[
	coclass,
	default(IWebPagetestDOM),
	threading(apartment),
	vi_progid("pagetest.WebPagetestDOM"),
	progid("pagetest.WebPagetestDOM.1"),
	version(1.0),
	uuid("FF51B225-5DCF-4A73-B7D0-CD086DA56030"),
	helpstring("WebPagetestDOM Class")
]
class ATL_NO_VTABLE CWebPagetestDOM :
	public IWebPagetestDOM
{
public:
	CWebPagetestDOM()
	{
	}

	DECLARE_PROTECT_FINAL_CONSTRUCT()

	HRESULT FinalConstruct()
	{
		return S_OK;
	}

	void FinalRelease()
	{
	}

public:

  STDMETHOD(message)(BSTR msg);
  STDMETHOD(done)(void);
};

