/**
 * Copyright 2009 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Author: Bryan McQuade

#include "pagespeed/image_compression/png_optimizer.h"

#include <string>

#include "base/logging.h"

extern "C" {
#ifdef USE_SYSTEM_LIBPNG
#include "png.h"  // NOLINT
#else
#include "third_party/libpng/png.h"
#endif
#include "third_party/optipng/src/opngreduc.h"
}

namespace {

struct PngInput {
  const std::string* data_;
  int offset_;
};

void ReadPngFromStream(png_structp read_ptr,
                       png_bytep data,
                       png_size_t length) {
  PngInput* input = reinterpret_cast<PngInput*>(read_ptr->io_ptr);
  size_t copied = input->data_->copy(reinterpret_cast<char*>(data), length,
                                     input->offset_);
  input->offset_ += copied;
  if (copied < length) {
    png_error(read_ptr, "ReadPngFromStream: Unexpected EOF.");
  }
}

void WritePngToString(png_structp write_ptr,
                      png_bytep data,
                      png_size_t length) {
  std::string& buffer = *reinterpret_cast<std::string*>(write_ptr->io_ptr);
  buffer.append(reinterpret_cast<char*>(data), length);
}

// no-op
void PngFlush(png_structp write_ptr) {}

}  // namespace

namespace pagespeed {

namespace image_compression {

ScopedPngStruct::ScopedPngStruct(Type type)
    : png_ptr_(NULL), info_ptr_(NULL), type_(type) {
  switch (type) {
    case READ:
      png_ptr_ = png_create_read_struct(PNG_LIBPNG_VER_STRING,
                                       NULL, NULL, NULL);
      break;
    case WRITE:
      png_ptr_ = png_create_write_struct(PNG_LIBPNG_VER_STRING,
                                        NULL, NULL, NULL);
      break;
    default:
      LOG(DFATAL) << "Invalid Type " << type_;
      break;
  }
  if (png_ptr_ != NULL) {
    info_ptr_ = png_create_info_struct(png_ptr_);
  }
}

ScopedPngStruct::~ScopedPngStruct() {
  switch (type_) {
    case READ:
#ifdef PNG_FREE_ME_SUPPORTED
      // For GIF images only, optipng's pngx_malloc_rows allocates the
      // rows. However, if PNG_FREE_ME_SUPPORTED is defined, libpng
      // will not free this data unless PNG_FREE_ROWS is set on the
      // free_me member. Thus we have to explicitly set that field
      // here.
      //
      // We must set it here instead of in gif_reader.cc since the
      // value gets cleared if we set it before the call to
      // pngx_read_gif(), and it's possible that pngx_read_gif()
      // triggers a longjmp which means none of the code after that
      // point gets called. The only place where this code gets
      // executed unconditionally is here in the destructor.
      info_ptr_->free_me |= PNG_FREE_ROWS;
#endif
      png_destroy_read_struct(&png_ptr_, &info_ptr_, NULL);
      break;
    case WRITE:
      png_destroy_write_struct(&png_ptr_, &info_ptr_);
      break;
    default:
      break;
  }
}

PngReaderInterface::~PngReaderInterface() {
}

PngOptimizer::PngOptimizer()
    : read_(ScopedPngStruct::READ),
      write_(ScopedPngStruct::WRITE) {
}

PngOptimizer::~PngOptimizer() {
}

bool PngOptimizer::CreateOptimizedPng(PngReaderInterface& reader,
                                      const std::string& in,
                                      std::string* out) {
  if (!read_.valid() || !write_.valid()) {
    LOG(DFATAL) << "Invalid ScopedPngStruct r: "
                << read_.valid() << ", w: " << write_.valid();
    return false;
  }

  // Configure error handlers.
  if (setjmp(read_.png_ptr()->jmpbuf)) {
    return false;
  }

  if (setjmp(write_.png_ptr()->jmpbuf)) {
    return false;
  }

  if (!reader.ReadPng(in, read_.png_ptr(), read_.info_ptr())) {
    return false;
  }

  if (!opng_validate_image(read_.png_ptr(), read_.info_ptr())) {
    return false;
  }

  // Copy the image data from the read structures to the write structures.
  CopyReadToWrite();

  // Perform all possible lossless image reductions
  // (e.g. RGB->palette, etc).
  opng_reduce_image(write_.png_ptr(), write_.info_ptr(), OPNG_REDUCE_ALL);

  // TODO: try a few different strategies and pick the best one.
  png_set_compression_level(write_.png_ptr(), Z_BEST_COMPRESSION);
  png_set_compression_mem_level(write_.png_ptr(), 8);
  png_set_compression_strategy(write_.png_ptr(), Z_DEFAULT_STRATEGY);
  png_set_filter(write_.png_ptr(), PNG_FILTER_TYPE_BASE, PNG_FILTER_NONE);
  png_set_compression_window_bits(write_.png_ptr(), 9);

  if (!WritePng(out)) {
    return false;
  }

  return true;
}

bool PngOptimizer::OptimizePng(PngReaderInterface& reader,
                               const std::string& in,
                               std::string* out) {
  PngOptimizer o;
  return o.CreateOptimizedPng(reader, in, out);
}

PngReader::~PngReader() {
}

bool PngReader::ReadPng(const std::string& body,
                        png_structp png_ptr,
                        png_infop info_ptr) {
  // Wrap the resource's response body in a structure that keeps a
  // pointer to the body and a read offset, and pass a pointer to this
  // object as the user data to be received by the PNG read function.
  PngInput input;
  input.data_ = &body;
  input.offset_ = 0;
  png_set_read_fn(png_ptr, &input, &ReadPngFromStream);
  png_read_png(png_ptr, info_ptr, PNG_TRANSFORM_IDENTITY, NULL);

  return true;
}

bool PngOptimizer::WritePng(std::string* buffer) {
  png_set_write_fn(write_.png_ptr(), buffer, &WritePngToString, &PngFlush);
  png_write_png(
      write_.png_ptr(), write_.info_ptr(), PNG_TRANSFORM_IDENTITY, NULL);

  return true;
}

void PngOptimizer::CopyReadToWrite() {
  png_uint_32 width, height;
  int bit_depth, color_type, interlace_type, compression_type, filter_type;
  png_get_IHDR(read_.png_ptr(),
               read_.info_ptr(),
               &width,
               &height,
               &bit_depth,
               &color_type,
               &interlace_type,
               &compression_type,
               &filter_type);

  png_set_IHDR(write_.png_ptr(),
               write_.info_ptr(),
               width,
               height,
               bit_depth,
               color_type,
               interlace_type,
               compression_type,
               filter_type);

  png_bytepp row_pointers = png_get_rows(read_.png_ptr(), read_.info_ptr());
  png_set_rows(write_.png_ptr(), write_.info_ptr(), row_pointers);

  png_colorp palette;
  int num_palette;
  if (png_get_PLTE(
          read_.png_ptr(), read_.info_ptr(), &palette, &num_palette) != 0) {
    png_set_PLTE(write_.png_ptr(),
                 write_.info_ptr(),
                 palette,
                 num_palette);
  }

  // Transparency is not considered metadata, although tRNS is
  // ancillary.
  png_bytep trans;
  int num_trans;
  png_color_16p trans_values;
  if (png_get_tRNS(read_.png_ptr(),
                   read_.info_ptr(),
                   &trans,
                   &num_trans,
                   &trans_values) != 0) {
    png_set_tRNS(write_.png_ptr(),
                 write_.info_ptr(),
                 trans,
                 num_trans,
                 trans_values);
  }

  double gamma;
  if (png_get_gAMA(read_.png_ptr(), read_.info_ptr(), &gamma) != 0) {
    png_set_gAMA(write_.png_ptr(), write_.info_ptr(), gamma);
  }

  // Do not copy bkgd, hist or sbit sections, since they are not
  // supported in most browsers.
}

}  // namespace image_compression

}  // namespace pagespeed
