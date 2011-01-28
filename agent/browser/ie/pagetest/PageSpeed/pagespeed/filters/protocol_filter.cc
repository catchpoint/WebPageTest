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

#include "pagespeed/filters/protocol_filter.h"

namespace pagespeed {

ProtocolFilter::ProtocolFilter(std::vector<std::string> *allowed_protocols) {
  std::string regex_string = "^(";
  for (size_t i = 0; i < allowed_protocols->size(); ++i) {
    if (i) {
      regex_string += "|";
    }
    regex_string += (*allowed_protocols)[i];
  }
  regex_string += "):";

  protocol_regex_.Init(regex_string.c_str());
}

ProtocolFilter::~ProtocolFilter() {}

bool ProtocolFilter::IsAccepted(const Resource& resource) const {
  if (!protocol_regex_.is_valid()) {
    return false;
  }
  std::string url = resource.GetRequestUrl();
  return protocol_regex_.PartialMatch(url.c_str());
}

}  // namespace pagespeed
