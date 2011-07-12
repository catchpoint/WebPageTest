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

#include "pagespeed/rules/minify_css.h"

#include <string>

#include "base/logging.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/cssmin/cssmin.h"
#include "pagespeed/proto/pagespeed_output.pb.h"

namespace pagespeed {

namespace rules {

namespace {

// This cost weight yields an avg score of 83 and a median score of 100
// for the top 100 websites.
const double kCostWeight = 3.5;

class CssMinifier : public Minifier {
 public:
  explicit CssMinifier(bool save_optimized_content)
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

  DISALLOW_COPY_AND_ASSIGN(CssMinifier);
};

const char* CssMinifier::name() const {
  return "MinifyCSS";
}

const char* CssMinifier::header_format() const {
  return "Minify CSS";
}

const char* CssMinifier::documentation_url() const {
  return "payload.html#MinifyCSS";
}

const char* CssMinifier::body_format() const {
  return ("Minifying the following CSS resources could "
          "reduce their size by $1 ($2% reduction).");
}

const char* CssMinifier::child_format() const {
  return "Minifying $1 could save $2 ($3% reduction).";
}

const MinifierOutput* CssMinifier::Minify(const Resource& resource) const {
  if (resource.GetResourceType() != CSS) {
    return new MinifierOutput();
  }

  const std::string& input = resource.GetResponseBody();
  if (save_optimized_content_) {
    std::string minified_css;
    if (!cssmin::MinifyCss(input, &minified_css)) {
      return NULL; // error
    }
    return new MinifierOutput(input.size() - minified_css.size(),
                              minified_css, "text/css");
  } else {
    int minified_css_size = 0;
    if (!cssmin::GetMinifiedCssSize(input, &minified_css_size)) {
      return NULL; // error
    }
    return new MinifierOutput(input.size() - minified_css_size);
  }
};

}  // namespace

MinifyCSS::MinifyCSS(bool save_optimized_content)
    : MinifyRule(new CssMinifier(save_optimized_content)) {}

int MinifyCSS::ComputeScore(const InputInformation& input_info,
                            const ResultVector& results) {
  WeightedCostBasedScoreComputer score_computer(
      &results, input_info.css_response_bytes(), kCostWeight);
  return score_computer.ComputeScore();
}

}  // namespace rules

}  // namespace pagespeed
