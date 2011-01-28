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

#include "pagespeed/rules/avoid_bad_requests.h"

#include "base/logging.h"
#include "pagespeed/core/formatter.h"
#include "pagespeed/core/pagespeed_input.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/core/result_provider.h"
#include "pagespeed/proto/pagespeed_output.pb.h"

namespace pagespeed {

namespace rules {

AvoidBadRequests::AvoidBadRequests()
    : pagespeed::Rule(pagespeed::InputCapabilities()) {
}

const char* AvoidBadRequests::name() const {
  return "AvoidBadRequests";
}

const char* AvoidBadRequests::header() const {
  return "Avoid bad requests";
}

const char* AvoidBadRequests::documentation_url() const {
  return "rtt.html#AvoidBadRequests";
}

bool AvoidBadRequests::AppendResults(const PagespeedInput& input,
                                     ResultProvider* provider) {
  for (int i = 0, num = input.num_resources(); i < num; ++i) {
    const Resource& resource = input.GetResource(i);
    const int status_code = resource.GetResponseStatusCode();
    if (status_code == 404 || status_code == 410) {
      // TODO(mdsteele) It would be better if we could store the actual status
      // code in the Result object, so that the formatter could report it to
      // the user.
      Result* result = provider->NewResult();
      Savings* savings = result->mutable_savings();
      savings->set_requests_saved(1);

      result->add_resource_urls(resource.GetRequestUrl());
    }
  }
  return true;
}

void AvoidBadRequests::FormatResults(const ResultVector& results,
                                     Formatter* formatter) {
  if (results.empty()) {
    return;
  }

  Formatter* body = formatter->AddChild(
      "The following requests are returning 404/410 responses.  Either fix "
      "the broken links, or remove the references to the non-existent "
      "resources.");

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
    Argument url(Argument::URL, result.resource_urls(0));
    body->AddChild("$1", url);
  }
}

}  // namespace rules

}  // namespace pagespeed
