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

#include "pagespeed/core/formatter.h"

#include "base/logging.h"

namespace {

const std::string kEmptyString;
const std::vector<const pagespeed::Argument*> kEmptyParameterList;

}  // namespace

namespace pagespeed {

Argument::Argument(Argument::ArgumentType type, int64 value)
    : type_(type),
      int_value_(value) {
  DCHECK(type_ == INTEGER || type_ == BYTES || type_ == DURATION);
}

Argument::Argument(Argument::ArgumentType type, const std::string& value)
    : type_(type), int_value_(-1),
      string_value_(value) {
  DCHECK(type_ == STRING || type_ == URL);
}

int64 Argument::int_value() const {
  DCHECK(type_ == INTEGER || type_ == BYTES || type_ == DURATION);
  return int_value_;
}

const std::string& Argument::string_value() const {
  DCHECK(type_ == STRING || type_ == URL);
  return string_value_;
}

Argument::ArgumentType Argument::type() const {
  return type_;
}

FormatterParameters::FormatterParameters(const std::string* format_str)
    : format_str_(format_str),
      arguments_(&kEmptyParameterList),
      optimized_content_(NULL) {
  DCHECK_NE(format_str, static_cast<const std::string*>(NULL));
}

FormatterParameters::FormatterParameters(
    const std::string* format_str,
    const std::vector<const Argument*>* arguments)
    : format_str_(format_str),
      arguments_(arguments),
      optimized_content_(NULL) {
  DCHECK_NE(format_str, static_cast<const std::string*>(NULL));
  DCHECK_NE(arguments,
            static_cast<std::vector<const pagespeed::Argument*>*>(NULL));
}

void FormatterParameters::set_optimized_content(const std::string* content,
                                                const std::string& mime_type) {
  optimized_content_ = content;
  optimized_content_mime_type_.assign(mime_type);
}

const std::string& FormatterParameters::format_str() const {
  if (format_str_ != NULL) {
    return *format_str_;
  } else {
    return kEmptyString;
  }
}

const std::vector<const Argument*>& FormatterParameters::arguments() const {
  if (arguments_ != NULL) {
    return *arguments_;
  } else {
    return kEmptyParameterList;
  }
}

bool FormatterParameters::has_optimized_content() const {
  return optimized_content_ != NULL;
}

const std::string& FormatterParameters::optimized_content() const {
  DCHECK_NE(optimized_content_, static_cast<const std::string*>(NULL));
  if (optimized_content_ != NULL) {
    return *optimized_content_;
  } else {
    return kEmptyString;
  }
}

const std::string& FormatterParameters::optimized_content_mime_type() const {
  return optimized_content_mime_type_;
}

Formatter::Formatter() {
}

Formatter::~Formatter() {
}

Formatter* Formatter::AddChild(const std::string& format_str) {
  FormatterParameters formatter_params(&format_str);
  return AddChild(formatter_params);
}

Formatter* Formatter::AddChild(const std::string& format_str,
                               const Argument& arg1) {
  std::vector<const Argument*> args;
  args.push_back(&arg1);

  FormatterParameters formatter_params(&format_str, &args);
  return AddChild(formatter_params);
}

Formatter* Formatter::AddChild(const std::string& format_str,
                               const Argument& arg1,
                               const Argument& arg2) {
  std::vector<const Argument*> args;
  args.push_back(&arg1);
  args.push_back(&arg2);
  FormatterParameters formatter_params(&format_str, &args);
  return AddChild(formatter_params);
}

Formatter* Formatter::AddChild(const std::string& format_str,
                               const Argument& arg1,
                               const Argument& arg2,
                               const Argument& arg3) {
  std::vector<const Argument*> args;
  args.push_back(&arg1);
  args.push_back(&arg2);
  args.push_back(&arg3);
  FormatterParameters formatter_params(&format_str, &args);
  return AddChild(formatter_params);
}

Formatter* Formatter::AddChild(const std::string& format_str,
                               const Argument& arg1,
                               const Argument& arg2,
                               const Argument& arg3,
                               const Argument& arg4) {
  std::vector<const Argument*> args;
  args.push_back(&arg1);
  args.push_back(&arg2);
  args.push_back(&arg3);
  args.push_back(&arg4);
  FormatterParameters formatter_params(&format_str, &args);
  return AddChild(formatter_params);
}

Formatter* Formatter::AddChild(const FormatterParameters& params) {
  if (active_child_ != NULL) {
    active_child_->Done();
  }
  active_child_.reset(NewChild(params));
  return active_child_.get();
}

void Formatter::Done() {
  if (active_child_ != NULL) {
    active_child_->Done();
  }
  DoneAddingChildren();
}

RuleFormatter::~RuleFormatter() {
}

}  // namespace pagespeed
