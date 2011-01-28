// Copyright (c) 2010 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "base/string_number_conversions.h"

#include <errno.h>
#include <stdlib.h>

#include "base/logging.h"
#include "base/third_party/dmg_fp/dmg_fp.h"
#include "base/utf_string_conversions.h"

namespace base {

namespace {

template <typename STR, typename INT, typename UINT, bool NEG>
struct IntToStringT {
  // This is to avoid a compiler warning about unary minus on unsigned type.
  // For example, say you had the following code:
  //   template <typename INT>
  //   INT abs(INT value) { return value < 0 ? -value : value; }
  // Even though if INT is unsigned, it's impossible for value < 0, so the
  // unary minus will never be taken, the compiler will still generate a
  // warning.  We do a little specialization dance...
  template <typename INT2, typename UINT2, bool NEG2>
  struct ToUnsignedT {};

  template <typename INT2, typename UINT2>
  struct ToUnsignedT<INT2, UINT2, false> {
    static UINT2 ToUnsigned(INT2 value) {
      return static_cast<UINT2>(value);
    }
  };

  template <typename INT2, typename UINT2>
  struct ToUnsignedT<INT2, UINT2, true> {
    static UINT2 ToUnsigned(INT2 value) {
      return static_cast<UINT2>(value < 0 ? -value : value);
    }
  };

  // This set of templates is very similar to the above templates, but
  // for testing whether an integer is negative.
  template <typename INT2, bool NEG2>
  struct TestNegT {};
  template <typename INT2>
  struct TestNegT<INT2, false> {
    static bool TestNeg(INT2 value) {
      // value is unsigned, and can never be negative.
      return false;
    }
  };
  template <typename INT2>
  struct TestNegT<INT2, true> {
    static bool TestNeg(INT2 value) {
      return value < 0;
    }
  };

  static STR IntToString(INT value) {
    // log10(2) ~= 0.3 bytes needed per bit or per byte log10(2**8) ~= 2.4.
    // So round up to allocate 3 output characters per byte, plus 1 for '-'.
    const int kOutputBufSize = 3 * sizeof(INT) + 1;

    // Allocate the whole string right away, we will right back to front, and
    // then return the substr of what we ended up using.
    STR outbuf(kOutputBufSize, 0);

    bool is_neg = TestNegT<INT, NEG>::TestNeg(value);
    // Even though is_neg will never be true when INT is parameterized as
    // unsigned, even the presence of the unary operation causes a warning.
    UINT res = ToUnsignedT<INT, UINT, NEG>::ToUnsigned(value);

    for (typename STR::iterator it = outbuf.end();;) {
      --it;
      DCHECK(it != outbuf.begin());
      *it = static_cast<typename STR::value_type>((res % 10) + '0');
      res /= 10;

      // We're done..
      if (res == 0) {
        if (is_neg) {
          --it;
          DCHECK(it != outbuf.begin());
          *it = static_cast<typename STR::value_type>('-');
        }
        return STR(it, outbuf.end());
      }
    }
    NOTREACHED();
    return STR();
  }
};

// Generalized string-to-number conversion.
//
// StringToNumberTraits should provide:
//  - a typedef for string_type, the STL string type used as input.
//  - a typedef for value_type, the target numeric type.
//  - a static function, convert_func, which dispatches to an appropriate
//    strtol-like function and returns type value_type.
//  - a static function, valid_func, which validates |input| and returns a bool
//    indicating whether it is in proper form.  This is used to check for
//    conditions that convert_func tolerates but should result in
//    StringToNumber returning false.  For strtol-like funtions, valid_func
//    should check for leading whitespace.
template<typename StringToNumberTraits>
bool StringToNumber(const typename StringToNumberTraits::string_type& input,
                    typename StringToNumberTraits::value_type* output) {
  typedef StringToNumberTraits traits;

  errno = 0;  // Thread-safe?  It is on at least Mac, Linux, and Windows.
  typename traits::string_type::value_type* endptr = NULL;
  typename traits::value_type value = traits::convert_func(input.c_str(),
                                                           &endptr);
  *output = value;

  // Cases to return false:
  //  - If errno is ERANGE, there was an overflow or underflow.
  //  - If the input string is empty, there was nothing to parse.
  //  - If endptr does not point to the end of the string, there are either
  //    characters remaining in the string after a parsed number, or the string
  //    does not begin with a parseable number.  endptr is compared to the
  //    expected end given the string's stated length to correctly catch cases
  //    where the string contains embedded NUL characters.
  //  - valid_func determines that the input is not in preferred form.
  return errno == 0 &&
         !input.empty() &&
         input.c_str() + input.length() == endptr &&
         traits::valid_func(input);
}

static int strtoi(const char *nptr, char **endptr, int base) {
  long res = strtol(nptr, endptr, base);
#if __LP64__
  // Long is 64-bits, we have to handle under/overflow ourselves.
  if (res > kint32max) {
    res = kint32max;
    errno = ERANGE;
  } else if (res < kint32min) {
    res = kint32min;
    errno = ERANGE;
  }
#endif
  return static_cast<int>(res);
}

static unsigned int strtoui(const char *nptr, char **endptr, int base) {
  unsigned long res = strtoul(nptr, endptr, base);
#if __LP64__
  // Long is 64-bits, we have to handle under/overflow ourselves.  Test to see
  // if the result can fit into 32-bits (as signed or unsigned).
  if (static_cast<int>(static_cast<long>(res)) != static_cast<long>(res) &&
      static_cast<unsigned int>(res) != res) {
    res = kuint32max;
    errno = ERANGE;
  }
#endif
  return static_cast<unsigned int>(res);
}

class StringToIntTraits {
 public:
  typedef std::string string_type;
  typedef int value_type;
  static const int kBase = 10;
  static inline value_type convert_func(const string_type::value_type* str,
                                        string_type::value_type** endptr) {
    return strtoi(str, endptr, kBase);
  }
  static inline bool valid_func(const string_type& str) {
    return !str.empty() && !isspace(str[0]);
  }
};

class String16ToIntTraits {
 public:
  typedef string16 string_type;
  typedef int value_type;
  static const int kBase = 10;
  static inline value_type convert_func(const string_type::value_type* str,
                                        string_type::value_type** endptr) {
#if defined(WCHAR_T_IS_UTF16)
    return wcstol(str, endptr, kBase);
#elif defined(WCHAR_T_IS_UTF32)
    std::string ascii_string = UTF16ToUTF8(string16(str));
    char* ascii_end = NULL;
    value_type ret = strtoi(ascii_string.c_str(), &ascii_end, kBase);
    if (ascii_string.c_str() + ascii_string.length() == ascii_end) {
      *endptr =
          const_cast<string_type::value_type*>(str) + ascii_string.length();
    }
    return ret;
#endif
  }
  static inline bool valid_func(const string_type& str) {
    return !str.empty() && !iswspace(str[0]);
  }
};

class StringToInt64Traits {
 public:
  typedef std::string string_type;
  typedef int64 value_type;
  static const int kBase = 10;
  static inline value_type convert_func(const string_type::value_type* str,
                                        string_type::value_type** endptr) {
#ifdef OS_WIN
    return _strtoi64(str, endptr, kBase);
#else  // assume OS_POSIX
    return strtoll(str, endptr, kBase);
#endif
  }
  static inline bool valid_func(const string_type& str) {
    return !str.empty() && !isspace(str[0]);
  }
};

class String16ToInt64Traits {
 public:
  typedef string16 string_type;
  typedef int64 value_type;
  static const int kBase = 10;
  static inline value_type convert_func(const string_type::value_type* str,
                                        string_type::value_type** endptr) {
#ifdef OS_WIN
    return _wcstoi64(str, endptr, kBase);
#else  // assume OS_POSIX
    std::string ascii_string = UTF16ToUTF8(string16(str));
    char* ascii_end = NULL;
    value_type ret = strtoll(ascii_string.c_str(), &ascii_end, kBase);
    if (ascii_string.c_str() + ascii_string.length() == ascii_end) {
      *endptr =
          const_cast<string_type::value_type*>(str) + ascii_string.length();
    }
    return ret;
#endif
  }
  static inline bool valid_func(const string_type& str) {
    return !str.empty() && !iswspace(str[0]);
  }
};

// For the HexString variants, use the unsigned variants like strtoul for
// convert_func so that input like "0x80000000" doesn't result in an overflow.

class HexStringToIntTraits {
 public:
  typedef std::string string_type;
  typedef int value_type;
  static const int kBase = 16;
  static inline value_type convert_func(const string_type::value_type* str,
                                        string_type::value_type** endptr) {
    return strtoui(str, endptr, kBase);
  }
  static inline bool valid_func(const string_type& str) {
    return !str.empty() && !isspace(str[0]);
  }
};

class StringToDoubleTraits {
 public:
  typedef std::string string_type;
  typedef double value_type;
  static inline value_type convert_func(const string_type::value_type* str,
                                        string_type::value_type** endptr) {
    return dmg_fp::strtod(str, endptr);
  }
  static inline bool valid_func(const string_type& str) {
    return !str.empty() && !isspace(str[0]);
  }
};

template<class CHAR>
bool HexDigitToIntT(const CHAR digit, uint8* val) {
  if (digit >= '0' && digit <= '9')
    *val = digit - '0';
  else if (digit >= 'a' && digit <= 'f')
    *val = 10 + digit - 'a';
  else if (digit >= 'A' && digit <= 'F')
    *val = 10 + digit - 'A';
  else
    return false;
  return true;
}

template<typename STR>
bool HexStringToBytesT(const STR& input, std::vector<uint8>* output) {
  DCHECK(output->size() == 0);
  size_t count = input.size();
  if (count == 0 || (count % 2) != 0)
    return false;
  for (uintptr_t i = 0; i < count / 2; ++i) {
    uint8 msb = 0;  // most significant 4 bits
    uint8 lsb = 0;  // least significant 4 bits
    if (!HexDigitToIntT(input[i * 2], &msb) ||
        !HexDigitToIntT(input[i * 2 + 1], &lsb))
      return false;
    output->push_back((msb << 4) | lsb);
  }
  return true;
}

}  // namespace

std::string IntToString(int value) {
  return IntToStringT<std::string, int, unsigned int, true>::
      IntToString(value);
}

string16 IntToString16(int value) {
  return IntToStringT<string16, int, unsigned int, true>::
      IntToString(value);
}

std::string UintToString(unsigned int value) {
  return IntToStringT<std::string, unsigned int, unsigned int, false>::
      IntToString(value);
}

string16 UintToString16(unsigned int value) {
  return IntToStringT<string16, unsigned int, unsigned int, false>::
      IntToString(value);
}

std::string Int64ToString(int64 value) {
  return IntToStringT<std::string, int64, uint64, true>::
      IntToString(value);
}

string16 Int64ToString16(int64 value) {
  return IntToStringT<string16, int64, uint64, true>::IntToString(value);
}

std::string Uint64ToString(uint64 value) {
  return IntToStringT<std::string, uint64, uint64, false>::
      IntToString(value);
}

string16 Uint64ToString16(uint64 value) {
  return IntToStringT<string16, uint64, uint64, false>::
      IntToString(value);
}

std::string DoubleToString(double value) {
  // According to g_fmt.cc, it is sufficient to declare a buffer of size 32.
  char buffer[32];
  dmg_fp::g_fmt(buffer, value);
  return std::string(buffer);
}

bool StringToInt(const std::string& input, int* output) {
  return StringToNumber<StringToIntTraits>(input, output);
}

bool StringToInt(const string16& input, int* output) {
  return StringToNumber<String16ToIntTraits>(input, output);
}

bool StringToInt64(const std::string& input, int64* output) {
  return StringToNumber<StringToInt64Traits>(input, output);
}

bool StringToInt64(const string16& input, int64* output) {
  return StringToNumber<String16ToInt64Traits>(input, output);
}

bool StringToDouble(const std::string& input, double* output) {
  return StringToNumber<StringToDoubleTraits>(input, output);
}

// Note: if you need to add String16ToDouble, first ask yourself if it's
// really necessary. If it is, probably the best implementation here is to
// convert to 8-bit and then use the 8-bit version.

std::string HexEncode(const void* bytes, size_t size) {
  static const char kHexChars[] = "0123456789ABCDEF";

  // Each input byte creates two output hex characters.
  std::string ret(size * 2, '\0');

  for (size_t i = 0; i < size; ++i) {
    char b = reinterpret_cast<const char*>(bytes)[i];
    ret[(i * 2)] = kHexChars[(b >> 4) & 0xf];
    ret[(i * 2) + 1] = kHexChars[b & 0xf];
  }
  return ret;
}

bool HexStringToInt(const std::string& input, int* output) {
  return StringToNumber<HexStringToIntTraits>(input, output);
}

bool HexStringToBytes(const std::string& input, std::vector<uint8>* output) {
  return HexStringToBytesT(input, output);
}

}  // namespace base

