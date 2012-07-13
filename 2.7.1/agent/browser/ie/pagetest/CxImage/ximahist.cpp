// xImaHist.cpp : histogram functions
/* 28/01/2004 v1.00 - www.xdp.it
 * CxImage version 7.0.1 07/Jan/2011
 */

#include "ximage.h"

#if CXIMAGE_SUPPORT_DSP

////////////////////////////////////////////////////////////////////////////////
int32_t CxImage::Histogram(int32_t* red, int32_t* green, int32_t* blue, int32_t* gray, int32_t colorspace)
{
	if (!pDib) return 0;
	RGBQUAD color;

	if (red) memset(red,0,256*sizeof(int32_t));
	if (green) memset(green,0,256*sizeof(int32_t));
	if (blue) memset(blue,0,256*sizeof(int32_t));
	if (gray) memset(gray,0,256*sizeof(int32_t));

	int32_t xmin,xmax,ymin,ymax;
	if (pSelection){
		xmin = info.rSelectionBox.left; xmax = info.rSelectionBox.right;
		ymin = info.rSelectionBox.bottom; ymax = info.rSelectionBox.top;
	} else {
		xmin = ymin = 0;
		xmax = head.biWidth; ymax=head.biHeight;
	}

	for(int32_t y=ymin; y<ymax; y++){
		for(int32_t x=xmin; x<xmax; x++){
#if CXIMAGE_SUPPORT_SELECTION
			if (BlindSelectionIsInside(x,y))
#endif //CXIMAGE_SUPPORT_SELECTION
			{
				switch (colorspace){
				case 1:
					color = HSLtoRGB(BlindGetPixelColor(x,y));
					break;
				case 2:
					color = YUVtoRGB(BlindGetPixelColor(x,y));
					break;
				case 3:
					color = YIQtoRGB(BlindGetPixelColor(x,y));
					break;
				case 4:
					color = XYZtoRGB(BlindGetPixelColor(x,y));
					break;
				default:
					color = BlindGetPixelColor(x,y);
				}

				if (red) red[color.rgbRed]++;
				if (green) green[color.rgbGreen]++;
				if (blue) blue[color.rgbBlue]++;
				if (gray) gray[(uint8_t)RGB2GRAY(color.rgbRed,color.rgbGreen,color.rgbBlue)]++;
			}
		}
	}

	int32_t n=0;
	for (int32_t i=0; i<256; i++){
		if (red && red[i]>n) n=red[i];
		if (green && green[i]>n) n=green[i];
		if (blue && blue[i]>n) n=blue[i];
		if (gray && gray[i]>n) n=gray[i];
	}

	return n;
}
////////////////////////////////////////////////////////////////////////////////
/**
 * HistogramStretch
 * \param method: 0 = luminance (default), 1 = linked channels , 2 = independent channels.
 * \param threshold: minimum percentage level in the histogram to recognize it as meaningful. Range: 0.0 to 1.0; default = 0; typical = 0.005 (0.5%);
 * \return true if everything is ok
 * \author [dave] and [nipper]; changes [DP]
 */
bool CxImage::HistogramStretch(int32_t method, double threshold)
{
	if (!pDib) return false;

	double dbScaler = 50.0/head.biHeight;
	int32_t x,y;

  if ((head.biBitCount==8) && IsGrayScale()){

	double p[256];
	memset(p,  0, 256*sizeof(double));
	for (y=0; y<head.biHeight; y++)
	{
		info.nProgress = (int32_t)(y*dbScaler);
		if (info.nEscape) break;
		for (x=0; x<head.biWidth; x++)	{
			p[BlindGetPixelIndex(x, y)]++;
		}
	}

	double maxh = 0;
	for (y=0; y<255; y++) if (maxh < p[y]) maxh = p[y];
	threshold *= maxh;
	int32_t minc = 0;
	while (minc<255 && p[minc]<=threshold) minc++;
	int32_t maxc = 255;
	while (maxc>0 && p[maxc]<=threshold) maxc--;

	if (minc == 0 && maxc == 255) return true;
	if (minc >= maxc) return true;

	// calculate LUT
	uint8_t lut[256];
	for (x = 0; x <256; x++){
		lut[x] = (uint8_t)max(0,min(255,(255 * (x - minc) / (maxc - minc))));
	}

	for (y=0; y<head.biHeight; y++)	{
		if (info.nEscape) break;
		info.nProgress = (int32_t)(50.0+y*dbScaler);
		for (x=0; x<head.biWidth; x++)
		{
			BlindSetPixelIndex(x, y, lut[BlindGetPixelIndex(x, y)]);
		}
	}
  } else {
	switch(method){
	case 1:
	  { // <nipper>
		double p[256];
		memset(p,  0, 256*sizeof(double));
		for (y=0; y<head.biHeight; y++)
		{
			info.nProgress = (int32_t)(y*dbScaler);
			if (info.nEscape) break;
			for (x=0; x<head.biWidth; x++)	{
				RGBQUAD color = BlindGetPixelColor(x, y);
				p[color.rgbRed]++;
				p[color.rgbBlue]++;
				p[color.rgbGreen]++;
			}
		}
		double maxh = 0;
		for (y=0; y<255; y++) if (maxh < p[y]) maxh = p[y];
		threshold *= maxh;
		int32_t minc = 0;
		while (minc<255 && p[minc]<=threshold) minc++;
		int32_t maxc = 255;
		while (maxc>0 && p[maxc]<=threshold) maxc--;

		if (minc == 0 && maxc == 255) return true;
		if (minc >= maxc) return true;

		// calculate LUT
		uint8_t lut[256];
		for (x = 0; x <256; x++){
			lut[x] = (uint8_t)max(0,min(255,(255 * (x - minc) / (maxc - minc))));
		}

		// normalize image
		for (y=0; y<head.biHeight; y++)	{
			if (info.nEscape) break;
			info.nProgress = (int32_t)(50.0+y*dbScaler);

			for (x=0; x<head.biWidth; x++)
			{
				RGBQUAD color = BlindGetPixelColor(x, y);

				color.rgbRed = lut[color.rgbRed];
				color.rgbBlue = lut[color.rgbBlue];
				color.rgbGreen = lut[color.rgbGreen];

				BlindSetPixelColor(x, y, color);
			}
		}
	  }
		break;
	case 2:
	  { // <nipper>
		double pR[256];
		memset(pR,  0, 256*sizeof(double));
		double pG[256];
		memset(pG,  0, 256*sizeof(double));
		double pB[256];
		memset(pB,  0, 256*sizeof(double));
		for (y=0; y<head.biHeight; y++)
		{
			info.nProgress = (int32_t)(y*dbScaler);
			if (info.nEscape) break;
			for (int32_t x=0; x<head.biWidth; x++)	{
				RGBQUAD color = BlindGetPixelColor(x, y);
				pR[color.rgbRed]++;
				pB[color.rgbBlue]++;
				pG[color.rgbGreen]++;
			}
		}

		double maxh = 0;
		for (y=0; y<255; y++) if (maxh < pR[y]) maxh = pR[y];
		double threshold2 = threshold*maxh;
		int32_t minR = 0;
		while (minR<255 && pR[minR]<=threshold2) minR++;
		int32_t maxR = 255;
		while (maxR>0 && pR[maxR]<=threshold2) maxR--;

		maxh = 0;
		for (y=0; y<255; y++) if (maxh < pG[y]) maxh = pG[y];
		threshold2 = threshold*maxh;
		int32_t minG = 0;
		while (minG<255 && pG[minG]<=threshold2) minG++;
		int32_t maxG = 255;
		while (maxG>0 && pG[maxG]<=threshold2) maxG--;

		maxh = 0;
		for (y=0; y<255; y++) if (maxh < pB[y]) maxh = pB[y];
		threshold2 = threshold*maxh;
		int32_t minB = 0;
		while (minB<255 && pB[minB]<=threshold2) minB++;
		int32_t maxB = 255;
		while (maxB>0 && pB[maxB]<=threshold2) maxB--;

		if (minR == 0 && maxR == 255 && minG == 0 && maxG == 255 && minB == 0 && maxB == 255)
			return true;

		// calculate LUT
		uint8_t lutR[256];
		uint8_t range = maxR - minR;
		if (range != 0)	{
			for (x = 0; x <256; x++){
				lutR[x] = (uint8_t)max(0,min(255,(255 * (x - minR) / range)));
			}
		} else lutR[minR] = minR;

		uint8_t lutG[256];
		range = maxG - minG;
		if (range != 0)	{
			for (x = 0; x <256; x++){
				lutG[x] = (uint8_t)max(0,min(255,(255 * (x - minG) / range)));
			}
		} else lutG[minG] = minG;
			
		uint8_t lutB[256];
		range = maxB - minB;
		if (range != 0)	{
			for (x = 0; x <256; x++){
				lutB[x] = (uint8_t)max(0,min(255,(255 * (x - minB) / range)));
			}
		} else lutB[minB] = minB;

		// normalize image
		for (y=0; y<head.biHeight; y++)
		{
			info.nProgress = (int32_t)(50.0+y*dbScaler);
			if (info.nEscape) break;

			for (x=0; x<head.biWidth; x++)
			{
				RGBQUAD color = BlindGetPixelColor(x, y);

				color.rgbRed = lutR[color.rgbRed];
				color.rgbBlue = lutB[color.rgbBlue];
				color.rgbGreen = lutG[color.rgbGreen];

				BlindSetPixelColor(x, y, color);
			}
		}
	  }
		break;
	default:
	  { // <dave>
		double p[256];
		memset(p,  0, 256*sizeof(double));
		for (y=0; y<head.biHeight; y++)
		{
			info.nProgress = (int32_t)(y*dbScaler);
			if (info.nEscape) break;
			for (x=0; x<head.biWidth; x++)	{
				RGBQUAD color = BlindGetPixelColor(x, y);
				p[RGB2GRAY(color.rgbRed, color.rgbGreen, color.rgbBlue)]++;
			}
		}

		double maxh = 0;
		for (y=0; y<255; y++) if (maxh < p[y]) maxh = p[y];
		threshold *= maxh;
		int32_t minc = 0;
		while (minc<255 && p[minc]<=threshold) minc++;
		int32_t maxc = 255;
		while (maxc>0 && p[maxc]<=threshold) maxc--;

		if (minc == 0 && maxc == 255) return true;
		if (minc >= maxc) return true;

		// calculate LUT
		uint8_t lut[256];
		for (x = 0; x <256; x++){
			lut[x] = (uint8_t)max(0,min(255,(255 * (x - minc) / (maxc - minc))));
		}

		for(y=0; y<head.biHeight; y++){
			info.nProgress = (int32_t)(50.0+y*dbScaler);
			if (info.nEscape) break;
			for(x=0; x<head.biWidth; x++){

				RGBQUAD color = BlindGetPixelColor( x, y );
				RGBQUAD yuvClr = RGBtoYUV(color);
				yuvClr.rgbRed = lut[yuvClr.rgbRed];
				color = YUVtoRGB(yuvClr);
				BlindSetPixelColor( x, y, color );
			}
		}
	  }
	}
  }
  return true;
}
////////////////////////////////////////////////////////////////////////////////
// HistogramEqualize function by <dave> : dave(at)posortho(dot)com
bool CxImage::HistogramEqualize()
{
	if (!pDib) return false;

    int32_t histogram[256];
	int32_t map[256];
	int32_t equalize_map[256];
    int32_t x, y, i, j;
	RGBQUAD color;
	RGBQUAD	yuvClr;
	uint32_t YVal, high, low;

	memset( &histogram, 0, sizeof(int32_t) * 256 );
	memset( &map, 0, sizeof(int32_t) * 256 );
	memset( &equalize_map, 0, sizeof(int32_t) * 256 );
 
     // form histogram
	for(y=0; y < head.biHeight; y++){
		info.nProgress = (int32_t)(50*y/head.biHeight);
		if (info.nEscape) break;
		for(x=0; x < head.biWidth; x++){
			color = BlindGetPixelColor( x, y );
			YVal = (uint32_t)RGB2GRAY(color.rgbRed, color.rgbGreen, color.rgbBlue);
			histogram[YVal]++;
		}
	}

	// integrate the histogram to get the equalization map.
	j = 0;
	for(i=0; i <= 255; i++){
		j += histogram[i];
		map[i] = j; 
	}

	// equalize
	low = map[0];
	high = map[255];
	if (low == high) return false;
	for( i = 0; i <= 255; i++ ){
		equalize_map[i] = (uint32_t)((((double)( map[i] - low ) ) * 255) / ( high - low ) );
	}

	// stretch the histogram
	if(head.biClrUsed == 0){ // No Palette
		for( y = 0; y < head.biHeight; y++ ){
			info.nProgress = (int32_t)(50+50*y/head.biHeight);
			if (info.nEscape) break;
			for( x = 0; x < head.biWidth; x++ ){

				color = BlindGetPixelColor( x, y );
				yuvClr = RGBtoYUV(color);

                yuvClr.rgbRed = (uint8_t)equalize_map[yuvClr.rgbRed];

				color = YUVtoRGB(yuvClr);
				BlindSetPixelColor( x, y, color );
			}
		}
	} else { // Palette
		for( i = 0; i < (int32_t)head.biClrUsed; i++ ){

			color = GetPaletteColor((uint8_t)i);
			yuvClr = RGBtoYUV(color);

            yuvClr.rgbRed = (uint8_t)equalize_map[yuvClr.rgbRed];

			color = YUVtoRGB(yuvClr);
			SetPaletteColor( (uint8_t)i, color );
		}
	}
	return true;
}
////////////////////////////////////////////////////////////////////////////////
// HistogramNormalize function by <dave> : dave(at)posortho(dot)com
bool CxImage::HistogramNormalize()
{
	if (!pDib) return false;

	int32_t histogram[256];
	int32_t threshold_intensity, intense;
	int32_t x, y, i;
	uint32_t normalize_map[256];
	uint32_t high, low, YVal;

	RGBQUAD color;
	RGBQUAD	yuvClr;

	memset( &histogram, 0, sizeof( int32_t ) * 256 );
	memset( &normalize_map, 0, sizeof( uint32_t ) * 256 );
 
     // form histogram
	for(y=0; y < head.biHeight; y++){
		info.nProgress = (int32_t)(50*y/head.biHeight);
		if (info.nEscape) break;
		for(x=0; x < head.biWidth; x++){
			color = BlindGetPixelColor( x, y );
			YVal = (uint32_t)RGB2GRAY(color.rgbRed, color.rgbGreen, color.rgbBlue);
			histogram[YVal]++;
		}
	}

	// find histogram boundaries by locating the 1 percent levels
	threshold_intensity = ( head.biWidth * head.biHeight) / 100;

	intense = 0;
	for( low = 0; low < 255; low++ ){
		intense += histogram[low];
		if( intense > threshold_intensity )	break;
	}

	intense = 0;
	for( high = 255; high != 0; high--){
		intense += histogram[ high ];
		if( intense > threshold_intensity ) break;
	}

	if ( low == high ){
		// Unreasonable contrast;  use zero threshold to determine boundaries.
		threshold_intensity = 0;
		intense = 0;
		for( low = 0; low < 255; low++){
			intense += histogram[low];
			if( intense > threshold_intensity )	break;
		}
		intense = 0;
		for( high = 255; high != 0; high-- ){
			intense += histogram [high ];
			if( intense > threshold_intensity )	break;
		}
	}
	if( low == high ) return false;  // zero span bound

	// Stretch the histogram to create the normalized image mapping.
	for(i = 0; i <= 255; i++){
		if ( i < (int32_t) low ){
			normalize_map[i] = 0;
		} else {
			if(i > (int32_t) high)
				normalize_map[i] = 255;
			else
				normalize_map[i] = ( 255 - 1) * ( i - low) / ( high - low );
		}
	}

	// Normalize
	if( head.biClrUsed == 0 ){
		for( y = 0; y < head.biHeight; y++ ){
			info.nProgress = (int32_t)(50+50*y/head.biHeight);
			if (info.nEscape) break;
			for( x = 0; x < head.biWidth; x++ ){

				color = BlindGetPixelColor( x, y );
				yuvClr = RGBtoYUV( color );

                yuvClr.rgbRed = (uint8_t)normalize_map[yuvClr.rgbRed];

				color = YUVtoRGB( yuvClr );
				BlindSetPixelColor( x, y, color );
			}
		}
	} else {
		for(i = 0; i < (int32_t)head.biClrUsed; i++){

			color = GetPaletteColor( (uint8_t)i );
			yuvClr = RGBtoYUV( color );

            yuvClr.rgbRed = (uint8_t)normalize_map[yuvClr.rgbRed];

			color = YUVtoRGB( yuvClr );
 			SetPaletteColor( (uint8_t)i, color );
		}
	}
	return true;
}
////////////////////////////////////////////////////////////////////////////////
// HistogramLog function by <dave> : dave(at)posortho(dot)com
bool CxImage::HistogramLog()
{
	if (!pDib) return false;

	//q(i,j) = 255/log(1 + |high|) * log(1 + |p(i,j)|);
    int32_t x, y, i;
	RGBQUAD color;
	RGBQUAD	yuvClr;

	uint32_t YVal, high = 1;

    // Find Highest Luminance Value in the Image
	if( head.biClrUsed == 0 ){ // No Palette
		for(y=0; y < head.biHeight; y++){
			info.nProgress = (int32_t)(50*y/head.biHeight);
			if (info.nEscape) break;
			for(x=0; x < head.biWidth; x++){
				color = BlindGetPixelColor( x, y );
				YVal = (uint32_t)RGB2GRAY(color.rgbRed, color.rgbGreen, color.rgbBlue);
				if (YVal > high ) high = YVal;
			}
		}
	} else { // Palette
		for(i = 0; i < (int32_t)head.biClrUsed; i++){
			color = GetPaletteColor((uint8_t)i);
			YVal = (uint32_t)RGB2GRAY(color.rgbRed, color.rgbGreen, color.rgbBlue);
			if (YVal > high ) high = YVal;
		}
	}

	// Logarithm Operator
	double k = 255.0 / ::log( 1.0 + (double)high );
	if( head.biClrUsed == 0 ){
		for( y = 0; y < head.biHeight; y++ ){
			info.nProgress = (int32_t)(50+50*y/head.biHeight);
			if (info.nEscape) break;
			for( x = 0; x < head.biWidth; x++ ){

				color = BlindGetPixelColor( x, y );
				yuvClr = RGBtoYUV( color );
                
				yuvClr.rgbRed = (uint8_t)(k * ::log( 1.0 + (double)yuvClr.rgbRed ) );

				color = YUVtoRGB( yuvClr );
				BlindSetPixelColor( x, y, color );
			}
		}
	} else {
		for(i = 0; i < (int32_t)head.biClrUsed; i++){

			color = GetPaletteColor( (uint8_t)i );
			yuvClr = RGBtoYUV( color );

            yuvClr.rgbRed = (uint8_t)(k * ::log( 1.0 + (double)yuvClr.rgbRed ) );
			
			color = YUVtoRGB( yuvClr );
 			SetPaletteColor( (uint8_t)i, color );
		}
	}
 
	return true;
}

////////////////////////////////////////////////////////////////////////////////
// HistogramRoot function by <dave> : dave(at)posortho(dot)com
bool CxImage::HistogramRoot()
{
	if (!pDib) return false;
	//q(i,j) = sqrt(|p(i,j)|);

    int32_t x, y, i;
	RGBQUAD color;
	RGBQUAD	 yuvClr;
	double	dtmp;
	uint32_t YVal, high = 1;

     // Find Highest Luminance Value in the Image
	if( head.biClrUsed == 0 ){ // No Palette
		for(y=0; y < head.biHeight; y++){
			info.nProgress = (int32_t)(50*y/head.biHeight);
			if (info.nEscape) break;
			for(x=0; x < head.biWidth; x++){
				color = BlindGetPixelColor( x, y );
				YVal = (uint32_t)RGB2GRAY(color.rgbRed, color.rgbGreen, color.rgbBlue);
				if (YVal > high ) high = YVal;
			}
		}
	} else { // Palette
		for(i = 0; i < (int32_t)head.biClrUsed; i++){
			color = GetPaletteColor((uint8_t)i);
			YVal = (uint32_t)RGB2GRAY(color.rgbRed, color.rgbGreen, color.rgbBlue);
			if (YVal > high ) high = YVal;
		}
	}

	// Root Operator
	double k = 256.0 / ::sqrt( 1.0 + (double)high );
	if( head.biClrUsed == 0 ){
		for( y = 0; y < head.biHeight; y++ ){
			info.nProgress = (int32_t)(50+50*y/head.biHeight);
			if (info.nEscape) break;
			for( x = 0; x < head.biWidth; x++ ){

				color = BlindGetPixelColor( x, y );
				yuvClr = RGBtoYUV( color );

				dtmp = k * ::sqrt( (double)yuvClr.rgbRed );
				if ( dtmp > 255.0 )	dtmp = 255.0;
				if ( dtmp < 0 )	dtmp = 0;
                yuvClr.rgbRed = (uint8_t)dtmp;

				color = YUVtoRGB( yuvClr );
				BlindSetPixelColor( x, y, color );
			}
		}
	} else {
		for(i = 0; i < (int32_t)head.biClrUsed; i++){

			color = GetPaletteColor( (uint8_t)i );
			yuvClr = RGBtoYUV( color );

			dtmp = k * ::sqrt( (double)yuvClr.rgbRed );
			if ( dtmp > 255.0 )	dtmp = 255.0;
			if ( dtmp < 0 ) dtmp = 0;
            yuvClr.rgbRed = (uint8_t)dtmp;

			color = YUVtoRGB( yuvClr );
 			SetPaletteColor( (uint8_t)i, color );
		}
	}
 
	return true;
}
////////////////////////////////////////////////////////////////////////////////
#endif
