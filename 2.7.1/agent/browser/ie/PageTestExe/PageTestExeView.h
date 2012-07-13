
// PageTestExeView.h : interface of the CPageTestExeView class
//


#pragma once


class CPageTestExeView : public CHtmlView
{
protected: // create from serialization only
	CPageTestExeView();
	DECLARE_DYNCREATE(CPageTestExeView)

// Attributes
public:
	CPageTestExeDoc* GetDocument() const;

// Operations
public:

// Overrides
public:
	virtual BOOL PreCreateWindow(CREATESTRUCT& cs);
protected:
	virtual void OnInitialUpdate(); // called first time after construct

// Implementation
public:
	virtual ~CPageTestExeView();
#ifdef _DEBUG
	virtual void AssertValid() const;
	virtual void Dump(CDumpContext& dc) const;
#endif


protected:
	virtual void BeforeNavigate2(LPDISPATCH pDisp, VARIANT* URL, VARIANT* Flags, VARIANT* TargetFrameName, VARIANT* PostData, VARIANT* Headers, VARIANT_BOOL* Cancel);
	virtual void DocumentComplete(LPDISPATCH pDisp, VARIANT* URL);
	virtual void NavigateError(LPDISPATCH pDisp, VARIANT* pvURL, VARIANT* pvFrame, VARIANT* pvStatusCode, VARIANT_BOOL* pvbCancel);
	virtual void OnStatusTextChange(LPCTSTR lpszText);

// Generated message map functions
protected:
	DECLARE_MESSAGE_MAP()
public:
	afx_msg void OnDestroy();
};

#ifndef _DEBUG  // debug version in PageTestExeView.cpp
inline CPageTestExeDoc* CPageTestExeView::GetDocument() const
   { return reinterpret_cast<CPageTestExeDoc*>(m_pDocument); }
#endif

