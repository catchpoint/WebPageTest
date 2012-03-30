//
//  GTMNSScanner+UnsignedTest.m
//
//  Copyright 2010 Google Inc.
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
#import "GTMNSScanner+Unsigned.h"

@interface GTMNSScanner_UnsignedTest : GTMTestCase
@end

@implementation GTMNSScanner_UnsignedTest

#define TEST_BLOCK(A_MAX_VALUE) \
  { @"-1", 0, NO, 0 }, \
  { @"- 1", 0, NO, 0 }, \
  { @" - 1", 0, NO, 0 }, \
  { @"+ 1", 1, NO, 0 }, \
  { @" + 1", 1, NO, 0 }, \
  { @"0", 0, YES, 1 }, \
  { @"a", 0, NO, 0 }, \
  { @" ", 0, NO, 0 }, \
  { @"-1a", 0, NO, 0 }, \
  { @"a1", 0, NO, 0 }, \
  { @"1 ", 1, YES, 1 }, \
  { @"2 1 ", 2, YES, 1 }, \
  { @" 2 1 ", 2, YES, 2 }, \
  { @"99999999999999999999999999999999999", A_MAX_VALUE, YES, 35 }

- (void)testScanUnsignedInt {
  struct {
    NSString *string;
    unsigned int val;
    BOOL goodScan;
    NSUInteger location;
  } testStruct[] = {
    TEST_BLOCK(UINT_MAX),
  };
  for (size_t i = 0; i < sizeof(testStruct) / sizeof(testStruct[0]); ++i) {
    NSScanner *scanner = [NSScanner scannerWithString:testStruct[i].string];
    STAssertNotNil(scanner, nil);
    unsigned int value;
    BOOL isGood = [scanner gtm_scanUnsignedInt:&value];
    STAssertEquals((int)isGood, (int)testStruct[i].goodScan, 
                   @"%@", testStruct[i].string);
    if (isGood && testStruct[i].goodScan) {
      STAssertEquals(value, testStruct[i].val, @"%@", testStruct[i].string);
    }
    STAssertEquals(testStruct[i].location, [scanner scanLocation], 
                   @"%@", testStruct[i].string);
  }
}

- (void)testScanUInteger {
  struct {
    NSString *string;
    NSUInteger val;
    BOOL goodScan;
    NSUInteger location;
  } testStruct[] = {
    TEST_BLOCK(NSUIntegerMax),
  };
  for (size_t i = 0; i < sizeof(testStruct) / sizeof(testStruct[0]); ++i) {
    NSScanner *scanner = [NSScanner scannerWithString:testStruct[i].string];
    STAssertNotNil(scanner, nil);
    NSUInteger value;
    BOOL isGood = [scanner gtm_scanUInteger:&value];
    STAssertEquals((int)isGood, (int)testStruct[i].goodScan, 
                   @"%@", testStruct[i].string);
    if (isGood && testStruct[i].goodScan) {
      STAssertEquals(value, testStruct[i].val, @"%@", testStruct[i].string);
    }
    STAssertEquals(testStruct[i].location, [scanner scanLocation], 
                   @"%@", testStruct[i].string);
  }
}

- (void)testScanUnsignedLongLong {
  struct {
    NSString *string;
    unsigned long long val;
    BOOL goodScan;
    NSUInteger location;
  } testStruct[] = {
    TEST_BLOCK(ULLONG_MAX),
    { @"4294967296", ((unsigned long long)UINT_MAX) + 1, YES, 10 }
  };
  for (size_t i = 0; i < sizeof(testStruct) / sizeof(testStruct[0]); ++i) {
    NSScanner *scanner = [NSScanner scannerWithString:testStruct[i].string];
    STAssertNotNil(scanner, nil);
    unsigned long long value;
    BOOL isGood = [scanner gtm_scanUnsignedLongLong:&value];
    STAssertEquals((int)isGood, (int)testStruct[i].goodScan, 
                   @"%@", testStruct[i].string);
    if (isGood && testStruct[i].goodScan) {
      STAssertEquals(value, testStruct[i].val, @"%@", testStruct[i].string);
    }
    STAssertEquals(testStruct[i].location, [scanner scanLocation], 
                   @"%@", testStruct[i].string);
  }
}

@end
