/*
 * File:	ximage.h
 * Purpose:	General Purpose Image Class 
 */
/*
  --------------------------------------------------------------------------------

	COPYRIGHT NOTICE, DISCLAIMER, and LICENSE:

	CxImage version 7.0.1 07/Jan/2011

	CxImage : Copyright (C) 2001 - 2010, Davide Pizzolato

	Original CImage and CImageIterator implementation are:
	Copyright (C) 1995, Alejandro Aguilar Sierra (asierra(at)servidor(dot)unam(dot)mx)

	Covered code is provided under this license on an "as is" basis, without warranty
	of any kind, either expressed or implied, including, without limitation, warranties
	that the covered code is free of defects, merchantable, fit for a particular purpose
	or non-infringing. The entire risk as to the quality and performance of the covered
	code is with you. Should any covered code prove defective in any respect, you (not
	the initial developer or any other contributor) assume the cost of any necessary
	servicing, repair or correction. This disclaimer of warranty constitutes an essential
	part of this license. No use of any covered code is authorized hereunder except under
	this disclaimer.

	Permission is hereby granted to use, copy, modify, and distribute this
	source code, or portions hereof, for any purpose, including commercial applications,
	freely and without fee, subject to the following restrictions: 

	1. The origin of this software must not be misrepresented; you must not
	claim that you wrote the original software. If you use this software
	in a product, an acknowledgment in the product documentation would be
	appreciated but is not required.

	2. Altered source versions must be plainly marked as such, and must not be
	misrepresented as being the original software.

	3. This notice may not be removed or altered from any source distribution.

  --------------------------------------------------------------------------------

	Other information about CxImage, and the latest version, can be found at the
	CxImage home page: http://www.xdp.it/cximage/

  --------------------------------------------------------------------------------
 */
#if !defined(__CXIMAGE_H)
#define __CXIMAGE_H

#if _MSC_VER > 1000
#pragma once
#endif 

#ifdef _LINUX
  #define _XOPEN_SOURCE
  #include <unistd.h>
  #include <arpa/inet.h>
#endif

/////////////////////////////////////////////////////////////////////////////
#include "xfile.h"
#include "xiofile.h"
#include "xmemfile.h"
#include "ximadef.h"	//<vho> adjust some #define

/* see "ximacfg.h" for CxImage configuration options */

/////////////////////////////////////////////////////////////////////////////
// CxImage formats enumerator
enum ENUM_CXIMAGE_FORMATS{
CXIMAGE_FORMAT_UNKNOWN = 0,
#if CXIMAGE_SUPPORT_BMP
CXIMAGE_FORMAT_BMP = 1,
#endif
#if CXIMAGE_SUPPORT_GIF
CXIMAGE_FORMAT_GIF = 2,
#endif
#if CXIMAGE_SUPPORT_JPG
CXIMAGE_FORMAT_JPG = 3,
#endif
#if CXIMAGE_SUPPORT_PNG
CXIMAGE_FORMAT_PNG = 4,
#endif
#if CXIMAGE_SUPPORT_ICO
CXIMAGE_FORMAT_ICO = 5,
#endif
#if CXIMAGE_SUPPORT_TIF
CXIMAGE_FORMAT_TIF = 6,
#endif
#if CXIMAGE_SUPPORT_TGA
CXIMAGE_FORMAT_TGA = 7,
#endif
#if CXIMAGE_SUPPORT_PCX
CXIMAGE_FORMAT_PCX = 8,
#endif
#if CXIMAGE_SUPPORT_WBMP
CXIMAGE_FORMAT_WBMP = 9,
#endif
#if CXIMAGE_SUPPORT_WMF
CXIMAGE_FORMAT_WMF = 10,
#endif
#if CXIMAGE_SUPPORT_JP2
CXIMAGE_FORMAT_JP2 = 11,
#endif
#if CXIMAGE_SUPPORT_JPC
CXIMAGE_FORMAT_JPC = 12,
#endif
#if CXIMAGE_SUPPORT_PGX
CXIMAGE_FORMAT_PGX = 13,
#endif
#if CXIMAGE_SUPPORT_PNM
CXIMAGE_FORMAT_PNM = 14,
#endif
#if CXIMAGE_SUPPORT_RAS
CXIMAGE_FORMAT_RAS = 15,
#endif
#if CXIMAGE_SUPPORT_JBG
CXIMAGE_FORMAT_JBG = 16,
#endif
#if CXIMAGE_SUPPORT_MNG
CXIMAGE_FORMAT_MNG = 17,
#endif
#if CXIMAGE_SUPPORT_SKA
CXIMAGE_FORMAT_SKA = 18,
#endif
#if CXIMAGE_SUPPORT_RAW
CXIMAGE_FORMAT_RAW = 19,
#endif
#if CXIMAGE_SUPPORT_PSD
CXIMAGE_FORMAT_PSD = 20,
#endif
CMAX_IMAGE_FORMATS = CXIMAGE_SUPPORT_BMP + CXIMAGE_SUPPORT_GIF + CXIMAGE_SUPPORT_JPG +
					 CXIMAGE_SUPPORT_PNG + CXIMAGE_SUPPORT_MNG + CXIMAGE_SUPPORT_ICO +
					 CXIMAGE_SUPPORT_TIF + CXIMAGE_SUPPORT_TGA + CXIMAGE_SUPPORT_PCX +
					 CXIMAGE_SUPPORT_WBMP+ CXIMAGE_SUPPORT_WMF +
					 CXIMAGE_SUPPORT_JBG + CXIMAGE_SUPPORT_JP2 + CXIMAGE_SUPPORT_JPC +
					 CXIMAGE_SUPPORT_PGX + CXIMAGE_SUPPORT_PNM + CXIMAGE_SUPPORT_RAS +
					 CXIMAGE_SUPPORT_SKA + CXIMAGE_SUPPORT_RAW + CXIMAGE_SUPPORT_PSD + 1
};

#if CXIMAGE_SUPPORT_EXIF

#define MAX_COMMENT 255
#define MAX_SECTIONS 20

typedef struct tag_ExifInfo {
	char  Version      [5];
    char  CameraMake   [32];
    char  CameraModel  [40];
    char  DateTime     [20];
    int32_t   Height, Width;
    int32_t   Orientation;
    int32_t   IsColor;
    int32_t   Process;
    int32_t   FlashUsed;
    float FocalLength;
    float ExposureTime;
    float ApertureFNumber;
    float Distance;
    float CCDWidth;
    float ExposureBias;
    int32_t   Whitebalance;
    int32_t   MeteringMode;
    int32_t   ExposureProgram;
    int32_t   ISOequivalent;
    int32_t   CompressionLevel;
	float FocalplaneXRes;
	float FocalplaneYRes;
	float FocalplaneUnits;
	float Xresolution;
	float Yresolution;
	float ResolutionUnit;
	float Brightness;
    char  Comments[MAX_COMMENT+1];

    uint8_t * ThumbnailPointer;  /* Pointer at the thumbnail */
    unsigned ThumbnailSize;     /* Size of thumbnail. */

	bool  IsExif;
} EXIFINFO;

#endif //CXIMAGE_SUPPORT_EXIF

/////////////////////////////////////////////////////////////////////////////
// CxImage class
/////////////////////////////////////////////////////////////////////////////
class DLL_EXP CxImage
{
//extensible information collector
typedef struct tagCxImageInfo {
	uint32_t	dwEffWidth;			///< uint32_t aligned scan line width
	uint8_t*	pImage;				///< THE IMAGE BITS
	CxImage* pGhost;			///< if this is a ghost, pGhost points to the body
	CxImage* pParent;			///< if this is a layer, pParent points to the body
	uint32_t	dwType;				///< original image format
	char	szLastError[256];	///< debugging
	int32_t	nProgress;			///< monitor
	int32_t	nEscape;			///< escape
	int32_t	nBkgndIndex;		///< used for GIF, PNG, MNG
	RGBQUAD nBkgndColor;		///< used for RGB transparency
	float	fQuality;			///< used for JPEG, JPEG2000 (0.0f ... 100.0f)
	uint8_t	nJpegScale;			///< used for JPEG [ignacio]
	int32_t	nFrame;				///< used for TIF, GIF, MNG : actual frame
	int32_t	nNumFrames;			///< used for TIF, GIF, MNG : total number of frames
	uint32_t	dwFrameDelay;		///< used for GIF, MNG
	int32_t	xDPI;				///< horizontal resolution
	int32_t	yDPI;				///< vertical resolution
	RECT	rSelectionBox;		///< bounding rectangle
	uint8_t	nAlphaMax;			///< max opacity (fade)
	bool	bAlphaPaletteEnabled; ///< true if alpha values in the palette are enabled.
	bool	bEnabled;			///< enables the painting functions
	int32_t	xOffset;
	int32_t	yOffset;
	uint32_t	dwCodecOpt[CMAX_IMAGE_FORMATS];	///< for GIF, TIF : 0=def.1=unc,2=fax3,3=fax4,4=pack,5=jpg
	RGBQUAD last_c;				///< for GetNearestIndex optimization
	uint8_t	last_c_index;
	bool	last_c_isvalid;
	int32_t	nNumLayers;
	uint32_t	dwFlags;			///< 0x??00000 = reserved, 0x00??0000 = blend mode, 0x0000???? = layer id - user flags
	uint8_t	dispmeth;
	bool	bGetAllFrames;
	bool	bLittleEndianHost;

#if CXIMAGE_SUPPORT_EXIF
	EXIFINFO ExifInfo;
#endif

} CXIMAGEINFO;

public:
	//public structures
struct rgb_color { uint8_t r,g,b; };

#if CXIMAGE_SUPPORT_WINDOWS
// <VATI> text placement data
// members must be initialized with the InitTextInfo(&this) function.
typedef struct tagCxTextInfo
{
#if defined (_WIN32_WCE)
	TCHAR    text[256];  ///< text for windows CE
#else
	TCHAR    text[4096]; ///< text (char -> TCHAR for UNICODE [Cesar M])
#endif
	LOGFONT  lfont;      ///< font and codepage data
    COLORREF fcolor;     ///< foreground color
    int32_t     align;      ///< DT_CENTER, DT_RIGHT, DT_LEFT aligment for multiline text
    uint8_t     smooth;     ///< text smoothing option. Default is false.
    uint8_t     opaque;     ///< text has background or hasn't. Default is true.
						 ///< data for background (ignored if .opaque==FALSE) 
    COLORREF bcolor;     ///< background color
    float    b_opacity;  ///< opacity value for background between 0.0-1.0 Default is 0. (opaque)
    uint8_t     b_outline;  ///< outline width for background (zero: no outline)
    uint8_t     b_round;    ///< rounding radius for background rectangle. % of the height, between 0-50. Default is 10.
                         ///< (backgr. always has a frame: width = 3 pixel + 10% of height by default.)
} CXTEXTINFO;
#endif

public:
/** \addtogroup Constructors */ //@{
	CxImage(uint32_t imagetype = 0);
	CxImage(uint32_t dwWidth, uint32_t dwHeight, uint32_t wBpp, uint32_t imagetype = 0);
	CxImage(const CxImage &src, bool copypixels = true, bool copyselection = true, bool copyalpha = true);
#if CXIMAGE_SUPPORT_DECODE
	CxImage(const TCHAR * filename, uint32_t imagetype);	// For UNICODE support: char -> TCHAR
	CxImage(FILE * stream, uint32_t imagetype);
	CxImage(CxFile * stream, uint32_t imagetype);
	CxImage(uint8_t * buffer, uint32_t size, uint32_t imagetype);
#endif
	virtual ~CxImage() { DestroyFrames(); Destroy(); };
	CxImage& operator = (const CxImage&);
//@}

/** \addtogroup Initialization */ //@{
	void*	Create(uint32_t dwWidth, uint32_t dwHeight, uint32_t wBpp, uint32_t imagetype = 0);
	bool	Destroy();
	bool	DestroyFrames();
	void	Clear(uint8_t bval=0);
	void	Copy(const CxImage &src, bool copypixels = true, bool copyselection = true, bool copyalpha = true);
	bool	Transfer(CxImage &from, bool bTransferFrames = true);
	bool	CreateFromArray(uint8_t* pArray,uint32_t dwWidth,uint32_t dwHeight,uint32_t dwBitsperpixel, uint32_t dwBytesperline, bool bFlipImage);
	bool	CreateFromMatrix(uint8_t** ppMatrix,uint32_t dwWidth,uint32_t dwHeight,uint32_t dwBitsperpixel, uint32_t dwBytesperline, bool bFlipImage);
	void	FreeMemory(void* memblock);

	uint32_t Dump(uint8_t * dst);
	uint32_t UnDump(const uint8_t * src);
	uint32_t DumpSize();

//@}

/** \addtogroup Attributes */ //@{
	int32_t	GetSize();
	uint8_t*	GetBits(uint32_t row = 0);
	uint8_t	GetColorType();
	void*	GetDIB() const;
	uint32_t	GetHeight() const;
	uint32_t	GetWidth() const;
	uint32_t	GetEffWidth() const;
	uint32_t	GetNumColors() const;
	uint16_t	GetBpp() const;
	uint32_t	GetType() const;
	const char*	GetLastError();
	static const TCHAR* GetVersion();
	static const float GetVersionNumber();

	uint32_t	GetFrameDelay() const;
	void	SetFrameDelay(uint32_t d);

	void	GetOffset(int32_t *x,int32_t *y);
	void	SetOffset(int32_t x,int32_t y);

	uint8_t	GetJpegQuality() const;
	void	SetJpegQuality(uint8_t q);
	float	GetJpegQualityF() const;
	void	SetJpegQualityF(float q);

	uint8_t	GetJpegScale() const;
	void	SetJpegScale(uint8_t q);

#if CXIMAGE_SUPPORT_EXIF
	EXIFINFO *GetExifInfo() {return &info.ExifInfo;};
	bool  GetExifThumbnail(const TCHAR *filename, const TCHAR *outname, int32_t imageType);
  #if CXIMAGE_SUPPORT_TRANSFORMATION
	bool  RotateExif(int32_t orientation = 0);
  #endif
#endif

	int32_t	GetXDPI() const;
	int32_t	GetYDPI() const;
	void	SetXDPI(int32_t dpi);
	void	SetYDPI(int32_t dpi);

	uint32_t	GetClrImportant() const;
	void	SetClrImportant(uint32_t ncolors = 0);

	int32_t	GetProgress() const;
	int32_t	GetEscape() const;
	void	SetProgress(int32_t p);
	void	SetEscape(int32_t i);

	int32_t	GetTransIndex() const;
	RGBQUAD	GetTransColor();
	void	SetTransIndex(int32_t idx);
	void	SetTransColor(RGBQUAD rgb);
	bool	IsTransparent() const;

	uint32_t	GetCodecOption(uint32_t imagetype = 0);
	bool	SetCodecOption(uint32_t opt, uint32_t imagetype = 0);

	uint32_t	GetFlags() const;
	void	SetFlags(uint32_t flags, bool bLockReservedFlags = true);

	uint8_t	GetDisposalMethod() const;
	void	SetDisposalMethod(uint8_t dm);

	bool	SetType(uint32_t type);

	static uint32_t GetNumTypes();
	static uint32_t GetTypeIdFromName(const TCHAR* ext);
	static uint32_t GetTypeIdFromIndex(const uint32_t index);
	static uint32_t GetTypeIndexFromId(const uint32_t id);

	bool	GetRetreiveAllFrames() const;
	void	SetRetreiveAllFrames(bool flag);
	CxImage * GetFrame(int32_t nFrame) const;

	//void*	GetUserData() const {return info.pUserData;}
	//void	SetUserData(void* pUserData) {info.pUserData = pUserData;}
//@}

/** \addtogroup Palette
 * These functions have no effects on RGB images and in this case the returned value is always 0.
 * @{ */
	bool	IsGrayScale();
	bool	IsIndexed() const;
	bool	IsSamePalette(CxImage &img, bool bCheckAlpha = true);
	uint32_t	GetPaletteSize();
	RGBQUAD* GetPalette() const;
	RGBQUAD GetPaletteColor(uint8_t idx);
	bool	GetPaletteColor(uint8_t i, uint8_t* r, uint8_t* g, uint8_t* b);
	uint8_t	GetNearestIndex(RGBQUAD c);
	void	BlendPalette(COLORREF cr,int32_t perc);
	void	SetGrayPalette();
	void	SetPalette(uint32_t n, uint8_t *r, uint8_t *g, uint8_t *b);
	void	SetPalette(RGBQUAD* pPal,uint32_t nColors=256);
	void	SetPalette(rgb_color *rgb,uint32_t nColors=256);
	void	SetPaletteColor(uint8_t idx, uint8_t r, uint8_t g, uint8_t b, uint8_t alpha=0);
	void	SetPaletteColor(uint8_t idx, RGBQUAD c);
	void	SetPaletteColor(uint8_t idx, COLORREF cr);
	void	SwapIndex(uint8_t idx1, uint8_t idx2);
	void	SwapRGB2BGR();
	void	SetStdPalette();
//@}

/** \addtogroup Pixel */ //@{
	bool	IsInside(int32_t x, int32_t y);
	bool	IsTransparent(int32_t x,int32_t y);
	bool	GetTransparentMask(CxImage* iDst = 0);
	RGBQUAD GetPixelColor(int32_t x,int32_t y, bool bGetAlpha = true);
	uint8_t	GetPixelIndex(int32_t x,int32_t y);
	uint8_t	GetPixelGray(int32_t x, int32_t y);
	void	SetPixelColor(int32_t x,int32_t y,RGBQUAD c, bool bSetAlpha = false);
	void	SetPixelColor(int32_t x,int32_t y,COLORREF cr);
	void	SetPixelIndex(int32_t x,int32_t y,uint8_t i);
	void	DrawLine(int32_t StartX, int32_t EndX, int32_t StartY, int32_t EndY, RGBQUAD color, bool bSetAlpha=false);
	void	DrawLine(int32_t StartX, int32_t EndX, int32_t StartY, int32_t EndY, COLORREF cr);
	void	BlendPixelColor(int32_t x,int32_t y,RGBQUAD c, float blend, bool bSetAlpha = false);
//@}

protected:
/** \addtogroup Protected */ //@{
	uint8_t BlindGetPixelIndex(const int32_t x,const int32_t y);
	RGBQUAD BlindGetPixelColor(const int32_t x,const int32_t y, bool bGetAlpha = true);
	void *BlindGetPixelPointer(const int32_t x,const  int32_t y);
	void BlindSetPixelColor(int32_t x,int32_t y,RGBQUAD c, bool bSetAlpha = false);
	void BlindSetPixelIndex(int32_t x,int32_t y,uint8_t i);
//@}

public:

#if CXIMAGE_SUPPORT_INTERPOLATION
/** \addtogroup Interpolation */ //@{
	//overflow methods:
	enum OverflowMethod {
		OM_COLOR=1,
		OM_BACKGROUND=2,
		OM_TRANSPARENT=3,
		OM_WRAP=4,
		OM_REPEAT=5,
		OM_MIRROR=6
	};
	void OverflowCoordinates(float &x, float &y, OverflowMethod const ofMethod);
	void OverflowCoordinates(int32_t  &x, int32_t &y, OverflowMethod const ofMethod);
	RGBQUAD GetPixelColorWithOverflow(int32_t x, int32_t y, OverflowMethod const ofMethod=OM_BACKGROUND, RGBQUAD* const rplColor=0);
	//interpolation methods:
	enum InterpolationMethod {
		IM_NEAREST_NEIGHBOUR=1,
		IM_BILINEAR		=2,
		IM_BSPLINE		=3,
		IM_BICUBIC		=4,
		IM_BICUBIC2		=5,
		IM_LANCZOS		=6,
		IM_BOX			=7,
		IM_HERMITE		=8,
		IM_HAMMING		=9,
		IM_SINC			=10,
		IM_BLACKMAN		=11,
		IM_BESSEL		=12,
		IM_GAUSSIAN		=13,
		IM_QUADRATIC	=14,
		IM_MITCHELL		=15,
		IM_CATROM		=16,
		IM_HANNING		=17,
		IM_POWER		=18
	};
	RGBQUAD GetPixelColorInterpolated(float x,float y, InterpolationMethod const inMethod=IM_BILINEAR, OverflowMethod const ofMethod=OM_BACKGROUND, RGBQUAD* const rplColor=0);
	RGBQUAD GetAreaColorInterpolated(float const xc, float const yc, float const w, float const h, InterpolationMethod const inMethod, OverflowMethod const ofMethod=OM_BACKGROUND, RGBQUAD* const rplColor=0);
//@}

protected:
/** \addtogroup Protected */ //@{
	void  AddAveragingCont(RGBQUAD const &color, float const surf, float &rr, float &gg, float &bb, float &aa);
//@}

/** \addtogroup Kernels */ //@{
public:
	static float KernelBSpline(const float x);
	static float KernelLinear(const float t);
	static float KernelCubic(const float t);
	static float KernelGeneralizedCubic(const float t, const float a=-1);
	static float KernelLanczosSinc(const float t, const float r = 3);
	static float KernelBox(const float x);
	static float KernelHermite(const float x);
	static float KernelHamming(const float x);
	static float KernelSinc(const float x);
	static float KernelBlackman(const float x);
	static float KernelBessel_J1(const float x);
	static float KernelBessel_P1(const float x);
	static float KernelBessel_Q1(const float x);
	static float KernelBessel_Order1(float x);
	static float KernelBessel(const float x);
	static float KernelGaussian(const float x);
	static float KernelQuadratic(const float x);
	static float KernelMitchell(const float x);
	static float KernelCatrom(const float x);
	static float KernelHanning(const float x);
	static float KernelPower(const float x, const float a = 2);
//@}
#endif //CXIMAGE_SUPPORT_INTERPOLATION
	
/** \addtogroup Painting */ //@{
#if CXIMAGE_SUPPORT_WINDOWS
	int32_t	Blt(HDC pDC, int32_t x=0, int32_t y=0);
	HBITMAP Draw2HBITMAP(HDC hdc, int32_t x, int32_t y, int32_t cx, int32_t cy, RECT* pClipRect, bool bSmooth);
	HBITMAP MakeBitmap(HDC hdc = NULL, bool bTransparency = false);
	HICON   MakeIcon(HDC hdc = NULL, bool bTransparency = false);
	HANDLE	CopyToHandle();
	bool	CreateFromHANDLE(HANDLE hMem);		//Windows objects (clipboard)
	bool	CreateFromHBITMAP(HBITMAP hbmp, HPALETTE hpal=0, bool bTransparency = false);	//Windows resource
	bool	CreateFromHICON(HICON hico, bool bTransparency = false);
	int32_t	Draw(HDC hdc, int32_t x=0, int32_t y=0, int32_t cx = -1, int32_t cy = -1, RECT* pClipRect = 0, bool bSmooth = false, bool bFlipY = false);
	int32_t	Draw(HDC hdc, const RECT& rect, RECT* pClipRect=NULL, bool bSmooth = false, bool bFlipY = false);
	int32_t	Stretch(HDC hdc, int32_t xoffset, int32_t yoffset, int32_t xsize, int32_t ysize, uint32_t dwRop = SRCCOPY);
	int32_t	Stretch(HDC hdc, const RECT& rect, uint32_t dwRop = SRCCOPY);
	int32_t	Tile(HDC hdc, RECT *rc);
	int32_t	Draw2(HDC hdc, int32_t x=0, int32_t y=0, int32_t cx = -1, int32_t cy = -1);
	int32_t	Draw2(HDC hdc, const RECT& rect);
	//int32_t	DrawString(HDC hdc, int32_t x, int32_t y, const char* text, RGBQUAD color, const char* font, int32_t lSize=0, int32_t lWeight=400, uint8_t bItalic=0, uint8_t bUnderline=0, bool bSetAlpha=false);
	int32_t	DrawString(HDC hdc, int32_t x, int32_t y, const TCHAR* text, RGBQUAD color, const TCHAR* font, int32_t lSize=0, int32_t lWeight=400, uint8_t bItalic=0, uint8_t bUnderline=0, bool bSetAlpha=false);
	// <VATI> extensions
	int32_t    DrawStringEx(HDC hdc, int32_t x, int32_t y, CXTEXTINFO *pTextType, bool bSetAlpha=false );
	void    InitTextInfo( CXTEXTINFO *txt );
protected:
	bool IsHBITMAPAlphaValid( HBITMAP hbmp );
public:
#endif //CXIMAGE_SUPPORT_WINDOWS
//@}

	// file operations
#if CXIMAGE_SUPPORT_DECODE
/** \addtogroup Decode */ //@{
#ifdef WIN32
	//bool Load(LPCWSTR filename, uint32_t imagetype=0);
	bool LoadResource(HRSRC hRes, uint32_t imagetype, HMODULE hModule=NULL);
#endif
	// For UNICODE support: char -> TCHAR
	bool Load(const TCHAR* filename, uint32_t imagetype=0);
	//bool Load(const char * filename, uint32_t imagetype=0);
	bool Decode(FILE * hFile, uint32_t imagetype);
	bool Decode(CxFile * hFile, uint32_t imagetype);
	bool Decode(uint8_t * buffer, uint32_t size, uint32_t imagetype);

	bool CheckFormat(CxFile * hFile, uint32_t imagetype = 0);
	bool CheckFormat(uint8_t * buffer, uint32_t size, uint32_t imagetype = 0);
//@}
#endif //CXIMAGE_SUPPORT_DECODE

#if CXIMAGE_SUPPORT_ENCODE
protected:
/** \addtogroup Protected */ //@{
	bool EncodeSafeCheck(CxFile *hFile);
//@}

public:
/** \addtogroup Encode */ //@{
#ifdef WIN32
	//bool Save(LPCWSTR filename, uint32_t imagetype=0);
#endif
	// For UNICODE support: char -> TCHAR
	bool Save(const TCHAR* filename, uint32_t imagetype);
	//bool Save(const char * filename, uint32_t imagetype=0);
	bool Encode(FILE * hFile, uint32_t imagetype);
	bool Encode(CxFile * hFile, uint32_t imagetype);
	bool Encode(CxFile * hFile, CxImage ** pImages, int32_t pagecount, uint32_t imagetype);
	bool Encode(FILE *hFile, CxImage ** pImages, int32_t pagecount, uint32_t imagetype);
	bool Encode(uint8_t * &buffer, int32_t &size, uint32_t imagetype);

	bool Encode2RGBA(CxFile *hFile, bool bFlipY = false);
	bool Encode2RGBA(uint8_t * &buffer, int32_t &size, bool bFlipY = false);
//@}
#endif //CXIMAGE_SUPPORT_ENCODE

/** \addtogroup Attributes */ //@{
	//misc.
	bool IsValid() const;
	bool IsEnabled() const;
	void Enable(bool enable=true);

	// frame operations
	int32_t GetNumFrames() const;
	int32_t GetFrame() const;
	void SetFrame(int32_t nFrame);
//@}

#if CXIMAGE_SUPPORT_BASICTRANSFORMATIONS
/** \addtogroup BasicTransformations */ //@{
	bool GrayScale();
	bool Flip(bool bFlipSelection = false, bool bFlipAlpha = true);
	bool Mirror(bool bMirrorSelection = false, bool bMirrorAlpha = true);
	bool Negative();
	bool RotateLeft(CxImage* iDst = NULL);
	bool RotateRight(CxImage* iDst = NULL);
	bool IncreaseBpp(uint32_t nbit);
//@}
#endif //CXIMAGE_SUPPORT_BASICTRANSFORMATIONS

#if CXIMAGE_SUPPORT_TRANSFORMATION
/** \addtogroup Transformations */ //@{
	// image operations
	bool Rotate(float angle, CxImage* iDst = NULL);
	bool Rotate2(float angle, CxImage *iDst = NULL, InterpolationMethod inMethod=IM_BILINEAR,
                OverflowMethod ofMethod=OM_BACKGROUND, RGBQUAD *replColor=0,
                bool const optimizeRightAngles=true, bool const bKeepOriginalSize=false);
	bool Rotate180(CxImage* iDst = NULL);
	bool Resample(int32_t newx, int32_t newy, int32_t mode = 1, CxImage* iDst = NULL);
	bool Resample2(int32_t newx, int32_t newy, InterpolationMethod const inMethod=IM_BICUBIC2,
				OverflowMethod const ofMethod=OM_REPEAT, CxImage* const iDst = NULL,
				bool const disableAveraging=false);
	bool DecreaseBpp(uint32_t nbit, bool errordiffusion, RGBQUAD* ppal = 0, uint32_t clrimportant = 0);
	bool Dither(int32_t method = 0);
	bool Crop(int32_t left, int32_t top, int32_t right, int32_t bottom, CxImage* iDst = NULL);
	bool Crop(const RECT& rect, CxImage* iDst = NULL);
	bool CropRotatedRectangle( int32_t topx, int32_t topy, int32_t width, int32_t height, float angle, CxImage* iDst = NULL);
	bool Skew(float xgain, float ygain, int32_t xpivot=0, int32_t ypivot=0, bool bEnableInterpolation = false);
	bool Expand(int32_t left, int32_t top, int32_t right, int32_t bottom, RGBQUAD canvascolor, CxImage* iDst = 0);
	bool Expand(int32_t newx, int32_t newy, RGBQUAD canvascolor, CxImage* iDst = 0);
	bool Thumbnail(int32_t newx, int32_t newy, RGBQUAD canvascolor, CxImage* iDst = 0);
	bool CircleTransform(int32_t type,int32_t rmax=0,float Koeff=1.0f);
	bool QIShrink(int32_t newx, int32_t newy, CxImage* const iDst = NULL, bool bChangeBpp = false);

//@}
#endif //CXIMAGE_SUPPORT_TRANSFORMATION

#if CXIMAGE_SUPPORT_DSP
/** \addtogroup DSP */ //@{
	bool Contour();
	bool HistogramStretch(int32_t method = 0, double threshold = 0);
	bool HistogramEqualize();
	bool HistogramNormalize();
	bool HistogramRoot();
	bool HistogramLog();
	int32_t Histogram(int32_t* red, int32_t* green = 0, int32_t* blue = 0, int32_t* gray = 0, int32_t colorspace = 0);
	bool Jitter(int32_t radius=2);
	bool Repair(float radius = 0.25f, int32_t niterations = 1, int32_t colorspace = 0);
	bool Combine(CxImage* r,CxImage* g,CxImage* b,CxImage* a, int32_t colorspace = 0);
	bool FFT2(CxImage* srcReal, CxImage* srcImag, CxImage* dstReal, CxImage* dstImag, int32_t direction = 1, bool bForceFFT = true, bool bMagnitude = true);
	bool Noise(int32_t level);
	bool Median(int32_t Ksize=3);
	bool Gamma(float gamma);
	bool GammaRGB(float gammaR, float gammaG, float gammaB);
	bool ShiftRGB(int32_t r, int32_t g, int32_t b);
	bool Threshold(uint8_t level);
	bool Threshold(CxImage* pThresholdMask);
	bool Threshold2(uint8_t level, bool bDirection, RGBQUAD nBkgndColor, bool bSetAlpha = false);
	bool Colorize(uint8_t hue, uint8_t sat, float blend = 1.0f);
	bool Light(int32_t brightness, int32_t contrast = 0);
	float Mean();
	bool Filter(int32_t* kernel, int32_t Ksize, int32_t Kfactor, int32_t Koffset);
	bool Erode(int32_t Ksize=2);
	bool Dilate(int32_t Ksize=2);
	bool Edge(int32_t Ksize=2);
	void HuePalette(float correction=1);
	enum ImageOpType { OpAdd, OpAnd, OpXor, OpOr, OpMask, OpSrcCopy, OpDstCopy, OpSub, OpSrcBlend, OpScreen, OpAvg, OpBlendAlpha };
	void Mix(CxImage & imgsrc2, ImageOpType op, int32_t lXOffset = 0, int32_t lYOffset = 0, bool bMixAlpha = false);
	void MixFrom(CxImage & imagesrc2, int32_t lXOffset, int32_t lYOffset);
	bool UnsharpMask(float radius = 5.0f, float amount = 0.5f, int32_t threshold = 0);
	bool Lut(uint8_t* pLut);
	bool Lut(uint8_t* pLutR, uint8_t* pLutG, uint8_t* pLutB, uint8_t* pLutA = 0);
	bool GaussianBlur(float radius = 1.0f, CxImage* iDst = 0);
	bool TextBlur(uint8_t threshold = 100, uint8_t decay = 2, uint8_t max_depth = 5, bool bBlurHorizontal = true, bool bBlurVertical = true, CxImage* iDst = 0);
	bool SelectiveBlur(float radius = 1.0f, uint8_t threshold = 25, CxImage* iDst = 0);
	bool Solarize(uint8_t level = 128, bool bLinkedChannels = true);
	bool FloodFill(const int32_t xStart, const int32_t yStart, const RGBQUAD cFillColor, const uint8_t tolerance = 0,
					uint8_t nOpacity = 255, const bool bSelectFilledArea = false, const uint8_t nSelectionLevel = 255);
	bool Saturate(const int32_t saturation, const int32_t colorspace = 1);
	bool ConvertColorSpace(const int32_t dstColorSpace, const int32_t srcColorSpace);
	int32_t  OptimalThreshold(int32_t method = 0, RECT * pBox = 0, CxImage* pContrastMask = 0);
	bool AdaptiveThreshold(int32_t method = 0, int32_t nBoxSize = 64, CxImage* pContrastMask = 0, int32_t nBias = 0, float fGlobalLocalBalance = 0.5f);
	bool RedEyeRemove(float strength = 0.8f);
	bool Trace(RGBQUAD color_target, RGBQUAD color_trace);

//@}

protected:
/** \addtogroup Protected */ //@{
	bool IsPowerof2(int32_t x);
	bool FFT(int32_t dir,int32_t m,double *x,double *y);
	bool DFT(int32_t dir,int32_t m,double *x1,double *y1,double *x2,double *y2);
	bool RepairChannel(CxImage *ch, float radius);
	// <nipper>
	int32_t gen_convolve_matrix (float radius, float **cmatrix_p);
	float* gen_lookup_table (float *cmatrix, int32_t cmatrix_length);
	void blur_line (float *ctable, float *cmatrix, int32_t cmatrix_length, uint8_t* cur_col, uint8_t* dest_col, int32_t y, int32_t bytes);
	void blur_text (uint8_t threshold, uint8_t decay, uint8_t max_depth, CxImage* iSrc, CxImage* iDst, uint8_t bytes);
//@}

public:
/** \addtogroup ColorSpace */ //@{
	bool SplitRGB(CxImage* r,CxImage* g,CxImage* b);
	bool SplitYUV(CxImage* y,CxImage* u,CxImage* v);
	bool SplitHSL(CxImage* h,CxImage* s,CxImage* l);
	bool SplitYIQ(CxImage* y,CxImage* i,CxImage* q);
	bool SplitXYZ(CxImage* x,CxImage* y,CxImage* z);
	bool SplitCMYK(CxImage* c,CxImage* m,CxImage* y,CxImage* k);
	static RGBQUAD HSLtoRGB(COLORREF cHSLColor);
	static RGBQUAD RGBtoHSL(RGBQUAD lRGBColor);
	static RGBQUAD HSLtoRGB(RGBQUAD lHSLColor);
	static RGBQUAD YUVtoRGB(RGBQUAD lYUVColor);
	static RGBQUAD RGBtoYUV(RGBQUAD lRGBColor);
	static RGBQUAD YIQtoRGB(RGBQUAD lYIQColor);
	static RGBQUAD RGBtoYIQ(RGBQUAD lRGBColor);
	static RGBQUAD XYZtoRGB(RGBQUAD lXYZColor);
	static RGBQUAD RGBtoXYZ(RGBQUAD lRGBColor);
#endif //CXIMAGE_SUPPORT_DSP
	static RGBQUAD RGBtoRGBQUAD(COLORREF cr);
	static COLORREF RGBQUADtoRGB (RGBQUAD c);
//@}

/** \addtogroup Selection */ //@{
	bool SelectionIsValid();
#if CXIMAGE_SUPPORT_SELECTION
	bool SelectionClear(uint8_t level = 0);
	bool SelectionCreate();
	bool SelectionDelete();
	bool SelectionInvert();
	bool SelectionMirror();
	bool SelectionFlip();
	bool SelectionAddRect(RECT r, uint8_t level = 255);
	bool SelectionAddEllipse(RECT r, uint8_t level = 255);
	bool SelectionAddPolygon(POINT *points, int32_t npoints, uint8_t level = 255);
	bool SelectionAddColor(RGBQUAD c, uint8_t level = 255);
	bool SelectionAddPixel(int32_t x, int32_t y, uint8_t level = 255);
	bool SelectionCopy(CxImage &from);
	bool SelectionIsInside(int32_t x, int32_t y);
	void SelectionGetBox(RECT& r);
	bool SelectionToHRGN(HRGN& region);
	bool SelectionSplit(CxImage *dest);
	uint8_t SelectionGet(const int32_t x,const int32_t y);
	bool SelectionSet(CxImage &from);
	void SelectionRebuildBox();
	uint8_t* SelectionGetPointer(const int32_t x = 0,const int32_t y = 0);
//@}

protected:
/** \addtogroup Protected */ //@{
	bool BlindSelectionIsInside(int32_t x, int32_t y);
	uint8_t BlindSelectionGet(const int32_t x,const int32_t y);
	void SelectionSet(const int32_t x,const int32_t y,const uint8_t level);

public:

#endif //CXIMAGE_SUPPORT_SELECTION
//@}

#if CXIMAGE_SUPPORT_ALPHA
/** \addtogroup Alpha */ //@{
	void AlphaClear();
	bool AlphaCreate();
	void AlphaDelete();
	void AlphaInvert();
	bool AlphaMirror();
	bool AlphaFlip();
	bool AlphaCopy(CxImage &from);
	bool AlphaSplit(CxImage *dest);
	void AlphaStrip();
	void AlphaSet(uint8_t level);
	bool AlphaSet(CxImage &from);
	void AlphaSet(const int32_t x,const int32_t y,const uint8_t level);
	uint8_t AlphaGet(const int32_t x,const int32_t y);
	uint8_t AlphaGetMax() const;
	void AlphaSetMax(uint8_t nAlphaMax);
	bool AlphaIsValid();
	uint8_t* AlphaGetPointer(const int32_t x = 0,const int32_t y = 0);
	bool AlphaFromTransparency();

	void AlphaPaletteClear();
	void AlphaPaletteEnable(bool enable=true);
	bool AlphaPaletteIsEnabled();
	bool AlphaPaletteIsValid();
	bool AlphaPaletteSplit(CxImage *dest);
//@}

protected:
/** \addtogroup Protected */ //@{
	uint8_t BlindAlphaGet(const int32_t x,const int32_t y);
//@}
#endif //CXIMAGE_SUPPORT_ALPHA

public:
#if CXIMAGE_SUPPORT_LAYERS
/** \addtogroup Layers */ //@{
	bool LayerCreate(int32_t position = -1);
	bool LayerDelete(int32_t position = -1);
	void LayerDeleteAll();
	CxImage* GetLayer(int32_t position);
	CxImage* GetParent() const;
	int32_t GetNumLayers() const;
	int32_t LayerDrawAll(HDC hdc, int32_t x=0, int32_t y=0, int32_t cx = -1, int32_t cy = -1, RECT* pClipRect = 0, bool bSmooth = false);
	int32_t LayerDrawAll(HDC hdc, const RECT& rect, RECT* pClipRect=NULL, bool bSmooth = false);
//@}
#endif //CXIMAGE_SUPPORT_LAYERS

protected:
/** \addtogroup Protected */ //@{
	void Startup(uint32_t imagetype = 0);
	void CopyInfo(const CxImage &src);
	void Ghost(const CxImage *src);
	void RGBtoBGR(uint8_t *buffer, int32_t length);
	static float HueToRGB(float n1,float n2, float hue);
	void Bitfield2RGB(uint8_t *src, uint32_t redmask, uint32_t greenmask, uint32_t bluemask, uint8_t bpp);
	static int32_t CompareColors(const void *elem1, const void *elem2);
	int16_t m_ntohs(const int16_t word);
	int32_t m_ntohl(const int32_t dword);
	void bihtoh(BITMAPINFOHEADER* bih);

	void*				pDib; //contains the header, the palette, the pixels
    BITMAPINFOHEADER    head; //standard header
	CXIMAGEINFO			info; //extended information
	uint8_t*			pSelection;	//selected region
	uint8_t*			pAlpha; //alpha channel
	CxImage**			ppLayers; //generic layers
	CxImage**			ppFrames;
//@}
};

////////////////////////////////////////////////////////////////////////////
#endif // !defined(__CXIMAGE_H)
