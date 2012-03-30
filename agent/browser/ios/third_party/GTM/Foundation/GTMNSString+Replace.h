//
//  GTMNSString+Replace.h
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

#import <Foundation/Foundation.h>

/// Give easy search-n-replace functionality to NSString.
@interface NSString (GTMStringReplaceAdditions)

#if MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5
// 10.5 has stringByReplacingOccurrencesOfString:withString:, use that directly.

/// Returns a new autoreleased string by replacing all occurrences of
// |oldString| with |newString| (case sensitive).  If |oldString| is nil or
// @"" nothing is done and |self| is returned.  If |newString| is nil, it's
// treated as if |newString| were the empty string, thus effectively
// deleting all occurrences of |oldString| from |self|.
//
// Args:
//   target - the NSString to search for
//   replacement - the NSString to replace |oldString| with
//
// Returns:
//   A new autoreleased NSString
//
- (NSString *)gtm_stringByReplacingString:(NSString *)target
                               withString:(NSString *)replacement;

#endif // MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5

@end
