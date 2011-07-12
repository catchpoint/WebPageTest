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

#include "pagespeed/core/result_provider.h"

#include "pagespeed/core/rule.h"
#include "pagespeed/proto/pagespeed_output.pb.h"

namespace pagespeed {

ResultProvider::ResultProvider(const Rule& rule, Results* results)
    : rule_(rule), results_(results) {
}

Result* ResultProvider::NewResult() {
  Result* result = results_->add_results();
  result->set_rule_name(rule_.name());
  return result;
}

}  // namespace pagespeed
