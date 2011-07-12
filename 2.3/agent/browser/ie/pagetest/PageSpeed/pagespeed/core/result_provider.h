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

#ifndef PAGESPEED_CORE_RESULT_PROVIDER_H_
#define PAGESPEED_CORE_RESULT_PROVIDER_H_

#include "base/basictypes.h"

namespace pagespeed {

class Result;
class Results;
class Rule;

// Provides an interface to instantiate new result objects that are
// configured for the given rule.
class ResultProvider {
 public:
  ResultProvider(const Rule& rule, Results* results);

  // Instantiate a new Result instance, configured for the given
  // rule. Ownership is *not* transferred to the caller.
  Result* NewResult();

private:
  const Rule& rule_;
  Results* const results_;

  DISALLOW_COPY_AND_ASSIGN(ResultProvider);
};

}  // namespace pagespeed

#endif  // PAGESPEED_CORE_RESULT_PROVIDER_H_
