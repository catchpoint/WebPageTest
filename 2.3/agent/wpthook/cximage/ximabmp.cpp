/*
 * File:	ximabmp.cpp
 * Purpose:	Platform Independent BMP Image Class Loader and Writer
 * 07/Aug/2001 Davide Pizzolato - www.xdp.it
 * CxImage version 7.0.1 07/Jan/2011
 */

#include "ximabmp.h"

#if CXIMAGE_SUPPORT_BMP

#include "ximaiter.h" 

////////////////////////////////////////////////////////////////////////////////
#if CXIMAGE_SUPPORT_ENCODE
////////////////////////////////////////////////////////////////////////////////
bool CxImageBMP::Encode(CxFile * hFile)
{

	if (EncodeSafeCheck(hFile)) return false;

	BITMAPFILEHEADER	hdr;

	hdr.bfType = 0x4d42;   // 'BM' WINDOWS_BITMAP_SIGNATURE
	hdr.bfSize = GetSize() + 14 /*sizeof(BITMAPFILEHEADER)*/;
	hdr.bfReserved1 = hdr.bfReserved2 = 0;
	hdr.bfOffBits = 14 /*sizeof(BITMAPFILEHEADER)*/ + head.biSize + GetPaletteSize();

	hdr.bfType = m_ntohs(hdr.bfType); 
	hdr.bfSize = m_ntohl(hdr.bfSize); 
	hdr.bfOffBits = m_ntohl(hdr.bfOffBits); 

#if CXIMAGE_SUPPORT_ALPHA
	if (GetNumColors()==0 && AlphaIsValid()){
	
		BITMAPINFOHEADER  infohdr;
		memcpy(&infohdr,&head,sizeof(BITMAPINFOHEADER));
		infohdr.biCompression = BI_RGB;
		infohdr.biBitCount = 32;
		uint32_t dwEffWidth = ((((infohdr.biBitCount * infohdr.biWidth) + 31) / 32) * 4);
		infohdr.biSizeImage = dwEffWidth * infohdr.biHeight;

		hdr.bfSize = infohdr.biSize + infohdr.biSizeImage + 14 /*sizeof(BITMAPFILEHEADER)*/;

		hdr.bfSize = m_ntohl(hdr.bfSize);
		bihtoh(&infohdr);

		// Write the file header
		hFile->Write(&hdr,min(14,sizeof(BITMAPFILEHEADER)),1);
		hFile->Write(&infohdr,sizeof(BITMAPINFOHEADER),1);
		 //and DIB+ALPHA interlaced
		uint8_t *srcalpha = AlphaGetPointer();
		for(int32_t y = 0; y < infohdr.biHeight; ++y){
			uint8_t *srcdib = GetBits(y);
			for(int32_t x = 0; x < infohdr.biWidth; ++x){
				hFile->Write(srcdib,3,1);
				hFile->Write(srcalpha,1,1);
				srcdib += 3;
				++srcalpha;
			}
		}

	} else 
#endif //CXIMAGE_SUPPORT_ALPHA
	{
		// Write the file header
		hFile->Write(&hdr,min(14,sizeof(BITMAPFILEHEADER)),1);
		//copy attributes
		memcpy(pDib,&head,sizeof(BITMAPINFOHEADER));
		bihtoh((BITMAPINFOHEADER*)pDib);
		// Write the DIB header and the pixels
		hFile->Write(pDib,GetSize(),1);
		bihtoh((BITMAPINFOHEADER*)pDib);
	}
	return true;
}
////////////////////////////////////////////////////////////////////////////////
#endif //CXIMAGE_SUPPORT_ENCODE
////////////////////////////////////////////////////////////////////////////////
#if CXIMAGE_SUPPORT_DECODE
////////////////////////////////////////////////////////////////////////////////
bool CxImageBMP::Decode(CxFile * hFile)
{
	if (hFile == NULL) return false;

	BITMAPFILEHEADER   bf;
	uint32_t off = hFile->Tell(); //<CSC>
  cx_try {
	if (hFile->Read(&bf,min(14,sizeof(bf)),1)==0) cx_throw("Not a BMP");

	bf.bfSize = m_ntohl(bf.bfSize); 
	bf.bfOffBits = m_ntohl(bf.bfOffBits); 

    if (m_ntohs(bf.bfType) != BFT_BITMAP) { //do we have a RC HEADER?
        bf.bfOffBits = 0L;
        hFile->Seek(off,SEEK_SET);
    }

	BITMAPINFOHEADER bmpHeader;
	if (!DibReadBitmapInfo(hFile,&bmpHeader)) cx_throw("Error reading BMP info");
	uint32_t dwCompression=bmpHeader.biCompression;
	uint32_t dwBitCount=bmpHeader.biBitCount; //preserve for BI_BITFIELDS compression <Thomas Ernst>
	bool bIsOldBmp = bmpHeader.biSize == sizeof(BITMAPCOREHEADER);

	bool bTopDownDib = bmpHeader.biHeight<0; //<Flanders> check if it's a top-down bitmap
	if (bTopDownDib) bmpHeader.biHeight=-bmpHeader.biHeight;

	if (info.nEscape == -1) {
		// Return output dimensions only
		head.biWidth = bmpHeader.biWidth;
		head.biHeight = bmpHeader.biHeight;
		info.dwType = CXIMAGE_FORMAT_BMP;
		cx_throw("output dimensions returned");
	}

	if (!Create(bmpHeader.biWidth,bmpHeader.biHeight,bmpHeader.biBitCount,CXIMAGE_FORMAT_BMP))
		cx_throw("");

	SetXDPI((int32_t) floor(bmpHeader.biXPelsPerMeter * 254.0 / 10000.0 + 0.5));
	SetYDPI((int32_t) floor(bmpHeader.biYPelsPerMeter * 254.0 / 10000.0 + 0.5));

	if (info.nEscape) cx_throw("Cancelled"); // <vho> - cancel decoding

    RGBQUAD *pRgb = GetPalette();
    if (pRgb){
        if (bIsOldBmp){
             // convert a old color table (3 byte entries) to a new
             // color table (4 byte entries)
            hFile->Read((void*)pRgb,DibNumColors(&bmpHeader) * sizeof(RGBTRIPLE),1);
            for (int32_t i=DibNumColors(&head)-1; i>=0; i--){
                pRgb[i].rgbRed      = ((RGBTRIPLE *)pRgb)[i].rgbtRed;
                pRgb[i].rgbBlue     = ((RGBTRIPLE *)pRgb)[i].rgbtBlue;
                pRgb[i].rgbGreen    = ((RGBTRIPLE *)pRgb)[i].rgbtGreen;
                pRgb[i].rgbReserved = (uint8_t)0;
            }
        } else {
            hFile->Read((void*)pRgb,DibNumColors(&bmpHeader) * sizeof(RGBQUAD),1);
			//force rgbReserved=0, to avoid problems with some WinXp bitmaps
			for (uint32_t i=0; i<head.biClrUsed; i++) pRgb[i].rgbReserved=0;
        }
    }

	if (info.nEscape) cx_throw("Cancelled"); // <vho> - cancel decoding

	switch (dwBitCount) {
		case 32 :
			uint32_t bfmask[3];
			if (dwCompression == BI_BITFIELDS)
			{
				hFile->Read(bfmask, 12, 1);
			} else {
				bfmask[0]=0x00FF0000;
				bfmask[1]=0x0000FF00;
				bfmask[2]=0x000000FF;
			}
			if (bf.bfOffBits != 0L) hFile->Seek(off + bf.bfOffBits,SEEK_SET);
			if (dwCompression == BI_BITFIELDS || dwCompression == BI_RGB){
				int32_t imagesize=4*head.biHeight*head.biWidth;
				uint8_t* buff32=(uint8_t*)malloc(imagesize);
				if (buff32){
					hFile->Read(buff32, imagesize,1); // read in the pixels

#if CXIMAGE_SUPPORT_ALPHA
					if (dwCompression == BI_RGB){
						AlphaCreate();
						if (AlphaIsValid()){
							bool bAlphaOk = false;
							uint8_t* p;
							for (int32_t y=0; y<head.biHeight; y++){
								p = buff32 + 3 + head.biWidth * 4 * y;
								for (int32_t x=0; x<head.biWidth; x++){
									if (*p) bAlphaOk = true;
									AlphaSet(x,y,*p);
									p+=4;
								}
							}
							// fix if alpha pixels are all zero
							if (!bAlphaOk) AlphaInvert();
						}
					}
#endif //CXIMAGE_SUPPORT_ALPHA

					Bitfield2RGB(buff32,bfmask[0],bfmask[1],bfmask[2],32);
					free(buff32);
				} else cx_throw("can't allocate memory");
			} else cx_throw("unknown compression");
			break;
		case 24 :
			if (bf.bfOffBits != 0L) hFile->Seek(off + bf.bfOffBits,SEEK_SET);
			if (dwCompression == BI_RGB){
				hFile->Read(info.pImage, head.biSizeImage,1); // read in the pixels
			} else cx_throw("unknown compression");
			break;
		case 16 :
		{
			uint32_t bfmask[3];
			if (dwCompression == BI_BITFIELDS)
			{
				hFile->Read(bfmask, 12, 1);
			} else {
				bfmask[0]=0x7C00; bfmask[1]=0x3E0; bfmask[2]=0x1F; //RGB555
			}
			// bf.bfOffBits required after the bitfield mask <Cui Ying Jie>
			if (bf.bfOffBits != 0L) hFile->Seek(off + bf.bfOffBits,SEEK_SET);
			// read in the pixels
			hFile->Read(info.pImage, head.biHeight*((head.biWidth+1)/2)*4,1);
			// transform into RGB
			Bitfield2RGB(info.pImage,bfmask[0],bfmask[1],bfmask[2],16);
			break;
		}
		case 8 :
		case 4 :
		case 1 :
		if (bf.bfOffBits != 0L) hFile->Seek(off + bf.bfOffBits,SEEK_SET);
		switch (dwCompression) {
			case BI_RGB :
				hFile->Read(info.pImage, head.biSizeImage,1); // read in the pixels
				break;
			case BI_RLE4 :
			{
				uint8_t status_byte = 0;
				uint8_t second_byte = 0;
				int32_t scanline = 0;
				int32_t bits = 0;
				BOOL low_nibble = FALSE;
				CImageIterator iter(this);

				for (BOOL bContinue = TRUE; bContinue && hFile->Read(&status_byte, sizeof(uint8_t), 1);) {
					
					switch (status_byte) {
						case RLE_COMMAND :
							hFile->Read(&status_byte, sizeof(uint8_t), 1);
							switch (status_byte) {
								case RLE_ENDOFLINE :
									bits = 0;
									scanline++;
									low_nibble = FALSE;
									break;
								case RLE_ENDOFBITMAP :
									bContinue=FALSE;
									break;
								case RLE_DELTA :
								{
									// read the delta values
									uint8_t delta_x;
									uint8_t delta_y;
									hFile->Read(&delta_x, sizeof(uint8_t), 1);
									hFile->Read(&delta_y, sizeof(uint8_t), 1);
									// apply them
									bits       += delta_x / 2;
									scanline   += delta_y;
									break;
								}
								default :
									hFile->Read(&second_byte, sizeof(uint8_t), 1);
									uint8_t *sline = iter.GetRow(scanline);
									for (int32_t i = 0; i < status_byte; i++) {
										if ((uint8_t*)(sline+bits) < (uint8_t*)(info.pImage+head.biSizeImage)){
											if (low_nibble) {
												if (i&1)
													*(sline + bits) |= (second_byte & 0x0f);
												else
													*(sline + bits) |= (second_byte & 0xf0)>>4;
												bits++;
											} else {
												if (i&1)
													*(sline + bits) = (uint8_t)(second_byte & 0x0f)<<4;
												else
													*(sline + bits) = (uint8_t)(second_byte & 0xf0);
											}
										}

										if ((i & 1) && (i != (status_byte - 1)))
											hFile->Read(&second_byte, sizeof(uint8_t), 1);

										low_nibble = !low_nibble;
									}
									if ((((status_byte+1) >> 1) & 1 ) == 1)
										hFile->Read(&second_byte, sizeof(uint8_t), 1);												
									break;
							};
							break;
						default :
						{
							uint8_t *sline = iter.GetRow(scanline);
							hFile->Read(&second_byte, sizeof(uint8_t), 1);
							for (unsigned i = 0; i < status_byte; i++) {
								if ((uint8_t*)(sline+bits) < (uint8_t*)(info.pImage+head.biSizeImage)){
									if (low_nibble) {
										if (i&1)
											*(sline + bits) |= (second_byte & 0x0f);
										else
											*(sline + bits) |= (second_byte & 0xf0)>>4;
										bits++;
									} else {
										if (i&1)
											*(sline + bits) = (uint8_t)(second_byte & 0x0f)<<4;
										else
											*(sline + bits) = (uint8_t)(second_byte & 0xf0);
									}
								}
								low_nibble = !low_nibble;
							}
						}
						break;
					};
				}
				break;
			}
			case BI_RLE8 :
			{
				uint8_t status_byte = 0;
				uint8_t second_byte = 0;
				int32_t scanline = 0;
				int32_t bits = 0;
				CImageIterator iter(this);

				for (BOOL bContinue = TRUE; bContinue && hFile->Read(&status_byte, sizeof(uint8_t), 1);) {
					switch (status_byte) {
						case RLE_COMMAND :
							hFile->Read(&status_byte, sizeof(uint8_t), 1);
							switch (status_byte) {
								case RLE_ENDOFLINE :
									bits = 0;
									scanline++;
									break;
								case RLE_ENDOFBITMAP :
									bContinue=FALSE;
									break;
								case RLE_DELTA :
								{
									// read the delta values
									uint8_t delta_x;
									uint8_t delta_y;
									hFile->Read(&delta_x, sizeof(uint8_t), 1);
									hFile->Read(&delta_y, sizeof(uint8_t), 1);
									// apply them
									bits     += delta_x;
									scanline += delta_y;
									break;
								}
								default :
									hFile->Read((void *)(iter.GetRow(scanline) + bits), sizeof(uint8_t) * status_byte, 1);
									// align run length to even number of bytes 
									if ((status_byte & 1) == 1)
										hFile->Read(&second_byte, sizeof(uint8_t), 1);												
									bits += status_byte;													
									break;								
							};
							break;
						default :
							uint8_t *sline = iter.GetRow(scanline);
							hFile->Read(&second_byte, sizeof(uint8_t), 1);
							for (unsigned i = 0; i < status_byte; i++) {
								if ((uint8_t*)(sline+bits) < (uint8_t*)(info.pImage+head.biSizeImage)){
									*(sline + bits) = second_byte;
									bits++;					
								} else {
									break;
								}
							}
							break;
					};
				}
				break;
			}
			default :								
				cx_throw("compression type not supported");
		}
	}

	if (bTopDownDib) Flip(); //<Flanders>

  } cx_catch {
	if (strcmp(message,"")) strncpy(info.szLastError,message,255);
	if (info.nEscape == -1 && info.dwType == CXIMAGE_FORMAT_BMP) return true;
	return false;
  }
    return true;
}
////////////////////////////////////////////////////////////////////////////////
/*  ReadDibBitmapInfo()
 *
 *  Will read a file in DIB format and return a global HANDLE to its
 *  BITMAPINFO.  This function will work with both "old" and "new"
 *  bitmap formats, but will always return a "new" BITMAPINFO.
 */
bool CxImageBMP::DibReadBitmapInfo(CxFile* fh, BITMAPINFOHEADER *pdib)
{
	if ((fh==NULL)||(pdib==NULL)) return false;

    if (fh->Read(pdib,sizeof(BITMAPINFOHEADER),1)==0) return false;

	bihtoh(pdib);

    switch (pdib->biSize) // what type of bitmap info is this?
    {
        case sizeof(BITMAPINFOHEADER):
            break;

		case 64: //sizeof(OS2_BMP_HEADER):
            fh->Seek((int32_t)(64 - sizeof(BITMAPINFOHEADER)),SEEK_CUR);
			break;

        case 124: //sizeof(BITMAPV5HEADER):
			fh->Seek((long)(124-sizeof(BITMAPINFOHEADER)), SEEK_CUR);
			break;

        case sizeof(BITMAPCOREHEADER):
		{
            BITMAPCOREHEADER bc = *(BITMAPCOREHEADER*)pdib;
            pdib->biSize               = bc.bcSize;
            pdib->biWidth              = (uint32_t)bc.bcWidth;
            pdib->biHeight             = (uint32_t)bc.bcHeight;
            pdib->biPlanes             =  bc.bcPlanes;
            pdib->biBitCount           =  bc.bcBitCount;
            pdib->biCompression        = BI_RGB;
            pdib->biSizeImage          = 0;
            pdib->biXPelsPerMeter      = 0;
            pdib->biYPelsPerMeter      = 0;
            pdib->biClrUsed            = 0;
            pdib->biClrImportant       = 0;

			fh->Seek((int32_t)(sizeof(BITMAPCOREHEADER)-sizeof(BITMAPINFOHEADER)), SEEK_CUR);
		}
            break;
        default:
			//give a last chance
			 if (pdib->biSize>(sizeof(BITMAPINFOHEADER))&&
				(pdib->biSizeImage>=(uint32_t)(pdib->biHeight*((((pdib->biBitCount*pdib->biWidth)+31)/32)*4)))&&
				(pdib->biPlanes==1)&&(pdib->biClrUsed==0))
			 {
	             if (pdib->biCompression==BI_RGB)
					 fh->Seek((int32_t)(pdib->biSize - sizeof(BITMAPINFOHEADER)),SEEK_CUR);
				 break;
			 }
			return false;
    }

    FixBitmapInfo(pdib);

    return true;
}
////////////////////////////////////////////////////////////////////////////////
#endif //CXIMAGE_SUPPORT_DECODE
////////////////////////////////////////////////////////////////////////////////
#endif 	// CXIMAGE_SUPPORT_BMP
////////////////////////////////////////////////////////////////////////////////
