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

#include "pagespeed/rules/serve_static_content_from_a_cookieless_domain.h"

#include "base/logging.h"
#include "pagespeed/core/formatter.h"
#include "pagespeed/core/pagespeed_input.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/core/resource_util.h"
#include "pagespeed/core/result_provider.h"
#include "pagespeed/proto/pagespeed_output.pb.h"

namespace pagespeed {

namespace rules {

ServeStaticContentFromACookielessDomain::
ServeStaticContentFromACookielessDomain()
    : pagespeed::Rule(pagespeed::InputCapabilities(
        pagespeed::InputCapabilities::REQUEST_HEADERS)) {}

const char* ServeStaticContentFromACookielessDomain::name() const {
  return "ServeStaticContentFromACookielessDomain";
}

const char* ServeStaticContentFromACookielessDomain::header() const {
  return "Serve static content from a cookieless domain";
}

const char* ServeStaticContentFromACookielessDomain::documentation_url()
    const {
  return "request.html#ServeFromCookielessDomain";
}

bool ServeStaticContentFromACookielessDomain::
AppendResults(const PagespeedInput& input, ResultProvider* provider) {
  for (int i = 0, num = input.num_resources(); i < num; ++i) {
    const Resource& resource = input.GetResource(i);

    if (!resource_util::IsLikelyStaticResource(resource)) {
      continue;
    }

    const std::string& cookie = resource.GetCookies();
    if (cookie.empty()) {
      continue;
    }

    Result* result = provider->NewResult();
    result->add_resource_urls(resource.GetRequestUrl());
    result->set_original_request_bytes(
        resource_util::EstimateRequestBytes(resource));

    Savings* savings = result->mutable_savings();
    savings->set_request_bytes_saved(
        resource_util::EstimateHeaderBytes("Cookie", cookie));
  }
  return true;
}

void ServeStaticContentFromACookielessDomain::
FormatResults(const ResultVector& results, Formatter* formatter) {
  if (results.empty()) {
    return;
  }

  Formatter* body = formatter->AddChild("Serve the following static resources "
                                        "from a domain that doesn't set "
                                        "cookies:");

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

}  // namespace rules

}  // namespace pagespeed
