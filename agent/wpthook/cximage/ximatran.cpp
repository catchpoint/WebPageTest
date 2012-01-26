// xImaTran.cpp : Transformation functions
/* 07/08/2001 v1.00 - Davide Pizzolato - www.xdp.it
 * CxImage version 7.0.1 07/Jan/2011
 */

#include "ximage.h"
#include "ximath.h"

#if CXIMAGE_SUPPORT_BASICTRANSFORMATIONS
////////////////////////////////////////////////////////////////////////////////
/**
 * Increases the number of bits per pixel of the image.
 * \param nbit: 4, 8, 24
 */
bool CxImage::IncreaseBpp(uint32_t nbit)
{
	if (!pDib) return false;
	switch (nbit){
	case 4:
		{
			if (head.biBitCount==4) return true;
			if (head.biBitCount>4) return false;

			CxImage tmp;
			tmp.CopyInfo(*this);
			tmp.Create(head.biWidth,head.biHeight,4,info.dwType);
			tmp.SetPalette(GetPalette(),GetNumColors());
			if (!tmp.IsValid()){
				strcpy(info.szLastError,tmp.GetLastError());
				return false;
			}


#if CXIMAGE_SUPPORT_SELECTION
			tmp.SelectionCopy(*this);
#endif //CXIMAGE_SUPPORT_SELECTION

#if CXIMAGE_SUPPORT_ALPHA
			tmp.AlphaCopy(*this);
#endif //CXIMAGE_SUPPORT_ALPHA

			for (int32_t y=0;y<head.biHeight;y++){
				if (info.nEscape) break;
				for (int32_t x=0;x<head.biWidth;x++){
					tmp.BlindSetPixelIndex(x,y,BlindGetPixelIndex(x,y));
				}
			}
			Transfer(tmp);
			return true;
		}
	case 8:
		{
			if (head.biBitCount==8) return true;
			if (head.biBitCount>8) return false;

			CxImage tmp;
			tmp.CopyInfo(*this);
			tmp.Create(head.biWidth,head.biHeight,8,info.dwType);
			tmp.SetPalette(GetPalette(),GetNumColors());
			if (!tmp.IsValid()){
				strcpy(info.szLastError,tmp.GetLastError());
				return false;
			}

#if CXIMAGE_SUPPORT_SELECTION
			tmp.SelectionCopy(*this);
#endif //CXIMAGE_SUPPORT_SELECTION

#if CXIMAGE_SUPPORT_ALPHA
			tmp.AlphaCopy(*this);
#endif //CXIMAGE_SUPPORT_ALPHA

			for (int32_t y=0;y<head.biHeight;y++){
				if (info.nEscape) break;
				for (int32_t x=0;x<head.biWidth;x++){
					tmp.BlindSetPixelIndex(x,y,BlindGetPixelIndex(x,y));
				}
			}
			Transfer(tmp);
			return true;
		}
	case 24:
		{
			if (head.biBitCount==24) return true;
			if (head.biBitCount>24) return false;

			CxImage tmp;
			tmp.CopyInfo(*this);
			tmp.Create(head.biWidth,head.biHeight,24,info.dwType);
			if (!tmp.IsValid()){
				strcpy(info.szLastError,tmp.GetLastError());
				return false;
			}

			if (info.nBkgndIndex>=0) //translate transparency
				tmp.info.nBkgndColor=GetPaletteColor((uint8_t)info.nBkgndIndex);

#if CXIMAGE_SUPPORT_SELECTION
			tmp.SelectionCopy(*this);
#endif //CXIMAGE_SUPPORT_SELECTION

#if CXIMAGE_SUPPORT_ALPHA
			tmp.AlphaCopy(*this);
			if (AlphaPaletteIsValid() && !AlphaIsValid()) tmp.AlphaCreate();
#endif //CXIMAGE_SUPPORT_ALPHA

			for (int32_t y=0;y<head.biHeight;y++){
				if (info.nEscape) break;
				for (int32_t x=0;x<head.biWidth;x++){
					tmp.BlindSetPixelColor(x,y,BlindGetPixelColor(x,y),true);
				}
			}
			Transfer(tmp);
			return true;
		}
	}
	return false;
}
////////////////////////////////////////////////////////////////////////////////
bool CxImage::GrayScale()
{
	if (!pDib) return false;
	if (head.biBitCount<=8){
		RGBQUAD* ppal=GetPalette();
		int32_t gray;
		//converts the colors to gray, use the blue channel only
		for(uint32_t i=0;i<head.biClrUsed;i++){
			gray=(int32_t)RGB2GRAY(ppal[i].rgbRed,ppal[i].rgbGreen,ppal[i].rgbBlue);
			ppal[i].rgbBlue = (uint8_t)gray;
		}
		// preserve transparency
		if (info.nBkgndIndex >= 0) info.nBkgndIndex = ppal[info.nBkgndIndex].rgbBlue;
		//create a "real" 8 bit gray scale image
		if (head.biBitCount==8){
			uint8_t *img=info.pImage;
			for(uint32_t i=0;i<head.biSizeImage;i++) img[i]=ppal[img[i]].rgbBlue;
			SetGrayPalette();
		}
		//transform to 8 bit gray scale
		if (head.biBitCount==4 || head.biBitCount==1){
			CxImage ima;
			ima.CopyInfo(*this);
			if (!ima.Create(head.biWidth,head.biHeight,8,info.dwType)) return false;
			ima.SetGrayPalette();
#if CXIMAGE_SUPPORT_SELECTION
			ima.SelectionCopy(*this);
#endif //CXIMAGE_SUPPORT_SELECTION
#if CXIMAGE_SUPPORT_ALPHA
			ima.AlphaCopy(*this);
#endif //CXIMAGE_SUPPORT_ALPHA
			for (int32_t y=0;y<head.biHeight;y++){
				uint8_t *iDst = ima.GetBits(y);
				uint8_t *iSrc = GetBits(y);
				for (int32_t x=0;x<head.biWidth; x++){
					//iDst[x]=ppal[BlindGetPixelIndex(x,y)].rgbBlue;
					if (head.biBitCount==4){
						uint8_t pos = (uint8_t)(4*(1-x%2));
						iDst[x]= ppal[(uint8_t)((iSrc[x >> 1]&((uint8_t)0x0F<<pos)) >> pos)].rgbBlue;
					} else {
						uint8_t pos = (uint8_t)(7-x%8);
						iDst[x]= ppal[(uint8_t)((iSrc[x >> 3]&((uint8_t)0x01<<pos)) >> pos)].rgbBlue;
					}
				}
			}
			Transfer(ima);
		}
	} else { //from RGB to 8 bit gray scale
		uint8_t *iSrc=info.pImage;
		CxImage ima;
		ima.CopyInfo(*this);
		if (!ima.Create(head.biWidth,head.biHeight,8,info.dwType)) return false;
		ima.SetGrayPalette();
		if (GetTransIndex()>=0){
			RGBQUAD c = GetTransColor();
			ima.SetTransIndex((uint8_t)RGB2GRAY(c.rgbRed,c.rgbGreen,c.rgbBlue));
		}
#if CXIMAGE_SUPPORT_SELECTION
		ima.SelectionCopy(*this);
#endif //CXIMAGE_SUPPORT_SELECTION
#if CXIMAGE_SUPPORT_ALPHA
		ima.AlphaCopy(*this);
#endif //CXIMAGE_SUPPORT_ALPHA
		uint8_t *img=ima.GetBits();
		int32_t l8=ima.GetEffWidth();
		int32_t l=head.biWidth * 3;
		for(int32_t y=0; y < head.biHeight; y++) {
			for(int32_t x=0,x8=0; x < l; x+=3,x8++) {
				img[x8+y*l8]=(uint8_t)RGB2GRAY(*(iSrc+x+2),*(iSrc+x+1),*(iSrc+x+0));
			}
			iSrc+=info.dwEffWidth;
		}
		Transfer(ima);
	}
	return true;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * \sa Mirror
 * \author [qhbo]
 */
bool CxImage::Flip(bool bFlipSelection, bool bFlipAlpha)
{
	if (!pDib) return false;

	uint8_t *buff = (uint8_t*)malloc(info.dwEffWidth);
	if (!buff) return false;

	uint8_t *iSrc,*iDst;
	iSrc = GetBits(head.biHeight-1);
	iDst = GetBits(0);
	for (int32_t i=0; i<(head.biHeight/2); ++i)
	{
		memcpy(buff, iSrc, info.dwEffWidth);
		memcpy(iSrc, iDst, info.dwEffWidth);
		memcpy(iDst, buff, info.dwEffWidth);
		iSrc-=info.dwEffWidth;
		iDst+=info.dwEffWidth;
	}

	free(buff);

	if (bFlipSelection){
#if CXIMAGE_SUPPORT_SELECTION
		SelectionFlip();
#endif //CXIMAGE_SUPPORT_SELECTION
	}

	if (bFlipAlpha){
#if CXIMAGE_SUPPORT_ALPHA
		AlphaFlip();
#endif //CXIMAGE_SUPPORT_ALPHA
	}

	return true;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * \sa Flip
 */
bool CxImage::Mirror(bool bMirrorSelection, bool bMirrorAlpha)
{
	if (!pDib) return false;

	CxImage* imatmp = new CxImage(*this,false,true,true);
	if (!imatmp) return false;
	if (!imatmp->IsValid()){
		delete imatmp;
		return false;
	}

	uint8_t *iSrc,*iDst;
	int32_t wdt=(head.biWidth-1) * (head.biBitCount==24 ? 3:1);
	iSrc=info.pImage + wdt;
	iDst=imatmp->info.pImage;
	int32_t x,y;
	switch (head.biBitCount){
	case 24:
		for(y=0; y < head.biHeight; y++){
			for(x=0; x <= wdt; x+=3){
				*(iDst+x)=*(iSrc-x);
				*(iDst+x+1)=*(iSrc-x+1);
				*(iDst+x+2)=*(iSrc-x+2);
			}
			iSrc+=info.dwEffWidth;
			iDst+=info.dwEffWidth;
		}
		break;
	case 8:
		for(y=0; y < head.biHeight; y++){
			for(x=0; x <= wdt; x++)
				*(iDst+x)=*(iSrc-x);
			iSrc+=info.dwEffWidth;
			iDst+=info.dwEffWidth;
		}
		break;
	default:
		for(y=0; y < head.biHeight; y++){
			for(x=0; x <= wdt; x++)
				imatmp->SetPixelIndex(x,y,GetPixelIndex(wdt-x,y));
		}
	}

	if (bMirrorSelection){
#if CXIMAGE_SUPPORT_SELECTION
		imatmp->SelectionMirror();
#endif //CXIMAGE_SUPPORT_SELECTION
	}

	if (bMirrorAlpha){
#if CXIMAGE_SUPPORT_ALPHA
		imatmp->AlphaMirror();
#endif //CXIMAGE_SUPPORT_ALPHA
	}

	Transfer(*imatmp);
	delete imatmp;
	return true;
}

////////////////////////////////////////////////////////////////////////////////
#define RBLOCK 64

////////////////////////////////////////////////////////////////////////////////
bool CxImage::RotateLeft(CxImage* iDst)
{
	if (!pDib) return false;

	int32_t newWidth = GetHeight();
	int32_t newHeight = GetWidth();

	CxImage imgDest;
	imgDest.CopyInfo(*this);
	imgDest.Create(newWidth,newHeight,GetBpp(),GetType());
	imgDest.SetPalette(GetPalette());

#if CXIMAGE_SUPPORT_ALPHA
	if (AlphaIsValid()) imgDest.AlphaCreate();
#endif

#if CXIMAGE_SUPPORT_SELECTION
	if (SelectionIsValid()) imgDest.SelectionCreate();
#endif

	int32_t x,x2,y,dlineup;
	
	// Speedy rotate for BW images <Robert Abram>
	if (head.biBitCount == 1) {
	
		uint8_t *sbits, *dbits, *dbitsmax, bitpos, *nrow,*srcdisp;
		ldiv_t div_r;

		uint8_t *bsrc = GetBits(), *bdest = imgDest.GetBits();
		dbitsmax = bdest + imgDest.head.biSizeImage - 1;
		dlineup = 8 * imgDest.info.dwEffWidth - imgDest.head.biWidth;

		imgDest.Clear(0);
		for (y = 0; y < head.biHeight; y++) {
			// Figure out the Column we are going to be copying to
			div_r = ldiv(y + dlineup, (int32_t)8);
			// set bit pos of src column byte				
			bitpos = (uint8_t)(1 << div_r.rem);
			srcdisp = bsrc + y * info.dwEffWidth;
			for (x = 0; x < (int32_t)info.dwEffWidth; x++) {
				// Get Source Bits
				sbits = srcdisp + x;
				// Get destination column
				nrow = bdest + (x * 8) * imgDest.info.dwEffWidth + imgDest.info.dwEffWidth - 1 - div_r.quot;
				for (int32_t z = 0; z < 8; z++) {
				   // Get Destination Byte
					dbits = nrow + z * imgDest.info.dwEffWidth;
					if ((dbits < bdest) || (dbits > dbitsmax)) break;
					if (*sbits & (128 >> z)) *dbits |= bitpos;
				}
			}
		}//for y

#if CXIMAGE_SUPPORT_ALPHA
		if (AlphaIsValid()) {
			for (x = 0; x < newWidth; x++){
				x2=newWidth-x-1;
				for (y = 0; y < newHeight; y++){
					imgDest.AlphaSet(x,y,BlindAlphaGet(y, x2));
				}//for y
			}//for x
		}
#endif //CXIMAGE_SUPPORT_ALPHA

#if CXIMAGE_SUPPORT_SELECTION
		if (SelectionIsValid()) {
			imgDest.info.rSelectionBox.left = newWidth-info.rSelectionBox.top;
			imgDest.info.rSelectionBox.right = newWidth-info.rSelectionBox.bottom;
			imgDest.info.rSelectionBox.bottom = info.rSelectionBox.left;
			imgDest.info.rSelectionBox.top = info.rSelectionBox.right;
			for (x = 0; x < newWidth; x++){
				x2=newWidth-x-1;
				for (y = 0; y < newHeight; y++){
					imgDest.SelectionSet(x,y,BlindSelectionGet(y, x2));
				}//for y
			}//for x
		}
#endif //CXIMAGE_SUPPORT_SELECTION

	} else {
	//anything other than BW:
	//bd, 10. 2004: This optimized version of rotation rotates image by smaller blocks. It is quite
	//a bit faster than obvious algorithm, because it produces much less CPU cache misses.
	//This optimization can be tuned by changing block size (RBLOCK). 96 is good value for current
	//CPUs (tested on Athlon XP and Celeron D). Larger value (if CPU has enough cache) will increase
	//speed somehow, but once you drop out of CPU's cache, things will slow down drastically.
	//For older CPUs with less cache, lower value would yield better results.
		
		uint8_t *srcPtr, *dstPtr;                        //source and destionation for 24-bit version
		int32_t xs, ys;                                   //x-segment and y-segment
		for (xs = 0; xs < newWidth; xs+=RBLOCK) {       //for all image blocks of RBLOCK*RBLOCK pixels
			for (ys = 0; ys < newHeight; ys+=RBLOCK) {
				if (head.biBitCount==24) {
					//RGB24 optimized pixel access:
					for (x = xs; x < min(newWidth, xs+RBLOCK); x++){    //do rotation
						info.nProgress = (int32_t)(100*x/newWidth);
						x2=newWidth-x-1;
						dstPtr = (uint8_t*) imgDest.BlindGetPixelPointer(x,ys);
						srcPtr = (uint8_t*) BlindGetPixelPointer(ys, x2);
						for (y = ys; y < min(newHeight, ys+RBLOCK); y++){
							//imgDest.SetPixelColor(x, y, GetPixelColor(y, x2));
							*(dstPtr) = *(srcPtr);
							*(dstPtr+1) = *(srcPtr+1);
							*(dstPtr+2) = *(srcPtr+2);
							srcPtr += 3;
							dstPtr += imgDest.info.dwEffWidth;
						}//for y
					}//for x
				} else {
					//anything else than 24bpp (and 1bpp): palette
					for (x = xs; x < min(newWidth, xs+RBLOCK); x++){
						info.nProgress = (int32_t)(100*x/newWidth); //<Anatoly Ivasyuk>
						x2=newWidth-x-1;
						for (y = ys; y < min(newHeight, ys+RBLOCK); y++){
							imgDest.SetPixelIndex(x, y, BlindGetPixelIndex(y, x2));
						}//for y
					}//for x
				}//if (version selection)
#if CXIMAGE_SUPPORT_ALPHA
				if (AlphaIsValid()) {
					for (x = xs; x < min(newWidth, xs+RBLOCK); x++){
						x2=newWidth-x-1;
						for (y = ys; y < min(newHeight, ys+RBLOCK); y++){
							imgDest.AlphaSet(x,y,BlindAlphaGet(y, x2));
						}//for y
					}//for x
				}//if (alpha channel)
#endif //CXIMAGE_SUPPORT_ALPHA

#if CXIMAGE_SUPPORT_SELECTION
				if (SelectionIsValid()) {
					imgDest.info.rSelectionBox.left = newWidth-info.rSelectionBox.top;
					imgDest.info.rSelectionBox.right = newWidth-info.rSelectionBox.bottom;
					imgDest.info.rSelectionBox.bottom = info.rSelectionBox.left;
					imgDest.info.rSelectionBox.top = info.rSelectionBox.right;
					for (x = xs; x < min(newWidth, xs+RBLOCK); x++){
						x2=newWidth-x-1;
						for (y = ys; y < min(newHeight, ys+RBLOCK); y++){
							imgDest.SelectionSet(x,y,BlindSelectionGet(y, x2));
						}//for y
					}//for x
				}//if (selection)
#endif //CXIMAGE_SUPPORT_SELECTION
			}//for ys
		}//for xs
	}//if

	//select the destination
	if (iDst) iDst->Transfer(imgDest);
	else Transfer(imgDest);
	return true;
}

////////////////////////////////////////////////////////////////////////////////
bool CxImage::RotateRight(CxImage* iDst)
{
	if (!pDib) return false;

	int32_t newWidth = GetHeight();
	int32_t newHeight = GetWidth();

	CxImage imgDest;
	imgDest.CopyInfo(*this);
	imgDest.Create(newWidth,newHeight,GetBpp(),GetType());
	imgDest.SetPalette(GetPalette());

#if CXIMAGE_SUPPORT_ALPHA
	if (AlphaIsValid()) imgDest.AlphaCreate();
#endif

#if CXIMAGE_SUPPORT_SELECTION
	if (SelectionIsValid()) imgDest.SelectionCreate();
#endif

	int32_t x,y,y2;
	// Speedy rotate for BW images <Robert Abram>
	if (head.biBitCount == 1) {
	
		uint8_t *sbits, *dbits, *dbitsmax, bitpos, *nrow,*srcdisp;
		ldiv_t div_r;

		uint8_t *bsrc = GetBits(), *bdest = imgDest.GetBits();
		dbitsmax = bdest + imgDest.head.biSizeImage - 1;

		imgDest.Clear(0);
		for (y = 0; y < head.biHeight; y++) {
			// Figure out the Column we are going to be copying to
			div_r = ldiv(y, (int32_t)8);
			// set bit pos of src column byte				
			bitpos = (uint8_t)(128 >> div_r.rem);
			srcdisp = bsrc + y * info.dwEffWidth;
			for (x = 0; x < (int32_t)info.dwEffWidth; x++) {
				// Get Source Bits
				sbits = srcdisp + x;
				// Get destination column
				nrow = bdest + (imgDest.head.biHeight-1-(x*8)) * imgDest.info.dwEffWidth + div_r.quot;
				for (int32_t z = 0; z < 8; z++) {
				   // Get Destination Byte
					dbits = nrow - z * imgDest.info.dwEffWidth;
					if ((dbits < bdest) || (dbits > dbitsmax)) break;
					if (*sbits & (128 >> z)) *dbits |= bitpos;
				}
			}
		}

#if CXIMAGE_SUPPORT_ALPHA
		if (AlphaIsValid()){
			for (y = 0; y < newHeight; y++){
				y2=newHeight-y-1;
				for (x = 0; x < newWidth; x++){
					imgDest.AlphaSet(x,y,BlindAlphaGet(y2, x));
				}
			}
		}
#endif //CXIMAGE_SUPPORT_ALPHA

#if CXIMAGE_SUPPORT_SELECTION
		if (SelectionIsValid()){
			imgDest.info.rSelectionBox.left = info.rSelectionBox.bottom;
			imgDest.info.rSelectionBox.right = info.rSelectionBox.top;
			imgDest.info.rSelectionBox.bottom = newHeight-info.rSelectionBox.right;
			imgDest.info.rSelectionBox.top = newHeight-info.rSelectionBox.left;
			for (y = 0; y < newHeight; y++){
				y2=newHeight-y-1;
				for (x = 0; x < newWidth; x++){
					imgDest.SelectionSet(x,y,BlindSelectionGet(y2, x));
				}
			}
		}
#endif //CXIMAGE_SUPPORT_SELECTION

	} else {
		//anything else but BW
		uint8_t *srcPtr, *dstPtr;                        //source and destionation for 24-bit version
		int32_t xs, ys;                                   //x-segment and y-segment
		for (xs = 0; xs < newWidth; xs+=RBLOCK) {
			for (ys = 0; ys < newHeight; ys+=RBLOCK) {
				if (head.biBitCount==24) {
					//RGB24 optimized pixel access:
					for (y = ys; y < min(newHeight, ys+RBLOCK); y++){
						info.nProgress = (int32_t)(100*y/newHeight); //<Anatoly Ivasyuk>
						y2=newHeight-y-1;
						dstPtr = (uint8_t*) imgDest.BlindGetPixelPointer(xs,y);
						srcPtr = (uint8_t*) BlindGetPixelPointer(y2, xs);
						for (x = xs; x < min(newWidth, xs+RBLOCK); x++){
							//imgDest.SetPixelColor(x, y, GetPixelColor(y2, x));
							*(dstPtr) = *(srcPtr);
							*(dstPtr+1) = *(srcPtr+1);
							*(dstPtr+2) = *(srcPtr+2);
							dstPtr += 3;
							srcPtr += info.dwEffWidth;
						}//for x
					}//for y
				} else {
					//anything else than BW & RGB24: palette
					for (y = ys; y < min(newHeight, ys+RBLOCK); y++){
						info.nProgress = (int32_t)(100*y/newHeight); //<Anatoly Ivasyuk>
						y2=newHeight-y-1;
						for (x = xs; x < min(newWidth, xs+RBLOCK); x++){
							imgDest.SetPixelIndex(x, y, BlindGetPixelIndex(y2, x));
						}//for x
					}//for y
				}//if
#if CXIMAGE_SUPPORT_ALPHA
				if (AlphaIsValid()){
					for (y = ys; y < min(newHeight, ys+RBLOCK); y++){
						y2=newHeight-y-1;
						for (x = xs; x < min(newWidth, xs+RBLOCK); x++){
							imgDest.AlphaSet(x,y,BlindAlphaGet(y2, x));
						}//for x
					}//for y
				}//if (has alpha)
#endif //CXIMAGE_SUPPORT_ALPHA

#if CXIMAGE_SUPPORT_SELECTION
				if (SelectionIsValid()){
					imgDest.info.rSelectionBox.left = info.rSelectionBox.bottom;
					imgDest.info.rSelectionBox.right = info.rSelectionBox.top;
					imgDest.info.rSelectionBox.bottom = newHeight-info.rSelectionBox.right;
					imgDest.info.rSelectionBox.top = newHeight-info.rSelectionBox.left;
					for (y = ys; y < min(newHeight, ys+RBLOCK); y++){
						y2=newHeight-y-1;
						for (x = xs; x < min(newWidth, xs+RBLOCK); x++){
							imgDest.SelectionSet(x,y,BlindSelectionGet(y2, x));
						}//for x
					}//for y
				}//if (has alpha)
#endif //CXIMAGE_SUPPORT_SELECTION
			}//for ys
		}//for xs
	}//if

	//select the destination
	if (iDst) iDst->Transfer(imgDest);
	else Transfer(imgDest);
	return true;
}

////////////////////////////////////////////////////////////////////////////////
bool CxImage::Negative()
{
	if (!pDib) return false;

	if (head.biBitCount<=8){
		if (IsGrayScale()){ //GRAYSCALE, selection
			if (pSelection){
				for(int32_t y=info.rSelectionBox.bottom; y<info.rSelectionBox.top; y++){
					for(int32_t x=info.rSelectionBox.left; x<info.rSelectionBox.right; x++){
#if CXIMAGE_SUPPORT_SELECTION
						if (BlindSelectionIsInside(x,y))
#endif //CXIMAGE_SUPPORT_SELECTION
						{
							BlindSetPixelIndex(x,y,(uint8_t)(255-BlindGetPixelIndex(x,y)));
						}
					}
				}
			} else {
				uint8_t *iSrc=info.pImage;
				for(uint32_t i=0; i < head.biSizeImage; i++){
					*iSrc=(uint8_t)~(*(iSrc));
					iSrc++;
				}
			}
		} else { //PALETTE, full image
			RGBQUAD* ppal=GetPalette();
			for(uint32_t i=0;i<head.biClrUsed;i++){
				ppal[i].rgbBlue =(uint8_t)(255-ppal[i].rgbBlue);
				ppal[i].rgbGreen =(uint8_t)(255-ppal[i].rgbGreen);
				ppal[i].rgbRed =(uint8_t)(255-ppal[i].rgbRed);
			}
		}
	} else {
		if (pSelection==NULL){ //RGB, full image
			uint8_t *iSrc=info.pImage;
			for(uint32_t i=0; i < head.biSizeImage; i++){
				*iSrc=(uint8_t)~(*(iSrc));
				iSrc++;
			}
		} else { // RGB with selection
			RGBQUAD color;
			for(int32_t y=info.rSelectionBox.bottom; y<info.rSelectionBox.top; y++){
				for(int32_t x=info.rSelectionBox.left; x<info.rSelectionBox.right; x++){
#if CXIMAGE_SUPPORT_SELECTION
					if (BlindSelectionIsInside(x,y))
#endif //CXIMAGE_SUPPORT_SELECTION
					{
						color = BlindGetPixelColor(x,y);
						color.rgbRed = (uint8_t)(255-color.rgbRed);
						color.rgbGreen = (uint8_t)(255-color.rgbGreen);
						color.rgbBlue = (uint8_t)(255-color.rgbBlue);
						BlindSetPixelColor(x,y,color);
					}
				}
			}
		}
		//<DP> invert transparent color too
		info.nBkgndColor.rgbBlue = (uint8_t)(255-info.nBkgndColor.rgbBlue);
		info.nBkgndColor.rgbGreen = (uint8_t)(255-info.nBkgndColor.rgbGreen);
		info.nBkgndColor.rgbRed = (uint8_t)(255-info.nBkgndColor.rgbRed);
	}
	return true;
}

////////////////////////////////////////////////////////////////////////////////
#endif //CXIMAGE_SUPPORT_BASICTRANSFORMATIONS
////////////////////////////////////////////////////////////////////////////////
#if CXIMAGE_SUPPORT_TRANSFORMATION
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
#if CXIMAGE_SUPPORT_EXIF
bool CxImage::RotateExif(int32_t orientation /* = 0 */)
{
  bool ret = true;
  if (orientation <= 0)
    orientation = info.ExifInfo.Orientation;
  if (orientation == 3)
    ret = Rotate180();
  else if (orientation == 6)
    ret = RotateRight();
  else if (orientation == 8)
    ret = RotateLeft();
  else if (orientation == 5)
	ret = RotateLeft();

  info.ExifInfo.Orientation = 1;
  return ret;
}
#endif //CXIMAGE_SUPPORT_EXIF

////////////////////////////////////////////////////////////////////////////////
bool CxImage::Rotate(float angle, CxImage* iDst)
{
	if (!pDib) return false;

	if (fmod(angle,180.0f)==0.0f && fmod(angle,360.0f)!=0.0f)
		return Rotate180(iDst);

	//  Copyright (c) 1996-1998 Ulrich von Zadow

	// Negative the angle, because the y-axis is negative.
	double ang = -angle*acos((float)0)/90;
	int32_t newWidth, newHeight;
	int32_t nWidth = GetWidth();
	int32_t nHeight= GetHeight();
	double cos_angle = cos(ang);
	double sin_angle = sin(ang);

	// Calculate the size of the new bitmap
	POINT p1={0,0};
	POINT p2={nWidth,0};
	POINT p3={0,nHeight};
	POINT p4={nWidth,nHeight};
	CxPoint2 newP1,newP2,newP3,newP4, leftTop, rightTop, leftBottom, rightBottom;

	newP1.x = (float)p1.x;
	newP1.y = (float)p1.y;
	newP2.x = (float)(p2.x*cos_angle - p2.y*sin_angle);
	newP2.y = (float)(p2.x*sin_angle + p2.y*cos_angle);
	newP3.x = (float)(p3.x*cos_angle - p3.y*sin_angle);
	newP3.y = (float)(p3.x*sin_angle + p3.y*cos_angle);
	newP4.x = (float)(p4.x*cos_angle - p4.y*sin_angle);
	newP4.y = (float)(p4.x*sin_angle + p4.y*cos_angle);

	leftTop.x = min(min(newP1.x,newP2.x),min(newP3.x,newP4.x));
	leftTop.y = min(min(newP1.y,newP2.y),min(newP3.y,newP4.y));
	rightBottom.x = max(max(newP1.x,newP2.x),max(newP3.x,newP4.x));
	rightBottom.y = max(max(newP1.y,newP2.y),max(newP3.y,newP4.y));
	leftBottom.x = leftTop.x;
	leftBottom.y = rightBottom.y;
	rightTop.x = rightBottom.x;
	rightTop.y = leftTop.y;

	newWidth = (int32_t) floor(0.5f + rightTop.x - leftTop.x);
	newHeight= (int32_t) floor(0.5f + leftBottom.y - leftTop.y);
	CxImage imgDest;
	imgDest.CopyInfo(*this);
	imgDest.Create(newWidth,newHeight,GetBpp(),GetType());
	imgDest.SetPalette(GetPalette());

#if CXIMAGE_SUPPORT_ALPHA
	if(AlphaIsValid())	//MTA: Fix for rotation problem when the image has an alpha channel
	{
		imgDest.AlphaCreate();
		imgDest.AlphaClear();
	}
#endif //CXIMAGE_SUPPORT_ALPHA

	int32_t x,y,newX,newY,oldX,oldY;

	if (head.biClrUsed==0){ //RGB
		for (y = (int32_t)leftTop.y, newY = 0; y<=(int32_t)leftBottom.y; y++,newY++){
			info.nProgress = (int32_t)(100*newY/newHeight);
			if (info.nEscape) break;
			for (x = (int32_t)leftTop.x, newX = 0; x<=(int32_t)rightTop.x; x++,newX++){
				oldX = (int32_t)(x*cos_angle + y*sin_angle + 0.5);
				oldY = (int32_t)(y*cos_angle - x*sin_angle + 0.5);
				imgDest.SetPixelColor(newX,newY,GetPixelColor(oldX,oldY));
#if CXIMAGE_SUPPORT_ALPHA
				imgDest.AlphaSet(newX,newY,AlphaGet(oldX,oldY));				//MTA: copy the alpha value
#endif //CXIMAGE_SUPPORT_ALPHA
			}
		}
	} else { //PALETTE
		for (y = (int32_t)leftTop.y, newY = 0; y<=(int32_t)leftBottom.y; y++,newY++){
			info.nProgress = (int32_t)(100*newY/newHeight);
			if (info.nEscape) break;
			for (x = (int32_t)leftTop.x, newX = 0; x<=(int32_t)rightTop.x; x++,newX++){
				oldX = (int32_t)(x*cos_angle + y*sin_angle + 0.5);
				oldY = (int32_t)(y*cos_angle - x*sin_angle + 0.5);
				imgDest.SetPixelIndex(newX,newY,GetPixelIndex(oldX,oldY));
#if CXIMAGE_SUPPORT_ALPHA
				imgDest.AlphaSet(newX,newY,AlphaGet(oldX,oldY));				//MTA: copy the alpha value
#endif //CXIMAGE_SUPPORT_ALPHA
			}
		}
	}
	//select the destination
	if (iDst) iDst->Transfer(imgDest);
	else Transfer(imgDest);

	return true;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Rotates image around it's center.
 * Method can use interpolation with paletted images, but does not change pallete, so results vary.
 * (If you have only four colours in a palette, there's not much room for interpolation.)
 * 
 * \param  angle - angle in degrees (positive values rotate clockwise)
 * \param  *iDst - destination image (if null, this image is changed)
 * \param  inMethod - interpolation method used
 *              (IM_NEAREST_NEIGHBOUR produces aliasing (fast), IM_BILINEAR softens picture a bit (slower)
 *               IM_SHARPBICUBIC is slower and produces some halos...)
 * \param  ofMethod - overflow method (how to choose colour of pixels that have no source)
 * \param  replColor - replacement colour to use (OM_COLOR, OM_BACKGROUND with no background colour...)
 * \param  optimizeRightAngles - call faster methods for 90, 180, and 270 degree rotations. Faster methods
 *                         are called for angles, where error (in location of corner pixels) is less
 *                         than 0.25 pixels.
 * \param  bKeepOriginalSize - rotates the image without resizing.
 *
 * \author ***bd*** 2.2004
 */
bool CxImage::Rotate2(float angle, 
                       CxImage *iDst, 
                       InterpolationMethod inMethod, 
                       OverflowMethod ofMethod, 
                       RGBQUAD *replColor,
                       bool const optimizeRightAngles,
					   bool const bKeepOriginalSize)
{
	if (!pDib) return false;					//no dib no go

	if (fmod(angle,180.0f)==0.0f && fmod(angle,360.0f)!=0.0f)
		return Rotate180(iDst);

	double ang = -angle*acos(0.0f)/90.0f;		//convert angle to radians and invert (positive angle performs clockwise rotation)
	float cos_angle = (float) cos(ang);			//these two are needed later (to rotate)
	float sin_angle = (float) sin(ang);
	
	//Calculate the size of the new bitmap (rotate corners of image)
	CxPoint2 p[4];								//original corners of the image
	p[0]=CxPoint2(-0.5f,-0.5f);
	p[1]=CxPoint2(GetWidth()-0.5f,-0.5f);
	p[2]=CxPoint2(-0.5f,GetHeight()-0.5f);
	p[3]=CxPoint2(GetWidth()-0.5f,GetHeight()-0.5f);
	CxPoint2 newp[4];								//rotated positions of corners
	//(rotate corners)
	if (bKeepOriginalSize){
		for (int32_t i=0; i<4; i++) {
			newp[i].x = p[i].x;
			newp[i].y = p[i].y;
		}//for
	} else {
		for (int32_t i=0; i<4; i++) {
			newp[i].x = (p[i].x*cos_angle - p[i].y*sin_angle);
			newp[i].y = (p[i].x*sin_angle + p[i].y*cos_angle);
		}//for i
		
		if (optimizeRightAngles) { 
			//For rotations of 90, -90 or 180 or 0 degrees, call faster routines
			if (newp[3].Distance(CxPoint2(GetHeight()-0.5f, 0.5f-GetWidth())) < 0.25) 
				//rotation right for circa 90 degrees (diagonal pixels less than 0.25 pixel away from 90 degree rotation destination)
				return RotateRight(iDst);
			if (newp[3].Distance(CxPoint2(0.5f-GetHeight(), -0.5f+GetWidth())) < 0.25) 
				//rotation left for ~90 degrees
				return RotateLeft(iDst);
			if (newp[3].Distance(CxPoint2(0.5f-GetWidth(), 0.5f-GetHeight())) < 0.25) 
				//rotation left for ~180 degrees
				return Rotate180(iDst);
			if (newp[3].Distance(p[3]) < 0.25) {
				//rotation not significant
				if (iDst) iDst->Copy(*this);		//copy image to iDst, if required
				return true;						//and we're done
			}//if
		}//if
	}//if

	//(read new dimensions from location of corners)
	float minx = (float) min(min(newp[0].x,newp[1].x),min(newp[2].x,newp[3].x));
	float miny = (float) min(min(newp[0].y,newp[1].y),min(newp[2].y,newp[3].y));
	float maxx = (float) max(max(newp[0].x,newp[1].x),max(newp[2].x,newp[3].x));
	float maxy = (float) max(max(newp[0].y,newp[1].y),max(newp[2].y,newp[3].y));
	int32_t newWidth = (int32_t) floor(maxx-minx+0.5f);
	int32_t newHeight= (int32_t) floor(maxy-miny+0.5f);
	float ssx=((maxx+minx)- ((float) newWidth-1))/2.0f;   //start for x
	float ssy=((maxy+miny)- ((float) newHeight-1))/2.0f;  //start for y

	float newxcenteroffset = 0.5f * newWidth;
	float newycenteroffset = 0.5f * newHeight;
	if (bKeepOriginalSize){
		ssx -= 0.5f * GetWidth();
		ssy -= 0.5f * GetHeight();
	}

	//create destination image
	CxImage imgDest;
	imgDest.CopyInfo(*this);
	imgDest.Create(newWidth,newHeight,GetBpp(),GetType());
	imgDest.SetPalette(GetPalette());
#if CXIMAGE_SUPPORT_ALPHA
	if(AlphaIsValid()) imgDest.AlphaCreate(); //MTA: Fix for rotation problem when the image has an alpha channel
#endif //CXIMAGE_SUPPORT_ALPHA
	
	RGBQUAD rgb;			//pixel colour
	RGBQUAD rc;
	if (replColor!=0) 
		rc=*replColor; 
	else {
		rc.rgbRed=255; rc.rgbGreen=255; rc.rgbBlue=255; rc.rgbReserved=0;
	}//if
	float x,y;              //destination location (float, with proper offset)
	float origx, origy;     //origin location
	int32_t destx, desty;       //destination location
	
	y=ssy;                  //initialize y
	if (!IsIndexed()){ //RGB24
		//optimized RGB24 implementation (direct write to destination):
		uint8_t *pxptr;
#if CXIMAGE_SUPPORT_ALPHA
		uint8_t *pxptra=0;
#endif //CXIMAGE_SUPPORT_ALPHA
		for (desty=0; desty<newHeight; desty++) {
			info.nProgress = (int32_t)(100*desty/newHeight);
			if (info.nEscape) break;
			//initialize x
			x=ssx;
			//calculate pointer to first byte in row
			pxptr=(uint8_t *)imgDest.BlindGetPixelPointer(0, desty);
#if CXIMAGE_SUPPORT_ALPHA
			//calculate pointer to first byte in row
			if (AlphaIsValid()) pxptra=imgDest.AlphaGetPointer(0, desty);
#endif //CXIMAGE_SUPPORT_ALPHA
			for (destx=0; destx<newWidth; destx++) {
				//get source pixel coordinate for current destination point
				//origx = (cos_angle*(x-head.biWidth/2)+sin_angle*(y-head.biHeight/2))+newWidth/2;
				//origy = (cos_angle*(y-head.biHeight/2)-sin_angle*(x-head.biWidth/2))+newHeight/2;
				origx = cos_angle*x+sin_angle*y;
				origy = cos_angle*y-sin_angle*x;
				if (bKeepOriginalSize){
					origx += newxcenteroffset;
					origy += newycenteroffset;
				}
				rgb = GetPixelColorInterpolated(origx, origy, inMethod, ofMethod, &rc);   //get interpolated colour value
				//copy alpha and colour value to destination
#if CXIMAGE_SUPPORT_ALPHA
				if (pxptra) *pxptra++ = rgb.rgbReserved;
#endif //CXIMAGE_SUPPORT_ALPHA
				*pxptr++ = rgb.rgbBlue;
				*pxptr++ = rgb.rgbGreen;
				*pxptr++ = rgb.rgbRed;
				x++;
			}//for destx
			y++;
		}//for desty
	} else { 
		//non-optimized implementation for paletted images
		for (desty=0; desty<newHeight; desty++) {
			info.nProgress = (int32_t)(100*desty/newHeight);
			if (info.nEscape) break;
			x=ssx;
			for (destx=0; destx<newWidth; destx++) {
				//get source pixel coordinate for current destination point
				origx=(cos_angle*x+sin_angle*y);
				origy=(cos_angle*y-sin_angle*x);
				if (bKeepOriginalSize){
					origx += newxcenteroffset;
					origy += newycenteroffset;
				}
				rgb = GetPixelColorInterpolated(origx, origy, inMethod, ofMethod, &rc);
				//***!*** SetPixelColor is slow for palleted images
#if CXIMAGE_SUPPORT_ALPHA
				if (AlphaIsValid()) 
					imgDest.SetPixelColor(destx,desty,rgb,true);
				else 
#endif //CXIMAGE_SUPPORT_ALPHA     
					imgDest.SetPixelColor(destx,desty,rgb,false);
				x++;
			}//for destx
			y++;
		}//for desty
	}
	//select the destination
	
	if (iDst) iDst->Transfer(imgDest);
	else Transfer(imgDest);
	
	return true;
}
////////////////////////////////////////////////////////////////////////////////
bool CxImage::Rotate180(CxImage* iDst)
{
	if (!pDib) return false;

	int32_t wid = GetWidth();
	int32_t ht = GetHeight();

	CxImage imgDest;
	imgDest.CopyInfo(*this);
	imgDest.Create(wid,ht,GetBpp(),GetType());
	imgDest.SetPalette(GetPalette());

#if CXIMAGE_SUPPORT_ALPHA
	if (AlphaIsValid())	imgDest.AlphaCreate();
#endif //CXIMAGE_SUPPORT_ALPHA

	int32_t x,y,y2;
	for (y = 0; y < ht; y++){
		info.nProgress = (int32_t)(100*y/ht); //<Anatoly Ivasyuk>
		y2=ht-y-1;
		for (x = 0; x < wid; x++){
			if(head.biClrUsed==0)//RGB
				imgDest.SetPixelColor(wid-x-1, y2, BlindGetPixelColor(x, y));
			else  //PALETTE
				imgDest.SetPixelIndex(wid-x-1, y2, BlindGetPixelIndex(x, y));

#if CXIMAGE_SUPPORT_ALPHA
			if (AlphaIsValid())	imgDest.AlphaSet(wid-x-1, y2,BlindAlphaGet(x, y));
#endif //CXIMAGE_SUPPORT_ALPHA

		}
	}

	//select the destination
	if (iDst) iDst->Transfer(imgDest);
	else Transfer(imgDest);
	return true;
}

////////////////////////////////////////////////////////////////////////////////
/**
 * Resizes the image. mode can be 0 for slow (bilinear) method ,
 * 1 for fast (nearest pixel) method, or 2 for accurate (bicubic spline interpolation) method.
 * The function is faster with 24 and 1 bpp images, slow for 4 bpp images and slowest for 8 bpp images.
 */
bool CxImage::Resample(int32_t newx, int32_t newy, int32_t mode, CxImage* iDst)
{
	if (newx==0 || newy==0) return false;

	if (head.biWidth==newx && head.biHeight==newy){
		if (iDst) iDst->Copy(*this);
		return true;
	}

	float xScale, yScale, fX, fY;
	xScale = (float)head.biWidth  / (float)newx;
	yScale = (float)head.biHeight / (float)newy;

	CxImage newImage;
	newImage.CopyInfo(*this);
	newImage.Create(newx,newy,head.biBitCount,GetType());
	newImage.SetPalette(GetPalette());
	if (!newImage.IsValid()){
		strcpy(info.szLastError,newImage.GetLastError());
		return false;
	}

	switch (mode) {
	case 1: // nearest pixel
	{ 
		for(int32_t y=0; y<newy; y++){
			info.nProgress = (int32_t)(100*y/newy);
			if (info.nEscape) break;
			fY = y * yScale;
			for(int32_t x=0; x<newx; x++){
				fX = x * xScale;
				newImage.SetPixelColor(x,y,GetPixelColor((int32_t)fX,(int32_t)fY));
			}
		}
		break;
	}
	case 2: // bicubic interpolation by Blake L. Carlson <blake-carlson(at)uiowa(dot)edu
	{
		float f_x, f_y, a, b, rr, gg, bb, r1, r2;
		int32_t   i_x, i_y, xx, yy;
		RGBQUAD rgb;
		uint8_t* iDst;
		for(int32_t y=0; y<newy; y++){
			info.nProgress = (int32_t)(100*y/newy);
			if (info.nEscape) break;
			f_y = (float) y * yScale - 0.5f;
			i_y = (int32_t) floor(f_y);
			a   = f_y - (float)floor(f_y);
			for(int32_t x=0; x<newx; x++){
				f_x = (float) x * xScale - 0.5f;
				i_x = (int32_t) floor(f_x);
				b   = f_x - (float)floor(f_x);

				rr = gg = bb = 0.0f;
				for(int32_t m=-1; m<3; m++) {
					r1 = KernelBSpline((float) m - a);
					yy = i_y+m;
					if (yy<0) yy=0;
					if (yy>=head.biHeight) yy = head.biHeight-1;
					for(int32_t n=-1; n<3; n++) {
						r2 = r1 * KernelBSpline(b - (float)n);
						xx = i_x+n;
						if (xx<0) xx=0;
						if (xx>=head.biWidth) xx=head.biWidth-1;

						if (head.biClrUsed){
							rgb = GetPixelColor(xx,yy);
						} else {
							iDst  = info.pImage + yy*info.dwEffWidth + xx*3;
							rgb.rgbBlue = *iDst++;
							rgb.rgbGreen= *iDst++;
							rgb.rgbRed  = *iDst;
						}

						rr += rgb.rgbRed * r2;
						gg += rgb.rgbGreen * r2;
						bb += rgb.rgbBlue * r2;
					}
				}

				if (head.biClrUsed)
					newImage.SetPixelColor(x,y,RGB(rr,gg,bb));
				else {
					iDst = newImage.info.pImage + y*newImage.info.dwEffWidth + x*3;
					*iDst++ = (uint8_t)bb;
					*iDst++ = (uint8_t)gg;
					*iDst   = (uint8_t)rr;
				}

			}
		}
		break;
	}
	default: // bilinear interpolation
		if (!(head.biWidth>newx && head.biHeight>newy && head.biBitCount==24)) {
			// (c) 1999 Steve McMahon (steve@dogma.demon.co.uk)
			int32_t ifX, ifY, ifX1, ifY1, xmax, ymax;
			float ir1, ir2, ig1, ig2, ib1, ib2, dx, dy;
			uint8_t r,g,b;
			RGBQUAD rgb1, rgb2, rgb3, rgb4;
			xmax = head.biWidth-1;
			ymax = head.biHeight-1;
			for(int32_t y=0; y<newy; y++){
				info.nProgress = (int32_t)(100*y/newy);
				if (info.nEscape) break;
				fY = y * yScale;
				ifY = (int32_t)fY;
				ifY1 = min(ymax, ifY+1);
				dy = fY - ifY;
				for(int32_t x=0; x<newx; x++){
					fX = x * xScale;
					ifX = (int32_t)fX;
					ifX1 = min(xmax, ifX+1);
					dx = fX - ifX;
					// Interpolate using the four nearest pixels in the source
					if (head.biClrUsed){
						rgb1=GetPaletteColor(GetPixelIndex(ifX,ifY));
						rgb2=GetPaletteColor(GetPixelIndex(ifX1,ifY));
						rgb3=GetPaletteColor(GetPixelIndex(ifX,ifY1));
						rgb4=GetPaletteColor(GetPixelIndex(ifX1,ifY1));
					}
					else {
						uint8_t* iDst;
						iDst = info.pImage + ifY*info.dwEffWidth + ifX*3;
						rgb1.rgbBlue = *iDst++;	rgb1.rgbGreen= *iDst++;	rgb1.rgbRed =*iDst;
						iDst = info.pImage + ifY*info.dwEffWidth + ifX1*3;
						rgb2.rgbBlue = *iDst++;	rgb2.rgbGreen= *iDst++;	rgb2.rgbRed =*iDst;
						iDst = info.pImage + ifY1*info.dwEffWidth + ifX*3;
						rgb3.rgbBlue = *iDst++;	rgb3.rgbGreen= *iDst++;	rgb3.rgbRed =*iDst;
						iDst = info.pImage + ifY1*info.dwEffWidth + ifX1*3;
						rgb4.rgbBlue = *iDst++;	rgb4.rgbGreen= *iDst++;	rgb4.rgbRed =*iDst;
					}
					// Interplate in x direction:
					ir1 = rgb1.rgbRed   + (rgb3.rgbRed   - rgb1.rgbRed)   * dy;
					ig1 = rgb1.rgbGreen + (rgb3.rgbGreen - rgb1.rgbGreen) * dy;
					ib1 = rgb1.rgbBlue  + (rgb3.rgbBlue  - rgb1.rgbBlue)  * dy;
					ir2 = rgb2.rgbRed   + (rgb4.rgbRed   - rgb2.rgbRed)   * dy;
					ig2 = rgb2.rgbGreen + (rgb4.rgbGreen - rgb2.rgbGreen) * dy;
					ib2 = rgb2.rgbBlue  + (rgb4.rgbBlue  - rgb2.rgbBlue)  * dy;
					// Interpolate in y:
					r = (uint8_t)(ir1 + (ir2-ir1) * dx);
					g = (uint8_t)(ig1 + (ig2-ig1) * dx);
					b = (uint8_t)(ib1 + (ib2-ib1) * dx);
					// Set output
					newImage.SetPixelColor(x,y,RGB(r,g,b));
				}
			} 
		} else {
			//high resolution shrink, thanks to Henrik Stellmann <henrik.stellmann@volleynet.de>
			const int32_t ACCURACY = 1000;
			int32_t i,j; // index for faValue
			int32_t x,y; // coordinates in  source image
			uint8_t* pSource;
			uint8_t* pDest = newImage.info.pImage;
			int32_t* naAccu  = new int32_t[3 * newx + 3];
			int32_t* naCarry = new int32_t[3 * newx + 3];
			int32_t* naTemp;
			int32_t  nWeightX,nWeightY;
			float fEndX;
			int32_t nScale = (int32_t)(ACCURACY * xScale * yScale);

			memset(naAccu,  0, sizeof(int32_t) * 3 * newx);
			memset(naCarry, 0, sizeof(int32_t) * 3 * newx);

			int32_t u, v = 0; // coordinates in dest image
			float fEndY = yScale - 1.0f;
			for (y = 0; y < head.biHeight; y++){
				info.nProgress = (int32_t)(100*y/head.biHeight); //<Anatoly Ivasyuk>
				if (info.nEscape) break;
				pSource = info.pImage + y * info.dwEffWidth;
				u = i = 0;
				fEndX = xScale - 1.0f;
				if ((float)y < fEndY) {       // complete source row goes into dest row
					for (x = 0; x < head.biWidth; x++){
						if ((float)x < fEndX){       // complete source pixel goes into dest pixel
							for (j = 0; j < 3; j++)	naAccu[i + j] += (*pSource++) * ACCURACY;
						} else {       // source pixel is splitted for 2 dest pixels
							nWeightX = (int32_t)(((float)x - fEndX) * ACCURACY);
							for (j = 0; j < 3; j++){
								naAccu[i] += (ACCURACY - nWeightX) * (*pSource);
								naAccu[3 + i++] += nWeightX * (*pSource++);
							}
							fEndX += xScale;
							u++;
						}
					}
				} else {       // source row is splitted for 2 dest rows       
					nWeightY = (int32_t)(((float)y - fEndY) * ACCURACY);
					for (x = 0; x < head.biWidth; x++){
						if ((float)x < fEndX){       // complete source pixel goes into 2 pixel
							for (j = 0; j < 3; j++){
								naAccu[i + j] += ((ACCURACY - nWeightY) * (*pSource));
								naCarry[i + j] += nWeightY * (*pSource++);
							}
						} else {       // source pixel is splitted for 4 dest pixels
							nWeightX = (int32_t)(((float)x - fEndX) * ACCURACY);
							for (j = 0; j < 3; j++) {
								naAccu[i] += ((ACCURACY - nWeightY) * (ACCURACY - nWeightX)) * (*pSource) / ACCURACY;
								*pDest++ = (uint8_t)(naAccu[i] / nScale);
								naCarry[i] += (nWeightY * (ACCURACY - nWeightX) * (*pSource)) / ACCURACY;
								naAccu[i + 3] += ((ACCURACY - nWeightY) * nWeightX * (*pSource)) / ACCURACY;
								naCarry[i + 3] = (nWeightY * nWeightX * (*pSource)) / ACCURACY;
								i++;
								pSource++;
							}
							fEndX += xScale;
							u++;
						}
					}
					if (u < newx){ // possibly not completed due to rounding errors
						for (j = 0; j < 3; j++) *pDest++ = (uint8_t)(naAccu[i++] / nScale);
					}
					naTemp = naCarry;
					naCarry = naAccu;
					naAccu = naTemp;
					memset(naCarry, 0, sizeof(int32_t) * 3);    // need only to set first pixel zero
					pDest = newImage.info.pImage + (++v * newImage.info.dwEffWidth);
					fEndY += yScale;
				}
			}
			if (v < newy){	// possibly not completed due to rounding errors
				for (i = 0; i < 3 * newx; i++) *pDest++ = (uint8_t)(naAccu[i] / nScale);
			}
			delete [] naAccu;
			delete [] naCarry;
		}
	}

#if CXIMAGE_SUPPORT_ALPHA
	if (AlphaIsValid()){
		if (1 == mode){
			newImage.AlphaCreate();
			for(int32_t y=0; y<newy; y++){
				fY = y * yScale;
				for(int32_t x=0; x<newx; x++){
					fX = x * xScale;
					newImage.AlphaSet(x,y,AlphaGet((int32_t)fX,(int32_t)fY));
				}
			}
		} else {
			CxImage newAlpha;
			AlphaSplit(&newAlpha);
			newAlpha.Resample(newx, newy, mode);
			newImage.AlphaSet(newAlpha);
		}
	}
#endif //CXIMAGE_SUPPORT_ALPHA

	//select the destination
	if (iDst) iDst->Transfer(newImage);
	else Transfer(newImage);

	return true;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * New simpler resample. Adds new interpolation methods and simplifies code (using GetPixelColorInterpolated
 * and GetAreaColorInterpolated). It also (unlike old method) interpolates alpha layer. 
 *
 * \param  newx, newy - size of resampled image
 * \param  inMethod - interpolation method to use (see comments at GetPixelColorInterpolated)
 *              If image size is being reduced, averaging is used instead (or simultaneously with) inMethod.
 * \param  ofMethod - what to replace outside pixels by (only significant for bordering pixels of enlarged image)
 * \param  iDst - pointer to destination CxImage or NULL.
 * \param  disableAveraging - force no averaging when shrinking images (Produces aliasing.
 *                      You probably just want to leave this off...)
 *
 * \author ***bd*** 2.2004
 */
bool CxImage::Resample2(
  int32_t newx, int32_t newy, 
  InterpolationMethod const inMethod, 
  OverflowMethod const ofMethod, 
  CxImage* const iDst,
  bool const disableAveraging)
{
	if (newx<=0 || newy<=0 || !pDib) return false;
	
	if (head.biWidth==newx && head.biHeight==newy) {
		//image already correct size (just copy and return)
		if (iDst) iDst->Copy(*this);
		return true;
	}//if
	
	//calculate scale of new image (less than 1 for enlarge)
	float xScale, yScale;
	xScale = (float)head.biWidth  / (float)newx;    
	yScale = (float)head.biHeight / (float)newy;
	
	//create temporary destination image
	CxImage newImage;
	newImage.CopyInfo(*this);
	newImage.Create(newx,newy,head.biBitCount,GetType());
	newImage.SetPalette(GetPalette());
	if (!newImage.IsValid()){
		strcpy(info.szLastError,newImage.GetLastError());
		return false;
	}
	
	//and alpha channel if required
#if CXIMAGE_SUPPORT_ALPHA
	if (AlphaIsValid()) newImage.AlphaCreate();
	uint8_t *pxptra = 0;	// destination alpha data
#endif
	
	float sX, sY;         //source location
	int32_t dX,dY;           //destination pixel (int32_t value)
	if ((xScale<=1 && yScale<=1) || disableAveraging) {
		//image is being enlarged (or interpolation on demand)
		if (!IsIndexed()) {
			//RGB24 image (optimized version with direct writes)
			RGBQUAD q;              //pixel colour
			uint8_t *pxptr;            //pointer to destination pixel
			for(dY=0; dY<newy; dY++){
				info.nProgress = (int32_t)(100*dY/newy);
				if (info.nEscape) break;
				sY = (dY + 0.5f) * yScale - 0.5f;
				pxptr=(uint8_t*)(newImage.BlindGetPixelPointer(0,dY));
#if CXIMAGE_SUPPORT_ALPHA
				pxptra=newImage.AlphaGetPointer(0,dY);
#endif
				for(dX=0; dX<newx; dX++){
					sX = (dX + 0.5f) * xScale - 0.5f;
					q=GetPixelColorInterpolated(sX,sY,inMethod,ofMethod,0);
					*pxptr++=q.rgbBlue;
					*pxptr++=q.rgbGreen;
					*pxptr++=q.rgbRed;
#if CXIMAGE_SUPPORT_ALPHA
					if (pxptra) *pxptra++=q.rgbReserved;
#endif
				}//for dX
			}//for dY
		} else {
			//enlarge paletted image. Slower method.
			for(dY=0; dY<newy; dY++){
				info.nProgress = (int32_t)(100*dY/newy);
				if (info.nEscape) break;
				sY = (dY + 0.5f) * yScale - 0.5f;
				for(dX=0; dX<newx; dX++){
					sX = (dX + 0.5f) * xScale - 0.5f;
					newImage.SetPixelColor(dX,dY,GetPixelColorInterpolated(sX,sY,inMethod,ofMethod,0),true);
				}//for x
			}//for y
		}//if
	} else {
		//image size is being reduced (averaging enabled)
		for(dY=0; dY<newy; dY++){
			info.nProgress = (int32_t)(100*dY/newy); if (info.nEscape) break;
			sY = (dY+0.5f) * yScale - 0.5f;
			for(dX=0; dX<newx; dX++){
				sX = (dX+0.5f) * xScale - 0.5f;
				newImage.SetPixelColor(dX,dY,GetAreaColorInterpolated(sX, sY, xScale, yScale, inMethod, ofMethod,0),true);
			}//for x
		}//for y
	}//if

#if CXIMAGE_SUPPORT_ALPHA
	if (AlphaIsValid() && pxptra == 0){
		for(int32_t y=0; y<newy; y++){
			dY = (int32_t)(y * yScale);
			for(int32_t x=0; x<newx; x++){
				dX = (int32_t)(x * xScale);
				newImage.AlphaSet(x,y,AlphaGet(dX,dY));
			}
		}
	}
#endif //CXIMAGE_SUPPORT_ALPHA

	//copy new image to the destination
	if (iDst) 
		iDst->Transfer(newImage);
	else 
		Transfer(newImage);
	return true;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Reduces the number of bits per pixel to nbit (1, 4 or 8).
 * ppal points to a valid palette for the final image; if not supplied the function will use a standard palette.
 * ppal is not necessary for reduction to 1 bpp.
 */
bool CxImage::DecreaseBpp(uint32_t nbit, bool errordiffusion, RGBQUAD* ppal, uint32_t clrimportant)
{
	if (!pDib) return false;
	if (head.biBitCount <  nbit){
		strcpy(info.szLastError,"DecreaseBpp: target BPP greater than source BPP");
		return false;
	}
	if (head.biBitCount == nbit){
		if (clrimportant==0) return true;
		if (head.biClrImportant && (head.biClrImportant<clrimportant)) return true;
	}

	int32_t er,eg,eb;
	RGBQUAD c,ce;

	CxImage tmp;
	tmp.CopyInfo(*this);
	tmp.Create(head.biWidth,head.biHeight,(uint16_t)nbit,info.dwType);
	if (clrimportant) tmp.SetClrImportant(clrimportant);
	if (!tmp.IsValid()){
		strcpy(info.szLastError,tmp.GetLastError());
		return false;
	}

#if CXIMAGE_SUPPORT_SELECTION
	tmp.SelectionCopy(*this);
#endif //CXIMAGE_SUPPORT_SELECTION

#if CXIMAGE_SUPPORT_ALPHA
	tmp.AlphaCopy(*this);
#endif //CXIMAGE_SUPPORT_ALPHA

	if (ppal) {
		if (clrimportant) {
			tmp.SetPalette(ppal,clrimportant);
		} else {
			tmp.SetPalette(ppal,1<<tmp.head.biBitCount);
		}
	} else {
		tmp.SetStdPalette();
	}

	for (int32_t y=0;y<head.biHeight;y++){
		if (info.nEscape) break;
		info.nProgress = (int32_t)(100*y/head.biHeight);
		for (int32_t x=0;x<head.biWidth;x++){
			if (!errordiffusion){
				tmp.BlindSetPixelColor(x,y,BlindGetPixelColor(x,y));
			} else {
				c = BlindGetPixelColor(x,y);
				tmp.BlindSetPixelColor(x,y,c);

				ce = tmp.BlindGetPixelColor(x,y);
				er=(int32_t)c.rgbRed - (int32_t)ce.rgbRed;
				eg=(int32_t)c.rgbGreen - (int32_t)ce.rgbGreen;
				eb=(int32_t)c.rgbBlue - (int32_t)ce.rgbBlue;

				c = GetPixelColor(x+1,y);
				c.rgbRed = (uint8_t)min(255L,max(0L,(int32_t)c.rgbRed + ((er*7)/16)));
				c.rgbGreen = (uint8_t)min(255L,max(0L,(int32_t)c.rgbGreen + ((eg*7)/16)));
				c.rgbBlue = (uint8_t)min(255L,max(0L,(int32_t)c.rgbBlue + ((eb*7)/16)));
				SetPixelColor(x+1,y,c);
				int32_t coeff=1;
				for(int32_t i=-1; i<2; i++){
					switch(i){
					case -1:
						coeff=2; break;
					case 0:
						coeff=4; break;
					case 1:
						coeff=1; break;
					}
					c = GetPixelColor(x+i,y+1);
					c.rgbRed = (uint8_t)min(255L,max(0L,(int32_t)c.rgbRed + ((er * coeff)/16)));
					c.rgbGreen = (uint8_t)min(255L,max(0L,(int32_t)c.rgbGreen + ((eg * coeff)/16)));
					c.rgbBlue = (uint8_t)min(255L,max(0L,(int32_t)c.rgbBlue + ((eb * coeff)/16)));
					SetPixelColor(x+i,y+1,c);
				}
			}
		}
	}

	Transfer(tmp);
	return true;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Converts the image to B&W using the desired method :
 * - 0 = Floyd-Steinberg
 * - 1 = Ordered-Dithering (4x4) 
 * - 2 = Burkes
 * - 3 = Stucki
 * - 4 = Jarvis-Judice-Ninke
 * - 5 = Sierra
 * - 6 = Stevenson-Arce
 * - 7 = Bayer (4x4 ordered dithering) 
 * - 8 = Bayer (8x8 ordered dithering) 
 * - 9 = Bayer (16x16 ordered dithering) 
 */
bool CxImage::Dither(int32_t method)
{
	if (!pDib) return false;
	if (head.biBitCount == 1) return true;
	
	GrayScale();

	CxImage tmp;
	tmp.CopyInfo(*this);
	tmp.Create(head.biWidth, head.biHeight, 1, info.dwType);
	if (!tmp.IsValid()){
		strcpy(info.szLastError,tmp.GetLastError());
		return false;
	}

#if CXIMAGE_SUPPORT_SELECTION
	tmp.SelectionCopy(*this);
#endif //CXIMAGE_SUPPORT_SELECTION

#if CXIMAGE_SUPPORT_ALPHA
	tmp.AlphaCopy(*this);
#endif //CXIMAGE_SUPPORT_ALPHA

	switch (method){
	case 1:
	{
		// Multi-Level Ordered-Dithering by Kenny Hoff (Oct. 12, 1995)
		#define dth_NumRows 4
		#define dth_NumCols 4
		#define dth_NumIntensityLevels 2
		#define dth_NumRowsLessOne (dth_NumRows-1)
		#define dth_NumColsLessOne (dth_NumCols-1)
		#define dth_RowsXCols (dth_NumRows*dth_NumCols)
		#define dth_MaxIntensityVal 255
		#define dth_MaxDitherIntensityVal (dth_NumRows*dth_NumCols*(dth_NumIntensityLevels-1))

		int32_t DitherMatrix[dth_NumRows][dth_NumCols] = {{0,8,2,10}, {12,4,14,6}, {3,11,1,9}, {15,7,13,5} };
		
		uint8_t Intensity[dth_NumIntensityLevels] = { 0,1 };                       // 2 LEVELS B/W
		//uint8_t Intensity[NumIntensityLevels] = { 0,255 };                       // 2 LEVELS
		//uint8_t Intensity[NumIntensityLevels] = { 0,127,255 };                   // 3 LEVELS
		//uint8_t Intensity[NumIntensityLevels] = { 0,85,170,255 };                // 4 LEVELS
		//uint8_t Intensity[NumIntensityLevels] = { 0,63,127,191,255 };            // 5 LEVELS
		//uint8_t Intensity[NumIntensityLevels] = { 0,51,102,153,204,255 };        // 6 LEVELS
		//uint8_t Intensity[NumIntensityLevels] = { 0,42,85,127,170,213,255 };     // 7 LEVELS
		//uint8_t Intensity[NumIntensityLevels] = { 0,36,73,109,145,182,219,255 }; // 8 LEVELS
		int32_t DitherIntensity, DitherMatrixIntensity, Offset, DeviceIntensity;
		uint8_t DitherValue;
  
		for (int32_t y=0;y<head.biHeight;y++){
			info.nProgress = (int32_t)(100*y/head.biHeight);
			if (info.nEscape) break;
			for (int32_t x=0;x<head.biWidth;x++){

				DeviceIntensity = BlindGetPixelIndex(x,y);
				DitherIntensity = DeviceIntensity*dth_MaxDitherIntensityVal/dth_MaxIntensityVal;
				DitherMatrixIntensity = DitherIntensity % dth_RowsXCols;
				Offset = DitherIntensity / dth_RowsXCols;
				if (DitherMatrix[y&dth_NumRowsLessOne][x&dth_NumColsLessOne] < DitherMatrixIntensity)
					DitherValue = Intensity[1+Offset];
				else
					DitherValue = Intensity[0+Offset];

				tmp.BlindSetPixelIndex(x,y,DitherValue);
			}
		}
		break;
	}
	case 2:
	{
		//Burkes error diffusion (Thanks to Franco Gerevini)
		int32_t TotalCoeffSum = 32;
		int32_t error, nlevel, coeff=1;
		uint8_t level;

		for (int32_t y = 0; y < head.biHeight; y++) {
			info.nProgress = (int32_t)(100 * y / head.biHeight);
			if (info.nEscape) 
				break;
			for (int32_t x = 0; x < head.biWidth; x++) {
				level = BlindGetPixelIndex(x, y);
				if (level > 128) {
					tmp.SetPixelIndex(x, y, 1);
					error = level - 255;
				} else {
					tmp.SetPixelIndex(x, y, 0);
					error = level;
				}

				nlevel = GetPixelIndex(x + 1, y) + (error * 8) / TotalCoeffSum;
				level = (uint8_t)min(255, max(0, (int32_t)nlevel));
				SetPixelIndex(x + 1, y, level);
				nlevel = GetPixelIndex(x + 2, y) + (error * 4) / TotalCoeffSum;
				level = (uint8_t)min(255, max(0, (int32_t)nlevel));
				SetPixelIndex(x + 2, y, level);
				int32_t i;
				for (i = -2; i < 3; i++) {
					switch (i) {
					case -2:
						coeff = 2;
						break;
					case -1:
						coeff = 4;
						break;
					case 0:
						coeff = 8; 
						break;
					case 1:
						coeff = 4; 
						break;
					case 2:
						coeff = 2; 
						break;
					}
					nlevel = GetPixelIndex(x + i, y + 1) + (error * coeff) / TotalCoeffSum;
					level = (uint8_t)min(255, max(0, (int32_t)nlevel));
					SetPixelIndex(x + i, y + 1, level);
				}
			}
		}
		break;
	}
	case 3:
	{
		//Stucki error diffusion (Thanks to Franco Gerevini)
		int32_t TotalCoeffSum = 42;
		int32_t error, nlevel, coeff=1;
		uint8_t level;

		for (int32_t y = 0; y < head.biHeight; y++) {
			info.nProgress = (int32_t)(100 * y / head.biHeight);
			if (info.nEscape) 
				break;
			for (int32_t x = 0; x < head.biWidth; x++) {
				level = BlindGetPixelIndex(x, y);
				if (level > 128) {
					tmp.SetPixelIndex(x, y, 1);
					error = level - 255;
				} else {
					tmp.SetPixelIndex(x, y, 0);
					error = level;
				}

				nlevel = GetPixelIndex(x + 1, y) + (error * 8) / TotalCoeffSum;
				level = (uint8_t)min(255, max(0, (int32_t)nlevel));
				SetPixelIndex(x + 1, y, level);
				nlevel = GetPixelIndex(x + 2, y) + (error * 4) / TotalCoeffSum;
				level = (uint8_t)min(255, max(0, (int32_t)nlevel));
				SetPixelIndex(x + 2, y, level);
				int32_t i;
				for (i = -2; i < 3; i++) {
					switch (i) {
					case -2:
						coeff = 2;
						break;
					case -1:
						coeff = 4;
						break;
					case 0:
						coeff = 8; 
						break;
					case 1:
						coeff = 4; 
						break;
					case 2:
						coeff = 2; 
						break;
					}
					nlevel = GetPixelIndex(x + i, y + 1) + (error * coeff) / TotalCoeffSum;
					level = (uint8_t)min(255, max(0, (int32_t)nlevel));
					SetPixelIndex(x + i, y + 1, level);
				}
				for (i = -2; i < 3; i++) {
					switch (i) {
					case -2:
						coeff = 1;
						break;
					case -1:
						coeff = 2;
						break;
					case 0:
						coeff = 4; 
						break;
					case 1:
						coeff = 2; 
						break;
					case 2:
						coeff = 1; 
						break;
					}
					nlevel = GetPixelIndex(x + i, y + 2) + (error * coeff) / TotalCoeffSum;
					level = (uint8_t)min(255, max(0, (int32_t)nlevel));
					SetPixelIndex(x + i, y + 2, level);
				}
			}
		}
		break;
	}
	case 4:
	{
		//Jarvis, Judice and Ninke error diffusion (Thanks to Franco Gerevini)
		int32_t TotalCoeffSum = 48;
		int32_t error, nlevel, coeff=1;
		uint8_t level;

		for (int32_t y = 0; y < head.biHeight; y++) {
			info.nProgress = (int32_t)(100 * y / head.biHeight);
			if (info.nEscape) 
				break;
			for (int32_t x = 0; x < head.biWidth; x++) {
				level = BlindGetPixelIndex(x, y);
				if (level > 128) {
					tmp.SetPixelIndex(x, y, 1);
					error = level - 255;
				} else {
					tmp.SetPixelIndex(x, y, 0);
					error = level;
				}

				nlevel = GetPixelIndex(x + 1, y) + (error * 7) / TotalCoeffSum;
				level = (uint8_t)min(255, max(0, (int32_t)nlevel));
				SetPixelIndex(x + 1, y, level);
				nlevel = GetPixelIndex(x + 2, y) + (error * 5) / TotalCoeffSum;
				level = (uint8_t)min(255, max(0, (int32_t)nlevel));
				SetPixelIndex(x + 2, y, level);
				int32_t i;
				for (i = -2; i < 3; i++) {
					switch (i) {
					case -2:
						coeff = 3;
						break;
					case -1:
						coeff = 5;
						break;
					case 0:
						coeff = 7; 
						break;
					case 1:
						coeff = 5; 
						break;
					case 2:
						coeff = 3; 
						break;
					}
					nlevel = GetPixelIndex(x + i, y + 1) + (error * coeff) / TotalCoeffSum;
					level = (uint8_t)min(255, max(0, (int32_t)nlevel));
					SetPixelIndex(x + i, y + 1, level);
				}
				for (i = -2; i < 3; i++) {
					switch (i) {
					case -2:
						coeff = 1;
						break;
					case -1:
						coeff = 3;
						break;
					case 0:
						coeff = 5; 
						break;
					case 1:
						coeff = 3; 
						break;
					case 2:
						coeff = 1; 
						break;
					}
					nlevel = GetPixelIndex(x + i, y + 2) + (error * coeff) / TotalCoeffSum;
					level = (uint8_t)min(255, max(0, (int32_t)nlevel));
					SetPixelIndex(x + i, y + 2, level);
				}
			}
		}
		break;
	}
	case 5:
	{
		//Sierra error diffusion (Thanks to Franco Gerevini)
		int32_t TotalCoeffSum = 32;
		int32_t error, nlevel, coeff=1;
		uint8_t level;

		for (int32_t y = 0; y < head.biHeight; y++) {
			info.nProgress = (int32_t)(100 * y / head.biHeight);
			if (info.nEscape) 
				break;
			for (int32_t x = 0; x < head.biWidth; x++) {
				level = BlindGetPixelIndex(x, y);
				if (level > 128) {
					tmp.SetPixelIndex(x, y, 1);
					error = level - 255;
				} else {
					tmp.SetPixelIndex(x, y, 0);
					error = level;
				}

				nlevel = GetPixelIndex(x + 1, y) + (error * 5) / TotalCoeffSum;
				level = (uint8_t)min(255, max(0, (int32_t)nlevel));
				SetPixelIndex(x + 1, y, level);
				nlevel = GetPixelIndex(x + 2, y) + (error * 3) / TotalCoeffSum;
				level = (uint8_t)min(255, max(0, (int32_t)nlevel));
				SetPixelIndex(x + 2, y, level);
				int32_t i;
				for (i = -2; i < 3; i++) {
					switch (i) {
					case -2:
						coeff = 2;
						break;
					case -1:
						coeff = 4;
						break;
					case 0:
						coeff = 5; 
						break;
					case 1:
						coeff = 4; 
						break;
					case 2:
						coeff = 2; 
						break;
					}
					nlevel = GetPixelIndex(x + i, y + 1) + (error * coeff) / TotalCoeffSum;
					level = (uint8_t)min(255, max(0, (int32_t)nlevel));
					SetPixelIndex(x + i, y + 1, level);
				}
				for (i = -1; i < 2; i++) {
					switch (i) {
					case -1:
						coeff = 2;
						break;
					case 0:
						coeff = 3; 
						break;
					case 1:
						coeff = 2; 
						break;
					}
					nlevel = GetPixelIndex(x + i, y + 2) + (error * coeff) / TotalCoeffSum;
					level = (uint8_t)min(255, max(0, (int32_t)nlevel));
					SetPixelIndex(x + i, y + 2, level);
				}
			}
		}
		break;
	}
	case 6:
	{
		//Stevenson and Arce error diffusion (Thanks to Franco Gerevini)
		int32_t TotalCoeffSum = 200;
		int32_t error, nlevel;
		uint8_t level;

		for (int32_t y = 0; y < head.biHeight; y++) {
			info.nProgress = (int32_t)(100 * y / head.biHeight);
			if (info.nEscape) 
				break;
			for (int32_t x = 0; x < head.biWidth; x++) {
				level = BlindGetPixelIndex(x, y);
				if (level > 128) {
					tmp.SetPixelIndex(x, y, 1);
					error = level - 255;
				} else {
					tmp.SetPixelIndex(x, y, 0);
					error = level;
				}

				int32_t tmp_index_x = x + 2;
				int32_t tmp_index_y = y;
				int32_t tmp_coeff = 32;
				nlevel = GetPixelIndex(tmp_index_x, tmp_index_y) + (error * tmp_coeff) / TotalCoeffSum;
				level = (uint8_t)min(255, max(0, (int32_t)nlevel));
				SetPixelIndex(tmp_index_x, tmp_index_y, level);

				tmp_index_x = x - 3;
				tmp_index_y = y + 1;
				tmp_coeff = 12;
				nlevel = GetPixelIndex(tmp_index_x, tmp_index_y) + (error * tmp_coeff) / TotalCoeffSum;
				level = (uint8_t)min(255, max(0, (int32_t)nlevel));
				SetPixelIndex(tmp_index_x, tmp_index_y, level);

				tmp_index_x = x - 1;
				tmp_coeff = 26;
				nlevel = GetPixelIndex(tmp_index_x, tmp_index_y) + (error * tmp_coeff) / TotalCoeffSum;
				level = (uint8_t)min(255, max(0, (int32_t)nlevel));
				SetPixelIndex(tmp_index_x, tmp_index_y, level);

				tmp_index_x = x + 1;
				tmp_coeff = 30;
				nlevel = GetPixelIndex(tmp_index_x, tmp_index_y) + (error * tmp_coeff) / TotalCoeffSum;
				level = (uint8_t)min(255, max(0, (int32_t)nlevel));
				SetPixelIndex(tmp_index_x, tmp_index_y, level);

				tmp_index_x = x + 3;
				tmp_coeff = 16;
				nlevel = GetPixelIndex(tmp_index_x, tmp_index_y) + (error * tmp_coeff) / TotalCoeffSum;
				level = (uint8_t)min(255, max(0, (int32_t)nlevel));
				SetPixelIndex(tmp_index_x, tmp_index_y, level);

				tmp_index_x = x - 2;
				tmp_index_y = y + 2;
				tmp_coeff = 12;
				nlevel = GetPixelIndex(tmp_index_x, tmp_index_y) + (error * tmp_coeff) / TotalCoeffSum;
				level = (uint8_t)min(255, max(0, (int32_t)nlevel));
				SetPixelIndex(tmp_index_x, tmp_index_y, level);

				tmp_index_x = x;
				tmp_coeff = 26;
				nlevel = GetPixelIndex(tmp_index_x, tmp_index_y) + (error * tmp_coeff) / TotalCoeffSum;
				level = (uint8_t)min(255, max(0, (int32_t)nlevel));
				SetPixelIndex(tmp_index_x, tmp_index_y, level);

				tmp_index_x = x + 2;
				tmp_coeff = 12;
				nlevel = GetPixelIndex(tmp_index_x, tmp_index_y) + (error * tmp_coeff) / TotalCoeffSum;
				level = (uint8_t)min(255, max(0, (int32_t)nlevel));
				SetPixelIndex(tmp_index_x, tmp_index_y, level);

				tmp_index_x = x - 3;
				tmp_index_y = y + 3;
				tmp_coeff = 5;
				nlevel = GetPixelIndex(tmp_index_x, tmp_index_y) + (error * tmp_coeff) / TotalCoeffSum;
				level = (uint8_t)min(255, max(0, (int32_t)nlevel));
				SetPixelIndex(tmp_index_x, tmp_index_y, level);

				tmp_index_x = x - 1;
				tmp_coeff = 12;
				nlevel = GetPixelIndex(tmp_index_x, tmp_index_y) + (error * tmp_coeff) / TotalCoeffSum;
				level = (uint8_t)min(255, max(0, (int32_t)nlevel));
				SetPixelIndex(tmp_index_x, tmp_index_y, level);

				tmp_index_x = x + 1;
				tmp_coeff = 12;
				nlevel = GetPixelIndex(tmp_index_x, tmp_index_y) + (error * tmp_coeff) / TotalCoeffSum;
				level = (uint8_t)min(255, max(0, (int32_t)nlevel));
				SetPixelIndex(tmp_index_x, tmp_index_y, level);

				tmp_index_x = x + 3;
				tmp_coeff = 5;
				nlevel = GetPixelIndex(tmp_index_x, tmp_index_y) + (error * tmp_coeff) / TotalCoeffSum;
				level = (uint8_t)min(255, max(0, (int32_t)nlevel));
				SetPixelIndex(tmp_index_x, tmp_index_y, level);
			}
		}
		break;
	}
	case 7:
	{
		// Bayer ordered dither
		int32_t order = 4;
		//create Bayer matrix
		if (order>4) order = 4;
		int32_t size = (1 << (2*order));
		uint8_t* Bmatrix = (uint8_t*) malloc(size * sizeof(uint8_t));
		for(int32_t i = 0; i < size; i++) {
			int32_t n = order;
			int32_t x = i / n;
			int32_t y = i % n;
			int32_t dither = 0;
			while (n-- > 0){
				dither = (((dither<<1)|((x&1) ^ (y&1)))<<1) | (y&1);
				x >>= 1;
				y >>= 1;
			}
			Bmatrix[i] = (uint8_t)(dither);
		}

		int32_t scale = max(0,(8-2*order));
		int32_t level;
		for (int32_t y=0;y<head.biHeight;y++){
			info.nProgress = (int32_t)(100*y/head.biHeight);
			if (info.nEscape) break;
			for (int32_t x=0;x<head.biWidth;x++){
				level = BlindGetPixelIndex(x,y) >> scale;
				if(level > Bmatrix[ (x % order) + order * (y % order) ]){
					tmp.SetPixelIndex(x,y,1);
				} else {
					tmp.SetPixelIndex(x,y,0);
				}
			}
		}

		free(Bmatrix);

		break;
	}
	case 8:
	{
		// 8x8 Bayer ordered dither
		int32_t const pattern8x8[8][8] = {
			{ 0, 32,  8, 40,  2, 34, 10, 42},   /* 8x8 Bayer ordered dithering  */
			{48, 16, 56, 24, 50, 18, 58, 26},   /* pattern.  Each input pixel   */
			{12, 44,  4, 36, 14, 46,  6, 38},   /* is scaled to the 0..63 range */
			{60, 28, 52, 20, 62, 30, 54, 22},   /* before looking in this table */
			{ 3, 35, 11, 43,  1, 33,  9, 41},   /* to determine the action.     */
			{51, 19, 59, 27, 49, 17, 57, 25},
			{15, 47,  7, 39, 13, 45,  5, 37},
			{63, 31, 55, 23, 61, 29, 53, 21} };

		for (int32_t y=0;y<head.biHeight;y++){
			info.nProgress = (int32_t)(100*y/head.biHeight);
			if (info.nEscape) break;
			for (int32_t x=0;x<head.biWidth;x++){
				int32_t level = BlindGetPixelIndex(x,y) >> 2;
				if(level && level >= pattern8x8[x & 7][y & 7]){
					tmp.SetPixelIndex(x,y,1);
				} else {
					tmp.SetPixelIndex(x,y,0);
				}
			}
		}
		break;
	}
	case 9:
	{
		// 16x16 Bayer ordered dither
		int32_t const pattern16x16[16][16] = {
			{   1,235, 59,219, 15,231, 55,215,  2,232, 56,216, 12,228, 52,212},
			{ 129, 65,187,123,143, 79,183,119,130, 66,184,120,140, 76,180,116},
			{  33,193, 17,251, 47,207, 31,247, 34,194, 18,248, 44,204, 28,244},
			{ 161, 97,145, 81,175,111,159, 95,162, 98,146, 82,172,108,156, 92},
			{   9,225, 49,209,  5,239, 63,223, 10,226, 50,210,  6,236, 60,220},
			{ 137, 73,177,113,133, 69,191,127,138, 74,178,114,134, 70,188,124},
			{  41,201, 25,241, 37,197, 21,255, 42,202, 26,242, 38,198, 22,252},
			{ 169,105,153, 89,165,101,149, 85,170,106,154, 90,166,102,150, 86},
			{   3,233, 57,217, 13,229, 53,213,  0,234, 58,218, 14,230, 54,214},
			{ 131, 67,185,121,141, 77,181,117,128, 64,186,122,142, 78,182,118},
			{  35,195, 19,249, 45,205, 29,245, 32,192, 16,250, 46,206, 30,246},
			{ 163, 99,147, 83,173,109,157, 93,160, 96,144, 80,174,110,158, 94},
			{  11,227, 51,211,  7,237, 61,221,  8,224, 48,208,  4,238, 62,222},
			{ 139, 75,179,115,135, 71,189,125,136, 72,176,112,132, 68,190,126},
			{  43,203, 27,243, 39,199, 23,253, 40,200, 24,240, 36,196, 20,254},
			{ 171,107,155, 91,167,103,151, 87,168,104,152, 88,164,100,148, 84} 
		};

		for (int32_t y=0;y<head.biHeight;y++){
			info.nProgress = (int32_t)(100*y/head.biHeight);
			if (info.nEscape) break;
			for (int32_t x=0;x<head.biWidth;x++){
				if (BlindGetPixelIndex(x,y) > pattern16x16[x & 15][y & 15]){
					tmp.SetPixelIndex(x,y,1);
				} else {
					tmp.SetPixelIndex(x,y,0);
				}
			}
		}
		break;
	}
	default:
	{
		// Floyd-Steinberg error diffusion (Thanks to Steve McMahon)
		int32_t error,nlevel,coeff=1;
		uint8_t level;

		for (int32_t y=0;y<head.biHeight;y++){
			info.nProgress = (int32_t)(100*y/head.biHeight);
			if (info.nEscape) break;
			for (int32_t x=0;x<head.biWidth;x++){

				level = BlindGetPixelIndex(x,y);
				if (level > 128){
					tmp.SetPixelIndex(x,y,1);
					error = level-255;
				} else {
					tmp.SetPixelIndex(x,y,0);
					error = level;
				}

				nlevel = GetPixelIndex(x+1,y) + (error * 7)/16;
				level = (uint8_t)min(255,max(0,(int32_t)nlevel));
				SetPixelIndex(x+1,y,level);
				for(int32_t i=-1; i<2; i++){
					switch(i){
					case -1:
						coeff=3; break;
					case 0:
						coeff=5; break;
					case 1:
						coeff=1; break;
					}
					nlevel = GetPixelIndex(x+i,y+1) + (error * coeff)/16;
					level = (uint8_t)min(255,max(0,(int32_t)nlevel));
					SetPixelIndex(x+i,y+1,level);
				}
			}
		}
	}
	}

	tmp.SetPaletteColor(0,0,0,0);
	tmp.SetPaletteColor(1,255,255,255);
	Transfer(tmp);

	return true;
}
////////////////////////////////////////////////////////////////////////////////
/**
 *	CropRotatedRectangle
 * \param topx,topy : topmost and leftmost point of the rectangle 
          (topmost, and if there are 2 topmost points, the left one)
 * \param  width     : size of the right hand side of rect, from (topx,topy) roundwalking clockwise
 * \param  height    : size of the left hand side of rect, from (topx,topy) roundwalking clockwise
 * \param  angle     : angle of the right hand side of rect, from (topx,topy)
 * \param  iDst      : pointer to destination image (if 0, this image is modified)
 * \author  [VATI]
 */
bool CxImage::CropRotatedRectangle( int32_t topx, int32_t topy, int32_t width, int32_t height, float angle, CxImage* iDst)
{
	if (!pDib) return false;

	
	int32_t startx,starty,endx,endy;
	double cos_angle = cos(angle/*/57.295779513082320877*/);
    double sin_angle = sin(angle/*/57.295779513082320877*/);

	// if there is nothing special, call the original Crop():
	if ( fabs(angle)<0.0002 )
		return Crop( topx, topy, topx+width, topy+height, iDst);

	startx = min(topx, topx - (int32_t)(sin_angle*(double)height));
	endx   = topx + (int32_t)(cos_angle*(double)width);
	endy   = topy + (int32_t)(cos_angle*(double)height + sin_angle*(double)width);
	// check: corners of the rectangle must be inside
	if ( IsInside( startx, topy )==false ||
		 IsInside( endx, endy ) == false )
		 return false;

	// first crop to bounding rectangle
	CxImage tmp(*this, true, false, true);
	// tmp.Copy(*this, true, false, true);
	if (!tmp.IsValid()){
		strcpy(info.szLastError,tmp.GetLastError());
		return false;
	}
    if (!tmp.Crop( startx, topy, endx, endy)){
		strcpy(info.szLastError,tmp.GetLastError());
		return false;
	}
	
	// the midpoint of the image now became the same as the midpoint of the rectangle
	// rotate new image with minus angle amount
    if ( false == tmp.Rotate( (float)(-angle*57.295779513082320877) ) ) // Rotate expects angle in degrees
		return false;

	// crop rotated image to the original selection rectangle
    endx   = (tmp.head.biWidth+width)/2;
	startx = (tmp.head.biWidth-width)/2;
	starty = (tmp.head.biHeight+height)/2;
    endy   = (tmp.head.biHeight-height)/2;
    if ( false == tmp.Crop( startx, starty, endx, endy ) )
		return false;

	if (iDst) iDst->Transfer(tmp);
	else Transfer(tmp);

	return true;
}
////////////////////////////////////////////////////////////////////////////////
bool CxImage::Crop(const RECT& rect, CxImage* iDst)
{
	return Crop(rect.left, rect.top, rect.right, rect.bottom, iDst);
}
////////////////////////////////////////////////////////////////////////////////
bool CxImage::Crop(int32_t left, int32_t top, int32_t right, int32_t bottom, CxImage* iDst)
{
	if (!pDib) return false;

	int32_t startx = max(0L,min(left,head.biWidth));
	int32_t endx = max(0L,min(right,head.biWidth));
	int32_t starty = head.biHeight - max(0L,min(top,head.biHeight));
	int32_t endy = head.biHeight - max(0L,min(bottom,head.biHeight));

	if (startx==endx || starty==endy) return false;

	if (startx>endx) {int32_t tmp=startx; startx=endx; endx=tmp;}
	if (starty>endy) {int32_t tmp=starty; starty=endy; endy=tmp;}

	CxImage tmp;
	tmp.CopyInfo(*this);
	tmp.Create(endx-startx,endy-starty,head.biBitCount,info.dwType);
	if (!tmp.IsValid()){
		strcpy(info.szLastError,tmp.GetLastError());
		return false;
	}

	tmp.SetPalette(GetPalette(),head.biClrUsed);
	tmp.info.nBkgndIndex = info.nBkgndIndex;
	tmp.info.nBkgndColor = info.nBkgndColor;

	switch (head.biBitCount) {
	case 1:
	case 4:
	{
		for(int32_t y=starty, yd=0; y<endy; y++, yd++){
			info.nProgress = (int32_t)(100*(y-starty)/(endy-starty)); //<Anatoly Ivasyuk>
			for(int32_t x=startx, xd=0; x<endx; x++, xd++){
				tmp.SetPixelIndex(xd,yd,GetPixelIndex(x,y));
			}
		}
		break;
	}
	case 8:
	case 24:
	{
		int32_t linelen = tmp.head.biWidth * tmp.head.biBitCount >> 3;
		uint8_t* pDest = tmp.info.pImage;
		uint8_t* pSrc = info.pImage + starty * info.dwEffWidth + (startx*head.biBitCount >> 3);
		for(int32_t y=starty; y<endy; y++){
			info.nProgress = (int32_t)(100*(y-starty)/(endy-starty)); //<Anatoly Ivasyuk>
			memcpy(pDest,pSrc,linelen);
			pDest+=tmp.info.dwEffWidth;
			pSrc+=info.dwEffWidth;
		}
    }
	}

#if CXIMAGE_SUPPORT_ALPHA
	if (AlphaIsValid()){ //<oboolo>
		tmp.AlphaCreate();
		if (!tmp.AlphaIsValid()) return false;
		uint8_t* pDest = tmp.pAlpha;
		uint8_t* pSrc = pAlpha + startx + starty*head.biWidth;
		for (int32_t y=starty; y<endy; y++){
			memcpy(pDest,pSrc,endx-startx);
			pDest+=tmp.head.biWidth;
			pSrc+=head.biWidth;
		}
	}
#endif //CXIMAGE_SUPPORT_ALPHA

	//select the destination
	if (iDst) iDst->Transfer(tmp);
	else Transfer(tmp);

	return true;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * \param xgain, ygain : can be from 0 to 1.
 * \param xpivot, ypivot : is the center of the transformation.
 * \param bEnableInterpolation : if true, enables bilinear interpolation.
 * \return true if everything is ok 
 */
bool CxImage::Skew(float xgain, float ygain, int32_t xpivot, int32_t ypivot, bool bEnableInterpolation)
{
	if (!pDib) return false;
	float nx,ny;

	CxImage tmp(*this);
	if (!tmp.IsValid()){
		strcpy(info.szLastError,tmp.GetLastError());
		return false;
	}

	int32_t xmin,xmax,ymin,ymax;
	if (pSelection){
		xmin = info.rSelectionBox.left; xmax = info.rSelectionBox.right;
		ymin = info.rSelectionBox.bottom; ymax = info.rSelectionBox.top;
	} else {
		xmin = ymin = 0;
		xmax = head.biWidth; ymax=head.biHeight;
	}
	for(int32_t y=ymin; y<ymax; y++){
		info.nProgress = (int32_t)(100*(y-ymin)/(ymax-ymin));
		if (info.nEscape) break;
		for(int32_t x=xmin; x<xmax; x++){
#if CXIMAGE_SUPPORT_SELECTION
			if (BlindSelectionIsInside(x,y))
#endif //CXIMAGE_SUPPORT_SELECTION
			{
				nx = x + (xgain*(y - ypivot));
				ny = y + (ygain*(x - xpivot));
#if CXIMAGE_SUPPORT_INTERPOLATION
				if (bEnableInterpolation){
					tmp.SetPixelColor(x,y,GetPixelColorInterpolated(nx, ny, CxImage::IM_BILINEAR, CxImage::OM_BACKGROUND),true);
				} else
#endif //CXIMAGE_SUPPORT_INTERPOLATION
				{
					if (head.biClrUsed==0){
						tmp.SetPixelColor(x,y,GetPixelColor((int32_t)nx,(int32_t)ny));
					} else {
						tmp.SetPixelIndex(x,y,GetPixelIndex((int32_t)nx,(int32_t)ny));
					}
#if CXIMAGE_SUPPORT_ALPHA
					tmp.AlphaSet(x,y,AlphaGet((int32_t)nx,(int32_t)ny));
#endif //CXIMAGE_SUPPORT_ALPHA
				}
			}
		}
	}
	Transfer(tmp);
	return true;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Expands the borders.
 * \param left, top, right, bottom = additional dimensions, should be greater than 0.
 * \param canvascolor = border color. canvascolor.rgbReserved will set the alpha channel (if any) in the border.
 * \param iDst = pointer to destination image (if it's 0, this image is modified)
 * \return true if everything is ok 
 * \author [Colin Urquhart]; changes [DP]
 */
bool CxImage::Expand(int32_t left, int32_t top, int32_t right, int32_t bottom, RGBQUAD canvascolor, CxImage* iDst)
{
    if (!pDib) return false;

    if ((left < 0) || (right < 0) || (bottom < 0) || (top < 0)) return false;

    int32_t newWidth = head.biWidth + left + right;
    int32_t newHeight = head.biHeight + top + bottom;

    right = left + head.biWidth - 1;
    top = bottom + head.biHeight - 1;
    
    CxImage tmp;
	tmp.CopyInfo(*this);
	if (!tmp.Create(newWidth, newHeight, head.biBitCount, info.dwType)){
		strcpy(info.szLastError,tmp.GetLastError());
		return false;
	}

    tmp.SetPalette(GetPalette(),head.biClrUsed);

    switch (head.biBitCount) {
    case 1:
    case 4:
		{
			uint8_t pixel = tmp.GetNearestIndex(canvascolor);
			for(int32_t y=0; y < newHeight; y++){
				info.nProgress = (int32_t)(100*y/newHeight);
				for(int32_t x=0; x < newWidth; x++){
					if ((y < bottom) || (y > top) || (x < left) || (x > right)) {
						tmp.SetPixelIndex(x,y, pixel);
					} else {
						tmp.SetPixelIndex(x,y,GetPixelIndex(x-left,y-bottom));
					}
				}
			}
			break;
		}
    case 8:
    case 24:
		{
			if (head.biBitCount == 8) {
				uint8_t pixel = tmp.GetNearestIndex( canvascolor);
				memset(tmp.info.pImage, pixel,  + (tmp.info.dwEffWidth * newHeight));
			} else {
				for (int32_t y = 0; y < newHeight; ++y) {
					uint8_t *pDest = tmp.info.pImage + (y * tmp.info.dwEffWidth);
					for (int32_t x = 0; x < newWidth; ++x) {
						*pDest++ = canvascolor.rgbBlue;
						*pDest++ = canvascolor.rgbGreen;
						*pDest++ = canvascolor.rgbRed;
					}
				}
			}

			uint8_t* pDest = tmp.info.pImage + (tmp.info.dwEffWidth * bottom) + (left*(head.biBitCount >> 3));
			uint8_t* pSrc = info.pImage;
			for(int32_t y=bottom; y <= top; y++){
				info.nProgress = (int32_t)(100*y/(1 + top - bottom));
				memcpy(pDest,pSrc,(head.biBitCount >> 3) * (right - left + 1));
				pDest+=tmp.info.dwEffWidth;
				pSrc+=info.dwEffWidth;
			}
		}
    }

#if CXIMAGE_SUPPORT_SELECTION
	if (SelectionIsValid()){
		if (!tmp.SelectionCreate())
			return false;
		uint8_t* pSrc = SelectionGetPointer();
		uint8_t* pDst = tmp.SelectionGetPointer(left,bottom);
		for(int32_t y=bottom; y <= top; y++){
			memcpy(pDst,pSrc, (right - left + 1));
			pSrc+=head.biWidth;
			pDst+=tmp.head.biWidth;
		}
		tmp.info.rSelectionBox.left = info.rSelectionBox.left + left;
		tmp.info.rSelectionBox.right = info.rSelectionBox.right + left;
		tmp.info.rSelectionBox.top = info.rSelectionBox.top + bottom;
		tmp.info.rSelectionBox.bottom = info.rSelectionBox.bottom + bottom;
	}
#endif //CXIMAGE_SUPPORT_SELECTION

#if CXIMAGE_SUPPORT_ALPHA
	if (AlphaIsValid()){
		if (!tmp.AlphaCreate())
			return false;
		tmp.AlphaSet(canvascolor.rgbReserved);
		uint8_t* pSrc = AlphaGetPointer();
		uint8_t* pDst = tmp.AlphaGetPointer(left,bottom);
		for(int32_t y=bottom; y <= top; y++){
			memcpy(pDst,pSrc, (right - left + 1));
			pSrc+=head.biWidth;
			pDst+=tmp.head.biWidth;
		}
	}
#endif //CXIMAGE_SUPPORT_ALPHA

    //select the destination
	if (iDst) iDst->Transfer(tmp);
    else Transfer(tmp);

    return true;
}
////////////////////////////////////////////////////////////////////////////////
bool CxImage::Expand(int32_t newx, int32_t newy, RGBQUAD canvascolor, CxImage* iDst)
{
	//thanks to <Colin Urquhart>

    if (!pDib) return false;

    if ((newx < head.biWidth) || (newy < head.biHeight)) return false;

    int32_t nAddLeft = (newx - head.biWidth) / 2;
    int32_t nAddTop = (newy - head.biHeight) / 2;

    return Expand(nAddLeft, nAddTop, newx - (head.biWidth + nAddLeft), newy - (head.biHeight + nAddTop), canvascolor, iDst);
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Resamples the image with the correct aspect ratio, and fills the borders.
 * \param newx, newy = thumbnail size.
 * \param canvascolor = border color.
 * \param iDst = pointer to destination image (if it's 0, this image is modified).
 * \return true if everything is ok.
 * \author [Colin Urquhart]
 */
bool CxImage::Thumbnail(int32_t newx, int32_t newy, RGBQUAD canvascolor, CxImage* iDst)
{
    if (!pDib) return false;

    if ((newx <= 0) || (newy <= 0)) return false;

    CxImage tmp(*this);
	if (!tmp.IsValid()){
		strcpy(info.szLastError,tmp.GetLastError());
		return false;
	}

    // determine whether we need to shrink the image
    if ((head.biWidth > newx) || (head.biHeight > newy)) {
        float fScale;
        float fAspect = (float) newx / (float) newy;
        if (fAspect * head.biHeight > head.biWidth) {
            fScale = (float) newy / head.biHeight;
        } else {
            fScale = (float) newx / head.biWidth;
        }
        tmp.Resample((int32_t) (fScale * head.biWidth), (int32_t) (fScale * head.biHeight), 0);
    }

    // expand the frame
    tmp.Expand(newx, newy, canvascolor);

    //select the destination
    if (iDst) iDst->Transfer(tmp);
    else Transfer(tmp);
    return true;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Perform circle_based transformations.
 * \param type - for different transformations
 * - 0 for normal (proturberant) FishEye
 * - 1 for reverse (concave) FishEye
 * - 2 for Swirle 
 * - 3 for Cilinder mirror
 * - 4 for bathroom
 *
 * \param rmax - effect radius. If 0, the whole image is processed
 * \param Koeff - only for swirle
 * \author Arkadiy Olovyannikov ark(at)msun(dot)ru
 */
bool CxImage::CircleTransform(int32_t type,int32_t rmax,float Koeff)
{
	if (!pDib) return false;

	int32_t nx,ny;
	double angle,radius,rnew;

	CxImage tmp(*this);
	if (!tmp.IsValid()){
		strcpy(info.szLastError,tmp.GetLastError());
		return false;
	}

	int32_t xmin,xmax,ymin,ymax,xmid,ymid;
	if (pSelection){
		xmin = info.rSelectionBox.left; xmax = info.rSelectionBox.right;
		ymin = info.rSelectionBox.bottom; ymax = info.rSelectionBox.top;
	} else {
		xmin = ymin = 0;
		xmax = head.biWidth; ymax=head.biHeight;
	}
	
	xmid = (int32_t) (tmp.GetWidth()/2);
	ymid = (int32_t) (tmp.GetHeight()/2);

	if (!rmax) rmax=(int32_t)sqrt((float)((xmid-xmin)*(xmid-xmin)+(ymid-ymin)*(ymid-ymin)));
	if (Koeff==0.0f) Koeff=1.0f;

	for(int32_t y=ymin; y<ymax; y++){
		info.nProgress = (int32_t)(100*(y-ymin)/(ymax-ymin));
		if (info.nEscape) break;
		for(int32_t x=xmin; x<xmax; x++){
#if CXIMAGE_SUPPORT_SELECTION
			if (BlindSelectionIsInside(x,y))
#endif //CXIMAGE_SUPPORT_SELECTION
			{
				nx=xmid-x;
				ny=ymid-y;
				radius=sqrt((float)(nx*nx+ny*ny));
				if (radius<rmax) {
					angle=atan2((double)ny,(double)nx);
					if (type==0)	  rnew=radius*radius/rmax;
					else if (type==1) rnew=sqrt(radius*rmax);
					else if (type==2) {rnew=radius;angle += radius / Koeff;}
					else rnew = 1; // potentially uninitialized
					if (type<3){
						nx = xmid + (int32_t)(rnew * cos(angle));
						ny = ymid - (int32_t)(rnew * sin(angle));
					}
					else if (type==3){
						nx = (int32_t)fabs((angle*xmax/6.2831852));
						ny = (int32_t)fabs((radius*ymax/rmax));
					}
					else {
						nx=x+(x%32)-16;
						ny=y;
					}
//					nx=max(xmin,min(nx,xmax));
//					ny=max(ymin,min(ny,ymax));
				}
				else { nx=-1;ny=-1;}
				if (head.biClrUsed==0){
					tmp.SetPixelColor(x,y,GetPixelColor(nx,ny));
				} else {
					tmp.SetPixelIndex(x,y,GetPixelIndex(nx,ny));
				}
#if CXIMAGE_SUPPORT_ALPHA
				tmp.AlphaSet(x,y,AlphaGet(nx,ny));
#endif //CXIMAGE_SUPPORT_ALPHA
			}
		}
	}
	Transfer(tmp);
	return true;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Faster way to almost properly shrink image. Algorithm produces results comparable with "high resoultion shrink"
 * when resulting image is much smaller (that would be 3 times or more) than original. When
 * resulting image is only slightly smaller, results are closer to nearest pixel.
 * This algorithm works by averaging, but it does not calculate fractions of pixels. It adds whole
 * source pixels to the best destionation. It is not geometrically "correct".
 * It's main advantage over "high" resulution shrink is speed, so it's useful, when speed is most
 * important (preview thumbnails, "map" view, ...).
 * Method is optimized for RGB24 images.
 * 
 * \param  newx, newy - size of destination image (must be smaller than original!)
 * \param  iDst - pointer to destination image (if it's 0, this image is modified)
 * \param  bChangeBpp - flag points to change result image bpp (if it's true, this result image bpp = 24 (useful for B/W image thumbnails))
 *
 * \return true if everything is ok
 * \author [bd], 9.2004; changes [Artiom Mirolubov], 1.2005
 */
bool CxImage::QIShrink(int32_t newx, int32_t newy, CxImage* const iDst, bool bChangeBpp)
{
	if (!pDib) return false;
	
	if (newx>head.biWidth || newy>head.biHeight) { 
		//let me repeat... this method can't enlarge image
		strcpy(info.szLastError,"QIShrink can't enlarge image");
		return false;
	}

	if (newx==head.biWidth && newy==head.biHeight) {
		//image already correct size (just copy and return)
		if (iDst) iDst->Copy(*this);
		return true;
	}//if
	
	//create temporary destination image
	CxImage newImage;
	newImage.CopyInfo(*this);
	newImage.Create(newx,newy,(bChangeBpp)?24:head.biBitCount,GetType());
	newImage.SetPalette(GetPalette());
	if (!newImage.IsValid()){
		strcpy(info.szLastError,newImage.GetLastError());
		return false;
	}

	//and alpha channel if required
#if CXIMAGE_SUPPORT_ALPHA
	if (AlphaIsValid()) newImage.AlphaCreate();
#endif

    const int32_t oldx = head.biWidth;
    const int32_t oldy = head.biHeight;

    int32_t accuCellSize = 4;
#if CXIMAGE_SUPPORT_ALPHA
	uint8_t *alphaPtr;
	if (AlphaIsValid()) accuCellSize=5;
#endif

    uint32_t *accu = new uint32_t[newx*accuCellSize];      //array for suming pixels... one pixel for every destination column
    uint32_t *accuPtr;                              //pointer for walking through accu
    //each cell consists of blue, red, green component and count of pixels summed in this cell
    memset(accu, 0, newx * accuCellSize * sizeof(uint32_t));  //clear accu

    if (!IsIndexed()) {
		//RGB24 version with pointers
		uint8_t *destPtr, *srcPtr, *destPtrS, *srcPtrS;        //destination and source pixel, and beginnings of current row
		srcPtrS=(uint8_t*)BlindGetPixelPointer(0,0);
		destPtrS=(uint8_t*)newImage.BlindGetPixelPointer(0,0);
		int32_t ex=0, ey=0;                                               //ex and ey replace division... 
		int32_t dy=0;
		//(we just add pixels, until by adding newx or newy we get a number greater than old size... then
		// it's time to move to next pixel)
        
		for(int32_t y=0; y<oldy; y++){                                    //for all source rows
			info.nProgress = (int32_t)(100*y/oldy); if (info.nEscape) break;
			ey += newy;                                                   
			ex = 0;                                                       //restart with ex = 0
			accuPtr=accu;                                                 //restart from beginning of accu
			srcPtr=srcPtrS;                                               //and from new source line
#if CXIMAGE_SUPPORT_ALPHA
			alphaPtr = AlphaGetPointer(0, y);
#endif

			for(int32_t x=0; x<oldx; x++){                                    //for all source columns
				ex += newx;
				*accuPtr     += *(srcPtr++);                                  //add current pixel to current accu slot
				*(accuPtr+1) += *(srcPtr++);
				*(accuPtr+2) += *(srcPtr++);
				(*(accuPtr+3)) ++;
#if CXIMAGE_SUPPORT_ALPHA
				if (alphaPtr) *(accuPtr+4) += *(alphaPtr++);
#endif
				if (ex>oldx) {                                                //when we reach oldx, it's time to move to new slot
					accuPtr += accuCellSize;
					ex -= oldx;                                                   //(substract oldx from ex and resume from there on)
				}//if (ex overflow)
			}//for x

			if (ey>=oldy) {                                                 //now when this happens
				ey -= oldy;                                                     //it's time to move to new destination row
				destPtr = destPtrS;                                             //reset pointers to proper initial values
				accuPtr = accu;
#if CXIMAGE_SUPPORT_ALPHA
				alphaPtr = newImage.AlphaGetPointer(0, dy++);
#endif
				for (int32_t k=0; k<newx; k++) {                                    //copy accu to destination row (divided by number of pixels in each slot)
					*(destPtr++) = (uint8_t)(*(accuPtr) / *(accuPtr+3));
					*(destPtr++) = (uint8_t)(*(accuPtr+1) / *(accuPtr+3));
					*(destPtr++) = (uint8_t)(*(accuPtr+2) / *(accuPtr+3));
#if CXIMAGE_SUPPORT_ALPHA
					if (alphaPtr) *(alphaPtr++) = (uint8_t)(*(accuPtr+4) / *(accuPtr+3));
#endif
					accuPtr += accuCellSize;
				}//for k
				memset(accu, 0, newx * accuCellSize * sizeof(uint32_t));                   //clear accu
				destPtrS += newImage.info.dwEffWidth;
			}//if (ey overflow)

			srcPtrS += info.dwEffWidth;                                     //next round we start from new source row
		}//for y
    } else {
		//standard version with GetPixelColor...
		int32_t ex=0, ey=0;                                               //ex and ey replace division... 
		int32_t dy=0;
		//(we just add pixels, until by adding newx or newy we get a number greater than old size... then
		// it's time to move to next pixel)
		RGBQUAD rgb;
        
		for(int32_t y=0; y<oldy; y++){                                    //for all source rows
			info.nProgress = (int32_t)(100*y/oldy); if (info.nEscape) break;
			ey += newy;                                                   
			ex = 0;                                                       //restart with ex = 0
			accuPtr=accu;                                                 //restart from beginning of accu
			for(int32_t x=0; x<oldx; x++){                                    //for all source columns
				ex += newx;
				rgb = GetPixelColor(x, y, true);
				*accuPtr     += rgb.rgbBlue;                                  //add current pixel to current accu slot
				*(accuPtr+1) += rgb.rgbRed;
				*(accuPtr+2) += rgb.rgbGreen;
				(*(accuPtr+3)) ++;
#if CXIMAGE_SUPPORT_ALPHA
				if (pAlpha) *(accuPtr+4) += rgb.rgbReserved;
#endif
				if (ex>oldx) {                                                //when we reach oldx, it's time to move to new slot
					accuPtr += accuCellSize;
					ex -= oldx;                                                   //(substract oldx from ex and resume from there on)
				}//if (ex overflow)
			}//for x

			if (ey>=oldy) {                                                 //now when this happens
				ey -= oldy;                                                     //it's time to move to new destination row
				accuPtr = accu;
				for (int32_t dx=0; dx<newx; dx++) {                                 //copy accu to destination row (divided by number of pixels in each slot)
					rgb.rgbBlue = (uint8_t)(*(accuPtr) / *(accuPtr+3));
					rgb.rgbRed  = (uint8_t)(*(accuPtr+1) / *(accuPtr+3));
					rgb.rgbGreen= (uint8_t)(*(accuPtr+2) / *(accuPtr+3));
#if CXIMAGE_SUPPORT_ALPHA
					if (pAlpha) rgb.rgbReserved = (uint8_t)(*(accuPtr+4) / *(accuPtr+3));
#endif
					newImage.SetPixelColor(dx, dy, rgb, pAlpha!=0);
					accuPtr += accuCellSize;
				}//for dx
				memset(accu, 0, newx * accuCellSize * sizeof(uint32_t));                   //clear accu
				dy++;
			}//if (ey overflow)
		}//for y
    }//if

    delete [] accu;                                                 //delete helper array
	
	//copy new image to the destination
	if (iDst) 
		iDst->Transfer(newImage);
	else 
		Transfer(newImage);
    return true;

}

////////////////////////////////////////////////////////////////////////////////
#endif //CXIMAGE_SUPPORT_TRANSFORMATION
