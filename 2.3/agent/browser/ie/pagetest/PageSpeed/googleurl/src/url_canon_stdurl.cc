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

// Functions to canonicalize "standard" URLs, which are ones that have an
// authority section including a host name.

#include "googleurl/src/url_canon.h"
#include "googleurl/src/url_canon_internal.h"

namespace url_canon {

namespace {

template<typename CHAR, typename UCHAR>
bool DoCanonicalizeStandardURL(const URLComponentSource<CHAR>& source,
                               const url_parse::Parsed& parsed,
                               CharsetConverter* query_converter,
                               CanonOutput* output,
                               url_parse::Parsed* new_parsed) {
  // Scheme: this will append the colon.
  bool success = CanonicalizeScheme(source.scheme, parsed.scheme,
                                    output, &new_parsed->scheme);

  // Authority (username, password, host, port)
  bool have_authority;
  if (parsed.username.is_valid() || parsed.password.is_valid() ||
      parsed.host.is_nonempty() || parsed.port.is_valid()) {
    have_authority = true;

    // Only write the authority separators when we have a scheme.
    if (parsed.scheme.is_valid()) {
      output->push_back('/');
      output->push_back('/');
    }

    // User info: the canonicalizer will handle the : and @.
    success &= CanonicalizeUserInfo(source.username, parsed.username,
                                    source.password, parsed.password,
                                    output,
                                    &new_parsed->username,
                                    &new_parsed->password);

    success &= CanonicalizeHost(source.host, parsed.host,
                                output, &new_parsed->host);

    // Host must not be empty for standard URLs.
    if (!parsed.host.is_nonempty())
      success = false;

    // Port: the port canonicalizer will handle the colon.
    int default_port = DefaultPortForScheme(
        &output->data()[new_parsed->scheme.begin], new_parsed->scheme.len);
    success &= CanonicalizePort(source.port, parsed.port, default_port,
                                output, &new_parsed->port);
  } else {
    // No authority, clear the components.
    have_authority = false;
    new_parsed->host.reset();
    new_parsed->username.reset();
    new_parsed->password.reset();
    new_parsed->port.reset();
    success = false;  // Standard URLs must have an authority.
  }

  // Path
  if (parsed.path.is_valid()) {
    success &= CanonicalizePath(source.path, parsed.path,
                                output, &new_parsed->path);
  } else if (have_authority ||
             parsed.query.is_valid() || parsed.ref.is_valid()) {
    // When we have an empty path, make up a path when we have an authority
    // or something following the path. The only time we allow an empty
    // output path is when there is nothing else.
    new_parsed->path = url_parse::Component(output->length(), 1);
    output->push_back('/');
  } else {
    // No path at all
    new_parsed->path.reset();
  }

  // Query
  CanonicalizeQuery(source.query, parsed.query, query_converter,
                    output, &new_parsed->query);

  // Ref: ignore failure for this, since the page can probably still be loaded.
  CanonicalizeRef(source.ref, parsed.ref, output, &new_parsed->ref);

  return success;
}

}  // namespace


// Returns the default port for the given canonical scheme, or PORT_UNSPECIFIED
// if the scheme is unknown.
int DefaultPortForScheme(const char* scheme, int scheme_len) {
  int default_port = url_parse::PORT_UNSPECIFIED;
  switch (scheme_len) {
    case 4:
      if (!strncmp(scheme, "http", scheme_len))
        default_port = 80;
      break;
    case 5:
      if (!strncmp(scheme, "https", scheme_len))
        default_port = 443;
      break;
    case 3:
      if (!strncmp(scheme, "ftp", scheme_len))
        default_port = 21;
      else if (!strncmp(scheme, "wss", scheme_len))
        default_port = 443;
      break;
    case 6:
      if (!strncmp(scheme, "gopher", scheme_len))
        default_port = 70;
      break;
    case 2:
      if (!strncmp(scheme, "ws", scheme_len))
        default_port = 80;
      break;
  }
  return default_port;
}

bool CanonicalizeStandardURL(const char* spec,
                             int spec_len,
                             const url_parse::Parsed& parsed,
                             CharsetConverter* query_converter,
                             CanonOutput* output,
                             url_parse::Parsed* new_parsed) {
  return DoCanonicalizeStandardURL<char, unsigned char>(
      URLComponentSource<char>(spec), parsed, query_converter,
      output, new_parsed);
}

bool CanonicalizeStandardURL(const char16* spec,
                             int spec_len,
                             const url_parse::Parsed& parsed,
                             CharsetConverter* query_converter,
                             CanonOutput* output,
                             url_parse::Parsed* new_parsed) {
  return DoCanonicalizeStandardURL<char16, char16>(
      URLComponentSource<char16>(spec), parsed, query_converter,
      output, new_parsed);
}

// It might be nice in the future to optimize this so unchanged components don't
// need to be recanonicalized. This is especially true since the common case for
// ReplaceComponents is removing things we don't want, like reference fragments
// and usernames. These cases can become more efficient if we can assume the
// rest of the URL is OK with these removed (or only the modified parts
// recanonicalized). This would be much more complex to implement, however.
//
// You would also need to update DoReplaceComponents in url_util.cc which
// relies on this re-checking everything (see the comment there for why).
bool ReplaceStandardURL(const char* base,
                        const url_parse::Parsed& base_parsed,
                        const Replacements<char>& replacements,
                        CharsetConverter* query_converter,
                        CanonOutput* output,
                        url_parse::Parsed* new_parsed) {
  URLComponentSource<char> source(base);
  url_parse::Parsed parsed(base_parsed);
  SetupOverrideComponents(base, replacements, &source, &parsed);
  return DoCanonicalizeStandardURL<char, unsigned char>(
      source, parsed, query_converter, output, new_parsed);
}

// For 16-bit replacements, we turn all the replacements into UTF-8 so the
// regular codepath can be used.
bool ReplaceStandardURL(const char* base,
                        const url_parse::Parsed& base_parsed,
                        const Replacements<char16>& replacements,
                        CharsetConverter* query_converter,
                        CanonOutput* output,
                        url_parse::Parsed* new_parsed) {
  RawCanonOutput<1024> utf8;
  URLComponentSource<char> source(base);
  url_parse::Parsed parsed(base_parsed);
  SetupUTF16OverrideComponents(base, replacements, &utf8, &source, &parsed);
  return DoCanonicalizeStandardURL<char, unsigned char>(
      source, parsed, query_converter, output, new_parsed);
}

}  // namespace url_canon
