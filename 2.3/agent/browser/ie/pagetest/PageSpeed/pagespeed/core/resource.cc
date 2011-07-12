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

#include "pagespeed/core/resource.h"

#include <algorithm>
#include <iterator>
#include <map>
#include <string>

#include "base/logging.h"
#include "base/stl_util-inl.h"
#include "googleurl/src/gurl.h"
#include "pagespeed/core/javascript_call_info.h"

namespace {

const std::string& GetEmptyString() {
  static const std::string kEmptyString = "";
  return kEmptyString;
}

bool IsRedirectStatusCode(int status_code) {
  return status_code == 301 ||
      status_code == 302 ||
      status_code == 303 ||
      status_code == 307;
}

bool IsBodyStatusCode(int status_code) {
  return status_code == 200 ||
      status_code == 203 ||
      status_code == 206 ||
      status_code == 304;
}

}  // namespace

namespace pagespeed {

Resource::Resource()
    : status_code_(-1),
      type_(OTHER),
      lazy_loaded_(false) {
}

Resource::~Resource() {
  for (JavaScriptCallInfoMap::const_iterator
           it = javascript_calls_.begin(), end = javascript_calls_.end();
       it != end;
       ++it) {
    const std::vector<const JavaScriptCallInfo*>& calls = it->second;
    STLDeleteContainerPointers(calls.begin(), calls.end());
  }
}

void Resource::SetRequestUrl(const std::string& value) {
  request_url_ = value;
}

void Resource::SetRequestMethod(const std::string& value) {
  request_method_ = value;
}

void Resource::AddRequestHeader(const std::string& name,
                                const std::string& value) {
  std::string& header = request_headers_[name];
  if (!header.empty()) {
    // In order to avoid keeping headers in a multi-map, we merge
    // duplicate headers are merged using commas.  This transformation is
    // allowed by the http 1.1 RFC.
    //
    // http://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html#sec4.2
    // TODO change to preserve header structure if we need to.
    header += ",";
  }
  header += value;
}

void Resource::SetRequestBody(const std::string& value) {
  request_body_ = value;
}

void Resource::SetResponseStatusCode(int code) {
  status_code_ = code;
}

void Resource::AddResponseHeader(const std::string& name,
                                 const std::string& value) {
  std::string& header = response_headers_[name];
  if (!header.empty()) {
    // In order to avoid keeping headers in a multi-map, we merge
    // duplicate headers are merged using commas.  This transformation is
    // allowed by the http 1.1 RFC.
    //
    // http://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html#sec4.2
    // TODO change to preserve header structure if we need to.
    header += ",";
  }
  header += value;
}

void Resource::RemoveResponseHeader(const std::string& name) {
  response_headers_.erase(name);
}

void Resource::SetResponseBody(const std::string& value) {
  response_body_ = value;
}

void Resource::SetCookies(const std::string& cookies) {
  cookies_ = cookies;
}

void Resource::SetLazyLoaded() {
  lazy_loaded_ = true;
}

void Resource::SetResourceType(ResourceType type) {
  if (GetResourceType() == REDIRECT) {
    LOG(DFATAL) << "Unable to SetResourceType for redirect.";
    return;
  }
  if (type == REDIRECT) {
    LOG(DFATAL) << "Unable to SetResourceType to redirect.";
    return;
  }
  if (!IsBodyStatusCode(status_code_)) {
    // This can happen for tracking resources that recieve 204
    // responses (e.g. images).
    LOG(INFO) << "Unable to SetResourceType for code " << status_code_;
    return;
  }
  type_ = type;
}

void Resource::AddJavaScriptCall(const JavaScriptCallInfo* call_info) {
  javascript_calls_[call_info->id()].push_back(call_info);
}

const std::string& Resource::GetRequestUrl() const {
  return request_url_;
}

const std::string& Resource::GetRequestMethod() const {
  return request_method_;
}

const std::string& Resource::GetRequestHeader(
    const std::string& name) const {
  HeaderMap::const_iterator it = request_headers_.find(name);
  if (it != request_headers_.end()) {
    return it->second;
  } else {
    return GetEmptyString();
  }
}

const std::string& Resource::GetRequestBody() const {
  return request_body_;
}

int Resource::GetResponseStatusCode() const {
  return status_code_;
}

const Resource::HeaderMap* Resource::GetResponseHeaders() const {
  return &response_headers_;
}

const std::string& Resource::GetResponseBody() const {
  return response_body_;
}

const std::vector<const JavaScriptCallInfo*>* Resource::GetJavaScriptCalls(
    const std::string& id) const {
  JavaScriptCallInfoMap::const_iterator it = javascript_calls_.find(id);
  if (it == javascript_calls_.end()) {
    return NULL;
  }
  return &it->second;
}

const std::string& Resource::GetCookies() const {
  if (!cookies_.empty()) {
    // Use the user-specified cookies if available.
    return cookies_;
  }

  // NOTE: we could try to merge the Cookie and Set-Cookie headers like
  // a browser, but this is a non-trivial operation.
  const std::string& cookie_header = GetRequestHeader("Cookie");
  if (!cookie_header.empty()) {
    return cookie_header;
  }

  const std::string& set_cookie_header = GetResponseHeader("Set-Cookie");
  if (!set_cookie_header.empty()) {
    return set_cookie_header;
  }

  return GetEmptyString();
}

bool Resource::IsLazyLoaded() const {
  return lazy_loaded_;
}

const Resource::HeaderMap* Resource::GetRequestHeaders() const {
  return &request_headers_;
}

const std::string& Resource::GetResponseHeader(
    const std::string& name) const {
  HeaderMap::const_iterator it = response_headers_.find(name);
  if (it != response_headers_.end()) {
    return it->second;
  } else {
    return GetEmptyString();
  }
}

std::string Resource::GetHost() const {
  GURL url(GetRequestUrl());
  if (!url.is_valid()) {
    LOG(DFATAL) << "Url parsing failed while processing "
                << GetRequestUrl();
    return "";
  } else {
    return url.host();
  }
}

std::string Resource::GetProtocol() const {
  GURL url(GetRequestUrl());
  if (!url.is_valid()) {
    LOG(DFATAL) << "Url parsing failed while processing "
                << GetRequestUrl();
    return "";
  } else {
    return url.scheme();
  }
}

ResourceType Resource::GetResourceType() const {
  // Prefer the status code to an explicitly specified type and the
  // contents of the Content-Type header.
  const int status_code = GetResponseStatusCode();
  if (IsRedirectStatusCode(status_code)) {
    return REDIRECT;
  }

  if (!IsBodyStatusCode(status_code)) {
    return OTHER;
  }

  // Next check to see if the type_ variable has been specified.
  if (type_ != OTHER) {
    return type_;
  }

  // Finally, fall back to the Content-Type header.
  std::string type = GetResponseHeader("Content-Type");

  size_t separator_idx = type.find(";");
  if (separator_idx != std::string::npos) {
    type.erase(separator_idx);
  }

  if (type.find("text/") == 0) {
    if (type == "text/html" ||
        type == "text/html-sandboxed") {
      return HTML;
    } else if (type == "text/css") {
      return CSS;
    } else if (type.find("javascript") != type.npos ||
               type.find("json") != type.npos ||
               type.find("ecmascript") != type.npos ||
               type == "text/livescript" ||
               type == "text/js" ||
               type == "text/jscript" ||
               type == "text/x-js") {
      return JS;
    } else {
      return TEXT;
    }
  } else if (type.find("image/") == 0) {
    return IMAGE;
  } else if (type.find("application/") == 0) {
    if (type.find("javascript") != type.npos ||
        type.find("json") != type.npos ||
        type.find("ecmascript") != type.npos ||
        type == "application/livescript" ||
        type == "application/js" ||
        type == "application/jscript" ||
        type == "application/x-js") {
      return JS;
    } else if (type == "application/xhtml+xml") {
      return HTML;
    } else if (type == "application/xml") {
      return TEXT;
    } else if (type == "application/x-shockwave-flash") {
      return FLASH;
    }
  }

  return OTHER;
}

ImageType Resource::GetImageType() const {
  if (GetResourceType() != IMAGE) {
    DCHECK(false) << "Non-image type: " << GetResourceType();
    return UNKNOWN_IMAGE_TYPE;
  }
  std::string type = GetResponseHeader("Content-Type");

  size_t separator_idx = type.find(";");
  if (separator_idx != std::string::npos) {
    type.erase(separator_idx);
  }

  if (type == "image/png") {
    return PNG;
  } else if (type == "image/gif") {
    return GIF;
  } else if (type == "image/jpg" || type == "image/jpeg") {
    return JPEG;
  } else {
    return UNKNOWN_IMAGE_TYPE;
  }
}

bool ResourceUrlLessThan::operator()(
    const Resource* lhs, const Resource* rhs) const {
  return lhs->GetRequestUrl() < rhs->GetRequestUrl();
}

}  // namespace pagespeed
