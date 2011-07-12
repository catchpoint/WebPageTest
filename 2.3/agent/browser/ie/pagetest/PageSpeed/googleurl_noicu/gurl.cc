// Copyright 2007, Google Inc.
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
//     * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

#ifdef WIN32
#include <windows.h>
#else
#include <pthread.h>
#endif

#include <algorithm>

#include "googleurl/src/gurl.h"

#include "base/logging.h"
#include "googleurl/src/url_canon_stdstring.h"
#include "googleurl/src/url_util.h"

namespace {

// External template that can handle initialization of either character type.
// The input spec is given, and the canonical version will be placed in
// |*canonical|, along with the parsing of the canonical spec in |*parsed|.
template<typename STR>
bool InitCanonical(const STR& input_spec,
                   std::string* canonical,
                   url_parse::Parsed* parsed) {
  // Reserve enough room in the output for the input, plus some extra so that
  // we have room if we have to escape a few things without reallocating.
  canonical->reserve(input_spec.size() + 32);
  url_canon::StdStringCanonOutput output(canonical);
  bool success = url_util::Canonicalize(
      input_spec.data(), static_cast<int>(input_spec.length()),
      NULL, &output, parsed);

  output.Complete();  // Must be done before using string.
  return success;
}

static std::string* empty_string = NULL;
static GURL* empty_gurl = NULL;

#ifdef WIN32

// Returns a static reference to an empty string for returning a reference
// when there is no underlying string.
const std::string& EmptyStringForGURL() {
  // Avoid static object construction/destruction on startup/shutdown.
  if (!empty_string) {
    // Create the string. Be careful that we don't break in the case that this
    // is being called from multiple threads. Statics are not threadsafe.
    std::string* new_empty_string = new std::string;
    if (InterlockedCompareExchangePointer(
        reinterpret_cast<PVOID*>(&empty_string), new_empty_string, NULL)) {
      // The old value was non-NULL, so no replacement was done. Another
      // thread did the initialization out from under us.
      delete new_empty_string;
    }
  }
  return *empty_string;
}

#else

static pthread_once_t empty_string_once = PTHREAD_ONCE_INIT;
static pthread_once_t empty_gurl_once = PTHREAD_ONCE_INIT;

void EmptyStringForGURLOnce(void) {
  empty_string = new std::string;
}

const std::string& EmptyStringForGURL() {
  // Avoid static object construction/destruction on startup/shutdown.
  pthread_once(&empty_string_once, EmptyStringForGURLOnce);
  return *empty_string;
}

#endif  // WIN32

} // namespace

GURL::GURL() : is_valid_(false) {
}

GURL::GURL(const GURL& other)
    : spec_(other.spec_),
      is_valid_(other.is_valid_),
      parsed_(other.parsed_) {
}

GURL::GURL(const std::string& url_string) {
  is_valid_ = InitCanonical(url_string, &spec_, &parsed_);
}

#ifdef ICU_DEPENDENCY
GURL::GURL(const string16& url_string) {
  is_valid_ = InitCanonical(url_string, &spec_, &parsed_);
}
#endif

GURL::GURL(const char* canonical_spec, size_t canonical_spec_len,
           const url_parse::Parsed& parsed, bool is_valid)
    : spec_(canonical_spec, canonical_spec_len),
      is_valid_(is_valid),
      parsed_(parsed) {
#ifndef NDEBUG
  // For testing purposes, check that the parsed canonical URL is identical to
  // what we would have produced. Skip checking for invalid URLs have no meaning
  // and we can't always canonicalize then reproducabely.
  if (is_valid_) {
    GURL test_url(spec_);

    DCHECK(test_url.is_valid_ == is_valid_);
    DCHECK(test_url.spec_ == spec_);

    DCHECK(test_url.parsed_.scheme == parsed_.scheme);
    DCHECK(test_url.parsed_.username == parsed_.username);
    DCHECK(test_url.parsed_.password == parsed_.password);
    DCHECK(test_url.parsed_.host == parsed_.host);
    DCHECK(test_url.parsed_.port == parsed_.port);
    DCHECK(test_url.parsed_.path == parsed_.path);
    DCHECK(test_url.parsed_.query == parsed_.query);
    DCHECK(test_url.parsed_.ref == parsed_.ref);
  }
#endif
}

const std::string& GURL::spec() const {
  if (is_valid_ || spec_.empty())
    return spec_;

  DCHECK(false) << "Trying to get the spec of an invalid URL!";
  return EmptyStringForGURL();
}

GURL GURL::Resolve(const std::string& relative) const {
  return ResolveWithCharsetConverter(relative, NULL);
}

#ifdef ICU_DEPENDENCY
GURL GURL::Resolve(const string16& relative) const {
  return ResolveWithCharsetConverter(relative, NULL);
}
#endif

// Note: code duplicated below (it's inconvenient to use a template here).
GURL GURL::ResolveWithCharsetConverter(
    const std::string& relative,
    url_canon::CharsetConverter* charset_converter) const {
  // Not allowed for invalid URLs.
  if (!is_valid_)
    return GURL();

  GURL result;

  // Reserve enough room in the output for the input, plus some extra so that
  // we have room if we have to escape a few things without reallocating.
  result.spec_.reserve(spec_.size() + 32);
  url_canon::StdStringCanonOutput output(&result.spec_);

  if (!url_util::ResolveRelative(
          spec_.data(), static_cast<int>(spec_.length()), parsed_,
          relative.data(), static_cast<int>(relative.length()),
          charset_converter, &output, &result.parsed_)) {
    // Error resolving, return an empty URL.
    return GURL();
  }

  output.Complete();
  result.is_valid_ = true;
  return result;
}

#ifdef ICU_DEPENDENCY
// Note: code duplicated above (it's inconvenient to use a template here).
GURL GURL::ResolveWithCharsetConverter(
    const string16& relative,
    url_canon::CharsetConverter* charset_converter) const {
  // Not allowed for invalid URLs.
  if (!is_valid_)
    return GURL();

  GURL result;

  // Reserve enough room in the output for the input, plus some extra so that
  // we have room if we have to escape a few things without reallocating.
  result.spec_.reserve(spec_.size() + 32);
  url_canon::StdStringCanonOutput output(&result.spec_);

  if (!url_util::ResolveRelative(
          spec_.data(), static_cast<int>(spec_.length()), parsed_,
          relative.data(), static_cast<int>(relative.length()),
          charset_converter, &output, &result.parsed_)) {
    // Error resolving, return an empty URL.
    return GURL();
  }

  output.Complete();
  result.is_valid_ = true;
  return result;
}
#endif

// Note: code duplicated below (it's inconvenient to use a template here).
GURL GURL::ReplaceComponents(
    const url_canon::Replacements<char>& replacements) const {
  GURL result;

  // Not allowed for invalid URLs.
  if (!is_valid_)
    return GURL();

  // Reserve enough room in the output for the input, plus some extra so that
  // we have room if we have to escape a few things without reallocating.
  result.spec_.reserve(spec_.size() + 32);
  url_canon::StdStringCanonOutput output(&result.spec_);

  result.is_valid_ = url_util::ReplaceComponents(
      spec_.data(), static_cast<int>(spec_.length()), parsed_, replacements,
      NULL, &output, &result.parsed_);

  output.Complete();
  return result;
}

// Note: code duplicated above (it's inconvenient to use a template here).
GURL GURL::ReplaceComponents(
    const url_canon::Replacements<char16>& replacements) const {
  GURL result;

  // Not allowed for invalid URLs.
  if (!is_valid_)
    return GURL();

  // Reserve enough room in the output for the input, plus some extra so that
  // we have room if we have to escape a few things without reallocating.
  result.spec_.reserve(spec_.size() + 32);
  url_canon::StdStringCanonOutput output(&result.spec_);

  result.is_valid_ = url_util::ReplaceComponents(
      spec_.data(), static_cast<int>(spec_.length()), parsed_, replacements,
      NULL, &output, &result.parsed_);

  output.Complete();
  return result;
}

GURL GURL::GetOrigin() const {
  // This doesn't make sense for invalid or nonstandard URLs, so return
  // the empty URL
  if (!is_valid_ || !IsStandard())
    return GURL();

  url_canon::Replacements<char> replacements;
  replacements.ClearUsername();
  replacements.ClearPassword();
  replacements.ClearPath();
  replacements.ClearQuery();
  replacements.ClearRef();

  return ReplaceComponents(replacements);
}

GURL GURL::GetWithEmptyPath() const {
  // This doesn't make sense for invalid or nonstandard URLs, so return
  // the empty URL.
  if (!is_valid_ || !IsStandard())
    return GURL();

  // We could optimize this since we know that the URL is canonical, and we are
  // appending a canonical path, so avoiding re-parsing.
  GURL other(*this);
  if (parsed_.path.len == 0)
    return other;

  // Clear everything after the path.
  other.parsed_.query.reset();
  other.parsed_.ref.reset();

  // Set the path, since the path is longer than one, we can just set the
  // first character and resize.
  other.spec_[other.parsed_.path.begin] = '/';
  other.parsed_.path.len = 1;
  other.spec_.resize(other.parsed_.path.begin + 1);
  return other;
}

bool GURL::IsStandard() const {
  return url_util::IsStandard(spec_.data(), parsed_.scheme);
}

bool GURL::SchemeIs(const char* lower_ascii_scheme) const {
  if (parsed_.scheme.len <= 0)
    return lower_ascii_scheme == NULL;
  return url_util::LowerCaseEqualsASCII(spec_.data() + parsed_.scheme.begin,
                                        spec_.data() + parsed_.scheme.end(),
                                        lower_ascii_scheme);
}

int GURL::IntPort() const {
  if (parsed_.port.is_nonempty())
    return url_parse::ParsePort(spec_.data(), parsed_.port);
  return url_parse::PORT_UNSPECIFIED;
}

int GURL::EffectiveIntPort() const {
  int int_port = IntPort();
  if (int_port == url_parse::PORT_UNSPECIFIED && IsStandard())
    return url_canon::DefaultPortForScheme(spec_.data() + parsed_.scheme.begin,
                                           parsed_.scheme.len);
  return int_port;
}

std::string GURL::ExtractFileName() const {
  url_parse::Component file_component;
  url_parse::ExtractFileName(spec_.data(), parsed_.path, &file_component);
  return ComponentString(file_component);
}

std::string GURL::PathForRequest() const {
  DCHECK(parsed_.path.len > 0) << "Canonical path for requests should be non-empty";
  if (parsed_.ref.len >= 0) {
    // Clip off the reference when it exists. The reference starts after the #
    // sign, so we have to subtract one to also remove it.
    return std::string(spec_, parsed_.path.begin,
                       parsed_.ref.begin - parsed_.path.begin - 1);
  }

  // Use everything form the path to the end.
  return std::string(spec_, parsed_.path.begin);
}

std::string GURL::HostNoBrackets() const {
  // If host looks like an IPv6 literal, strip the square brackets.
  url_parse::Component h(parsed_.host);
  if (h.len >= 2 && spec_[h.begin] == '[' && spec_[h.end() - 1] == ']') {
    h.begin++;
    h.len -= 2;
  }
  return ComponentString(h);
}

bool GURL::HostIsIPAddress() const {
  if (!is_valid_ || spec_.empty())
     return false;

  url_canon::RawCanonOutputT<char, 128> ignored_output;
  url_canon::CanonHostInfo host_info;
  url_canon::CanonicalizeIPAddress(spec_.c_str(), parsed_.host,
                                   &ignored_output, &host_info);
  return host_info.IsIPAddress();
}

#ifdef WIN32

const GURL& GURL::EmptyGURL() {
  // Avoid static object construction/destruction on startup/shutdown.
  if (!empty_gurl) {
    // Create the string. Be careful that we don't break in the case that this
    // is being called from multiple threads.
    GURL* new_empty_gurl = new GURL;
    if (InterlockedCompareExchangePointer(
        reinterpret_cast<PVOID*>(&empty_gurl), new_empty_gurl, NULL)) {
      // The old value was non-NULL, so no replacement was done. Another
      // thread did the initialization out from under us.
      delete new_empty_gurl;
    }
  }
  return *empty_gurl;
}

#else

void EmptyGURLOnce(void) {
  empty_gurl = new GURL;
}

const GURL& GURL::EmptyGURL() {
  // Avoid static object construction/destruction on startup/shutdown.
  pthread_once(&empty_gurl_once, EmptyGURLOnce);
  return *empty_gurl;
}

#endif  // WIN32

bool GURL::DomainIs(const char* lower_ascii_domain,
                    int domain_len) const {
  // Return false if this URL is not valid or domain is empty.
  if (!is_valid_ || !parsed_.host.is_nonempty() || !domain_len)
    return false;

  // Check whether the host name is end with a dot. If yes, treat it
  // the same as no-dot unless the input comparison domain is end
  // with dot.
  const char* last_pos = spec_.data() + parsed_.host.end() - 1;
  int host_len = parsed_.host.len;
  if ('.' == *last_pos && '.' != lower_ascii_domain[domain_len - 1]) {
    last_pos--;
    host_len--;
  }

  // Return false if host's length is less than domain's length.
  if (host_len < domain_len)
    return false;

  // Compare this url whether belong specific domain.
  const char* start_pos = spec_.data() + parsed_.host.begin +
                          host_len - domain_len;

  if (!url_util::LowerCaseEqualsASCII(start_pos,
                                      last_pos + 1,
                                      lower_ascii_domain,
                                      lower_ascii_domain + domain_len))
    return false;

  // Check whether host has right domain start with dot, make sure we got
  // right domain range. For example www.google.com has domain
  // "google.com" but www.iamnotgoogle.com does not.
  if ('.' != lower_ascii_domain[0] && host_len > domain_len &&
      '.' != *(start_pos - 1))
    return false;

  return true;
}

void GURL::Swap(GURL* other) {
  spec_.swap(other->spec_);
  std::swap(is_valid_, other->is_valid_);
  std::swap(parsed_, other->parsed_);
}

