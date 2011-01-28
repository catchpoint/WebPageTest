// Copyright 2007, Google Inc.
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
//     * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

// Functions for canonicalizing "path" URLs. Not to be confused with the path
// of a URL, these are URLs that have no authority section, only a path. For
// example, "javascript:" and "data:".

#include "googleurl/src/url_canon.h"
#include "googleurl/src/url_canon_internal.h"

namespace url_canon {

namespace {

template<typename CHAR, typename UCHAR>
bool DoCanonicalizePathURL(const URLComponentSource<CHAR>& source,
                           const url_parse::Parsed& parsed,
                           CanonOutput* output,
                           url_parse::Parsed* new_parsed) {
  // Scheme: this will append the colon.
  bool success = CanonicalizeScheme(source.scheme, parsed.scheme,
                                    output, &new_parsed->scheme);

  // We assume there's no authority for path URLs. Note that hosts should never
  // have -1 length.
  new_parsed->username.reset();
  new_parsed->password.reset();
  new_parsed->host.reset();
  new_parsed->port.reset();

  if (parsed.path.is_valid()) {
    // Copy the path using path URL's more lax escaping rules (think for
    // javascript:). We convert to UTF-8 and escape non-ASCII, but leave all
    // ASCII characters alone. This helps readability of JavaStript.
    new_parsed->path.begin = output->length();
    int end = parsed.path.end();
    for (int i = parsed.path.begin; i < end; i++) {
      UCHAR uch = static_cast<UCHAR>(source.path[i]);
      if (uch < 0x20 || uch >= 0x80)
        success &= AppendUTF8EscapedChar(source.path, &i, end, output);
      else
        output->push_back(static_cast<char>(uch));
    }
    new_parsed->path.len = output->length() - new_parsed->path.begin;
  } else {
    // Empty path.
    new_parsed->path.reset();
  }

  // Assume there's no query or ref.
  new_parsed->query.reset();
  new_parsed->ref.reset();

  return success;
}

}  // namespace

bool CanonicalizePathURL(const char* spec,
                         int spec_len,
                         const url_parse::Parsed& parsed,
                         CanonOutput* output,
                         url_parse::Parsed* new_parsed) {
  return DoCanonicalizePathURL<char, unsigned char>(
      URLComponentSource<char>(spec), parsed, output, new_parsed);
}

bool CanonicalizePathURL(const char16* spec,
                         int spec_len,
                         const url_parse::Parsed& parsed,
                         CanonOutput* output,
                         url_parse::Parsed* new_parsed) {
  return DoCanonicalizePathURL<char16, char16>(
      URLComponentSource<char16>(spec), parsed, output, new_parsed);
}

bool ReplacePathURL(const char* base,
                    const url_parse::Parsed& base_parsed,
                    const Replacements<char>& replacements,
                    CanonOutput* output,
                    url_parse::Parsed* new_parsed) {
  URLComponentSource<char> source(base);
  url_parse::Parsed parsed(base_parsed);
  SetupOverrideComponents(base, replacements, &source, &parsed);
  return DoCanonicalizePathURL<char, unsigned char>(
      source, parsed, output, new_parsed);
}

bool ReplacePathURL(const char* base,
                    const url_parse::Parsed& base_parsed,
                    const Replacements<char16>& replacements,
                    CanonOutput* output,
                    url_parse::Parsed* new_parsed) {
  RawCanonOutput<1024> utf8;
  URLComponentSource<char> source(base);
  url_parse::Parsed parsed(base_parsed);
  SetupUTF16OverrideComponents(base, replacements, &utf8, &source, &parsed);
  return DoCanonicalizePathURL<char, unsigned char>(
      source, parsed, output, new_parsed);
}

}  // namespace url_canon
