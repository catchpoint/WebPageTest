/*
 * pngxtern.h - external file format processing for libpng.
 *
 * Copyright (C) 2003-2010 Cosmin Truta.
 * This software is distributed under the same licensing and warranty terms
 * as libpng.
 */


#ifndef PNGXTERN_H
#define PNGXTERN_H

#include "png.h"
#ifdef PNGX_INTERNAL
#include <stdio.h>
#endif


#ifdef __cplusplus
extern "C" {
#endif

struct GIFInput;
struct GIFExtension;

/* GIF */
int pngx_sig_is_gif
   PNGARG((png_bytep sig, size_t sig_size,
           png_const_charpp fmt_name, png_const_charpp fmt_description));
int pngx_read_gif
   PNGARG((png_structp png_ptr, png_infop info_ptr, struct GIFInput *stream,
           struct GIFExtension *ext));

#ifdef __cplusplus
}  /* extern "C" */
#endif


#endif  /* PNGXTERN_H */
