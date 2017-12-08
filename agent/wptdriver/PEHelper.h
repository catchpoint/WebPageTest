#pragma once
#include <atlstr.h>

#define CV_SIGNATURE_NB10	'01BN'
#define CV_SIGNATURE_NB09	'90BN'
#define CV_SIGNATURE_RSDS   'SDSR'
typedef struct _CV_HEADER {
	DWORD dwSignature;
	DWORD dwOffset;
} CV_HEADER, *PCV_HEADER;

typedef struct _CV_INFO_PDB20 {
	CV_HEADER CvHeader;
	DWORD dwSignature;
	DWORD dwAge;
	BYTE PdbFileName[1];
} CV_INFO_PDB20, *PCV_INFO_PDB20;

typedef struct _CV_INFO_PDB70 {
	DWORD dwHeader;
	GUID  Signature;
	DWORD dwAge;
	CHAR  PdbFileName[1];
} CV_INFO_PDB70, *PCV_INFO_PDB70;

class CPEHelper {
public:
	CPEHelper(void);
	~CPEHelper(void);

	bool OpenAndVerify(LPCTSTR pFilePathName);
	void GetPDBInfo(CString& strPDBSignature, DWORD& dwPDBAge);
	void GetBinFileIndex(CString& strIndex);
	void GetPdbFileIndex(CString& strIndex);

protected:
	void InternalClean();
	ULONG RVAToFOA(DWORD dwRva);

private:
	DWORD m_dwMchine;

	HANDLE m_hFile;
	HANDLE m_hFileMapping;
	LPVOID m_pBuffer;

	PIMAGE_DOS_HEADER	m_pImageDosHeader;
	PIMAGE_FILE_HEADER	m_pImageFileHeader;

	LPVOID				m_pNtHeader;
};