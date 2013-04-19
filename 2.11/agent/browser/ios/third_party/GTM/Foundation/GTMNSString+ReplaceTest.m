//
//  GTMNSString+ReplaceTest.m
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

#import "GTMSenTestCase.h"
#import "GTMNSString+Replace.h"

@interface GTMNSString_ReplaceTest : GTMTestCase
@end

@implementation GTMNSString_ReplaceTest

#if MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5

- (void)testStringByReplacingStringWithString {
  NSString *testString = @"a bc debc gh";
  NSString *result;
  
  result = [testString gtm_stringByReplacingString:@"bc" withString:@"BC"];
  STAssertEqualObjects(@"a BC deBC gh", result,
                       @"'bc' wasn't replaced with 'BC'");
  
  result = [testString gtm_stringByReplacingString:@"bc" withString:@""];
  STAssertEqualObjects(@"a  de gh", result, @"'bc' wasn't replaced with ''");
  
  result = [testString gtm_stringByReplacingString:@"bc" withString:nil];
  STAssertEqualObjects(@"a  de gh", result, @"'bc' wasn't replaced with (nil)");
  
  result = [testString gtm_stringByReplacingString:@" " withString:@"S"];
  STAssertEqualObjects(@"aSbcSdebcSgh", result, @"' ' wasn't replaced with 'S'");
 
  result = [testString gtm_stringByReplacingString:nil withString:@"blah"];
  STAssertEqualObjects(testString, result, @"(nil) wasn't replaced with 'blah'");
  
  result = [testString gtm_stringByReplacingString:nil withString:nil];
  STAssertEqualObjects(testString, result, @"(nil) wasn't replaced with (nil)");
  
  result = [testString gtm_stringByReplacingString:@"" withString:@"X"];
  STAssertEqualObjects(testString, result,
                       @"replacing '' with anything should yield the original string");
}

#endif // MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5

@end
