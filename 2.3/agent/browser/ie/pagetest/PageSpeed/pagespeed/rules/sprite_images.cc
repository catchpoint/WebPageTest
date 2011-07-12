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

#include "pagespeed/rules/sprite_images.h"

#include <string>

#include "base/logging.h"
#include "build/build_config.h"
#include "googleurl/src/gurl.h"
#include "net/base/registry_controlled_domain.h"
#include "pagespeed/core/formatter.h"
#include "pagespeed/core/image_attributes.h"
#include "pagespeed/core/pagespeed_input.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/core/resource_util.h"
#include "pagespeed/core/result_provider.h"
#include "pagespeed/proto/pagespeed_output.pb.h"

namespace pagespeed {

namespace rules {

namespace {

const char* kRuleName = "SpriteImages";
const size_t kSpriteImageSizeLimit = 2 * 1024;
const size_t kMinSpriteImageCount = 5;

}  // namespace

SpriteImages::SpriteImages()
  : pagespeed::Rule(pagespeed::InputCapabilities(
        pagespeed::InputCapabilities::RESPONSE_BODY |
        pagespeed::InputCapabilities::LAZY_LOADED)) {
}

const char* SpriteImages::name() const {
  return kRuleName;
}

const char* SpriteImages::header() const {
  return "Combine images into CSS sprites";
}

const char* SpriteImages::documentation_url() const {
  return "rtt.html#SpriteImages";
}

bool SpriteImages::AppendResults(const PagespeedInput& input,
                                 ResultProvider* provider) {
  typedef std::map<std::string, ResourceSet> DomainResourceMap;
  DomainResourceMap violations;
  for (int idx = 0, num = input.num_resources(); idx < num; ++idx) {
    const Resource& resource = input.GetResource(idx);
    const ResourceType resource_type = resource.GetResourceType();
    if (resource_type != IMAGE) {
      continue;
    }

    // Exclude lazy-loaded resources.
    if (resource.IsLazyLoaded()) {
      continue;
    }

    // Exclude images other than PNG and GIF.
    const ImageType type = resource.GetImageType();
    if (type != PNG && type != GIF) {
      continue;
    }

    // Exclude big images.
    if (resource.GetResponseBody().size() > kSpriteImageSizeLimit) {
      continue;
    }

    // Exclude images without attributes or 1x1 tracking images.
    scoped_ptr<pagespeed::ImageAttributes> image_attributes(
        input.NewImageAttributes(&resource));
    if (image_attributes == NULL ||
        (image_attributes->GetImageWidth() <= 1 &&
         image_attributes->GetImageHeight() <= 1)) {
      continue;
    }

    // Exclude non-cacheable resources.
    if (!resource_util::IsCacheableResource(resource)) {
      continue;
    }

    GURL gurl(resource.GetRequestUrl());
    std::string domain =
        net::RegistryControlledDomainService::GetDomainAndRegistry(gurl);
    if (domain.empty()) {
      LOG(INFO) << "Got empty domain for " << resource.GetRequestUrl();
      continue;
    }

    violations[domain].insert(&resource);
  }

  for (DomainResourceMap::const_iterator iter = violations.begin(),
       end = violations.end();
       iter != end;
       ++iter) {
    const ResourceSet& resource_set = iter->second;
    // We allow a small number of independent sprite-able images per domain. For
    // example, the site may have combined many images into 2 sprites. The two
    // images may be able to combine into another one, but there may be other
    // advantages to keep them separate.
    if (resource_set.size() < kMinSpriteImageCount) {
      continue;
    }
    Result* result = provider->NewResult();
    int requests_saved = resource_set.size() - 1;
    for (ResourceSet::const_iterator res_iter = resource_set.begin(),
         res_end = resource_set.end();
         res_iter != res_end;
         ++res_iter) {
      const Resource* resource = *res_iter;
      result->add_resource_urls(resource->GetRequestUrl());
    }
    Savings* savings = result->mutable_savings();
    savings->set_requests_saved(requests_saved);
  }
  return true;
}

void SpriteImages::FormatResults(const ResultVector& results,
                                 Formatter* formatter) {
  const char* body_tmpl =
      "The following images served from $1 should be combined into as few "
      "images as possible using CSS sprites.";

  if (results.empty()) {
    return;
  }

  for (ResultVector::const_iterator iter = results.begin(),
           end = results.end();
       iter != end;
       ++iter) {
    const Result& result = **iter;
    GURL gurl(result.resource_urls(0));
    std::string domain =
        net::RegistryControlledDomainService::GetDomainAndRegistry(gurl);
    Argument host(Argument::STRING, domain);
    Formatter* body = formatter->AddChild(body_tmpl, host);

    for (int idx = 0; idx < result.resource_urls_size(); idx++) {
      Argument url(Argument::URL, result.resource_urls(idx));
      body->AddChild("$1", url);
    }

  }
}

}  // namespace rules

}  // namespace pagespeed
