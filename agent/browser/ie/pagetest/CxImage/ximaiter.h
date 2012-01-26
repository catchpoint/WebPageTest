/*
 * File:	ImaIter.h
 * Purpose:	Declaration of the Platform Independent Image Base Class
 * Author:	Alejandro Aguilar Sierra
 * Created:	1995
 * Copyright:	(c) 1995, Alejandro Aguilar Sierra <asierra(at)servidor(dot)unam(dot)mx>
 *
 * 07/08/2001 Davide Pizzolato - www.xdp.it
 * - removed slow loops
 * - added safe checks
 *
 * Permission is given by the author to freely redistribute and include
 * this code in any program as int32_t as this credit is given where due.
 *
 * COVERED CODE IS PROVIDED UNDER THIS LICENSE ON AN "AS IS" BASIS, WITHOUT WARRANTY
 * OF ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING, WITHOUT LIMITATION, WARRANTIES
 * THAT THE COVERED CODE IS FREE OF DEFECTS, MERCHANTABLE, FIT FOR A PARTICULAR PURPOSE
 * OR NON-INFRINGING. THE ENTIRE RISK AS TO THE QUALITY AND PERFORMANCE OF THE COVERED
 * CODE IS WITH YOU. SHOULD ANY COVERED CODE PROVE DEFECTIVE IN ANY RESPECT, YOU (NOT
 * THE INITIAL DEVELOPER OR ANY OTHER CONTRIBUTOR) ASSUME THE COST OF ANY NECESSARY
 * SERVICING, REPAIR OR CORRECTION. THIS DISCLAIMER OF WARRANTY CONSTITUTES AN ESSENTIAL
 * PART OF THIS LICENSE. NO USE OF ANY COVERED CODE IS AUTHORIZED HEREUNDER EXCEPT UNDER
 * THIS DISCLAIMER.
 *
 * Use at your own risk!
 * ==========================================================
 */

#if !defined(__ImaIter_h)
#define __ImaIter_h

#include "ximage.h"
#include "ximadef.h"

class CImageIterator
{
friend class CxImage;
protected:
	int32_t Itx, Ity;		// Counters
	int32_t Stepx, Stepy;
	uint8_t* IterImage;	//  Image pointer
	CxImage *ima;
public:
	// Constructors
	CImageIterator ( void );
	CImageIterator ( CxImage *image );
	operator CxImage* ();

	// Iterators
	BOOL ItOK ();
	void Reset ();
	void Upset ();
	void SetRow(uint8_t *buf, int32_t n);
	void GetRow(uint8_t *buf, int32_t n);
	uint8_t GetByte( ) { return IterImage[Itx]; }
	void SetByte(uint8_t b) { IterImage[Itx] = b; }
	uint8_t* GetRow(void);
	uint8_t* GetRow(int32_t n);
	BOOL NextRow();
	BOOL PrevRow();
	BOOL NextByte();
	BOOL PrevByte();

	void SetSteps(int32_t x, int32_t y=0) {  Stepx = x; Stepy = y; }
	void GetSteps(int32_t *x, int32_t *y) {  *x = Stepx; *y = Stepy; }
	BOOL NextStep();
	BOOL PrevStep();

	void SetY(int32_t y);	/* AD - for interlace */
	int32_t  GetY() {return Ity;}
	BOOL GetCol(uint8_t* pCol, uint32_t x);
	BOOL SetCol(uint8_t* pCol, uint32_t x);
};

/////////////////////////////////////////////////////////////////////
inline
CImageIterator::CImageIterator(void)
{
	ima = 0;
	IterImage = 0;
	Itx = Ity = 0;
	Stepx = Stepy = 0;
}
/////////////////////////////////////////////////////////////////////
inline
CImageIterator::CImageIterator(CxImage *imageImpl): ima(imageImpl)
{
	if (ima) IterImage = ima->GetBits();
	Itx = Ity = 0;
	Stepx = Stepy = 0;
}
/////////////////////////////////////////////////////////////////////
inline
CImageIterator::operator CxImage* ()
{
	return ima;
}
/////////////////////////////////////////////////////////////////////
inline BOOL CImageIterator::ItOK ()
{
	if (ima) return ima->IsInside(Itx, Ity);
	else	 return FALSE;
}
/////////////////////////////////////////////////////////////////////
inline void CImageIterator::Reset()
{
	if (ima) IterImage = ima->GetBits();
	else	 IterImage=0;
	Itx = Ity = 0;
}
/////////////////////////////////////////////////////////////////////
inline void CImageIterator::Upset()
{
	Itx = 0;
	Ity = ima->GetHeight()-1;
	IterImage = ima->GetBits() + ima->GetEffWidth()*(ima->GetHeight()-1);
}
/////////////////////////////////////////////////////////////////////
inline BOOL CImageIterator::NextRow()
{
	if (++Ity >= (int32_t)ima->GetHeight()) return 0;
	IterImage += ima->GetEffWidth();
	return 1;
}
/////////////////////////////////////////////////////////////////////
inline BOOL CImageIterator::PrevRow()
{
	if (--Ity < 0) return 0;
	IterImage -= ima->GetEffWidth();
	return 1;
}
/* AD - for interlace */
inline void CImageIterator::SetY(int32_t y)
{
	if ((y < 0) || (y > (int32_t)ima->GetHeight())) return;
	Ity = y;
	IterImage = ima->GetBits() + ima->GetEffWidth()*y;
}
/////////////////////////////////////////////////////////////////////
inline void CImageIterator::SetRow(uint8_t *buf, int32_t n)
{
	if (n<0) n = (int32_t)ima->GetEffWidth();
	else n = min(n,(int32_t)ima->GetEffWidth());

	if ((IterImage!=NULL)&&(buf!=NULL)&&(n>0)) memcpy(IterImage,buf,n);
}
/////////////////////////////////////////////////////////////////////
inline void CImageIterator::GetRow(uint8_t *buf, int32_t n)
{
	if ((IterImage!=NULL)&&(buf!=NULL)&&(n>0))
		memcpy(buf,IterImage,min(n,(int32_t)ima->GetEffWidth()));
}
/////////////////////////////////////////////////////////////////////
inline uint8_t* CImageIterator::GetRow()
{
	return IterImage;
}
/////////////////////////////////////////////////////////////////////
inline uint8_t* CImageIterator::GetRow(int32_t n)
{
	SetY(n);
	return IterImage;
}
/////////////////////////////////////////////////////////////////////
inline BOOL CImageIterator::NextByte()
{
	if (++Itx < (int32_t)ima->GetEffWidth()) return 1;
	else
		if (++Ity < (int32_t)ima->GetHeight()){
			IterImage += ima->GetEffWidth();
			Itx = 0;
			return 1;
		} else
			return 0;
}
/////////////////////////////////////////////////////////////////////
inline BOOL CImageIterator::PrevByte()
{
  if (--Itx >= 0) return 1;
  else
	  if (--Ity >= 0){
		  IterImage -= ima->GetEffWidth();
		  Itx = 0;
		  return 1;
	  } else
		  return 0;
}
/////////////////////////////////////////////////////////////////////
inline BOOL CImageIterator::NextStep()
{
	Itx += Stepx;
	if (Itx < (int32_t)ima->GetEffWidth()) return 1;
	else {
		Ity += Stepy;
		if (Ity < (int32_t)ima->GetHeight()){
			IterImage += ima->GetEffWidth();
			Itx = 0;
			return 1;
		} else
			return 0;
	}
}
/////////////////////////////////////////////////////////////////////
inline BOOL CImageIterator::PrevStep()
{
	Itx -= Stepx;
	if (Itx >= 0) return 1;
	else {       
		Ity -= Stepy;
		if (Ity >= 0 && Ity < (int32_t)ima->GetHeight()) {
			IterImage -= ima->GetEffWidth();
			Itx = 0;
			return 1;
		} else
			return 0;
	}
}
/////////////////////////////////////////////////////////////////////
inline BOOL CImageIterator::GetCol(uint8_t* pCol, uint32_t x)
{
	if ((pCol==0)||(ima->GetBpp()<8)||(x>=ima->GetWidth()))
		return 0;
	uint32_t h = ima->GetHeight();
	//uint32_t line = ima->GetEffWidth();
	uint8_t bytes = (uint8_t)(ima->GetBpp()>>3);
	uint8_t* pSrc;
	for (uint32_t y=0;y<h;y++){
		pSrc = ima->GetBits(y) + x*bytes;
		for (uint8_t w=0;w<bytes;w++){
			*pCol++=*pSrc++;
		}
	}
	return 1;
}
/////////////////////////////////////////////////////////////////////
inline BOOL CImageIterator::SetCol(uint8_t* pCol, uint32_t x)
{
	if ((pCol==0)||(ima->GetBpp()<8)||(x>=ima->GetWidth()))
		return 0;
	uint32_t h = ima->GetHeight();
	//uint32_t line = ima->GetEffWidth();
	uint8_t bytes = (uint8_t)(ima->GetBpp()>>3);
	uint8_t* pSrc;
	for (uint32_t y=0;y<h;y++){
		pSrc = ima->GetBits(y) + x*bytes;
		for (uint8_t w=0;w<bytes;w++){
			*pSrc++=*pCol++;
		}
	}
	return 1;
}
/////////////////////////////////////////////////////////////////////
#endif
