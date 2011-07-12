// Copyright 2009 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Command line utility to optimize images

#include <stdio.h>

#include <algorithm>
#include <fstream>
#include <iterator>
#include <string>

#ifdef PAGESPEED_PNG_OPTIMIZER_GIF_READER
#include "pagespeed/image_compression/gif_reader.h"
#endif
#include "pagespeed/image_compression/jpeg_optimizer.h"
#include "pagespeed/image_compression/png_optimizer.h"

#ifdef PAGESPEED_PNG_OPTIMIZER_GIF_READER
using pagespeed::image_compression::GifReader;
#endif
using pagespeed::image_compression::OptimizeJpeg;
using pagespeed::image_compression::PngOptimizer;
using pagespeed::image_compression::PngReader;

namespace {

enum ImageType {
  NOT_SUPPORTED,
  JPEG,
  PNG,
  GIF,
};

// use file extension to determine what optimizer should be used.
ImageType DetermineImageType(const std::string& filename) {
  size_t dot_pos = filename.rfind('.');
  if (dot_pos != std::string::npos) {
    std::string extension;
    std::transform(filename.begin() + dot_pos + 1, filename.end(),
                   std::back_insert_iterator<std::string>(extension),
                   tolower);
    if (extension == "jpg" || extension == "jpeg") {
      return JPEG;
    } else if (extension == "png") {
      return PNG;
    } else if (extension == "gif") {
      return GIF;
    }
  }
  return NOT_SUPPORTED;
}

}

int main(int argc, char** argv) {
  if (argc != 3) {
    fprintf(stderr, "Usage: optimize_image <input> <output>\n");
    return 1;
  }

  std::string filename = argv[1];
  std::ifstream in(filename.c_str(), std::ios::in | std::ios::binary);
  if (!in) {
    fprintf(stderr, "Could not read input from %s\n", filename.c_str());
    return 1;
  }

  in.seekg (0, std::ios::end);
  int length = in.tellg();
  in.seekg (0, std::ios::beg);

  char* buffer = new char[length];
  in.read(buffer, length);
  in.close();

  std::string file_contents(buffer, length);
  delete[] buffer;

  std::string compressed;
  ImageType type = DetermineImageType(filename);

  bool success = false;
  if (type == JPEG) {
    success = OptimizeJpeg(file_contents, &compressed);
  } else if (type == PNG) {
    PngReader reader;
    success = PngOptimizer::OptimizePng(reader,
                                        file_contents,
                                        &compressed);
#if defined(PAGESPEED_PNG_OPTIMIZER_GIF_READER)
  } else if (type == GIF) {
    GifReader reader;
    success = PngOptimizer::OptimizePng(reader,
                                        file_contents,
                                        &compressed);
#endif
  } else {
    fprintf(stderr,
            "Unsupported image type when processing %s\n",
            filename.c_str());
    return 1;
  }

  if (!success) {
    fprintf(stderr,
            "Image compression failed when processing %s\n",
            filename.c_str());
    return 1;
  }

  if (compressed.size() >= file_contents.size()) {
    compressed = file_contents;
  }

  std::ofstream out(argv[2], std::ios::out | std::ios::binary);
  if (!out) {
    fprintf(stderr, "Error opening %s for write\n", argv[2]);
    return 1;
  }
  out.write(compressed.c_str(), compressed.size());
  out.close();
  return 0;
}
