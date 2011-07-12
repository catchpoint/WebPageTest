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

#include "pagespeed/formatters/proto_formatter.h"

#include <string>
#include <vector>

#include "base/logging.h"
#include "pagespeed/proto/pagespeed_output.pb.h"

namespace pagespeed {

namespace formatters {

ProtoFormatter::ProtoFormatter(std::vector<ResultText*>* results)
    : results_(results),
      result_text_(NULL) {
}

ProtoFormatter::ProtoFormatter(ResultText* result_text)
    : results_(NULL),
      result_text_(result_text) {
}

Formatter* ProtoFormatter::AddHeader(const Rule& rule, int score) {
  return AddChild(rule.header());
}

Formatter* ProtoFormatter::NewChild(const FormatterParameters& params) {
  ResultText* new_child = NULL;
  if (results_ != NULL) {
    DCHECK(result_text_ == NULL);
    new_child = new ResultText;
    results_->push_back(new_child);
  } else {
    DCHECK(results_ == NULL);
    new_child = result_text_->add_children();
  }

  Format(new_child, params.format_str(), params.arguments());

  if (params.has_optimized_content()) {
    new_child->set_optimized_content(params.optimized_content());
  }

  return new ProtoFormatter(new_child);
}

void ProtoFormatter::Format(ResultText* result_text,
                            const std::string& format_str,
                            const std::vector<const Argument*>& arguments) {
  if (result_text == NULL) {
    LOG(DFATAL) << "NULL result_text.";
    return;
  }

  result_text->set_format(format_str);

  for (std::vector<const Argument*>::const_iterator iter = arguments.begin(),
           end = arguments.end();
       iter != end;
       ++iter) {
    const Argument* arg = *iter;
    FormatArgument* format_arg = result_text->add_args();
    switch (arg->type()) {
      case Argument::INTEGER:
        format_arg->set_type(FormatArgument::INT_LITERAL);
        format_arg->set_int_value(arg->int_value());
        break;
      case Argument::BYTES:
        format_arg->set_type(FormatArgument::BYTES);
        format_arg->set_int_value(arg->int_value());
        break;
      case Argument::DURATION:
        format_arg->set_type(FormatArgument::DURATION);
        format_arg->set_int_value(arg->int_value());
        break;
      case Argument::STRING:
        format_arg->set_type(FormatArgument::STRING_LITERAL);
        format_arg->set_string_value(arg->string_value());
        break;
      case Argument::URL:
        format_arg->set_type(FormatArgument::URL);
        format_arg->set_string_value(arg->string_value());
        break;
      default:
        LOG(DFATAL) << "Unknown argument type "
                    << arg->type();
        format_arg->set_type(FormatArgument::STRING_LITERAL);
        format_arg->set_string_value("?");
        break;
    }
  }
}

void ProtoFormatter::DoneAddingChildren() {
}

}  // namespace formatters

}  // namespace pagespeed
