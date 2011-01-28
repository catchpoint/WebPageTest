/*
 * opngreduc.c - libpng extension: lossless image reductions.
 *
 * Copyright (C) 2003-2010 Cosmin Truta.
 * This software is distributed under the same licensing and warranty terms
 * as libpng.
 *
 * This code is functional, although it is still work in progress.
 * Upon completion, it will be submitted for incorporation into libpng.
 *
 * CAUTION:
 * The image reduction code is written as if it were part of libpng,
 * using direct access to the internal libpng structures.
 * IT IS IMPORTANT to maintain the libpng ABI thoroughly; if this
 * is not attainable, the code must be statically linked to libpng.
 * Otherwise, the internal verification routine will halt the execution.
 *
 * Due to the current limitations, the samples must be stored
 * in the implicit form, without any transformation in effect.
 */

#define PNG_INTERNAL
#define PNG_NO_PEDANTIC_WARNINGS
#include "png.h"
#if PNG_LIBPNG_VER >= 10400
#include "pngpriv.h"
#else
#define trans_alpha trans
#define trans_color trans_values
#endif
#include "opngreduc.h"


#ifdef OPNG_IMAGE_REDUCTIONS_SUPPORTED


#ifndef PNG_INFO_IMAGE_SUPPORTED
__error__ "OPNG_IMAGE_REDUCTIONS_SUPPORTED" requires "PNG_INFO_IMAGE_SUPPORTED"
#endif


/*
 * This is a quick, dirty, and yet important internal verification routine.
 * It will go away when opngreduc.c is incorporated into libpng.
 */
static void
_opng_validate_internal(png_structp png_ptr, png_infop info_ptr)
{
#if defined(PNG_bKGD_SUPPORTED) || defined(PNG_READ_BACKGROUND_SUPPORTED)
   png_color_16p background;
#endif
#if defined(PNG_hIST_SUPPORTED)
   png_uint_16p hist;
#endif
#if defined(PNG_sBIT_SUPPORTED)
   png_color_8p sig_bit;
#endif
   png_bytep trans_alpha;
   int num_trans;
   png_color_16p trans_color;

   /* Make sure it's safe to access libpng's internal structures directly.
    * Some fields might have their offsets shifted due to changes in
    * libpng configuration.
    */

   /* Check info_ptr. */
   if (png_get_rows(png_ptr, info_ptr) != info_ptr->row_pointers)
      goto error;
#if defined(PNG_bKGD_SUPPORTED) || defined(PNG_READ_BACKGROUND_SUPPORTED)
   if (png_get_bKGD(png_ptr, info_ptr, &background))
      if (background != &info_ptr->background)
         goto error;
#endif
#if defined(PNG_hIST_SUPPORTED)
   if (png_get_hIST(png_ptr, info_ptr, &hist))
      if (hist != info_ptr->hist)
         goto error;
#endif
#if defined(PNG_sBIT_SUPPORTED)
   if (png_get_sBIT(png_ptr, info_ptr, &sig_bit))
      if (sig_bit != &info_ptr->sig_bit)
         goto error;
#endif
   if (png_get_tRNS(png_ptr, info_ptr, &trans_alpha, &num_trans, &trans_color))
      if ((trans_alpha != NULL && (trans_alpha != info_ptr->trans_alpha ||
                                   num_trans != info_ptr->num_trans)) ||
          (trans_color != NULL && trans_color != &info_ptr->trans_color))
         goto error;

   /* Also check png_ptr. It's not much, we're doing what we can... */
   if (png_get_compression_buffer_size(png_ptr) != png_ptr->zbuf_size)
      goto error;

   /* Everything looks okay. */
   return;

error:
   png_error(png_ptr,
      "[internal error] Inconsistent internal structures (incorrect libpng?)");
}


/*
 * Check if the image information is valid.
 * The image information is said to be valid if all the required
 * critical information is present in the png structures.
 * The function returns 1 if this info is valid, and 0 otherwise.
 * If there is any inconsistency in the internal structures
 * (possibly caused by incorrect libpng use, or by libpng bugs),
 * the function issues a png_error.
 */
int PNGAPI
opng_validate_image(png_structp png_ptr, png_infop info_ptr)
{
   int result, error;

   png_debug(1, "in opng_validate_image\n");

   if (png_ptr == NULL || info_ptr == NULL)
      return 0;

   _opng_validate_internal(png_ptr, info_ptr);

   result = 1;
   error = 0;

   /* Validate IHDR. */
   if (info_ptr->bit_depth != 0)
   {
      if (info_ptr->width == 0 || info_ptr->height == 0)
         error = 1;
   }
   else
      result = 0;

   /* Validate PLTE. */
   if (info_ptr->color_type & PNG_COLOR_MASK_PALETTE)
   {
      if (info_ptr->valid & PNG_INFO_PLTE)
      {
         if (info_ptr->palette == NULL || info_ptr->num_palette == 0)
            error = 1;
      }
      else
         result = 0;
   }

   /* Validate IDAT. */
   if (info_ptr->valid & PNG_INFO_IDAT)
   {
      if (info_ptr->row_pointers == NULL)
         error = 1;
   }
   else
      result = 0;

   if (error)
      png_error(png_ptr, "Inconsistent data in libpng");
   return result;
}


#define OPNG_CMP_COLOR(R1, G1, B1, R2, G2, B2) \
   (((int)(R1) != (int)(R2)) ?      \
      ((int)(R1) - (int)(R2)) :     \
      (((int)(G1) != (int)(G2)) ?   \
         ((int)(G1) - (int)(G2)) :  \
         ((int)(B1) - (int)(B2))))

#define OPNG_CMP_ALPHA_COLOR(A1, R1, G1, B1, A2, R2, G2, B2) \
   (((int)(A1) != (int)(A2)) ?          \
      ((int)(A1) - (int)(A2)) :         \
      (((int)(R1) != (R2)) ?            \
         ((int)(R1) - (int)(R2)) :      \
         (((int)(G1) != (int)(G2)) ?    \
            ((int)(G1) - (int)(G2)) :   \
            ((int)(B1) - (int)(B2)))))


/*
 * Build a color+alpha palette in which the entries are sorted by
 * (alpha, red, green, blue), in this particular order.
 * Use the insertion sort algorithm.
 * The alpha value is ignored if it is not in the range [0 .. 255].
 * The function returns:
 *   1 if the insertion is successful;  *index = position of new entry.
 *   0 if the insertion is unnecessary; *index = position of crt entry.
 *  -1 if overflow;            *num_palette = *num_trans = *index = -1.
 */
static int /* PRIVATE */
opng_insert_palette_entry(png_colorp palette, int *num_palette,
   png_bytep trans_alpha, int *num_trans, int max_tuples,
   unsigned int red, unsigned int green, unsigned int blue, unsigned int alpha,
   int *index)
{
   int low, high, mid, cmp, i;

   OPNG_ASSERT(*num_palette >= 0 && *num_palette <= max_tuples);
   OPNG_ASSERT(*num_trans >= 0 && *num_trans <= *num_palette);

   if (alpha < 255)
   {
      /* Do a binary search among transparent tuples. */
      low  = 0;
      high = *num_trans - 1;
      while (low <= high)
      {
         mid = (low + high) / 2;
         cmp = OPNG_CMP_ALPHA_COLOR(alpha, red, green, blue,
            trans_alpha[mid],
            palette[mid].red, palette[mid].green, palette[mid].blue);
         if (cmp < 0)
            high = mid - 1;
         else if (cmp > 0)
            low = mid + 1;
         else
         {
            *index = mid;
            return 0;
         }
      }
   }
   else  /* alpha == 255 || alpha not in [0 .. 255] */
   {
      /* Do a (faster) binary search among opaque tuples. */
      low  = *num_trans;
      high = *num_palette - 1;
      while (low <= high)
      {
         mid = (low + high) / 2;
         cmp = OPNG_CMP_COLOR(red, green, blue,
            palette[mid].red, palette[mid].green, palette[mid].blue);
         if (cmp < 0)
            high = mid - 1;
         else if (cmp > 0)
            low = mid + 1;
         else
         {
            *index = mid;
            return 0;
         }
      }
   }
   if (alpha > 255)
   {
      /* The binary search among opaque tuples has failed. */
      /* Do a linear search among transparent tuples, ignoring alpha. */
      for (i = 0; i < *num_trans; ++i)
      {
         cmp = OPNG_CMP_COLOR(red, green, blue,
            palette[i].red, palette[i].green, palette[i].blue);
         if (cmp == 0)
         {
            *index = i;
            return 0;
         }
      }
   }

   /* Check for overflow. */
   if (*num_palette >= max_tuples)
   {
      *num_palette = *num_trans = *index = -1;
      return -1;
   }

   /* Insert new tuple at [low]. */
   OPNG_ASSERT(low >= 0 && low <= *num_palette);
   for (i = *num_palette; i > low; --i)
      palette[i] = palette[i - 1];
   palette[low].red   = (png_byte)red;
   palette[low].green = (png_byte)green;
   palette[low].blue  = (png_byte)blue;
   ++(*num_palette);
   if (alpha < 255)
   {
      OPNG_ASSERT(low <= *num_trans);
      for (i = *num_trans; i > low; --i)
         trans_alpha[i] = trans_alpha[i - 1];
      trans_alpha[low] = (png_byte)alpha;
      ++(*num_trans);
   }
   *index = low;
   return 1;
}


/*
 * Retrieve the alpha samples from the given image row.
 */
static void /* PRIVATE */
opng_get_alpha_row(png_structp png_ptr, png_infop info_ptr,
   png_bytep row, png_bytep alpha_row)
{
   png_bytep sample_ptr;
   png_uint_32 width, i;
   unsigned int channels;
   png_color_16p trans_color;

   OPNG_ASSERT(info_ptr->bit_depth == 8);
   OPNG_ASSERT(!(info_ptr->color_type & PNG_COLOR_MASK_PALETTE));

   width = info_ptr->width;
   if (!(info_ptr->color_type & PNG_COLOR_MASK_ALPHA))
   {
      if (!(info_ptr->valid & PNG_INFO_tRNS))
      {
         memset(alpha_row, 255, (size_t)width);
         return;
      }
      trans_color = &info_ptr->trans_color;
      if (info_ptr->color_type == PNG_COLOR_TYPE_RGB)
      {
         png_byte trans_red   = (png_byte)trans_color->red;
         png_byte trans_green = (png_byte)trans_color->green;
         png_byte trans_blue  = (png_byte)trans_color->blue;
         for (i = 0; i < width; ++i)
            alpha_row[i] = (png_byte)
               ((row[3*i] == trans_red && row[3*i+1] == trans_green &&
                 row[3*i+2] == trans_blue) ? 0 : 255);
      }
      else
      {
         png_byte trans_gray = (png_byte)trans_color->gray;
         OPNG_ASSERT(info_ptr->color_type == PNG_COLOR_TYPE_GRAY);
         for (i = 0; i < width; ++i)
            alpha_row[i] = (png_byte)(row[i] == trans_gray ? 0 : 255);
      }
      return;
   }

   /* There is a real alpha channel. */
   channels = (png_ptr->usr_channels > 0) ?
      png_ptr->usr_channels : info_ptr->channels;
   sample_ptr = row;
   if (!(png_ptr->transformations & PNG_FILLER) ||
        (png_ptr->flags & PNG_FLAG_FILLER_AFTER))
      sample_ptr += channels - 1;  /* alpha sample is the last in RGBA tuple */
   for (i = 0; i < width; ++i, sample_ptr += channels, ++alpha_row)
      *alpha_row = *sample_ptr;
}


/*
 * Analyze the redundancy of bits inside the image.
 * The parameter reductions indicates the intended reductions.
 * The function returns the possible reductions.
 */
png_uint_32 /* PRIVATE */
opng_analyze_bits(png_structp png_ptr, png_infop info_ptr,
   png_uint_32 reductions)
{
   png_bytepp row_ptr;
   png_bytep component_ptr;
   png_uint_32 height, width, i, j;
   unsigned int bit_depth, byte_depth, color_type, channels, sample_size,
      offset_color, offset_alpha;
   png_color_16p background;

   png_debug(1, "in opng_analyze_bits\n");

   bit_depth = info_ptr->bit_depth;
   if (bit_depth < 8)
      return OPNG_REDUCE_NONE;  /* nothing is done in this case */

   color_type = info_ptr->color_type;
   if (color_type & PNG_COLOR_MASK_PALETTE)
      return OPNG_REDUCE_NONE;  /* let opng_reduce_palette() handle it */

   byte_depth  = bit_depth / 8;
   channels    = (png_ptr->usr_channels > 0) ?
      png_ptr->usr_channels : info_ptr->channels;
   sample_size = channels * byte_depth;

   /* Select the applicable reductions. */
   reductions &= (OPNG_REDUCE_16_TO_8 |
      OPNG_REDUCE_RGB_TO_GRAY | OPNG_REDUCE_STRIP_ALPHA);
   if (bit_depth <= 8)
      reductions &= ~OPNG_REDUCE_16_TO_8;
   if (!(color_type & PNG_COLOR_MASK_COLOR))
      reductions &= ~OPNG_REDUCE_RGB_TO_GRAY;
   if (!(color_type & PNG_COLOR_MASK_ALPHA))
      reductions &= ~OPNG_REDUCE_STRIP_ALPHA;

   offset_color = offset_alpha = 0;
   if ((png_ptr->transformations & PNG_FILLER) &&
       !(png_ptr->flags & PNG_FLAG_FILLER_AFTER))
      offset_color = byte_depth;
   else
      offset_alpha = (channels - 1) * byte_depth;

#if defined(PNG_bKGD_SUPPORTED) || defined(PNG_READ_BACKGROUND_SUPPORTED)
   /* Check if the ancillary chunk info allows these reductions. */
   if (info_ptr->valid & PNG_INFO_bKGD)
   {
      background = &info_ptr->background;
      if (reductions & OPNG_REDUCE_16_TO_8)
      {
         if (background->red   % 257 != 0 ||
             background->green % 257 != 0 ||
             background->blue  % 257 != 0 ||
             background->gray  % 257 != 0)
            reductions &= ~OPNG_REDUCE_16_TO_8;
      }
      if (reductions & OPNG_REDUCE_RGB_TO_GRAY)
      {
         if (background->red != background->green ||
             background->red != background->blue)
            reductions &= ~OPNG_REDUCE_RGB_TO_GRAY;
      }
   }
#endif

   /* Check for each possible reduction, row by row. */
   row_ptr = info_ptr->row_pointers;
   height  = info_ptr->height;
   width   = info_ptr->width;
   for (i = 0; i < height; ++i, ++row_ptr)
   {
      if (reductions == OPNG_REDUCE_NONE)
         return OPNG_REDUCE_NONE;  /* no need to go any further */

      /* Check if it is possible to reduce the bit depth to 8. */
      if (reductions & OPNG_REDUCE_16_TO_8)
      {
         component_ptr = *row_ptr;
         for (j = 0; j < channels * width; ++j, component_ptr += 2)
         {
            if (component_ptr[0] != component_ptr[1])
            {
               reductions &= ~OPNG_REDUCE_16_TO_8;
               break;
            }
         }
      }

      if (bit_depth == 8)
      {
         /* Check if it is possible to reduce rgb -> gray. */
         if (reductions & OPNG_REDUCE_RGB_TO_GRAY)
         {
            component_ptr = *row_ptr + offset_color;
            for (j = 0; j < width; ++j, component_ptr += sample_size)
            {
               if (component_ptr[0] != component_ptr[1] ||
                   component_ptr[0] != component_ptr[2])
               {
                  reductions &= ~OPNG_REDUCE_RGB_TO_GRAY;
                  break;
               }
            }
         }

         /* Check if it is possible to strip the alpha channel. */
         if (reductions & OPNG_REDUCE_STRIP_ALPHA)
         {
            component_ptr = *row_ptr + offset_alpha;
            for (j = 0; j < width; ++j, component_ptr += sample_size)
            {
               if (component_ptr[0] != 255)
               {
                  reductions &= ~OPNG_REDUCE_STRIP_ALPHA;
                  break;
               }
            }
         }
      }
      else  /* bit_depth == 16 */
      {
         /* Check if it is possible to reduce rgb -> gray. */
         if (reductions & OPNG_REDUCE_RGB_TO_GRAY)
         {
            component_ptr = *row_ptr + offset_color;
            for (j = 0; j < width; ++j, component_ptr += sample_size)
            {
               if (component_ptr[0] != component_ptr[2] ||
                   component_ptr[0] != component_ptr[4] ||
                   component_ptr[1] != component_ptr[3] ||
                   component_ptr[1] != component_ptr[5])
               {
                  reductions &= ~OPNG_REDUCE_RGB_TO_GRAY;
                  break;
               }
            }
         }

         /* Check if it is possible to strip the alpha channel. */
         if (reductions & OPNG_REDUCE_STRIP_ALPHA)
         {
            component_ptr = *row_ptr + offset_alpha;
            for (j = 0; j < width; ++j, component_ptr += sample_size)
            {
               if (component_ptr[0] != 255 || component_ptr[1] != 255)
               {
                  reductions &= ~OPNG_REDUCE_STRIP_ALPHA;
                  break;
               }
            }
         }
      } /* end if (bit_depth == 8) */
   } /* end for (i = 0; i < height; ++i, ++row_ptr) */

   return reductions;
}


/*
 * Reduce the image type to a lower bit depth and color type,
 * by removing redundant bits.
 * Possible reductions: 16bpp to 8bpp; RGB to gray; strip alpha.
 * The parameter reductions indicates the intended reductions.
 * The function returns the successful reductions.
 * All reductions are performed in a single step.
 */
png_uint_32 /* PRIVATE */
opng_reduce_bits(png_structp png_ptr, png_infop info_ptr,
   png_uint_32 reductions)
{
   png_bytepp row_ptr;
   png_bytep src_ptr, dest_ptr;
   png_uint_32 height, width, i, j;
   unsigned int
      src_bit_depth, dest_bit_depth, src_byte_depth, dest_byte_depth,
      src_color_type, dest_color_type, src_channels, dest_channels,
      src_sample_size, dest_sample_size, src_offset_alpha;
   unsigned int tran_tbl[8], k;

   png_debug(1, "in opng_reduce_bits\n");

   /* See which reductions may be performed. */
   reductions = opng_analyze_bits(png_ptr, info_ptr, reductions);
   /* Strip the filler even if it is not an alpha channel. */
   if (png_ptr->transformations & PNG_FILLER)
      reductions |= OPNG_REDUCE_STRIP_ALPHA;
   if (reductions == OPNG_REDUCE_NONE)
      return OPNG_REDUCE_NONE;  /* nothing can be reduced */

   /* Compute the new image parameters bit_depth, color_type, etc. */
   src_bit_depth = info_ptr->bit_depth;
   OPNG_ASSERT(src_bit_depth >= 8);
   if (reductions & OPNG_REDUCE_16_TO_8)
   {
      OPNG_ASSERT(src_bit_depth == 16);
      dest_bit_depth = 8;
   }
   else
      dest_bit_depth = src_bit_depth;

   src_byte_depth = src_bit_depth / 8;
   dest_byte_depth = dest_bit_depth / 8;

   src_color_type = dest_color_type = info_ptr->color_type;
   if (reductions & OPNG_REDUCE_RGB_TO_GRAY)
   {
      OPNG_ASSERT(src_color_type & PNG_COLOR_MASK_COLOR);
      dest_color_type &= ~PNG_COLOR_MASK_COLOR;
   }
   if (reductions & OPNG_REDUCE_STRIP_ALPHA)
   {
      OPNG_ASSERT(src_color_type & PNG_COLOR_MASK_ALPHA);
      dest_color_type &= ~PNG_COLOR_MASK_ALPHA;
   }

   src_channels  = (png_ptr->usr_channels > 0) ?
      png_ptr->usr_channels : info_ptr->channels;
   dest_channels =
      ((dest_color_type & PNG_COLOR_MASK_COLOR) ? 3 : 1) +
      ((dest_color_type & PNG_COLOR_MASK_ALPHA) ? 1 : 0);

   src_sample_size  = src_channels * src_byte_depth;
   dest_sample_size = dest_channels * dest_byte_depth;
   OPNG_ASSERT(src_sample_size > dest_sample_size);

   if (!(png_ptr->transformations & PNG_FILLER) ||
       (png_ptr->flags & PNG_FLAG_FILLER_AFTER))
      src_offset_alpha = (src_channels - 1) * src_byte_depth;
   else
      src_offset_alpha = 0;

   /* Pre-compute the intra-sample translation table. */
   for (k = 0; k < 4 * dest_byte_depth; ++k)
      tran_tbl[k] = k * src_bit_depth / dest_bit_depth;
   /* If rgb -> gray and the alpha channel remains in the right,
      shift the alpha component two positions to the left. */
   if ((reductions & OPNG_REDUCE_RGB_TO_GRAY) &&
       (dest_color_type & PNG_COLOR_MASK_ALPHA) &&
       (src_offset_alpha != 0))
   {
      tran_tbl[dest_byte_depth] = tran_tbl[3 * dest_byte_depth];
      if (dest_byte_depth == 2)
         tran_tbl[dest_byte_depth + 1] = tran_tbl[3 * dest_byte_depth + 1];
   }
   /* If alpha is in the left, and it is being stripped,
      shift the components that come after it. */
   if ((src_channels == 2 || src_channels == 4) /* alpha or filler */ &&
       !(dest_color_type & PNG_COLOR_MASK_ALPHA) &&
       (src_offset_alpha == 0))
   {
      for (k = 0; k < dest_sample_size; )
      {
         if (dest_byte_depth == 1)
         {
            tran_tbl[k] = tran_tbl[k + 1];
            ++k;
         }
         else
         {
            tran_tbl[k] = tran_tbl[k + 2];
            tran_tbl[k + 1] = tran_tbl[k + 3];
            k += 2;
         }
      }
   }

   /* Translate the samples to the new image type. */
   row_ptr = info_ptr->row_pointers;
   height  = info_ptr->height;
   width   = info_ptr->width;
   for (i = 0; i < height; ++i, ++row_ptr)
   {
      src_ptr = dest_ptr = *row_ptr;
      for (j = 0; j < width; ++j)
      {
         for (k = 0; k < dest_sample_size; ++k)
            dest_ptr[k] = src_ptr[tran_tbl[k]];
         src_ptr += src_sample_size;
         dest_ptr += dest_sample_size;
      }
   }

#if defined(PNG_bKGD_SUPPORTED) || defined(PNG_READ_BACKGROUND_SUPPORTED)
   /* Update the ancillary chunk info. */
   if (info_ptr->valid & PNG_INFO_bKGD)
   {
      png_color_16p background = &info_ptr->background;
      if (reductions & OPNG_REDUCE_16_TO_8)
      {
         background->red   &= 255;
         background->green &= 255;
         background->blue  &= 255;
         background->gray  &= 255;
      }
      if (reductions & OPNG_REDUCE_RGB_TO_GRAY)
         background->gray = background->red;
   }
#endif
#if defined(PNG_sBIT_SUPPORTED)
   if (info_ptr->valid & PNG_INFO_sBIT)
   {
      png_color_8p sig_bits = &info_ptr->sig_bit;
      if (reductions & OPNG_REDUCE_16_TO_8)
      {
         if (sig_bits->red > 8)
            png_ptr->sig_bit.red   = sig_bits->red   = 8;
         if (sig_bits->green > 8)
            png_ptr->sig_bit.green = sig_bits->green = 8;
         if (sig_bits->blue > 8)
            png_ptr->sig_bit.blue  = sig_bits->blue  = 8;
         if (sig_bits->gray > 8)
            png_ptr->sig_bit.gray  = sig_bits->gray  = 8;
         if (sig_bits->alpha > 8)
            png_ptr->sig_bit.alpha = sig_bits->alpha = 8;
      }
      if (reductions & OPNG_REDUCE_RGB_TO_GRAY)
      {
         png_byte max_sig_bit = sig_bits->red;
         if (max_sig_bit < sig_bits->green)
            max_sig_bit = sig_bits->green;
         if (max_sig_bit < sig_bits->blue)
            max_sig_bit = sig_bits->blue;
         png_ptr->sig_bit.gray = sig_bits->gray = max_sig_bit;
      }
   }
#endif
   if (info_ptr->valid & PNG_INFO_tRNS)
   {
      png_color_16p trans_color = &info_ptr->trans_color;
      if (reductions & OPNG_REDUCE_16_TO_8)
      {
         if (trans_color->red   % 257 == 0 &&
             trans_color->green % 257 == 0 &&
             trans_color->blue  % 257 == 0 &&
             trans_color->gray  % 257 == 0)
         {
            trans_color->red   &= 255;
            trans_color->green &= 255;
            trans_color->blue  &= 255;
            trans_color->gray  &= 255;
         }
         else
         {
            /* 16-bit tRNS in 8-bit samples: all pixels are 100% opaque. */
            png_free_data(png_ptr, info_ptr, PNG_FREE_TRNS, -1);
            info_ptr->valid &= ~PNG_INFO_tRNS;
         }
      }
      if (reductions & OPNG_REDUCE_RGB_TO_GRAY)
      {
         if (trans_color->red == trans_color->green ||
             trans_color->red == trans_color->blue)
            trans_color->gray = trans_color->red;
         else
         {
            /* Non-gray tRNS in grayscale image: all pixels are 100% opaque. */
            png_free_data(png_ptr, info_ptr, PNG_FREE_TRNS, -1);
            info_ptr->valid &= ~PNG_INFO_tRNS;
         }
      }
   }

   /* Update the image info. */
   png_ptr->bit_depth   = info_ptr->bit_depth   = (png_byte)dest_bit_depth;
   png_ptr->color_type  = info_ptr->color_type  = (png_byte)dest_color_type;
   png_ptr->channels    = info_ptr->channels    = (png_byte)dest_channels;
   png_ptr->pixel_depth = info_ptr->pixel_depth =
      (png_byte)(dest_bit_depth * dest_channels);
   if (reductions & OPNG_REDUCE_STRIP_ALPHA)
   {
      png_ptr->transformations &= ~PNG_FILLER;
      if (png_ptr->usr_channels > 0)
         --png_ptr->usr_channels;
   }

   return reductions;
}


/*
 * Reduce the bit depth of a palette image to the lowest possible value.
 * The parameter reductions should contain OPNG_REDUCE_8_TO_4_2_1.
 * The function returns OPNG_REDUCE_8_TO_4_2_1 if successful.
 */
png_uint_32 /* PRIVATE */
opng_reduce_palette_bits(png_structp png_ptr, png_infop info_ptr,
   png_uint_32 reductions)
{
   png_bytepp row_ptr;
   png_bytep src_sample_ptr, dest_sample_ptr;
   png_uint_32 width, height, i, j;
   unsigned int src_bit_depth, dest_bit_depth;
   unsigned int src_mask_init, src_mask, src_shift, dest_shift;
   unsigned int sample, dest_buf;

   png_debug(1, "in opng_reduce_palette_bits\n");

   /* Check if the reduction applies. */
   if (!(reductions & OPNG_REDUCE_8_TO_4_2_1) ||
       (info_ptr->color_type != PNG_COLOR_TYPE_PALETTE) ||
       (info_ptr->num_palette > 16))
      return OPNG_REDUCE_NONE;

   row_ptr = info_ptr->row_pointers;
   height  = info_ptr->height;
   width   = info_ptr->width;
   if (png_ptr->usr_bit_depth > 0)
      src_bit_depth = png_ptr->usr_bit_depth;
   else
      src_bit_depth = info_ptr->bit_depth;

   /* Find the smallest bit depth. */
   OPNG_ASSERT(info_ptr->num_palette > 0);
   if (info_ptr->num_palette <= 2)
      dest_bit_depth = 1;
   else if (info_ptr->num_palette <= 4)
      dest_bit_depth = 2;
   else if (info_ptr->num_palette <= 16)
      dest_bit_depth = 4;
   else
      dest_bit_depth = 8;
   if (dest_bit_depth >= src_bit_depth)
      return OPNG_REDUCE_NONE;

   /* Iterate through all sample values. */
   if (src_bit_depth == 8)
   {
      for (i = 0; i < height; ++i, ++row_ptr)
      {
         src_sample_ptr = dest_sample_ptr = *row_ptr;
         dest_shift = 8;
         dest_buf   = 0;
         for (j = 0; j < width; ++j)
         {
            dest_shift -= dest_bit_depth;
            if (dest_shift > 0)
               dest_buf |= *src_sample_ptr << dest_shift;
            else
            {
               *dest_sample_ptr++ = (png_byte)(dest_buf | *src_sample_ptr);
               dest_shift = 8;
               dest_buf   = 0;
            }
            ++src_sample_ptr;
         }
         if (dest_shift != 0)
            *dest_sample_ptr = (png_byte)dest_buf;
      }
   }
   else  /* src_bit_depth < 8 */
   {
      src_mask_init = (1 << (8 + src_bit_depth)) - (1 << 8);
      for (i = 0; i < height; ++i, ++row_ptr)
      {
         src_sample_ptr = dest_sample_ptr = *row_ptr;
         src_shift = dest_shift = 8;
         src_mask  = src_mask_init;
         dest_buf  = 0;
         for (j = 0; j < width; ++j)
         {
            src_shift -= src_bit_depth;
            src_mask >>= src_bit_depth;
            sample = (*src_sample_ptr & src_mask) >> src_shift;
            dest_shift -= dest_bit_depth;
            if (dest_shift > 0)
               dest_buf |= sample << dest_shift;
            else
            {
               *dest_sample_ptr++ = (png_byte)(dest_buf | sample);
               dest_shift = 8;
               dest_buf   = 0;
            }
            if (src_shift == 0)
            {
               src_shift = 8;
               src_mask  = src_mask_init;
               ++src_sample_ptr;
            }
         }
         if (dest_shift != 0)
            *dest_sample_ptr = (png_byte)dest_buf;
      }
   }

   /* Update the image info. */
   png_ptr->bit_depth   = info_ptr->bit_depth   =
   png_ptr->pixel_depth = info_ptr->pixel_depth = (png_byte)dest_bit_depth;

   return OPNG_REDUCE_8_TO_4_2_1;
}


/*
 * Reduce the image type from grayscale(+alpha) or RGB(+alpha) to palette,
 * if possible.
 * The parameter reductions indicates the intended reductions.
 * The function returns the successful reductions.
 */
png_uint_32 /* PRIVATE */
opng_reduce_to_palette(png_structp png_ptr, png_infop info_ptr,
   png_uint_32 reductions)
{
   png_uint_32 result;
   png_bytepp row_ptr;
   png_bytep sample_ptr, alpha_row;
   png_uint_32 height, width, channels, i, j;
   unsigned int color_type, dest_bit_depth;
   png_color palette[256];
   png_byte trans_alpha[256];
   int num_palette, num_trans, index;
   png_color_16p background;
   unsigned int gray, red, green, blue, alpha;
   unsigned int prev_gray, prev_red, prev_green, prev_blue, prev_alpha;

   png_debug(1, "in opng_reduce_to_palette\n");

   if (info_ptr->bit_depth != 8)
      return OPNG_REDUCE_NONE;  /* nothing is done in this case */

   color_type = info_ptr->color_type;
   OPNG_ASSERT(!(info_ptr->color_type & PNG_COLOR_MASK_PALETTE));

   row_ptr   = info_ptr->row_pointers;
   height    = info_ptr->height;
   width     = info_ptr->width;
   channels  = info_ptr->channels;
   alpha_row = (png_bytep)png_malloc(png_ptr, width);

   /* Analyze the possibility of this reduction. */
   num_palette = num_trans = 0;
   prev_gray = prev_red = prev_green = prev_blue = prev_alpha = 256;
   for (i = 0; i < height; ++i, ++row_ptr)
   {
      sample_ptr = *row_ptr;
      opng_get_alpha_row(png_ptr, info_ptr, *row_ptr, alpha_row);
      if (color_type & PNG_COLOR_MASK_COLOR)
      {
         for (j = 0; j < width; ++j, sample_ptr += channels)
         {
            red   = sample_ptr[0];
            green = sample_ptr[1];
            blue  = sample_ptr[2];
            alpha = alpha_row[j];
            /* Check the cache first. */
            if (red != prev_red || green != prev_green || blue != prev_blue ||
                alpha != prev_alpha)
            {
               prev_red   = red;
               prev_green = green;
               prev_blue  = blue;
               prev_alpha = alpha;
               if (opng_insert_palette_entry(palette, &num_palette,
                   trans_alpha, &num_trans, 256,
                   red, green, blue, alpha, &index) < 0)  /* overflow */
               {
                  OPNG_ASSERT(num_palette < 0);
                  i = height;  /* forced exit from outer loop */
                  break;
               }
            }
         }
      }
      else  /* grayscale */
      {
         for (j = 0; j < width; ++j, sample_ptr += channels)
         {
            gray  = sample_ptr[0];
            alpha = alpha_row[j];
            /* Check the cache first. */
            if (gray != prev_gray || alpha != prev_alpha)
            {
               prev_gray  = gray;
               prev_alpha = alpha;
               if (opng_insert_palette_entry(palette, &num_palette,
                   trans_alpha, &num_trans, 256,
                   gray, gray, gray, alpha, &index) < 0)  /* overflow */
               {
                  OPNG_ASSERT(num_palette < 0);
                  i = height;  /* forced exit from outer loop */
                  break;
               }
            }
         }
      }
   }
#if defined(PNG_bKGD_SUPPORTED) || defined(PNG_READ_BACKGROUND_SUPPORTED)
   if ((num_palette >= 0) && (info_ptr->valid & PNG_INFO_bKGD))
   {
      /* bKGD has an alpha-agnostic palette entry. */
      background = &info_ptr->background;
      if (color_type & PNG_COLOR_MASK_COLOR)
      {
         red   = background->red;
         green = background->green;
         blue  = background->blue;
      }
      else
         red = green = blue = background->gray;
      opng_insert_palette_entry(palette, &num_palette,
         trans_alpha, &num_trans, 256,
         red, green, blue, 256, &index);
      if (index >= 0)
         background->index = (png_byte)index;
   }
#endif

   /* Continue only if the uncompressed indexed image (pixels + PLTE + tRNS)
    * is smaller than the uncompressed RGB(A) image.
    * Casual overhead (headers, CRCs, etc.) is ignored.
    *
    * Compare:
    * num_pixels * (src_bit_depth * channels - dest_bit_depth) / 8
    * vs.
    * sizeof(PLTE) + sizeof(tRNS)
    */
   if (num_palette >= 0)
   {
      OPNG_ASSERT(num_palette > 0 && num_palette <= 256);
      OPNG_ASSERT(num_trans >= 0 && num_trans <= num_palette);
      if (num_palette <= 2)
         dest_bit_depth = 1;
      else if (num_palette <= 4)
         dest_bit_depth = 2;
      else if (num_palette <= 16)
         dest_bit_depth = 4;
      else
         dest_bit_depth = 8;
      /* Do the comparison in a way that does not cause overflow. */
      if (channels * 8 == dest_bit_depth ||
          (3 * num_palette + num_trans) * 8 / (channels * 8 - dest_bit_depth)
             / width / height >= 1)
         num_palette = -1;
   }

   if (num_palette < 0)  /* can't reduce */
   {
      png_free(png_ptr, alpha_row);
      return OPNG_REDUCE_NONE;
   }

   /* Reduce. */
   row_ptr = info_ptr->row_pointers;
   index = -1;
   prev_red = prev_green = prev_blue = prev_alpha = (unsigned int)(-1);
   for (i = 0; i < height; ++i, ++row_ptr)
   {
      sample_ptr = *row_ptr;
      opng_get_alpha_row(png_ptr, info_ptr, *row_ptr, alpha_row);
      if (color_type & PNG_COLOR_MASK_COLOR)
      {
         for (j = 0; j < width; ++j, sample_ptr += channels)
         {
            red   = sample_ptr[0];
            green = sample_ptr[1];
            blue  = sample_ptr[2];
            alpha = alpha_row[j];
            /* Check the cache first. */
            if (red != prev_red || green != prev_green || blue != prev_blue ||
                alpha != prev_alpha)
            {
               prev_red   = red;
               prev_green = green;
               prev_blue  = blue;
               prev_alpha = alpha;
               if (opng_insert_palette_entry(palette, &num_palette,
                   trans_alpha, &num_trans, 256,
                   red, green, blue, alpha, &index) != 0)
                  index = -1;  /* this should not happen */
            }
            OPNG_ASSERT(index >= 0);
            (*row_ptr)[j] = (png_byte)index;
         }
      }
      else  /* grayscale */
      {
         for (j = 0; j < width; ++j, sample_ptr += channels)
         {
            gray  = sample_ptr[0];
            alpha = alpha_row[j];
            /* Check the cache first. */
            if (gray != prev_gray || alpha != prev_alpha)
            {
               prev_gray  = gray;
               prev_alpha = alpha;
               if (opng_insert_palette_entry(palette, &num_palette,
                   trans_alpha, &num_trans, 256,
                   gray, gray, gray, alpha, &index) != 0)
                  index = -1;  /* this should not happen */
            }
            OPNG_ASSERT(index >= 0);
            (*row_ptr)[j] = (png_byte)index;
         }
      }
   }

   /* Update the image info. */
   png_ptr->color_type  = info_ptr->color_type  = PNG_COLOR_TYPE_PALETTE;
   png_ptr->channels    = info_ptr->channels    = 1;
   png_ptr->pixel_depth = info_ptr->pixel_depth = 8;
   png_set_PLTE(png_ptr, info_ptr, palette, num_palette);
   if (num_trans > 0)
      png_set_tRNS(png_ptr, info_ptr, trans_alpha, num_trans, NULL);
   /* bKGD (if present) is already updated. */

   png_free(png_ptr, alpha_row);

   result = OPNG_REDUCE_RGB_TO_PALETTE;
   if (reductions & OPNG_REDUCE_8_TO_4_2_1)
      result |= opng_reduce_palette_bits(png_ptr, info_ptr, reductions);
   return result;
}


/*
 * Analyze the usage of samples.
 * The output value usage_map[n] indicates whether the sample n
 * is used. The usage_map[] array must have 256 entries.
 * The function requires a valid bit depth between 1 and 8.
 */
void /* PRIVATE */
opng_analyze_sample_usage(png_structp png_ptr, png_infop info_ptr,
   png_bytep usage_map)
{
   png_bytepp row_ptr;
   png_bytep sample_ptr;
   png_uint_32 width, height, i, j;
   unsigned int bit_depth, init_shift, init_mask, shift, mask;

   png_debug(1, "in opng_analyze_sample_usage\n");

   row_ptr = info_ptr->row_pointers;
   height  = info_ptr->height;
   width   = info_ptr->width;
   if (png_ptr->usr_bit_depth > 0)
      bit_depth = png_ptr->usr_bit_depth;
   else
      bit_depth = info_ptr->bit_depth;

   /* Initialize the output entries with 0. */
   memset(usage_map, 0, 256);

   /* Iterate through all sample values. */
   if (bit_depth == 8)
   {
      for (i = 0; i < height; ++i, ++row_ptr)
         for (j = 0, sample_ptr = *row_ptr; j < width; ++j, ++sample_ptr)
            usage_map[*sample_ptr] = 1;
   }
   else
   {
      OPNG_ASSERT(bit_depth < 8);
      init_shift = 8 - bit_depth;
      init_mask  = (1 << 8) - (1 << init_shift);
      for (i = 0; i < height; ++i, ++row_ptr)
         for (j = 0, sample_ptr = *row_ptr; j < width; ++sample_ptr)
         {
            mask  = init_mask;
            shift = init_shift;
            do
            {
               usage_map[(*sample_ptr & mask) >> shift] = 1;
               mask >>= bit_depth;
               shift -= bit_depth;
               ++j;
            } while (mask > 0 && j < width);
         }
   }

#if defined(PNG_bKGD_SUPPORTED) || defined(PNG_READ_BACKGROUND_SUPPORTED)
   /* bKGD also counts as a used sample. */
   if (info_ptr->valid & PNG_INFO_bKGD)
      usage_map[info_ptr->background.index] = 1;
#endif
}


/*
 * Reduce the palette (only the fast method is implemented).
 * The parameter reductions indicates the intended reductions.
 * The function returns the successful reductions.
 */
png_uint_32 /* PRIVATE */
opng_reduce_palette(png_structp png_ptr, png_infop info_ptr,
   png_uint_32 reductions)
{
   png_uint_32 result;
   png_colorp palette;
   png_bytep trans_alpha;
   png_bytepp rows;
   png_uint_32 width, height, i, j;
   png_byte is_used[256];
   int num_palette, num_trans, last_color_index, last_trans_index, is_gray, k;
   png_color_16 gray_trans;
   png_byte crt_trans_value, last_trans_value;

   png_debug(1, "in opng_reduce_palette\n");

   height      = info_ptr->height;
   width       = info_ptr->width;
   palette     = info_ptr->palette;
   num_palette = info_ptr->num_palette;
   rows        = info_ptr->row_pointers;
   if (info_ptr->valid & PNG_INFO_tRNS)
   {
      trans_alpha = info_ptr->trans_alpha;
      num_trans   = info_ptr->num_trans;
      OPNG_ASSERT(trans_alpha != NULL && num_trans > 0);
   }
   else
   {
      trans_alpha = NULL;
      num_trans   = 0;
   }

   /* Analyze the possible reductions. */
   /* Also check the integrity of PLTE and tRNS. */
   opng_analyze_sample_usage(png_ptr, info_ptr, is_used);
   /* Palette-to-gray does not work (yet) if the bit depth is below 8. */
   is_gray = (reductions & OPNG_REDUCE_PALETTE_TO_GRAY) &&
             (info_ptr->bit_depth == 8);
   last_color_index = last_trans_index = -1;
   for (k = 0; k < 256; ++k)
   {
      if (!is_used[k])
         continue;
      last_color_index = k;
      if (k < num_trans && trans_alpha[k] < 255)
         last_trans_index = k;
      if (is_gray)
         if (palette[k].red != palette[k].green ||
             palette[k].red != palette[k].blue)
            is_gray = 0;
   }
   OPNG_ASSERT(last_color_index >= 0);
   if (last_color_index >= num_palette)
   {
      png_warning(png_ptr, "Too few colors in palette");
      /* Fix the palette by adding blank entries at the end. */
      num_palette = last_color_index + 1;
      info_ptr->num_palette = (png_uint_16)num_palette;
   }
   if (num_trans > num_palette)
   {
      png_warning(png_ptr, "Too many alpha values in tRNS");
      info_ptr->num_trans = info_ptr->num_palette;
   }
   num_trans = last_trans_index + 1;
   OPNG_ASSERT(num_trans <= num_palette);

   /* Check if tRNS can be reduced to grayscale. */
   if (is_gray && num_trans > 0)
   {
      gray_trans.gray = palette[last_trans_index].red;
      last_trans_value = trans_alpha[last_trans_index];
      for (k = 0; k <= last_color_index; ++k)
      {
         if (!is_used[k])
            continue;
         if (k <= last_trans_index)
         {
            crt_trans_value = trans_alpha[k];
            /* Cannot reduce if different colors have transparency. */
            if (crt_trans_value < 255 && palette[k].red != gray_trans.gray)
            {
               is_gray = 0;
               break;
            }
         }
         else
            crt_trans_value = 255;
         /* Cannot reduce if same color has multiple transparency levels. */
         if (palette[k].red == gray_trans.gray &&
             crt_trans_value != last_trans_value)
         {
            is_gray = 0;
            break;
         }
      }
   }

   /* Initialize result value. */
   result = OPNG_REDUCE_NONE;

   /* Remove tRNS if possible. */
   if ((info_ptr->valid & PNG_INFO_tRNS) && num_trans == 0)
   {
      png_free_data(png_ptr, info_ptr, PNG_FREE_TRNS, -1);
      info_ptr->valid &= ~PNG_INFO_tRNS;
      result = OPNG_REDUCE_PALETTE_FAST;
   }

   if (reductions & OPNG_REDUCE_PALETTE_FAST)
   {
      if (num_palette != last_color_index + 1)
      {
         /* Reduce PLTE. */
         /* hIST is reduced automatically. */
         info_ptr->num_palette = (png_uint_16)(last_color_index + 1);
         result = OPNG_REDUCE_PALETTE_FAST;
      }

      if ((info_ptr->valid & PNG_INFO_tRNS) &&
          (int)info_ptr->num_trans != num_trans)
      {
         /* Reduce tRNS. */
         info_ptr->num_trans = (png_uint_16)num_trans;
         result = OPNG_REDUCE_PALETTE_FAST;
      }
   }

   if (reductions & OPNG_REDUCE_8_TO_4_2_1)
      result |= opng_reduce_palette_bits(png_ptr, info_ptr, reductions);
   if (info_ptr->bit_depth < 8 || !is_gray)
      return result;

   /* Reduce palette -> grayscale. */
   for (i = 0; i < height; ++i)
      for (j = 0; j < width; ++j)
         rows[i][j] = palette[rows[i][j]].red;

#if defined(PNG_bKGD_SUPPORTED) || defined(PNG_READ_BACKGROUND_SUPPORTED)
   /* Update the ancillary chunk info. */
   if (info_ptr->valid & PNG_INFO_bKGD)
      info_ptr->background.gray = palette[info_ptr->background.index].red;
#endif
#if defined(PNG_hIST_SUPPORTED)
   if (info_ptr->valid & PNG_INFO_hIST)
   {
      png_free_data(png_ptr, info_ptr, PNG_FREE_HIST, -1);
      info_ptr->valid &= ~PNG_INFO_hIST;
   }
#endif
#if defined(PNG_sBIT_SUPPORTED)
   if (info_ptr->valid & PNG_INFO_sBIT)
   {
      png_color_8p sig_bit_ptr = &info_ptr->sig_bit;
      png_byte max_sig_bit = sig_bit_ptr->red;
      if (max_sig_bit < sig_bit_ptr->green)
         max_sig_bit = sig_bit_ptr->green;
      if (max_sig_bit < sig_bit_ptr->blue)
         max_sig_bit = sig_bit_ptr->blue;
      png_ptr->sig_bit.gray = info_ptr->sig_bit.gray = max_sig_bit;
   }
#endif
   if (info_ptr->valid & PNG_INFO_tRNS)
      png_set_tRNS(png_ptr, info_ptr, NULL, 0, &gray_trans);

   /* Update the image info. */
   png_ptr->color_type = info_ptr->color_type = PNG_COLOR_TYPE_GRAY;
   png_free_data(png_ptr, info_ptr, PNG_FREE_PLTE, -1);
   info_ptr->valid &= ~PNG_INFO_PLTE;
   return OPNG_REDUCE_PALETTE_TO_GRAY;  /* ignore the former result */
}


/*
 * Reduce the image (bit depth + color type + palette) without
 * losing any information. The palette (if applicable) and the
 * image data must be present (e.g. by calling png_set_rows(),
 * or by loading IDAT).
 * The parameter reductions indicates the intended reductions.
 * The function returns the successful reductions.
 */
png_uint_32 PNGAPI
opng_reduce_image(png_structp png_ptr, png_infop info_ptr,
   png_uint_32 reductions)
{
   unsigned int color_type;
   png_uint_32 result;

   png_debug(1, "in opng_reduce_image_type\n");

   if (!opng_validate_image(png_ptr, info_ptr))
   {
      png_warning(png_ptr,
         "Image reduction requires the presence of the critical info");
      return OPNG_REDUCE_NONE;
   }

#if 0  /* PNG_INTERLACE must be recognized! */
   if (png_ptr->transformations)
   {
      png_warning(png_ptr,
         "Image reduction cannot be applied "
         "under the presence of transformations");
      return OPNG_REDUCE_NONE;
   }
#endif

   color_type = info_ptr->color_type;

   /* The reductions below must be applied in the given order. */

   /* Try to reduce the high bits and color/alpha channels. */
   result = opng_reduce_bits(png_ptr, info_ptr, reductions);

   /* Try to reduce the palette image. */
   if (color_type == PNG_COLOR_TYPE_PALETTE &&
       (reductions & (OPNG_REDUCE_PALETTE_TO_GRAY |
                      OPNG_REDUCE_PALETTE_FAST |
                      OPNG_REDUCE_8_TO_4_2_1)))
      result |= opng_reduce_palette(png_ptr, info_ptr, reductions);

   /* Try to reduce RGB to palette or grayscale to palette. */
   if (((color_type & ~PNG_COLOR_MASK_ALPHA) == PNG_COLOR_TYPE_GRAY &&
        (reductions & OPNG_REDUCE_GRAY_TO_PALETTE)) ||
       ((color_type & ~PNG_COLOR_MASK_ALPHA) == PNG_COLOR_TYPE_RGB &&
        (reductions & OPNG_REDUCE_RGB_TO_PALETTE)))
   {
      if (!(result & OPNG_REDUCE_PALETTE_TO_GRAY))
         result |= opng_reduce_to_palette(png_ptr, info_ptr, reductions);
   }

   return result;
}


#endif /* OPNG_IMAGE_REDUCTIONS_SUPPORTED */
