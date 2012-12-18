/*
 * File:	ximawbmp.h
 * Purpose:	WBMP Image Class Loader and Writer
 */
/* ==========================================================
 * CxImageWBMP (c) 12/Jul/2002 Davide Pizzolato - www.xdp.it
 * For conditions of distribution and use, see copyright notice in ximage.h
 * ==========================================================
 */
#if !defined(__ximaWBMP_h)
#define __ximaWBMP_h

#include "ximage.h"

#if CXIMAGE_SUPPORT_WBMP

class CxImageWBMP: public CxImage
{
#pragma pack(1)
typedef struct tagWbmpHeader
{
    uint32_t  Type;            // 0
    uint8_t   FixHeader;       // 0
    uint32_t  ImageWidth;      // Image Width
    uint32_t  ImageHeight;     // Image Height
} WBMPHEADER;
#pragma pack()
public:
	CxImageWBMP(): CxImage(CXIMAGE_FORMAT_WBMP) {}

//	bool Load(const TCHAR * imageFileName){ return CxImage::Load(imageFileName,CXIMAGE_FORMAT_WBMP);}
//	bool Save(const TCHAR * imageFileName){ return CxImage::Save(imageFileName,CXIMAGE_FORMAT_WBMP);}
	bool Decode(CxFile * hFile);
	bool Decode(FILE *hFile) { CxIOFile file(hFile); return Decode(&file); }
protected:
	bool ReadOctet(CxFile * hFile, uint32_t *data);

public:
#if CXIMAGE_SUPPORT_ENCODE
	bool Encode(CxFile * hFile);
	bool Encode(FILE *hFile) { CxIOFile file(hFile); return Encode(&file); }
protected:
	bool WriteOctet(CxFile * hFile, const uint32_t data);
#endif // CXIMAGE_SUPPORT_ENCODE
};

#endif

#endif
