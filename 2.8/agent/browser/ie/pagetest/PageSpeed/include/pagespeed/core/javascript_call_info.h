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

#ifndef PAGESPEED_CORE_JAVASCRIPT_CALL_INFO_H_
#define PAGESPEED_CORE_JAVASCRIPT_CALL_INFO_H_

#include <string>
#include <vector>

#include "base/basictypes.h"

namespace pagespeed {

// Contains basic information about a JavaScript function call made by
// the application.
class JavaScriptCallInfo {
 public:
  // NOTE: Object arguments should be serialized to JSON by the
  // caller. The caller should take care to only serialize the minimal
  // subset of properties necessary in order to reduce memory
  // overhead, and avoid attempting to serialize objects with cyclic
  // references.
  JavaScriptCallInfo(const std::string& id,
                     const std::string& document_url,
                     const std::vector<std::string>& args,
                     int line_number)
      : id_(id),
        document_url_(document_url),
        args_(args),
        line_number_(line_number) {}

  // Identifier (e.g. the function name).
  const std::string& id() const { return id_; }

  // URL of the document where this JavaScriptCallInfo was
  // captured. Used to determine in which document context the JSCI was
  // run (e.g. for resolving relative URLs).
  const std::string& document_url() const { return document_url_; }

  // List of arguments passed to the function. Object arguments will
  // be serialized to JSON.
  const std::vector<std::string>& args() const { return args_; }

  // The line number of the root JavaScript call (i.e. the function at
  // the bottom of the call stack) where this JavaScriptCallInfo was
  // captured. The line number is a line number in the source of the
  // resource associated with this JavaScriptCallInfo (not necessarily
  // the document_url()). For inline JS this will be line number in an
  // HTML document; for external JS this will be a line number in the
  // JS file.
  int line_number() const { return line_number_; }

 private:
  std::string id_;
  std::string document_url_;
  std::vector<std::string> args_;
  int line_number_;

  DISALLOW_COPY_AND_ASSIGN(JavaScriptCallInfo);
};

}  // namespace pagespeed

#endif  // PAGESPEED_CORE_JAVASCRIPT_CALL_INFO_H_

