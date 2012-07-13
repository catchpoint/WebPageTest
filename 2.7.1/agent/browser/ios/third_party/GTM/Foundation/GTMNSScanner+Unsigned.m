//
//  GTMNSScanner+Unsigned.m
//
//  Copyright 2010 Google Inc.
//
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

#import "GTMNSScanner+Unsigned.h"
#include <stdlib.h>
#include <limits.h>

@implementation NSScanner (GTMUnsignedAdditions)

- (BOOL)gtm_scanUnsignedInt:(unsigned int *)value {
  unsigned long long uLongLongValue = 0;
  BOOL wasGood = [self gtm_scanUnsignedLongLong:&uLongLongValue];
  if (wasGood && value) {
    if (uLongLongValue > UINT_MAX) {
      *value = UINT_MAX;
    } else {
      *value = (unsigned int)uLongLongValue;
    }
  }
  return wasGood;
}

- (BOOL)gtm_scanUInteger:(NSUInteger *)value {
#if defined(__LP64__) && __LP64__
  return [self gtm_scanUnsignedLongLong:(unsigned long long*)value];
#else 
  return [self gtm_scanUnsignedInt:value];
#endif //  defined(__LP64__) && __LP64__
}

- (BOOL)gtm_scanUnsignedLongLong:(unsigned long long *)value {
  // Slow path
  NSCharacterSet *decimalSet = [NSCharacterSet decimalDigitCharacterSet];
  NSString *digitString = nil;
  BOOL wasGood = [self scanCharactersFromSet:decimalSet intoString:&digitString];
  if (wasGood) {
    const char *digitChars = [digitString UTF8String];
    if (value) {
      *value = strtoull(digitChars, NULL, 10);
    }
  }
  return wasGood;
}

@end
