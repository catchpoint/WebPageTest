//
//  GTMNSString+Replace.m
//
//  Copyright 2006-2008 Google Inc.
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

#import "GTMNSString+Replace.h"


@implementation NSString (GTMStringReplaceAdditions)

#if MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5
// 10.5 has stringByReplacingOccurrencesOfString:withString:, use that directly.

- (NSString *)gtm_stringByReplacingString:(NSString *)target
                               withString:(NSString *)replacement {
  // If |target| was nil, then do nothing and return |self|
  //
  // We do the retain+autorelease dance here because of this use case:
  //   NSString *s1 = [[NSString alloc] init...];
  //   NSString *s2 = [s1 stringByReplacingString:@"foo" withString:@"bar"];
  //   [s1 release];  // |s2| still needs to be valid after this line
  if (!target)
    return [[self retain] autorelease];
  
  // If |replacement| is nil we want it to be treated as if @"" was specified
  // ... effectively removing |target| from self
  if (!replacement)
    replacement = @"";
  
  NSMutableString *result = [[self mutableCopy] autorelease];
  [result replaceOccurrencesOfString:target
                          withString:replacement
                             options:0
                               range:NSMakeRange(0, [result length])];
  return result;
}

#endif // MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5

@end
