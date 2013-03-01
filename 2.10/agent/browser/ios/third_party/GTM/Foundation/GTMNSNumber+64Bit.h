//
//  GTMNSNumber+64Bit.h
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
#if GTM_IPHONE_SDK
#import <CoreGraphics/CoreGraphics.h>
#endif  // GTM_IPHONE_SDK

// Adds support for working with NSIntegers, 
// NSUIntegers, CGFloats and NSNumbers (rdar://5812091)
@interface NSNumber (GTM64BitAdditions)

+ (NSNumber *)gtm_numberWithCGFloat:(CGFloat)value;
+ (NSNumber *)gtm_numberWithInteger:(NSInteger)value;
+ (NSNumber *)gtm_numberWithUnsignedInteger:(NSUInteger)value;

- (id)gtm_initWithCGFloat:(CGFloat)value NS_RETURNS_RETAINED NS_CONSUMES_SELF;
- (id)gtm_initWithInteger:(NSInteger)value NS_RETURNS_RETAINED NS_CONSUMES_SELF;
- (id)gtm_initWithUnsignedInteger:(NSUInteger)value NS_RETURNS_RETAINED NS_CONSUMES_SELF;

- (CGFloat)gtm_cgFloatValue;
- (NSInteger)gtm_integerValue;
- (NSUInteger)gtm_unsignedIntegerValue;

@end
