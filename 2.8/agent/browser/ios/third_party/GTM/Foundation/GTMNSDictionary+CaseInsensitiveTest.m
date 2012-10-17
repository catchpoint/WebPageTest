//
//  GTMNSDictionary+CaseInsensitiveTest.m
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

#import "GTMSenTestCase.h"
#import "GTMNSDictionary+CaseInsensitive.h"

@interface GTMNSDictionary_CaseInsensitiveTest : GTMTestCase
@end

@implementation GTMNSDictionary_CaseInsensitiveTest

- (void)testNSDictionaryCaseInsensitiveAdditions {
  NSURL *objKey = [NSURL URLWithString:@"http://WWW.Google.COM/"];
  NSURL *lcObjKey = [NSURL URLWithString:[[objKey absoluteString]
                                          lowercaseString]];

  NSDictionary *dict = [NSDictionary dictionaryWithObjectsAndKeys:
                        @"value", @"key",
                        @"value", @"KEY",
                        @"bar", @"FOO",
                        @"yes", objKey,
                        nil];

  NSDictionary *ciDict =
      [NSDictionary gtm_dictionaryWithDictionaryCaseInsensitive:dict];

  STAssertNotNil(ciDict, @"gtm_dictionaryWithDictionaryCaseInsensitive failed");

  STAssertTrue([ciDict count] == 3,
               @"wrong count, multiple 'key' entries should be folded.");

  STAssertEqualStrings([ciDict objectForKey:@"foo"], @"bar",
                       @"case insensitive key lookup failed");

  STAssertEqualStrings([ciDict objectForKey:@"kEy"], @"value",
                       @"case insensitive key lookup failed");

  STAssertNotNil([ciDict objectForKey:objKey],
                 @"exact matches on non-NSString objects should still work.");

  STAssertNil([ciDict objectForKey:lcObjKey],
              @"only NSString and subclasses are case-insensitive.");

  STAssertNotNil([NSDictionary gtm_dictionaryWithDictionaryCaseInsensitive:
                  [NSDictionary dictionary]],
                 @"empty dictionary should not return nil");

  STAssertNotNil([NSDictionary gtm_dictionaryWithDictionaryCaseInsensitive:
                  nil],
                 @"nil dictionary should return empty dictionary");

  STAssertNotNil([[[NSDictionary alloc] gtm_initWithDictionaryCaseInsensitive:
                   nil] autorelease],
                 @"nil dictionary should return empty dictionary");
}

- (void)testNSMutableDictionaryCaseInsensitiveAdditions {
  NSURL *objKey = [NSURL URLWithString:@"http://WWW.Google.COM/"];
  NSURL *lcObjKey = [NSURL URLWithString:[[objKey absoluteString]
                                          lowercaseString]];

  NSDictionary *dict = [NSDictionary dictionaryWithObjectsAndKeys:
                        @"value", @"key",
                        @"value", @"KEY",
                        @"bar", @"FOO",
                        @"yes", objKey,
                        nil];

  NSMutableDictionary *ciDict =
      [NSMutableDictionary gtm_dictionaryWithDictionaryCaseInsensitive:dict];

  STAssertNotNil(ciDict, @"gtm_dictionaryWithDictionaryCaseInsensitive failed");

  STAssertTrue([ciDict count] == 3,
               @"wrong count, multiple 'key' entries should be folded.");

  STAssertEqualStrings([ciDict objectForKey:@"foo"], @"bar",
                       @"case insensitive key lookup failed");

  STAssertEqualStrings([ciDict objectForKey:@"kEy"], @"value",
                       @"case insensitive key lookup failed");

  STAssertNotNil([ciDict objectForKey:objKey],
                 @"exact matches on non-NSString objects should still work.");

  STAssertNil([ciDict objectForKey:lcObjKey],
              @"only NSString and subclasses are case-insensitive.");

  NSObject *obj = [[[NSObject alloc] init] autorelease];
  [ciDict setObject:obj forKey:@"kEy"];
  STAssertEquals([ciDict objectForKey:@"key"], obj,
                 @"mutable dictionary value not overwritten");

  STAssertNotNil(
      [NSMutableDictionary gtm_dictionaryWithDictionaryCaseInsensitive:
       [NSDictionary dictionary]],
      @"empty dictionary should not return nil");

  STAssertNotNil(
      [NSMutableDictionary gtm_dictionaryWithDictionaryCaseInsensitive:nil],
      @"nil dictionary should return empty dictionary");
}

@end
