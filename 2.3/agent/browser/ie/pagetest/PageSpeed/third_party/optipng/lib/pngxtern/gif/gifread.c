/*
 * gifread.c
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


#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "gifread.h"


#define FALSE   0
#define TRUE    1

#define MAX_LZW_BITS    12


static size_t GIFInputRead(unsigned char *buf,
                           size_t len,
                           struct GIFInput *input) {
  size_t remaining = input->len - input->pos;
  if (remaining < len) {
    len = remaining;
  }
  memcpy(buf, input->buf + input->pos, len);
  input->pos += len;
  return len;
}

static int GIFInputReadChar(struct GIFInput *input) {
  unsigned char c;
  if (GIFInputRead(&c, 1, input) != 1) {
    return EOF;
  }
  return c & 0xff;
}


/* These macros are masquerading as inline functions. */

#define GIF_FREAD(buf, len, file) \
    { if (GIFInputRead(buf, len, file) < len) GIFError(ErrRead); }

#define GIF_FGETC(ch, file) \
    { if ((ch = GIFInputReadChar(file)) == EOF) GIFError(ErrRead); }

#define GIF_GETW(buf) \
    ((buf)[0] + ((buf)[1] << 8))

#ifdef GIF_DEBUG
#define GIF_TRACE(args) printf args
#else
#define GIF_TRACE(args) ((void)0)
#endif


static const char *ErrRead = "Error reading file or unexpected end of file";


static void GIFReadNextImage(struct GIFImage *image, struct GIFInput *stream);
static void GIFReadNextExtension(struct GIFExtension *ext, struct GIFInput *stream);
static void ReadImageData(struct GIFImage *image, struct GIFInput *stream);
static void SkipDataBlocks(struct GIFInput *stream);
static int  ReadDataBlock(unsigned char *buf, struct GIFInput *stream);
static int  LZWGetCode(int code_size, int flag, struct GIFInput *stream);
static int  LZWReadByte(int flag, int input_code_size, struct GIFInput *stream);


/**
 * Reads the GIF screen and the global color table.
 **/
void GIFReadScreen(struct GIFScreen *screen, struct GIFInput *stream)
{
    unsigned char buf[7];

    GIF_TRACE(("Reading Header\n"));
    GIF_FREAD(buf, 6, stream);
    if (strncmp((char *)buf, "GIF", 3) != 0)
        GIFError("Not a GIF file");
    if ((strncmp((char *)buf + 3, "87a", 3) != 0) &&
            (strncmp((char *)buf + 3, "89a", 3) != 0))
        GIFWarning("Invalid GIF version number, not \"87a\" or \"89a\"");

    GIF_TRACE(("Reading Logical Screen Descriptor\n"));
    GIF_FREAD(buf, 7, stream);
    screen->Width            = GIF_GETW(buf + 0);
    screen->Height           = GIF_GETW(buf + 2);
    screen->GlobalColorFlag  = (buf[4] & 0x80) ? 1 : 0;
    screen->ColorResolution  = ((buf[4] & 0x70) >> 3) + 1;
    screen->SortFlag         = (buf[4] & 0x08) ? 1 : 0;
    screen->GlobalNumColors  = 2 << (buf[4] & 0x07);
    screen->Background       = buf[5];
    screen->PixelAspectRatio = buf[6];

    if (screen->GlobalColorFlag)
    {
        GIF_TRACE(("Reading Global Color Table\n"));
        GIF_FREAD(screen->GlobalColorTable, 3 * screen->GlobalNumColors,
            stream);
    }

    GIF_TRACE(("Validating Logical Screen Descriptor\n"));
    if (screen->Width == 0 || screen->Height == 0)
        GIFError("Invalid image dimensions");
    if (screen->Background > 0)
    {
        if ((screen->GlobalColorFlag &&
             (screen->Background >= screen->GlobalNumColors)) ||
            !screen->GlobalColorFlag)
        {
#if 0   /* too noisy */
            GIFWarning("Invalid background color index");
#endif
            screen->Background = 0;
        }
    }
}


/**
 * Initializes the GIF image structure.
 **/
void GIFInitImage(struct GIFImage *image, struct GIFScreen *screen,
                  unsigned char **rows)
{
    image->Screen = screen;
    image->Rows   = rows;
}


/**
 * Initializes the GIF extension structure.
 */
void GIFInitExtension(struct GIFExtension *ext, struct GIFScreen *screen,
                      unsigned char *buf, unsigned int size)
{
    ext->Screen     = screen;
    ext->BufferSize = size;
    ext->Buffer     = buf;
}


/**
 * Reads the next GIF block (image or extension) structure.
 **/
int GIFReadNextBlock(struct GIFImage *image, struct GIFExtension *ext,
                     struct GIFInput *stream)
{
    int ch;
    int foundBogus;

    foundBogus = 0;
    for ( ; ; )
    {
        GIF_FGETC(ch, stream);
        switch (ch)
        {
        case GIF_IMAGE:       /* ',' */
            GIFReadNextImage(image, stream);
            return ch;
        case GIF_EXTENSION:   /* '!' */
            GIFReadNextExtension(ext, stream);
            return ch;
        case GIF_TERMINATOR:  /* ';' */
            return ch;
        default:
            if (!foundBogus)
                GIFWarning("Bogus data in GIF");
            foundBogus = 1;
        }
    }
}


/**
 * Reads the next GIF image and local color table.
 **/
static void GIFReadNextImage(struct GIFImage *image, struct GIFInput *stream)
{
    struct GIFScreen *screen;
    unsigned char    buf[9];

    GIF_TRACE(("Reading Local Image Descriptor\n"));
    GIF_FREAD(buf, 9, stream);
    if (image == NULL)
    {
        SkipDataBlocks(stream);
        return;
    }

    image->LeftPos        = GIF_GETW(buf + 0);
    image->TopPos         = GIF_GETW(buf + 2);
    image->Width          = GIF_GETW(buf + 4);
    image->Height         = GIF_GETW(buf + 6);
    image->LocalColorFlag = (buf[8] & 0x80) ? 1 : 0;
    image->InterlaceFlag  = (buf[8] & 0x40) ? 1 : 0;
    image->SortFlag       = (buf[8] & 0x20) ? 1 : 0;
    image->LocalNumColors = image->LocalColorFlag ? (2 << (buf[8] & 0x07)) : 0;

    if (image->LocalColorFlag)
    {
        GIF_TRACE(("Reading Local Color Table\n"));
        GIF_FREAD(image->LocalColorTable, 3 * image->LocalNumColors, stream);
    }

    GIF_TRACE(("Validating Logical Screen Descriptor\n"));
    screen = image->Screen;

    if (image->Width == 0 || image->Height == 0 ||
            image->LeftPos + image->Width > screen->Width ||
            image->TopPos + image->Height > screen->Height)
        GIFError("Invalid image dimensions");

    ReadImageData(image, stream);
}


/**
 * Reads the next GIF extension.
 **/
static void GIFReadNextExtension(struct GIFExtension *ext, struct GIFInput *stream)
{
    unsigned int offset, len;
    int          count, label;

    GIF_FGETC(label, stream);
    GIF_TRACE(("Reading Extension (0x%X)\n", label));
    if (ext == NULL)
    {
        SkipDataBlocks(stream);
        return;
    }
    ext->Label = (unsigned char)label;

    offset = 0;
    len = ext->BufferSize;
    for ( ; ; )
    {
        if (len < UCHAR_MAX)
        {
            ext->BufferSize += 1024;
            ext->Buffer = realloc(ext->Buffer, ext->BufferSize);
            if (ext->Buffer == NULL)
                GIFError("Out of memory");
            len += 1024;
        }
        count = ReadDataBlock(ext->Buffer + offset, stream);
        if (count == 0)
            break;
        offset += count;
        len -= count;
    }
}


static int ZeroDataBlock = FALSE;

static int ReadDataBlock(unsigned char *buf, struct GIFInput *stream)
{
    int count;

    GIF_FGETC(count, stream);
    if (count > 0)
    {
        ZeroDataBlock = FALSE;
        GIF_FREAD(buf, (unsigned int)count, stream);
    }
    else
        ZeroDataBlock = TRUE;

    return count;
}

static void SkipDataBlocks(struct GIFInput *stream)
{
    int           count;
    unsigned char buf[UCHAR_MAX];

    for ( ; ; )
    {
        GIF_FGETC(count, stream)
        if (count > 0)
        {
            GIF_FREAD(buf, (unsigned int)count, stream);
        }
        else
            return;
    }
}

static int LZWGetCode(int code_size, int flag, struct GIFInput *stream)
{
    static unsigned char buf[280];
    static int           curbit, lastbit, done, last_byte;
    int                  count, i, j, ret;

    if (flag)
    {
        curbit = 0;
        lastbit = 0;
        done = FALSE;
        return 0;
    }

    if ((curbit + code_size) >= lastbit)
    {
        if (done)
        {
            if (curbit >= lastbit)
                GIFError("GIF/LZW error: ran off the end of my bits");
            return -1;
        }
        buf[0] = buf[last_byte-2];
        buf[1] = buf[last_byte-1];

        if ((count = ReadDataBlock(&buf[2], stream)) == 0)
            done = TRUE;

        last_byte = 2 + count;
        curbit = (curbit - lastbit) + 16;
        lastbit = (2 + count) * 8;
    }

    ret = 0;
    for (i = curbit, j = 0; j < code_size; ++i, ++j)
        ret |= ((buf[ i / 8 ] & (1 << (i % 8))) != 0) << j;

    curbit += code_size;
    return ret;
}

static int LZWReadByte(int flag, int input_code_size, struct GIFInput *stream)
{
    static int fresh = FALSE;
    int        code, incode;
    static int code_size, set_code_size;
    static int max_code, max_code_size;
    static int firstcode, oldcode;
    static int clear_code, end_code;
    static int table[2][(1 << MAX_LZW_BITS)];
    static int stack[(1 << MAX_LZW_BITS) * 2], *sp;
    int        i;

    if (flag)
    {
        set_code_size = input_code_size;
        code_size = set_code_size+1;
        clear_code = 1 << set_code_size;
        end_code = clear_code + 1;
        max_code_size = 2 * clear_code;
        max_code = clear_code + 2;

        LZWGetCode(0, TRUE, stream);

        fresh = TRUE;

        for (i = 0; i < clear_code; ++i)
        {
            table[0][i] = 0;
            table[1][i] = i;
        }
        for ( ; i < (1 << MAX_LZW_BITS); ++i)
        {
            table[0][i] = table[1][0] = 0;
        }

        sp = stack;
        return 0;
    }
    else if (fresh)
    {
        fresh = FALSE;
        do
        {
            firstcode = oldcode =
                LZWGetCode(code_size, FALSE, stream);
        } while (firstcode == clear_code);
        return firstcode;
    }

    if (sp > stack)
        return *--sp;

    while ((code = LZWGetCode(code_size, FALSE, stream)) >= 0)
    {
        if (code == clear_code)
        {
            for (i = 0; i < clear_code; ++i)
            {
                table[0][i] = 0;
                table[1][i] = i;
            }
            for ( ; i < (1 << MAX_LZW_BITS); ++i)
            {
                table[0][i] = table[1][i] = 0;
            }

            code_size = set_code_size+1;
            max_code_size = 2*clear_code;
            max_code = clear_code+2;
            sp = stack;
            firstcode = oldcode =
                LZWGetCode(code_size, FALSE, stream);
            return firstcode;
        }
        else if (code == end_code)
        {
            int           count;
            unsigned char buf[260];

            if (ZeroDataBlock)
                return -2;

            while ((count = ReadDataBlock(buf, stream)) > 0)
                ;

#if 0  /* too noisy */
            if (count != 0)
                GIFWarning("missing EOD in data stream (common occurence)");
#endif
            return -2;
        }

        incode = code;

        if (code >= max_code)
        {
            *sp++ = firstcode;
            code = oldcode;
        }

        while (code >= clear_code)
        {
            *sp++ = table[1][code];
            if (code == table[0][code])
                GIFError("GIF/LZW error: circular table entry");
            code = table[0][code];
        }

        *sp++ = firstcode = table[1][code];

        if ((code = max_code) < (1 << MAX_LZW_BITS))
        {
            table[0][code] = oldcode;
            table[1][code] = firstcode;
            ++max_code;
            if ((max_code >= max_code_size) &&
                (max_code_size < (1 << MAX_LZW_BITS)))
            {
                max_code_size *= 2;
                ++code_size;
            }
        }

        oldcode = incode;

        if (sp > stack)
            return *--sp;
    }
    return code;
}


static void ReadImageData(struct GIFImage *image, struct GIFInput *stream)
{
    int           minCodeSize, interlaced, val, pass;
    unsigned int  width, height, numColors, xpos, ypos;
    unsigned char **rows;

    GIF_TRACE(("Reading Image Data\n"));

    /* Initialize the compression routines. */
    GIF_FGETC(minCodeSize, stream);
    if (minCodeSize >= MAX_LZW_BITS)  /* this should be in fact <= 8 */
        GIFError("GIF/LZW error: invalid LZW code size");

    if (LZWReadByte(TRUE, minCodeSize, stream) < 0)
        GIFError("Error reading GIF image");

    /* Ignore the picture if it is "uninteresting". */
    rows = image->Rows;
    if (rows == NULL)
    {
#if 1
        /* This is faster, but possible LZW errors may go undetected. */
        SkipDataBlocks(stream);
#else
        /* This is safer, but slower. */
        while (LZWReadByte(FALSE, minCodeSize, stream) >= 0)
            ;
#endif
        return;
    }

    width       = image->Width;
    height      = image->Height;
    interlaced  = image->InterlaceFlag;
    GIFGetColorTable(image, &numColors);
    xpos = ypos = 0;
    pass = 0;
    while ((val = LZWReadByte(FALSE, minCodeSize, stream)) >= 0)
    {
        if ((unsigned int)val >= numColors)
        {
            GIFWarning("Pixel value out of range");
            val = numColors - 1;
        }
        rows[ypos][xpos] = (unsigned char)val;
        if (++xpos == width)
        {
            xpos = 0;
            if (interlaced)
            {
                switch (pass)
                {
                case 0:
                case 1:
                    ypos += 8;
                    break;
                case 2:
                    ypos += 4;
                    break;
                case 3:
                    ypos += 2;
                    break;
                }
                if (ypos >= height)
                {
                    switch (++pass)
                    {
                    case 1:
                        ypos = 4;
                        break;
                    case 2:
                        ypos = 2;
                        break;
                    case 3:
                        ypos = 1;
                        break;
                    default:
                        goto fini;
                    }
                }
            }
            else
                ++ypos;
        }
        if (ypos >= height)
            break;
    }
fini:
    /* Ignore the trailing garbage. */
    while (LZWReadByte(FALSE, minCodeSize, stream) >= 0)
        ;
}


/**
 * Constructs a GIF graphic control extension structure
 * from a raw extension structure.
 **/
void GIFGetGraphicCtl(struct GIFExtension *ext,
                      struct GIFGraphicCtlExt *graphicExt)
{
    unsigned char *buf;

    GIF_TRACE(("Loading Graphic Control Extension\n"));
    if (ext->Label != GIF_GRAPHICCTL)
    {
        GIFWarning("Not a graphic control extension");
        return;
    }
    if (ext->BufferSize < 4)
    {
        GIFWarning("Broken graphic control extension");
        return;
    }

    buf = ext->Buffer;
    graphicExt->DisposalMethod  = (buf[0] >> 2) & 0x07;
    graphicExt->InputFlag       = (buf[0] >> 1) & 0x01;
    graphicExt->TransparentFlag = buf[0] & 0x01;
    graphicExt->DelayTime       = GIF_GETW(buf + 1);
    graphicExt->Transparent     = buf[3];
}


/* The GIF spec says that if neither global nor local
 * color maps are present, the decoder should use a system
 * default map, which should have black and white as the
 * first two colors. So we use black, white, red, green, blue,
 * yellow, purple and cyan.
 * Missing color tables are not a common case, and are not
 * handled by most GIF readers.
 */
static /*const*/ unsigned char DefaultColorTable[] =
{
     0,   0,   0,  /* black  */
   255, 255, 255,  /* white  */
   255,   0,   0,  /* red    */
     0, 255, 255,  /* cyan   */
     0, 255,   0,  /* green  */
   255,   0, 255,  /* purple */
     0,   0, 255,  /* blue   */
   255, 255,   0,  /* yellow */
};

/**
 * Returns the local or the global color table (whichever is applicable),
 * or a predefined color table if both of these tables are missing.
 **/
unsigned char *GIFGetColorTable(struct GIFImage *image,
                                unsigned int *numColors)
{
    struct GIFScreen *screen;

    if (image->LocalColorFlag)
    {
        GIF_TRACE(("Loading Local Color Table\n"));
        *numColors = image->LocalNumColors;
        return image->LocalColorTable;
    }

    screen = image->Screen;
    if (screen->GlobalColorFlag)
    {
        GIF_TRACE(("Loading Global Color Table\n"));
        *numColors = screen->GlobalNumColors;
        return screen->GlobalColorTable;
    }

    GIF_TRACE(("Loading Default Color Table\n"));
    *numColors = sizeof(DefaultColorTable) / 3;
    return DefaultColorTable;
}


/**
 * Error handling.
 **/

static void GIFDefaultError(const char *msg)
{
    fprintf(stderr, "%s\n", msg);
    exit(EXIT_FAILURE);
}

static void GIFDefaultWarning(const char *msg)
{
    fprintf(stderr, "%s\n", msg);
}

void (*GIFError)(const char *msg)
    = GIFDefaultError;

void (*GIFWarning)(const char *msg)
    = GIFDefaultWarning;
