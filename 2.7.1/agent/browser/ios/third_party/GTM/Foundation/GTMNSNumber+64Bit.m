//
//  GTMNSNumber+64Bit.m
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

#import "GTMNSNumber+64Bit.h"

@implementation NSNumber (GTM64BitAdditions)
+ (NSNumber *)gtm_numberWithCGFloat:(CGFloat)value {
  return [[[[self class] alloc] gtm_initWithCGFloat:value] autorelease];
}

+ (NSNumber *)gtm_numberWithInteger:(NSInteger)value {
  return [[[[self class] alloc] gtm_initWithInteger:value] autorelease];
}

+ (NSNumber *)gtm_numberWithUnsignedInteger:(NSUInteger)value {
  return [[[[self class] alloc] gtm_initWithUnsignedInteger:value] autorelease];
}

#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5

- (id)gtm_initWithCGFloat:(CGFloat)value {
  CFNumberRef numberRef = CFNumberCreate(NULL, kCFNumberCGFloatType, &value);
  return NSMakeCollectable(numberRef);
}

- (CGFloat)gtm_cgFloatValue {
  CGFloat value = 0;
  CFNumberGetValue((CFNumberRef)self, kCFNumberCGFloatType, &value);
  return value;
}

- (id)gtm_initWithInteger:(NSInteger)value {
  return [self initWithInteger:value];
}

- (NSInteger)gtm_integerValue {
  return [self integerValue];
}

- (id)gtm_initWithUnsignedInteger:(NSUInteger)value {
  return [self initWithUnsignedInteger:value];
}

- (NSUInteger)gtm_unsignedIntegerValue {
  return [self unsignedIntegerValue];
}

#else  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5

- (id)gtm_initWithCGFloat:(CGFloat)value {
#if defined(__LP64__) && __LP64__
  return [self initWithDouble:value];
#else 
  return [self initWithFloat:value];
#endif  // defined(__LP64__) && __LP64__
}

- (CGFloat)gtm_cgFloatValue {
#if defined(__LP64__) && __LP64__
  return [self doubleValue];
#else 
  return [self floatValue];
#endif  // defined(__LP64__) && __LP64__
}

- (id)gtm_initWithInteger:(NSInteger)value {
  return [self initWithLong:value];
}

- (NSInteger)gtm_integerValue {
  return [self longValue];
}

- (id)gtm_initWithUnsignedInteger:(NSUInteger)value {
  return [self initWithUnsignedLong:value];
}

- (NSUInteger)gtm_unsignedIntegerValue {
  return [self unsignedLongValue];
}

#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
@end
