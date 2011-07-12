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

#include "pagespeed/rules/optimize_the_order_of_styles_and_scripts.h"

#include <string>
#include <vector>

#include "base/basictypes.h"
#include "base/logging.h"
#include "base/string_piece.h"
#include "net/instaweb/htmlparse/public/html_parse.h"
#include "net/instaweb/htmlparse/public/empty_html_filter.h"
#include "net/instaweb/util/public/google_message_handler.h"
#include "pagespeed/core/dom.h"
#include "pagespeed/core/formatter.h"
#include "pagespeed/core/pagespeed_input.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/core/result_provider.h"
#include "pagespeed/proto/pagespeed_output.pb.h"

namespace pagespeed {

namespace {

class StyleScriptVisitor {
 public:
  StyleScriptVisitor();
  ~StyleScriptVisitor();

  void VisitExternalScript(const std::string& src);
  void VisitInlineScript();
  void VisitExternalStyle(const std::string& href);

  bool HasComplaints();
  void PopulateResult(Result* result);

 private:
  bool seen_external_script_at_least_once_;
  bool seen_external_css_at_least_once_;
  bool external_css_more_recent_than_external_script_;
  bool just_saw_inline_script_after_external_css_;
  int last_inline_script_index_;
  int actual_critical_path_length_;
  int potential_critical_path_length_;

  std::vector<std::string> out_of_order_external_css_;
  std::vector<int> out_of_order_inline_scripts_;

  DISALLOW_COPY_AND_ASSIGN(StyleScriptVisitor);
};

StyleScriptVisitor::StyleScriptVisitor()
    : seen_external_script_at_least_once_(false),
      seen_external_css_at_least_once_(false),
      external_css_more_recent_than_external_script_(false),
      just_saw_inline_script_after_external_css_(false),
      last_inline_script_index_(0),
      actual_critical_path_length_(0),
      potential_critical_path_length_(0) {}

StyleScriptVisitor::~StyleScriptVisitor() {}

void StyleScriptVisitor::VisitExternalScript(const std::string& src) {
  // If the previous resource is CSS (rather than a script) and there's no
  // inline script in between, then we can download in parallel; otherwise,
  // increase the critical path length.
  if (!external_css_more_recent_than_external_script_ ||
      just_saw_inline_script_after_external_css_) {
    ++actual_critical_path_length_;
  }

  // In the ideal ordering, every external script after the first increases the
  // critical path length.
  if (seen_external_script_at_least_once_) {
    ++potential_critical_path_length_;
  }

  // If an inline script comes after an external CSS and before another
  // external resource (like this one), then that inline script should be
  // moved.
  if (just_saw_inline_script_after_external_css_) {
    out_of_order_inline_scripts_.push_back(last_inline_script_index_);
  }

  // Update the state.
  seen_external_script_at_least_once_ = true;
  external_css_more_recent_than_external_script_ = false;
  just_saw_inline_script_after_external_css_ = false;
}

void StyleScriptVisitor::VisitInlineScript() {
  ++last_inline_script_index_;
  if (external_css_more_recent_than_external_script_) {
    just_saw_inline_script_after_external_css_ = true;
  }
}

void StyleScriptVisitor::VisitExternalStyle(const std::string& href) {
  // If the previous resource is CSS (rather than a script) and there's no
  // inline script in between, then we can download in parallel; otherwise,
  // increase the critical path length.
  if (!external_css_more_recent_than_external_script_ ||
      just_saw_inline_script_after_external_css_) {
    ++actual_critical_path_length_;
  }

  // In the ideal ordering, only the first external CSS increases the critical
  // path length, and all other external CSS downloads in parallel with it.
  if (!seen_external_css_at_least_once_) {
    ++potential_critical_path_length_;
  }

  // If an inline script comes after an external CSS and before another
  // external resource (like this one), then that inline script should be
  // moved.
  if (just_saw_inline_script_after_external_css_) {
    out_of_order_inline_scripts_.push_back(last_inline_script_index_);
  }

  // If there were any external scripts before this external CSS, then this
  // external CSS should be moved.
  if (seen_external_script_at_least_once_) {
    out_of_order_external_css_.push_back(href);
  }

  // Update the state.
  seen_external_css_at_least_once_ = true;
  external_css_more_recent_than_external_script_ = true;
  just_saw_inline_script_after_external_css_ = false;
}

bool StyleScriptVisitor::HasComplaints() {
  return (!out_of_order_external_css_.empty() ||
          !out_of_order_inline_scripts_.empty());
}

void StyleScriptVisitor::PopulateResult(Result* result) {
  const int critical_path_length_saved = (actual_critical_path_length_ -
                                          potential_critical_path_length_);
  DCHECK(critical_path_length_saved >= 0);
  result->set_original_critical_path_length(actual_critical_path_length_);

  Savings* savings = result->mutable_savings();
  savings->set_critical_path_length_saved(critical_path_length_saved);

  ResultDetails* details = result->mutable_details();
  ResourceOrderingDetails* ordering_details =
      details->MutableExtension(
          ResourceOrderingDetails::message_set_extension);

  for (std::vector<std::string>::const_iterator
           iter = out_of_order_external_css_.begin(),
           end = out_of_order_external_css_.end();
       iter != end; ++iter) {
    ordering_details->add_out_of_order_external_css(*iter);
  }

  for (std::vector<int>::const_iterator
           iter = out_of_order_inline_scripts_.begin(),
           end = out_of_order_inline_scripts_.end();
       iter != end; ++iter) {
    ordering_details->add_out_of_order_inline_scripts(*iter);
  }
}

class VisitStyleScriptFilter : public net_instaweb::EmptyHtmlFilter {
 public:
  VisitStyleScriptFilter(net_instaweb::HtmlParse* html_parse,
                         const pagespeed::DomDocument* document);

  virtual void StartDocument();
  virtual void StartElement(net_instaweb::HtmlElement* element);
  virtual const char* Name() const { return "VisitStyleScript"; }

  void set_visitor(StyleScriptVisitor* visitor) { visitor_ = visitor; }

 private:
  StyleScriptVisitor* visitor_;
  const pagespeed::DomDocument* document_;
  bool reached_body_;
  net_instaweb::Atom body_atom_;
  net_instaweb::Atom href_atom_;
  net_instaweb::Atom link_atom_;
  net_instaweb::Atom rel_atom_;
  net_instaweb::Atom script_atom_;
  net_instaweb::Atom src_atom_;

  DISALLOW_COPY_AND_ASSIGN(VisitStyleScriptFilter);
};

VisitStyleScriptFilter::
VisitStyleScriptFilter(net_instaweb::HtmlParse* html_parse,
                       const pagespeed::DomDocument* document)
    : visitor_(NULL),
      document_(document),
      reached_body_(false) {
  body_atom_ = html_parse->Intern("body");
  href_atom_ = html_parse->Intern("href");
  link_atom_ = html_parse->Intern("link");
  rel_atom_ = html_parse->Intern("rel");
  script_atom_ = html_parse->Intern("script");
  src_atom_ = html_parse->Intern("src");
}

void VisitStyleScriptFilter::StartDocument() {
  reached_body_ = false;
}

void VisitStyleScriptFilter::StartElement(net_instaweb::HtmlElement* element) {
  if (reached_body_) {
    return;
  }

  CHECK(visitor_ != NULL);

  net_instaweb::Atom tag = element->tag();
  if (tag == body_atom_) {
    reached_body_ = true;
  } else if (tag == script_atom_) {
    const char* src = element->AttributeValue(src_atom_);
    if (src != NULL) {
      // External script.
      std::string url(src);
      // Resolve the URL if we have a document instance.
      if (document_ != NULL) {
        url = document_->ResolveUri(url);
      }
      visitor_->VisitExternalScript(url);
    } else {
      // Inline script.
      visitor_->VisitInlineScript();
    }
  } else if (tag == link_atom_) {
    const char* href = element->AttributeValue(href_atom_);
    const char* rel = element->AttributeValue(rel_atom_);
    if (href != NULL && rel != NULL && !strcmp(rel, "stylesheet")) {
      // External CSS.
      std::string url(href);
      // Resolve the URL if we have a document instance.
      if (document_ != NULL) {
        url = document_->ResolveUri(url);
      }
      visitor_->VisitExternalStyle(url);
    }
  }
}

}  // namespace

namespace rules {

OptimizeTheOrderOfStylesAndScripts::OptimizeTheOrderOfStylesAndScripts()
    : pagespeed::Rule(pagespeed::InputCapabilities(
        pagespeed::InputCapabilities::DOM |
        pagespeed::InputCapabilities::RESPONSE_BODY)) {}

const char* OptimizeTheOrderOfStylesAndScripts::name() const {
  return "OptimizeTheOrderOfStylesAndScripts";
}

const char* OptimizeTheOrderOfStylesAndScripts::header() const {
  return "Optimize the order of styles and scripts";
}

const char* OptimizeTheOrderOfStylesAndScripts::documentation_url() const {
  return "rtt.html#PutStylesBeforeScripts";
}

bool OptimizeTheOrderOfStylesAndScripts::AppendResults(
    const PagespeedInput& input,
    ResultProvider* provider) {

  const pagespeed::DomDocument* document = input.dom_document();

  net_instaweb::GoogleMessageHandler message_handler;
  message_handler.set_min_message_type(net_instaweb::kError);
  net_instaweb::HtmlParse html_parse(&message_handler);
  VisitStyleScriptFilter filter(&html_parse, document);
  html_parse.AddFilter(&filter);

  for (int idx = 0, num = input.num_resources(); idx < num; ++idx) {
    const Resource& resource = input.GetResource(idx);
    if (resource.GetResourceType() != HTML) {
      continue;
    }

    StyleScriptVisitor visitor;
    filter.set_visitor(&visitor);

    const std::string& response_body = resource.GetResponseBody();
    html_parse.StartParse(resource.GetRequestUrl().c_str());
    html_parse.ParseText(response_body.data(), response_body.size());
    html_parse.FinishParse();

    if (visitor.HasComplaints()) {
      Result* result = provider->NewResult();
      result->add_resource_urls(resource.GetRequestUrl());
      visitor.PopulateResult(result);
    }
  }

  return true;
}

void OptimizeTheOrderOfStylesAndScripts::FormatResults(
    const ResultVector& results,
    Formatter* formatter) {

  if (results.empty()) {
    return;
  }

  for (ResultVector::const_iterator iter = results.begin(),
           end = results.end(); iter != end; ++iter) {
    const Result& result = **iter;
    if (result.resource_urls_size() != 1) {
      LOG(DFATAL) << "Unexpected number of resource URLs.  Expected 1, Got "
                  << result.resource_urls_size() << ".";
      continue;
    }

    const ResultDetails& details = result.details();
    if (details.HasExtension(
            ResourceOrderingDetails::message_set_extension)) {
      const ResourceOrderingDetails& ordering_details = details.GetExtension(
          ResourceOrderingDetails::message_set_extension);

      if (ordering_details.out_of_order_inline_scripts_size() > 0) {
        Argument html_url(Argument::URL, result.resource_urls(0));
        Formatter* body = formatter->AddChild(
            "The following inline script blocks were found in $1 between an "
            "external CSS file and another resource.  To allow parallel "
            "downloading, move the inline script before the external CSS "
            "file, or after the next resource.", html_url);
        for (int i = 0,
                 size = ordering_details.out_of_order_inline_scripts_size();
             i < size; ++i) {
          Argument index(Argument::INTEGER,
                         ordering_details.out_of_order_inline_scripts(i));
          body->AddChild("Inline script block #$1", index);
        }
      }

      if (ordering_details.out_of_order_external_css_size() > 0) {
        Argument html_url(Argument::URL, result.resource_urls(0));
        Formatter* body = formatter->AddChild(
            "The following external CSS files were included after an external "
            "JavaScript file in $1.  To ensure CSS files are downloaded in "
            "parallel, always include external CSS before external "
            "JavaScript.", html_url);
        for (int i = 0,
                 size = ordering_details.out_of_order_external_css_size();
             i < size; ++i) {
          Argument url(Argument::URL,
                       ordering_details.out_of_order_external_css(i));
          body->AddChild("$1", url);
        }
      }
    }
  }
}

}  // namespace rules

}  // namespace pagespeed
