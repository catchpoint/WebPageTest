/*
 * File:	ximapcx.h
 * Purpose:	PCX Image Class Loader and Writer
 */
/* ==========================================================
 * CxImagePCX (c) 05/Jan/2002 Davide Pizzolato - www.xdp.it
 * For conditions of distribution and use, see copyright notice in ximage.h
 *
 * Parts of the code come from Paintlib: Copyright (c) 1996-1998 Ulrich von Zadow
 * ==========================================================
 */
#if !defined(__ximaPCX_h)
#define __ximaPCX_h

#include "ximage.h"

#if CXIMAGE_SUPPORT_PCX

class CxImagePCX: public CxImage
{
// PCX Image File
#pragma pack(1)
typedef struct tagPCXHEADER
{
  char Manufacturer;	// always 0X0A
  char Version;			// version number
  char Encoding;		// always 1
  char BitsPerPixel;	// color bits
  uint16_t Xmin, Ymin;		// image origin
  uint16_t Xmax, Ymax;		// image dimensions
  uint16_t Hres, Vres;		// resolution values
  uint8_t ColorMap[16][3];	// color palette
  char Reserved;
  char ColorPlanes;		// color planes
  uint16_t BytesPerLine;	// line buffer size
  uint16_t PaletteType;		// grey or color palette
  char Filter[58];
} PCXHEADER;
#pragma pack()

public:
	CxImagePCX(): CxImage(CXIMAGE_FORMAT_PCX) {}

//	bool Load(const TCHAR * imageFileName){ return CxImage::Load(imageFileName,CXIMAGE_FORMAT_PCX);}
//	bool Save(const TCHAR * imageFileName){ return CxImage::Save(imageFileName,CXIMAGE_FORMAT_PCX);}
	bool Decode(CxFile * hFile);
	bool Decode(FILE *hFile) { CxIOFile file(hFile); return Decode(&file); }

#if CXIMAGE_SUPPORT_ENCODE
	bool Encode(CxFile * hFile);
	bool Encode(FILE *hFile) { CxIOFile file(hFile); return Encode(&file); }
#endif // CXIMAGE_SUPPORT_ENCODE
protected:
	bool PCX_PlanesToPixels(uint8_t * pixels, uint8_t * bitplanes, int16_t bytesperline, int16_t planes, int16_t bitsperpixel);
	bool PCX_UnpackPixels(uint8_t * pixels, uint8_t * bitplanes, int16_t bytesperline, int16_t planes, int16_t bitsperpixel);
	void PCX_PackPixels(const int32_t p,uint8_t &c, uint8_t &n, CxFile &f);
	void PCX_PackPlanes(uint8_t* buff, const int32_t size, CxFile &f);
	void PCX_PixelsToPlanes(uint8_t* raw, int32_t width, uint8_t* buf, int32_t plane);
	void PCX_toh(PCXHEADER* p);
};

#endif

#endif
