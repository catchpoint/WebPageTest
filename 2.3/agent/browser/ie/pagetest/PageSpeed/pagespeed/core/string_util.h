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

#ifndef PAGESPEED_CORE_STRING_UTIL_H_
#define PAGESPEED_CORE_STRING_UTIL_H_

#include <map>
#include <string>

namespace pagespeed {

namespace string_util {

class CaseInsensitiveStringComparator {
 public:
  bool operator()(const std::string& x, const std::string& y) const;
};

typedef std::map<std::string, std::string,
                 CaseInsensitiveStringComparator>
    CaseInsensitiveStringStringMap;

}  // namespace string_util

}  // namespace pagespeed

#endif  // PAGESPEED_CORE_STRING_UTIL_H_
