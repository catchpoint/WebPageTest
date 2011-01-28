/*
 * pngxrgif.c - libpng external I/O: GIF reader.
 * Copyright (C) 2001-2010 Cosmin Truta.
 */

#define PNGX_INTERNAL
#include "pngx.h"
#include "pngxtern.h"
#include "gif/gifread.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>


static png_structp pngx_err_ptr = NULL;

static void
pngx_gif_error(const char *msg)
{
   png_error(pngx_err_ptr, msg);
}

static void
pngx_gif_warning(const char *msg)
{
   png_warning(pngx_err_ptr, msg);
}


int /* PRIVATE */
pngx_sig_is_gif(png_bytep sig, size_t sig_size,
                png_const_charpp fmt_name, png_const_charpp fmt_description)
{
   static const char gif_fmt_name[] = "GIF";
   static const char gif_fmt_description[] = "Graphics Interchange Format";

   static const png_byte sig_gif87a[6] =
      { 0x47, 0x49, 0x46, 0x38, 0x37, 0x61 };  /* "GIF87a" */
   static const png_byte sig_gif89a[6] =
      { 0x47, 0x49, 0x46, 0x38, 0x39, 0x61 };  /* "GIF89a" */

   /* Require at least the GIF signature and the screen descriptor. */
   if (sig_size < 6 + 7)
      return -1;  /* insufficient data */
   if (memcmp(sig, sig_gif87a, 6) != 0 && memcmp(sig, sig_gif89a, 6) != 0)
      return 0;  /* not GIF */

   /* Store the format name. */
   if (fmt_name != NULL)
      *fmt_name = gif_fmt_name;
   if (fmt_description != NULL)
      *fmt_description = gif_fmt_description;
   return 1;  /* GIF */
}


static void
pngx_set_GIF_palette(png_structp png_ptr, png_infop info_ptr,
   unsigned char *color_table, unsigned int num_colors)
{
   png_color palette[256];
   unsigned int i;

   PNGX_ASSERT(color_table != NULL && num_colors <= 256);
   for (i = 0; i < num_colors; ++i)
   {
      palette[i].red   = color_table[3 * i];
      palette[i].green = color_table[3 * i + 1];
      palette[i].blue  = color_table[3 * i + 2];
   }
   png_set_PLTE(png_ptr, info_ptr, palette, (int)num_colors);
}


static void
pngx_set_GIF_transparent(png_structp png_ptr, png_infop info_ptr,
   unsigned int transparent)
{
   png_byte trans[256];
   unsigned int i;

   PNGX_ASSERT(transparent < 256);
   for (i = 0; i < transparent; ++i)
      trans[i] = 255;
   trans[transparent] = 0;
   png_set_tRNS(png_ptr, info_ptr, trans, (int)transparent + 1, NULL);
}


#if 0  /* ... need to implement ... */
static void
pngx_set_GIF_meta(png_structp png_ptr, png_infop info_ptr,
   struct GIFImage *image, struct GIFExtension *ext)
{
   /* If the GIF specifies an aspect ratio, turn it into a pHYs chunk. */
   if (GifScreen.AspectRatio != 0 && GifScreen.AspectRatio != 49)
      png_set_pHYs(png_ptr, info_ptr,
         GifScreen.AspectRatio+15, 64, PNG_RESOLUTION_UNKNOWN);

   /* If the GIF specifies an image offset, turn it into a oFFs chunk. */
   if (img->offset_x > 0 && img->offset_y > 0)
      png_set_oFFs(png_ptr, info_ptr,
         img->offset_x, img->offset_y, PNG_OFFSET_PIXEL);
}
#endif


int /* PRIVATE */
pngx_read_gif(png_structp png_ptr, png_infop info_ptr, struct GIFInput *stream,
              struct GIFExtension *ext)
{
   /* GIF-specific data */
   struct GIFScreen screen;
   struct GIFImage image;
   struct GIFGraphicCtlExt graphicExt;
   int code;
   unsigned char *colorTable;
   unsigned int numColors;
   unsigned int transparent;
   unsigned int numImages;
   /* PNG-specific data */
   png_uint_32 width, height;
   png_bytepp row_pointers;

   /* Set up the custom error handling. */
   pngx_err_ptr = png_ptr;
   GIFError     = pngx_gif_error;
   GIFWarning   = pngx_gif_warning;

   /* Read the GIF screen. */
   GIFReadScreen(&screen, stream);
   width  = screen.Width;
   height = screen.Height;

   /* Set the PNG image type. */
   png_set_IHDR(png_ptr, info_ptr,
      width, height, 8, PNG_COLOR_TYPE_PALETTE,
      PNG_INTERLACE_NONE, PNG_COMPRESSION_TYPE_BASE, PNG_FILTER_TYPE_BASE);

   /* Allocate memory. */
   row_pointers = pngx_malloc_rows(png_ptr, info_ptr, (int)screen.Background);

   /* Complete the initialization of the GIF reader. */
   GIFInitImage(&image, &screen, row_pointers);
   GIFInitExtension(ext, &screen, NULL, 0);
   transparent = (unsigned int)(-1);
   numImages = 0;

   /* Iterate over the GIF file. */
   for ( ; ; )
   {
      code = GIFReadNextBlock(&image, ext, stream);
      if (code == GIF_IMAGE)  /* ',' */
      {
         if (image.Rows != NULL)
         {
            /* Complete the PNG info. */
            if (image.InterlaceFlag)
               pngx_set_interlace_type(png_ptr, info_ptr,
                  PNG_INTERLACE_ADAM7);
            colorTable = GIFGetColorTable(&image, &numColors);
            pngx_set_GIF_palette(png_ptr, info_ptr, colorTable, numColors);
            if (transparent < 256)
               pngx_set_GIF_transparent(png_ptr, info_ptr, transparent);

            /* Inform the GIF routines not to read the upcoming images. */
            image.Rows = NULL;
         }
         ++numImages;
      }
      else if (code == GIF_EXTENSION && ext->Label == GIF_GRAPHICCTL)  /* '!' */
      {
         GIFGetGraphicCtl(ext, &graphicExt);
         if (image.Rows != NULL && graphicExt.TransparentFlag)
            if (transparent >= 256)
               transparent = graphicExt.Transparent;
      }
      else if (code == GIF_TERMINATOR)  /* ';' */
         break;
   }

   if (image.Rows != NULL)
      png_error(png_ptr, "No image in GIF file");

   return numImages;
}
