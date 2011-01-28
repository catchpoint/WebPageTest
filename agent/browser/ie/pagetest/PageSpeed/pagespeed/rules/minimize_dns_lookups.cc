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

#include "pagespeed/rules/minimize_dns_lookups.h"

#include <map>
#include <string>
#include <vector>

#include "base/logging.h"
#include "build/build_config.h"
#include "googleurl/src/gurl.h"
#include "net/base/registry_controlled_domain.h"
#include "pagespeed/core/formatter.h"
#include "pagespeed/core/pagespeed_input.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/core/result_provider.h"
#include "pagespeed/proto/pagespeed_output.pb.h"

namespace {
// We build a map from domain (e.g. example.com) to hostname
// (e.g. a.b.example.com) to Resources
// (e.g. http://a.b.example.com/example.css). This map allows us to
// identify resources that are candidates for moving to other domains,
// which can reduce the number of DNS lookups.
typedef std::map<std::string, pagespeed::HostResourceMap> DomainHostResourceMap;

void PopulateDomainHostResourceMap(
    const pagespeed::PagespeedInput& input,
    DomainHostResourceMap *domain_host_resouce_map) {
  for (int i = 0, num = input.num_resources(); i < num; ++i) {
    const pagespeed::Resource& resource = input.GetResource(i);
    // exclude non-http resources
    const std::string& protocol = resource.GetProtocol();
    if (protocol != "http" && protocol != "https") {
      continue;
    }

    // exclude lazy-loaded resources
    if (resource.IsLazyLoaded()) {
      continue;
    }

    GURL gurl(resource.GetRequestUrl());
    std::string domain =
        net::RegistryControlledDomainService::GetDomainAndRegistry(gurl);
    if (domain.empty()) {
      LOG(INFO) << "Got empty domain for " << resource.GetRequestUrl();
      continue;
    }

    // Add the resource to the map.
    (*domain_host_resouce_map)[domain][gurl.host()].insert(&resource);
  }
}

void PopulateLoneDnsResources(
    const pagespeed::PagespeedInput& input,
    const pagespeed::HostResourceMap &host_resource_map,
    pagespeed::ResourceSet *lone_dns_resources) {
  for (pagespeed::HostResourceMap::const_iterator iter =
           host_resource_map.begin(), end = host_resource_map.end();
       iter != end;
       ++iter) {
    const pagespeed::ResourceSet& resources = iter->second;
    DCHECK(!resources.empty());
    if (resources.size() != 1) {
      // If there's more than one resource, then it's not a candidate
      // for a lone DNS lookup.
      continue;
    }
    const pagespeed::Resource* resource = *resources.begin();
    if (resource->GetRequestUrl() == input.primary_resource_url()) {
      // Special case: if this resource is the primary resource, don't
      // flag it since it's not realistic for the site to change the
      // URL of the primary resource.
      continue;
    }
    lone_dns_resources->insert(resource);
  }
}

void AppendResult(const pagespeed::ResourceSet &lone_dns_resources,
                  bool additional_hostname_available,
                  pagespeed::ResultProvider *provider) {
  pagespeed::Result* result = provider->NewResult();
  for (pagespeed::ResourceSet::const_iterator iter =
           lone_dns_resources.begin(), end = lone_dns_resources.end();
       iter != end; ++iter) {
    const pagespeed::Resource* resource = *iter;
    result->add_resource_urls(resource->GetRequestUrl());
  }

  int num_dns_requests_saved = lone_dns_resources.size();
  if (!additional_hostname_available) {
    // Special case: every hostname on the domain had a single
    // resource. So combining them will still require one domain. Thus
    // we save one fewer DNS requests than the number of lone DNS
    // resources.
    --num_dns_requests_saved;
  }
  pagespeed::Savings* savings = result->mutable_savings();
  savings->set_dns_requests_saved(num_dns_requests_saved);
}

}  // namespace

namespace pagespeed {

namespace rules {

MinimizeDnsLookups::MinimizeDnsLookups()
    : pagespeed::Rule(pagespeed::InputCapabilities(
        pagespeed::InputCapabilities::LAZY_LOADED)) {
}

const char* MinimizeDnsLookups::name() const {
  return "MinimizeDnsLookups";
}

const char* MinimizeDnsLookups::header() const {
  return "Minimize DNS lookups";
}

const char* MinimizeDnsLookups::documentation_url() const {
  return "rtt.html#MinimizeDNSLookups";
}

bool MinimizeDnsLookups::AppendResults(const PagespeedInput& input,
                                       ResultProvider* provider) {
  DomainHostResourceMap domain_host_resouce_map;
  PopulateDomainHostResourceMap(input, &domain_host_resouce_map);

  for (DomainHostResourceMap::const_iterator iter =
           domain_host_resouce_map.begin(), end = domain_host_resouce_map.end();
       iter != end;
       ++iter) {
    const HostResourceMap& host_resource_map = iter->second;
    if (host_resource_map.size() <= 1) {
      // If there's only a single hostname for this domain, it's not
      // realistic to expect the site to re-host resources from a
      // domain they don't control on a different domain, so don't
      // inspect these resources.
      continue;
    }

    // Now discover any resources that are the only resources served
    // on their hostname. These resources are considered violations.
    ResourceSet lone_dns_resources;
    PopulateLoneDnsResources(input, host_resource_map, &lone_dns_resources);

    if (lone_dns_resources.size() > 0) {
      // Create a new result instance for the resources we discovered.
      AppendResult(lone_dns_resources,
                   host_resource_map.size() > lone_dns_resources.size(),
                   provider);
    }
  }

  return true;
}

void MinimizeDnsLookups::FormatResults(const ResultVector& results,
                                       Formatter* formatter) {
  std::vector<std::string> violation_urls;
  for (ResultVector::const_iterator iter = results.begin(),
           end = results.end();
       iter != end;
       ++iter) {
    const Result& result = **iter;

    for (int idx = 0; idx < result.resource_urls_size(); idx++) {
      violation_urls.push_back(result.resource_urls(idx));
    }
  }

  if (violation_urls.empty()) {
    return;
  }

  Formatter* body = formatter->AddChild(
      "The hostnames of the following urls only serve one "
      "resource each. Avoid the extra DNS "
      "lookups by serving these resources from existing hostnames.");

  for (std::vector<std::string>::const_iterator iter = violation_urls.begin(),
           end = violation_urls.end();
       iter != end;
       ++iter) {
    Argument url(Argument::URL, *iter);
    body->AddChild("$1", url);
  }
}

int MinimizeDnsLookups::ComputeScore(const InputInformation& input_info,
                                     const ResultVector& results) {
  int num_violations = 0;
  for (ResultVector::const_iterator iter = results.begin(),
           end = results.end();
       iter != end;
       ++iter) {
    const Result& result = **iter;
    num_violations += result.savings().dns_requests_saved();
  }
  const int num_hosts = input_info.number_hosts();
  if (num_hosts <= 0 || num_hosts < num_violations) {
    LOG(DFATAL) << "Bad num_hosts " << num_hosts
                << " compared to num_violations " << num_violations;
    return -1;
  }
  return 100 * (num_hosts - num_violations) / num_hosts;
}

}  // namespace rules

}  // namespace pagespeed
