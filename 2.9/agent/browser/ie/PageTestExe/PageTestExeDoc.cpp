
// PageTestExeDoc.cpp : implementation of the CPageTestExeDoc class
//

#include "stdafx.h"
#include "PageTestExe.h"

#include "PageTestExeDoc.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#endif


// CPageTestExeDoc

IMPLEMENT_DYNCREATE(CPageTestExeDoc, CDocument)

BEGIN_MESSAGE_MAP(CPageTestExeDoc, CDocument)
END_MESSAGE_MAP()


// CPageTestExeDoc construction/destruction

CPageTestExeDoc::CPageTestExeDoc()
{
	// TODO: add one-time construction code here

}

CPageTestExeDoc::~CPageTestExeDoc()
{
}

BOOL CPageTestExeDoc::OnNewDocument()
{
	if (!CDocument::OnNewDocument())
		return FALSE;

	// TODO: add reinitialization code here
	// (SDI documents will reuse this document)

	return TRUE;
}




// CPageTestExeDoc serialization

void CPageTestExeDoc::Serialize(CArchive& ar)
{
	if (ar.IsStoring())
	{
		// TODO: add storing code here
	}
	else
	{
		// TODO: add loading code here
	}
}


// CPageTestExeDoc diagnostics

#ifdef _DEBUG
void CPageTestExeDoc::AssertValid() const
{
	CDocument::AssertValid();
}

void CPageTestExeDoc::Dump(CDumpContext& dc) const
{
	CDocument::Dump(dc);
}
#endif //_DEBUG


// CPageTestExeDoc commands
