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

#include "pagespeed/rules/minify_javascript.h"

#include <string>

#include "base/logging.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/proto/pagespeed_output.pb.h"
#include "third_party/jsmin/cpp/jsmin.h"

namespace pagespeed {

namespace rules {

namespace {

// This cost weight yields an avg score of 84 and a median score of 97
// for the top 100 websites.
const double kCostWeight = 3.5;

class JsMinifier : public Minifier {
 public:
  explicit JsMinifier(bool save_optimized_content)
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

  DISALLOW_COPY_AND_ASSIGN(JsMinifier);
};

const char* JsMinifier::name() const {
  return "MinifyJavaScript";
}

const char* JsMinifier::header_format() const {
  return "Minify JavaScript";
}

const char* JsMinifier::documentation_url() const {
  return "payload.html#MinifyJS";
}

const char* JsMinifier::body_format() const {
  return ("Minifying the following JavaScript resources using JSMin could "
          "reduce their size by $1 ($2% reduction).");
}

const char* JsMinifier::child_format() const {
  return "Minifying $1 could save $2 ($3% reduction).";
}

const MinifierOutput* JsMinifier::Minify(const Resource& resource) const {
  if (resource.GetResourceType() != JS) {
    return new MinifierOutput();
  }

  const std::string& input = resource.GetResponseBody();
  if (save_optimized_content_) {
    std::string minified_js;
    if (!jsmin::MinifyJs(input, &minified_js)) {
      return NULL; // error
    }
    return new MinifierOutput(input.size() - minified_js.size(),
                              minified_js, "text/javascript");
  } else {
    int minified_js_size = 0;
    if (!jsmin::GetMinifiedJsSize(input, &minified_js_size)) {
      return NULL; // error
    }
    return new MinifierOutput(input.size() - minified_js_size);
  }
};

}  // namespace

MinifyJavaScript::MinifyJavaScript(bool save_optimized_content)
    : MinifyRule(new JsMinifier(save_optimized_content)) {}

int MinifyJavaScript::ComputeScore(const InputInformation& input_info,
                                   const ResultVector& results) {
  WeightedCostBasedScoreComputer score_computer(
      &results, input_info.javascript_response_bytes(), kCostWeight);
  return score_computer.ComputeScore();
}

}  // namespace rules

}  // namespace pagespeed
