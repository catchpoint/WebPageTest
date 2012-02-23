
// PageTestExeDoc.h : interface of the CPageTestExeDoc class
//


#pragma once


class CPageTestExeDoc : public CDocument
{
protected: // create from serialization only
	CPageTestExeDoc();
	DECLARE_DYNCREATE(CPageTestExeDoc)

// Attributes
public:

// Operations
public:

// Overrides
public:
	virtual BOOL OnNewDocument();
	virtual void Serialize(CArchive& ar);

// Implementation
public:
	virtual ~CPageTestExeDoc();
#ifdef _DEBUG
	virtual void AssertValid() const;
	virtual void Dump(CDumpContext& dc) const;
#endif

protected:

// Generated message map functions
protected:
	DECLARE_MESSAGE_MAP()
};


