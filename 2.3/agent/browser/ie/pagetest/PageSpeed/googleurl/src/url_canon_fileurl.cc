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

// Functions for canonicalizing "file:" URLs.

#include "googleurl/src/url_canon.h"
#include "googleurl/src/url_canon_internal.h"
#include "googleurl/src/url_file.h"
#include "googleurl/src/url_parse_internal.h"

namespace url_canon {

namespace {

#ifdef WIN32

// Given a pointer into the spec, this copies and canonicalizes the drive
// letter and colon to the output, if one is found. If there is not a drive
// spec, it won't do anything. The index of the next character in the input
// spec is returned (after the colon when a drive spec is found, the begin
// offset if one is not).
template<typename CHAR>
int FileDoDriveSpec(const CHAR* spec, int begin, int end,
                    CanonOutput* output) {
  // The path could be one of several things: /foo/bar, c:/foo/bar, /c:/foo,
  // (with backslashes instead of slashes as well).
  int num_slashes = url_parse::CountConsecutiveSlashes(spec, begin, end);
  int after_slashes = begin + num_slashes;

  if (!url_parse::DoesBeginWindowsDriveSpec(spec, after_slashes, end))
    return begin;  // Haven't consumed any characters

  // A drive spec is the start of a path, so we need to add a slash for the
  // authority terminator (typically the third slash).
  output->push_back('/');

  // DoesBeginWindowsDriveSpec will ensure that the drive letter is valid
  // and that it is followed by a colon/pipe.

  // Normalize Windows drive letters to uppercase
  if (spec[after_slashes] >= 'a' && spec[after_slashes] <= 'z')
    output->push_back(spec[after_slashes] - 'a' + 'A');
  else
    output->push_back(static_cast<char>(spec[after_slashes]));

  // Normalize the character following it to a colon rather than pipe.
  output->push_back(':');
  return after_slashes + 2;
}

#endif  // WIN32

template<typename CHAR, typename UCHAR>
bool DoFileCanonicalizePath(const CHAR* spec,
                            const url_parse::Component& path,
                            CanonOutput* output,
                            url_parse::Component* out_path) {
  // Copies and normalizes the "c:" at the beginning, if present.
  out_path->begin = output->length();
  int after_drive;
#ifdef WIN32
  after_drive = FileDoDriveSpec(spec, path.begin, path.end(), output);
#else
  after_drive = path.begin;
#endif

  // Copies the rest of the path, starting from the slash following the
  // drive colon (if any, Windows only), or the first slash of the path.
  bool success = true;
  if (after_drive < path.end()) {
    // Use the regular path canonicalizer to canonicalize the rest of the
    // path. Give it a fake output component to write into. DoCanonicalizeFile
    // will compute the full path component.
    url_parse::Component sub_path =
        url_parse::MakeRange(after_drive, path.end());
    url_parse::Component fake_output_path;
    success = CanonicalizePath(spec, sub_path, output, &fake_output_path);
  } else {
    // No input path, canonicalize to a slash.
    output->push_back('/');
  }

  out_path->len = output->length() - out_path->begin;
  return success;
}

template<typename CHAR, typename UCHAR>
bool DoCanonicalizeFileURL(const URLComponentSource<CHAR>& source,
                           const url_parse::Parsed& parsed,
                           CharsetConverter* query_converter,
                           CanonOutput* output,
                           url_parse::Parsed* new_parsed) {
  // Things we don't set in file: URLs.
  new_parsed->username = url_parse::Component();
  new_parsed->password = url_parse::Component();
  new_parsed->port = url_parse::Component();

  // Scheme (known, so we don't bother running it through the more
  // complicated scheme canonicalizer).
  new_parsed->scheme.begin = output->length();
  output->Append("file://", 7);
  new_parsed->scheme.len = 4;

  // Append the host. For many file URLs, this will be empty. For UNC, this
  // will be present.
  // TODO(brettw) This doesn't do any checking for host name validity. We
  // should probably handle validity checking of UNC hosts differently than
  // for regular IP hosts.
  bool success = CanonicalizeHost(source.host, parsed.host,
                                  output, &new_parsed->host);
  success &= DoFileCanonicalizePath<CHAR, UCHAR>(source.path, parsed.path,
                                    output, &new_parsed->path);
  CanonicalizeQuery(source.query, parsed.query, query_converter,
                    output, &new_parsed->query);

  // Ignore failure for refs since the URL can probably still be loaded.
  CanonicalizeRef(source.ref, parsed.ref, output, &new_parsed->ref);

  return success;
}

} // namespace

bool CanonicalizeFileURL(const char* spec,
                         int spec_len,
                         const url_parse::Parsed& parsed,
                         CharsetConverter* query_converter,
                         CanonOutput* output,
                         url_parse::Parsed* new_parsed) {
  return DoCanonicalizeFileURL<char, unsigned char>(
      URLComponentSource<char>(spec), parsed, query_converter,
      output, new_parsed);
}

bool CanonicalizeFileURL(const char16* spec,
                         int spec_len,
                         const url_parse::Parsed& parsed,
                         CharsetConverter* query_converter,
                         CanonOutput* output,
                         url_parse::Parsed* new_parsed) {
  return DoCanonicalizeFileURL<char16, char16>(
      URLComponentSource<char16>(spec), parsed, query_converter,
      output, new_parsed);
}

bool FileCanonicalizePath(const char* spec,
                          const url_parse::Component& path,
                          CanonOutput* output,
                          url_parse::Component* out_path) {
  return DoFileCanonicalizePath<char, unsigned char>(spec, path,
                                                     output, out_path);
}

bool FileCanonicalizePath(const char16* spec,
                          const url_parse::Component& path,
                          CanonOutput* output,
                          url_parse::Component* out_path) {
  return DoFileCanonicalizePath<char16, char16>(spec, path,
                                                output, out_path);
}

bool ReplaceFileURL(const char* base,
                    const url_parse::Parsed& base_parsed,
                    const Replacements<char>& replacements,
                    CharsetConverter* query_converter,
                    CanonOutput* output,
                    url_parse::Parsed* new_parsed) {
  URLComponentSource<char> source(base);
  url_parse::Parsed parsed(base_parsed);
  SetupOverrideComponents(base, replacements, &source, &parsed);
  return DoCanonicalizeFileURL<char, unsigned char>(
      source, parsed, query_converter, output, new_parsed);
}

bool ReplaceFileURL(const char* base,
                    const url_parse::Parsed& base_parsed,
                    const Replacements<char16>& replacements,
                    CharsetConverter* query_converter,
                    CanonOutput* output,
                    url_parse::Parsed* new_parsed) {
  RawCanonOutput<1024> utf8;
  URLComponentSource<char> source(base);
  url_parse::Parsed parsed(base_parsed);
  SetupUTF16OverrideComponents(base, replacements, &utf8, &source, &parsed);
  return DoCanonicalizeFileURL<char, unsigned char>(
      source, parsed, query_converter, output, new_parsed);
}

}  // namespace url_canon
