// xImaCodec.cpp : Encode Decode functions
/* 07/08/2001 v1.00 - Davide Pizzolato - www.xdp.it
 * CxImage version 7.0.1 07/Jan/2011
 */

#include "ximage.h"

#if CXIMAGE_SUPPORT_JPG
#include "ximajpg.h"
#endif

#if CXIMAGE_SUPPORT_GIF
#include "ximagif.h"
#endif

#if CXIMAGE_SUPPORT_PNG
#include "ximapng.h"
#endif

#if CXIMAGE_SUPPORT_MNG
#include "ximamng.h"
#endif

#if CXIMAGE_SUPPORT_BMP
#include "ximabmp.h"
#endif

#if CXIMAGE_SUPPORT_ICO
#include "ximaico.h"
#endif

#if CXIMAGE_SUPPORT_TIF
#include "ximatif.h"
#endif

#if CXIMAGE_SUPPORT_TGA
#include "ximatga.h"
#endif

#if CXIMAGE_SUPPORT_PCX
#include "ximapcx.h"
#endif

#if CXIMAGE_SUPPORT_WBMP
#include "ximawbmp.h"
#endif

#if CXIMAGE_SUPPORT_WMF
#include "ximawmf.h" // <vho> - WMF/EMF support
#endif

#if CXIMAGE_SUPPORT_JBG
#include "ximajbg.h"
#endif

#if CXIMAGE_SUPPORT_JASPER
#include "ximajas.h"
#endif

#if CXIMAGE_SUPPORT_SKA
#include "ximaska.h"
#endif

#if CXIMAGE_SUPPORT_RAW
#include "ximaraw.h"
#endif

#if CXIMAGE_SUPPORT_PSD
#include "ximapsd.h"
#endif

////////////////////////////////////////////////////////////////////////////////
#if CXIMAGE_SUPPORT_ENCODE
////////////////////////////////////////////////////////////////////////////////
bool CxImage::EncodeSafeCheck(CxFile *hFile)
{
	if (hFile==NULL) {
		strcpy(info.szLastError,CXIMAGE_ERR_NOFILE);
		return true;
	}

	if (pDib==NULL){
		strcpy(info.szLastError,CXIMAGE_ERR_NOIMAGE);
		return true;
	}
	return false;
}
////////////////////////////////////////////////////////////////////////////////
//#ifdef WIN32
//bool CxImage::Save(LPCWSTR filename, uint32_t imagetype)
//{
//	FILE* hFile;	//file handle to write the image
//	if ((hFile=_wfopen(filename,L"wb"))==NULL)  return false;
//	bool bOK = Encode(hFile,imagetype);
//	fclose(hFile);
//	return bOK;
//}
//#endif //WIN32
////////////////////////////////////////////////////////////////////////////////
// For UNICODE support: char -> TCHAR
/**
 * Saves to disk the image in a specific format.
 * \param filename: file name
 * \param imagetype: file format, see ENUM_CXIMAGE_FORMATS
 * \return true if everything is ok
 */
bool CxImage::Save(const TCHAR * filename, uint32_t imagetype)
{
	FILE* hFile;	//file handle to write the image

#ifdef WIN32
	if ((hFile=_tfopen(filename,_T("wb")))==NULL)  return false;	// For UNICODE support
#else
	if ((hFile=fopen(filename,"wb"))==NULL)  return false;
#endif

	bool bOK = Encode(hFile,imagetype);
	fclose(hFile);
	return bOK;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Saves to disk the image in a specific format.
 * \param hFile: file handle, open and enabled for writing.
 * \param imagetype: file format, see ENUM_CXIMAGE_FORMATS
 * \return true if everything is ok
 */
bool CxImage::Encode(FILE *hFile, uint32_t imagetype)
{
	CxIOFile file(hFile);
	return Encode(&file,imagetype);
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Saves to memory buffer the image in a specific format.
 * \param buffer: output memory buffer pointer. Must be NULL,
 * the function allocates and fill the memory,
 * the application must free the buffer, see also FreeMemory().
 * \param size: output memory buffer size.
 * \param imagetype: file format, see ENUM_CXIMAGE_FORMATS
 * \return true if everything is ok
 */
bool CxImage::Encode(uint8_t * &buffer, int32_t &size, uint32_t imagetype)
{
	if (buffer!=NULL){
		strcpy(info.szLastError,"the buffer must be empty");
		return false;
	}
	CxMemFile file;
	file.Open();
	if(Encode(&file,imagetype)){
		buffer=file.GetBuffer();
		size=file.Size();
		return true;
	}
	return false;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Saves to disk the image in a specific format.
 * \param hFile: file handle (CxMemFile or CxIOFile), with write access.
 * \param imagetype: file format, see ENUM_CXIMAGE_FORMATS
 * \return true if everything is ok
 * \sa ENUM_CXIMAGE_FORMATS
 */
bool CxImage::Encode(CxFile *hFile, uint32_t imagetype)
{

#if CXIMAGE_SUPPORT_BMP
	if (CXIMAGE_FORMAT_BMP==imagetype){
		CxImageBMP *newima = new CxImageBMP;
		if (!newima) return false;
		newima->Ghost(this);
		if (newima->Encode(hFile)){
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			delete newima;
			return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_ICO
	if (CXIMAGE_FORMAT_ICO==imagetype){
		CxImageICO *newima = new CxImageICO;
		if (!newima) return false;
		newima->Ghost(this);
		if (newima->Encode(hFile)){
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			delete newima;
			return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_TIF
	if (CXIMAGE_FORMAT_TIF==imagetype){
		CxImageTIF *newima = new CxImageTIF;
		if (!newima) return false;
		newima->Ghost(this);
		if (newima->Encode(hFile)){
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			delete newima;
			return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_JPG
	if (CXIMAGE_FORMAT_JPG==imagetype){
		CxImageJPG *newima = new CxImageJPG;
		if (!newima) return false;
		newima->Ghost(this);
		if (newima->Encode(hFile)){
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			delete newima;
			return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_GIF
	if (CXIMAGE_FORMAT_GIF==imagetype){
		CxImageGIF *newima = new CxImageGIF;
		if (!newima) return false;
		newima->Ghost(this);
		if (newima->Encode(hFile)){
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			delete newima;
			return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_PNG
	if (CXIMAGE_FORMAT_PNG==imagetype){
		CxImagePNG *newima = new CxImagePNG;
		if (!newima) return false;
		newima->Ghost(this);
		if (newima->Encode(hFile)){
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			delete newima;
			return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_MNG
	if (CXIMAGE_FORMAT_MNG==imagetype){
		CxImageMNG *newima = new CxImageMNG;
		if (!newima) return false;
		newima->Ghost(this);
		if (newima->Encode(hFile)){
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			delete newima;
			return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_TGA
	if (CXIMAGE_FORMAT_TGA==imagetype){
		CxImageTGA *newima = new CxImageTGA;
		if (!newima) return false;
		newima->Ghost(this);
		if (newima->Encode(hFile)){
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			delete newima;
			return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_PCX
	if (CXIMAGE_FORMAT_PCX==imagetype){
		CxImagePCX *newima = new CxImagePCX;
		if (!newima) return false;
		newima->Ghost(this);
		if (newima->Encode(hFile)){
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			delete newima;
			return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_WBMP
	if (CXIMAGE_FORMAT_WBMP==imagetype){
		CxImageWBMP *newima = new CxImageWBMP;
		if (!newima) return false;
		newima->Ghost(this);
		if (newima->Encode(hFile)){
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			delete newima;
			return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_WMF && CXIMAGE_SUPPORT_WINDOWS // <vho> - WMF/EMF support
	if (CXIMAGE_FORMAT_WMF==imagetype){
		CxImageWMF *newima = new CxImageWMF;
		if (!newima) return false;
		newima->Ghost(this);
		if (newima->Encode(hFile)){
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			delete newima;
			return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_JBG
	if (CXIMAGE_FORMAT_JBG==imagetype){
		CxImageJBG *newima = new CxImageJBG;
		if (!newima) return false;
		newima->Ghost(this);
		if (newima->Encode(hFile)){
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			delete newima;
			return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_JASPER
	if (
 #if	CXIMAGE_SUPPORT_JP2
		CXIMAGE_FORMAT_JP2==imagetype || 
 #endif
 #if	CXIMAGE_SUPPORT_JPC
		CXIMAGE_FORMAT_JPC==imagetype || 
 #endif
 #if	CXIMAGE_SUPPORT_PGX
		CXIMAGE_FORMAT_PGX==imagetype || 
 #endif
 #if	CXIMAGE_SUPPORT_PNM
		CXIMAGE_FORMAT_PNM==imagetype || 
 #endif
 #if	CXIMAGE_SUPPORT_RAS
		CXIMAGE_FORMAT_RAS==imagetype || 
 #endif
		 false ){
		CxImageJAS *newima = new CxImageJAS;
		if (!newima) return false;
		newima->Ghost(this);
		if (newima->Encode(hFile,imagetype)){
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			delete newima;
			return false;
		}
	}
#endif

#if CXIMAGE_SUPPORT_SKA
	if (CXIMAGE_FORMAT_SKA==imagetype){
		CxImageSKA *newima = new CxImageSKA;
		if (!newima) return false;
		newima->Ghost(this);
		if (newima->Encode(hFile)){
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			delete newima;
			return false;
		}
	}
#endif

#if CXIMAGE_SUPPORT_RAW
	if (CXIMAGE_FORMAT_RAW==imagetype){
		CxImageRAW *newima = new CxImageRAW;
		if (!newima) return false;
		newima->Ghost(this);
		if (newima->Encode(hFile)){
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			delete newima;
			return false;
		}
	}
#endif

#if CXIMAGE_SUPPORT_PSD
	if (CXIMAGE_FORMAT_PSD==imagetype){
		CxImagePSD *newima = new CxImagePSD;
		if (!newima) return false;
		newima->Ghost(this);
		if (newima->Encode(hFile)){
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			delete newima;
			return false;
		}
	}
#endif

	strcpy(info.szLastError,"Encode: Unknown format");
	return false;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Saves to disk or memory pagecount images, referenced by an array of CxImage pointers.
 * \param hFile: file handle.
 * \param pImages: array of CxImage pointers.
 * \param pagecount: number of images.
 * \param imagetype: can be CXIMAGE_FORMAT_TIF or CXIMAGE_FORMAT_GIF.
 * \return true if everything is ok
 */
bool CxImage::Encode(FILE * hFile, CxImage ** pImages, int32_t pagecount, uint32_t imagetype)
{
	CxIOFile file(hFile);
	return Encode(&file, pImages, pagecount,imagetype);
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Saves to disk or memory pagecount images, referenced by an array of CxImage pointers.
 * \param hFile: file handle (CxMemFile or CxIOFile), with write access.
 * \param pImages: array of CxImage pointers.
 * \param pagecount: number of images.
 * \param imagetype: can be CXIMAGE_FORMAT_TIF, CXIMAGE_FORMAT_GIF or CXIMAGE_FORMAT_ICO.
 * \return true if everything is ok
 */
bool CxImage::Encode(CxFile * hFile, CxImage ** pImages, int32_t pagecount, uint32_t imagetype)
{
#if CXIMAGE_SUPPORT_TIF
	if (imagetype==CXIMAGE_FORMAT_TIF){
		CxImageTIF newima;
		newima.Ghost(this);
		if (newima.Encode(hFile,pImages,pagecount)){
			return true;
		} else {
			strcpy(info.szLastError,newima.GetLastError());
			return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_GIF
	if (imagetype==CXIMAGE_FORMAT_GIF){
		CxImageGIF newima;
		newima.Ghost(this);
		if (newima.Encode(hFile,pImages,pagecount)){
			return true;
		} else {
			strcpy(info.szLastError,newima.GetLastError());
			return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_ICO
	if (imagetype==CXIMAGE_FORMAT_ICO){
		CxImageICO newima;
		newima.Ghost(this);
		if (newima.Encode(hFile,pImages,pagecount)){
			return true;
		} else {
			strcpy(info.szLastError,newima.GetLastError());
			return false;
		}
	}
#endif
	strcpy(info.szLastError,"Multipage Encode, Unsupported operation for this format");
	return false;
}

////////////////////////////////////////////////////////////////////////////////
/**
 * exports the image into a RGBA buffer, Useful for OpenGL applications.
 * \param buffer: output memory buffer pointer. Must be NULL,
 * the function allocates and fill the memory,
 * the application must free the buffer, see also FreeMemory().
 * \param size: output memory buffer size.
 * \param bFlipY: direction of Y axis. default = false.
 * \return true if everything is ok
 */
bool CxImage::Encode2RGBA(uint8_t * &buffer, int32_t &size, bool bFlipY)
{
	if (buffer!=NULL){
		strcpy(info.szLastError,"the buffer must be empty");
		return false;
	}
	CxMemFile file;
	file.Open();
	if(Encode2RGBA(&file,bFlipY)){
		buffer=file.GetBuffer();
		size=file.Size();
		return true;
	}
	return false;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * exports the image into a RGBA buffer, Useful for OpenGL applications.
 * \param hFile: file handle (CxMemFile or CxIOFile), with write access.
 * \param bFlipY: direction of Y axis. default = false.
 * \return true if everything is ok
 */
bool CxImage::Encode2RGBA(CxFile *hFile, bool bFlipY)
{
	if (EncodeSafeCheck(hFile)) return false;

	for (int32_t y1 = 0; y1 < head.biHeight; y1++) {
		int32_t y = bFlipY ? head.biHeight - 1 - y1 : y1;
		for(int32_t x = 0; x < head.biWidth; x++) {
			RGBQUAD color = BlindGetPixelColor(x,y);
			hFile->PutC(color.rgbRed);
			hFile->PutC(color.rgbGreen);
			hFile->PutC(color.rgbBlue);
			hFile->PutC(color.rgbReserved);
		}
	}
	return true;
}

////////////////////////////////////////////////////////////////////////////////
#endif //CXIMAGE_SUPPORT_ENCODE
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
#if CXIMAGE_SUPPORT_DECODE
////////////////////////////////////////////////////////////////////////////////
// For UNICODE support: char -> TCHAR
/**
 * Reads from disk the image in a specific format.
 * - If decoding fails using the specified image format,
 * the function will try the automatic file format recognition.
 *
 * \param filename: file name
 * \param imagetype: file format, see ENUM_CXIMAGE_FORMATS
 * \return true if everything is ok
 */
bool CxImage::Load(const TCHAR * filename, uint32_t imagetype)
//bool CxImage::Load(const char * filename, uint32_t imagetype)
{
	/*FILE* hFile;	//file handle to read the image
	if ((hFile=fopen(filename,"rb"))==NULL)  return false;
	bool bOK = Decode(hFile,imagetype);
	fclose(hFile);*/

	/* automatic file type recognition */
	bool bOK = false;
	if ( GetTypeIndexFromId(imagetype) ){
		FILE* hFile;	//file handle to read the image

#ifdef WIN32
		if ((hFile=_tfopen(filename,_T("rb")))==NULL)  return false;	// For UNICODE support
#else
		if ((hFile=fopen(filename,"rb"))==NULL)  return false;
#endif

		bOK = Decode(hFile,imagetype);
		fclose(hFile);
		if (bOK) return bOK;
	}

	char szError[256];
	strcpy(szError,info.szLastError); //save the first error

	// if failed, try automatic recognition of the file...
	FILE* hFile;

#ifdef WIN32
	if ((hFile=_tfopen(filename,_T("rb")))==NULL)  return false;	// For UNICODE support
#else
	if ((hFile=fopen(filename,"rb"))==NULL)  return false;
#endif

	bOK = Decode(hFile,CXIMAGE_FORMAT_UNKNOWN);
	fclose(hFile);

	if (!bOK && imagetype > 0) strcpy(info.szLastError,szError); //restore the first error

	return bOK;
}
////////////////////////////////////////////////////////////////////////////////
#ifdef WIN32
//bool CxImage::Load(LPCWSTR filename, uint32_t imagetype)
//{
//	/*FILE* hFile;	//file handle to read the image
//	if ((hFile=_wfopen(filename, L"rb"))==NULL)  return false;
//	bool bOK = Decode(hFile,imagetype);
//	fclose(hFile);*/
//
//	/* automatic file type recognition */
//	bool bOK = false;
//	if ( GetTypeIndexFromId(imagetype) ){
//		FILE* hFile;	//file handle to read the image
//		if ((hFile=_wfopen(filename,L"rb"))==NULL)  return false;
//		bOK = Decode(hFile,imagetype);
//		fclose(hFile);
//		if (bOK) return bOK;
//	}
//
//	char szError[256];
//	strcpy(szError,info.szLastError); //save the first error
//
//	// if failed, try automatic recognition of the file...
//	FILE* hFile;	//file handle to read the image
//	if ((hFile=_wfopen(filename,L"rb"))==NULL)  return false;
//	bOK = Decode(hFile,CXIMAGE_FORMAT_UNKNOWN);
//	fclose(hFile);
//
//	if (!bOK && imagetype > 0) strcpy(info.szLastError,szError); //restore the first error
//
//	return bOK;
//}
////////////////////////////////////////////////////////////////////////////////
/**
 * Loads an image from the application resources.
 * \param hRes: the resource handle returned by FindResource().
 * \param imagetype: file format, see ENUM_CXIMAGE_FORMATS.
 * \param hModule: NULL for internal resource, or external application/DLL hinstance returned by LoadLibray.
 * \return true if everything is ok
 */
bool CxImage::LoadResource(HRSRC hRes, uint32_t imagetype, HMODULE hModule)
{
	uint32_t rsize=SizeofResource(hModule,hRes);
	HGLOBAL hMem=::LoadResource(hModule,hRes);
	if (hMem){
		char* lpVoid=(char*)LockResource(hMem);
		if (lpVoid){
			// FILE* fTmp=tmpfile(); doesn't work with network
			/*char tmpPath[MAX_PATH] = {0};
			char tmpFile[MAX_PATH] = {0};
			GetTempPath(MAX_PATH,tmpPath);
			GetTempFileName(tmpPath,"IMG",0,tmpFile);
			FILE* fTmp=fopen(tmpFile,"w+b");
			if (fTmp){
				fwrite(lpVoid,rsize,1,fTmp);
				fseek(fTmp,0,SEEK_SET);
				bool bOK = Decode(fTmp,imagetype);
				fclose(fTmp);
				DeleteFile(tmpFile);
				return bOK;
			}*/

			CxMemFile fTmp((uint8_t*)lpVoid,rsize);
			return Decode(&fTmp,imagetype);
		}
	} else strcpy(info.szLastError,"Unable to load resource!");
	return false;
}
#endif //WIN32
////////////////////////////////////////////////////////////////////////////////
/**
 * Constructor from file name, see Load()
 * \param filename: file name
 * \param imagetype: file format, see ENUM_CXIMAGE_FORMATS
 */
// 
// > filename: file name
// > imagetype: specify the image format (CXIMAGE_FORMAT_BMP,...)
// For UNICODE support: char -> TCHAR
CxImage::CxImage(const TCHAR * filename, uint32_t imagetype)
//CxImage::CxImage(const char * filename, uint32_t imagetype)
{
	Startup(imagetype);
	Load(filename,imagetype);
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Constructor from file handle, see Decode()
 * \param stream: file handle, with read access.
 * \param imagetype: file format, see ENUM_CXIMAGE_FORMATS
 */
CxImage::CxImage(FILE * stream, uint32_t imagetype)
{
	Startup(imagetype);
	Decode(stream,imagetype);
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Constructor from CxFile object, see Decode()
 * \param stream: file handle (CxMemFile or CxIOFile), with read access.
 * \param imagetype: file format, see ENUM_CXIMAGE_FORMATS
 */
CxImage::CxImage(CxFile * stream, uint32_t imagetype)
{
	Startup(imagetype);
	Decode(stream,imagetype);
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Constructor from memory buffer, see Decode()
 * \param buffer: memory buffer
 * \param size: size of buffer
 * \param imagetype: file format, see ENUM_CXIMAGE_FORMATS
 */
CxImage::CxImage(uint8_t * buffer, uint32_t size, uint32_t imagetype)
{
	Startup(imagetype);
	CxMemFile stream(buffer,size);
	Decode(&stream,imagetype);
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Loads an image from memory buffer
 * \param buffer: memory buffer
 * \param size: size of buffer
 * \param imagetype: file format, see ENUM_CXIMAGE_FORMATS
 * \return true if everything is ok
 */
bool CxImage::Decode(uint8_t * buffer, uint32_t size, uint32_t imagetype)
{
	CxMemFile file(buffer,size);
	return Decode(&file,imagetype);
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Loads an image from file handle.
 * \param hFile: file handle, with read access.
 * \param imagetype: file format, see ENUM_CXIMAGE_FORMATS
 * \return true if everything is ok
 */
bool CxImage::Decode(FILE *hFile, uint32_t imagetype)
{
	CxIOFile file(hFile);
	return Decode(&file,imagetype);
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Loads an image from CxFile object
 * \param hFile: file handle (CxMemFile or CxIOFile), with read access.
 * \param imagetype: file format, see ENUM_CXIMAGE_FORMATS
 * \return true if everything is ok
 * \sa ENUM_CXIMAGE_FORMATS
 */
bool CxImage::Decode(CxFile *hFile, uint32_t imagetype)
{
	if (hFile == NULL){
		strcpy(info.szLastError,CXIMAGE_ERR_NOFILE);
		return false;
	}

	uint32_t pos = hFile->Tell();

#if CXIMAGE_SUPPORT_BMP
	if (CXIMAGE_FORMAT_UNKNOWN==imagetype || CXIMAGE_FORMAT_BMP==imagetype){
		CxImageBMP *newima = new CxImageBMP;
		if (!newima)
			return false;
		newima->CopyInfo(*this);
		if (newima->Decode(hFile)) {
			Transfer(*newima);
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			hFile->Seek(pos,SEEK_SET);
			delete newima;
			if (CXIMAGE_FORMAT_UNKNOWN!=imagetype)
				return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_JPG
	if (CXIMAGE_FORMAT_UNKNOWN==imagetype || CXIMAGE_FORMAT_JPG==imagetype){
		CxImageJPG *newima = new CxImageJPG;
		if (!newima)
			return false;
		newima->CopyInfo(*this);
		if (newima->Decode(hFile)) {
			Transfer(*newima);
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			hFile->Seek(pos,SEEK_SET);
			delete newima;
			if (CXIMAGE_FORMAT_UNKNOWN!=imagetype)
				return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_ICO
	if (CXIMAGE_FORMAT_UNKNOWN==imagetype || CXIMAGE_FORMAT_ICO==imagetype){
		CxImageICO *newima = new CxImageICO;
		if (!newima)
			return false;
		newima->CopyInfo(*this);
		if (newima->Decode(hFile)) {
			Transfer(*newima);
			delete newima;
			return true;
		} else {
			info.nNumFrames = newima->info.nNumFrames;
			strcpy(info.szLastError,newima->GetLastError());
			hFile->Seek(pos,SEEK_SET);
			delete newima;
			if (CXIMAGE_FORMAT_UNKNOWN!=imagetype)
				return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_GIF
	if (CXIMAGE_FORMAT_UNKNOWN==imagetype || CXIMAGE_FORMAT_GIF==imagetype){
		CxImageGIF *newima = new CxImageGIF;
		if (!newima)
			return false;
		newima->CopyInfo(*this);
		if (newima->Decode(hFile)) {
			Transfer(*newima);
			delete newima;
			return true;
		} else {
			info.nNumFrames = newima->info.nNumFrames;
			strcpy(info.szLastError,newima->GetLastError());
			hFile->Seek(pos,SEEK_SET);
			delete newima;
			if (CXIMAGE_FORMAT_UNKNOWN!=imagetype)
				return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_PNG
	if (CXIMAGE_FORMAT_UNKNOWN==imagetype || CXIMAGE_FORMAT_PNG==imagetype){
		CxImagePNG *newima = new CxImagePNG;
		if (!newima)
			return false;
		newima->CopyInfo(*this);
		if (newima->Decode(hFile)) {
			Transfer(*newima);
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			hFile->Seek(pos,SEEK_SET);
			delete newima;
			if (CXIMAGE_FORMAT_UNKNOWN!=imagetype)
				return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_TIF
	if (CXIMAGE_FORMAT_UNKNOWN==imagetype || CXIMAGE_FORMAT_TIF==imagetype){
		CxImageTIF *newima = new CxImageTIF;
		if (!newima)
			return false;
		newima->CopyInfo(*this);
		if (newima->Decode(hFile)) {
			Transfer(*newima);
			delete newima;
			return true;
		} else {
			info.nNumFrames = newima->info.nNumFrames;
			strcpy(info.szLastError,newima->GetLastError());
			hFile->Seek(pos,SEEK_SET);
			delete newima;
			if (CXIMAGE_FORMAT_UNKNOWN!=imagetype)
				return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_MNG
	if (CXIMAGE_FORMAT_UNKNOWN==imagetype || CXIMAGE_FORMAT_MNG==imagetype){
		CxImageMNG *newima = new CxImageMNG;
		if (!newima)
			return false;
		newima->CopyInfo(*this);
		if (newima->Decode(hFile)) {
			Transfer(*newima);
			delete newima;
			return true;
		} else {
			info.nNumFrames = newima->info.nNumFrames;
			strcpy(info.szLastError,newima->GetLastError());
			hFile->Seek(pos,SEEK_SET);
			delete newima;
			if (CXIMAGE_FORMAT_UNKNOWN!=imagetype)
				return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_TGA
	if (CXIMAGE_FORMAT_UNKNOWN==imagetype || CXIMAGE_FORMAT_TGA==imagetype){
		CxImageTGA *newima = new CxImageTGA;
		if (!newima)
			return false;
		newima->CopyInfo(*this);
		if (newima->Decode(hFile)) {
			Transfer(*newima);
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			hFile->Seek(pos,SEEK_SET);
			delete newima;
			if (CXIMAGE_FORMAT_UNKNOWN!=imagetype)
				return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_PCX
	if (CXIMAGE_FORMAT_UNKNOWN==imagetype || CXIMAGE_FORMAT_PCX==imagetype){
		CxImagePCX *newima = new CxImagePCX;
		if (!newima)
			return false;
		newima->CopyInfo(*this);
		if (newima->Decode(hFile)) {
			Transfer(*newima);
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			hFile->Seek(pos,SEEK_SET);
			delete newima;
			if (CXIMAGE_FORMAT_UNKNOWN!=imagetype)
				return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_WBMP
	if (CXIMAGE_FORMAT_UNKNOWN==imagetype || CXIMAGE_FORMAT_WBMP==imagetype){
		CxImageWBMP *newima = new CxImageWBMP;
		if (!newima)
			return false;
		newima->CopyInfo(*this);
		if (newima->Decode(hFile)) {
			Transfer(*newima);
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			hFile->Seek(pos,SEEK_SET);
			delete newima;
			if (CXIMAGE_FORMAT_UNKNOWN!=imagetype)
				return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_WMF && CXIMAGE_SUPPORT_WINDOWS
	if (CXIMAGE_FORMAT_UNKNOWN==imagetype || CXIMAGE_FORMAT_WMF==imagetype){
		CxImageWMF *newima = new CxImageWMF;
		if (!newima)
			return false;
		newima->CopyInfo(*this);
		if (newima->Decode(hFile)) {
			Transfer(*newima);
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			hFile->Seek(pos,SEEK_SET);
			delete newima;
			if (CXIMAGE_FORMAT_UNKNOWN!=imagetype)
				return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_JBG
	if (CXIMAGE_FORMAT_UNKNOWN==imagetype || CXIMAGE_FORMAT_JBG==imagetype){
		CxImageJBG *newima = new CxImageJBG;
		if (!newima)
			return false;
		newima->CopyInfo(*this);
		if (newima->Decode(hFile)) {
			Transfer(*newima);
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			hFile->Seek(pos,SEEK_SET);
			delete newima;
			if (CXIMAGE_FORMAT_UNKNOWN!=imagetype)
				return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_JASPER
	if (CXIMAGE_FORMAT_UNKNOWN==imagetype ||
#if	CXIMAGE_SUPPORT_JP2
	 CXIMAGE_FORMAT_JP2==imagetype || 
#endif
#if	CXIMAGE_SUPPORT_JPC
	 CXIMAGE_FORMAT_JPC==imagetype || 
#endif
#if	CXIMAGE_SUPPORT_PGX
	 CXIMAGE_FORMAT_PGX==imagetype || 
#endif
#if	CXIMAGE_SUPPORT_PNM
	 CXIMAGE_FORMAT_PNM==imagetype || 
#endif
#if	CXIMAGE_SUPPORT_RAS
	 CXIMAGE_FORMAT_RAS==imagetype || 
#endif
	 false ){
		CxImageJAS *newima = new CxImageJAS;
		if (!newima)
			return false;
		newima->CopyInfo(*this);
		if (newima->Decode(hFile)) {
			Transfer(*newima);
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			hFile->Seek(pos,SEEK_SET);
			delete newima;
			if (CXIMAGE_FORMAT_UNKNOWN!=imagetype)
				return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_SKA
	if (CXIMAGE_FORMAT_UNKNOWN==imagetype || CXIMAGE_FORMAT_SKA==imagetype){
		CxImageSKA *newima = new CxImageSKA;
		if (!newima)
			return false;
		newima->CopyInfo(*this);
		if (newima->Decode(hFile)) {
			Transfer(*newima);
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			hFile->Seek(pos,SEEK_SET);
			delete newima;
			if (CXIMAGE_FORMAT_UNKNOWN!=imagetype)
				return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_RAW
	if (CXIMAGE_FORMAT_UNKNOWN==imagetype || CXIMAGE_FORMAT_RAW==imagetype){
		CxImageRAW *newima = new CxImageRAW;
		if (!newima)
			return false;
		newima->CopyInfo(*this);
		if (newima->Decode(hFile)) {
			Transfer(*newima);
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			hFile->Seek(pos,SEEK_SET);
			delete newima;
			if (CXIMAGE_FORMAT_UNKNOWN!=imagetype)
				return false;
		}
	}
#endif
#if CXIMAGE_SUPPORT_PSD
	if (CXIMAGE_FORMAT_UNKNOWN==imagetype || CXIMAGE_FORMAT_PSD==imagetype){
		CxImagePSD *newima = new CxImagePSD;
		if (!newima)
			return false;
		newima->CopyInfo(*this);
		if (newima->Decode(hFile)) {
			Transfer(*newima);
			delete newima;
			return true;
		} else {
			strcpy(info.szLastError,newima->GetLastError());
			hFile->Seek(pos,SEEK_SET);
			delete newima;
			if (CXIMAGE_FORMAT_UNKNOWN!=imagetype)
				return false;
		}
	}
#endif

	strcpy(info.szLastError,"Decode: Unknown or wrong format");
	return false;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Loads an image from CxFile object
 * \param hFile: file handle (CxMemFile or CxIOFile), with read access.
 * \param imagetype: file format, default = 0 (CXIMAGE_FORMAT_UNKNOWN)
 * \return : if imagetype is not 0, the function returns true when imagetype
 *  matches the file image format. If imagetype is 0, the function returns true
 *  when the file image format is recognized as a supported format.
 *  If the returned value is true, use GetHeight(), GetWidth() or GetType()
 *  to retrieve the basic image information.
 * \sa ENUM_CXIMAGE_FORMATS
 */
bool CxImage::CheckFormat(CxFile * hFile, uint32_t imagetype)
{
	SetType(CXIMAGE_FORMAT_UNKNOWN);
	SetEscape(-1);

	if (!Decode(hFile,imagetype))
		return false;

	if (GetType() == CXIMAGE_FORMAT_UNKNOWN ||
		((imagetype!=CXIMAGE_FORMAT_UNKNOWN)&&(GetType() != imagetype)))
		return false;

	return true;
}
////////////////////////////////////////////////////////////////////////////////
bool CxImage::CheckFormat(uint8_t * buffer, uint32_t size, uint32_t imagetype)
{
	if (buffer==NULL || size==NULL){
		strcpy(info.szLastError,"invalid or empty buffer");
		return false;
	}
	CxMemFile file(buffer,size);
	return CheckFormat(&file,imagetype);
}
////////////////////////////////////////////////////////////////////////////////
#if CXIMAGE_SUPPORT_EXIF
bool CxImage::GetExifThumbnail(const TCHAR *filename, const TCHAR *outname, int32_t type)
{
	switch (type){
#if CXIMAGE_SUPPORT_RAW
	case CXIMAGE_FORMAT_RAW:
	{
		CxImageRAW image;
  		return image.GetExifThumbnail(filename, outname, type);
	}
#endif //CXIMAGE_SUPPORT_RAW
#if CXIMAGE_SUPPORT_JPG
	case CXIMAGE_FORMAT_JPG:
	{
  		CxImageJPG image;
  		return image.GetExifThumbnail(filename, outname, type);
	}
#endif //CXIMAGE_SUPPORT_JPG
	default:
		return false;
	}
}
#endif //CXIMAGE_SUPPORT_EXIF

////////////////////////////////////////////////////////////////////////////////
#endif //CXIMAGE_SUPPORT_DECODE
////////////////////////////////////////////////////////////////////////////////
