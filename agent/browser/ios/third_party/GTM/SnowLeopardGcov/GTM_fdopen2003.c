//
//  GTM_fdopen2003.c
//
//  Copyright 2010 Google Inc.
//  Licensed under the Apache License, Version 2.0 (the "License"); you may not
//  use this file except in compliance with the License.  You may obtain a copy
//  of the License at
//
//  http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
//  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
//  License for the specific language governing permissions and limitations under
//  the License.
//

// This file exists because when you build with your SDK set to 10.5 and
// and compiler version set to gcc 4.0 on using Xcode 3.2.2 on Snow Leopard
// you will receive a link error for missing the _fdopen$UNIX2003 symbol.
// See http://code.google.com/p/coverstory/wiki/SnowLeopardGCov
// for more details.

#include <stdio.h>

FILE *fdopen$UNIX2003(int fildes, const char *mode) {
  return fdopen(fildes, mode);
}
