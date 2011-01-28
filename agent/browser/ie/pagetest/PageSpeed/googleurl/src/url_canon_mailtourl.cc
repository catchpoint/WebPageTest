// Copyright 2008, Google Inc.
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

// Functions for canonicalizing "mailto:" URLs.

#include "googleurl/src/url_canon.h"
#include "googleurl/src/url_canon_internal.h"
#include "googleurl/src/url_file.h"
#include "googleurl/src/url_parse_internal.h"

namespace url_canon {

namespace {


template<typename CHAR, typename UCHAR>
bool DoCanonicalizeMailtoURL(const URLComponentSource<CHAR>& source,
                             const url_parse::Parsed& parsed,
                             CanonOutput* output,
                             url_parse::Parsed* new_parsed) {

  // mailto: only uses {scheme, path, query} -- clear the rest.
  new_parsed->username = url_parse::Component();
  new_parsed->password = url_parse::Component();
  new_parsed->host = url_parse::Component();
  new_parsed->port = url_parse::Component();
  new_parsed->ref = url_parse::Component();

  // Scheme (known, so we don't bother running it through the more
  // complicated scheme canonicalizer).
  new_parsed->scheme.begin = output->length();
  output->Append("mailto:", 7);
  new_parsed->scheme.len = 6;

  bool success = true;

  // Path
  if (parsed.path.is_valid()) {
    new_parsed->path.begin = output->length();

    // Copy the path using path URL's more lax escaping rules.
    // We convert to UTF-8 and escape non-ASCII, but leave all
    // ASCII characters alone.
    int end = parsed.path.end();
    for (int i = parsed.path.begin; i < end; ++i) {
      UCHAR uch = static_cast<UCHAR>(source.path[i]);
      if (uch < 0x20 || uch >= 0x80)
        success &= AppendUTF8EscapedChar(source.path, &i, end, output);
      else
        output->push_back(static_cast<char>(uch));
    }

    new_parsed->path.len = output->length() - new_parsed->path.begin;
  } else {
    // No path at all
    new_parsed->path.reset();
  }

  // Query -- always use the default utf8 charset converter.
  CanonicalizeQuery(source.query, parsed.query, NULL,
                    output, &new_parsed->query);

  return success;
}

} // namespace

bool CanonicalizeMailtoURL(const char* spec,
                          int spec_len,
                          const url_parse::Parsed& parsed,
                          CanonOutput* output,
                          url_parse::Parsed* new_parsed) {
  return DoCanonicalizeMailtoURL<char, unsigned char>(
      URLComponentSource<char>(spec), parsed, output, new_parsed);
}

bool CanonicalizeMailtoURL(const char16* spec,
                           int spec_len,
                           const url_parse::Parsed& parsed,
                           CanonOutput* output,
                           url_parse::Parsed* new_parsed) {
  return DoCanonicalizeMailtoURL<char16, char16>(
      URLComponentSource<char16>(spec), parsed, output, new_parsed);
}

bool ReplaceMailtoURL(const char* base,
                      const url_parse::Parsed& base_parsed,
                      const Replacements<char>& replacements,
                      CanonOutput* output,
                      url_parse::Parsed* new_parsed) {
  URLComponentSource<char> source(base);
  url_parse::Parsed parsed(base_parsed);
  SetupOverrideComponents(base, replacements, &source, &parsed);
  return DoCanonicalizeMailtoURL<char, unsigned char>(
      source, parsed, output, new_parsed);
}

bool ReplaceMailtoURL(const char* base,
                      const url_parse::Parsed& base_parsed,
                      const Replacements<char16>& replacements,
                      CanonOutput* output,
                      url_parse::Parsed* new_parsed) {
  RawCanonOutput<1024> utf8;
  URLComponentSource<char> source(base);
  url_parse::Parsed parsed(base_parsed);
  SetupUTF16OverrideComponents(base, replacements, &utf8, &source, &parsed);
  return DoCanonicalizeMailtoURL<char, unsigned char>(
      source, parsed, output, new_parsed);
}

}  // namespace url_canon
