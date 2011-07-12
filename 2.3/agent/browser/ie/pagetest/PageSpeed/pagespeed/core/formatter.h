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

#ifndef PAGESPEED_CORE_FORMATTER_H_
#define PAGESPEED_CORE_FORMATTER_H_

#include <string>
#include <vector>

#include "base/basictypes.h"
#include "base/scoped_ptr.h"
#include "pagespeed/core/rule.h"

namespace pagespeed {

/**
 * Typed format argument representation.
 */
class Argument {
 public:
  enum ArgumentType {
    BYTES,
    INTEGER,
    STRING,
    URL,
    DURATION,
  };

  Argument(ArgumentType type, int64 value);
  Argument(ArgumentType type, const std::string& value);

  int64 int_value() const;
  const std::string& string_value() const;
  ArgumentType type() const;

 private:
  ArgumentType type_;
  int64 int_value_;
  std::string string_value_;

  DISALLOW_COPY_AND_ASSIGN(Argument);
};

/**
 * Formatter format string, arguments and additional information wrapper.
 * Additional information should be interpreted directly or ignored by
 * specific formatter subclasses.
 * Note: This class does not own the pointers it refers to.
 */
class FormatterParameters {
 public:
  explicit FormatterParameters(const std::string* format_str);
  FormatterParameters(const std::string* format_str,
                      const std::vector<const Argument*>* arguments);
  void set_optimized_content(const std::string* content,
                             const std::string& mime_type);

  const std::string& format_str() const;
  const std::vector<const Argument*>& arguments() const;
  bool has_optimized_content() const;
  const std::string& optimized_content() const;
  const std::string& optimized_content_mime_type() const;

 private:
  const std::string* format_str_;
  const std::vector<const Argument*>* arguments_;
  const std::string* optimized_content_;
  std::string optimized_content_mime_type_;

  DISALLOW_COPY_AND_ASSIGN(FormatterParameters);
};

/**
 * Result text formatter interface.
 */
class Formatter {
 public:
  virtual ~Formatter();

  // Format an item and add it to the formatter's output stream.
  // Returns a child formatter, which is valid until the next call to
  // AddChild on this formatter or one of its parents.  Calls to this
  // method also delete the previous child and all of its decendents.
  Formatter* AddChild(const FormatterParameters& params);

  // Convenience methods implemented in terms of AddChild(FormatterParameters).
  Formatter* AddChild(const std::string& format_str);

  Formatter* AddChild(const std::string& format_str,
                      const Argument& arg1);

  Formatter* AddChild(const std::string& format_str,
                      const Argument& arg1,
                      const Argument& arg2);

  Formatter* AddChild(const std::string& format_str,
                      const Argument& arg1,
                      const Argument& arg2,
                      const Argument& arg3);

  Formatter* AddChild(const std::string& format_str,
                      const Argument& arg1,
                      const Argument& arg2,
                      const Argument& arg3,
                      const Argument& arg4);

  // Calls DoneAddingChildren for all descendants, from bottom to top.
  void Done();

 protected:
  Formatter();
  // Child constructor; to be implemented by sub classes.
  virtual Formatter* NewChild(const FormatterParameters& params) = 0;

  // Indicates that no more children will be added.
  virtual void DoneAddingChildren() = 0;

 private:
  scoped_ptr<Formatter> active_child_;
  DISALLOW_COPY_AND_ASSIGN(Formatter);
};

class RuleFormatter : public Formatter {
 public:
  virtual ~RuleFormatter();

  // Higher-level overridable method that adds a rule header.
  // Reference implementations are implemented in terms of AddChild;
  // ignoring the rule score.
  virtual Formatter* AddHeader(const Rule& rule, int score) = 0;
};

}  // namespace pagespeed

#endif  // PAGESPEED_CORE_FORMATTER_H_
