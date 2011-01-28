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

#include "pagespeed/core/rule.h"

#include <algorithm>
#include "base/basictypes.h"
#include "pagespeed/core/resource_util.h"
#include "pagespeed/proto/pagespeed_output.pb.h"

namespace pagespeed {

namespace {

// Scoring algorithm constants.
// Actual values picked such that the algorithm below produces results
// that are similar to those produced by the algorithm used in the
// pagespeed firefox extension for several sample pages.  Beyond that,
// the response bytes impact was picked to maximize dynamic range,
// request impact should be higher than response bytes impact since it
// adds round trips, and DNS lookup impact should be higher than
// request impact since pending DNS lookups block regular requests.
// Expect these constants and/or the algorithm below to change as we learn
// more about how it performs against a larger set of pages and we start
// trying to draw correlations between page load times and scores.
const double kRequestBytesImpact = 3.0;
const double kResponseBytesImpact = 3.0;
const double kRequestImpact = 5.0;
const double kDnsLookupImpact = 1.5 * kRequestImpact;

// Page reflow penalty derived from the constant used by the JS
// implementation "Specify Image Dimensions" rule in the Page Speed
// Firefox extension.
// TODO Improve reflow scoring algorithm.  Reflow cost depends on the
// size of the page structure that participates in the reflow
// operation.  Scoring should probably depend on the total size of the
// page.
const double kReflowPenalty = 0.05;

// Penalty for the critical path length being longer then necessary.
// TODO Improve critical-path-length scoring algorithm.
const double kCriticalPathPenalty = 0.15;

/* Return true if result1 is judged to have (strictly) greater impact than
 * result2, false otherwise.  Note that this function imposes a total order on
 * what is essentially partially-ordered data, and thus gives somewhat
 * arbitrary answers. */
bool CompareResults(const Result* result1, const Result* result2) {
  const Savings& savings1 = result1->savings();
  const Savings& savings2 = result2->savings();
  if (savings1.dns_requests_saved() != savings2.dns_requests_saved()) {
    return savings1.dns_requests_saved() > savings2.dns_requests_saved();
  } else if (savings1.requests_saved() != savings2.requests_saved()) {
    return savings1.requests_saved() > savings2.requests_saved();
  } else if (savings1.response_bytes_saved() !=
             savings2.response_bytes_saved()) {
    return savings1.response_bytes_saved() > savings2.response_bytes_saved();
  } else if (result1->resource_urls_size() != result2->resource_urls_size()) {
    return result1->resource_urls_size() > result2->resource_urls_size();
  } else if (result1->resource_urls_size() > 0) {
    // If the savings are equal, sort in descending alphabetical
    // order.
    return result1->resource_urls(0) < result2->resource_urls(0);
  }

  // The results appear to be equal.
  return false;
}

}  // namespace

Rule::Rule(const InputCapabilities& capability_requirements)
    : capability_requirements_(capability_requirements) {}

Rule::~Rule() {}

int Rule::ComputeScore(const InputInformation& input_info,
                       const ResultVector& results) {
  int request_bytes_saved = 0, response_bytes_saved = 0, dns_saved = 0,
      requests_saved = 0, reflows_saved = 0, critical_path_saved = 0;
  for (std::vector<const Result*>::const_iterator iter = results.begin(),
           end = results.end();
       iter != end;
       ++iter) {
    const Result* result = *iter;
    if (result->has_savings()) {
      const Savings& savings = result->savings();
      request_bytes_saved += savings.request_bytes_saved();
      response_bytes_saved += savings.response_bytes_saved();
      dns_saved += savings.dns_requests_saved();
      requests_saved += savings.requests_saved();
      reflows_saved += savings.page_reflows_saved();
      critical_path_saved += savings.critical_path_length_saved();
    }
  }

  // TODO improve this scoring heuristic
  double normalized_savings = 0;
  if (request_bytes_saved > 0) {
    if (input_info.total_request_bytes() == 0) {
      return -1;  // information is not available
    }
    normalized_savings +=
        kRequestBytesImpact *
        request_bytes_saved / input_info.total_request_bytes();
  }

  if (response_bytes_saved > 0) {
    int64 total_response_bytes =
        resource_util::ComputeTotalResponseBytes(input_info);
    if (total_response_bytes == 0) {
      return -1;  // information is not available
    }
    normalized_savings +=
        kResponseBytesImpact *
        response_bytes_saved / total_response_bytes;
  }

  if (dns_saved > 0) {
    if (input_info.number_hosts() == 0) {
      return -1;  // information is not available
    }
    normalized_savings +=
        kDnsLookupImpact * dns_saved / input_info.number_hosts();
  }

  if (requests_saved > 0) {
    if (input_info.number_resources() == 0) {
      return -1;  // information is not available
    }
    normalized_savings +=
        kRequestImpact * requests_saved / input_info.number_resources();
  }

  if (reflows_saved > 0) {
    normalized_savings += (kReflowPenalty * reflows_saved);
  }

  if (critical_path_saved > 0) {
    normalized_savings += (kCriticalPathPenalty * critical_path_saved);
  }

  return std::max(0, (int)(100 * (1.0 - normalized_savings)));
}

void Rule::SortResultsInPresentationOrder(ResultVector* rule_results) const {
  // Sort the results in a consistent order so they're always
  // presented to the user in the same order.
  std::stable_sort(rule_results->begin(),
                   rule_results->end(),
                   CompareResults);
}

}  // namespace pagespeed
