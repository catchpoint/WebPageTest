//
//  GTMNSDictionary+CaseInsensitive.h
//
//  Copyright 2009 Google Inc.
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
#import "GTMDefines.h"

/// Utility for building case-insensitive NSDictionary objects.
@interface NSDictionary (GTMNSDictionaryCaseInsensitiveAdditions)

/// Initializes an NSDictionary with a case-insensitive comparison function
/// for NSString keys, while non-NSString keys are treated normally.
///
/// The case for NSString keys is preserved, though duplicate keys (when
/// compared in a case-insensitive fashion) have one of their values dropped
/// arbitrarily.
///
/// An example of use with HTTP headers in an NSHTTPURLResponse object:
///
/// NSDictionary *headers =
///     [NSDictionary gtm_dictionaryWithDictionaryCaseInsensitive:
///      [response allHeaderFields]];
/// NSString *contentType = [headers objectForKey:@"Content-Type"];
- (id)gtm_initWithDictionaryCaseInsensitive:(NSDictionary *)dictionary 
    NS_RETURNS_RETAINED NS_CONSUMES_SELF;

/// Returns a newly created and autoreleased NSDictionary object as above.
+ (id)gtm_dictionaryWithDictionaryCaseInsensitive:(NSDictionary *)dictionary;

@end
