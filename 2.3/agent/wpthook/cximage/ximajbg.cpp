/*
 * File:	ximajbg.cpp
 * Purpose:	Platform Independent JBG Image Class Loader and Writer
 * 18/Aug/2002 Davide Pizzolato - www.xdp.it
 * CxImage version 7.0.1 07/Jan/2011
 */

#include "ximajbg.h"

#if CXIMAGE_SUPPORT_JBG

#include "ximaiter.h"

#define JBIG_BUFSIZE 8192

////////////////////////////////////////////////////////////////////////////////
#if CXIMAGE_SUPPORT_DECODE
////////////////////////////////////////////////////////////////////////////////
bool CxImageJBG::Decode(CxFile *hFile)
{
	if (hFile == NULL) return false;

	struct jbg_dec_state jbig_state;
	uint32_t xmax = 4294967295UL, ymax = 4294967295UL;
	uint32_t len, cnt;
	uint8_t *buffer=0,*p;
	int32_t result;

  cx_try
  {
	jbg_dec_init(&jbig_state);
	jbg_dec_maxsize(&jbig_state, xmax, ymax);

	buffer = (uint8_t*)malloc(JBIG_BUFSIZE);
	if (!buffer) cx_throw("Sorry, not enough memory available!");

	result = JBG_EAGAIN;
	do {
		len = hFile->Read(buffer, 1, JBIG_BUFSIZE);
		if (!len) break;
		cnt = 0;
		p = buffer;
		while (len > 0 && (result == JBG_EAGAIN || result == JBG_EOK)) {
			result = jbg_dec_in(&jbig_state, p, len, &cnt);
			p += cnt;
			len -= cnt;
		}
	} while (result == JBG_EAGAIN || result == JBG_EOK);

	if (hFile->Error())
		cx_throw("Problem while reading input file");
	if (result != JBG_EOK && result != JBG_EOK_INTR)
		cx_throw("Problem with input file"); 

	int32_t w, h, bpp, planes, ew;

	w = jbg_dec_getwidth(&jbig_state);
	h = jbg_dec_getheight(&jbig_state);
	planes = jbg_dec_getplanes(&jbig_state);
	bpp = (planes+7)>>3;
	ew = (w + 7)>>3;

	if (info.nEscape == -1){
		head.biWidth = w;
		head.biHeight= h;
		info.dwType = CXIMAGE_FORMAT_JBG;
		cx_throw("output dimensions returned");
	}

	switch (planes){
	case 1:
		{
			uint8_t* binary_image = jbg_dec_getimage(&jbig_state, 0);

			if (!Create(w,h,1,CXIMAGE_FORMAT_JBG))
				cx_throw("");

			SetPaletteColor(0,255,255,255);
			SetPaletteColor(1,0,0,0);

			CImageIterator iter(this);
			iter.Upset();
			for (int32_t i=0;i<h;i++){
				iter.SetRow(binary_image+i*ew,ew);
				iter.PrevRow();
			}

			break;
		}
	default:
		cx_throw("cannot decode images with more than 1 plane");
	}

	jbg_dec_free(&jbig_state);
	free(buffer);

  } cx_catch {
	jbg_dec_free(&jbig_state);
	if (buffer) free(buffer);
	if (strcmp(message,"")) strncpy(info.szLastError,message,255);
	if (info.nEscape == -1 && info.dwType == CXIMAGE_FORMAT_JBG) return true;
	return false;
  }
	return true;
}
////////////////////////////////////////////////////////////////////////////////
#endif //CXIMAGE_SUPPORT_DECODE
////////////////////////////////////////////////////////////////////////////////
bool CxImageJBG::Encode(CxFile * hFile)
{
	if (EncodeSafeCheck(hFile)) return false;

	if (head.biBitCount != 1){
		strcpy(info.szLastError,"JBG can save only 1-bpp images");
		return false;
	}

	int32_t w, h, bpp, planes, ew, i, j, x, y;

	w = head.biWidth;
	h = head.biHeight;
	planes = 1;
	bpp = (planes+7)>>3;
	ew = (w + 7)>>3;

	uint8_t mask;
	RGBQUAD *rgb = GetPalette();
	if (CompareColors(&rgb[0],&rgb[1])<0) mask=255; else mask=0;

	uint8_t *buffer = (uint8_t*)malloc(ew*h*2);
	if (!buffer) {
		strcpy(info.szLastError,"Sorry, not enough memory available!");
		return false;
	}

	for (y=0; y<h; y++){
		i= y*ew;
		j= (h-y-1)*info.dwEffWidth;
		for (x=0; x<ew; x++){
			buffer[i + x]=info.pImage[j + x]^mask;
		}
	}

	struct jbg_enc_state jbig_state;
	jbg_enc_init(&jbig_state, w, h, planes, &buffer, jbig_data_out, hFile);

    //jbg_enc_layers(&jbig_state, 2);
    //jbg_enc_lrlmax(&jbig_state, 800, 600);

	// Specify a few other options (each is ignored if negative)
	int32_t dl = -1, dh = -1, d = -1, l0 = -1, mx = -1;
	int32_t options = JBG_TPDON | JBG_TPBON | JBG_DPON;
	int32_t order = JBG_ILEAVE | JBG_SMID;
	jbg_enc_lrange(&jbig_state, dl, dh);
	jbg_enc_options(&jbig_state, order, options, l0, mx, -1);

	// now encode everything and send it to data_out()
	jbg_enc_out(&jbig_state);

	// give encoder a chance to free its temporary data structures
	jbg_enc_free(&jbig_state);

	free(buffer);

	if (hFile->Error()){
		strcpy(info.szLastError,"Problem while writing JBG file");
		return false;
	}

	return true;
}
////////////////////////////////////////////////////////////////////////////////
#endif 	// CXIMAGE_SUPPORT_JBG

