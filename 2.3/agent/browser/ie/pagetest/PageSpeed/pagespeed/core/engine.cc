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

#include "pagespeed/core/engine.h"

#include <string>

#include "base/logging.h"
#include "base/stl_util-inl.h"  // for STLDeleteContainerPointers
#include "pagespeed/core/formatter.h"
#include "pagespeed/core/pagespeed_input.h"
#include "pagespeed/core/pagespeed_version.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/core/result_provider.h"
#include "pagespeed/core/rule.h"
#include "pagespeed/proto/pagespeed_output.pb.h"

namespace pagespeed {

namespace {

typedef std::map<std::string, ResultVector> RuleToResultMap;

void PopulateRuleToResultMap(const Results& results,
                             RuleToResultMap *rule_to_result_map) {
  for (int idx = 0, end = results.rules_size(); idx < end; ++idx) {
    // Create an entry for each rule that was run, even if there are
    // no results for that rule.
    (*rule_to_result_map)[results.rules(idx)];
  }

  for (int idx = 0, end = results.results_size(); idx < end; ++idx) {
    const Result& result = results.results(idx);
    (*rule_to_result_map)[result.rule_name()].push_back(&result);
  }
}

void FormatRuleResults(const ResultVector& rule_results,
                       const InputInformation& input_info,
                       Rule* rule,
                       RuleFormatter* formatter) {
  int score = 100;
  if (!rule_results.empty()) {
    score = rule->ComputeScore(input_info, rule_results);
    if (score > 100 || score < -1) {
      // Note that the value -1 indicates a valid score could not be
      // computed, so we need to allow it.
      LOG(ERROR) << "Score for " << rule->name() << " out of bounds: " << score;
      score = std::max(-1, std::min(100, score));
    }
  }
  Formatter* rule_formatter = formatter->AddHeader(*rule, score);
  if (!rule_results.empty()) {
    rule->FormatResults(rule_results, rule_formatter);
  }
}

}  // namespace

Engine::Engine(std::vector<Rule*>* rules) : rules_(*rules), init_(false) {
  // Now that we've transferred the rule ownership to our local
  // vector, clear the passed in vector.
  rules->clear();
}

Engine::~Engine() {
  STLDeleteContainerPointers(rules_.begin(), rules_.end());
}

void Engine::Init() {
  CHECK(!init_);

  PopulateNameToRuleMap();
  init_ = true;
}

void Engine::PopulateNameToRuleMap() {
  for (std::vector<Rule*>::const_iterator iter = rules_.begin(),
           end = rules_.end();
       iter != end;
       ++iter) {
    Rule *rule = *iter;
    if (name_to_rule_map_.find(rule->name()) != name_to_rule_map_.end()) {
      LOG(DFATAL) << "Found duplicate rule while populating name to rule map.  "
                  << rule->name();
    }
    name_to_rule_map_[rule->name()] = rule;
  }
}

bool Engine::ComputeResults(const PagespeedInput& input,
                            Results* results) const {
  CHECK(init_);

  if (!input.is_frozen()) {
    LOG(DFATAL) << "Attempting to ComputeResults with non-frozen input.";
    return false;
  }

  PrepareResults(input, results);

  bool success = true;
  for (std::vector<Rule*>::const_iterator iter = rules_.begin(),
           end = rules_.end();
       iter != end;
       ++iter) {
    Rule* rule = *iter;
    ResultProvider provider(*rule, results);
    bool rule_success = rule->AppendResults(input, &provider);
    if (!rule_success) {
      // Record that the rule encountered an error.
      results->add_error_rules(rule->name());
      success = false;
    }
  }

  if (!results->IsInitialized()) {
    LOG(DFATAL) << "Failed to fully initialize results object.";
    return false;
  }

  return success;
}

bool Engine::FormatResults(const Results& results,
                           RuleFormatter* formatter) const {
  CHECK(init_);

  if (!results.IsInitialized()) {
    LOG(ERROR) << "Results instance not fully initialized.";
    return false;
  }

  RuleToResultMap rule_to_result_map;
  PopulateRuleToResultMap(results, &rule_to_result_map);

  bool success = true;
  for (int idx = 0, end = results.rules_size(); idx < end; ++idx) {
    const std::string& rule_name = results.rules(idx);
    NameToRuleMap::const_iterator rule_iter = name_to_rule_map_.find(rule_name);
    if (rule_iter == name_to_rule_map_.end()) {
      // No rule registered to handle the given rule name. This could
      // happen if the Results object was generated with a different
      // version of the Page Speed library, so we do not want to CHECK
      // that the Rule is non-null here.
      LOG(WARNING) << "Unable to find rule instance with name " << rule_name;
      success = false;
      continue;
    }
    Rule* rule = rule_iter->second;
    ResultVector& rule_results = rule_to_result_map[rule_name];
    rule->SortResultsInPresentationOrder(&rule_results);
    FormatRuleResults(rule_results,
                      results.input_info(),
                      rule,
                      formatter);
  }
  formatter->Done();
  return success;
}

bool Engine::ComputeAndFormatResults(const PagespeedInput& input,
                                     RuleFormatter* formatter) const {
  CHECK(init_);

  Results results;
  bool success = ComputeResults(input, &results);
  success = FormatResults(results, formatter) && success;
  return success;
}

void Engine::PrepareResults(const PagespeedInput& input,
                            Results* results) const {
  for (std::vector<Rule*>::const_iterator it = rules_.begin(),
           end = rules_.end(); it != end; ++it) {
    const Rule& rule = **it;
    results->add_rules(rule.name());
  }
  results->mutable_input_info()->CopyFrom(*input.input_information());
  GetPageSpeedVersion(results->mutable_version());
}

}  // namespace pagespeed
