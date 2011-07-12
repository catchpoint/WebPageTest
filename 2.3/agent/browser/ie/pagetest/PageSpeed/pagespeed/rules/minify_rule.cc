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

#include "pagespeed/rules/minify_rule.h"

#include <algorithm>
#include <string>
#include <vector>

#include "base/logging.h"
#include "base/scoped_ptr.h"
#include "pagespeed/core/formatter.h"
#include "pagespeed/core/pagespeed_input.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/core/result_provider.h"
#include "pagespeed/proto/pagespeed_output.pb.h"

namespace pagespeed {

namespace rules {

Minifier::Minifier() {}

Minifier::~Minifier() {}

MinifyRule::MinifyRule(Minifier* minifier)
    : pagespeed::Rule(pagespeed::InputCapabilities(
        pagespeed::InputCapabilities::RESPONSE_BODY)),
      minifier_(minifier) {}

MinifyRule::~MinifyRule() {}

const char* MinifyRule::name() const {
  return minifier_->name();
}

const char* MinifyRule::header() const {
  return minifier_->header_format();
}

const char* MinifyRule::documentation_url() const {
  return minifier_->documentation_url();
}

bool MinifyRule::AppendResults(const PagespeedInput& input,
                               ResultProvider* provider) {
  bool error = false;
  for (int idx = 0, num = input.num_resources(); idx < num; ++idx) {
    const Resource& resource = input.GetResource(idx);

    scoped_ptr<const MinifierOutput> output(minifier_->Minify(resource));
    if (output == NULL) {
      error = true;
      continue;
    }
    if (output->bytes_saved() <= 0) {
      continue;
    }

    Result* result = provider->NewResult();
    result->set_original_response_bytes(resource.GetResponseBody().size());
    result->add_resource_urls(resource.GetRequestUrl());

    Savings* savings = result->mutable_savings();
    savings->set_response_bytes_saved(output->bytes_saved());

    const std::string* optimized_content = output->optimized_content();
    if (optimized_content != NULL) {
      result->set_optimized_content(*optimized_content);
      result->set_optimized_content_mime_type(
          output->optimized_content_mime_type());
    }
  }

  return !error;
}

void MinifyRule::FormatResults(const ResultVector& results,
                               Formatter* formatter) {
  int total_original_size = 0;
  int total_bytes_saved = 0;

  for (ResultVector::const_iterator iter = results.begin(),
           end = results.end();
       iter != end;
       ++iter) {
    const Result& result = **iter;
    total_original_size += result.original_response_bytes();
    const Savings& savings = result.savings();
    total_bytes_saved += savings.response_bytes_saved();
  }

  if (total_bytes_saved == 0) {
    return;
  }

  Argument size_arg(Argument::BYTES, total_bytes_saved);
  Argument percent_arg(Argument::INTEGER,
                       (total_original_size == 0 ? 0 :
                        (100 * total_bytes_saved) / total_original_size));
  Formatter* body = formatter->AddChild(minifier_->body_format(),
                                        size_arg, percent_arg);

  for (ResultVector::const_iterator iter = results.begin(),
           end = results.end();
       iter != end;
       ++iter) {
    const Result& result = **iter;
    if (result.resource_urls_size() != 1) {
      LOG(DFATAL) << "Unexpected number of resource URLs.  Expected 1, Got "
                  << result.resource_urls_size() << ".";
      continue;
    }

    const int bytes_saved = result.savings().response_bytes_saved();
    const int original_size = result.original_response_bytes();
    Argument url_arg(Argument::URL, result.resource_urls(0));
    Argument size_arg(Argument::BYTES, bytes_saved);
    Argument percent_arg(Argument::INTEGER,
                         (original_size == 0 ? 0 :
                          (100 * bytes_saved) / original_size));

    std::string format_str = minifier_->child_format();
    std::vector<const Argument*> args;
    args.push_back(&url_arg);
    args.push_back(&size_arg);
    args.push_back(&percent_arg);

    FormatterParameters formatter_args(&format_str, &args);

    if (result.has_optimized_content()) {
      formatter_args.set_optimized_content(
          &result.optimized_content(),
          result.optimized_content_mime_type());
    }

    body->AddChild(formatter_args);
  }
}

CostBasedScoreComputer::CostBasedScoreComputer(int64 max_possible_cost)
    : max_possible_cost_(max_possible_cost) {
}

CostBasedScoreComputer::~CostBasedScoreComputer() {}

int CostBasedScoreComputer::ComputeScore() {
  if (max_possible_cost_ <= 0) {
    LOG(DFATAL) << "Invalid value for max_possible_cost: "
                << max_possible_cost_;
    return -1;
  }

  int score =  static_cast<int>(
      100 * (max_possible_cost_ - ComputeCost()) / max_possible_cost_);

  // Lower bound at zero. If a site's resources are very unoptimized
  // then the computed score could go below zero.
  return std::max(0, score);
}

WeightedCostBasedScoreComputer::WeightedCostBasedScoreComputer(
    const ResultVector* results,
    int64 max_possible_cost,
    double cost_weight) :
    CostBasedScoreComputer(max_possible_cost),
    results_(results),
    cost_weight_(cost_weight) {
}

int64 WeightedCostBasedScoreComputer::ComputeCost() {
  int64 total_cost = 0;
  for (std::vector<const Result*>::const_iterator iter = results_->begin(),
           end = results_->end();
       iter != end;
       ++iter) {
    const Result* result = *iter;
    if (result->has_savings()) {
      const Savings& savings = result->savings();
      total_cost += savings.response_bytes_saved();
    }
  }

  return static_cast<int64>(total_cost * cost_weight_);
}

}  // namespace rules

}  // namespace pagespeed
