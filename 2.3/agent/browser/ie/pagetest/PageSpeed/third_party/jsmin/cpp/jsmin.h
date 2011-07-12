/*
 * This file contains a C++ port of jsmin.c. The copyright notice
 * below is the copyright notice from jsmin.c.
 */

/* jsmin.c
   2008-08-03

Copyright (c) 2002 Douglas Crockford  (www.crockford.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

#ifndef THIRD_PARTY_JSMIN_CPP_JSMIN_H_
#define THIRD_PARTY_JSMIN_CPP_JSMIN_H_

#include <string>

namespace jsmin {

/**
 * jsmin::MinifyJs is a C++ port of jsmin.c
 * @return true if minification was successful, false otherwise. If
 * false, the output string is not populated.
 */
bool MinifyJs(const std::string& input, std::string* out);

/**
 * jsmin::GetMinifiedJsSize is a C++ port of jsmin.c that only returns
 * the minified size.
 * @return true if minification was successful, false otherwise. If
 * false, the minimized_size is not populated.
 */
bool GetMinifiedJsSize(const std::string& input, int* minimized_size);

}  // namespace jsmin

#endif  // THIRD_PARTY_JSMIN_CPP_JSMIN_H_
