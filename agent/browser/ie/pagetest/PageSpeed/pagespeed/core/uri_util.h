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

#ifndef PAGESPEED_CORE_URI_UTIL_H_
#define PAGESPEED_CORE_URI_UTIL_H_

#include <string>

namespace pagespeed {

class DomDocument;

namespace uri_util {

// Resolve the specified URI relative to the given base URL.
std::string ResolveUri(const std::string& uri, const std::string& base_url);

// Attempt to resolve the specified URI relative to the document with
// the given URL. This method will search through all of the child
// documents of the specified root DomDocument, looking for a
// DomDocument with the specified document_url. If such a DomDocument
// is found, the specified URI will be resolved relative to that
// document and this method will return true. Otherwise this method
// will return false. Upon returning false, callers may choose to fall
// back to calling ResolveUri(), which will generate the correct
// result except in cases where the DomDocument contains a <base> tag
// that overrides its base URL.
bool ResolveUriForDocumentWithUrl(
    const std::string& uri_to_resolve,
    const pagespeed::DomDocument* root_document,
    const std::string& document_url_to_find,
    std::string* out_resolved_url);

}  // namespace uri_util

}  // namespace pagespeed

#endif  // PAGESPEED_CORE_URI_UTIL_H_
