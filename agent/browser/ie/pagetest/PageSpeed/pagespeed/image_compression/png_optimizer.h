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

#ifndef PNG_OPTIMIZER_H_
#define PNG_OPTIMIZER_H_

#include <string>

#include "base/basictypes.h"

struct png_struct_def;
typedef struct png_struct_def png_struct;
typedef png_struct* png_structp;

struct png_info_struct;
typedef struct png_info_struct png_info;
typedef png_info* png_infop;

namespace pagespeed {

namespace image_compression {

// Helper that manages the lifetime of the png_ptr and info_ptr.
class ScopedPngStruct {
 public:
  enum Type {
    READ,
    WRITE
  };

  explicit ScopedPngStruct(Type t);
  ~ScopedPngStruct();

  bool valid() const { return png_ptr_ != NULL && info_ptr_ != NULL; }

  png_structp png_ptr() { return png_ptr_; }
  png_infop info_ptr() { return info_ptr_; }

 private:
  png_structp png_ptr_;
  png_infop info_ptr_;
  Type type_;
};

// Helper class that provides an API to read a PNG image from some
// source.
class PngReaderInterface {
 public:
  virtual ~PngReaderInterface();

  // Parse the contents of body, convert to a PNG, and populate the
  // PNG structures with the PNG representation. Returns true on
  // success, false on failure.
  virtual bool ReadPng(const std::string& body,
                       png_structp png_ptr,
                       png_infop info_ptr) = 0;
};

class PngOptimizer {
 public:
  static bool OptimizePng(PngReaderInterface& reader,
                          const std::string& in,
                          std::string* out);

 private:
  PngOptimizer();
  ~PngOptimizer();

  // Take the given input and losslessly compress it by removing
  // all unnecessary chunks, and by choosing an optimal PNG encoding.
  // @return true on success, false on failure.
  bool CreateOptimizedPng(PngReaderInterface& reader,
                          const std::string& in,
                          std::string* out);

  bool WritePng(std::string* buffer);
  void CopyReadToWrite();

  ScopedPngStruct read_;
  ScopedPngStruct write_;

  DISALLOW_COPY_AND_ASSIGN(PngOptimizer);
};

// Reader for PNG-encoded data.
class PngReader : public PngReaderInterface {
 public:
  virtual ~PngReader();
  virtual bool ReadPng(const std::string& body,
                       png_structp png_ptr,
                       png_infop info_ptr);
};

}  // namespace image_compression

}  // namespace pagespeed

#endif  // PNG_OPTIMIZER_H_
