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

#ifndef PAGESPEED_RULES_MINIFY_RULE_H_
#define PAGESPEED_RULES_MINIFY_RULE_H_

#include <string>

#include "base/basictypes.h"
#include "base/scoped_ptr.h"
#include "pagespeed/core/rule.h"

namespace pagespeed {

namespace rules {

// Compute the rule score as a function of the "cost" of the rule,
// where the cost is usually the number of wasted bytes.
class CostBasedScoreComputer {
 public:
  CostBasedScoreComputer(int64 max_possible_cost);
  virtual ~CostBasedScoreComputer();

  int ComputeScore();

 protected:
  virtual int64 ComputeCost() = 0;

  const int64 max_possible_cost_;
};

// Compute a rule score as a function of the "cost" of the rule,
// taking a cost weight into account.  For many minification rules,
// there is no upper bound on how large an unoptimized resource can
// be, and thus no limit to the possible cost. Each of these rules
// specifies a "cost weight" multiplier that maps the cost into a
// range that distributes scores into a reasonable distribution from
// 0..100.  The weights were chosen by analyzing the resources of the top
// 100 web sites.
class WeightedCostBasedScoreComputer : public CostBasedScoreComputer {
 public:
  WeightedCostBasedScoreComputer(const ResultVector* results,
                                 int64 max_possible_cost,
                                 double cost_weight);

 protected:
  virtual int64 ComputeCost();

 private:
  const ResultVector* const results_;
  const double cost_weight_;
};

struct MinifierOutput {
 public:
  MinifierOutput() : bytes_saved_(0) {}

  explicit MinifierOutput(int bytes_saved) : bytes_saved_(bytes_saved) {}

  MinifierOutput(int bytes_saved, const std::string& optimized_content,
                 const std::string& optimized_content_mime_type)
      : bytes_saved_(bytes_saved),
        optimized_content_(new std::string(optimized_content)),
        optimized_content_mime_type_(optimized_content_mime_type) {}

  int bytes_saved() const { return bytes_saved_; }
  const std::string* optimized_content() const {
    return optimized_content_.get();
  }
  const std::string& optimized_content_mime_type() const {
    return optimized_content_mime_type_;
  }

 private:
  int bytes_saved_;
  scoped_ptr<std::string> optimized_content_;
  std::string optimized_content_mime_type_;

  DISALLOW_COPY_AND_ASSIGN(MinifierOutput);
};

class Minifier {
 public:
  Minifier();
  virtual ~Minifier();

  virtual const char* name() const = 0;
  virtual const char* header_format() const = 0;
  virtual const char* documentation_url() const = 0;
  virtual const char* body_format() const = 0;
  virtual const char* child_format() const = 0;
  virtual const MinifierOutput* Minify(const Resource& resource) const = 0;

 private:
  DISALLOW_COPY_AND_ASSIGN(Minifier);
};

/**
 * Class for rules that reduce the size of resources.
 */
class MinifyRule : public Rule {
 public:
  explicit MinifyRule(Minifier* minifier);
  virtual ~MinifyRule();

  // Rule interface.
  virtual const char* name() const;
  virtual const char* header() const;
  virtual const char* documentation_url() const;
  virtual bool AppendResults(const PagespeedInput& input,
                             ResultProvider* provider);
  virtual void FormatResults(const ResultVector& results,
                             Formatter* formatter);
 private:
  scoped_ptr<Minifier> minifier_;

  DISALLOW_COPY_AND_ASSIGN(MinifyRule);
};

}  // namespace rules

}  // namespace pagespeed

#endif  // PAGESPEED_RULES_MINIFY_RULE_H_
