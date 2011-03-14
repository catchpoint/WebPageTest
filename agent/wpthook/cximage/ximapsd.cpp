/*
 * File:	ximapsd.cpp
 * Purpose:	Platform Independent PSD Image Class Loader
 * Dec/2010 Davide Pizzolato - www.xdp.it
 * CxImage version 7.0.1 07/Jan/2011
 *
 * libpsd (c) 2004-2007 Graphest Software
 *
 * Based on MyPSD class by Iosif Hamlatzis
 * Details: http://www.codeproject.com/KB/graphics/MyPSD.aspx
 * Cleaned up a bit and ported to CxImage by Vitaly Ovchinnikov
 * Send feedback to vitaly(dot)ovchinnikov(at)gmail.com
 */

#include "ximapsd.h"

#if CXIMAGE_SUPPORT_PSD

enum {
	PSD_FILE_HEADER,
	PSD_COLOR_MODE_DATA,
	PSD_IMAGE_RESOURCE,
	PSD_LAYER_AND_MASK_INFORMATION,
	PSD_IMAGE_DATA,
	PSD_DONE
};

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
#if CXIMAGE_USE_LIBPSD == 0
// MyPSD.h /////////////////////////////////////////////////////////////////////

#ifndef __MyPSD_H__
#define __MyPSD_H__

namespace MyPSD
{

	class CPSD
	{
		struct HEADER_INFO
		{
			//Table 2-12: HeaderInfo Color spaces
			//	Color-ID	Name	Description
			//-------------------------------------------
			//		0		Bitmap			// Probably means black & white
			//		1		Grayscale		The first value in the color data is the gray value, from 0...10000.
			//		2		Indexed
			//		3		RGB				The first three values in the color data are red, green, and blue.
			//								They are full unsigned 16–bit values as in Apple’s RGBColor data
			//								structure. Pure red=65535,0,0.
			//		4		CMYK			The four values in the color data are cyan, magenta, yellow, and
			//								black. They are full unsigned 16–bit values. 0=100% ink. Pure
			//								cyan=0,65535,65535,65535.
			//		7		Multichannel	// Have no idea
			//		8		Duotone
			//		9		Lab				The first three values in the color data are lightness, a chrominance,
			//								and b chrominance.
			//								Lightness is a 16–bit value from 0...100. The chromanance components
			//								are each 16–bit values from –128...127. Gray values
			//								are represented by chrominance components of 0. Pure
			//								white=100,0,0.
			short nChannels;
			int nHeight;
			int nWidth;
			short nBitsPerPixel;
			short nColourMode;
			HEADER_INFO();
		};

		struct COLOUR_MODE_DATA
		{
			int nLength;
			unsigned char* ColourData;
			COLOUR_MODE_DATA();
		};


		struct IMAGE_RESOURCE
		{
			// Table 2–1: Image resource block
			//	Type		Name	Description
			//-------------------------------------------
			//	OSType		Type	Photoshop always uses its signature, 8BIM
			//	int16		ID		Unique identifier
			//	PString		Name	A pascal string, padded to make size even (a null name consists of two bytes of 0)
			//						Pascal style string where the first byte gives the length of the
			//						string and the content bytes follow.
			//	int32		Size	Actual size of resource data. This does not include the
			//						Type, ID, Name, or Size fields.
			//	Variable	Data	Resource data, padded to make size even
			int nLength;
			char OSType[4];
			short nID;
			unsigned char* Name;
			int	nSize;
			IMAGE_RESOURCE();
			void Reset();
		};

		struct RESOLUTION_INFO
		{
			// Table A-6: ResolutionInfo structure
			//	Type		Name	Description
			//-------------------------------------------
			//	Fixed		hRes		Horizontal resolution in pixels per inch.
			//	int			hResUnit	1=display horizontal resolution in pixels per inch;
			//							2=display horizontal resolution in pixels per cm.
			//	short		widthUnit	Display width as 1=inches; 2=cm; 3=points; 4=picas; 5=columns.
			//	Fixed		vRes		Vertical resolution in pixels per inch.
			//	int			vResUnit	1=display vertical resolution in pixels per inch;
			//							2=display vertical resolution in pixels per cm.
			//	short		heightUnit	Display height as 1=inches; 2=cm; 3=points; 4=picas; 5=columns.
			short hRes;
			int hResUnit;
			short widthUnit;

			short vRes;
			int vResUnit;
			short heightUnit;
			RESOLUTION_INFO();
		};

		struct RESOLUTION_INFO_v2	// Obsolete - Photoshop 2.0
		{
			short nChannels;
			short nRows;
			short nColumns;
			short nDepth;
			short nMode;
			RESOLUTION_INFO_v2();
		};

		struct DISPLAY_INFO
		{
			// This structure contains display information about each channel.
			//Table A-7: DisplayInfo Color spaces
			//	Color-ID	Name	Description
			//-------------------------------------------
			//		0		RGB			The first three values in the color data are red, green, and blue.
			//							They are full unsigned 16–bit values as in Apple’s RGBColor data
			//							structure. Pure red=65535,0,0.
			//		1		HSB			The first three values in the color data are hue, saturation, and
			//							brightness. They are full unsigned 16–bit values as in Apple’s
			//							HSVColor data structure. Pure red=0,65535, 65535.
			//		2		CMYK		The four values in the color data are cyan, magenta, yellow, and
			//							black. They are full unsigned 16–bit values. 0=100% ink. Pure
			//							cyan=0,65535,65535,65535.
			//		7		Lab			The first three values in the color data are lightness, a chrominance,
			//							and b chrominance.
			//							Lightness is a 16–bit value from 0...10000. The chromanance components
			//							are each 16–bit values from –12800...12700. Gray values
			//							are represented by chrominance components of 0. Pure
			//							white=10000,0,0.
			//		8		grayscale	The first value in the color data is the gray value, from 0...10000.
			short ColourSpace;
			short Colour[4];
			short Opacity;			// 0..100
			bool kind;				// selected = 0, protected = 1
			unsigned char padding;	// should be zero
			DISPLAY_INFO();
		};
		struct THUMBNAIL
		{
			// Adobe Photoshop 5.0 and later stores thumbnail information for preview
			// display in an image resource block. These resource blocks consist of an
			// 28 byte header, followed by a JFIF thumbnail in RGB (red, green, blue)
			// for both Macintosh and Windows. Adobe Photoshop 4.0 stored the
			// thumbnail information in the same format except the data section is
			// (blue, green, red). The Adobe Photoshop 4.0 format is at resource ID
			// and the Adobe Photoshop 5.0 format is at resource ID 1036.
			// Table 2–5: Thumnail resource header
			//	Type		Name		Description
			//-------------------------------------------
			//	4 bytes		format			= 1 (kJpegRGB). Also supports kRawRGB (0).
			//	4 bytes		width			Width of thumbnail in pixels.
			//	4 bytes		height			Height of thumbnail in pixels.
			//	4 bytes		widthbytes		Padded row bytes as (width * bitspixel + 31) / 32 * 4.
			//	4 bytes		size			Total size as widthbytes * height * planes
			//	4 bytes		compressedsize	Size after compression. Used for consistentcy check.
			//	2 bytes		bitspixel		= 24. Bits per pixel.
			//	2 bytes		planes			= 1. Number of planes.
			//	Variable	Data			JFIF data in RGB format.
			//								Note: For resource ID 1033 the data is in BGR format.
			int		nFormat;
			int		nWidth;
			int		nHeight;
			int		nWidthBytes;
			int		nSize;
			int		nCompressedSize;
			short	nBitPerPixel;
			short	nPlanes;
			unsigned char* Data;
			THUMBNAIL();
		};


		CxImage	&m_image;

		HEADER_INFO header_info;

		COLOUR_MODE_DATA colour_mode_data;
		short mnColourCount;
		short mnTransparentIndex;

		IMAGE_RESOURCE image_resource;

		int		mnGlobalAngle;

		RESOLUTION_INFO resolution_info;
		bool	mbResolutionInfoFilled;

		RESOLUTION_INFO_v2 resolution_info_v2;
		bool	mbResolutionInfoFilled_v2;

		DISPLAY_INFO display_info;
		bool	mbDisplayInfoFilled;

		THUMBNAIL thumbnail;
		bool	mbThumbNailFilled;

		bool	mbCopyright;

		int Calculate(unsigned char* c, int nDigits);
		void XYZToRGB(const double X, const double Y, const double Z, int &R, int &G, int &B);
		void LabToRGB(const int L, const int a, const int b, int &R, int &G, int &B );
		void CMYKToRGB(const double C, const double M, const double Y, const double K, int &R, int &G, int &B);

		bool ReadHeader(CxFile &f, HEADER_INFO& header_info);
		bool ReadColourModeData(CxFile &f, COLOUR_MODE_DATA& colour_mode_data);
		bool ReadImageResource(CxFile &f, IMAGE_RESOURCE& image_resource);
		bool ReadLayerAndMaskInfoSection(CxFile &f); // Actually ignore it
		int ReadImageData(CxFile &f);

		int DecodeRawData(CxFile &pFile);
		int DecodeRLEData(CxFile &pFile);

		void ProccessBuffer(unsigned char* pData = 0);

	public:
		CPSD(CxImage &image);
		~CPSD();

		int Load(LPCTSTR szPathName);
		int Load(CxFile &file);

		bool ThumbNailIncluded() const { return mbThumbNailFilled; }
		void DPI(int &x, int &y) const { x = resolution_info.hRes; y = resolution_info.vRes; }
		void Dimensions(int &cx, int &cy) const { cx = header_info.nWidth; cy = header_info.nHeight; }
		int BitsPerPixel() const { return header_info.nBitsPerPixel; }
		int GlobalAngle() const { return mnGlobalAngle; }
		bool IsCopyright() const { return mbCopyright; }
		HBITMAP Detach();
	};
}

#endif // __MyPSD_H__

// MyPSD.cpp ///////////////////////////////////////////////////////////////////


inline int dti(double value) { return (int)floor(value+.5f); }

#define assert(a) 

#define mypsd_fread(a, b, c, d) d.Read(a, b, c)
#define mypsd_fseek(a, b, c) a.Seek(b, c)
#define mypsd_feof(a) a.Eof()

namespace MyPSD
{
	CPSD::CPSD(CxImage &image) : m_image(image)
	{
		mbThumbNailFilled = false;
		mbDisplayInfoFilled = false;
		mbResolutionInfoFilled = false;
		mbResolutionInfoFilled_v2 = false;
		mnGlobalAngle = 30;
		mbCopyright = false;
		mnColourCount = -1;
		mnTransparentIndex = -1;
	}
	CPSD::~CPSD()
	{
		// free memory
		if ( 0 < colour_mode_data.nLength )
			delete[] colour_mode_data.ColourData;
		colour_mode_data.ColourData = 0;

		if ( image_resource.Name )
			delete[] image_resource.Name;
		image_resource.Name = 0;
	}

	int CPSD::Calculate(unsigned char* c, int nDigits)
	{
		int nValue = 0;

		for(int n = 0; n < nDigits; ++n)
			nValue = ( nValue << 8 ) | *(c+n);

		return nValue;
	};

	void CPSD::XYZToRGB(const double X, const double Y, const double Z, int &R, int &G, int &B)
	{
		// Standards used Observer = 2, Illuminant = D65
		// ref_X = 95.047, ref_Y = 100.000, ref_Z = 108.883
		const double ref_X = 95.047;
		const double ref_Y = 100.000;
		const double ref_Z = 108.883;

		double var_X = X / 100.0;
		double var_Y = Y / 100.0;
		double var_Z = Z / 100.0;

		double var_R = var_X * 3.2406 + var_Y * (-1.5372) + var_Z * (-0.4986);
		double var_G = var_X * (-0.9689) + var_Y * 1.8758 + var_Z * 0.0415;
		double var_B = var_X * 0.0557 + var_Y * (-0.2040) + var_Z * 1.0570;

		if ( var_R > 0.0031308 )
			var_R = 1.055 * ( pow(var_R, 1/2.4) ) - 0.055;
		else
			var_R = 12.92 * var_R;

		if ( var_G > 0.0031308 )
			var_G = 1.055 * ( pow(var_G, 1/2.4) ) - 0.055;
		else
			var_G = 12.92 * var_G;

		if ( var_B > 0.0031308 )
			var_B = 1.055 * ( pow(var_B, 1/2.4) )- 0.055;
		else
			var_B = 12.92 * var_B;

		R = (int)(var_R * 256.0);
		G = (int)(var_G * 256.0);
		B = (int)(var_B * 256.0);
	};

	void CPSD::LabToRGB(const int L, const int a, const int b, int &R, int &G, int &B )
	{
		// For the conversion we first convert values to XYZ and then to RGB
		// Standards used Observer = 2, Illuminant = D65
		// ref_X = 95.047, ref_Y = 100.000, ref_Z = 108.883
		const double ref_X = 95.047;
		const double ref_Y = 100.000;
		const double ref_Z = 108.883;

		double var_Y = ( (double)L + 16.0 ) / 116.0;
		double var_X = (double)a / 500.0 + var_Y;
		double var_Z = var_Y - (double)b / 200.0;

		if ( pow(var_Y, 3) > 0.008856 )
			var_Y = pow(var_Y, 3);
		else
			var_Y = ( var_Y - 16 / 116 ) / 7.787;

		if ( pow(var_X, 3) > 0.008856 )
			var_X = pow(var_X, 3);
		else
			var_X = ( var_X - 16 / 116 ) / 7.787;

		if ( pow(var_Z, 3) > 0.008856 )
			var_Z = pow(var_Z, 3);
		else
			var_Z = ( var_Z - 16 / 116 ) / 7.787;

		double X = ref_X * var_X;
		double Y = ref_Y * var_Y;
		double Z = ref_Z * var_Z;

		XYZToRGB(X, Y, Z, R, G, B);
	};

	void CPSD::CMYKToRGB(const double C, const double M, const double Y, const double K, int &R, int &G, int &B )
	{
		R = dti( ( 1.0f - ( C *( 1.0f - K ) + K ) ) * 255.0f );
		G = dti( ( 1.0f - ( M *( 1.0f - K ) + K ) ) * 255.0f );
		B = dti( ( 1.0f - ( Y *( 1.0f - K ) + K ) ) * 255.0f );
	};
	
	bool CPSD::ReadLayerAndMaskInfoSection(CxFile &pFile)	// Actually ignore it
	{
		bool bSuccess = false;

		unsigned char DataLength[4];
		int nBytesRead = 0;
		int nItemsRead = (int)(int)mypsd_fread(&DataLength, sizeof(DataLength), 1, pFile);

		int nTotalBytes = Calculate( DataLength, sizeof(DataLength) );

		unsigned char data[1];
		while( !mypsd_feof( pFile ) && ( nBytesRead < nTotalBytes ) )
		{
			data[0] = '\0';
			nItemsRead = (int)(int)mypsd_fread(&data, sizeof(data), 1, pFile);
			nBytesRead += nItemsRead * sizeof(data);
		}

		assert ( nBytesRead == nTotalBytes );
		if ( nBytesRead == nTotalBytes )
			bSuccess = true;

		return bSuccess;
	}
	bool CPSD::ReadImageResource(CxFile &pFile, IMAGE_RESOURCE& image_resource)
	{
		bool bSuccess = false;

		unsigned char Length[4];
		int nItemsRead = (int)(int)mypsd_fread(&Length, sizeof(Length), 1, pFile);

		image_resource.nLength = Calculate( Length, sizeof(image_resource.nLength) );

		int nBytesRead = 0;
		int nTotalBytes = image_resource.nLength;

		while( !mypsd_feof( pFile ) && ( nBytesRead < nTotalBytes ) )
		{
			nItemsRead = 0;
			image_resource.Reset();

			nItemsRead = (int)(int)mypsd_fread(&image_resource.OSType, sizeof(image_resource.OSType), 1, pFile);
			nBytesRead += nItemsRead * sizeof(image_resource.OSType);

			assert ( 0 == (nBytesRead % 2) );
			if (::memcmp(image_resource.OSType, "8BIM", 4) == 0)
			{
				unsigned char ID[2];
				nItemsRead = (int)(int)mypsd_fread(&ID, sizeof(ID), 1, pFile);
				nBytesRead += nItemsRead * sizeof(ID);

				image_resource.nID = (short)Calculate( ID, sizeof(ID) );

				unsigned char SizeOfName;
				nItemsRead = (int)(int)mypsd_fread(&SizeOfName, sizeof(SizeOfName), 1, pFile);
				nBytesRead += nItemsRead * sizeof(SizeOfName);

				int nSizeOfName = Calculate( &SizeOfName, sizeof(SizeOfName) );
				if ( 0 < nSizeOfName )
				{
					image_resource.Name = new unsigned char[nSizeOfName];
					nItemsRead = (int)(int)mypsd_fread(image_resource.Name, nSizeOfName, 1, pFile);
					nBytesRead += nItemsRead * nSizeOfName;
				}

				if ( 0 == (nSizeOfName % 2) )
				{
					nItemsRead = (int)(int)mypsd_fread(&SizeOfName, sizeof(SizeOfName), 1, pFile);
					nBytesRead += nItemsRead * sizeof(SizeOfName);
				}

				unsigned char Size[4];
				nItemsRead = (int)(int)mypsd_fread(&Size, sizeof(Size), 1, pFile);
				nBytesRead += nItemsRead * sizeof(Size);

				image_resource.nSize = Calculate( Size, sizeof(image_resource.nSize) );

				if ( 0 != (image_resource.nSize % 2) )	// resource data must be even
					image_resource.nSize++;
				if ( 0 < image_resource.nSize )
				{
					unsigned char IntValue[4];
					unsigned char ShortValue[2];

					switch( image_resource.nID )
					{
					case 1000:
						{
							// Obsolete - Photoshop 2.0
							mbResolutionInfoFilled_v2 = true;

							nItemsRead = (int)(int)mypsd_fread(&ShortValue, sizeof(ShortValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(ShortValue);
							resolution_info_v2.nChannels = (short)Calculate(ShortValue, sizeof(resolution_info_v2.nChannels) );
							nItemsRead = (int)(int)mypsd_fread(&ShortValue, sizeof(ShortValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(ShortValue);
							resolution_info_v2.nRows = (short)Calculate(ShortValue, sizeof(resolution_info_v2.nRows) );
							nItemsRead = (int)(int)mypsd_fread(&ShortValue, sizeof(ShortValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(ShortValue);
							resolution_info_v2.nColumns = (short)Calculate(ShortValue, sizeof(resolution_info_v2.nColumns) );
							nItemsRead = (int)(int)mypsd_fread(&ShortValue, sizeof(ShortValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(ShortValue);
							resolution_info_v2.nDepth = (short)Calculate(ShortValue, sizeof(resolution_info_v2.nDepth) );
							nItemsRead = (int)(int)mypsd_fread(&ShortValue, sizeof(ShortValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(ShortValue);
							resolution_info_v2.nMode = (short)Calculate(ShortValue, sizeof(resolution_info_v2.nMode) );
						}
						break;
					case 1005:
						{
							mbResolutionInfoFilled = true;

							nItemsRead = (int)(int)mypsd_fread(&ShortValue, sizeof(ShortValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(ShortValue);
							resolution_info.hRes = (short)Calculate(ShortValue, sizeof(resolution_info.hRes) );
							nItemsRead = (int)(int)mypsd_fread(&IntValue, sizeof(IntValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(IntValue);
							resolution_info.hResUnit = Calculate(IntValue, sizeof(resolution_info.hResUnit) );
							nItemsRead = (int)(int)mypsd_fread(&ShortValue, sizeof(ShortValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(ShortValue);
							resolution_info.widthUnit = (short)Calculate(ShortValue, sizeof(resolution_info.widthUnit) );

							nItemsRead = (int)(int)mypsd_fread(&ShortValue, sizeof(ShortValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(ShortValue);
							resolution_info.vRes = (short)Calculate(ShortValue, sizeof(resolution_info.vRes) );
							nItemsRead = (int)(int)mypsd_fread(&IntValue, sizeof(IntValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(IntValue);
							resolution_info.vResUnit = Calculate(IntValue, sizeof(resolution_info.vResUnit) );
							nItemsRead = (int)mypsd_fread(&ShortValue, sizeof(ShortValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(ShortValue);
							resolution_info.heightUnit = (short)Calculate(ShortValue, sizeof(resolution_info.heightUnit) );
						}
						break;
					case 1007:
						{
							mbDisplayInfoFilled = true;

							nItemsRead = (int)mypsd_fread(&ShortValue, sizeof(ShortValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(ShortValue);
							display_info.ColourSpace = (short)Calculate(ShortValue, sizeof(display_info.ColourSpace) );

							for ( unsigned int n = 0; n < 4; ++n )
							{
								nItemsRead = (int)mypsd_fread(&ShortValue, sizeof(ShortValue), 1, pFile);
								nBytesRead += nItemsRead * sizeof(ShortValue);
								display_info.Colour[n] = (short)Calculate(ShortValue, sizeof(display_info.Colour[n]) );
							}

							nItemsRead = (int)mypsd_fread(&ShortValue, sizeof(ShortValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(ShortValue);
							display_info.Opacity = (short)Calculate(ShortValue, sizeof(display_info.Opacity) );
							assert ( 0 <= display_info.Opacity );
							assert ( 100 >= display_info.Opacity );

							unsigned char c[1];
							nItemsRead = (int)mypsd_fread(&c, sizeof(c), 1, pFile);
							nBytesRead += nItemsRead * sizeof(c);
							( 1 == Calculate(c, sizeof(c) ) ) ? display_info.kind = true : display_info.kind = false;

							nItemsRead = (int)mypsd_fread(&c, sizeof(c), 1, pFile);
							nBytesRead += nItemsRead * sizeof(c);
							display_info.padding = (unsigned int)Calculate(c, sizeof(c) );
							assert ( 0 == display_info.padding );
						}
						break;
					case 1034:
						{
							nItemsRead = (int)mypsd_fread(&ShortValue, sizeof(ShortValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(ShortValue);
							( 1 == Calculate(ShortValue, sizeof(ShortValue) ) ) ? mbCopyright = true : mbCopyright = false;
						}
						break;
					case 1033:
					case 1036:
						{
							mbThumbNailFilled = true;

							nItemsRead = (int)mypsd_fread(&IntValue, sizeof(IntValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(IntValue);
							thumbnail.nFormat = Calculate(IntValue, sizeof(thumbnail.nFormat) );

							nItemsRead = (int)mypsd_fread(&IntValue, sizeof(IntValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(IntValue);
							thumbnail.nWidth = Calculate(IntValue, sizeof(thumbnail.nWidth) );

							nItemsRead = (int)mypsd_fread(&IntValue, sizeof(IntValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(IntValue);
							thumbnail.nHeight = Calculate(IntValue, sizeof(thumbnail.nHeight) );

							nItemsRead = (int)mypsd_fread(&IntValue, sizeof(IntValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(IntValue);
							thumbnail.nWidthBytes = Calculate(IntValue, sizeof(thumbnail.nWidthBytes) );

							nItemsRead = (int)mypsd_fread(&IntValue, sizeof(IntValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(IntValue);
							thumbnail.nSize = Calculate(IntValue, sizeof(thumbnail.nSize) );

							nItemsRead = (int)mypsd_fread(&IntValue, sizeof(IntValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(IntValue);
							thumbnail.nCompressedSize = Calculate(IntValue, sizeof(thumbnail.nCompressedSize) );

							nItemsRead = (int)mypsd_fread(&ShortValue, sizeof(ShortValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(ShortValue);
							thumbnail.nBitPerPixel = (short)Calculate(ShortValue, sizeof(thumbnail.nBitPerPixel) );

							nItemsRead = (int)mypsd_fread(&ShortValue, sizeof(ShortValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(ShortValue);
							thumbnail.nPlanes = (short)Calculate(ShortValue, sizeof(thumbnail.nPlanes) );

							int nTotalData = image_resource.nSize - 28; // header
							unsigned char* buffer = new unsigned char[nTotalData];
							unsigned char c[1];
							if ( 1033 == image_resource.nID )
							{
								// In BGR format
								for (int n = 0; n < nTotalData; n = n +3 )
								{
									nItemsRead = (int)mypsd_fread(&c, sizeof(unsigned char), 1, pFile);
									nBytesRead += nItemsRead * sizeof(unsigned char);
									buffer[n+2] = (unsigned char)Calculate(c, sizeof(unsigned char) );
									nItemsRead = (int)mypsd_fread(&c, sizeof(unsigned char), 1, pFile);
									nBytesRead += nItemsRead * sizeof(unsigned char);
									buffer[n+1] = (unsigned char)Calculate(c, sizeof(BYTE) );
									nItemsRead = (int)mypsd_fread(&c, sizeof(unsigned char), 1, pFile);
									nBytesRead += nItemsRead * sizeof(unsigned char);
									buffer[n] = (unsigned char)Calculate(c, sizeof(unsigned char) );
								}
							}
							else if ( 1036 == image_resource.nID )
							{
								// In RGB format										
								for (int n = 0; n < nTotalData; ++n )
								{
									nItemsRead = (int)mypsd_fread(&c, sizeof(BYTE), 1, pFile);
									nBytesRead += nItemsRead * sizeof(BYTE);
									buffer[n] = (BYTE)Calculate(c, sizeof(BYTE) );
								}
							}

							delete[] buffer;
							buffer = 0;
						}
						break;
					case 1037:
						{
							nItemsRead = (int)mypsd_fread(&IntValue, sizeof(IntValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(IntValue);
							mnGlobalAngle = Calculate(IntValue, sizeof(mnGlobalAngle) );
						}
						break;
					case 1046:
						{
							nItemsRead = (int)mypsd_fread(&ShortValue, sizeof(ShortValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(ShortValue);
							mnColourCount = (short)Calculate(ShortValue, sizeof(ShortValue) );
						}
						break;
					case 1047:
						{
							nItemsRead = (int)mypsd_fread(&ShortValue, sizeof(ShortValue), 1, pFile);
							nBytesRead += nItemsRead * sizeof(ShortValue);
							mnTransparentIndex = (short)Calculate(ShortValue, sizeof(ShortValue) );
						}
						break;

					default:
						pFile.Seek(image_resource.nSize, SEEK_CUR);
						nBytesRead += image_resource.nSize;
						break;
					}
				}
			}
		}

		assert ( nBytesRead == nTotalBytes );
		if ( nBytesRead == nTotalBytes )
			bSuccess = true;

		return bSuccess;
	}
	bool CPSD::ReadColourModeData(CxFile &pFile, COLOUR_MODE_DATA& colour_mode_data)
	{
		// Only indexed colour and duotone have colour mode data,
		// for all other modes this section is 4 bytes length, the length field is set to zero

		// For indexed color images, the length will be equal to 768, and the color
		// will contain the color table for the image, in non–interleaved order.

		// For duotone images, the color data will contain the duotone specification,
		// the format of which is not documented. Other applications that read
		// Photoshop files can treat a duotone image as a grayscale image, and just
		// preserve the contents of the duotone information when reading and writing
		// the file.

		// free memory
		if ( 0 < colour_mode_data.nLength )
			delete[] colour_mode_data.ColourData;
		colour_mode_data.ColourData = 0;

		unsigned char Length[4];
		int nItemsRead = (int)mypsd_fread(&Length, sizeof(Length), 1, pFile);

		colour_mode_data.nLength = Calculate( Length, sizeof(colour_mode_data.nLength) );
		if ( 0 < colour_mode_data.nLength )
		{
			colour_mode_data.ColourData = new unsigned char[colour_mode_data.nLength];
			nItemsRead = 0;
			memset(colour_mode_data.ColourData, 254, colour_mode_data.nLength);

			nItemsRead += (int)mypsd_fread( colour_mode_data.ColourData, colour_mode_data.nLength, 1, pFile);

		}

		return true;
	}

	bool CPSD::ReadHeader(CxFile &pFile, HEADER_INFO& header_info)
	{
		bool bSuccess = false;

		struct HEADER
		{
			char Signature[4];	// always equal 8BPS, do not read file if not
			unsigned char Version[2];	// always equal 1, do not read file if not
			char Reserved[6];	// must be zero
			unsigned char Channels[2];	// numer of channels including any alpha channels, supported range 1 to 24
			unsigned char Rows[4];		// height in PIXELS, supported range 1 to 30000
			unsigned char Columns[4];	// width in PIXELS, supported range 1 to 30000
			unsigned char Depth[2];		// number of bpp
			unsigned char Mode[2];		// colour mode of the file,
			// Btmap=0, Grayscale=1, Indexed=2, RGB=3,
			// CMYK=4, Multichannel=7, Duotone=8, Lab=9
		};

		HEADER header;
		int nItemsRead = (int)mypsd_fread(&header, sizeof(HEADER), 1, pFile);
		if ( nItemsRead )
		{
			if ( 0 == ::memcmp(header.Signature, "8BPS", 4))
			{
				int nVersion = Calculate( header.Version, sizeof(header.Version) );

				if ( 1 == nVersion )
				{
					unsigned int n = 0;
					bool bOK = true;
					while ( (n < 6) && bOK )
					{
						if ( '\0' != header.Reserved[n] )
							bOK = false;
						n++;
					}
					bSuccess = bOK;

					if ( bSuccess )
					{
						header_info.nChannels = (short)Calculate( header.Channels, sizeof(header.Channels) );
						header_info.nHeight = Calculate( header.Rows, sizeof(header.Rows) );
						header_info.nWidth = Calculate( header.Columns, sizeof(header.Columns) );
						header_info.nBitsPerPixel = (short)Calculate( header.Depth, sizeof(header.Depth) );
						header_info.nColourMode = (short)Calculate( header.Mode, sizeof(header.Mode) );
					}
				}
			}
		}

		return bSuccess;
	}


	void CPSD::ProccessBuffer(unsigned char* pData )
	{
		if (!pData) return;

		switch ( header_info.nColourMode )
		{
		case 1:		// Grayscale
		case 8:		// Duotone
			{
				bool bAlpha = header_info.nChannels > 1;

				int nPixels = header_info.nWidth * header_info.nHeight;
				byte *pRGBA = new byte[nPixels * (bAlpha ? 4 : 3)];
				byte *pSrc = pData, *pDst = pRGBA;
				for (int i = 0; i < nPixels; i++, pSrc += header_info.nChannels, pDst += bAlpha ? 4 : 3)
				{
					pDst[0] = pDst[1] = pDst[2] = pSrc[0];
					if (bAlpha) pDst[3] = pSrc[1];
				}
				
				m_image.CreateFromArray(pRGBA, header_info.nWidth, header_info.nHeight, bAlpha ? 32 : 24, header_info.nWidth * (bAlpha ? 4 : 3), true);

				delete [] pRGBA;
			}
			break;
		case 2:		// Indexed
			{
				if (!colour_mode_data.ColourData) break;
				if (colour_mode_data.nLength != 768) break;
				if (mnColourCount == 0) break;

				int nPixels = header_info.nWidth * header_info.nHeight;
				byte *pRGB = new byte[nPixels * 3];
				::memset(pRGB, 0, nPixels * 3);
				byte *pSrc = pData, *pDst = pRGB;
				for (int i = 0; i < nPixels; i++, pSrc += header_info.nChannels, pDst += 3)
				{
					int nIndex = *pSrc;
					pDst[2] = colour_mode_data.ColourData[nIndex + 0 * 256];
					pDst[1] = colour_mode_data.ColourData[nIndex + 1 * 256];
					pDst[0] = colour_mode_data.ColourData[nIndex + 2 * 256];
				}

				m_image.CreateFromArray(pRGB, header_info.nWidth, header_info.nHeight, 24, header_info.nWidth * 3, true);
				delete [] pRGB;
			}
			break;
		case 3:	// RGB
			{
				m_image.CreateFromArray(pData, header_info.nWidth, header_info.nHeight, header_info.nChannels == 3 ? 24 : 32, header_info.nWidth * header_info.nChannels, true);
				m_image.SwapRGB2BGR();
			}
			break;
		case 4:	// CMYK
			{
				bool bAlpha = header_info.nChannels > 4;

				int nPixels = header_info.nWidth * header_info.nHeight;
				byte *pRGBA = new byte[nPixels * (bAlpha ? 4 : 3)];
				byte *pSrc = pData, *pDst = pRGBA;
				double C, M, Y, K;
				int	nRed, nGreen, nBlue;
				for (int i = 0; i < nPixels; i++, pSrc += header_info.nChannels, pDst += bAlpha ? 4 : 3)
				{
					C = (1.0 - (double)pSrc[0] / 256);
					M = (1.0 - (double)pSrc[1] / 256);
					Y = (1.0 - (double)pSrc[2] / 256);
					K = (1.0 - (double)pSrc[3] / 256);
					
					CMYKToRGB(C, M, Y, K, nRed, nGreen, nBlue);

					if (0 > nRed) nRed = 0;		else if (255 < nRed) nRed = 255;
					if (0 > nGreen) nGreen = 0;	else if (255 < nGreen) nGreen = 255;
					if (0 > nBlue) nBlue = 0;	else if (255 < nBlue) nBlue = 255;

					pDst[0] = nBlue; pDst[1] = nGreen; pDst[2] = nRed;
					if (bAlpha) pDst[3] = pSrc[4];
				}

				m_image.CreateFromArray(pRGBA, header_info.nWidth, header_info.nHeight, bAlpha ? 32 : 24, header_info.nWidth * (bAlpha ? 4 : 3), true);

				delete [] pRGBA;
			}
			break;
		case 7:		// Multichannel
			{
				if (header_info.nChannels == 0 || header_info.nChannels > 4) break; // ???

				int nPixels = header_info.nWidth * header_info.nHeight;
				byte *pRGB = new byte[nPixels * 3];
				byte *pSrc = pData, *pDst = pRGB;
				double C, M, Y, K;
				int	nRed, nGreen, nBlue;
				for (int i = 0; i < nPixels; i++, pSrc += header_info.nChannels, pDst += 3)
				{
					C = M = Y = K = 0;
					C = (1.0 - (double)pSrc[0] / 256);
					if (header_info.nChannels > 1) M = (1.0 - (double)pSrc[1] / 256);
					if (header_info.nChannels > 2) Y = (1.0 - (double)pSrc[2] / 256);
					if (header_info.nChannels > 3) K = (1.0 - (double)pSrc[3] / 256);

					CMYKToRGB(C, M, Y, K, nRed, nGreen, nBlue);

					if (0 > nRed) nRed = 0;		else if (255 < nRed) nRed = 255;
					if (0 > nGreen) nGreen = 0;	else if (255 < nGreen) nGreen = 255;
					if (0 > nBlue) nBlue = 0;	else if (255 < nBlue) nBlue = 255;

					pDst[0] = nBlue; pDst[1] = nGreen; pDst[2] = nRed;
				}

				m_image.CreateFromArray(pRGB, header_info.nWidth, header_info.nHeight, 24, header_info.nWidth * 3, true);

				delete [] pRGB;
			}
			break;
		case 9:	// Lab
			{
				bool bAlpha = header_info.nChannels > 3;

				int nPixels = header_info.nWidth * header_info.nHeight;
				byte *pRGBA = new byte[nPixels * (bAlpha ? 4 : 3)];
				byte *pSrc = pData, *pDst = pRGBA;

				double L_coef = 256.f / 100.f, a_coef = 256.f / 256.f, b_coef = 256.f / 256.f;
				int L, a, b;
				int	nRed, nGreen, nBlue;
				for (int i = 0; i < nPixels; i++, pSrc += header_info.nChannels, pDst += bAlpha ? 4 : 3)
				{
					L = (int)((float)pSrc[0] / L_coef);
					a = (int)((float)pSrc[1] / a_coef - 128.0);
					b = (int)((float)pSrc[2] / b_coef - 128.0);

					LabToRGB(L, a, b, nRed, nGreen, nBlue );

					if (0 > nRed) nRed = 0;		else if (255 < nRed) nRed = 255;
					if (0 > nGreen) nGreen = 0;	else if (255 < nGreen) nGreen = 255;
					if (0 > nBlue) nBlue = 0;	else if (255 < nBlue) nBlue = 255;

					pDst[0] = nBlue; pDst[1] = nGreen; pDst[2] = nRed;
					if (bAlpha) pDst[3] = pSrc[3];
				}

				m_image.CreateFromArray(pRGBA, header_info.nWidth, header_info.nHeight, bAlpha ? 32 : 24, header_info.nWidth * (bAlpha ? 4 : 3), true);

				delete [] pRGBA;
			}
			break;
		}
	}

	int CPSD::Load(LPCTSTR szPathName)
	{
		CxIOFile	f;
		if (!f.Open(szPathName, _T("rb"))) return -1;
		return Load(f);
	}

	int CPSD::Load(CxFile &f)	
	{
		if (!ReadHeader(f, header_info)) return -2; // Error in header
		if (!ReadColourModeData(f, colour_mode_data)) return -3; // Error in ColourMode Data
		if (!ReadImageResource(f, image_resource)) return -4; // Error in Image Resource
		if (!ReadLayerAndMaskInfoSection(f)) return -5; // Error in Mask Info
		if (ReadImageData(f) != 0) return -6; // Error in Image Data
		return 0; // all right
	}

	int CPSD::DecodeRawData( CxFile &pFile)
	{
		if (header_info.nBitsPerPixel != 8 && header_info.nBitsPerPixel != 16) return -7; // can't read this

		int nWidth = header_info.nWidth;
		int nHeight = header_info.nHeight;
		int bytesPerPixelPerChannel = header_info.nBitsPerPixel / 8;

		int nPixels = nWidth * nHeight;
		int nTotalBytes = 0;

		byte* pData = NULL;

		switch ( header_info.nColourMode )
		{
		case 1:	// Grayscale
		case 2:	// Indexed
		case 3:	// RGB
		case 4:	// CMYK
		case 8:	// Duotone
		case 9:	// Lab
			{
				// read RRRRRRRGGGGGGGBBBBBBAAAAAA data
				int	nAllDataSize = nPixels * bytesPerPixelPerChannel * header_info.nChannels;
				byte *pFileData = new byte[nAllDataSize];
				::memset(pFileData, 0, nAllDataSize);
				if (pFile.Read(pFileData, nAllDataSize, 1) != 1)
				{
					delete [] pFileData;
					return -1; // bad data
				}

				// and convert them to RGBARGBARGBA data (depends on number of channels)
				nTotalBytes = nPixels * header_info.nChannels;
				pData = new byte[nTotalBytes];
				byte *pSource = pFileData;
				for (int nChannel = 0; nChannel < header_info.nChannels; nChannel++)
				{
					byte *pDest = pData + nChannel;
					for (int pos = 0; pos < nPixels; pos++, pDest += header_info.nChannels, pSource += bytesPerPixelPerChannel) *pDest = *pSource;
				}
				delete [] pFileData;
			}
			break;
		default:
			return -1; // unsupported format
		}

		ProccessBuffer(pData);
		delete [] pData;

		// dpi related things
		int ppm_x = 3780;	// 96 dpi
		int ppm_y = 3780;	// 96 dpi
		if (mbResolutionInfoFilled)
		{
			int nHorResolution = (int)resolution_info.hRes;
			int nVertResolution = (int)resolution_info.vRes;
			ppm_x = (nHorResolution * 10000) / 254;
			ppm_y = (nVertResolution * 10000) / 254;
		}
		m_image.SetXDPI(ppm_x);
		m_image.SetYDPI(ppm_y);

		return 0;
	}


	int CPSD::DecodeRLEData(CxFile & pFile)
	{
		if (header_info.nBitsPerPixel != 8) return -7; // can't read this

		int nWidth = header_info.nWidth;
		int nHeight = header_info.nHeight;
		int nPixels = nWidth * nHeight;

		// The RLE-compressed data is preceeded by a 2-byte data count for each row in the data
		// read them and compute size of RLE data
		int nLengthDataSize = nHeight * header_info.nChannels * 2;
		byte *pLengthData = new byte[nLengthDataSize];
		if (pFile.Read(pLengthData, nLengthDataSize, 1) != 1)
		{
			delete [] pLengthData;
			return -1; // error while reading
		}
		int nRLEDataSize = 0;
		for (int i = 0; i < nHeight * header_info.nChannels * 2; i += 2)
			nRLEDataSize += Calculate(pLengthData + i, 2);
		delete [] pLengthData;

		// now read RLE data to the buffer for fast access
		byte *pRLEData = new byte[nRLEDataSize];
		if (pFile.Read(pRLEData, nRLEDataSize, 1) != 1)
		{
			delete [] pRLEData;
			return -1;
		}

		// allocate buffer for raw data (RRRRRRR...RRRGGGGG...GGGGGGBBBBB...BBBBBAAAAA....AAAAA) it has the same size as the final buffer
		// and the perform RLE-decoding
		int nTotalBytes = nPixels * header_info.nChannels;
		byte* pRawData = new byte[nTotalBytes];
		byte *pRLESource = pRLEData, *pRLEDest = pRawData;
		for (int channel = 0; channel < header_info.nChannels; channel++)
		{
			int nCount = 0;
			while (nCount < nPixels)
			{
				int len = *pRLESource++;
				if ( 128 > len )
				{ // copy next (len + 1) bytes as is
					len++;
					nCount += len;
					::memcpy(pRLEDest, pRLESource, len);
					pRLEDest += len; pRLESource += len;
				}
				else if ( 128 < len )
				{
					// Next -len+1 bytes in the dest are replicated from next source byte.
					// (Interpret len as a negative 8-bit int.)
					len ^= 0x0FF;
					len += 2;
					nCount += len;
					::memset(pRLEDest, *pRLESource++, len);
					pRLEDest += len;
				}
				else if ( 128 == len ) { /* Do nothing */ }
			}
		}
		delete [] pRLEData;

		// transform raw data to the good one (RGBARGBARGBA...RGBA)
		byte *pRawSource = pRawData;
		byte *pData = new byte[nTotalBytes];
		int nPixelCounter = 0;
		for( int nColour = 0; nColour < header_info.nChannels; ++nColour )
		{
			nPixelCounter = nColour;
			for (int nPos = 0; nPos < nPixels; nPos++, pRawSource++)
			{
				pData[nPixelCounter] = *pRawSource;
				nPixelCounter += header_info.nChannels;
			}
		}
		delete[] pRawData;

		// create image
		ProccessBuffer(pData);
		delete [] pData;

		// dpi related things
		int ppm_x = 3780;	// 96 dpi
		int ppm_y = 3780;	// 96 dpi
		if (mbResolutionInfoFilled)
		{
			int nHorResolution = (int)resolution_info.hRes;
			int nVertResolution = (int)resolution_info.vRes;
			ppm_x = (nHorResolution * 10000) / 254;
			ppm_y = (nVertResolution * 10000) / 254;
		}
		m_image.SetXDPI(ppm_x);
		m_image.SetYDPI(ppm_y);

		return 0;
	}

	int CPSD::ReadImageData(CxFile &pFile)
	{
		int nErrorCode = 0;	// No Errors

 		if ( !mypsd_feof(pFile) )
		{
			unsigned char ShortValue[2];
			int nBytesRead = 0;
			int nItemsRead = (int)mypsd_fread(&ShortValue, sizeof(ShortValue), 1, pFile);
			short nCompression = (short)Calculate( ShortValue, sizeof(ShortValue) );

			switch ( nCompression )
			{
			case 0:	// raw data
				nErrorCode = DecodeRawData(pFile);
				break;
			case 1:	// RLE compression
				nErrorCode = DecodeRLEData(pFile);
				break;
			case 2:	// ZIP without prediction
				nErrorCode = -10;	// ZIP without prediction, no specification
				break;
			case 3:	// ZIP with prediction
				nErrorCode = -11;	// ZIP with prediction, no specification
				break;
			default:
				nErrorCode = -12;	// Unknown format
			}
		}
		return nErrorCode;
	}

	//////////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////////
	CPSD::HEADER_INFO::HEADER_INFO()
	{
		nChannels = -1;
		nHeight = -1;
		nWidth = -1;
		nBitsPerPixel = -1;
		nColourMode = -1;
	}

	CPSD::COLOUR_MODE_DATA::COLOUR_MODE_DATA()
	{
		nLength = -1;
		ColourData = 0;
	}

	CPSD::IMAGE_RESOURCE::IMAGE_RESOURCE()
	{
		Name = 0;
		Reset();
	}

	void CPSD::IMAGE_RESOURCE::Reset()
	{
		nLength = -1;
		memset( OSType, '\0', sizeof(OSType) );
		nID = -1;
		if ( Name )
			delete[] Name;
		Name = 0;
		nSize = -1;
	}

	CPSD::RESOLUTION_INFO::RESOLUTION_INFO()
	{
		hRes = -1;
		hResUnit = -1;
		widthUnit = -1;
		vRes = -1;
		vResUnit = -1;
		heightUnit = -1;
	}

	CPSD::RESOLUTION_INFO_v2::RESOLUTION_INFO_v2()
	{
		nChannels = -1;
		nRows = -1;
		nColumns = -1;
		nDepth = -1;
		nMode = -1;
	}

	CPSD::DISPLAY_INFO::DISPLAY_INFO()
	{
		ColourSpace = -1;
		for ( unsigned int n = 0; n < 4; ++n)
			Colour[n] = 0;
		Opacity = -1;
		kind = false;
		padding = '0';
	}

	CPSD::THUMBNAIL::THUMBNAIL()
	{
		nFormat = -1;
		nWidth = -1;
		nHeight = -1;
		nWidthBytes = -1;
		nSize = -1;
		nCompressedSize = -1;
		nBitPerPixel = -1;
		nPlanes = -1;
		Data = 0;
	}
}	// MyPSD

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
#endif //CXIMAGE_USE_LIBPSD

////////////////////////////////////////////////////////////////////////////////
#if CXIMAGE_SUPPORT_DECODE
////////////////////////////////////////////////////////////////////////////////
bool CxImagePSD::Decode(CxFile *hFile)
{
	if (hFile==NULL)
		return false;

#if CXIMAGE_USE_LIBPSD
	psd_context* context = NULL;
#endif

  cx_try
  {
#if CXIMAGE_USE_LIBPSD

	psd_status status;

	context = (psd_context *)malloc(sizeof(psd_context));
	if(context == NULL){
		cx_throw("CxImagePSD: psd_status_malloc_failed");
	}
	memset(context, 0, sizeof(psd_context));

	// install file manager
	CxFilePsd src(hFile,context);

	context->state = PSD_FILE_HEADER;
	context->stream.file_length = hFile->Size();
	context->load_tag = psd_load_tag_all;
	status = psd_main_loop(context);
	
	if(status != psd_status_done){
		cx_throw("CxImagePSD: psd_main_loop failed");
	}

	Create(context->width,context->height,24,CXIMAGE_FORMAT_PSD);

	uint8_t* rgba = (uint8_t*)context->merged_image_data;
	uint8_t* alpha = NULL;
	if (context->alpha_channel_info)
		alpha = (uint8_t*)context->alpha_channel_info->channel_data;

#if CXIMAGE_SUPPORT_ALPHA
	if (alpha)
		AlphaCreate();
#endif

	int32_t x,y;
	RGBQUAD c;
	c.rgbReserved = 0;
	if (rgba){
		for(y =context->height-1; y--;){
			for (x=0; x<context->width; x++){
				c.rgbBlue  = *rgba++;
				c.rgbGreen = *rgba++;
				c.rgbRed   = *rgba++;
				rgba++;
				SetPixelColor(x,y,c);
#if CXIMAGE_SUPPORT_ALPHA
				if (alpha) AlphaSet(x,y,*alpha++);
#endif //CXIMAGE_SUPPORT_ALPHA
			}
		}
	}

	psd_image_free(context);
	free(context);

#else //CXIMAGE_USE_LIBPSD == 0

	MyPSD::CPSD psd(*this);
	int nErrorCode = psd.Load(*hFile);
	if (nErrorCode != 0) cx_throw("error loading PSD file");

#endif //CXIMAGE_USE_LIBPSD

  } cx_catch {

#if CXIMAGE_USE_LIBPSD
	psd_image_free(context);
	if (context) free(context);
#endif //CXIMAGE_USE_LIBPSD

	if (strcmp(message,"")) strncpy(info.szLastError,message,255);
	if (info.nEscape == -1 && info.dwType == CXIMAGE_FORMAT_PSD) return true;
	return false;
  }
	/* that's it */
	return true;
}

////////////////////////////////////////////////////////////////////////////////
#endif //CXIMAGE_SUPPORT_DECODE
////////////////////////////////////////////////////////////////////////////////
#if CXIMAGE_SUPPORT_ENCODE
////////////////////////////////////////////////////////////////////////////////
bool CxImagePSD::Encode(CxFile * hFile)
{
	if (hFile == NULL) return false;
	strcpy(info.szLastError, "Save PSD not supported");
	return false;
}
////////////////////////////////////////////////////////////////////////////////
#endif // CXIMAGE_SUPPORT_ENCODE
////////////////////////////////////////////////////////////////////////////////
#endif // CXIMAGE_SUPPORT_PSD

