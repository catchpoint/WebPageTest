// Copyright 2010 Google Inc.
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

#include "pagespeed/core/pagespeed_version.h"

#include "pagespeed/proto/pagespeed_output.pb.h"

namespace {

const int kPagespeedMajorVersion = 1;
const int kPagespeedMinorVersion = 9;
const bool kRelease = true;

}  // namespace

namespace pagespeed {

void GetPageSpeedVersion(Version* version) {
  version->set_major(kPagespeedMajorVersion);
  version->set_minor(kPagespeedMinorVersion);
  version->set_official_release(kRelease);
}

}  // namespace pagespeed
