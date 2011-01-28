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

#include "pagespeed/util/regex.h"

#include "base/logging.h"

namespace pagespeed {

RE::RE() : is_initialized_(false), is_valid_(false) {
}

RE::~RE() {
#ifndef _WIN32
  if (is_initialized_) {
    regfree(&regex_);
  }
#endif
}

bool RE::Init(const char *pattern) {
  if (is_initialized_) {
    DCHECK(false);
    return false;
  }
  is_initialized_ = true;

#ifdef _WIN32
  try {
    regex_.assign(pattern,
                  std::tr1::regex_constants::extended |
                  std::tr1::regex_constants::nosubs);
    is_valid_ = true;
  } catch (std::tr1::regex_error ex) {
    is_valid_ = false;
  }
#else
  is_valid_ = (regcomp(&regex_, pattern, REG_EXTENDED | REG_NOSUB) == 0);
#endif
  return is_valid_;
}

bool RE::PartialMatch(const char *str) const {
  if (!is_valid_) {
    DCHECK(false);
    return false;
  }

#ifdef _WIN32
  return std::tr1::regex_search(str, regex_);
#else
  return regexec(&regex_, str, 0, NULL, 0) == 0;
#endif
}

}  // namespace pagespeed
