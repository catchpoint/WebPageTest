/**
 * Copyright 2009 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#include "pagespeed/cssmin/cssmin.h"

#include "base/basictypes.h"
#include "base/logging.h"
#include "base/string_util.h"

namespace {

// Lovingly copied from the js minifier rule implementation.
// TODO Extract these classes to a separate file to avoid the love from
//      spreading further.
class StringConsumer {
 public:
  explicit StringConsumer(std::string* output) : output_(output) {}

  void push_back(char c) {
    output_->push_back(c);
  }

  void append(const char* start, size_t length) {
    output_->append(start, length);
  }

 private:
  std::string* output_;

  DISALLOW_COPY_AND_ASSIGN(StringConsumer);
};

class SizeConsumer {
 public:
  SizeConsumer() : size_(0) {}

  int size() const { return size_; }

  void push_back(char c) {
    ++size_;
  }

  void append(const char* start, size_t length) {
    size_ += length;
  }

 private:
  int size_;

  DISALLOW_COPY_AND_ASSIGN(SizeConsumer);
};

// Return true for any character that never needs to be separated from other
// characters via whitespace.
bool Unextendable(char c) {
  switch (c) {
    case '[':
    case ']':
    case '{':
    case '}':
    case '/':
    case ';':
    case ':':
      return true;
    default:
      return false;
  }
}

// Return true for any character that must separated from other "extendable"
// characters by whitespace on the _right_ in order keep tokens separate.
bool IsExtendableOnRight(char c) {
  // N.B. Left paren only here -- see
  //      http://code.google.com/p/page-speed/issues/detail?id=339
  return !(Unextendable(c) || c == '(');
}

// Return true for any character that must separated from other "extendable"
// characters by whitespace on the _left_ in order keep tokens separate.
bool IsExtendableOnLeft(char c) {
  return !(Unextendable(c) || c == ')');  // N.B. Right paren only here.
}

// Given a CSS string, minify it into the given consumer.
template <typename Consumer>
bool MinifyCSS(const std::string& input, Consumer* consumer) {
  const char* begin = input.data();
  const char* end = begin + input.size();
  // We have these tokens:
  // comment, whitespace, single/double-quoted string, and other.
  const char* p = begin;
  while (p < end) {
    if (p + 1 < end && *p == '/' && *(p + 1) == '*') {
      // Comment: Scan to end of comment, putting nothing into the consumer.
      p += 2;
      for (; p < end; ++p) {
        if (p + 1 < end && *p == '*' && *(p + 1) == '/') {
          p += 2;
          break;
        }
      }
    } else if (IsAsciiWhitespace(*p)) {
      // Whitespace: Scan to end of whitespace; put a single space into the
      // consumer if necessary to separate tokens, otherwise put nothing.
      const char* space_start = p;
      do {
        ++p;
      } while (p < end && IsAsciiWhitespace(*p));
      if (space_start > begin && p < end &&
          IsExtendableOnRight(*(space_start - 1)) &&
          IsExtendableOnLeft(*p)) {
        consumer->push_back(' ');
      }
    } else if (*p == '\'' || *p == '"') {
      // Single/Double-Quoted String: Scan to end of string (first unescaped
      // quote of the same kind used to open the string), and put the whole
      // string into the consumer.
      const char quote = *p;
      const char* string_start = p;
      ++p;
      while (p < end) {
        if (*p == quote) {
          ++p;
          break;
        } else if (*p == '\\' && p + 1 < end) {
          p += 2;
        } else {
          ++p;
        }
      }
      consumer->append(string_start, p - string_start);
    } else {
      // Other: Just copy the character over.
      consumer->push_back(*p);
      if (*p == '}') {
        // Add a newline after each closing brace to prevent output lines from
        // being too long.
        consumer->push_back('\n');
      }
      ++p;
    }
  }
  return true;
}

}  // namespace

namespace pagespeed {

namespace cssmin {

bool MinifyCss(const std::string& input, std::string* out) {
  StringConsumer consumer(out);
  return MinifyCSS(input, &consumer);
}

bool GetMinifiedCssSize(const std::string& input, int* minified_size) {
  SizeConsumer consumer;
  if (MinifyCSS(input, &consumer)) {
    *minified_size = consumer.size();
    return true;
  } else {
    return false;
  }
}

}  // namespace cssmin

}  // namespace pagespeed
