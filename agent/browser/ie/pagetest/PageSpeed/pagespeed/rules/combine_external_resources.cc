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

#include "pagespeed/rules/combine_external_resources.h"

#include <string>

#include "base/logging.h"
#include "googleurl/src/gurl.h"
#include "pagespeed/core/formatter.h"
#include "pagespeed/core/pagespeed_input.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/core/result_provider.h"
#include "pagespeed/proto/pagespeed_output.pb.h"

namespace pagespeed {

namespace rules {

CombineExternalResources::CombineExternalResources(ResourceType resource_type)
    : pagespeed::Rule(pagespeed::InputCapabilities(
        pagespeed::InputCapabilities::LAZY_LOADED)),
      resource_type_(resource_type) {
}

bool CombineExternalResources::AppendResults(const PagespeedInput& input,
                                             ResultProvider* provider) {
  const HostResourceMap& host_resource_map = *input.GetHostResourceMap();

  for (HostResourceMap::const_iterator iter = host_resource_map.begin(),
           end = host_resource_map.end();
       iter != end;
       ++iter) {
    ResourceSet violations;
    for (ResourceSet::const_iterator resource_iter = iter->second.begin(),
             resource_end = iter->second.end();
         resource_iter != resource_end;
         ++resource_iter) {
      const pagespeed::Resource* resource = *resource_iter;

      // exclude non-http resources
      std::string protocol = resource->GetProtocol();
      if (protocol != "http" && protocol != "https") {
        continue;
      }

      if (resource->GetResourceType() != resource_type_) {
        continue;
      }

      // exclude lazy-loaded resources
      if (resource->IsLazyLoaded()) {
        continue;
      }

      const std::string& host = iter->first;
      if (host.empty()) {
        LOG(DFATAL) << "Empty host while processing "
                    << resource->GetRequestUrl();
      }

      violations.insert(resource);
    }

    if (violations.size() > 1) {
      Result* result = provider->NewResult();
      int requests_saved = 0;
      requests_saved += (violations.size() - 1);
      for (ResourceSet::const_iterator violation_iter = violations.begin(),
               violation_end = violations.end();
           violation_iter != violation_end;
           ++violation_iter) {
        result->add_resource_urls((*violation_iter)->GetRequestUrl());
      }

      pagespeed::Savings* savings = result->mutable_savings();
      savings->set_requests_saved(requests_saved);
    }
  }

  return true;
}

void CombineExternalResources::FormatResults(const ResultVector& results,
                                             Formatter* formatter) {
  const char* body_tmpl = NULL;
  if (resource_type_ == CSS) {
    body_tmpl = "There are $1 CSS files served from $2. "
        "They should be combined into as few files as possible.";
  } else if (resource_type_ == JS) {
    body_tmpl = "There are $1 JavaScript files served from $2. "
        "They should be combined into as few files as possible.";
  } else {
    LOG(DFATAL) << "Unknown violation type " << resource_type_;
    return;
  }

  for (ResultVector::const_iterator iter = results.begin(),
           end = results.end();
       iter != end;
       ++iter) {
    const Result& result = **iter;

    Argument count(Argument::INTEGER, result.resource_urls_size());
    GURL url(result.resource_urls(0));
    Argument host(Argument::STRING, url.host());
    Formatter* body = formatter->AddChild(body_tmpl, count, host);

    for (int idx = 0; idx < result.resource_urls_size(); idx++) {
      Argument url(Argument::URL, result.resource_urls(idx));
      body->AddChild("$1", url);
    }
  }
}

CombineExternalJavaScript::CombineExternalJavaScript()
    : CombineExternalResources(JS) {
}

const char* CombineExternalJavaScript::name() const {
  return "CombineExternalJavaScript";
}

const char* CombineExternalJavaScript::header() const {
  return "Combine external JavaScript";
}

const char* CombineExternalJavaScript::documentation_url() const {
  return "rtt.html#CombineExternalJS";
}

CombineExternalCSS::CombineExternalCSS()
    : CombineExternalResources(CSS) {
}

const char* CombineExternalCSS::name() const {
  return "CombineExternalCSS";
}

const char* CombineExternalCSS::header() const {
  return "Combine external CSS";
}

const char* CombineExternalCSS::documentation_url() const {
  return "rtt.html#CombineExternalCSS";
}

}  // namespace rules

}  // namespace pagespeed
