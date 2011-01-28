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

#include "pagespeed/formatters/json_formatter.h"

#include <string>
#include <vector>

#include "base/logging.h"
#include "base/string_number_conversions.h"
#include "base/string_util.h"
#include "pagespeed/formatters/formatter_util.h"

namespace {

std::string QuotedJsonString(const std::string& str) {
  std::string quoted("\"");
  for (std::string::const_iterator i = str.begin(); i != str.end(); ++i) {
    switch (*i) {
      case '"':
        quoted.append("\\\"");
        break;
      case '\\':
        quoted.append("\\\\");
        break;
      case '\f':
        quoted.append("\\f");
        break;
      case '\n':
        quoted.append("\\n");
        break;
      case '\r':
        quoted.append("\\r");
        break;
      case '\t':
        quoted.append("\\t");
        break;
      case '<':
      case '>':
        // Escape < and > to avoid security issues related to json
        // string contents being interpreted as html by a browser.
        if (*i == '<') {
          quoted.append("\\x3c");
        } else {
          quoted.append("\\x3e");
        }
        break;
      default:
        // Unicode escape ASCII control and Extended ASCII characters.
        if (*i < 0x20 || *i >= 0x7F) {
          // TODO this doesn't represent binary data properly.  Also,
          // it does weird things when the format argument is
          // negative.
          quoted.append(StringPrintf("\\u%04x", static_cast<int>(*i)));
        } else {
          quoted.push_back(*i);
        }
        break;
    }
  }
  quoted.push_back('"');
  return quoted;
}

std::string StringElement(const std::string& str) {
  std::string result;
  if (!str.empty()) {
    result.append("{\"type\":\"str\",\"value\":");
    result.append(QuotedJsonString(str));
    result.push_back('}');
  }
  return result;
}

std::string UrlElementWithAltText(const std::string& url,
                                  const std::string& alt_text) {
  std::string result;
  result.append("{\"type\":\"url\",\"value\":");
  result.append(QuotedJsonString(url));
  if (!alt_text.empty()) {
    result.append(",\"alt\":");
    result.append(QuotedJsonString(alt_text));
  }
  result.push_back('}');
  return result;
}

std::string UrlElement(const std::string& url) {
  return UrlElementWithAltText(url, "");
}

}  // namespace

namespace pagespeed {

namespace formatters {

JsonFormatter::JsonFormatter(std::ostream* output,
                             Serializer* content_serializer)
    : output_(output),
      content_serializer_(content_serializer),
      level_(0),
      has_children_(false) {
}

JsonFormatter::JsonFormatter(std::ostream* output,
                             Serializer* content_serializer,
                             int level)
    : output_(output),
      content_serializer_(content_serializer),
      level_(level),
      has_children_(false) {
}

void JsonFormatter::DoneAddingChildren() {
  if (has_children_) {
    *output_ << "]";
  }
  if (level_ > 0) {
    *output_ << "}";
  } else {
    *output_ << "\n";
  }
}

Formatter* JsonFormatter::AddHeader(const Rule& rule, int score) {
  Argument arg(Argument::STRING, rule.header());
  Formatter* child_formatter = AddChild("$1", arg);
  *output_ << ",\"name\":" << QuotedJsonString(rule.name())
           << ",\"score\":" << score
           << ",\"url\":" << QuotedJsonString(rule.documentation_url());
  return child_formatter;
}

Formatter* JsonFormatter::NewChild(const FormatterParameters& params) {
  if (has_children_) {
    *output_ << ",";
  } else if (level_ > 0) {
    *output_ << ",\"children\":[";
  } else {
    *output_ << "[";
  }
  has_children_ = true;

  *output_ << "\n{\"format\":[";

  const std::string& format_str = params.format_str();

  bool needs_comma = false;
  std::string str;
  for (std::string::const_iterator i = format_str.begin();
       i != format_str.end(); ++i) {
    if ('$' == *i) {
      if (i + 1 != format_str.end()) {
        ++i;
        DCHECK('$' == *i || ('1' <= *i && *i <= '9' &&
                             static_cast<size_t>(*i) <=
                             '0' + params.arguments().size()))
            << "Invalid placeholder: " << *i;
        if ('$' == *i) {
          str.push_back('$');
        } else {
          const int index = *i - '1';
          const Argument& arg = *params.arguments()[index];
          switch (arg.type()) {
            case Argument::URL:
              if (needs_comma) {
                *output_ << ",";
              }
              if (!str.empty()) {
                *output_ << StringElement(str);
                *output_ << ",";
                str.clear();
              }
              *output_ << UrlElement(arg.string_value());
              needs_comma = true;
              break;
            case Argument::STRING:
              str.append(arg.string_value());
              break;
            case Argument::INTEGER:
              str.append(base::Int64ToString(arg.int_value()));
              break;
            case Argument::BYTES:
              str.append(FormatBytes(arg.int_value()));
              break;
            case Argument::DURATION:
              str.append(FormatTimeDuration(arg.int_value()));
              break;
            default:
              LOG(DFATAL) << "Unknown argument type "
                          << arg.type();
              str.append("?");
              break;
          }
        }
      }
    } else {
      str.push_back(*i);
    }
  }
  if (!str.empty()) {
    if (needs_comma) {
      *output_ << ",";
    }
    *output_ << StringElement(str);
    needs_comma = true;
  }

  if (params.has_optimized_content() && content_serializer_ != NULL) {
    std::string orig_url;
    const std::vector<const Argument*>& args = params.arguments();
    for (std::vector<const Argument*>::const_iterator iter = args.begin(),
             end = args.end();
         iter != end;
         ++iter) {
      const Argument* arg = *iter;
      if (arg->type() == Argument::URL) {
        orig_url = arg->string_value();
        break;
      }
    }

    std::string optimized_uri = content_serializer_->SerializeToFile(
        orig_url, params.optimized_content_mime_type(),
        params.optimized_content());
    if (!optimized_uri.empty()) {
      if (needs_comma) {
        *output_ << ",";
      }
      *output_ << StringElement("  See ") << ","
               << UrlElementWithAltText(optimized_uri, "optimized version")
               << "," << StringElement(".");
      needs_comma = true;
    }
  }

  *output_ << "]";

  return new JsonFormatter(output_, content_serializer_, level_ + 1);
}

}  // namespace formatters

}  // namespace pagespeed
