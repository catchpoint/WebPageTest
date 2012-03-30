//
//  GTMSystemVersionTest.m
//
//  Copyright 2007-2008 Google Inc.
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
#import "GTMSystemVersion.h"

@interface GTMSystemVersionTest : GTMTestCase
@end

@implementation GTMSystemVersionTest
- (void)testBasics {
  SInt32 major;
  SInt32 minor;
  SInt32 bugFix;
  
  [GTMSystemVersion getMajor:NULL minor:NULL bugFix:NULL];
  [GTMSystemVersion getMajor:&major minor:NULL bugFix:NULL];
  [GTMSystemVersion getMajor:NULL minor:&minor bugFix:NULL];
  [GTMSystemVersion getMajor:NULL minor:NULL bugFix:&bugFix];
  [GTMSystemVersion getMajor:&major minor:&minor bugFix:&bugFix];
#if GTM_IPHONE_SDK
  STAssertTrue(major >= 2 && minor >= 0 && bugFix >= 0, nil);
#else
  STAssertTrue(major >= 10 && minor >= 3 && bugFix >= 0, nil);
  BOOL isPanther = (major == 10) && (minor == 3);
  BOOL isTiger = (major == 10) && (minor == 4);
  BOOL isLeopard = (major == 10) && (minor == 5);
  BOOL isSnowLeopard = (major == 10) && (minor == 6);
  
  BOOL isLater = (major > 10) || ((major == 10) && (minor > 6));
  STAssertEquals([GTMSystemVersion isPanther], isPanther, nil);
  STAssertEquals([GTMSystemVersion isPantherOrGreater],
                 (BOOL)(isPanther || isTiger 
                        || isLeopard || isSnowLeopard || isLater), nil);
  STAssertEquals([GTMSystemVersion isTiger], isTiger, nil);
  STAssertEquals([GTMSystemVersion isTigerOrGreater],
                 (BOOL)(isTiger || isLeopard || isSnowLeopard || isLater), nil);
  STAssertEquals([GTMSystemVersion isLeopard], isLeopard, nil);
  STAssertEquals([GTMSystemVersion isLeopardOrGreater],
                 (BOOL)(isLeopard || isSnowLeopard || isLater), nil);
  STAssertEquals([GTMSystemVersion isSnowLeopard], isSnowLeopard, nil);
  STAssertEquals([GTMSystemVersion isSnowLeopardOrGreater],
                 (BOOL)(isSnowLeopard || isLater), nil);
#endif  
}

- (void)testRuntimeArchitecture {
  // Not sure how to test this short of recoding it and verifying.
  // This at least executes the code for me.
  STAssertNotNil([GTMSystemVersion runtimeArchitecture], nil);
}

- (void)testBuild {
  // Not sure how to test this short of coding up a large fragile table.
  // This at least executes the code for me.
  NSString *systemVersion = [GTMSystemVersion build];
  STAssertNotEquals([systemVersion length], (NSUInteger)0, nil);
  
  NSString *smallVersion = @"1A00";
  NSString *largeVersion = @"100Z100";
  STAssertTrue([GTMSystemVersion isBuildGreaterThan:smallVersion], nil);
  STAssertFalse([GTMSystemVersion isBuildGreaterThan:systemVersion], nil);
  STAssertFalse([GTMSystemVersion isBuildGreaterThan:largeVersion], nil);
  STAssertTrue([GTMSystemVersion isBuildGreaterThanOrEqualTo:smallVersion], nil);
  STAssertTrue([GTMSystemVersion isBuildGreaterThanOrEqualTo:systemVersion], nil);
  STAssertFalse([GTMSystemVersion isBuildGreaterThanOrEqualTo:largeVersion], nil);
  STAssertFalse([GTMSystemVersion isBuildEqualTo:smallVersion], nil);
  STAssertTrue([GTMSystemVersion isBuildEqualTo:systemVersion], nil);
  STAssertFalse([GTMSystemVersion isBuildEqualTo:largeVersion], nil);
  STAssertFalse([GTMSystemVersion isBuildLessThanOrEqualTo:smallVersion], nil);
  STAssertTrue([GTMSystemVersion isBuildLessThanOrEqualTo:systemVersion], nil);
  STAssertTrue([GTMSystemVersion isBuildLessThanOrEqualTo:largeVersion], nil);
  STAssertFalse([GTMSystemVersion isBuildLessThan:smallVersion], nil);
  STAssertFalse([GTMSystemVersion isBuildLessThan:systemVersion], nil);
  STAssertTrue([GTMSystemVersion isBuildLessThan:largeVersion], nil);
  
}
@end
