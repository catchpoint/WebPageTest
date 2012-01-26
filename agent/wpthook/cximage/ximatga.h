/*
 * File:	ximatga.h
 * Purpose:	TARGA Image Class Loader and Writer
 */
/* ==========================================================
 * CxImageTGA (c) 05/Jan/2002 Davide Pizzolato - www.xdp.it
 * For conditions of distribution and use, see copyright notice in ximage.h
 *
 * Parts of the code come from Paintlib : Copyright (c) 1996-1998 Ulrich von Zadow
 * ==========================================================
 */
#if !defined(__ximaTGA_h)
#define __ximaTGA_h

#include "ximage.h"

#if CXIMAGE_SUPPORT_TGA

class CxImageTGA: public CxImage
{
#pragma pack(1)
typedef struct tagTgaHeader
{
    uint8_t   IdLength;            // Image ID Field Length
    uint8_t   CmapType;            // Color Map Type
    uint8_t   ImageType;           // Image Type

    uint16_t   CmapIndex;           // First Entry Index
    uint16_t   CmapLength;          // Color Map Length
    uint8_t   CmapEntrySize;       // Color Map Entry Size

    uint16_t   X_Origin;            // X-origin of Image
    uint16_t   Y_Origin;            // Y-origin of Image
    uint16_t   ImageWidth;          // Image Width
    uint16_t   ImageHeight;         // Image Height
    uint8_t   PixelDepth;          // Pixel Depth
    uint8_t   ImagDesc;            // Image Descriptor
} TGAHEADER;
#pragma pack()

public:
	CxImageTGA(): CxImage(CXIMAGE_FORMAT_TGA) {}

//	bool Load(const TCHAR * imageFileName){ return CxImage::Load(imageFileName,CXIMAGE_FORMAT_TGA);}
//	bool Save(const TCHAR * imageFileName){ return CxImage::Save(imageFileName,CXIMAGE_FORMAT_TGA);}
	bool Decode(CxFile * hFile);
	bool Decode(FILE *hFile) { CxIOFile file(hFile); return Decode(&file); }

#if CXIMAGE_SUPPORT_ENCODE
	bool Encode(CxFile * hFile);
	bool Encode(FILE *hFile) { CxIOFile file(hFile); return Encode(&file); }
#endif // CXIMAGE_SUPPORT_ENCODE
protected:
	uint8_t ExpandCompressedLine(uint8_t* pDest,TGAHEADER* ptgaHead,CxFile *hFile,int32_t width, int32_t y, uint8_t rleLeftover);
	void ExpandUncompressedLine(uint8_t* pDest,TGAHEADER* ptgaHead,CxFile *hFile,int32_t width, int32_t y, int32_t xoffset);
	void tga_toh(TGAHEADER* p);
};

#endif

#endif
