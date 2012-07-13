/*
 * File:	ximagif.h
 * Purpose:	GIF Image Class Loader and Writer
 */
/* ==========================================================
 * CxImageGIF (c) 07/Aug/2001 Davide Pizzolato - www.xdp.it
 * For conditions of distribution and use, see copyright notice in ximage.h
 *
 * Special thanks to Troels Knakkergaard for new features, enhancements and bugfixes
 *
 * original CImageGIF  and CImageIterator implementation are:
 * Copyright:	(c) 1995, Alejandro Aguilar Sierra <asierra(at)servidor(dot)unam(dot)mx>
 *
 * 6/15/97 Randy Spann: Added GIF87a writing support
 *         R.Spann@ConnRiver.net
 *
 * DECODE.C - An LZW decoder for GIF
 * Copyright (C) 1987, by Steven A. Bennett
 * Copyright (C) 1994, C++ version by Alejandro Aguilar Sierra
 *
 * In accordance with the above, I want to credit Steve Wilhite who wrote
 * the code which this is heavily inspired by...
 *
 * GIF and 'Graphics Interchange Format' are trademarks (tm) of
 * Compuserve, Incorporated, an H&R Block Company.
 *
 * Release Notes: This file contains a decoder routine for GIF images
 * which is similar, structurally, to the original routine by Steve Wilhite.
 * It is, however, somewhat noticably faster in most cases.
 *
 * ==========================================================
 */

#if !defined(__ximaGIF_h)
#define __ximaGIF_h

#include "ximage.h"

#if CXIMAGE_SUPPORT_GIF

typedef int16_t    code_int;   

/* Various error codes used by decoder */
#define OUT_OF_MEMORY -10
#define BAD_CODE_SIZE -20
#define READ_ERROR -1
#define WRITE_ERROR -2
#define OPEN_ERROR -3
#define CREATE_ERROR -4
#define BAD_LINE_WIDTH -5
#define MAX_CODES   4095
#define GIFBUFTAM 16383
#define TRANSPARENCY_CODE 0xF9

//LZW GIF Image compression
#define MAXBITSCODES    12
#define HSIZE  5003     /* 80% occupancy */
#define MAXCODE(n_bits) (((code_int) 1 << (n_bits)) - 1)
#define HashTabOf(i)    htab[i]
#define CodeTabOf(i)    codetab[i]


class CImageIterator;
class DLL_EXP CxImageGIF: public CxImage
{
#pragma pack(1)

typedef struct tag_gifgce{
  uint8_t flags; /*res:3|dispmeth:3|userinputflag:1|transpcolflag:1*/
  uint16_t delaytime;
  uint8_t transpcolindex;
} struct_gifgce;

typedef struct tag_dscgif{		/* Logic Screen Descriptor  */
  char header[6];				/* Firma and version */
  uint16_t scrwidth;
  uint16_t scrheight;
  char pflds;
  char bcindx;
  char pxasrat;
} struct_dscgif;

typedef struct tag_image{      /* Image Descriptor */
  uint16_t l;
  uint16_t t;
  uint16_t w;
  uint16_t h;
  uint8_t   pf;
} struct_image;

typedef struct tag_TabCol{		/* Tabla de colores */
  int16_t colres;					/* color resolution */
  int16_t sogct;					/* size of global color table */
  rgb_color paleta[256];		/* paleta */
} struct_TabCol;

typedef struct tag_RLE{
	int32_t rl_pixel;
	int32_t rl_basecode;
	int32_t rl_count;
	int32_t rl_table_pixel;
	int32_t rl_table_max;
	int32_t just_cleared;
	int32_t out_bits;
	int32_t out_bits_init;
	int32_t out_count;
	int32_t out_bump;
	int32_t out_bump_init;
	int32_t out_clear;
	int32_t out_clear_init;
	int32_t max_ocodes;
	int32_t code_clear;
	int32_t code_eof;
	uint32_t obuf;
	int32_t obits;
	uint8_t oblock[256];
	int32_t oblen;
} struct_RLE;
#pragma pack()

public:
	CxImageGIF();
	~CxImageGIF();

//	bool Load(const TCHAR * imageFileName){ return CxImage::Load(imageFileName,CXIMAGE_FORMAT_GIF);}
//	bool Save(const TCHAR * imageFileName){ return CxImage::Save(imageFileName,CXIMAGE_FORMAT_GIF);}
	
	bool Decode(CxFile * fp);
	bool Decode(FILE *fp) { CxIOFile file(fp); return Decode(&file); }

#if CXIMAGE_SUPPORT_ENCODE
	bool Encode(CxFile * fp);
	bool Encode(CxFile * fp, CxImage ** pImages, int32_t pagecount, bool bLocalColorMap = false, bool bLocalDispMeth = false);
	bool Encode(FILE *fp) { CxIOFile file(fp); return Encode(&file); }
	bool Encode(FILE *fp, CxImage ** pImages, int32_t pagecount, bool bLocalColorMap = false)
				{ CxIOFile file(fp); return Encode(&file, pImages, pagecount, bLocalColorMap); }
#endif // CXIMAGE_SUPPORT_ENCODE

	void SetLoops(int32_t loops);
	int32_t GetLoops();
	void SetComment(const char* sz_comment_in);
	void GetComment(char* sz_comment_out);

protected:
	bool DecodeExtension(CxFile *fp);
	void EncodeHeader(CxFile *fp);
	void EncodeLoopExtension(CxFile *fp);
	void EncodeExtension(CxFile *fp);
	void EncodeBody(CxFile *fp, bool bLocalColorMap = false);
	void EncodeComment(CxFile *fp);
	bool EncodeRGB(CxFile *fp);
	void GifMix(CxImage & imgsrc2, struct_image & imgdesc);
	
	struct_gifgce gifgce;

	int32_t             curx, cury;
	int32_t             CountDown;
	uint32_t    cur_accum;
	int32_t              cur_bits;
	int32_t interlaced, iypos, istep, iheight, ipass;
	int32_t ibf;
	int32_t ibfmax;
	uint8_t * buf;
// Implementation
	int32_t GifNextPixel ();
	void Putword (int32_t w, CxFile* fp );
	void compressNONE (int32_t init_bits, CxFile* outfile);
	void compressLZW (int32_t init_bits, CxFile* outfile);
	void output (code_int code );
	void cl_hash (int32_t hsize);
	void char_out (int32_t c);
	void flush_char ();
	int16_t init_exp(int16_t size);
	int16_t get_next_code(CxFile*);
	int16_t decoder(CxFile*, CImageIterator* iter, int16_t linewidth, int32_t &bad_code_count);
	int32_t get_byte(CxFile*);
	int32_t out_line(CImageIterator* iter, uint8_t *pixels, int32_t linelen);
	int32_t get_num_frames(CxFile *f,struct_TabCol* TabColSrc,struct_dscgif* dscgif);
	int32_t seek_next_image(CxFile* fp, int32_t position);

	int16_t curr_size;                     /* The current code size */
	int16_t clear;                         /* Value for a clear code */
	int16_t ending;                        /* Value for a ending code */
	int16_t newcodes;                      /* First available code */
	int16_t top_slot;                      /* Highest code for current size */
	int16_t slot;                          /* Last read code */

	/* The following static variables are used
	* for seperating out codes */
	int16_t navail_bytes;              /* # bytes left in block */
	int16_t nbits_left;                /* # bits left in current uint8_t */
	uint8_t b1;                           /* Current uint8_t */
	uint8_t * byte_buff;               /* Current block */
	uint8_t *pbytes;                      /* Pointer to next uint8_t in block */
	/* The reason we have these seperated like this instead of using
	* a structure like the original Wilhite code did, is because this
	* stuff generally produces significantly faster code when compiled...
	* This code is full of similar speedups...  (For a good book on writing
	* C for speed or for space optomisation, see Efficient C by Tom Plum,
	* published by Plum-Hall Associates...)
	*/
	uint8_t * stack;            /* Stack for storing pixels */
	uint8_t * suffix;           /* Suffix table */
	uint16_t * prefix;           /* Prefix linked list */

//LZW GIF Image compression routines
	int32_t * htab;
	uint16_t * codetab;
	int32_t n_bits;				/* number of bits/code */
	code_int maxcode;		/* maximum code, given n_bits */
	code_int free_ent;		/* first unused entry */
	int32_t clear_flg;
	int32_t g_init_bits;
	CxFile* g_outfile;
	int32_t ClearCode;
	int32_t EOFCode;

	int32_t a_count;
	char * accum;

	char * m_comment;
	int32_t m_loops;

//RLE compression routines
	void compressRLE( int32_t init_bits, CxFile* outfile);
	void rle_clear(struct_RLE* rle);
	void rle_flush(struct_RLE* rle);
	void rle_flush_withtable(int32_t count, struct_RLE* rle);
	void rle_flush_clearorrep(int32_t count, struct_RLE* rle);
	void rle_flush_fromclear(int32_t count,struct_RLE* rle);
	void rle_output_plain(int32_t c,struct_RLE* rle);
	void rle_reset_out_clear(struct_RLE* rle);
	uint32_t rle_compute_triangle_count(uint32_t count, uint32_t nrepcodes);
	uint32_t rle_isqrt(uint32_t x);
	void rle_write_block(struct_RLE* rle);
	void rle_block_out(uint8_t c, struct_RLE* rle);
	void rle_block_flush(struct_RLE* rle);
	void rle_output(int32_t val, struct_RLE* rle);
	void rle_output_flush(struct_RLE* rle);
};

#endif

#endif
