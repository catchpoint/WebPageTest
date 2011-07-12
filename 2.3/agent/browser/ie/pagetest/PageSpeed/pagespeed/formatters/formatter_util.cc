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

#include "pagespeed/formatters/formatter_util.h"

#include <algorithm>
#include <vector>

#include "base/string_util.h"

namespace {

const int kBytesPerKiB = 1 << 10;
const int kBytesPerMiB = 1 << 20;

struct DurationDescriptor {
  int quantity;
  const char *display_name;
};

// TODO: need to localize the display names when we add localization
// support.
const DurationDescriptor kQuantities[] = {
  { 1000, "millisecond" },
  { 60, "second" },
  { 60, "minute" },
  { 24, "hour" },
  { 365, "day" },
  { -1, "year" },
};

const size_t kQuantitiesSize = sizeof(kQuantities) / sizeof(kQuantities[0]);
const char *kTimeDurationFormatStr = "%d %s%s";
const char *kZeroSecondsStr = "0 seconds";
const size_t kNumComponentsToDisplay = 2;

void DoFormatTimeDuration(int64 duration,
                          std::vector<std::string> *components) {
  for (size_t i = 0; i < kQuantitiesSize && duration > 0; ++i) {
    const DurationDescriptor *desc = kQuantities + i;
    int64 value = duration;
    duration /= desc->quantity;
    if (desc->quantity > 0) {
      // If we're not at the largest Duration type (years) then
      // extract the quantity for this duration.
      value %= desc->quantity;
    }

    if (value == 0) {
      // Don't emit "0 seconds" or "0 minutes".
      continue;
    }

    components->push_back(StringPrintf(kTimeDurationFormatStr,
                                       static_cast<int>(value),
                                       desc->display_name,
                                       value != 1 ? "s": ""));
  }
}

}  // namespace

namespace pagespeed {

namespace formatters {

std::string FormatBytes(int64 bytes) {
  if (bytes < kBytesPerKiB) {
    return StringPrintf("%lldB", static_cast<long long int>(bytes));
  } else if (bytes < kBytesPerMiB) {
    return StringPrintf("%.1fKiB", bytes / static_cast<double>(kBytesPerKiB));
  } else {
    return StringPrintf("%.1fMiB", bytes / static_cast<double>(kBytesPerMiB));
  }
}

std::string FormatTimeDuration(int64 milliseconds) {
  if (milliseconds == 0LL) {
    // Special case when input is 0 millis.
    return kZeroSecondsStr;
  }
  std::vector<std::string> components;
  DoFormatTimeDuration(milliseconds, &components);

  // DoFormatTimeDuration emits components from smallest time unit to
  // largest time unit, so we need to reverse it.
  std::reverse(components.begin(), components.end());

  if (components.size() > kNumComponentsToDisplay) {
    // Show at most kNumComponentsToDisplay.
    components.resize(kNumComponentsToDisplay);
  }
  return JoinString(components, ' ');
}

}  // namespace formatters

}  // namespace pagespeed
