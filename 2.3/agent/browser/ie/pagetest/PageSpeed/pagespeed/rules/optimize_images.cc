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

#include "pagespeed/rules/optimize_images.h"

#include <string>

#include "pagespeed/core/resource.h"

#ifdef PAGESPEED_PNG_OPTIMIZER_GIF_READER
#include "pagespeed/image_compression/gif_reader.h"
#endif  // PAGESPEED_PNG_OPTIMIZER_GIF_READER

#include "pagespeed/image_compression/jpeg_optimizer.h"
#include "pagespeed/image_compression/png_optimizer.h"
#include "pagespeed/proto/pagespeed_output.pb.h"

namespace pagespeed {

namespace rules {

namespace {

// This cost weight yields an avg score of 85 and a median score of 95
// for the top 100 websites.
const double kCostWeight = 3;

class ImageMinifier : public Minifier {
 public:
  explicit ImageMinifier(bool save_optimized_content)
      : save_optimized_content_(save_optimized_content) {}

  // Minifier interface:
  virtual const char* name() const;
  virtual const char* header_format() const;
  virtual const char* documentation_url() const;
  virtual const char* body_format() const;
  virtual const char* child_format() const;
  virtual const MinifierOutput* Minify(const Resource& resource) const;

 private:
  bool save_optimized_content_;

  DISALLOW_COPY_AND_ASSIGN(ImageMinifier);
};

const char* ImageMinifier::name() const {
  return "OptimizeImages";
}

const char* ImageMinifier::header_format() const {
  return "Optimize images";
}

const char* ImageMinifier::documentation_url() const {
  return "payload.html#CompressImages";
}

const char* ImageMinifier::body_format() const {
  return ("Optimizing the following images could reduce their size "
          "by $1 ($2% reduction).");
}

const char* ImageMinifier::child_format() const {
  return "Losslessly compressing $1 could save $2 ($3% reduction).";
}

const MinifierOutput* ImageMinifier::Minify(const Resource& resource) const {
  if (resource.GetResourceType() != IMAGE) {
    return new MinifierOutput();
  }

  const ImageType type = resource.GetImageType();
  const std::string& original = resource.GetResponseBody();

  std::string compressed;
  std::string output_mime_type;
  if (type == JPEG) {
    if (!image_compression::OptimizeJpeg(original, &compressed)) {
      return NULL; // error
    }
    output_mime_type = "image/jpeg";
  } else if (type == PNG) {
    image_compression::PngReader reader;
    if (!image_compression::PngOptimizer::OptimizePng(reader,
                                                      original,
                                                      &compressed)) {
      return NULL; // error
    }
    output_mime_type = "image/png";
#ifdef PAGESPEED_PNG_OPTIMIZER_GIF_READER
  } else if (type == GIF) {
    image_compression::GifReader reader;
    if (!image_compression::PngOptimizer::OptimizePng(reader,
                                                      original,
                                                      &compressed)) {
      return NULL; // error
    }
    output_mime_type = "image/png";
#endif
  } else {
    return new MinifierOutput();
  }

  const int bytes_saved = original.size() - compressed.size();
  if (save_optimized_content_) {
    return new MinifierOutput(bytes_saved, compressed, output_mime_type);
  } else {
    return new MinifierOutput(bytes_saved);
  }
}

}  // namespace

OptimizeImages::OptimizeImages(bool save_optimized_content)
    : MinifyRule(new ImageMinifier(save_optimized_content)) {}

int OptimizeImages::ComputeScore(const InputInformation& input_info,
                                 const ResultVector& results) {
  WeightedCostBasedScoreComputer score_computer(
      &results, input_info.image_response_bytes(), kCostWeight);
  return score_computer.ComputeScore();
}

}  // namespace rules

}  // namespace pagespeed
