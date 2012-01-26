/*
 * File:	ximapsd.h
 * Purpose:	PSD Image Class Loader and Writer
 */
/* ==========================================================
 * CxImagePSD (c) Dec/2010
 * For conditions of distribution and use, see copyright notice in ximage.h
 *
 * libpsd (c) 2004-2007 Graphest Software
 *
 * ==========================================================
 */
#if !defined(__ximaPSD_h)
#define __ximaPSD_h

#include "ximage.h"

#if CXIMAGE_SUPPORT_PSD

#define CXIMAGE_USE_LIBPSD 1

#if CXIMAGE_USE_LIBPSD
 extern "C" {
  #include "../libpsd/libpsd.h"
 }
#endif

class CxImagePSD: public CxImage
{

public:
	CxImagePSD(): CxImage(CXIMAGE_FORMAT_PSD) {}

//	bool Load(const char * imageFileName){ return CxImage::Load(imageFileName,CXIMAGE_FORMAT_PSD);}
//	bool Save(const char * imageFileName){ return CxImage::Save(imageFileName,CXIMAGE_FORMAT_PSD);}
	bool Decode(CxFile * hFile);
	bool Decode(FILE *hFile) { CxIOFile file(hFile); return Decode(&file); }

//#if CXIMAGE_SUPPORT_EXIF
//	bool GetExifThumbnail(const TCHAR *filename, const TCHAR *outname, int32_t type);
//#endif //CXIMAGE_SUPPORT_EXIF

#if CXIMAGE_SUPPORT_ENCODE
	bool Encode(CxFile * hFile);
	bool Encode(FILE *hFile) { CxIOFile file(hFile); return Encode(&file); }
#endif // CXIMAGE_SUPPORT_ENCODE

#if CXIMAGE_USE_LIBPSD
protected:
	class CxFilePsd
	{
	public:
		CxFilePsd(CxFile* pFile,psd_context *context)
		{
			context->file = pFile;

			psd_CxFile_ops.size_ = psd_file_size;
			psd_CxFile_ops.seek_ = psd_file_seek;
			psd_CxFile_ops.read_ = psd_file_read;
//			psd_CxFile_ops.write_ = psd_file_write;
//			psd_CxFile_ops.close_ = psd_file_close;
//			psd_CxFile_ops.gets_ = psd_file_gets;
//			psd_CxFile_ops.eof_ = psd_file_eof;
//			psd_CxFile_ops.tell_ = psd_file_tell;
//			psd_CxFile_ops.getc_ = psd_file_getc;
//			psd_CxFile_ops.scanf_ = psd_file_scanf;

			context->ops_ = &psd_CxFile_ops;

		}

		static int32_t psd_file_size(psd_file_obj *obj)
		{	return ((CxFile*)obj)->Size(); }

		static int32_t psd_file_seek(psd_file_obj *obj, int32_t offset, int32_t origin)
		{	return ((CxFile*)obj)->Seek(offset,origin); }

		static int32_t psd_file_read(psd_file_obj *obj, void *buf, int32_t size, int32_t cnt)
		{	return ((CxFile*)obj)->Read(buf,size,cnt); }

//		static int32_t psd_file_write(psd_file_obj *obj, void *buf, int32_t size, int32_t cnt)
//		{	return ((CxFile*)obj)->Write(buf,size,cnt); }

//		static int32_t psd_file_close(psd_file_obj *obj)
//		{	return 1; /*((CxFile*)obj)->Close();*/ }

//		static char* psd_file_gets(psd_file_obj *obj, char *string, int32_t n)
//		{	return ((CxFile*)obj)->GetS(string,n); }

//		static int32_t   psd_file_eof(psd_file_obj *obj)
//		{	return ((CxFile*)obj)->Eof(); }

//		static long  psd_file_tell(psd_file_obj *obj)
//		{	return ((CxFile*)obj)->Tell(); }

//		static int32_t   psd_file_getc(psd_file_obj *obj)
//		{	return ((CxFile*)obj)->GetC(); }

//		static int32_t   psd_file_scanf(psd_file_obj *obj,const char *format, void* output)
//		{	return ((CxFile*)obj)->Scanf(format, output); }

	private:
		psd_file_ops psd_CxFile_ops;
	};
#endif //CXIMAGE_USE_LIBPSD
};

#endif

#endif
