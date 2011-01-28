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

#include "pagespeed/rules/remove_query_strings_from_static_resources.h"

#include <string>

#include "base/logging.h"
#include "base/string_util.h"
#include "pagespeed/core/formatter.h"
#include "pagespeed/core/pagespeed_input.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/core/resource_util.h"
#include "pagespeed/core/result_provider.h"
#include "pagespeed/proto/pagespeed_output.pb.h"

namespace pagespeed {

namespace rules {

RemoveQueryStringsFromStaticResources::
RemoveQueryStringsFromStaticResources()
    : pagespeed::Rule(pagespeed::InputCapabilities()) {}

const char* RemoveQueryStringsFromStaticResources::name() const {
  return "RemoveQueryStringsFromStaticResources";
}

const char* RemoveQueryStringsFromStaticResources::header() const {
  return "Remove query strings from static resources";
}

const char* RemoveQueryStringsFromStaticResources::documentation_url() const {
  return "caching.html#LeverageProxyCaching";
}

bool RemoveQueryStringsFromStaticResources::
AppendResults(const PagespeedInput& input, ResultProvider* provider) {
  for (int i = 0, num = input.num_resources(); i < num; ++i) {
    const Resource& resource = input.GetResource(i);
    if (resource.GetRequestUrl().find('?') != std::string::npos &&
        resource_util::IsProxyCacheableResource(resource)) {
      Result* result = provider->NewResult();
      result->add_resource_urls(resource.GetRequestUrl());
    }
  }
  return true;
}

void RemoveQueryStringsFromStaticResources::
FormatResults(const ResultVector& results, Formatter* formatter) {
  if (results.empty()) {
    return;
  }

  Formatter* body = formatter->AddChild(
      "Resources with a \"?\" in the URL are not cached by some proxy caching "
      "servers.  Remove the query string and encode the parameters into the "
      "URL for the following resources:");

  for (ResultVector::const_iterator iter = results.begin(),
           end = results.end(); iter != end; ++iter) {
    const Result& result = **iter;
    if (result.resource_urls_size() != 1) {
      LOG(DFATAL) << "Unexpected number of resource URLs.  Expected 1, Got "
                  << result.resource_urls_size() << ".";
      continue;
    }
    Argument url(Argument::URL, result.resource_urls(0));
    body->AddChild("$1", url);
  }
}

int RemoveQueryStringsFromStaticResources::
ComputeScore(const InputInformation& input_info,
             const ResultVector& results) {
  const double num_violoations = results.size();
  const double num_static_resources = input_info.number_static_resources();
  return static_cast<int>(
      100.0 * (1.0 - num_violoations / num_static_resources));
}

}  // namespace rules

}  // namespace pagespeed
