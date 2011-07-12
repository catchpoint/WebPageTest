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

#include "pagespeed/rules/specify_a_vary_accept_encoding_header.h"

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

SpecifyAVaryAcceptEncodingHeader::SpecifyAVaryAcceptEncodingHeader()
    : pagespeed::Rule(pagespeed::InputCapabilities()) {}

const char* SpecifyAVaryAcceptEncodingHeader::name() const {
  return "SpecifyAVaryAcceptEncodingHeader";
}

const char* SpecifyAVaryAcceptEncodingHeader::header() const {
  return "Specify a Vary: Accept-Encoding header";
}

const char* SpecifyAVaryAcceptEncodingHeader::documentation_url() const {
  return "caching.html#LeverageProxyCaching";
}

bool SpecifyAVaryAcceptEncodingHeader::
AppendResults(const PagespeedInput& input, ResultProvider* provider) {
  for (int i = 0, num = input.num_resources(); i < num; ++i) {
    const Resource& resource = input.GetResource(i);
    // Complain if:
    //   1) There's no cookie in the response,
    //   2) The resource is compressible,
    //   3) The resource is proxy-cacheable, and
    //   4) Vary: accept-encoding is not already set.
    if (resource.GetResponseHeader("Set-Cookie").empty() &&
        resource_util::IsCompressibleResource(resource) &&
        resource_util::IsProxyCacheableResource(resource)) {
      const std::string& vary_header = resource.GetResponseHeader("Vary");
      resource_util::DirectiveMap directive_map;
      if (resource_util::GetHeaderDirectives(vary_header, &directive_map) &&
          !directive_map.count("accept-encoding")) {
        Result* result = provider->NewResult();
        result->add_resource_urls(resource.GetRequestUrl());
      }
    }
  }
  return true;
}

void SpecifyAVaryAcceptEncodingHeader::
FormatResults(const ResultVector& results, Formatter* formatter) {
  if (results.empty()) {
    return;
  }

  Formatter* body = formatter->AddChild(
      "The following publicly cacheable, compressible resources should have "
      "a \"Vary: Accept-Encoding\" header:");

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

int SpecifyAVaryAcceptEncodingHeader::
ComputeScore(const InputInformation& input_info, const ResultVector& results) {
  const double num_violoations = results.size();
  const double num_static_resources = input_info.number_static_resources();
  return static_cast<int>(
      100.0 * (1.0 - num_violoations / num_static_resources));
}

}  // namespace rules

}  // namespace pagespeed
