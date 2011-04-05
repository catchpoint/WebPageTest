
// PageTestExeView.cpp : implementation of the CPageTestExeView class
//

#include "stdafx.h"
#include "PageTestExe.h"

#include "PageTestExeDoc.h"
#include "PageTestExeView.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#endif


// CPageTestExeView

IMPLEMENT_DYNCREATE(CPageTestExeView, CHtmlView)

BEGIN_MESSAGE_MAP(CPageTestExeView, CHtmlView)
	// Standard printing commands
	ON_COMMAND(ID_FILE_PRINT, &CHtmlView::OnFilePrint)
	ON_WM_DESTROY()
END_MESSAGE_MAP()

// CPageTestExeView construction/destruction

CPageTestExeView::CPageTestExeView()
{
	// TODO: add construction code here

}

CPageTestExeView::~CPageTestExeView()
{
}

BOOL CPageTestExeView::PreCreateWindow(CREATESTRUCT& cs)
{
	// TODO: Modify the Window class or styles here by modifying
	//  the CREATESTRUCT cs

	return CHtmlView::PreCreateWindow(cs);
}


// CPageTestExeView printing



// CPageTestExeView diagnostics

#ifdef _DEBUG
void CPageTestExeView::AssertValid() const
{
	CHtmlView::AssertValid();
}

void CPageTestExeView::Dump(CDumpContext& dc) const
{
	CHtmlView::Dump(dc);
}

CPageTestExeDoc* CPageTestExeView::GetDocument() const // non-debug version is inline
{
	ASSERT(m_pDocument->IsKindOf(RUNTIME_CLASS(CPageTestExeDoc)));
	return (CPageTestExeDoc*)m_pDocument;
}
#endif //_DEBUG


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CPageTestExeView::OnInitialUpdate()
{
	CHtmlView::OnInitialUpdate();

	CWatchDlg::CreateDlg();

	if( dlg )
	{
		dlg->hMainWindow = *(AfxGetApp()->m_pMainWnd);
		
		if( m_pBrowserApp )
			dlg->AddBrowser(m_pBrowserApp);
	}

	// suppress any dialogs (not file attach dialogs though)
	SetSilent(TRUE);
		
	//dlg->EnableUI();
	//Navigate2(_T("http://stevesouders.com/cuzillion/?c0=hj1hfff2_0_f&c1=hj1hfff2_0_f&c2=hj1hfff2_0_f&c3=hj1hfff2_0_f&c4=hj1hfff2_0_f&c5=hj1hfff2_0_f&c6=hj1hfff2_0_f&c7=hj1hfff2_0_f&c8=hj1hfff2_0_f&c9=hj1hfff2_0_f&t=1267640232874"),NULL,NULL);
	
	Navigate2(_T("about:blank"),NULL,NULL);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CPageTestExeView::OnDestroy()
{
	if( dlg && m_pBrowserApp )
		dlg->RemoveBrowser( m_pBrowserApp );
		
	CWatchDlg::DestroyDlg();

	CHtmlView::OnDestroy();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CPageTestExeView::BeforeNavigate2(LPDISPATCH pDisp, VARIANT* url, VARIANT* Flags, VARIANT* TargetFrameName, VARIANT* PostData, VARIANT* Headers, VARIANT_BOOL* Cancel)
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
    if( SUCCEEDED( m_pBrowserApp->QueryInterface(IID_IUnknown, (void**)&pUnkBrowser) ) )
    {
        if( SUCCEEDED( pDisp->QueryInterface(IID_IUnknown, (void**)&pUnkDisp) ) )
        {
			if( dlg )
			{
				if (pUnkBrowser == pUnkDisp)
				{
					ATLTRACE(_T("[Pagetest] - OnBeforeNavigate2 - url = %s\n"), (LPCTSTR)szUrl);
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

	CHtmlView::BeforeNavigate2(pDisp, url, Flags, TargetFrameName, PostData, Headers, Cancel);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CPageTestExeView::DocumentComplete(LPDISPATCH pDisp, VARIANT* url)
{
	CString szUrl;
	if( url )
		szUrl = *url;

    IUnknown* pUnkBrowser = NULL;
    IUnknown* pUnkDisp = NULL;

    // Is this the DocumentComplete event for the top frame window?
    // Check COM identity: compare IUnknown interface pointers.
    if( SUCCEEDED( m_pBrowserApp->QueryInterface(IID_IUnknown, (void**)&pUnkBrowser) ) )
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

	CHtmlView::DocumentComplete(pDisp, url);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CPageTestExeView::NavigateError(LPDISPATCH pDisp, VARIANT* url, VARIANT* TargetFrameName, VARIANT* StatusCode, VARIANT_BOOL* pvbCancel)
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
    if( SUCCEEDED( m_pBrowserApp->QueryInterface(IID_IUnknown, (void**)&pUnkBrowser) ) )
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

	CHtmlView::NavigateError(pDisp, url, TargetFrameName, StatusCode, pvbCancel);
}

/*-----------------------------------------------------------------------------
	Status message callbacks
-----------------------------------------------------------------------------*/
void CPageTestExeView::OnStatusTextChange(LPCTSTR lpszText)
{
	if( dlg )
		dlg->StatusUpdate(lpszText);
}
