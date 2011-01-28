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

#include "pagespeed/core/string_util.h"

#include <algorithm>  // for lexicographical_compare
#include "base/string_util.h"

namespace {

bool CaseInsensitiveCompareChars(char x, char y) {
  return ToLowerASCII(x) < ToLowerASCII(y);
}

}  // namespace

namespace pagespeed {

namespace string_util {

bool CaseInsensitiveStringComparator::operator()(const std::string& x,
                                                 const std::string& y) const {
  return std::lexicographical_compare(x.begin(), x.end(), y.begin(), y.end(),
                                      CaseInsensitiveCompareChars);
}

}  // namespace string_util

}  // namespace pagespeed
