/**
 * Copyright 2009 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#include "dom.h"

#include "base/logging.h"
#include "pagespeed/core/uri_util.h"

#define NOT_IMPLEMENTED() do {                          \
    LOG(WARNING) << __FUNCTION__ << " not implemented"; \
  } while (false)

namespace pagespeed {

DomDocument::DomDocument() {}

DomDocument::~DomDocument() {}

std::string DomDocument::ResolveUri(const std::string& uri) const {
  return pagespeed::uri_util::ResolveUri(uri, GetBaseUrl());
}

DomElement::DomElement() {}

DomElement::~DomElement() {}

DomElement::Status DomElement::GetActualWidth(int* out_width) const {
  NOT_IMPLEMENTED();
  return FAILURE;
}

DomElement::Status DomElement::GetActualHeight(int* out_height) const {
  NOT_IMPLEMENTED();
  return FAILURE;
}

DomElement::Status DomElement::HasWidthSpecified(
    bool* out_width_specified) const {
  NOT_IMPLEMENTED();
  return FAILURE;
}

DomElement::Status DomElement::HasHeightSpecified(
    bool* out_height_specified) const {
  NOT_IMPLEMENTED();
  return FAILURE;
}

DomElementVisitor::DomElementVisitor() {}

DomElementVisitor::~DomElementVisitor() {}

}  // namespace pagespeed
