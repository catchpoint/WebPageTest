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

#ifndef PAGESPEED_FORMATTERS_JSON_FORMATTER_H_
#define PAGESPEED_FORMATTERS_JSON_FORMATTER_H_

#include <iostream>

#include "pagespeed/core/formatter.h"
#include "pagespeed/core/serializer.h"

namespace pagespeed {

namespace formatters {

/**
 * Formatter that produces JSON.
 */
class JsonFormatter : public RuleFormatter {
 public:
  JsonFormatter(std::ostream* output, Serializer* content_serializer);

  // RuleFormatter interface.
  virtual Formatter* AddHeader(const Rule& rule, int score);

 protected:
  // Formatter interface
  virtual Formatter* NewChild(const FormatterParameters& params);
  virtual void DoneAddingChildren();

 private:
  JsonFormatter(std::ostream* output,
                Serializer* content_serializer,
                int level);
  std::ostream* output_;
  Serializer* content_serializer_;
  int level_;
  bool has_children_;
};

}  // namespace formatters

}  // namespace pagespeed

#endif  // PAGESPEED_FORMATTERS_JSON_FORMATTER_H_
