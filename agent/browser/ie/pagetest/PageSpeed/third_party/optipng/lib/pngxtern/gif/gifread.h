/*
 * gifread.h
 *
 * Copyright (C) 2003-2009 Cosmin Truta.
 * This software was derived from "giftopnm.c" by David Koblas,
 * and is distributed under the same copyright and warranty terms.
 *
 * The original copyright notice is provided below.
 */

/* +-------------------------------------------------------------------+ */
/* | Copyright 1990, 1991, 1993, David Koblas.  (koblas@netcom.com)    | */
/* |   Permission to use, copy, modify, and distribute this software   | */
/* |   and its documentation for any purpose and without fee is hereby | */
/* |   granted, provided that the above copyright notice appear in all | */
/* |   copies and that both that copyright notice and this permission  | */
/* |   notice appear in supporting documentation.  This software is    | */
/* |   provided "as is" without express or implied warranty.           | */
/* +-------------------------------------------------------------------+ */


#ifndef GIFREAD_H
#define GIFREAD_H

#include "gifinput.h"

#define GIF_PLAINTEXT   0x01
#define GIF_EXTENSION   0x21  /* '!' */
#define GIF_IMAGE       0x2c  /* ',' */
#define GIF_TERMINATOR  0x3b  /* ';' */
#define GIF_GRAPHICCTL  0xf9
#define GIF_COMMENT     0xfe
#define GIF_APPLICATION 0xff

#define GIF_NUMCOLORS_MAX    256
#define GIF_IND_RED          0
#define GIF_IND_GREEN        1
#define GIF_IND_BLUE         2


/**
 * The GIF screen structure.
 **/
struct GIFScreen
{
    unsigned int  Width;
    unsigned int  Height;
    unsigned int  GlobalColorFlag;
    unsigned int  ColorResolution;
    unsigned int  SortFlag;
    unsigned int  GlobalNumColors;
    unsigned int  Background;
    unsigned int  PixelAspectRatio;
    unsigned char GlobalColorTable[GIF_NUMCOLORS_MAX * 3];
};


/**
 * The GIF image structure.
 **/
struct GIFImage
{
    struct GIFScreen *Screen;
    unsigned int  LeftPos;
    unsigned int  TopPos;
    unsigned int  Width;
    unsigned int  Height;
    unsigned int  LocalColorFlag;
    unsigned int  InterlaceFlag;
    unsigned int  SortFlag;
    unsigned int  LocalNumColors;
    unsigned char LocalColorTable[GIF_NUMCOLORS_MAX * 3];
    unsigned char **Rows;
};


/**
 * The GIF extension structure.
 **/
struct GIFExtension
{
    struct GIFScreen *Screen;
    unsigned char Label;
    unsigned int  BufferSize;
    unsigned char *Buffer;
};


/**
 * The GIF graphic control extension structure.
 **/
struct GIFGraphicCtlExt
{
    unsigned int DisposalMethod;
    unsigned int InputFlag;
    unsigned int TransparentFlag;
    unsigned int DelayTime;
    unsigned int Transparent;
};


/**
 * Reads the GIF screen and the global color table.
 * @param screen  (out)     a screen structure.
 * @param stream  (in out)  a file stream.
 **/
void GIFReadScreen(struct GIFScreen *screen, struct GIFInput *stream);

/**
 * Initializes the GIF image structure.
 * @param image   (out)  an image structure.
 * @param screen  (in)   a screen structure.
 * @param rows    (in)   an array of rows; can be NULL.
 **/
void GIFInitImage(struct GIFImage *image, struct GIFScreen *screen,
                  unsigned char **rows);

/**
 * Initializes the GIF extension structure.
 * @param ext     (out)  an extension structure.
 * @param screen  (in)   a screen structure.
 * @param buf     (in)   a dynamically-allocated memory buffer;
 *                       can be NULL.
 * @param size    (in)   the size of <code>buf</code>.
 **/
void GIFInitExtension(struct GIFExtension *ext, struct GIFScreen *screen,
                      unsigned char *buf, unsigned int size);

/**
 * Reads the next GIF block (image or extension) structure.
 * @param image   (out)     an image structure; can be NULL.
 * @param ext     (out)     an extension structure; can be NULL.
 * @param stream  (in out)  a file stream.
 * @return                  the block code.
 **/
int GIFReadNextBlock(struct GIFImage *image, struct GIFExtension *ext,
                     struct GIFInput *stream);

/**
 * Constructs a GIF graphic control extension structure
 * from a raw extension structure.
 * @param ext         (in)   a raw extension structure.
 * @param graphicExt  (out)  a graphic control extension structure.
 **/
void GIFGetGraphicCtl(struct GIFExtension *ext,
                      struct GIFGraphicCtlExt *graphicExt);

/**
 * Returns the local or the global color table (whichever is applicable),
 * or a predefined color table if both of these tables are missing.
 * @param image      (in)   an image structure.
 * @param numColors  (out)  the size of the returned color table.
 * @return                  the color table.
 **/
unsigned char *GIFGetColorTable(struct GIFImage *image,
                                unsigned int *numColors);


/**
 * Error handling.
 **/
extern void (*GIFError)(const char *msg);
extern void (*GIFWarning)(const char *msg);


#endif  /* GIFREAD_H */
