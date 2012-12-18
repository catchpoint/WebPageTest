//
//  GTMFourCharCode
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

#import <Foundation/Foundation.h>

// FourCharCodes are OSTypes, ResTypes etc. This class wraps them if
// you need to store them in dictionaries etc.
@interface GTMFourCharCode : NSObject <NSCopying, NSCoding> {
  FourCharCode code_;
}

// returns a string for a FourCharCode
+ (id)stringWithFourCharCode:(FourCharCode)code;

// String must be 4 chars or less, or you will get nil back.
+ (id)fourCharCodeWithString:(NSString*)string;
+ (id)fourCharCodeWithFourCharCode:(FourCharCode)code;

// String must be 4 chars or less, or you will get nil back.
- (id)initWithString:(NSString*)string;

// Designated Initializer
- (id)initWithFourCharCode:(FourCharCode)code;

// Returns 'APPL' for "APPL"
- (FourCharCode)fourCharCode;

// For FourCharCode of 'APPL' returns "APPL". For 1 returns "\0\0\0\1"
- (NSString*)stringValue;

// For FourCharCode of "APPL" returns an NSNumber with 1095782476 (0x4150504C).
// For 1 returns 1.
- (NSNumber*)numberValue;

@end
