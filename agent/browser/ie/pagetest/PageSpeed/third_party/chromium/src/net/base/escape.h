// Copyright (c) 2009 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef NET_BASE_ESCAPE_H_
#define NET_BASE_ESCAPE_H_
#pragma once

#include <string>

#include "base/basictypes.h"
#include "base/string16.h"

// Escaping --------------------------------------------------------------------

// Escape a file.  This includes:
// non-printable, non-7bit, and (including space)  "#%:<>?[\]^`{|}
std::string EscapePath(const std::string& path);

// Escape application/x-www-form-urlencoded content.  This includes:
// non-printable, non-7bit, and (including space)  ?>=<;+'&%$#"![\]^`{|}
// Space is escaped as + and other special characters as %XX (hex).
std::string EscapeUrlEncodedData(const std::string& path);

// Escape all non-ASCII input.
std::string EscapeNonASCII(const std::string& input);

// Escapes characters in text suitable for use as an external protocol handler
// command.
// We %XX everything except alphanumerics and %-_.!~*'() and the restricted
// chracters (;/?:@&=+$,).
std::string EscapeExternalHandlerValue(const std::string& text);

// Append the given character to the output string, escaping the character if
// the character would be interpretted as an HTML delimiter.
void AppendEscapedCharForHTML(char c, std::string* output);

// Escape chars that might cause this text to be interpretted as HTML tags.
std::string EscapeForHTML(const std::string& text);
string16 EscapeForHTML(const string16& text);

// Unescaping ------------------------------------------------------------------

class UnescapeRule {
 public:
  // A combination of the following flags that is passed to the unescaping
  // functions.
  typedef uint32 Type;

  enum {
    // Don't unescape anything at all.
    NONE = 0,

    // Don't unescape anything special, but all normal unescaping will happen.
    // This is a placeholder and can't be combined with other flags (since it's
    // just the absence of them). All other unescape rules imply "normal" in
    // addition to their special meaning. Things like escaped letters, digits,
    // and most symbols will get unescaped with this mode.
    NORMAL = 1,

    // Convert %20 to spaces. In some places where we're showing URLs, we may
    // want this. In places where the URL may be copied and pasted out, then
    // you wouldn't want this since it might not be interpreted in one piece
    // by other applications.
    SPACES = 2,

    // Unescapes various characters that will change the meaning of URLs,
    // including '%', '+', '&', '/', '#'. If we unescaped these characters, the
    // resulting URL won't be the same as the source one. This flag is used when
    // generating final output like filenames for URLs where we won't be
    // interpreting as a URL and want to do as much unescaping as possible.
    URL_SPECIAL_CHARS = 4,

    // Unescapes control characters such as %01. This INCLUDES NULLs. This is
    // used for rare cases such as data: URL decoding where the result is binary
    // data. You should not use this for normal URLs!
    CONTROL_CHARS = 8,

    // URL queries use "+" for space. This flag controls that replacement.
    REPLACE_PLUS_WITH_SPACE = 16,
  };
};

// Unescapes |escaped_text| and returns the result.
// Unescaping consists of looking for the exact pattern "%XX", where each X is
// a hex digit, and converting to the character with the numerical value of
// those digits. Thus "i%20=%203%3b" unescapes to "i = 3;".
//
// Watch out: this doesn't necessarily result in the correct final result,
// because the encoding may be unknown. For example, the input might be ASCII,
// which, after unescaping, is supposed to be interpreted as UTF-8, and then
// converted into full wide chars. This function won't tell you if any
// conversions need to take place, it only unescapes.
std::string UnescapeURLComponent(const std::string& escaped_text,
                                 UnescapeRule::Type rules);
string16 UnescapeURLComponent(const string16& escaped_text,
                              UnescapeRule::Type rules);

// Unescapes the given substring as a URL, and then tries to interpret the
// result as being encoded as UTF-8. If the result is convertable into UTF-8, it
// will be returned as converted. If it is not, the original escaped string will
// be converted into a string16 and returned.
//
// |offset_for_adjustment| may be NULL; if not, it is an offset into |text| that
// will be adjusted to point at the same logical place in the result string.  If
// this isn't possible because it points into the middle of an escape sequence
// or past the end of the string, it will be set to string16::npos.
string16 UnescapeAndDecodeUTF8URLComponent(const std::string& text,
                                           UnescapeRule::Type rules,
                                           size_t* offset_for_adjustment);

// Unescape the following ampersand character codes from |text|:
// &lt; &gt; &amp; &quot; &#39;
string16 UnescapeForHTML(const string16& text);

// Deprecated ------------------------------------------------------------------

// Escapes characters in text suitable for use as a query parameter value.
// We %XX everything except alphanumerics and -_.!~*'()
// Spaces change to "+" unless you pass usePlus=false.
// This is basically the same as encodeURIComponent in javascript.
// For the string16 version, we do a conversion to charset before encoding the
// string.  If the charset doesn't exist, we return false.
//
// TODO(brettw) bug 1201094: This function should be removed. See the bug for
// why and what callers should do instead.
std::string EscapeQueryParamValue(const std::string& text, bool use_plus);
bool EscapeQueryParamValue(const string16& text, const char* codepage,
                           bool use_plus, string16* escaped);

// A specialized version of EscapeQueryParamValue for wide strings that
// assumes the codepage is UTF8.  This is provided as a convenience.
//
// TODO(brettw) bug 1201094: This function should be removed. See the bug for
// why and what callers should do instead.
std::wstring EscapeQueryParamValueUTF8(const std::wstring& text, bool use_plus);

#endif  // NET_BASE_ESCAPE_H_
