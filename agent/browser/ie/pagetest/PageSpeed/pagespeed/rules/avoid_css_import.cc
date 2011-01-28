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

#include "pagespeed/rules/avoid_css_import.h"

#include "base/logging.h"
#include "base/string_tokenizer.h"
#include "base/string_util.h"
#include "pagespeed/core/formatter.h"
#include "pagespeed/core/pagespeed_input.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/core/resource_util.h"
#include "pagespeed/core/result_provider.h"
#include "pagespeed/core/uri_util.h"
#include "pagespeed/proto/pagespeed_output.pb.h"

namespace {

const char* kCommentStart = "/*";
const char* kCommentEnd = "*/";
const char* kCssImportDirective = "@import";
const char* kCssUrlDirective = "url(";
const size_t kCommentStartLen = strlen(kCommentStart);
const size_t kCommentEndLen = strlen(kCommentEnd);
const size_t kCssImportDirectiveLen = strlen(kCssImportDirective);
const size_t kCssUrlDirectiveLen = strlen(kCssUrlDirective);

}  // namespace

namespace pagespeed {

namespace rules {

AvoidCssImport::AvoidCssImport()
    : pagespeed::Rule(pagespeed::InputCapabilities(
        pagespeed::InputCapabilities::RESPONSE_BODY)) {
}

const char* AvoidCssImport::name() const {
  return "AvoidCssImport";
}

const char* AvoidCssImport::header() const {
  return "Avoid CSS @import";
}

const char* AvoidCssImport::documentation_url() const {
  return "rtt.html#AvoidCssImport";
}

bool AvoidCssImport::AppendResults(const PagespeedInput& input,
                                   ResultProvider* provider) {
  for (int i = 0, num = input.num_resources(); i < num; ++i) {
    const Resource& resource = input.GetResource(i);
    if (resource.GetResourceType() != CSS) {
      continue;
    }

    std::set<std::string> imported_urls;
    if (!FindImportedResourceUrls(resource, &imported_urls)) {
      continue;
    }

    Result* result = provider->NewResult();
    result->add_resource_urls(resource.GetRequestUrl());

    Savings* savings = result->mutable_savings();

    // All @imported URLs in the same CSS document are fetched in
    // parallel, so they add one critical path length to the document
    // load.
    savings->set_critical_path_length_saved(1);

    ResultDetails* details = result->mutable_details();
    AvoidCssImportDetails* import_details =
        details->MutableExtension(
            AvoidCssImportDetails::message_set_extension);

    for (std::set<std::string>::const_iterator
             it = imported_urls.begin(), end = imported_urls.end();
         it != end;
         ++it) {
      import_details->add_imported_stylesheets(*it);
    }
  }
  return true;
}

bool AvoidCssImport::FindImportedResourceUrls(
    const Resource& resource, std::set<std::string>* imported_urls) {
  DCHECK(imported_urls->empty());

  const std::string& css_body = resource.GetResponseBody();
  std::string body;

  // Make our search easier by removing comments. We could be more
  // efficient by attempting to skip over comments as we walk the
  // string, but this would complicate the logic. It's simpler to
  // remove comments first, then iterate over the string one line at a
  // time.
  RemoveComments(css_body, &body);
  StringTokenizer tok(body, "\n");
  while (tok.GetNext()) {
    std::string line = tok.token();
    TrimWhitespaceASCII(line, TRIM_ALL, &line);
    std::string import_url;
    if (!IsCssImportLine(line, &import_url)) {
      continue;
    }

    // Resolve the URI relative to its parent stylesheet.
    std::string resolved_url =
        pagespeed::uri_util::ResolveUri(import_url, resource.GetRequestUrl());
    if (resolved_url.empty()) {
      LOG(INFO) << "Unable to ResolveUri " << import_url;
      continue;
    }
    imported_urls->insert(resolved_url);
  }
  return !imported_urls->empty();
}

void AvoidCssImport::FormatResults(const ResultVector& results,
                                   Formatter* formatter) {
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
            AvoidCssImportDetails::message_set_extension)) {
      const AvoidCssImportDetails& import_details = details.GetExtension(
          AvoidCssImportDetails::message_set_extension);
      if (import_details.imported_stylesheets_size() > 0) {
        Argument css_url(Argument::URL, result.resource_urls(0));
        Formatter* body = formatter->AddChild(
            "The following external stylesheets were included in $1 "
            "using @import.", css_url);
        for (int i = 0,
                 size = import_details.imported_stylesheets_size();
             i < size; ++i) {
          Argument imported_url(
              Argument::URL, import_details.imported_stylesheets(i));
          body->AddChild("$1", imported_url);
        }
      }
    }
  }
}

// The CSS 2.1 Specification section on comments
// (http://www.w3.org/TR/CSS21/syndata.html#comments) notes:
//
//  Comments begin with the characters "/*" and end with the
//  characters "*/". ... CSS also allows the SGML comment delimiters
//  ("<!--" and "-->") in certain places defined by the grammar, but
//  they do not delimit CSS comments.
//
// Thus we remove /* */ comments, but we do not scan for or remove
// SGML comments, since these are supported only for very old user
// agents. If many web pages do use such comments, we may need to add
// support for them.
void AvoidCssImport::RemoveComments(const std::string& in, std::string* out) {
  size_t comment_start = 0;
  while (true) {
    const size_t previous_start = comment_start;
    comment_start = in.find(kCommentStart, comment_start);
    if (comment_start == in.npos) {
      // No more comments. Append to end of string and we're done.
      out->append(in, previous_start, in.length() - previous_start);
      break;
    }

    // Append the content before the start of the comment.
    out->append(in, previous_start, comment_start - previous_start);

    const size_t comment_end =
        in.find(kCommentEnd, comment_start + kCommentStartLen);
    if (comment_end == in.npos) {
      // Unterminated comment. We're done.
      break;
    }
    comment_start = comment_end + kCommentEndLen;
  }
}

bool AvoidCssImport::IsCssImportLine(
    const std::string& line, std::string* out_url) {
  // According to http://www.w3.org/TR/CSS21/syndata.html#characters:
  // "All CSS syntax is case-insensitive within the ASCII range" so we
  // must normalize the @import token since it can appear lowercase,
  // uppercase, or mixed case.
  if (!StartsWithASCII(line, kCssImportDirective, false)) {
    return false;
  }

  // The CSS 2.1 grammar for @import
  // (http://www.w3.org/TR/CSS21/grammar.html) is:
  //  import
  //    : IMPORT_SYM S*
  //      [STRING|URI] S* media_list? ';' S*
  // So we remove whitespace following @import, then look for either a
  // STRING or URI. See the grammar for specific definitions of STRING
  // and URI.
  std::string url = line;

  // remove "@import"
  url.erase(0, kCssImportDirectiveLen);
  TrimWhitespaceASCII(url, TRIM_LEADING, &url);
  if (url.empty()) {
    return false;
  }

  // look for "url()" syntax first
  if (StartsWithASCII(url, kCssUrlDirective, false)) {
    // remove "url("
    url.erase(0, kCssUrlDirectiveLen);
    size_t url_end = url.find(')');
    if (url_end != url.npos) {
      url.erase(url_end, url.size() - url_end);
      TrimWhitespaceASCII(url, TRIM_ALL, &url);
      // remove quotes, if the URL is quoted.
      if ((url[0] == '"' || url[0] == '\'')) {
        if (url.length() > 1 && url[url.length() - 1] == url[0]) {
          url.erase(0, 1);
          url.erase(url.length() - 1);
          if (!url.empty()) {
            *out_url = url;
            return true;
          }
        }
        return false;
      }
      if (!url.empty()) {
        *out_url = url;
        return true;
      }
    }
    return false;
  }

  // next look for string syntax
  if (url[0] == '"' || url[0] == '\'') {
    size_t url_end = url.find(url[0], 1);
    if (url_end != url.npos) {
      url.erase(0, 1);
      url_end--;
      url.erase(url_end, url.size() - url_end);
      if (!url.empty()) {
        *out_url = url;
        return true;
      }
    }
  }
  return false;
}

}  // namespace rules

}  // namespace pagespeed
