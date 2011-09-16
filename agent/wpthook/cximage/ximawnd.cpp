// xImaWnd.cpp : Windows functions
/* 07/08/2001 v1.00 - Davide Pizzolato - www.xdp.it
 * CxImage version 5.99c 17/Oct/2004
 */

#include "ximage.h"

#include "ximaiter.h" 

#pragma warning(disable:4244 4311)

#if CXIMAGE_SUPPORT_WINDOWS
////////////////////////////////////////////////////////////////////////////////
/**
 * Bitmap resource constructor
 * \param hbmp : bitmap resource handle
 * \param hpal : (optional) palette, useful for 8bpp DC 
 * \return true if everything is ok
 */
bool CxImage::CreateFromHBITMAP(HBITMAP hbmp, HPALETTE hpal)
{
	if (!Destroy())
		return false;

	if (hbmp) { 
        BITMAP bm;
		// get informations about the bitmap
        GetObject(hbmp, sizeof(BITMAP), (LPSTR) &bm);
		// create the image
        if (!Create(bm.bmWidth, bm.bmHeight, bm.bmBitsPixel, 0))
			return false;
		// create a device context for the bitmap
        HDC dc = ::GetDC(NULL);
		if (!dc)
			return false;

		if (hpal){
			SelectObject(dc,hpal); //the palette you should get from the user or have a stock one
			RealizePalette(dc);
		}

		// copy the pixels
        if (GetDIBits(dc, hbmp, 0, head.biHeight, info.pImage,
			(LPBITMAPINFO)pDib, DIB_RGB_COLORS) == 0){ //replace &head with pDib <Wil Stark>
            strcpy(info.szLastError,"GetDIBits failed");
			::ReleaseDC(NULL, dc);
			return false;
        }
        ::ReleaseDC(NULL, dc);
		return true;
    }
	return false;
}
////////////////////////////////////////////////////////////////////////////////
#endif //CXIMAGE_SUPPORT_WINDOWS
////////////////////////////////////////////////////////////////////////////////
