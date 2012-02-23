// ximainfo.cpp : main attributes
/* 03/10/2004 v1.00 - Davide Pizzolato - www.xdp.it
 * CxImage version 7.0.1 07/Jan/2011
 */

#include "ximage.h"

#if defined(_LINUX) || defined(__APPLE__)
 #define _tcsnicmp(a,b,c) strcasecmp(a,b)
#endif

////////////////////////////////////////////////////////////////////////////////
/**
 * \return the color used for transparency, and/or for background color
 */
RGBQUAD	CxImage::GetTransColor()
{
	if (head.biBitCount<24 && info.nBkgndIndex>=0) return GetPaletteColor((uint8_t)info.nBkgndIndex);
	return info.nBkgndColor;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Gets the index used for transparency. Returns -1 for no transparancy.
 */
int32_t CxImage::GetTransIndex() const
{
	return info.nBkgndIndex;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Sets the index used for transparency with 1, 4 and 8 bpp images. Set to -1 to remove the effect.
 */
void CxImage::SetTransIndex(int32_t idx)
{
	if (idx<(int32_t)head.biClrUsed)
		info.nBkgndIndex = idx;
	else 
		info.nBkgndIndex = 0;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Sets the color used for transparency with 24 bpp images.
 * You must call SetTransIndex(0) to enable the effect, SetTransIndex(-1) to disable it.
 */
void CxImage::SetTransColor(RGBQUAD rgb)
{
	rgb.rgbReserved=0;
	info.nBkgndColor = rgb;
}
////////////////////////////////////////////////////////////////////////////////
bool CxImage::IsTransparent() const
{
	return info.nBkgndIndex>=0; // <vho>
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Returns true if the image has 256 colors or less.
 */
bool CxImage::IsIndexed() const
{
	return head.biClrUsed!=0;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * \return 1 = indexed, 2 = RGB, 4 = RGBA
 */
uint8_t CxImage::GetColorType()
{
	uint8_t b = (uint8_t)((head.biBitCount>8) ? 2 /*COLORTYPE_COLOR*/ : 1 /*COLORTYPE_PALETTE*/);
#if CXIMAGE_SUPPORT_ALPHA
	if (AlphaIsValid()) b = 4 /*COLORTYPE_ALPHA*/;
#endif //CXIMAGE_SUPPORT_ALPHA
	return b;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * \return Resolution for TIFF, JPEG, PNG and BMP formats.
 */
int32_t CxImage::GetXDPI() const
{
	return info.xDPI;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * \return Resolution for TIFF, JPEG, PNG and BMP formats.
 */
int32_t CxImage::GetYDPI() const
{
	return info.yDPI;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Set resolution for TIFF, JPEG, PNG and BMP formats.
 */
void CxImage::SetXDPI(int32_t dpi)
{
	if (dpi<=0) dpi = CXIMAGE_DEFAULT_DPI;
	info.xDPI = dpi;
	head.biXPelsPerMeter = (int32_t) floor(dpi * 10000.0 / 254.0 + 0.5);
	if (pDib) ((BITMAPINFOHEADER*)pDib)->biXPelsPerMeter = head.biXPelsPerMeter;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Set resolution for TIFF, JPEG, PNG and BMP formats.
 */
void CxImage::SetYDPI(int32_t dpi)
{
	if (dpi<=0) dpi = CXIMAGE_DEFAULT_DPI;
	info.yDPI = dpi;
	head.biYPelsPerMeter = (int32_t) floor(dpi * 10000.0 / 254.0 + 0.5);
	if (pDib) ((BITMAPINFOHEADER*)pDib)->biYPelsPerMeter = head.biYPelsPerMeter;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * \sa SetFlags
 */
uint32_t CxImage::GetFlags() const
{
	return info.dwFlags;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Image flags, for future use
 * \param flags
 *  - 0x??00000 = reserved for 16 bit, CMYK, multilayer
 *  - 0x00??0000 = blend modes
 *  - 0x0000???? = layer id or user flags
 *
 * \param bLockReservedFlags protects the "reserved" and "blend modes" flags 
 */
void CxImage::SetFlags(uint32_t flags, bool bLockReservedFlags)
{
	if (bLockReservedFlags) info.dwFlags = flags & 0x0000ffff;
	else info.dwFlags = flags;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * \sa SetCodecOption
 */
uint32_t CxImage::GetCodecOption(uint32_t imagetype)
{
	imagetype = GetTypeIndexFromId(imagetype);
	if (imagetype==0){
		imagetype = GetTypeIndexFromId(GetType());
	}
	return info.dwCodecOpt[imagetype];
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Encode option for GIF, TIF, JPG, PNG and RAW
 * - GIF : 0 = LZW (default), 1 = none, 2 = RLE.
 * - TIF : 0 = automatic (default), or a valid compression code as defined in "tiff.h" (COMPRESSION_NONE = 1, COMPRESSION_CCITTRLE = 2, ...)
 * - JPG : valid values stored in enum CODEC_OPTION ( ENCODE_BASELINE = 0x01, ENCODE_PROGRESSIVE = 0x10, ...)
 * - PNG : combination of interlace option and compression option
 *         interlace option :  1 = interlace, 0 = no interlace
 *         compression option : 2 = no compression, 4 = best speed, 6 = best compression, 8 = default compression
 *         default is no interlace and default compression
 *         example : 5 = 1+4 = interlace + best speed
 * - RAW : valid values stored in enum CODEC_OPTION ( DECODE_QUALITY_LIN = 0x00, DECODE_QUALITY_VNG = 0x01, ...)
 *
 * \return true if everything is ok
 */
bool CxImage::SetCodecOption(uint32_t opt, uint32_t imagetype)
{
	imagetype = GetTypeIndexFromId(imagetype);
	if (imagetype==0){
		imagetype = GetTypeIndexFromId(GetType());
	}
	info.dwCodecOpt[imagetype] = opt;
	return true;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * \return internal hDib object..
 */
void* CxImage::GetDIB() const
{
	return pDib;
}
////////////////////////////////////////////////////////////////////////////////
uint32_t CxImage::GetHeight() const
{
	return head.biHeight;
}
////////////////////////////////////////////////////////////////////////////////
uint32_t CxImage::GetWidth() const
{
	return head.biWidth;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * \return uint32_t aligned width of the image.
 */
uint32_t CxImage::GetEffWidth() const
{
	return info.dwEffWidth;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * \return 2, 16, 256; 0 for RGB images.
 */
uint32_t CxImage::GetNumColors() const
{
	return head.biClrUsed;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * \return: 1, 4, 8, 24.
 */
uint16_t CxImage::GetBpp() const
{
	return head.biBitCount;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * \return original image format
 * \sa ENUM_CXIMAGE_FORMATS.
 */
uint32_t CxImage::GetType() const
{
	return info.dwType;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * change image format identifier
 * \sa ENUM_CXIMAGE_FORMATS.
 */
bool CxImage::SetType(uint32_t type)
{
	switch (type){
#if CXIMAGE_SUPPORT_BMP
	case CXIMAGE_FORMAT_BMP:
#endif
#if CXIMAGE_SUPPORT_GIF
	case CXIMAGE_FORMAT_GIF:
#endif
#if CXIMAGE_SUPPORT_JPG
	case CXIMAGE_FORMAT_JPG:
#endif
#if CXIMAGE_SUPPORT_PNG
	case CXIMAGE_FORMAT_PNG:
#endif
#if CXIMAGE_SUPPORT_MNG
	case CXIMAGE_FORMAT_MNG:
#endif
#if CXIMAGE_SUPPORT_ICO
	case CXIMAGE_FORMAT_ICO:
#endif
#if CXIMAGE_SUPPORT_TIF
	case CXIMAGE_FORMAT_TIF:
#endif
#if CXIMAGE_SUPPORT_TGA
	case CXIMAGE_FORMAT_TGA:
#endif
#if CXIMAGE_SUPPORT_PCX
	case CXIMAGE_FORMAT_PCX:
#endif
#if CXIMAGE_SUPPORT_WBMP
	case CXIMAGE_FORMAT_WBMP:
#endif
#if CXIMAGE_SUPPORT_WMF
	case CXIMAGE_FORMAT_WMF:
#endif
#if CXIMAGE_SUPPORT_JBG
	case CXIMAGE_FORMAT_JBG:
#endif
#if CXIMAGE_SUPPORT_JP2
	case CXIMAGE_FORMAT_JP2:
#endif
#if CXIMAGE_SUPPORT_JPC
	case CXIMAGE_FORMAT_JPC:
#endif
#if CXIMAGE_SUPPORT_PGX
	case CXIMAGE_FORMAT_PGX:
#endif
#if CXIMAGE_SUPPORT_PNM
	case CXIMAGE_FORMAT_PNM:
#endif
#if CXIMAGE_SUPPORT_RAS
	case CXIMAGE_FORMAT_RAS:
#endif
#if CXIMAGE_SUPPORT_SKA
	case CXIMAGE_FORMAT_SKA:
#endif
#if CXIMAGE_SUPPORT_RAW
	case CXIMAGE_FORMAT_RAW:
#endif
#if CXIMAGE_SUPPORT_PSD
	case CXIMAGE_FORMAT_PSD:
#endif
		info.dwType = type;
		return true;
	case CXIMAGE_FORMAT_UNKNOWN:
	default:
		info.dwType = CXIMAGE_FORMAT_UNKNOWN;
	}
	return false;
}
////////////////////////////////////////////////////////////////////////////////
uint32_t CxImage::GetNumTypes()
{
	return CMAX_IMAGE_FORMATS-1;
}
////////////////////////////////////////////////////////////////////////////////
uint32_t CxImage::GetTypeIdFromName(const TCHAR* ext)
{
#if CXIMAGE_SUPPORT_BMP
	if (_tcsnicmp(ext,_T("bmp"),3)==0 )		return CXIMAGE_FORMAT_BMP;
#endif
#if CXIMAGE_SUPPORT_JPG
	if (_tcsnicmp(ext,_T("jpg"),3)==0 ||
		_tcsnicmp(ext,_T("jpe"),3)==0 ||
		_tcsnicmp(ext,_T("jfi"),3)==0 )		return CXIMAGE_FORMAT_JPG;
#endif
#if CXIMAGE_SUPPORT_GIF
	if (_tcsnicmp(ext,_T("gif"),3)==0 )		return CXIMAGE_FORMAT_GIF;
#endif
#if CXIMAGE_SUPPORT_PNG
	if (_tcsnicmp(ext,_T("png"),3)==0 )		return CXIMAGE_FORMAT_PNG;
#endif
#if CXIMAGE_SUPPORT_ICO
	if (_tcsnicmp(ext,_T("ico"),3)==0 ||
		_tcsnicmp(ext,_T("cur"),3)==0 )		return CXIMAGE_FORMAT_ICO;
#endif
#if CXIMAGE_SUPPORT_TIF
	if (_tcsnicmp(ext,_T("tif"),3)==0 )		return CXIMAGE_FORMAT_TIF;
#endif
#if CXIMAGE_SUPPORT_TGA
	if (_tcsnicmp(ext,_T("tga"),3)==0 )		return CXIMAGE_FORMAT_TGA;
#endif
#if CXIMAGE_SUPPORT_PCX
	if (_tcsnicmp(ext,_T("pcx"),3)==0 )		return CXIMAGE_FORMAT_PCX;
#endif
#if CXIMAGE_SUPPORT_WBMP
	if (_tcsnicmp(ext,_T("wbm"),3)==0 )		return CXIMAGE_FORMAT_WBMP;
#endif
#if CXIMAGE_SUPPORT_WMF
	if (_tcsnicmp(ext,_T("wmf"),3)==0 ||
		_tcsnicmp(ext,_T("emf"),3)==0 )		return CXIMAGE_FORMAT_WMF;
#endif
#if CXIMAGE_SUPPORT_JP2
	if (_tcsnicmp(ext,_T("jp2"),3)==0 ||
		_tcsnicmp(ext,_T("j2k"),3)==0 )		return CXIMAGE_FORMAT_JP2;
#endif
#if CXIMAGE_SUPPORT_JPC
	if (_tcsnicmp(ext,_T("jpc"),3)==0 ||
		_tcsnicmp(ext,_T("j2c"),3)==0 )		return CXIMAGE_FORMAT_JPC;
#endif
#if CXIMAGE_SUPPORT_PGX
	if (_tcsnicmp(ext,_T("pgx"),3)==0 )		return CXIMAGE_FORMAT_PGX;
#endif
#if CXIMAGE_SUPPORT_RAS
	if (_tcsnicmp(ext,_T("ras"),3)==0 )		return CXIMAGE_FORMAT_RAS;
#endif
#if CXIMAGE_SUPPORT_PNM
	if (_tcsnicmp(ext,_T("pnm"),3)==0 ||
		_tcsnicmp(ext,_T("pgm"),3)==0 ||
		_tcsnicmp(ext,_T("ppm"),3)==0 )		return CXIMAGE_FORMAT_PNM;
#endif
#if CXIMAGE_SUPPORT_JBG
	if (_tcsnicmp(ext,_T("jbg"),3)==0 )		return CXIMAGE_FORMAT_JBG;
#endif
#if CXIMAGE_SUPPORT_MNG
	if (_tcsnicmp(ext,_T("mng"),3)==0 ||
		_tcsnicmp(ext,_T("jng"),3)==0 )		return CXIMAGE_FORMAT_MNG;
#endif
#if CXIMAGE_SUPPORT_SKA
	if (_tcsnicmp(ext,_T("ska"),3)==0 )		return CXIMAGE_FORMAT_SKA;
#endif
#if CXIMAGE_SUPPORT_PSD
	if (_tcsnicmp(ext,_T("psd"),3)==0 )		return CXIMAGE_FORMAT_PSD;
#endif
#if CXIMAGE_SUPPORT_RAW
	if (_tcsnicmp(ext,_T("nef"),3)==0 ||
		_tcsnicmp(ext,_T("crw"),3)==0 ||
		_tcsnicmp(ext,_T("cr2"),3)==0 ||
		_tcsnicmp(ext,_T("dng"),3)==0 ||
		_tcsnicmp(ext,_T("arw"),3)==0 ||
		_tcsnicmp(ext,_T("erf"),3)==0 ||
		_tcsnicmp(ext,_T("3fr"),3)==0 ||
		_tcsnicmp(ext,_T("dcr"),3)==0 ||
		_tcsnicmp(ext,_T("raw"),3)==0 ||
		_tcsnicmp(ext,_T("x3f"),3)==0 ||
		_tcsnicmp(ext,_T("mef"),3)==0 ||
		_tcsnicmp(ext,_T("raf"),3)==0 ||
		_tcsnicmp(ext,_T("mrw"),3)==0 ||
		_tcsnicmp(ext,_T("pef"),3)==0 ||
		_tcsnicmp(ext,_T("sr2"),3)==0 ||
		_tcsnicmp(ext,_T("orf"),3)==0 )		return CXIMAGE_FORMAT_RAW;
#endif

	return CXIMAGE_FORMAT_UNKNOWN;
}
////////////////////////////////////////////////////////////////////////////////
uint32_t CxImage::GetTypeIdFromIndex(const uint32_t index)
{
	uint32_t n;

	n=0; if (index == n) return CXIMAGE_FORMAT_UNKNOWN;
#if CXIMAGE_SUPPORT_BMP
	n++; if (index == n) return CXIMAGE_FORMAT_BMP;
#endif
#if CXIMAGE_SUPPORT_GIF
	n++; if (index == n) return CXIMAGE_FORMAT_GIF;
#endif
#if CXIMAGE_SUPPORT_JPG
	n++; if (index == n) return CXIMAGE_FORMAT_JPG;
#endif
#if CXIMAGE_SUPPORT_PNG
	n++; if (index == n) return CXIMAGE_FORMAT_PNG;
#endif
#if CXIMAGE_SUPPORT_ICO
	n++; if (index == n) return CXIMAGE_FORMAT_ICO;
#endif
#if CXIMAGE_SUPPORT_TIF
	n++; if (index == n) return CXIMAGE_FORMAT_TIF;
#endif
#if CXIMAGE_SUPPORT_TGA
	n++; if (index == n) return CXIMAGE_FORMAT_TGA;
#endif
#if CXIMAGE_SUPPORT_PCX
	n++; if (index == n) return CXIMAGE_FORMAT_PCX;
#endif
#if CXIMAGE_SUPPORT_WBMP
	n++; if (index == n) return CXIMAGE_FORMAT_WBMP;
#endif
#if CXIMAGE_SUPPORT_WMF
	n++; if (index == n) return CXIMAGE_FORMAT_WMF;
#endif
#if CXIMAGE_SUPPORT_JP2
	n++; if (index == n) return CXIMAGE_FORMAT_JP2;
#endif
#if CXIMAGE_SUPPORT_JPC
	n++; if (index == n) return CXIMAGE_FORMAT_JPC;
#endif
#if CXIMAGE_SUPPORT_PGX
	n++; if (index == n) return CXIMAGE_FORMAT_PGX;
#endif
#if CXIMAGE_SUPPORT_PNM
	n++; if (index == n) return CXIMAGE_FORMAT_PNM;
#endif
#if CXIMAGE_SUPPORT_RAS
	n++; if (index == n) return CXIMAGE_FORMAT_RAS;
#endif
#if CXIMAGE_SUPPORT_JBG
	n++; if (index == n) return CXIMAGE_FORMAT_JBG;
#endif
#if CXIMAGE_SUPPORT_MNG
	n++; if (index == n) return CXIMAGE_FORMAT_MNG;
#endif
#if CXIMAGE_SUPPORT_SKA
	n++; if (index == n) return CXIMAGE_FORMAT_SKA;
#endif
#if CXIMAGE_SUPPORT_RAW
	n++; if (index == n) return CXIMAGE_FORMAT_RAW;
#endif
#if CXIMAGE_SUPPORT_PSD
	n++; if (index == n) return CXIMAGE_FORMAT_PSD;
#endif

	return CXIMAGE_FORMAT_UNKNOWN;
}
////////////////////////////////////////////////////////////////////////////////
uint32_t CxImage::GetTypeIndexFromId(const uint32_t id)
{
	uint32_t n;

	n=0; if (id == CXIMAGE_FORMAT_UNKNOWN) return n;
#if CXIMAGE_SUPPORT_BMP
	n++; if (id == CXIMAGE_FORMAT_BMP) return n;
#endif
#if CXIMAGE_SUPPORT_GIF
	n++; if (id == CXIMAGE_FORMAT_GIF) return n;
#endif
#if CXIMAGE_SUPPORT_JPG
	n++; if (id == CXIMAGE_FORMAT_JPG) return n;
#endif
#if CXIMAGE_SUPPORT_PNG
	n++; if (id == CXIMAGE_FORMAT_PNG) return n;
#endif
#if CXIMAGE_SUPPORT_ICO
	n++; if (id == CXIMAGE_FORMAT_ICO) return n;
#endif
#if CXIMAGE_SUPPORT_TIF
	n++; if (id == CXIMAGE_FORMAT_TIF) return n;
#endif
#if CXIMAGE_SUPPORT_TGA
	n++; if (id == CXIMAGE_FORMAT_TGA) return n;
#endif
#if CXIMAGE_SUPPORT_PCX
	n++; if (id == CXIMAGE_FORMAT_PCX) return n;
#endif
#if CXIMAGE_SUPPORT_WBMP
	n++; if (id == CXIMAGE_FORMAT_WBMP) return n;
#endif
#if CXIMAGE_SUPPORT_WMF
	n++; if (id == CXIMAGE_FORMAT_WMF) return n;
#endif
#if CXIMAGE_SUPPORT_JP2
	n++; if (id == CXIMAGE_FORMAT_JP2) return n;
#endif
#if CXIMAGE_SUPPORT_JPC
	n++; if (id == CXIMAGE_FORMAT_JPC) return n;
#endif
#if CXIMAGE_SUPPORT_PGX
	n++; if (id == CXIMAGE_FORMAT_PGX) return n;
#endif
#if CXIMAGE_SUPPORT_PNM
	n++; if (id == CXIMAGE_FORMAT_PNM) return n;
#endif
#if CXIMAGE_SUPPORT_RAS
	n++; if (id == CXIMAGE_FORMAT_RAS) return n;
#endif
#if CXIMAGE_SUPPORT_JBG
	n++; if (id == CXIMAGE_FORMAT_JBG) return n;
#endif
#if CXIMAGE_SUPPORT_MNG
	n++; if (id == CXIMAGE_FORMAT_MNG) return n;
#endif
#if CXIMAGE_SUPPORT_SKA
	n++; if (id == CXIMAGE_FORMAT_SKA) return n;
#endif
#if CXIMAGE_SUPPORT_RAW
	n++; if (id == CXIMAGE_FORMAT_RAW) return n;
#endif
#if CXIMAGE_SUPPORT_PSD
	n++; if (id == CXIMAGE_FORMAT_PSD) return n;
#endif

	return 0;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * \return current frame delay in milliseconds. Only for GIF and MNG formats.
 */
uint32_t CxImage::GetFrameDelay() const
{
	return info.dwFrameDelay;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Sets current frame delay. Only for GIF format.
 * \param d = delay in milliseconds
 */
void CxImage::SetFrameDelay(uint32_t d)
{
	info.dwFrameDelay=d;
}
////////////////////////////////////////////////////////////////////////////////
void CxImage::GetOffset(int32_t *x,int32_t *y)
{
	*x=info.xOffset;
	*y=info.yOffset;
}
////////////////////////////////////////////////////////////////////////////////
void CxImage::SetOffset(int32_t x,int32_t y)
{
	info.xOffset=x;
	info.yOffset=y;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * \sa SetJpegQuality, GetJpegQualityF
 * \author [DP]; changes [Stefan Schürmans]
 */
uint8_t CxImage::GetJpegQuality() const
{
	return (uint8_t)(info.fQuality + 0.5f);
}
////////////////////////////////////////////////////////////////////////////////
/**
 * \sa SetJpegQuality, GetJpegQuality
 * \author [Stefan Schürmans]
 */
float CxImage::GetJpegQualityF() const
{
	return info.fQuality;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * quality level for JPEG and JPEG2000
 * \param q: can be from 0 to 100
 * \author [DP]; changes [Stefan Schürmans]
 */
void CxImage::SetJpegQuality(uint8_t q){
	info.fQuality = (float)q;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * quality level for JPEG and JPEG2000
 * necessary for JPEG2000 when quality is between 0.0 and 1.0
 * \param q: can be from 0.0 to 100.0
 * \author [Stefan Schürmans]
 */
void CxImage::SetJpegQualityF(float q){
	if (q>0) info.fQuality = q;
	else  info.fQuality = 0.0f;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * \sa SetJpegScale
 */
uint8_t CxImage::GetJpegScale() const
{
	return info.nJpegScale;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * scaling down during JPEG decoding valid numbers are 1, 2, 4, 8
 * \author [ignacio]
 */
void CxImage::SetJpegScale(uint8_t q){
	info.nJpegScale = q;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Used to monitor the slow loops.
 * \return value is from 0 to 100.
 * \sa SetProgress
 */
int32_t CxImage::GetProgress() const
{
	return info.nProgress;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * \return the escape code.
 * \sa SetEscape
 */
int32_t CxImage::GetEscape() const
{
	return info.nEscape;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Forces the value of the internal progress variable.
 * \param p should be from 0 to 100.
 * \sa GetProgress
 */
void CxImage::SetProgress(int32_t p)
{
	info.nProgress = p;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Used to quit the slow loops or the codecs.
 * - SetEscape(-1) before Decode forces the function to exit, right after  
 *   the image width and height are available ( for bmp, jpg, gif, tif )
 */
void CxImage::SetEscape(int32_t i)
{
	info.nEscape = i;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Checks if the image is correctly initializated.
 */
bool CxImage::IsValid() const
{
	return pDib!=0;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * True if the image is enabled for painting.
 */
bool CxImage::IsEnabled() const
{
	return info.bEnabled;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Enables/disables the image.
 */
void CxImage::Enable(bool enable)
{
	info.bEnabled=enable;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * This function must be used after a Decode() / Load() call.
 * Use the sequence SetFrame(-1); Load(...); GetNumFrames();
 * to get the number of images without loading the first image.
 * \return the number of images in the file.
 */
int32_t CxImage::GetNumFrames() const
{
	return info.nNumFrames;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * \return the current selected image (zero-based index).
 */
int32_t CxImage::GetFrame() const
{
	return info.nFrame;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Sets the image number that the next Decode() / Load() call will load
 */
void CxImage::SetFrame(int32_t nFrame){
	info.nFrame=nFrame;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Sets the method for drawing the frame related to others
 * \sa GetDisposalMethod
 */
void CxImage::SetDisposalMethod(uint8_t dm)
{	info.dispmeth=dm; }
////////////////////////////////////////////////////////////////////////////////
/**
 * Gets the method for drawing the frame related to others
 * Values :    0 -   No disposal specified. The decoder is
 *                   not required to take any action.
 *             1 -   Do not dispose. The graphic is to be left
 *                   in place.
 *             2 -   Restore to background color. The area used by the
 *                   graphic must be restored to the background color.
 *             3 -   Restore to previous. The decoder is required to
 *                   restore the area overwritten by the graphic with
 *                   what was there prior to rendering the graphic.
 *             4-7 -    To be defined.
 */
uint8_t CxImage::GetDisposalMethod() const
{	return info.dispmeth; }
////////////////////////////////////////////////////////////////////////////////
bool CxImage::GetRetreiveAllFrames() const
{	return info.bGetAllFrames; }
////////////////////////////////////////////////////////////////////////////////
void CxImage::SetRetreiveAllFrames(bool flag)
{	info.bGetAllFrames = flag; }
////////////////////////////////////////////////////////////////////////////////
CxImage * CxImage::GetFrame(int32_t nFrame) const
{
	if ( ppFrames == NULL) return NULL;
	if ( info.nNumFrames == 0) return NULL;
	if ( nFrame >= info.nNumFrames ) return NULL;
	if ( nFrame < 0) nFrame = info.nNumFrames - 1;
	return ppFrames[nFrame];
}
////////////////////////////////////////////////////////////////////////////////
int16_t CxImage::m_ntohs(const int16_t word)
{
	if (info.bLittleEndianHost) return word;
	return ( (word & 0xff) << 8 ) | ( (word >> 8) & 0xff );
}
////////////////////////////////////////////////////////////////////////////////
int32_t CxImage::m_ntohl(const int32_t dword)
{
	if (info.bLittleEndianHost) return dword;
	return  ((dword & 0xff) << 24 ) | ((dword & 0xff00) << 8 ) |
			((dword >> 8) & 0xff00) | ((dword >> 24) & 0xff);
}
////////////////////////////////////////////////////////////////////////////////
void CxImage::bihtoh(BITMAPINFOHEADER* bih)
{
	bih->biSize = m_ntohl(bih->biSize);
	bih->biWidth = m_ntohl(bih->biWidth);
	bih->biHeight = m_ntohl(bih->biHeight);
	bih->biPlanes = m_ntohs(bih->biPlanes);
	bih->biBitCount = m_ntohs(bih->biBitCount);
	bih->biCompression = m_ntohl(bih->biCompression);
	bih->biSizeImage = m_ntohl(bih->biSizeImage);
	bih->biXPelsPerMeter = m_ntohl(bih->biXPelsPerMeter);
	bih->biYPelsPerMeter = m_ntohl(bih->biYPelsPerMeter);
	bih->biClrUsed = m_ntohl(bih->biClrUsed);
	bih->biClrImportant = m_ntohl(bih->biClrImportant);
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Returns the last reported error.
 */
const char* CxImage::GetLastError()
{
	return info.szLastError;
}
////////////////////////////////////////////////////////////////////////////////
uint32_t CxImage::DumpSize()
{
	uint32_t n;
	n = sizeof(BITMAPINFOHEADER) + sizeof(CXIMAGEINFO) + GetSize();

#if CXIMAGE_SUPPORT_ALPHA
	if (pAlpha){
		n += 1 + head.biWidth * head.biHeight;
	} else n++;
#endif

#if CXIMAGE_SUPPORT_SELECTION
	if (pSelection){
		n += 1 + head.biWidth * head.biHeight;
	} else n++;
#endif

#if CXIMAGE_SUPPORT_LAYERS
	if (ppLayers){
		for (int32_t m=0; m<GetNumLayers(); m++){
			if (GetLayer(m)){
				n += 1 + GetLayer(m)->DumpSize();
			}
		}
	} else n++;
#endif

	if (ppFrames){
		for (int32_t m=0; m<GetNumFrames(); m++){
			if (GetFrame(m)){
				n += 1 + GetFrame(m)->DumpSize();
			}
		}
	} else n++;

	return n;
}
////////////////////////////////////////////////////////////////////////////////
uint32_t CxImage::Dump(uint8_t * dst)
{
	if (!dst) return 0;

	memcpy(dst,&head,sizeof(BITMAPINFOHEADER));
	dst += sizeof(BITMAPINFOHEADER);

	memcpy(dst,&info,sizeof(CXIMAGEINFO));
	dst += sizeof(CXIMAGEINFO);

	memcpy(dst,pDib,GetSize());
	dst += GetSize();

#if CXIMAGE_SUPPORT_ALPHA
	if (pAlpha){
		memset(dst++, 1, 1);
		memcpy(dst,pAlpha,head.biWidth * head.biHeight);
		dst += head.biWidth * head.biHeight;
	} else {
		memset(dst++, 0, 1);
	}
#endif

#if CXIMAGE_SUPPORT_SELECTION
	if (pSelection){
		memset(dst++, 1, 1);
		memcpy(dst,pSelection,head.biWidth * head.biHeight);
		dst += head.biWidth * head.biHeight;
	} else {
		memset(dst++, 0, 1);
	}
#endif

#if CXIMAGE_SUPPORT_LAYERS
	if (ppLayers){
		memset(dst++, 1, 1);
		for (int32_t m=0; m<GetNumLayers(); m++){
			if (GetLayer(m)){
				dst += GetLayer(m)->Dump(dst);
			}
		}
	} else {
		memset(dst++, 0, 1);
	}
#endif

	if (ppFrames){
		memset(dst++, 1, 1);
		for (int32_t m=0; m<GetNumFrames(); m++){
			if (GetFrame(m)){
				dst += GetFrame(m)->Dump(dst);
			}
		}
	} else {
		memset(dst++, 0, 1);
	}

	return DumpSize();
}
////////////////////////////////////////////////////////////////////////////////
uint32_t CxImage::UnDump(const uint8_t * src)
{
	if (!src)
		return 0;
	if (!Destroy())
		return 0;
	if (!DestroyFrames())
		return 0;

	uint32_t n = 0;

	memcpy(&head,src,sizeof(BITMAPINFOHEADER));
	n += sizeof(BITMAPINFOHEADER);

	memcpy(&info,&src[n],sizeof(CXIMAGEINFO));
	n += sizeof(CXIMAGEINFO);

	if (!Create(head.biWidth, head.biHeight, head.biBitCount, info.dwType))
		return 0;

	memcpy(pDib,&src[n],GetSize());
	n += GetSize();

#if CXIMAGE_SUPPORT_ALPHA
	if (src[n++]){
		if (AlphaCreate()){
			memcpy(pAlpha, &src[n], head.biWidth * head.biHeight);
		}
		n += head.biWidth * head.biHeight;
	}
#endif

#if CXIMAGE_SUPPORT_SELECTION
	if (src[n++]){
		RECT box = info.rSelectionBox;
		if (SelectionCreate()){
			info.rSelectionBox = box;
			memcpy(pSelection, &src[n], head.biWidth * head.biHeight);
		}
		n += head.biWidth * head.biHeight;
	}
#endif

#if CXIMAGE_SUPPORT_LAYERS
	if (src[n++]){
		ppLayers = new CxImage*[info.nNumLayers];
		for (int32_t m=0; m<GetNumLayers(); m++){
			ppLayers[m] = new CxImage();
			n += ppLayers[m]->UnDump(&src[n]);
		}
	}
#endif

	if (src[n++]){
		ppFrames = new CxImage*[info.nNumFrames];
		for (int32_t m=0; m<GetNumFrames(); m++){
			ppFrames[m] = new CxImage();
			n += ppFrames[m]->UnDump(&src[n]);
		}
	}

	return n;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * \return A.BBCCCDDDD
 *  - A = main version
 *  - BB = main revision
 *  - CCC = minor revision (letter)
 *  - DDDD = experimental revision
 */
const float CxImage::GetVersionNumber()
{
	return 7.000010000f;
}
////////////////////////////////////////////////////////////////////////////////
const TCHAR* CxImage::GetVersion()
{
	static const TCHAR CxImageVersion[] = _T("CxImage 7.0.1");
	return (CxImageVersion);
}
////////////////////////////////////////////////////////////////////////////////
