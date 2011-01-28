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

#include "pagespeed/core/resource_util.h"

#include <set>

#include "base/logging.h"
#include "base/string_tokenizer.h"
#include "base/string_number_conversions.h"
#include "base/third_party/nspr/prtime.h"
#include "pagespeed/core/directive_enumerator.h"
#include "pagespeed/core/pagespeed_input.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/core/uri_util.h"
#include "pagespeed/proto/pagespeed_output.pb.h"

namespace {

// each message header has a 3 byte overhead; colon between the key
// value pair and the end-of-line CRLF.
const int kHeaderOverhead = 3;

// Maximum number of redirects we follow before giving up (to prevent
// infinite redirect loops).
const int kMaxRedirects = 100;

bool IsHeuristicallyCacheable(const pagespeed::Resource& resource) {
  if (pagespeed::resource_util::HasExplicitFreshnessLifetime(resource)) {
    // If the response has an explicit freshness lifetime then it's
    // not heuristically cacheable. This method only expects to be
    // called if the resource does *not* have an explicit freshness
    // lifetime.
    LOG(DFATAL) << "IsHeuristicallyCacheable received a resource with "
                << "explicit freshness lifetime.";
    return false;
  }

  pagespeed::resource_util::DirectiveMap cache_directives;
  if (!pagespeed::resource_util::GetHeaderDirectives(
          resource.GetResponseHeader("Cache-Control"),
          &cache_directives)) {
    LOG(INFO) << "Failed to parse cache control directives for "
              << resource.GetRequestUrl();
    return false;
  }

  if (cache_directives.find("must-revalidate") != cache_directives.end()) {
    // must-revalidate indicates that a non-fresh response should not
    // be used in response to requests without validating at the
    // origin. Such a resource is not heuristically cacheable.
    return false;
  }

  const std::string& url = resource.GetRequestUrl();
  if (url.find_first_of('?') != url.npos) {
    // The HTTP RFC says:
    //
    // ...since some applications have traditionally used GETs and
    // HEADs with query URLs (those containing a "?" in the rel_path
    // part) to perform operations with significant side effects,
    // caches MUST NOT treat responses to such URIs as fresh unless
    // the server provides an explicit expiration time.
    //
    // So if we find a '?' in the URL, the resource is not
    // heuristically cacheable.
    //
    // In practice most browsers do not implement this policy. For
    // instance, Chrome and IE8 do not look for the query string,
    // while Firefox (as of version 3.6) does. For the time being we
    // implement the RFC but it might make sense to revisit this
    // decision in the future, given that major browser
    // implementations do not match.
    return false;
  }

  if (!pagespeed::resource_util::IsCacheableResourceStatusCode(
          resource.GetResponseStatusCode())) {
    return false;
  }

  return true;
}

}  // namespace

namespace pagespeed {

namespace resource_util {

int EstimateHeaderBytes(const std::string& key, const std::string& value) {
  return kHeaderOverhead + key.size() + value.size();
}

int EstimateHeadersBytes(const Resource::HeaderMap& headers) {
  int total_size = 0;

  // TODO improve the header size calculation below.
  for (Resource::HeaderMap::const_iterator
           iter = headers.begin(), end = headers.end();
       iter != end;
       ++iter) {
    total_size += EstimateHeaderBytes(iter->first, iter->second);
  }

  return total_size;
}

int EstimateRequestBytes(const Resource& resource) {
  int request_bytes = 0;

  // Request line
  request_bytes += resource.GetRequestMethod().size() + 1 /* space */ +
      resource.GetRequestUrl().size()  + 1 /* space */ +
      8 /* "HTTP/1.1" */ + 2 /* \r\n */;

  request_bytes += EstimateHeadersBytes(*resource.GetRequestHeaders());
  request_bytes += resource.GetRequestBody().size();

  return request_bytes;
}

int EstimateResponseBytes(const Resource& resource) {
  int response_bytes = 0;
  // TODO: this computation is a bit strange. It mixes the size of
  // uncompressed response headers with uncompressed response
  // body. The computed number doesn't reflect an actual attribute of
  // the resource. If we want to compute the wire transfer size we
  // should be using the post-gzip compression size for this resource,
  // but it's not clear that it's necessarily the right thing to use
  // the gzip-compressed size.
  response_bytes += resource.GetResponseBody().size();
  response_bytes += 8; // "HTTP/1.1"
  response_bytes += EstimateHeadersBytes(*resource.GetResponseHeaders());
  return response_bytes;
}

bool IsCompressibleResource(const Resource& resource) {
  switch (resource.GetResourceType()) {
    case HTML:
    case TEXT:
    case CSS:
    case JS:
      return true;

    default:
      return false;
  }
}

bool GetHeaderDirectives(const std::string& header, DirectiveMap* out) {
  DirectiveEnumerator e(header);
  std::string key;
  std::string value;
  while (e.GetNext(&key, &value)) {
    if (key.empty()) {
      LOG(DFATAL) << "Received empty key.";
      out->clear();
      return false;
    }
    (*out)[key] = value;
  }
  if (!e.error() && !e.done()) {
    LOG(DFATAL) << "Failed to reach terminal state.";
    out->clear();
    return false;
  }
  if (e.error()) {
    out->clear();
    return false;
  }
  return true;
}

bool HasExplicitNoCacheDirective(const Resource& resource) {
  DirectiveMap cache_directives;
  if (!GetHeaderDirectives(resource.GetResponseHeader("Cache-Control"),
                           &cache_directives)) {
    LOG(INFO) << "Failed to parse cache control directives for "
              << resource.GetRequestUrl();
    return true;
  }

  if (cache_directives.find("no-cache") != cache_directives.end()) {
    return true;
  }
  if (cache_directives.find("no-store") != cache_directives.end()) {
    return true;
  }
  DirectiveMap::const_iterator it = cache_directives.find("max-age");
  if (it != cache_directives.end()) {
    int64 max_age_value = 0;
    if (base::StringToInt64(it->second, &max_age_value) &&
        max_age_value == 0) {
      // Cache-Control: max-age=0 means do not cache.
      return true;
    }
  }

  const std::string& expires = resource.GetResponseHeader("Expires");
  int64 expires_value = 0;
  if (!expires.empty() &&
      !ParseTimeValuedHeader(expires.c_str(), &expires_value)) {
    // An invalid Expires header (e.g. Expires: 0) means do not cache.
    return true;
  }

  const std::string& pragma = resource.GetResponseHeader("Pragma");
  if (pragma.find("no-cache") != pragma.npos) {
    return true;
  }

  const std::string& vary = resource.GetResponseHeader("Vary");
  if (vary.find("*") != vary.npos) {
    return true;
  }

  return false;
}

bool HasExplicitFreshnessLifetime(const Resource& resource) {
  int64 freshness_lifetime = 0;
  return GetFreshnessLifetimeMillis(resource, &freshness_lifetime);
}

bool IsCacheableResourceStatusCode(int status_code) {
  switch (status_code) {
    // HTTP/1.1 RFC lists these response codes as heuristically
    // cacheable in the absence of explicit caching headers. The
    // primary cacheable status code is 200, but 203 and 206 are also
    // listed in the RFC.
    case 200:
    case 203:
    case 206:
      return true;

    // In addition, 304s are sent for cacheable resources. Though the
    // 304 response itself is not cacheable, the underlying resource
    // is, and that's what we care about.
    case 304:
      return true;

    default:
      return false;
  }
}

bool IsLikelyStaticResourceType(pagespeed::ResourceType type) {
  switch (type) {
    case IMAGE:
    case CSS:
    case FLASH:
    case JS:
      // These resources are almost always cacheable.
      return true;

    case REDIRECT:
      // Redirects can be cacheable.
      return true;

    case OTHER:
      // If other, some content types (e.g. flash, video) are static
      // while others are not. Be conservative for now and assume
      // non-cacheable.
      //
      // TODO: perhaps if there's a common mime prefix for the
      // cacheable types (e.g. application/), check to see that the
      // prefix is present.
      return false;

    default:
      return false;
  }
}

bool ParseTimeValuedHeader(const char* time_str, int64 *out_epoch_millis) {
  if (time_str == NULL || *time_str == '\0') {
    *out_epoch_millis = 0;
    return false;
  }
  PRTime result_time = 0;
  PRStatus result = PR_ParseTimeString(time_str, PR_FALSE, &result_time);
  if (PR_SUCCESS != result) {
    return false;
  }

  *out_epoch_millis = result_time / 1000;
  return true;
}

bool GetFreshnessLifetimeMillis(const Resource& resource,
                                int64 *out_freshness_lifetime_millis) {
  // Initialize the output param to the default value. We do this in
  // case clients use the out value without checking the return value
  // of the function.
  *out_freshness_lifetime_millis = 0;

  if (HasExplicitNoCacheDirective(resource)) {
    // If there's an explicit no cache directive then the resource is
    // never fresh.
    return true;
  }

  // First, look for Cache-Control: max-age. The HTTP/1.1 RFC
  // indicates that CC: max-age takes precedence to Expires.
  const std::string& cache_control =
      resource.GetResponseHeader("Cache-Control");
  DirectiveMap cache_directives;
  if (!GetHeaderDirectives(cache_control, &cache_directives)) {
    LOG(INFO) << "Failed to parse cache control directives for "
              << resource.GetRequestUrl();
  } else {
    DirectiveMap::const_iterator it = cache_directives.find("max-age");
    if (it != cache_directives.end()) {
      int64 max_age_value = 0;
      if (base::StringToInt64(it->second, &max_age_value)) {
        *out_freshness_lifetime_millis = max_age_value * 1000;
        return true;
      }
    }
  }

  // Next look for Expires.
  const std::string& expires = resource.GetResponseHeader("Expires");
  if (expires.empty()) {
    // If there's no expires header and we previously determined there
    // was no Cache-Control: max-age, then the resource doesn't have
    // an explicit freshness lifetime.
    return false;
  }

  // We've determined that there is an Expires header. Thus, the
  // resource has a freshness lifetime. Even if the Expires header
  // doesn't contain a valid date, it should be considered stale. From
  // HTTP/1.1 RFC 14.21: "HTTP/1.1 clients and caches MUST treat other
  // invalid date formats, especially including the value "0", as in
  // the past (i.e., "already expired")."

  const std::string& date = resource.GetResponseHeader("Date");
  int64 date_value = 0;
  if (date.empty() || !ParseTimeValuedHeader(date.c_str(), &date_value)) {
    LOG(INFO) << "Missing or invalid date header: '" << date << "'. "
              << "Assuming resource " << resource.GetRequestUrl()
              << " is not cacheable.";
    // We have an Expires header, but no Date header to reference
    // from. Thus we assume that the resource is heuristically
    // cacheable, but not explicitly cacheable.
    return false;
  }

  int64 expires_value = 0;
  if (!ParseTimeValuedHeader(expires.c_str(), &expires_value)) {
    // If we can't parse the Expires header, then treat the resource as
    // stale.
    return true;
  }

  int64 freshness_lifetime_millis = expires_value - date_value;
  if (freshness_lifetime_millis < 0) {
    freshness_lifetime_millis = 0;
  }
  *out_freshness_lifetime_millis = freshness_lifetime_millis;
  return true;
}

bool IsCacheableResource(const Resource& resource) {
  int64 freshness_lifetime = 0;
  if (GetFreshnessLifetimeMillis(resource, &freshness_lifetime)) {
    if (freshness_lifetime <= 0) {
      // The resource is explicitly not fresh, so we don't consider it
      // to be a static resource.
      return false;
    }

    // If there's an explicit freshness lifetime and it's greater than
    // zero, then the resource is cacheable.
    return true;
  }

  // If we've made it this far, we've got a resource that doesn't have
  // explicit caching headers. At this point we use heuristics
  // specified in the HTTP RFC and implemented in many
  // browsers/proxies to determine if this resource is typically
  // cached.
  return IsHeuristicallyCacheable(resource);
}

bool IsProxyCacheableResource(const Resource& resource) {
  if (!IsCacheableResource(resource)) {
    return false;
  }

  DirectiveMap directive_map;
  if (!GetHeaderDirectives(resource.GetResponseHeader("Cache-Control"),
                           &directive_map)) {
    return false;
  }

  if (directive_map.count("private")) {
    return false;
  }

  return true;
}

bool IsLikelyStaticResource(const Resource& resource) {
  if (!IsCacheableResourceStatusCode(resource.GetResponseStatusCode())) {
    return false;
  }

  if (!IsCacheableResource(resource)) {
    return false;
  }

  if (!IsLikelyStaticResourceType(resource.GetResourceType())) {
    // Certain types of resources (e.g. JS, CSS, images) are typically
    // static. If the resource isn't one of these types, assume it's
    // not static.
    return false;
  }

  // The resource passed all of the checks, so it appears to be
  // static.
  return true;
}

int64 ComputeTotalResponseBytes(const InputInformation& input_info) {
  return input_info.html_response_bytes() +
      input_info.text_response_bytes() +
      input_info.css_response_bytes() +
      input_info.image_response_bytes() +
      input_info.javascript_response_bytes() +
      input_info.flash_response_bytes() +
      input_info.other_response_bytes();
}

int64 ComputeCompressibleResponseBytes(const InputInformation& input_info) {
  return input_info.html_response_bytes() +
      input_info.text_response_bytes() +
      input_info.css_response_bytes() +
      input_info.javascript_response_bytes();
}

std::string GetRedirectedUrl(const Resource& resource) {
  if (resource.GetResourceType() != pagespeed::REDIRECT) {
    return "";
  }

  const std::string& source = resource.GetRequestUrl();
  if (source.empty()) {
    LOG(DFATAL) << "Empty request url.";
    return "";
  }

  const std::string& location = resource.GetResponseHeader("Location");
  if (location.empty()) {
    // No Location header, so unable to compute redirect.
    return "";
  }

  // Construct a fully qualified URL.  The HTTP RFC says that Location
  // should be absolute but some servers out there send relative
  // location urls anyway.
  return pagespeed::uri_util::ResolveUri(location, source);
}

const Resource* GetLastResourceInRedirectChain(const PagespeedInput& input,
                                               const Resource& start) {
  std::set<const Resource*> visited;
  if (start.GetResourceType() != REDIRECT) {
    return NULL;
  }

  const Resource* resource = &start;
  int num_iterations = 0;
  while (true) {
    if (num_iterations++ > kMaxRedirects) {
      LOG(WARNING) << "Encountered possible infinite redirect loop from "
                   << start.GetRequestUrl();
      return NULL;
    }
    if (visited.find(resource) != visited.end()) {
      LOG(INFO) << "Encountered redirect loop.";
      return NULL;
    }
    visited.insert(resource);

    const std::string target_url = resource_util::GetRedirectedUrl(*resource);
    if (target_url.empty()) {
      return NULL;
    }

    resource = input.GetResourceWithUrl(target_url);
    if (resource == NULL) {
      LOG(INFO) << "Unable to find redirected resource for " << target_url;
      return NULL;
    }
    if (resource->GetResourceType() != REDIRECT) {
      return resource;
    }
  }
}

}  // namespace resource_util

}  // namespace pagespeed
