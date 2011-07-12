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

#include "pagespeed/rules/leverage_browser_caching.h"

#include <algorithm>  // for stable_sort()

#include "base/logging.h"
#include "pagespeed/core/formatter.h"
#include "pagespeed/core/pagespeed_input.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/core/resource_util.h"
#include "pagespeed/core/result_provider.h"
#include "pagespeed/proto/pagespeed_output.pb.h"

namespace {

const int64 kMillisInADay = 1000 * 60 * 60 * 24;
const int64 kMillisInAWeek = kMillisInADay * 7;

// Extract the freshness lifetime from the result object.
int64 GetFreshnessLifetimeMillis(const pagespeed::Result &result) {
  const pagespeed::ResultDetails& details = result.details();
  if (!details.HasExtension(pagespeed::CachingDetails::message_set_extension)) {
    LOG(DFATAL) << "Missing required extension.";
    return -1;
  }

  const pagespeed::CachingDetails& caching_details = details.GetExtension(
      pagespeed::CachingDetails::message_set_extension);
  if (caching_details.is_heuristically_cacheable()) {
    if (caching_details.has_freshness_lifetime_millis()) {
      LOG(DFATAL) << "Details has a freshness_lifetime_millis "
                  << "and is_heuristically_cacheable.";
      return -1;
    }

    return 0;
  }

  return caching_details.freshness_lifetime_millis();
}

int64 ComputeAverageFreshnessLifetimeMillis(
    const pagespeed::InputInformation& input_info,
    const pagespeed::ResultVector& results) {
  if (results.size() <= 0) {
    LOG(DFATAL) << "Unexpected inputs: " << results.size();
    return -1;
  }
  const int number_static_resources = input_info.number_static_resources();

  // Any results that weren't flagged by this rule are properly
  // cached. This computation makes assumptions about the
  // implementation of AppendResults(). See the NOTE comment at the
  // top of that function for more details.
  const int number_properly_cached_resources =
      number_static_resources - results.size();
  if (number_properly_cached_resources < 0) {
    LOG(DFATAL) << "Number of results exceeds number of static resources.";
    return -1;
  }

  // Sum all of the freshness lifetimes of the results, so we can
  // compute an average.
  int64 freshness_lifetime_sum = 0;
  for (int i = 0, num = results.size(); i < num; ++i) {
    int64 resource_freshness_lifetime = GetFreshnessLifetimeMillis(*results[i]);
    if (resource_freshness_lifetime < 0) {
      // An error occurred.
      return -1;
    }
    freshness_lifetime_sum += resource_freshness_lifetime;
  }

  // In computing the score, we also need to account for the resources
  // that are properly cached, adding the target caching lifetime for
  // each such resource.
  freshness_lifetime_sum += (number_properly_cached_resources * kMillisInAWeek);

  return freshness_lifetime_sum / number_static_resources;
}

// StrictWeakOrdering that sorts by freshness lifetime
struct SortByFreshnessLifetime {
  bool operator()(const pagespeed::Result *a, const pagespeed::Result *b) {
    return GetFreshnessLifetimeMillis(*a) < GetFreshnessLifetimeMillis(*b);
    return true;
  }
};

}  // namespace

namespace pagespeed {

namespace rules {

LeverageBrowserCaching::LeverageBrowserCaching()
    : pagespeed::Rule(pagespeed::InputCapabilities()) {}

const char* LeverageBrowserCaching::name() const {
  return "LeverageBrowserCaching";
}

const char* LeverageBrowserCaching::header() const {
  return "Leverage browser caching";
}

const char* LeverageBrowserCaching::documentation_url() const {
  return "caching.html#LeverageBrowserCaching";
}

bool LeverageBrowserCaching::AppendResults(const PagespeedInput& input,
                                           ResultProvider* provider) {
  // NOTE: It's important that this rule only include results returned
  // from IsLikelyStaticResource. The logic in
  // ComputeAverageFreshnessLifetimeMillis assumes that the Results
  // emitted by this rule is the intersection of those that return
  // true for IsLikelyStaticResource and those that have an explicit
  // freshness lifetime less than kMillisInAWeek (the computation of
  // number_properly_cached_resources makes this assumption). If
  // AppendResults changes such that this is no longer true, the
  // computation of number_properly_cached_resources will need to
  // change to match.
  for (int i = 0, num = input.num_resources(); i < num; ++i) {
    const Resource& resource = input.GetResource(i);
    if (!resource_util::IsLikelyStaticResource(resource)) {
      continue;
    }

    int64 freshness_lifetime_millis = 0;
    bool has_freshness_lifetime = resource_util::GetFreshnessLifetimeMillis(
        resource, &freshness_lifetime_millis);

    if (has_freshness_lifetime) {
      if (freshness_lifetime_millis <= 0) {
        // This should never happen.
        LOG(ERROR) << "Explicitly non-cacheable resources should "
                   << "not pass IsLikelyStaticResource test.";
        continue;
      }

      if (freshness_lifetime_millis >= kMillisInAWeek) {
        continue;
      }
    }

    Result* result = provider->NewResult();
    ResultDetails* details = result->mutable_details();
    CachingDetails* caching_details = details->MutableExtension(
        CachingDetails::message_set_extension);
    // At this point, the resource either has an explicit freshness
    // lifetime, or it's heuristically cacheable. So we need to fill
    // out the appropriate field in the details structure.
    if (has_freshness_lifetime) {
      caching_details->set_freshness_lifetime_millis(freshness_lifetime_millis);
    } else {
      caching_details->set_is_heuristically_cacheable(true);
    }
    result->add_resource_urls(resource.GetRequestUrl());
  }
  return true;
}

void LeverageBrowserCaching::FormatResults(const ResultVector& results,
                                           Formatter* formatter) {
  if (results.empty()) {
    return;
  }

  Formatter* body = formatter->AddChild(
      "The following cacheable resources have a short "
      "freshness lifetime. Specify an expiration at least one "
      "week in the future for the following resources:");

  // Show the resources with the shortest freshness lifetime first.
  ResultVector sorted_results = results;
  std::stable_sort(sorted_results.begin(),
                   sorted_results.end(),
                   SortByFreshnessLifetime());

  for (ResultVector::const_iterator iter = sorted_results.begin(),
           end = sorted_results.end();
       iter != end;
       ++iter) {
    const Result& result = **iter;
    if (result.resource_urls_size() != 1) {
      LOG(DFATAL) << "Unexpected number of resource URLs.  Expected 1, Got "
                  << result.resource_urls_size() << ".";
      continue;
    }
    const ResultDetails& details = result.details();
    if (!details.HasExtension(CachingDetails::message_set_extension)) {
      LOG(DFATAL) << "Missing required extension.";
      continue;
    }

    const CachingDetails& caching_details = details.GetExtension(
        CachingDetails::message_set_extension);
    if (!caching_details.has_freshness_lifetime_millis() &&
        !caching_details.is_heuristically_cacheable()) {
      // We expect the resource to either hae an explicit
      // freshness_lifetime_millis or that it's heuristically
      // cacheable.
      LOG(DFATAL) << "Details structure is missing fields.";
    }

    Argument url(Argument::URL, result.resource_urls(0));
    if (caching_details.has_freshness_lifetime_millis()) {
      Argument freshness_lifetime(
          Argument::DURATION,
          caching_details.freshness_lifetime_millis());
      body->AddChild("$1 ($2)", url, freshness_lifetime);
    } else {
      Argument no_caching(Argument::STRING, "expiration not specified");
      body->AddChild("$1 ($2)", url, no_caching);
    }
  }
}

int LeverageBrowserCaching::ComputeScore(const InputInformation& input_info,
                                         const ResultVector& results) {
  int64 avg_freshness_lifetime =
      ComputeAverageFreshnessLifetimeMillis(input_info, results);
  if (avg_freshness_lifetime < 0) {
    // An error occurred, so we cannot generate a score for this rule.
    return -1;
  }

  if (avg_freshness_lifetime > kMillisInAWeek) {
    LOG(DFATAL) << "Average freshness lifetime " << avg_freshness_lifetime
                << " exceeds max suggested freshness lifetime "
                << kMillisInAWeek;
    avg_freshness_lifetime = kMillisInAWeek;
  }
  return static_cast<int>(100 * avg_freshness_lifetime / kMillisInAWeek);
}

}  // namespace rules

}  // namespace pagespeed
