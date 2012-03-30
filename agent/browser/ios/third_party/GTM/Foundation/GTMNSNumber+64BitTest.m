//
//  GTMNSNumber+64BitTest.m
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
#import "GTMNSNumber+64Bit.h"

@interface GTMNSNumber_64BitTest : GTMTestCase
@end

@implementation GTMNSNumber_64BitTest
- (void)testCGFloat {
  CGFloat testValue = 0.0;
  NSNumber *testNum = [NSNumber gtm_numberWithCGFloat:testValue];
  STAssertEquals(testValue, [testNum gtm_cgFloatValue], nil);
  testValue = INFINITY;
  testNum = [NSNumber gtm_numberWithCGFloat:testValue];
  STAssertEquals(testValue, [testNum gtm_cgFloatValue], nil);
  testValue = -1.0;
  testNum = [NSNumber gtm_numberWithCGFloat:testValue];
  STAssertEquals(testValue, [testNum gtm_cgFloatValue], nil);
}

- (void)testInteger {
  NSInteger testValue = 0.0;
  NSNumber *testNum = [NSNumber gtm_numberWithInteger:testValue];
  STAssertEquals(testValue, [testNum gtm_integerValue], nil);
  testValue = -INT_MAX;
  testNum = [NSNumber gtm_numberWithInteger:testValue];
  STAssertEquals(testValue, [testNum gtm_integerValue], nil);
}

- (void)testUnsignedInteger {
  NSUInteger testValue = 0.0;
  NSNumber *testNum = [NSNumber gtm_numberWithUnsignedInteger:testValue];
  STAssertEquals(testValue, [testNum gtm_unsignedIntegerValue], nil);
  testValue = UINT_MAX;
  testNum = [NSNumber gtm_numberWithUnsignedInteger:testValue];
  STAssertEquals(testValue, [testNum gtm_unsignedIntegerValue], nil);
}

@end
