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

#include "pagespeed/rules/specify_charset_early.h"

#include "base/logging.h"
#include "base/string_util.h"
#include "net/instaweb/htmlparse/public/html_parse.h"
#include "net/instaweb/htmlparse/public/empty_html_filter.h"
#include "net/instaweb/util/public/google_message_handler.h"
#include "pagespeed/core/formatter.h"
#include "pagespeed/core/pagespeed_input.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/core/resource_util.h"
#include "pagespeed/core/result_provider.h"
#include "pagespeed/proto/pagespeed_output.pb.h"

namespace {

const size_t kLateThresholdBytes = 1024;

bool HasCharsetInContentTypeHeader(const std::string& header) {
  pagespeed::resource_util::DirectiveMap directives;
  if (!pagespeed::resource_util::GetHeaderDirectives(header, &directives)) {
    return false;
  }

  if (directives.find("charset") == directives.end()) {
    return false;
  }

  return !directives["charset"].empty();
}

class CharsetInMetaTagFilter : public net_instaweb::EmptyHtmlFilter {
 public:
  CharsetInMetaTagFilter(net_instaweb::HtmlParse* html_parse);

  virtual void StartDocument();
  virtual void StartElement(net_instaweb::HtmlElement* element);
  virtual const char* Name() const { return "CharsetInMetaTag"; }

  // Was a charset specified in a meta tag? Call after the parse is
  // complete.
  bool charset_specified_in_meta_tag() const {
    return charset_specified_in_meta_tag_;
  }

 private:
  net_instaweb::Atom content_atom_;
  net_instaweb::Atom http_equiv_atom_;
  net_instaweb::Atom meta_atom_;
  bool charset_specified_in_meta_tag_;

  DISALLOW_COPY_AND_ASSIGN(CharsetInMetaTagFilter);
};

CharsetInMetaTagFilter::CharsetInMetaTagFilter(
    net_instaweb::HtmlParse* html_parse)
    : content_atom_(html_parse->Intern("content")),
      http_equiv_atom_(html_parse->Intern("http-equiv")),
      meta_atom_(html_parse->Intern("meta")),
      charset_specified_in_meta_tag_(false) {
}

void CharsetInMetaTagFilter::StartDocument() {
  // Reset the state.
  charset_specified_in_meta_tag_ = false;
}

void CharsetInMetaTagFilter::StartElement(net_instaweb::HtmlElement* element) {
  if (charset_specified_in_meta_tag_) {
    // We already found a valid charset, so don't bother visiting
    // subsequent tags.
    return;
  }

  net_instaweb::Atom tag = element->tag();
  if (tag != meta_atom_) {
    return;
  }

  const char* http_equiv = element->AttributeValue(http_equiv_atom_);
  if (http_equiv == NULL) {
    return;
  }

  if (!LowerCaseEqualsASCII(http_equiv, "content-type")) {
    return;
  }

  const char* content = element->AttributeValue(content_atom_);
  if (content == NULL) {
    return;
  }

  if (HasCharsetInContentTypeHeader(content)) {
    charset_specified_in_meta_tag_ = true;
  }
}

}  // namespace

namespace pagespeed {

namespace rules {

SpecifyCharsetEarly::SpecifyCharsetEarly()
    : pagespeed::Rule(pagespeed::InputCapabilities(
        pagespeed::InputCapabilities::RESPONSE_BODY)) {
}

const char* SpecifyCharsetEarly::name() const {
  return "SpecifyCharsetEarly";
}

const char* SpecifyCharsetEarly::header() const {
  return "Specify a character set early";
}

const char* SpecifyCharsetEarly::documentation_url() const {
  return "rendering.html#SpecifyCharsetEarly";
}

bool SpecifyCharsetEarly::AppendResults(const PagespeedInput& input,
                                        ResultProvider* provider) {
  net_instaweb::GoogleMessageHandler message_handler;
  message_handler.set_min_message_type(net_instaweb::kError);
  net_instaweb::HtmlParse html_parse(&message_handler);
  CharsetInMetaTagFilter filter(&html_parse);
  html_parse.AddFilter(&filter);

  for (int idx = 0, num = input.num_resources(); idx < num; ++idx) {
    const Resource& resource = input.GetResource(idx);
    const ResourceType resource_type = resource.GetResourceType();
    const std::string& content_type =
        resource.GetResponseHeader("Content-Type");

    if (resource_type != HTML) {
      const bool might_be_html = resource_type == OTHER && content_type.empty();
      if (!might_be_html) {
        // This rule only applies to HTML resources. However, if the
        // Content-Type header is not specified, it might be an HTML
        // resource that's missing a Content-Type, so include it in
        // the evaluation.
        continue;
      }
    }

    if (HasCharsetInContentTypeHeader(content_type)) {
      // There is a valid charset in the Content-Type header, so don't
      // flag this resource.
      continue;
    }

    const std::string& body = resource.GetResponseBody();
    if (body.size() < kLateThresholdBytes) {
      // The response body is small, so this rule doesn't apply.
      continue;
    }

    size_t max_bytes_to_scan = body.size();
    if (body.size() > kLateThresholdBytes) {
      max_bytes_to_scan = kLateThresholdBytes;
    }

    html_parse.StartParse(resource.GetRequestUrl().c_str());
    html_parse.ParseText(body.data(), max_bytes_to_scan);
    html_parse.FinishParse();

    if (filter.charset_specified_in_meta_tag()) {
      // There is a valid charset in a <meta> tag, so don't flag this
      // resource.
      continue;
    }

    // There was no charset found in the Content-Type header or in the
    // body, so we should flag a violation.

    Result* result = provider->NewResult();

    Savings* savings = result->mutable_savings();
    savings->set_page_reflows_saved(1);

    result->add_resource_urls(resource.GetRequestUrl());
  }

  return true;
}

void SpecifyCharsetEarly::FormatResults(const ResultVector& results,
                                        Formatter* formatter) {
  if (results.empty()) {
    return;
  }

  Formatter* body = formatter->AddChild(
      "The following resources have no character set specified "
      "or have a non-default character set specified late in the "
      "document. Specifying a character set early in these "
      "documents can speed up browser rendering.");

  for (ResultVector::const_iterator iter = results.begin(),
           end = results.end();
       iter != end;
       ++iter) {
    const Result& result = **iter;
    if (result.resource_urls_size() != 1) {
      LOG(DFATAL) << "Unexpected number of resource URLs.  Expected 1, Got "
                  << result.resource_urls_size() << ".";
      continue;
    }
    Argument url(Argument::URL, result.resource_urls(0));
    body->AddChild("$1", url);
  }
}

}  // namespace rules

}  // namespace pagespeed
