// WebPagetestDOM.cpp : Implementation of CWebPagetestDOM

#include "stdafx.h"
#include "WebPagetestDOM.h"
#include "WatchDlg.h"

// CWebPagetestDOM


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP CWebPagetestDOM::message(BSTR msg)
{
  if( dlg )
  {
    CString mg(msg);
    dlg->StatusUpdate(CString(_T("JS Message: ")) + mg);
  }

  return S_OK;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
STDMETHODIMP CWebPagetestDOM::done(void)
{
  if( dlg )
    dlg->JSDone();

  return S_OK;
}
