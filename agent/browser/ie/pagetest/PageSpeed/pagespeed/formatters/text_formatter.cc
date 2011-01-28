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

#include "pagespeed/formatters/text_formatter.h"

#include <string>
#include <vector>

#include "base/logging.h"
#include "base/string_number_conversions.h"
#include "base/string_util.h"
#include "pagespeed/formatters/formatter_util.h"

namespace pagespeed {

namespace formatters {

TextFormatter::TextFormatter(std::ostream* output)
    : output_(output), level_(0) {
}

TextFormatter::TextFormatter(std::ostream* output, int level)
    : output_(output), level_(level) {
}

void TextFormatter::Indent(int level) {
  *output_ << std::string(2 * level, ' ');
}

void TextFormatter::DoneAddingChildren() {
}

Formatter* TextFormatter::AddHeader(const Rule& rule, int score) {
  Argument header_arg(Argument::STRING, rule.header());
  scoped_ptr<Argument> score_arg;
  if (score != -1) {
    score_arg.reset(new Argument(Argument::INTEGER, score));
  } else {
    score_arg.reset(new Argument(Argument::STRING, "n/a"));
  }
  return AddChild("_$1_ (score=$2)", header_arg, *score_arg);
}

Formatter* TextFormatter::NewChild(const FormatterParameters& params) {
  const std::string str = Format(params.format_str(), params.arguments());

  Indent(level_);
  switch (level_) {
    case 0:
      *output_ << str << std::endl;
      break;
    case 1:
      *output_ << str << std::endl;
      break;
    default:
      *output_ << "* " << str << std::endl;
      break;
  }

  return new TextFormatter(output_, level_ + 1);
}

std::string TextFormatter::Format(
    const std::string& format_str,
    const std::vector<const Argument*>& arguments) {
  std::vector<std::string> subst;

  for (std::vector<const Argument*>::const_iterator iter = arguments.begin(),
           end = arguments.end();
       iter != end;
       ++iter) {
    const Argument& arg = **iter;
    switch (arg.type()) {
      case Argument::STRING:
      case Argument::URL:
        subst.push_back(arg.string_value());
        break;
      case Argument::INTEGER:
        subst.push_back(base::Int64ToString(arg.int_value()));
        break;
      case Argument::BYTES:
        subst.push_back(FormatBytes(arg.int_value()));
        break;
      case Argument::DURATION:
        subst.push_back(FormatTimeDuration(arg.int_value()));
        break;
      default:
        LOG(DFATAL) << "Unknown argument type "
                    << arg.type();
        subst.push_back("?");
        break;
    }
  }

  return ReplaceStringPlaceholders(format_str, subst, NULL);
}

}  // namespace formatters

}  // namespace pagespeed
