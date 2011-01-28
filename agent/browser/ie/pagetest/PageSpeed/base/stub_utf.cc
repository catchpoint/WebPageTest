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

// This file provides stubs of UTF-related functions to help Page Speed's base
// library to link.  None of these functions should ever actually be called by
// Page Speed code.

#include <string>

#include "base/logging.h"
#include "base/string16.h"
#include "base/utf_string_conversions.h"

std::string UTF16ToUTF8(const string16& utf16) {
  CHECK(false) << "Called stub version of UTF16ToUTF8";
  return std::string();
}
