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

#include "pagespeed/html/minify_js_css_filter.h"

#include <functional>

#include "base/logging.h"
#include "base/string_util.h"
#include "net/instaweb/htmlparse/public/html_parse.h"
#include "pagespeed/cssmin/cssmin.h"
#include "third_party/jsmin/cpp/jsmin.h"

namespace {

const char* kSgmlCommentStart = "<!--";
const char* kSgmlCommentEnd = "-->";
const size_t kSgmlCommentStartLen = strlen(kSgmlCommentStart);
const size_t kSgmlCommentEndLen = strlen(kSgmlCommentEnd);

// Attempts to remove SGML comments (i.e. <!-- -->) wrapping the input
// string.
//
// Historically, SGML comments have been used in script blocks to
// prevent user agents that don't know about script blocks from
// attempting to parse the contents of the script block. See
// http://www.w3.org/TR/REC-html40/interact/scripts.html#h-18.3.2 for
// more. However, script blocks have been a standard part of HTML for
// a long time, so all user agents in use today should not require
// SGML comments in script blocks. Thus, we remove them if they are
// present.
//
// This function only removes SGML comments if those SGML comments
// enclose the entire input. For isntance, if input is "<!-- foo -->",
// this function will remove the SGML comments, whereas if input is
// "hello <!-- foo --> world" this function will not remove the
// comments, since they do not wrap the entire input. Returns true if
// comments were found and removed, false otherwise. The out parameter
// is only valid if this function returns true.
bool RemoveWrappingSgmlComments(const std::string& in, std::string* out) {
  size_t sgml_comment_start = in.find(kSgmlCommentStart);
  if (sgml_comment_start == in.npos) {
    return false;
  }
  size_t sgml_comment_end = in.rfind(kSgmlCommentEnd);
  if (sgml_comment_end == in.npos) {
    return false;
  }

  // We've found both an opening and closing SGML comment marker. As
  // long as the opening SGML comment is only preceded by whitespace,
  // and the closing SGML comment is only followed by whitespace, we
  // can remove them.

  // stl::find_if operates on iterators, so convert our size_t offsets
  // to iterators.
  std::string::const_iterator sgml_comment_start_it =
      in.begin() + sgml_comment_start;
  std::string::const_iterator sgml_comment_end_it =
      in.begin() + sgml_comment_end;

  // See if there is any non-whitespace before the opening comment, or
  // after the closing comment. std::find_if returns the first
  // occurrence thta matches the predicate, or the end iterator if
  // there was no match.
  if (std::find_if(in.begin(), sgml_comment_start_it,
                   std::not1(std::ptr_fun(IsAsciiWhitespace<char>))) !=
      sgml_comment_start_it ||
      std::find_if(sgml_comment_end_it + kSgmlCommentEndLen,
                   in.end(),
                   std::not1(std::ptr_fun(IsAsciiWhitespace<char>))) !=
      in.end()) {
    return false;
  }

  size_t first_newline_after_comment_start =
      in.find('\n', sgml_comment_start + kSgmlCommentStartLen);

  out->assign(in.begin() + kSgmlCommentStartLen,
				sgml_comment_end_it);

  return true;
}

}  // namespace

namespace pagespeed {

namespace html {

MinifyJsCssFilter::MinifyJsCssFilter(net_instaweb::HtmlParse* html_parse)
    : html_parse_(html_parse) {
  script_atom_ = html_parse_->Intern("script");
  style_atom_ = html_parse_->Intern("style");
}

void MinifyJsCssFilter::Characters(
    net_instaweb::HtmlCharactersNode* characters) {
  net_instaweb::HtmlElement* parent = characters->parent();
  if (parent != NULL) {
    net_instaweb::Atom tag = parent->tag();
    bool did_minify = false;
    std::string minified;
    if (tag == script_atom_) {
      std::string contents;
      if (RemoveWrappingSgmlComments(characters->contents(), &contents)) {
        did_minify = jsmin::MinifyJs(contents, &minified);
      } else {
        did_minify = jsmin::MinifyJs(characters->contents(), &minified);
      }
      if (!did_minify) {
        LOG(INFO) << "Inline JS minification failed.";
      }
    } else if (tag == style_atom_) {
      // We do not currently strip SGML comments from CSS since CSS
      // parsing behavior within CSS comments is inconsistent between
      // browsers.
      did_minify = cssmin::MinifyCss(characters->contents(), &minified);
      if (!did_minify) {
        LOG(INFO) << "Inline CSS minification failed.";
      }
    }
    if (did_minify) {
      html_parse_->ReplaceNode(
          characters,
          html_parse_->NewCharactersNode(characters->parent(), minified));
    }
  }
}

}  // namespace html

}  // namespace pagespeed
