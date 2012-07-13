//
//  GTMFourCharCode.m
//  Wrapper for FourCharCodes
//
//  Copyright 2008 Google Inc.
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

#import "GTMDefines.h"
#import "GTMFourCharCode.h"
#import "GTMGarbageCollection.h"
#import <CoreServices/CoreServices.h>

@implementation GTMFourCharCode

+ (id)stringWithFourCharCode:(FourCharCode)code {
  return GTMCFAutorelease(UTCreateStringForOSType(code));
}

+ (id)fourCharCodeWithString:(NSString*)string {
  return [[[self alloc] initWithString:string] autorelease];
}

+ (id)fourCharCodeWithFourCharCode:(FourCharCode)code {
  return [[[self alloc] initWithFourCharCode:code] autorelease];
}

- (id)initWithString:(NSString*)string {
  NSUInteger length = [string length];
  if (length == 0 || length > 4) {
    [self release];
    return nil;
  } else {
    return [self initWithFourCharCode:UTGetOSTypeFromString((CFStringRef)string)];
  }
}

- (id)initWithFourCharCode:(FourCharCode)code {
  if ((self = [super init])) {
    code_ = code;
  }
  return self;
}

- (id)initWithCoder:(NSCoder *)aDecoder {
  if ((self = [super init])) {
    code_ = [aDecoder decodeInt32ForKey:@"FourCharCode"];
  }
  return self;
}

- (void)encodeWithCoder:(NSCoder *)aCoder {
  [aCoder encodeInt32:code_ forKey:@"FourCharCode"];
}

- (id)copyWithZone:(NSZone *)zone {
  return [[[self class] alloc] initWithFourCharCode:code_];
}

- (BOOL)isEqual:(id)object {
  return [object isKindOfClass:[self class]] && [object fourCharCode] == code_;
}

- (NSUInteger)hash {
  return (NSUInteger)code_;
}

- (NSString *)description {
  return [NSString stringWithFormat:@"%@ - %@ (0x%X)", 
          [self class],
          [self stringValue],
          code_];
}

- (FourCharCode)fourCharCode {
  return code_;
}

- (NSString*)stringValue {
  return GTMCFAutorelease(UTCreateStringForOSType(code_));
}

- (NSNumber*)numberValue {
  return [NSNumber numberWithUnsignedInt:code_];
}

@end
