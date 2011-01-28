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

#ifndef PAGESPEED_CORE_RULE_H_
#define PAGESPEED_CORE_RULE_H_

#include <string>
#include <vector>
#include "base/basictypes.h"
#include "pagespeed/core/input_capabilities.h"

namespace pagespeed {

class Formatter;
class InputInformation;
class PagespeedInput;
class Resource;
class Result;
class Results;
class ResultProvider;
class ResultText;

typedef std::vector<const Result*> ResultVector;

/**
 * Lint rule checker interface.
 */
class Rule {
 public:
  explicit Rule(const InputCapabilities& capability_requirements);
  virtual ~Rule();

  // String that should be used to identify this rule during result
  // serialization.
  virtual const char* name() const = 0;

  // Human readable rule name.
  virtual const char* header() const = 0;

  // URL linking to the canonical documentation for this rule.
  virtual const char* documentation_url() const = 0;

  // Required InputCapabilities for this Rule.
  const InputCapabilities& capability_requirements() const {
    return capability_requirements_;
  }

  // Compute results and append it to the results set.
  //
  // @param input Input to process.
  // @param result_provider
  // @return true iff the computation was completed without errors.
  virtual bool AppendResults(const PagespeedInput& input,
                             ResultProvider* result_provider) = 0;

  // Interpret the results structure and produce a formatted representation.
  //
  // @param results Results to interpret
  // @param formatter Output formatter
  virtual void FormatResults(const ResultVector& results,
                             Formatter* formatter) = 0;

  // Compute the Rule score from InputInformation and ResultVector.
  //
  // @param input_info Information about resources that are part of the page.
  // @param results Result vector that contains savings information.
  // @returns 0-100 score.
  virtual int ComputeScore(const InputInformation& input_info,
                           const ResultVector& results);

  // Sort the results in their presentation order.
  virtual void SortResultsInPresentationOrder(ResultVector* rule_results) const;

private:
  const InputCapabilities capability_requirements_;

  DISALLOW_COPY_AND_ASSIGN(Rule);
};

}  // namespace pagespeed

#endif  // PAGESPEED_CORE_RULE_H_
