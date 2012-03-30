//
//  GTMNSString+URLArgumentsTest.m
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
#import "GTMNSString+URLArguments.h"

@interface GTMNSString_URLArgumentsTest : GTMTestCase
@end

@implementation GTMNSString_URLArgumentsTest


- (void)testEscaping {
  // should be done already by the basic code
  STAssertEqualObjects([@"this that" gtm_stringByEscapingForURLArgument], @"this%20that", @"- space should be escaped");
  STAssertEqualObjects([@"this\"that" gtm_stringByEscapingForURLArgument], @"this%22that", @"- double quote should be escaped");
  // make sure our additions are handled
  STAssertEqualObjects([@"this!that" gtm_stringByEscapingForURLArgument], @"this%21that", @"- exclamation mark should be escaped");
  STAssertEqualObjects([@"this*that" gtm_stringByEscapingForURLArgument], @"this%2Athat", @"- asterisk should be escaped");
  STAssertEqualObjects([@"this'that" gtm_stringByEscapingForURLArgument], @"this%27that", @"- single quote should be escaped");
  STAssertEqualObjects([@"this(that" gtm_stringByEscapingForURLArgument], @"this%28that", @"- left paren should be escaped");
  STAssertEqualObjects([@"this)that" gtm_stringByEscapingForURLArgument], @"this%29that", @"- right paren should be escaped");
  STAssertEqualObjects([@"this;that" gtm_stringByEscapingForURLArgument], @"this%3Bthat", @"- semi-colon should be escaped");
  STAssertEqualObjects([@"this:that" gtm_stringByEscapingForURLArgument], @"this%3Athat", @"- colon should be escaped");
  STAssertEqualObjects([@"this@that" gtm_stringByEscapingForURLArgument], @"this%40that", @"- at sign should be escaped");
  STAssertEqualObjects([@"this&that" gtm_stringByEscapingForURLArgument], @"this%26that", @"- ampersand should be escaped");
  STAssertEqualObjects([@"this=that" gtm_stringByEscapingForURLArgument], @"this%3Dthat", @"- equals should be escaped");
  STAssertEqualObjects([@"this+that" gtm_stringByEscapingForURLArgument], @"this%2Bthat", @"- plus should be escaped");
  STAssertEqualObjects([@"this$that" gtm_stringByEscapingForURLArgument], @"this%24that", @"- dollar-sign should be escaped");
  STAssertEqualObjects([@"this,that" gtm_stringByEscapingForURLArgument], @"this%2Cthat", @"- comma should be escaped");
  STAssertEqualObjects([@"this/that" gtm_stringByEscapingForURLArgument], @"this%2Fthat", @"- slash should be escaped");
  STAssertEqualObjects([@"this?that" gtm_stringByEscapingForURLArgument], @"this%3Fthat", @"- question mark should be escaped");
  STAssertEqualObjects([@"this%that" gtm_stringByEscapingForURLArgument], @"this%25that", @"- percent should be escaped");
  STAssertEqualObjects([@"this#that" gtm_stringByEscapingForURLArgument], @"this%23that", @"- pound should be escaped");
  STAssertEqualObjects([@"this[that" gtm_stringByEscapingForURLArgument], @"this%5Bthat", @"- left bracket should be escaped");
  STAssertEqualObjects([@"this]that" gtm_stringByEscapingForURLArgument], @"this%5Dthat", @"- right bracket should be escaped");
  // make sure plus and space are handled in the right order
  STAssertEqualObjects([@"this that+the other" gtm_stringByEscapingForURLArgument], @"this%20that%2Bthe%20other", @"- pluses and spaces should be different");
  // high char test
  NSString *tester = [NSString stringWithUTF8String:"caf\xC3\xA9"];
  STAssertNotNil(tester, @"failed to create from utf8 run");
  STAssertEqualObjects([tester gtm_stringByEscapingForURLArgument], @"caf%C3%A9", @"- high chars should work");
}

- (void)testUnescaping {
  // should be done already by the basic code
  STAssertEqualObjects([@"this%20that" gtm_stringByUnescapingFromURLArgument], @"this that", @"- space should be unescaped");
  STAssertEqualObjects([@"this%22that" gtm_stringByUnescapingFromURLArgument], @"this\"that", @"- double quote should be unescaped");
  // make sure our additions are handled
  STAssertEqualObjects([@"this%21that" gtm_stringByUnescapingFromURLArgument], @"this!that", @"- exclamation mark should be unescaped");
  STAssertEqualObjects([@"this%2Athat" gtm_stringByUnescapingFromURLArgument], @"this*that", @"- asterisk should be unescaped");
  STAssertEqualObjects([@"this%27that" gtm_stringByUnescapingFromURLArgument], @"this'that", @"- single quote should be unescaped");
  STAssertEqualObjects([@"this%28that" gtm_stringByUnescapingFromURLArgument], @"this(that", @"- left paren should be unescaped");
  STAssertEqualObjects([@"this%29that" gtm_stringByUnescapingFromURLArgument], @"this)that", @"- right paren should be unescaped");
  STAssertEqualObjects([@"this%3Bthat" gtm_stringByUnescapingFromURLArgument], @"this;that", @"- semi-colon should be unescaped");
  STAssertEqualObjects([@"this%3Athat" gtm_stringByUnescapingFromURLArgument], @"this:that", @"- colon should be unescaped");
  STAssertEqualObjects([@"this%40that" gtm_stringByUnescapingFromURLArgument], @"this@that", @"- at sign should be unescaped");
  STAssertEqualObjects([@"this%26that" gtm_stringByUnescapingFromURLArgument], @"this&that", @"- ampersand should be unescaped");
  STAssertEqualObjects([@"this%3Dthat" gtm_stringByUnescapingFromURLArgument], @"this=that", @"- equals should be unescaped");
  STAssertEqualObjects([@"this%2Bthat" gtm_stringByUnescapingFromURLArgument], @"this+that", @"- plus should be unescaped");
  STAssertEqualObjects([@"this%24that" gtm_stringByUnescapingFromURLArgument], @"this$that", @"- dollar-sign should be unescaped");
  STAssertEqualObjects([@"this%2Cthat" gtm_stringByUnescapingFromURLArgument], @"this,that", @"- comma should be unescaped");
  STAssertEqualObjects([@"this%2Fthat" gtm_stringByUnescapingFromURLArgument], @"this/that", @"- slash should be unescaped");
  STAssertEqualObjects([@"this%3Fthat" gtm_stringByUnescapingFromURLArgument], @"this?that", @"- question mark should be unescaped");
  STAssertEqualObjects([@"this%25that" gtm_stringByUnescapingFromURLArgument], @"this%that", @"- percent should be unescaped");
  STAssertEqualObjects([@"this%23that" gtm_stringByUnescapingFromURLArgument], @"this#that", @"- pound should be unescaped");
  STAssertEqualObjects([@"this%5Bthat" gtm_stringByUnescapingFromURLArgument], @"this[that", @"- left bracket should be unescaped");
  STAssertEqualObjects([@"this%5Dthat" gtm_stringByUnescapingFromURLArgument], @"this]that", @"- right bracket should be unescaped");
  // make sure a plus come back out as a space
  STAssertEqualObjects([[NSString stringWithString:@"this+that"] gtm_stringByUnescapingFromURLArgument], @"this that", @"- plus should be unescaped");
  // make sure plus and %2B are handled in the right order
  STAssertEqualObjects([@"this+that%2Bthe%20other" gtm_stringByUnescapingFromURLArgument], @"this that+the other", @"- pluses and spaces should be different");
  // high char test
  NSString *tester = [NSString stringWithUTF8String:"caf\xC3\xA9"];
  STAssertNotNil(tester, @"failed to create from utf8 run");
  STAssertEqualObjects([[NSString stringWithString:@"caf%C3%A9"] gtm_stringByUnescapingFromURLArgument], tester, @"- high chars should work");
}

@end
