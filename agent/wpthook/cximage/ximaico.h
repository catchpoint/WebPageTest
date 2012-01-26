/*
 * File:	ximaico.h
 * Purpose:	ICON Image Class Loader and Writer
 */
/* ==========================================================
 * CxImageICO (c) 07/Aug/2001 Davide Pizzolato - www.xdp.it
 * For conditions of distribution and use, see copyright notice in ximage.h
 * ==========================================================
 */
#if !defined(__ximaICO_h)
#define __ximaICO_h

#include "ximage.h"

#if CXIMAGE_SUPPORT_ICO

class CxImageICO: public CxImage
{
typedef struct tagIconDirectoryEntry {
    uint8_t  bWidth;
    uint8_t  bHeight;
    uint8_t  bColorCount;
    uint8_t  bReserved;
    uint16_t  wPlanes;
    uint16_t  wBitCount;
    uint32_t dwBytesInRes;
    uint32_t dwImageOffset;
} ICONDIRENTRY;

typedef struct tagIconDir {
    uint16_t          idReserved;
    uint16_t          idType;
    uint16_t          idCount;
} ICONHEADER;

public:
	CxImageICO(): CxImage(CXIMAGE_FORMAT_ICO) {m_dwImageOffset=0;}

//	bool Load(const TCHAR * imageFileName){ return CxImage::Load(imageFileName,CXIMAGE_FORMAT_ICO);}
//	bool Save(const TCHAR * imageFileName){ return CxImage::Save(imageFileName,CXIMAGE_FORMAT_ICO);}
	bool Decode(CxFile * hFile);
	bool Decode(FILE *hFile) { CxIOFile file(hFile); return Decode(&file); }

#if CXIMAGE_SUPPORT_ENCODE
	bool Encode(CxFile * hFile, bool bAppend=false, int32_t nPageCount=0);
	bool Encode(CxFile * hFile, CxImage ** pImages, int32_t nPageCount);
	bool Encode(FILE *hFile, bool bAppend=false, int32_t nPageCount=0)
				{ CxIOFile file(hFile); return Encode(&file,bAppend,nPageCount); }
	bool Encode(FILE *hFile, CxImage ** pImages, int32_t nPageCount)
				{ CxIOFile file(hFile); return Encode(&file, pImages, nPageCount); }
#endif // CXIMAGE_SUPPORT_ENCODE
protected:
	uint32_t m_dwImageOffset;
};

#endif

#endif
