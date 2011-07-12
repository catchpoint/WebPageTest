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

#ifndef PAGESPEED_APPS_PROTO_FORMATTER_H_
#define PAGESPEED_APPS_PROTO_FORMATTER_H_

#include "pagespeed/core/formatter.h"

namespace pagespeed {

class ResultText;

namespace formatters {

/**
 * Formatter that populates a ResultText protobuf.
 */
class ProtoFormatter : public RuleFormatter {
 public:
  explicit ProtoFormatter(std::vector<ResultText*>* results);
  explicit ProtoFormatter(ResultText* parent_text);

  // RuleFormatter interface
  virtual Formatter* AddHeader(const Rule& rule, int score);

 protected:
  // Formatter interface
  virtual Formatter* NewChild(const FormatterParameters& params);
  virtual void DoneAddingChildren();

 private:
  static void Format(ResultText* result_text,
                     const std::string& format_str,
                     const std::vector<const Argument*>& arguments);

  std::vector<ResultText*>* results_;
  ResultText* result_text_;
};

}  // namespace formatters

}  // namespace pagespeed

#endif  // PAGESPEED_APPS_PROTO_FORMATTER_H_
