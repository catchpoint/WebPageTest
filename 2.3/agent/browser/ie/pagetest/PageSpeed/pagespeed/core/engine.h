// Copyright 2009 Google Inc.
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

// Pagespeed rule engine.
//
// This API allows clients to query the library for rule violations
// triggered by the resources in the input set.

#ifndef PAGESPEED_CORE_ENGINE_H_
#define PAGESPEED_CORE_ENGINE_H_

#include <map>
#include <string>
#include <vector>

#include "base/basictypes.h"

namespace pagespeed {

class InputInformation;
class PagespeedInput;
class ResultText;
class Results;
class Rule;
class RuleFormatter;

class Engine {
 public:
  // Instantiate an Engine that uses the given Rule
  // instances. Ownership of the Rule instances is transferred to
  // the Engine object. The passed-in rules vector will be cleared
  // after the rule ownership is transferred to this Engine object.
  explicit Engine(std::vector<Rule*>* rules);
  virtual ~Engine();

  // Initialize the engine. Must be called once, immediately after
  // instantiating the engine.
  void Init();

  // Compute and add results to the result set by querying rule
  // objects about results they produce.
  // @return true iff the computation was completed without errors.
  bool ComputeResults(const PagespeedInput& input, Results* results) const;

  // Generate a formatted representation of the results, such as
  // human-readable markup that will be displayed to a user.
  // @return true iff the formatting was completed without errors.
  bool FormatResults(const Results& results,
                     RuleFormatter* formatter) const;

  // Compute the results and generate their formatted
  // representation. This is a convenience method that invokes both
  // ComputeResults and FormatResults.
  // @return true iff the computation was completed without errors. if
  // false is returned, the formatter will only be invoked for those
  // results that did not generate errors.
  bool ComputeAndFormatResults(const PagespeedInput& input,
                               RuleFormatter* formatter) const;

 private:
  void PopulateNameToRuleMap();

  // Populate the Results structure with additional information
  // (i.e. the Page Speed library version, the set of rules being run,
  // etc).
  void PrepareResults(const PagespeedInput& input, Results *results) const;

  typedef std::map<std::string, Rule*> NameToRuleMap;

  std::vector<Rule*> rules_;
  NameToRuleMap name_to_rule_map_;
  bool init_;

  DISALLOW_COPY_AND_ASSIGN(Engine);
};

}  // namespace pagespeed

#endif  // PAGESPEED_CORE_ENGINE_H_
