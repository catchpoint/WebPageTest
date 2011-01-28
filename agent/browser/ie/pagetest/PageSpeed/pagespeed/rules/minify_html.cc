// Copyright 2010 Google Inc. All Rights Reserved.
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

#include "pagespeed/rules/minify_html.h"

#include <string>

#include "base/logging.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/html/html_minifier.h"
#include "pagespeed/proto/pagespeed_output.pb.h"

namespace pagespeed {

namespace rules {

namespace {

// This cost weight yields an avg score of 83 and a median score of 84
// for the top 100 websites.
const double kCostWeight = 1.5;

class HtmlMinifier : public Minifier {
 public:
  explicit HtmlMinifier(bool save_optimized_content)
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

  DISALLOW_COPY_AND_ASSIGN(HtmlMinifier);
};

const char* HtmlMinifier::name() const {
  return "MinifyHTML";
}

const char* HtmlMinifier::header_format() const {
  return "Minify HTML";
}

const char* HtmlMinifier::documentation_url() const {
  return "payload.html#MinifyHTML";
}

const char* HtmlMinifier::body_format() const {
  return ("Minifying the following HTML resources could "
          "reduce their size by $1 ($2% reduction).");
}

const char* HtmlMinifier::child_format() const {
  return "Minifying $1 could save $2 ($3% reduction).";
}

const MinifierOutput* HtmlMinifier::Minify(const Resource& resource) const {
  if (resource.GetResourceType() != HTML) {
    return new MinifierOutput();
  }

  const std::string& input = resource.GetResponseBody();
  std::string minified_html;
  ::pagespeed::html::HtmlMinifier html_minifier;
  if (!html_minifier.MinifyHtml(resource.GetRequestUrl(),
                                input, &minified_html)) {
    return NULL;  // error
  }

  if (save_optimized_content_) {
    return new MinifierOutput(input.size() - minified_html.size(),
                              minified_html, "text/html");
  } else {
    return new MinifierOutput(input.size() - minified_html.size());
  }
};

}  // namespace

MinifyHTML::MinifyHTML(bool save_optimized_content)
    : MinifyRule(new HtmlMinifier(save_optimized_content)) {}

int MinifyHTML::ComputeScore(const InputInformation& input_info,
                             const ResultVector& results) {
  WeightedCostBasedScoreComputer score_computer(
      &results, input_info.html_response_bytes(), kCostWeight);
  return score_computer.ComputeScore();
}

}  // namespace rules

}  // namespace pagespeed
