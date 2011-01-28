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

#include "pagespeed/html/html_minifier.h"

#include <stdio.h>  // for stderr

#include "net/instaweb/util/public/google_message_handler.h"
#include "net/instaweb/util/public/string_writer.h"

namespace pagespeed {

namespace html {

HtmlMinifier::HtmlMinifier()
    : message_handler_(new net_instaweb::GoogleMessageHandler()),
      html_parse_(message_handler_.get()),
      remove_comments_filter_(&html_parse_),
      elide_attributes_filter_(&html_parse_),
      quote_removal_filter_(&html_parse_),
      collapse_whitespace_filter_(&html_parse_),
      minify_js_css_filter_(&html_parse_),
      html_writer_filter_(&html_parse_) {
  // The instaweb parser emits warnings when it encounters malformed
  // content. We do not want to see these warnings; we only want to
  // see errors that occur due to unexpected conditions encountered in
  // the parser.
  message_handler_->set_min_message_type(net_instaweb::kError);
  html_parse_.AddFilter(&remove_comments_filter_);
  html_parse_.AddFilter(&elide_attributes_filter_);
  html_parse_.AddFilter(&quote_removal_filter_);
  html_parse_.AddFilter(&collapse_whitespace_filter_);
  html_parse_.AddFilter(&minify_js_css_filter_);
  html_parse_.AddFilter(&html_writer_filter_);
}

HtmlMinifier::~HtmlMinifier() {}

bool HtmlMinifier::MinifyHtml(const std::string& input_name,
                              const std::string& input,
                              std::string* output) {
  net_instaweb::StringWriter string_writer(output);
  html_writer_filter_.set_writer(&string_writer);

  html_parse_.StartParse(input_name.c_str());
  html_parse_.ParseText(input.data(), input.size());
  html_parse_.FinishParse();

  html_writer_filter_.set_writer(NULL);

  return true;
}

}  // namespace html

}  // namespace pagespeed
