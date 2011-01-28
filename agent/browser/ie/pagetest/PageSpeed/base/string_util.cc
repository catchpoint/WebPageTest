// Copyright (c) 2010 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "base/string_util.h"

#include "build/build_config.h"

#include <ctype.h>
#include <errno.h>
#include <math.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <wchar.h>
#include <wctype.h>

#include <algorithm>
#include <vector>

#include "base/basictypes.h"
#include "base/logging.h"
#ifndef __native_client__
#include "base/singleton.h"
#endif
#include "base/third_party/dmg_fp/dmg_fp.h"
#include "base/utf_string_conversion_utils.h"
#include "base/utf_string_conversions.h"
#ifdef ICU_DEPENDENCY
#include "base/third_party/icu/icu_utf.h"
#endif

namespace {

// Force the singleton used by Empty[W]String[16] to be a unique type. This
// prevents other code that might accidentally use Singleton<string> from
// getting our internal one.
struct EmptyStrings {
  EmptyStrings() {}
  const std::string s;
  const std::wstring ws;
  const string16 s16;
};

// Used by ReplaceStringPlaceholders to track the position in the string of
// replaced parameters.
struct ReplacementOffset {
  ReplacementOffset(uintptr_t parameter, size_t offset)
      : parameter(parameter),
        offset(offset) {}

  // Index of the parameter.
  uintptr_t parameter;

  // Starting position in the string.
  size_t offset;
};

static bool CompareParameter(const ReplacementOffset& elem1,
                             const ReplacementOffset& elem2) {
  return elem1.parameter < elem2.parameter;
}

}  // namespace

namespace base {

bool IsWprintfFormatPortable(const wchar_t* format) {
  for (const wchar_t* position = format; *position != '\0'; ++position) {
    if (*position == '%') {
      bool in_specification = true;
      bool modifier_l = false;
      while (in_specification) {
        // Eat up characters until reaching a known specifier.
        if (*++position == '\0') {
          // The format string ended in the middle of a specification.  Call
          // it portable because no unportable specifications were found.  The
          // string is equally broken on all platforms.
          return true;
        }

        if (*position == 'l') {
          // 'l' is the only thing that can save the 's' and 'c' specifiers.
          modifier_l = true;
        } else if (((*position == 's' || *position == 'c') && !modifier_l) ||
                   *position == 'S' || *position == 'C' || *position == 'F' ||
                   *position == 'D' || *position == 'O' || *position == 'U') {
          // Not portable.
          return false;
        }

        if (wcschr(L"diouxXeEfgGaAcspn%", *position)) {
          // Portable, keep scanning the rest of the format string.
          in_specification = false;
        }
      }
    }
  }

  return true;
}

}  // namespace base

#ifndef __native_client__
const std::string& EmptyString() {
  return Singleton<EmptyStrings>::get()->s;
}

const std::wstring& EmptyWString() {
  return Singleton<EmptyStrings>::get()->ws;
}

const string16& EmptyString16() {
  return Singleton<EmptyStrings>::get()->s16;
}
#endif  // __native_client__

#define WHITESPACE_UNICODE \
  0x0009, /* <control-0009> to <control-000D> */ \
  0x000A,                                        \
  0x000B,                                        \
  0x000C,                                        \
  0x000D,                                        \
  0x0020, /* Space */                            \
  0x0085, /* <control-0085> */                   \
  0x00A0, /* No-Break Space */                   \
  0x1680, /* Ogham Space Mark */                 \
  0x180E, /* Mongolian Vowel Separator */        \
  0x2000, /* En Quad to Hair Space */            \
  0x2001,                                        \
  0x2002,                                        \
  0x2003,                                        \
  0x2004,                                        \
  0x2005,                                        \
  0x2006,                                        \
  0x2007,                                        \
  0x2008,                                        \
  0x2009,                                        \
  0x200A,                                        \
  0x200C, /* Zero Width Non-Joiner */            \
  0x2028, /* Line Separator */                   \
  0x2029, /* Paragraph Separator */              \
  0x202F, /* Narrow No-Break Space */            \
  0x205F, /* Medium Mathematical Space */        \
  0x3000, /* Ideographic Space */                \
  0

const wchar_t kWhitespaceWide[] = {
  WHITESPACE_UNICODE
};
const char16 kWhitespaceUTF16[] = {
  WHITESPACE_UNICODE
};
const char kWhitespaceASCII[] = {
  0x09,    // <control-0009> to <control-000D>
  0x0A,
  0x0B,
  0x0C,
  0x0D,
  0x20,    // Space
  0
};

const char kUtf8ByteOrderMark[] = "\xEF\xBB\xBF";

template<typename STR>
bool RemoveCharsT(const STR& input,
                  const typename STR::value_type remove_chars[],
                  STR* output) {
  bool removed = false;
  size_t found;

  *output = input;

  found = output->find_first_of(remove_chars);
  while (found != STR::npos) {
    removed = true;
    output->replace(found, 1, STR());
    found = output->find_first_of(remove_chars, found);
  }

  return removed;
}

bool RemoveChars(const std::wstring& input,
                 const wchar_t remove_chars[],
                 std::wstring* output) {
  return RemoveCharsT(input, remove_chars, output);
}

#if !defined(WCHAR_T_IS_UTF16)
bool RemoveChars(const string16& input,
                 const char16 remove_chars[],
                 string16* output) {
  return RemoveCharsT(input, remove_chars, output);
}
#endif

bool RemoveChars(const std::string& input,
                 const char remove_chars[],
                 std::string* output) {
  return RemoveCharsT(input, remove_chars, output);
}

template<typename STR>
TrimPositions TrimStringT(const STR& input,
                          const typename STR::value_type trim_chars[],
                          TrimPositions positions,
                          STR* output) {
  // Find the edges of leading/trailing whitespace as desired.
  const typename STR::size_type last_char = input.length() - 1;
  const typename STR::size_type first_good_char = (positions & TRIM_LEADING) ?
      input.find_first_not_of(trim_chars) : 0;
  const typename STR::size_type last_good_char = (positions & TRIM_TRAILING) ?
      input.find_last_not_of(trim_chars) : last_char;

  // When the string was all whitespace, report that we stripped off whitespace
  // from whichever position the caller was interested in.  For empty input, we
  // stripped no whitespace, but we still need to clear |output|.
  if (input.empty() ||
      (first_good_char == STR::npos) || (last_good_char == STR::npos)) {
    bool input_was_empty = input.empty();  // in case output == &input
    output->clear();
    return input_was_empty ? TRIM_NONE : positions;
  }

  // Trim the whitespace.
  *output =
      input.substr(first_good_char, last_good_char - first_good_char + 1);

  // Return where we trimmed from.
  return static_cast<TrimPositions>(
      ((first_good_char == 0) ? TRIM_NONE : TRIM_LEADING) |
      ((last_good_char == last_char) ? TRIM_NONE : TRIM_TRAILING));
}

bool TrimString(const std::wstring& input,
                const wchar_t trim_chars[],
                std::wstring* output) {
  return TrimStringT(input, trim_chars, TRIM_ALL, output) != TRIM_NONE;
}

#if !defined(WCHAR_T_IS_UTF16)
bool TrimString(const string16& input,
                const char16 trim_chars[],
                string16* output) {
  return TrimStringT(input, trim_chars, TRIM_ALL, output) != TRIM_NONE;
}
#endif

bool TrimString(const std::string& input,
                const char trim_chars[],
                std::string* output) {
  return TrimStringT(input, trim_chars, TRIM_ALL, output) != TRIM_NONE;
}

#ifdef ICU_DEPENDENCY
void TruncateUTF8ToByteSize(const std::string& input,
                            const size_t byte_size,
                            std::string* output) {
  DCHECK(output);
  if (byte_size > input.length()) {
    *output = input;
    return;
  }
  DCHECK_LE(byte_size, static_cast<uint32>(kint32max));
  // Note: This cast is necessary because CBU8_NEXT uses int32s.
  int32 truncation_length = static_cast<int32>(byte_size);
  int32 char_index = truncation_length - 1;
  const char* data = input.data();

  // Using CBU8, we will move backwards from the truncation point
  // to the beginning of the string looking for a valid UTF8
  // character.  Once a full UTF8 character is found, we will
  // truncate the string to the end of that character.
  while (char_index >= 0) {
    int32 prev = char_index;
    uint32 code_point = 0;
    CBU8_NEXT(data, char_index, truncation_length, code_point);
    if (!base::IsValidCharacter(code_point) ||
        !base::IsValidCodepoint(code_point)) {
      char_index = prev - 1;
    } else {
      break;
    }
  }

  if (char_index >= 0 )
    *output = input.substr(0, char_index);
  else
    output->clear();
}
#endif  // ICU_DEPENDENCY

TrimPositions TrimWhitespace(const std::wstring& input,
                             TrimPositions positions,
                             std::wstring* output) {
  return TrimStringT(input, kWhitespaceWide, positions, output);
}

#if !defined(WCHAR_T_IS_UTF16)
TrimPositions TrimWhitespace(const string16& input,
                             TrimPositions positions,
                             string16* output) {
  return TrimStringT(input, kWhitespaceUTF16, positions, output);
}
#endif

TrimPositions TrimWhitespaceASCII(const std::string& input,
                                  TrimPositions positions,
                                  std::string* output) {
  return TrimStringT(input, kWhitespaceASCII, positions, output);
}

// This function is only for backward-compatibility.
// To be removed when all callers are updated.
TrimPositions TrimWhitespace(const std::string& input,
                             TrimPositions positions,
                             std::string* output) {
  return TrimWhitespaceASCII(input, positions, output);
}

template<typename STR>
STR CollapseWhitespaceT(const STR& text,
                        bool trim_sequences_with_line_breaks) {
  STR result;
  result.resize(text.size());

  // Set flags to pretend we're already in a trimmed whitespace sequence, so we
  // will trim any leading whitespace.
  bool in_whitespace = true;
  bool already_trimmed = true;

  int chars_written = 0;
  for (typename STR::const_iterator i(text.begin()); i != text.end(); ++i) {
    if (IsWhitespace(*i)) {
      if (!in_whitespace) {
        // Reduce all whitespace sequences to a single space.
        in_whitespace = true;
        result[chars_written++] = L' ';
      }
      if (trim_sequences_with_line_breaks && !already_trimmed &&
          ((*i == '\n') || (*i == '\r'))) {
        // Whitespace sequences containing CR or LF are eliminated entirely.
        already_trimmed = true;
        --chars_written;
      }
    } else {
      // Non-whitespace chracters are copied straight across.
      in_whitespace = false;
      already_trimmed = false;
      result[chars_written++] = *i;
    }
  }

  if (in_whitespace && !already_trimmed) {
    // Any trailing whitespace is eliminated.
    --chars_written;
  }

  result.resize(chars_written);
  return result;
}

std::wstring CollapseWhitespace(const std::wstring& text,
                                bool trim_sequences_with_line_breaks) {
  return CollapseWhitespaceT(text, trim_sequences_with_line_breaks);
}

#if !defined(WCHAR_T_IS_UTF16)
string16 CollapseWhitespace(const string16& text,
                            bool trim_sequences_with_line_breaks) {
  return CollapseWhitespaceT(text, trim_sequences_with_line_breaks);
}
#endif

std::string CollapseWhitespaceASCII(const std::string& text,
                                    bool trim_sequences_with_line_breaks) {
  return CollapseWhitespaceT(text, trim_sequences_with_line_breaks);
}

bool ContainsOnlyWhitespaceASCII(const std::string& str) {
  for (std::string::const_iterator i(str.begin()); i != str.end(); ++i) {
    if (!IsAsciiWhitespace(*i))
      return false;
  }
  return true;
}

bool ContainsOnlyWhitespace(const string16& str) {
  for (string16::const_iterator i(str.begin()); i != str.end(); ++i) {
    if (!IsWhitespace(*i))
      return false;
  }
  return true;
}

template<typename STR>
static bool ContainsOnlyCharsT(const STR& input, const STR& characters) {
  for (typename STR::const_iterator iter = input.begin();
       iter != input.end(); ++iter) {
    if (characters.find(*iter) == STR::npos)
      return false;
  }
  return true;
}

bool ContainsOnlyChars(const std::wstring& input,
                       const std::wstring& characters) {
  return ContainsOnlyCharsT(input, characters);
}

#if !defined(WCHAR_T_IS_UTF16)
bool ContainsOnlyChars(const string16& input, const string16& characters) {
  return ContainsOnlyCharsT(input, characters);
}
#endif

bool ContainsOnlyChars(const std::string& input,
                       const std::string& characters) {
  return ContainsOnlyCharsT(input, characters);
}

std::string WideToASCII(const std::wstring& wide) {
  DCHECK(IsStringASCII(wide)) << wide;
  return std::string(wide.begin(), wide.end());
}

std::string UTF16ToASCII(const string16& utf16) {
  DCHECK(IsStringASCII(utf16)) << utf16;
  return std::string(utf16.begin(), utf16.end());
}

// Latin1 is just the low range of Unicode, so we can copy directly to convert.
bool WideToLatin1(const std::wstring& wide, std::string* latin1) {
  std::string output;
  output.resize(wide.size());
  latin1->clear();
  for (size_t i = 0; i < wide.size(); i++) {
    if (wide[i] > 255)
      return false;
    output[i] = static_cast<char>(wide[i]);
  }
  latin1->swap(output);
  return true;
}

bool IsString8Bit(const std::wstring& str) {
  for (size_t i = 0; i < str.length(); i++) {
    if (str[i] > 255)
      return false;
  }
  return true;
}

template<class STR>
static bool DoIsStringASCII(const STR& str) {
  for (size_t i = 0; i < str.length(); i++) {
    typename ToUnsigned<typename STR::value_type>::Unsigned c = str[i];
    if (c > 0x7F)
      return false;
  }
  return true;
}

bool IsStringASCII(const std::wstring& str) {
  return DoIsStringASCII(str);
}

#if !defined(WCHAR_T_IS_UTF16)
bool IsStringASCII(const string16& str) {
  return DoIsStringASCII(str);
}
#endif

bool IsStringASCII(const base::StringPiece& str) {
  return DoIsStringASCII(str);
}

#ifdef ICU_DEPENDENCY
bool IsStringUTF8(const std::string& str) {
  const char *src = str.data();
  int32 src_len = static_cast<int32>(str.length());
  int32 char_index = 0;

  while (char_index < src_len) {
    int32 code_point;
    CBU8_NEXT(src, char_index, src_len, code_point);
    if (!base::IsValidCharacter(code_point))
       return false;
  }
  return true;
}
#endif  // ICU_DEPENDENCY

template<typename Iter>
static inline bool DoLowerCaseEqualsASCII(Iter a_begin,
                                          Iter a_end,
                                          const char* b) {
  for (Iter it = a_begin; it != a_end; ++it, ++b) {
    if (!*b || ToLowerASCII(*it) != *b)
      return false;
  }
  return *b == 0;
}

// Front-ends for LowerCaseEqualsASCII.
bool LowerCaseEqualsASCII(const std::string& a, const char* b) {
  return DoLowerCaseEqualsASCII(a.begin(), a.end(), b);
}

bool LowerCaseEqualsASCII(const std::wstring& a, const char* b) {
  return DoLowerCaseEqualsASCII(a.begin(), a.end(), b);
}

#if !defined(WCHAR_T_IS_UTF16)
bool LowerCaseEqualsASCII(const string16& a, const char* b) {
  return DoLowerCaseEqualsASCII(a.begin(), a.end(), b);
}
#endif

bool LowerCaseEqualsASCII(std::string::const_iterator a_begin,
                          std::string::const_iterator a_end,
                          const char* b) {
  return DoLowerCaseEqualsASCII(a_begin, a_end, b);
}

bool LowerCaseEqualsASCII(std::wstring::const_iterator a_begin,
                          std::wstring::const_iterator a_end,
                          const char* b) {
  return DoLowerCaseEqualsASCII(a_begin, a_end, b);
}

#if !defined(WCHAR_T_IS_UTF16)
bool LowerCaseEqualsASCII(string16::const_iterator a_begin,
                          string16::const_iterator a_end,
                          const char* b) {
  return DoLowerCaseEqualsASCII(a_begin, a_end, b);
}
#endif

bool LowerCaseEqualsASCII(const char* a_begin,
                          const char* a_end,
                          const char* b) {
  return DoLowerCaseEqualsASCII(a_begin, a_end, b);
}

bool LowerCaseEqualsASCII(const wchar_t* a_begin,
                          const wchar_t* a_end,
                          const char* b) {
  return DoLowerCaseEqualsASCII(a_begin, a_end, b);
}

#if !defined(WCHAR_T_IS_UTF16)
bool LowerCaseEqualsASCII(const char16* a_begin,
                          const char16* a_end,
                          const char* b) {
  return DoLowerCaseEqualsASCII(a_begin, a_end, b);
}
#endif

bool EqualsASCII(const string16& a, const base::StringPiece& b) {
  if (a.length() != b.length())
    return false;
  return std::equal(b.begin(), b.end(), a.begin());
}

bool StartsWithASCII(const std::string& str,
                     const std::string& search,
                     bool case_sensitive) {
  if (case_sensitive)
    return str.compare(0, search.length(), search) == 0;
  else
    return base::strncasecmp(str.c_str(), search.c_str(), search.length()) == 0;
}

template <typename STR>
bool StartsWithT(const STR& str, const STR& search, bool case_sensitive) {
  if (case_sensitive) {
    return str.compare(0, search.length(), search) == 0;
  } else {
    if (search.size() > str.size())
      return false;
    return std::equal(search.begin(), search.end(), str.begin(),
                      CaseInsensitiveCompare<typename STR::value_type>());
  }
}

bool StartsWith(const std::wstring& str, const std::wstring& search,
                bool case_sensitive) {
  return StartsWithT(str, search, case_sensitive);
}

#if !defined(WCHAR_T_IS_UTF16)
bool StartsWith(const string16& str, const string16& search,
                bool case_sensitive) {
  return StartsWithT(str, search, case_sensitive);
}
#endif

template <typename STR>
bool EndsWithT(const STR& str, const STR& search, bool case_sensitive) {
  typename STR::size_type str_length = str.length();
  typename STR::size_type search_length = search.length();
  if (search_length > str_length)
    return false;
  if (case_sensitive) {
    return str.compare(str_length - search_length, search_length, search) == 0;
  } else {
    return std::equal(search.begin(), search.end(),
                      str.begin() + (str_length - search_length),
                      CaseInsensitiveCompare<typename STR::value_type>());
  }
}

bool EndsWith(const std::string& str, const std::string& search,
              bool case_sensitive) {
  return EndsWithT(str, search, case_sensitive);
}

bool EndsWith(const std::wstring& str, const std::wstring& search,
              bool case_sensitive) {
  return EndsWithT(str, search, case_sensitive);
}

#if !defined(WCHAR_T_IS_UTF16)
bool EndsWith(const string16& str, const string16& search,
              bool case_sensitive) {
  return EndsWithT(str, search, case_sensitive);
}
#endif

DataUnits GetByteDisplayUnits(int64 bytes) {
  // The byte thresholds at which we display amounts.  A byte count is displayed
  // in unit U when kUnitThresholds[U] <= bytes < kUnitThresholds[U+1].
  // This must match the DataUnits enum.
  static const int64 kUnitThresholds[] = {
    0,              // DATA_UNITS_BYTE,
    3*1024,         // DATA_UNITS_KIBIBYTE,
    2*1024*1024,    // DATA_UNITS_MEBIBYTE,
    1024*1024*1024  // DATA_UNITS_GIBIBYTE,
  };

  if (bytes < 0) {
    NOTREACHED() << "Negative bytes value";
    return DATA_UNITS_BYTE;
  }

  int unit_index = arraysize(kUnitThresholds);
  while (--unit_index > 0) {
    if (bytes >= kUnitThresholds[unit_index])
      break;
  }

  DCHECK(unit_index >= DATA_UNITS_BYTE && unit_index <= DATA_UNITS_GIBIBYTE);
  return DataUnits(unit_index);
}

// TODO(mpcomplete): deal with locale
// Byte suffixes.  This must match the DataUnits enum.
static const wchar_t* const kByteStrings[] = {
  L"B",
  L"kB",
  L"MB",
  L"GB"
};

static const wchar_t* const kSpeedStrings[] = {
  L"B/s",
  L"kB/s",
  L"MB/s",
  L"GB/s"
};

std::wstring FormatBytesInternal(int64 bytes,
                                 DataUnits units,
                                 bool show_units,
                                 const wchar_t* const* suffix) {
  if (bytes < 0) {
    NOTREACHED() << "Negative bytes value";
    return std::wstring();
  }

  DCHECK(units >= DATA_UNITS_BYTE && units <= DATA_UNITS_GIBIBYTE);

  // Put the quantity in the right units.
  double unit_amount = static_cast<double>(bytes);
  for (int i = 0; i < units; ++i)
    unit_amount /= 1024.0;

  wchar_t buf[64];
  if (bytes != 0 && units != DATA_UNITS_BYTE && unit_amount < 100)
    base::swprintf(buf, arraysize(buf), L"%.1lf", unit_amount);
  else
    base::swprintf(buf, arraysize(buf), L"%.0lf", unit_amount);

  std::wstring ret(buf);
  if (show_units) {
    ret += L" ";
    ret += suffix[units];
  }

  return ret;
}

std::wstring FormatBytes(int64 bytes, DataUnits units, bool show_units) {
  return FormatBytesInternal(bytes, units, show_units, kByteStrings);
}

std::wstring FormatSpeed(int64 bytes, DataUnits units, bool show_units) {
  return FormatBytesInternal(bytes, units, show_units, kSpeedStrings);
}

template<class StringType>
void DoReplaceSubstringsAfterOffset(StringType* str,
                                    typename StringType::size_type start_offset,
                                    const StringType& find_this,
                                    const StringType& replace_with,
                                    bool replace_all) {
  if ((start_offset == StringType::npos) || (start_offset >= str->length()))
    return;

  DCHECK(!find_this.empty());
  for (typename StringType::size_type offs(str->find(find_this, start_offset));
      offs != StringType::npos; offs = str->find(find_this, offs)) {
    str->replace(offs, find_this.length(), replace_with);
    offs += replace_with.length();

    if (!replace_all)
      break;
  }
}

void ReplaceFirstSubstringAfterOffset(string16* str,
                                      string16::size_type start_offset,
                                      const string16& find_this,
                                      const string16& replace_with) {
  DoReplaceSubstringsAfterOffset(str, start_offset, find_this, replace_with,
                                 false);  // replace first instance
}

void ReplaceFirstSubstringAfterOffset(std::string* str,
                                      std::string::size_type start_offset,
                                      const std::string& find_this,
                                      const std::string& replace_with) {
  DoReplaceSubstringsAfterOffset(str, start_offset, find_this, replace_with,
                                 false);  // replace first instance
}

void ReplaceSubstringsAfterOffset(string16* str,
                                  string16::size_type start_offset,
                                  const string16& find_this,
                                  const string16& replace_with) {
  DoReplaceSubstringsAfterOffset(str, start_offset, find_this, replace_with,
                                 true);  // replace all instances
}

void ReplaceSubstringsAfterOffset(std::string* str,
                                  std::string::size_type start_offset,
                                  const std::string& find_this,
                                  const std::string& replace_with) {
  DoReplaceSubstringsAfterOffset(str, start_offset, find_this, replace_with,
                                 true);  // replace all instances
}

// Overloaded wrappers around vsnprintf and vswprintf. The buf_size parameter
// is the size of the buffer. These return the number of characters in the
// formatted string excluding the NUL terminator. If the buffer is not
// large enough to accommodate the formatted string without truncation, they
// return the number of characters that would be in the fully-formatted string
// (vsnprintf, and vswprintf on Windows), or -1 (vswprintf on POSIX platforms).
inline int vsnprintfT(char* buffer,
                      size_t buf_size,
                      const char* format,
                      va_list argptr) {
  return base::vsnprintf(buffer, buf_size, format, argptr);
}

inline int vsnprintfT(wchar_t* buffer,
                      size_t buf_size,
                      const wchar_t* format,
                      va_list argptr) {
  return base::vswprintf(buffer, buf_size, format, argptr);
}

// Templatized backend for StringPrintF/StringAppendF. This does not finalize
// the va_list, the caller is expected to do that.
template <class StringType>
static void StringAppendVT(StringType* dst,
                           const typename StringType::value_type* format,
                           va_list ap) {
  // First try with a small fixed size buffer.
  // This buffer size should be kept in sync with StringUtilTest.GrowBoundary
  // and StringUtilTest.StringPrintfBounds.
  typename StringType::value_type stack_buf[1024];

  va_list ap_copy;
  GG_VA_COPY(ap_copy, ap);

#if !defined(OS_WIN)
  errno = 0;
#endif
  int result = vsnprintfT(stack_buf, arraysize(stack_buf), format, ap_copy);
  va_end(ap_copy);

  if (result >= 0 && result < static_cast<int>(arraysize(stack_buf))) {
    // It fit.
    dst->append(stack_buf, result);
    return;
  }

  // Repeatedly increase buffer size until it fits.
  int mem_length = arraysize(stack_buf);
  while (true) {
    if (result < 0) {
#if !defined(OS_WIN)
      // On Windows, vsnprintfT always returns the number of characters in a
      // fully-formatted string, so if we reach this point, something else is
      // wrong and no amount of buffer-doubling is going to fix it.
      if (errno != 0 && errno != EOVERFLOW)
#endif
      {
        // If an error other than overflow occurred, it's never going to work.
        DLOG(WARNING) << "Unable to printf the requested string due to error.";
        return;
      }
      // Try doubling the buffer size.
      mem_length *= 2;
    } else {
      // We need exactly "result + 1" characters.
      mem_length = result + 1;
    }

    if (mem_length > 32 * 1024 * 1024) {
      // That should be plenty, don't try anything larger.  This protects
      // against huge allocations when using vsnprintfT implementations that
      // return -1 for reasons other than overflow without setting errno.
      DLOG(WARNING) << "Unable to printf the requested string due to size.";
      return;
    }

    std::vector<typename StringType::value_type> mem_buf(mem_length);

    // NOTE: You can only use a va_list once.  Since we're in a while loop, we
    // need to make a new copy each time so we don't use up the original.
    GG_VA_COPY(ap_copy, ap);
    result = vsnprintfT(&mem_buf[0], mem_length, format, ap_copy);
    va_end(ap_copy);

    if ((result >= 0) && (result < mem_length)) {
      // It fit.
      dst->append(&mem_buf[0], result);
      return;
    }
  }
}

void StringAppendV(std::string* dst, const char* format, va_list ap) {
  StringAppendVT(dst, format, ap);
}

void StringAppendV(std::wstring* dst, const wchar_t* format, va_list ap) {
  StringAppendVT(dst, format, ap);
}

std::string StringPrintf(const char* format, ...) {
  va_list ap;
  va_start(ap, format);
  std::string result;
  StringAppendV(&result, format, ap);
  va_end(ap);
  return result;
}

std::wstring StringPrintf(const wchar_t* format, ...) {
  va_list ap;
  va_start(ap, format);
  std::wstring result;
  StringAppendV(&result, format, ap);
  va_end(ap);
  return result;
}

std::string StringPrintV(const char* format, va_list ap) {
  std::string result;
  StringAppendV(&result, format, ap);
  return result;
}

const std::string& SStringPrintf(std::string* dst, const char* format, ...) {
  va_list ap;
  va_start(ap, format);
  dst->clear();
  StringAppendV(dst, format, ap);
  va_end(ap);
  return *dst;
}

const std::wstring& SStringPrintf(std::wstring* dst,
                                  const wchar_t* format, ...) {
  va_list ap;
  va_start(ap, format);
  dst->clear();
  StringAppendV(dst, format, ap);
  va_end(ap);
  return *dst;
}

void StringAppendF(std::string* dst, const char* format, ...) {
  va_list ap;
  va_start(ap, format);
  StringAppendV(dst, format, ap);
  va_end(ap);
}

void StringAppendF(std::wstring* dst, const wchar_t* format, ...) {
  va_list ap;
  va_start(ap, format);
  StringAppendV(dst, format, ap);
  va_end(ap);
}

template<typename STR>
static void SplitStringT(const STR& str,
                         const typename STR::value_type s,
                         bool trim_whitespace,
                         std::vector<STR>* r) {
  size_t last = 0;
  size_t i;
  size_t c = str.size();
  for (i = 0; i <= c; ++i) {
    if (i == c || str[i] == s) {
      size_t len = i - last;
      STR tmp = str.substr(last, len);
      if (trim_whitespace) {
        STR t_tmp;
        TrimWhitespace(tmp, TRIM_ALL, &t_tmp);
        r->push_back(t_tmp);
      } else {
        r->push_back(tmp);
      }
      last = i + 1;
    }
  }
}

void SplitString(const std::wstring& str,
                 wchar_t s,
                 std::vector<std::wstring>* r) {
  SplitStringT(str, s, true, r);
}

#if !defined(WCHAR_T_IS_UTF16)
void SplitString(const string16& str,
                 char16 s,
                 std::vector<string16>* r) {
  SplitStringT(str, s, true, r);
}
#endif

void SplitString(const std::string& str,
                 char s,
                 std::vector<std::string>* r) {
  SplitStringT(str, s, true, r);
}

void SplitStringDontTrim(const std::wstring& str,
                         wchar_t s,
                         std::vector<std::wstring>* r) {
  SplitStringT(str, s, false, r);
}

#if !defined(WCHAR_T_IS_UTF16)
void SplitStringDontTrim(const string16& str,
                         char16 s,
                         std::vector<string16>* r) {
  SplitStringT(str, s, false, r);
}
#endif

void SplitStringDontTrim(const std::string& str,
                         char s,
                         std::vector<std::string>* r) {
  SplitStringT(str, s, false, r);
}

template <typename STR>
static void SplitStringUsingSubstrT(const STR& str,
                                    const STR& s,
                                    std::vector<STR>* r) {
  typename STR::size_type begin_index = 0;
  while (true) {
    const typename STR::size_type end_index = str.find(s, begin_index);
    if (end_index == STR::npos) {
      const STR term = str.substr(begin_index);
      STR tmp;
      TrimWhitespace(term, TRIM_ALL, &tmp);
      r->push_back(tmp);
      return;
    }
    const STR term = str.substr(begin_index, end_index - begin_index);
    STR tmp;
    TrimWhitespace(term, TRIM_ALL, &tmp);
    r->push_back(tmp);
    begin_index = end_index + s.size();
  }
}

void SplitStringUsingSubstr(const string16& str,
                            const string16& s,
                            std::vector<string16>* r) {
  SplitStringUsingSubstrT(str, s, r);
}

void SplitStringUsingSubstr(const std::string& str,
                            const std::string& s,
                            std::vector<std::string>* r) {
  SplitStringUsingSubstrT(str, s, r);
}

template<typename STR>
static size_t TokenizeT(const STR& str,
                        const STR& delimiters,
                        std::vector<STR>* tokens) {
  tokens->clear();

  typename STR::size_type start = str.find_first_not_of(delimiters);
  while (start != STR::npos) {
    typename STR::size_type end = str.find_first_of(delimiters, start + 1);
    if (end == STR::npos) {
      tokens->push_back(str.substr(start));
      break;
    } else {
      tokens->push_back(str.substr(start, end - start));
      start = str.find_first_not_of(delimiters, end + 1);
    }
  }

  return tokens->size();
}

size_t Tokenize(const std::wstring& str,
                const std::wstring& delimiters,
                std::vector<std::wstring>* tokens) {
  return TokenizeT(str, delimiters, tokens);
}

#if !defined(WCHAR_T_IS_UTF16)
size_t Tokenize(const string16& str,
                const string16& delimiters,
                std::vector<string16>* tokens) {
  return TokenizeT(str, delimiters, tokens);
}
#endif

size_t Tokenize(const std::string& str,
                const std::string& delimiters,
                std::vector<std::string>* tokens) {
  return TokenizeT(str, delimiters, tokens);
}

size_t Tokenize(const base::StringPiece& str,
                const base::StringPiece& delimiters,
                std::vector<base::StringPiece>* tokens) {
  return TokenizeT(str, delimiters, tokens);
}

template<typename STR>
static STR JoinStringT(const std::vector<STR>& parts,
                       typename STR::value_type sep) {
  if (parts.size() == 0) return STR();

  STR result(parts[0]);
  typename std::vector<STR>::const_iterator iter = parts.begin();
  ++iter;

  for (; iter != parts.end(); ++iter) {
    result += sep;
    result += *iter;
  }

  return result;
}

std::string JoinString(const std::vector<std::string>& parts, char sep) {
  return JoinStringT(parts, sep);
}

#if !defined(WCHAR_T_IS_UTF16)
string16 JoinString(const std::vector<string16>& parts, char16 sep) {
  return JoinStringT(parts, sep);
}
#endif

std::wstring JoinString(const std::vector<std::wstring>& parts, wchar_t sep) {
  return JoinStringT(parts, sep);
}

template<typename STR>
void SplitStringAlongWhitespaceT(const STR& str, std::vector<STR>* result) {
  const size_t length = str.length();
  if (!length)
    return;

  bool last_was_ws = false;
  size_t last_non_ws_start = 0;
  for (size_t i = 0; i < length; ++i) {
    switch (str[i]) {
      // HTML 5 defines whitespace as: space, tab, LF, line tab, FF, or CR.
      case L' ':
      case L'\t':
      case L'\xA':
      case L'\xB':
      case L'\xC':
      case L'\xD':
        if (!last_was_ws) {
          if (i > 0) {
            result->push_back(
                str.substr(last_non_ws_start, i - last_non_ws_start));
          }
          last_was_ws = true;
        }
        break;

      default:  // Not a space character.
        if (last_was_ws) {
          last_was_ws = false;
          last_non_ws_start = i;
        }
        break;
    }
  }
  if (!last_was_ws) {
    result->push_back(
        str.substr(last_non_ws_start, length - last_non_ws_start));
  }
}

void SplitStringAlongWhitespace(const std::wstring& str,
                                std::vector<std::wstring>* result) {
  SplitStringAlongWhitespaceT(str, result);
}

#if !defined(WCHAR_T_IS_UTF16)
void SplitStringAlongWhitespace(const string16& str,
                                std::vector<string16>* result) {
  SplitStringAlongWhitespaceT(str, result);
}
#endif

void SplitStringAlongWhitespace(const std::string& str,
                                std::vector<std::string>* result) {
  SplitStringAlongWhitespaceT(str, result);
}

template<class FormatStringType, class OutStringType>
OutStringType DoReplaceStringPlaceholders(const FormatStringType& format_string,
    const std::vector<OutStringType>& subst, std::vector<size_t>* offsets) {
  size_t substitutions = subst.size();
  DCHECK(substitutions < 10);

  size_t sub_length = 0;
  for (typename std::vector<OutStringType>::const_iterator iter = subst.begin();
       iter != subst.end(); ++iter) {
    sub_length += (*iter).length();
  }

  OutStringType formatted;
  formatted.reserve(format_string.length() + sub_length);

  std::vector<ReplacementOffset> r_offsets;
  for (typename FormatStringType::const_iterator i = format_string.begin();
       i != format_string.end(); ++i) {
    if ('$' == *i) {
      if (i + 1 != format_string.end()) {
        ++i;
        DCHECK('$' == *i || '1' <= *i) << "Invalid placeholder: " << *i;
        if ('$' == *i) {
          formatted.push_back('$');
        } else {
          uintptr_t index = *i - '1';
          if (offsets) {
            ReplacementOffset r_offset(index,
                static_cast<int>(formatted.size()));
            r_offsets.insert(std::lower_bound(r_offsets.begin(),
                r_offsets.end(), r_offset,
                &CompareParameter),
                r_offset);
          }
          if (index < substitutions)
            formatted.append(subst.at(index));
        }
      }
    } else {
      formatted.push_back(*i);
    }
  }
  if (offsets) {
    for (std::vector<ReplacementOffset>::const_iterator i = r_offsets.begin();
        i != r_offsets.end(); ++i) {
      offsets->push_back(i->offset);
    }
  }
  return formatted;
}

string16 ReplaceStringPlaceholders(const string16& format_string,
                                   const std::vector<string16>& subst,
                                   std::vector<size_t>* offsets) {
  return DoReplaceStringPlaceholders(format_string, subst, offsets);
}

std::string ReplaceStringPlaceholders(const base::StringPiece& format_string,
                                      const std::vector<std::string>& subst,
                                      std::vector<size_t>* offsets) {
  return DoReplaceStringPlaceholders(format_string, subst, offsets);
}

string16 ReplaceStringPlaceholders(const string16& format_string,
                                   const string16& a,
                                   size_t* offset) {
  std::vector<size_t> offsets;
  std::vector<string16> subst;
  subst.push_back(a);
  string16 result = ReplaceStringPlaceholders(format_string, subst, &offsets);

  DCHECK(offsets.size() == 1);
  if (offset) {
    *offset = offsets[0];
  }
  return result;
}

template <class CHAR>
static bool IsWildcard(CHAR character) {
  return character == '*' || character == '?';
}

// Move the strings pointers to the point where they start to differ.
template <class CHAR>
static void EatSameChars(const CHAR** pattern, const CHAR** string) {
  bool escaped = false;
  while (**pattern && **string) {
    if (!escaped && IsWildcard(**pattern)) {
      // We don't want to match wildcard here, except if it's escaped.
      return;
    }

    // Check if the escapement char is found. If so, skip it and move to the
    // next character.
    if (!escaped && **pattern == L'\\') {
      escaped = true;
      (*pattern)++;
      continue;
    }

    // Check if the chars match, if so, increment the ptrs.
    if (**pattern == **string) {
      (*pattern)++;
      (*string)++;
    } else {
      // Uh ho, it did not match, we are done. If the last char was an
      // escapement, that means that it was an error to advance the ptr here,
      // let's put it back where it was. This also mean that the MatchPattern
      // function will return false because if we can't match an escape char
      // here, then no one will.
      if (escaped) {
        (*pattern)--;
      }
      return;
    }

    escaped = false;
  }
}

template <class CHAR>
static void EatWildcard(const CHAR** pattern) {
  while (**pattern) {
    if (!IsWildcard(**pattern))
      return;
    (*pattern)++;
  }
}

template <class CHAR>
static bool MatchPatternT(const CHAR* eval, const CHAR* pattern, int depth) {
  const int kMaxDepth = 16;
  if (depth > kMaxDepth)
    return false;

  // Eat all the matching chars.
  EatSameChars(&pattern, &eval);

  // If the string is empty, then the pattern must be empty too, or contains
  // only wildcards.
  if (*eval == 0) {
    EatWildcard(&pattern);
    if (*pattern)
      return false;
    return true;
  }

  // Pattern is empty but not string, this is not a match.
  if (*pattern == 0)
    return false;

  // If this is a question mark, then we need to compare the rest with
  // the current string or the string with one character eaten.
  if (pattern[0] == '?') {
    if (MatchPatternT(eval, pattern + 1, depth + 1) ||
        MatchPatternT(eval + 1, pattern + 1, depth + 1))
      return true;
  }

  // This is a *, try to match all the possible substrings with the remainder
  // of the pattern.
  if (pattern[0] == '*') {
    while (*eval) {
      if (MatchPatternT(eval, pattern + 1, depth + 1))
        return true;
      eval++;
    }

    // We reached the end of the string, let see if the pattern contains only
    // wildcards.
    if (*eval == 0) {
      EatWildcard(&pattern);
      if (*pattern)
        return false;
      return true;
    }
  }

  return false;
}

bool MatchPatternWide(const std::wstring& eval, const std::wstring& pattern) {
  return MatchPatternT(eval.c_str(), pattern.c_str(), 0);
}

bool MatchPatternASCII(const std::string& eval, const std::string& pattern) {
  DCHECK(IsStringASCII(eval) && IsStringASCII(pattern));
  return MatchPatternT(eval.c_str(), pattern.c_str(), 0);
}

// The following code is compatible with the OpenBSD lcpy interface.  See:
//   http://www.gratisoft.us/todd/papers/strlcpy.html
//   ftp://ftp.openbsd.org/pub/OpenBSD/src/lib/libc/string/{wcs,str}lcpy.c

namespace {

template <typename CHAR>
size_t lcpyT(CHAR* dst, const CHAR* src, size_t dst_size) {
  for (size_t i = 0; i < dst_size; ++i) {
    if ((dst[i] = src[i]) == 0)  // We hit and copied the terminating NULL.
      return i;
  }

  // We were left off at dst_size.  We over copied 1 byte.  Null terminate.
  if (dst_size != 0)
    dst[dst_size - 1] = 0;

  // Count the rest of the |src|, and return it's length in characters.
  while (src[dst_size]) ++dst_size;
  return dst_size;
}

}  // namespace

size_t base::strlcpy(char* dst, const char* src, size_t dst_size) {
  return lcpyT<char>(dst, src, dst_size);
}
size_t base::wcslcpy(wchar_t* dst, const wchar_t* src, size_t dst_size) {
  return lcpyT<wchar_t>(dst, src, dst_size);
}

bool ElideString(const std::wstring& input, int max_len, std::wstring* output) {
  DCHECK(max_len >= 0);
  if (static_cast<int>(input.length()) <= max_len) {
    output->assign(input);
    return false;
  }

  switch (max_len) {
    case 0:
      output->clear();
      break;
    case 1:
      output->assign(input.substr(0, 1));
      break;
    case 2:
      output->assign(input.substr(0, 2));
      break;
    case 3:
      output->assign(input.substr(0, 1) + L"." +
                     input.substr(input.length() - 1));
      break;
    case 4:
      output->assign(input.substr(0, 1) + L".." +
                     input.substr(input.length() - 1));
      break;
    default: {
      int rstr_len = (max_len - 3) / 2;
      int lstr_len = rstr_len + ((max_len - 3) % 2);
      output->assign(input.substr(0, lstr_len) + L"..." +
                     input.substr(input.length() - rstr_len));
      break;
    }
  }

  return true;
}
