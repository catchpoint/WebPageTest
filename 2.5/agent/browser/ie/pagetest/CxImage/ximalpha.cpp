// xImalpha.cpp : Alpha channel functions
/* 07/08/2001 v1.00 - Davide Pizzolato - www.xdp.it
 * CxImage version 7.0.1 07/Jan/2011
 */

#include "ximage.h"

#if CXIMAGE_SUPPORT_ALPHA

////////////////////////////////////////////////////////////////////////////////
/**
 * \sa AlphaSetMax
 */
uint8_t CxImage::AlphaGetMax() const
{
	return info.nAlphaMax;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Sets global Alpha (opacity) value applied to the whole image,
 * valid only for painting functions.
 * \param nAlphaMax: can be from 0 to 255
 */
void CxImage::AlphaSetMax(uint8_t nAlphaMax)
{
	info.nAlphaMax=nAlphaMax;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Checks if the image has a valid alpha channel.
 */
bool CxImage::AlphaIsValid()
{
	return pAlpha!=0;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Enables the alpha palette, so the Draw() function changes its behavior.
 */
void CxImage::AlphaPaletteEnable(bool enable)
{
	info.bAlphaPaletteEnabled=enable;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * True if the alpha palette is enabled for painting.
 */
bool CxImage::AlphaPaletteIsEnabled()
{
	return info.bAlphaPaletteEnabled;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Sets the alpha channel to full transparent. AlphaSet(0) has the same effect
 */
void CxImage::AlphaClear()
{
	if (pAlpha)	memset(pAlpha,0,head.biWidth * head.biHeight);
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Sets the alpha level for the whole image.
 * \param level : from 0 (transparent) to 255 (opaque)
 */
void CxImage::AlphaSet(uint8_t level)
{
	if (pAlpha)	memset(pAlpha,level,head.biWidth * head.biHeight);
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Allocates an empty (opaque) alpha channel.
 */
bool CxImage::AlphaCreate()
{
	if (pAlpha==NULL) {
		pAlpha = (uint8_t*)malloc(head.biWidth * head.biHeight);
		if (pAlpha) memset(pAlpha,255,head.biWidth * head.biHeight);
	}
	return (pAlpha!=0);
}
////////////////////////////////////////////////////////////////////////////////
void CxImage::AlphaDelete()
{
	if (pAlpha) { free(pAlpha); pAlpha=0; }
}
////////////////////////////////////////////////////////////////////////////////
void CxImage::AlphaInvert()
{
	if (pAlpha) {
		uint8_t *iSrc=pAlpha;
		int32_t n=head.biHeight*head.biWidth;
		for(int32_t i=0; i < n; i++){
			*iSrc=(uint8_t)~(*(iSrc));
			iSrc++;
		}
	}
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Imports an existing alpa channel from another image with the same width and height.
 */
bool CxImage::AlphaCopy(CxImage &from)
{
	if (from.pAlpha == NULL || head.biWidth != from.head.biWidth || head.biHeight != from.head.biHeight) return false;
	if (pAlpha==NULL) pAlpha = (uint8_t*)malloc(head.biWidth * head.biHeight);
	if (pAlpha==NULL) return false;
	memcpy(pAlpha,from.pAlpha,head.biWidth * head.biHeight);
	info.nAlphaMax=from.info.nAlphaMax;
	return true;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Creates the alpha channel from a gray scale image.
 */
bool CxImage::AlphaSet(CxImage &from)
{
	if (!from.IsGrayScale() || head.biWidth != from.head.biWidth || head.biHeight != from.head.biHeight) return false;
	if (pAlpha==NULL) pAlpha = (uint8_t*)malloc(head.biWidth * head.biHeight);
	uint8_t* src = from.info.pImage;
	uint8_t* dst = pAlpha;
	if (src==NULL || dst==NULL) return false;
	for (int32_t y=0; y<head.biHeight; y++){
		memcpy(dst,src,head.biWidth);
		dst += head.biWidth;
		src += from.info.dwEffWidth;
	}
	return true;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Sets the alpha level for a single pixel 
 */
void CxImage::AlphaSet(const int32_t x,const int32_t y,const uint8_t level)
{
	if (pAlpha && IsInside(x,y)) pAlpha[x+y*head.biWidth]=level;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Gets the alpha level for a single pixel 
 */
uint8_t CxImage::AlphaGet(const int32_t x,const int32_t y)
{
	if (pAlpha && IsInside(x,y)) return pAlpha[x+y*head.biWidth];
	return 0;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Returns pointer to alpha data for pixel (x,y).
 *
 * \author ***bd*** 2.2004
 */
uint8_t* CxImage::AlphaGetPointer(const int32_t x,const int32_t y)
{
	if (pAlpha && IsInside(x,y)) return pAlpha+x+y*head.biWidth;
	return 0;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Get alpha value without boundscheck (a bit faster). Pixel must be inside the image.
 *
 * \author ***bd*** 2.2004
 */
uint8_t CxImage::BlindAlphaGet(const int32_t x,const int32_t y)
{
#ifdef _DEBUG
	if (!IsInside(x,y) || (pAlpha==0))
  #if CXIMAGE_SUPPORT_EXCEPTION_HANDLING
		throw 0;
  #else
		return 0;
  #endif
#endif
	return pAlpha[x+y*head.biWidth];
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Resets the alpha palette 
 */
void CxImage::AlphaPaletteClear()
{
	RGBQUAD c;
	for(uint16_t ip=0; ip<head.biClrUsed;ip++){
		c=GetPaletteColor((uint8_t)ip);
		c.rgbReserved=0;
		SetPaletteColor((uint8_t)ip,c);
	}
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Checks if the image has a valid alpha palette. 
 */
bool CxImage::AlphaPaletteIsValid()
{
	RGBQUAD c;
	for(uint16_t ip=0; ip<head.biClrUsed;ip++){
		c=GetPaletteColor((uint8_t)ip);
		if (c.rgbReserved != 0) return true;
	}
	return false;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Blends the alpha channel and the alpha palette with the pixels. The result is a 24 bit image.
 * The background color can be selected using SetTransColor().
 */
void CxImage::AlphaStrip()
{
	bool bAlphaPaletteIsValid = AlphaPaletteIsValid();
	bool bAlphaIsValid = AlphaIsValid();
	if (!(bAlphaIsValid || bAlphaPaletteIsValid)) return;
	RGBQUAD c;
	int32_t a, a1;
	if (head.biBitCount==24){
		for(int32_t y=0; y<head.biHeight; y++){
			for(int32_t x=0; x<head.biWidth; x++){
				c = BlindGetPixelColor(x,y);
				if (bAlphaIsValid) a=(BlindAlphaGet(x,y)*info.nAlphaMax)/255; else a=info.nAlphaMax;
				a1 = 256-a;
				c.rgbBlue = (uint8_t)((c.rgbBlue * a + a1 * info.nBkgndColor.rgbBlue)>>8);
				c.rgbGreen = (uint8_t)((c.rgbGreen * a + a1 * info.nBkgndColor.rgbGreen)>>8);
				c.rgbRed = (uint8_t)((c.rgbRed * a + a1 * info.nBkgndColor.rgbRed)>>8);
				BlindSetPixelColor(x,y,c);
			}
		}
		AlphaDelete();
	} else {
		CxImage tmp(head.biWidth,head.biHeight,24);
		if (!tmp.IsValid()){
			strcpy(info.szLastError,tmp.GetLastError());
			return;
		}

		for(int32_t y=0; y<head.biHeight; y++){
			for(int32_t x=0; x<head.biWidth; x++){
				c = BlindGetPixelColor(x,y);
				if (bAlphaIsValid) a=(BlindAlphaGet(x,y)*info.nAlphaMax)/255; else a=info.nAlphaMax;
				if (bAlphaPaletteIsValid) a=(c.rgbReserved*a)/255;
				a1 = 256-a;
				c.rgbBlue = (uint8_t)((c.rgbBlue * a + a1 * info.nBkgndColor.rgbBlue)>>8);
				c.rgbGreen = (uint8_t)((c.rgbGreen * a + a1 * info.nBkgndColor.rgbGreen)>>8);
				c.rgbRed = (uint8_t)((c.rgbRed * a + a1 * info.nBkgndColor.rgbRed)>>8);
				tmp.BlindSetPixelColor(x,y,c);
			}
		}
		Transfer(tmp);
	}
	return;
}
////////////////////////////////////////////////////////////////////////////////
bool CxImage::AlphaFlip()
{
	if (!pAlpha) return false;

	uint8_t *buff = (uint8_t*)malloc(head.biWidth);
	if (!buff) return false;

	uint8_t *iSrc,*iDst;
	iSrc = pAlpha + (head.biHeight-1)*head.biWidth;
	iDst = pAlpha;
	for (int32_t i=0; i<(head.biHeight/2); ++i)
	{
		memcpy(buff, iSrc, head.biWidth);
		memcpy(iSrc, iDst, head.biWidth);
		memcpy(iDst, buff, head.biWidth);
		iSrc-=head.biWidth;
		iDst+=head.biWidth;
	}

	free(buff);

	return true;
}
////////////////////////////////////////////////////////////////////////////////
bool CxImage::AlphaMirror()
{
	if (!pAlpha) return false;
	uint8_t* pAlpha2 = (uint8_t*)malloc(head.biWidth * head.biHeight);
	if (!pAlpha2) return false;
	uint8_t *iSrc,*iDst;
	int32_t wdt=head.biWidth-1;
	iSrc=pAlpha + wdt;
	iDst=pAlpha2;
	for(int32_t y=0; y < head.biHeight; y++){
		for(int32_t x=0; x <= wdt; x++)
			*(iDst+x)=*(iSrc-x);
		iSrc+=head.biWidth;
		iDst+=head.biWidth;
	}
	free(pAlpha);
	pAlpha=pAlpha2;
	return true;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Exports the alpha channel in a 8bpp grayscale image. 
 */
bool CxImage::AlphaSplit(CxImage *dest)
{
	if (!pAlpha || !dest) return false;

	CxImage tmp(head.biWidth,head.biHeight,8);
	if (!tmp.IsValid()){
		strcpy(info.szLastError,tmp.GetLastError());
		return false;
	}

	uint8_t* src = pAlpha;
	uint8_t* dst = tmp.info.pImage;
	for (int32_t y=0; y<head.biHeight; y++){
		memcpy(dst,src,head.biWidth);
		dst += tmp.info.dwEffWidth;
		src += head.biWidth;
	}

	tmp.SetGrayPalette();
	dest->Transfer(tmp);

	return true;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Exports the alpha palette channel in a 8bpp grayscale image. 
 */
bool CxImage::AlphaPaletteSplit(CxImage *dest)
{
	if (!AlphaPaletteIsValid() || !dest) return false;

	CxImage tmp(head.biWidth,head.biHeight,8);
	if (!tmp.IsValid()){
		strcpy(info.szLastError,tmp.GetLastError());
		return false;
	}

	for(int32_t y=0; y<head.biHeight; y++){
		for(int32_t x=0; x<head.biWidth; x++){
			tmp.BlindSetPixelIndex(x,y,BlindGetPixelColor(x,y).rgbReserved);
		}
	}

	tmp.SetGrayPalette();
	dest->Transfer(tmp);

	return true;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Merge in the alpha layer the transparent color mask
 * (previously set with SetTransColor or SetTransIndex) 
 */
bool CxImage::AlphaFromTransparency()
{
	if (!IsValid() || !IsTransparent())
		return false;

	AlphaCreate();

	for(int32_t y=0; y<head.biHeight; y++){
		for(int32_t x=0; x<head.biWidth; x++){
			if (IsTransparent(x,y)){
				AlphaSet(x,y,0);
			}
		}
	}
	return true;
}
////////////////////////////////////////////////////////////////////////////////
#endif //CXIMAGE_SUPPORT_ALPHA
