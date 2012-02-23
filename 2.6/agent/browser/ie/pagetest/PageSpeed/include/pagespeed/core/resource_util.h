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

#ifndef PAGESPEED_CORE_RESOURCE_UTIL_H_
#define PAGESPEED_CORE_RESOURCE_UTIL_H_

#include <map>
#include <string>

#include "base/basictypes.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/core/string_util.h"

namespace pagespeed {

class InputInformation;
class PagespeedInput;

namespace resource_util {

typedef pagespeed::string_util::CaseInsensitiveStringStringMap DirectiveMap;

int EstimateHeaderBytes(const std::string& key, const std::string& value);
int EstimateHeadersBytes(const std::map<std::string, std::string>& headers);

int EstimateRequestBytes(const Resource& resource);
int EstimateResponseBytes(const Resource& resource);

// Is the resource compressible using gzip?
bool IsCompressibleResource(const Resource& resource);

// Was the resource served with compression enabled?
bool IsCompressedResource(const Resource& resource);

// Determine the size of a string after being gzipped.  In case of error,
// return false and make no change to *output.
bool GetGzippedSize(const std::string& input, int* output);

// Parse directives from the given HTTP header.
// For instance, if Cache-Control contains "private, max-age=0" we
// expect the map to contain two pairs, one with key private and no
// value, and the other with key max-age and value 0. This method can
// parse headers which uses either comma (, e.g. Cache-Control) or
// semicolon (; e.g. Content-Type) as the directive separator.
bool GetHeaderDirectives(const std::string& header, DirectiveMap* out);

// Does the resource have an explicit HTTP header directive that
// indicates it's not cacheable? For instance, Cache-Control: no-cache or
// Pragma: no-cache.
bool HasExplicitNoCacheDirective(const Resource& resource);

// Take a time-valued header like Date, and convert it to number of
// milliseconds since epoch. Returns true if the conversion succeeded,
// false otherwise, The out parameter is only valid when this function
// returns true.
bool ParseTimeValuedHeader(const char* time_str, int64 *out_epoch_millis);

// Get the freshness lifetime of hte given resource, using the
// algorithm described in the HTTP/1.1 RFC. Returns true if the
// resource has an explicit freshness lifetime, false otherwise.
// The out parameter is only valid when this function returns true.
bool GetFreshnessLifetimeMillis(const Resource& resource,
                                int64 *out_freshness_lifetime_millis);

// Does the resource have an explicit freshness lifetime? This is just
// a wrapper around GetFreshnessLifetimeMillis().
bool HasExplicitFreshnessLifetime(const Resource& resource);

// Is the resource cachable, either by explicit caching headers or
// using common caching heuristics? If you want to know if the
// resource is explicitly marked as cacheable, use
// GetFreshnessLifetimeMillis() and test to see that the output
// parameter it positive.
bool IsCacheableResource(const Resource& resource);

// Is the given status code known to be associated with
// static/cacheable resources? For instance, a 200 is generally
// cacheable but a 204 is not.
bool IsCacheableResourceStatusCode(int status_code);

// Is the given status code an error code (i.e. 4xx or 5xx)?
bool IsErrorResourceStatusCode(int status_code);

// Is the resource likely to be cached by proxies?
bool IsProxyCacheableResource(const Resource& resource);

// Is the given resource type usually associated wiht static resources?
bool IsLikelyStaticResourceType(pagespeed::ResourceType type);

// Is the given resource likely to be a static resource. We use
// various heuristics based on caching headers, resource type, freshness
// lifetime, etc. to determine if the resource is likely to be a static
// resource.
bool IsLikelyStaticResource(const Resource& resource);

// Compute the total number of response bytes for all resource types.
int64 ComputeTotalResponseBytes(const InputInformation& input_into);

// Compute the number of response bytes that are compressible using
// gzip/deflate.
int64 ComputeCompressibleResponseBytes(const InputInformation& input_into);

// Get the URL of the resource redirected to from the specified
// resource, or the empty string if unable to determine the redirected
// URL.
std::string GetRedirectedUrl(const Resource& resource);

// Get the last resource in the redirect chain for the specified
// Resource, or NULL if the specified resource is not a redirect.
const Resource* GetLastResourceInRedirectChain(const PagespeedInput& input,
                                               const Resource& source);

// Is the given resource likely a tracking pixel? Checks to see
// if the resource is a 1x1 image.
bool IsLikelyTrackingPixel(const PagespeedInput& input,
                           const Resource& resource);

}  // namespace resource_util

}  // namespace pagespeed

#endif  // PAGESPEED_CORE_RESOURCE_UTIL_H_
