//
//  GTMCalculatedRangeTest.m
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

#import "GTMCalculatedRange.h"
#import "GTMSenTestCase.h"

@interface GTMCalculatedRangeTest : GTMTestCase {
  GTMCalculatedRange *range_;
}
@end

@implementation GTMCalculatedRangeTest
NSString *kStrings[] = { @"Fee", @"Fi", @"Fo", @"Fum" };
const NSUInteger kStringCount = sizeof(kStrings) / sizeof(NSString*);
const CGFloat kOddPosition = 0.14159265f;
const CGFloat kExistingPosition = 0.5f;
const NSUInteger kExisitingIndex = 2;

- (void)setUp {
  range_ = [[GTMCalculatedRange alloc] init];
  for(NSUInteger i = kStringCount; i > 0; --i) {
    [range_ insertStop:kStrings[kStringCount - i] atPosition:(CGFloat)(1.0 / i)];
  }
}

- (void)tearDown {
  [range_ release];
}

- (void)testInsertStop {
  // new position
  NSString *theString = @"I smell the blood of an Englishman!";
  [range_ insertStop:theString atPosition:kOddPosition];
  STAssertEquals([range_ stopCount], kStringCount + 1, @"Stop count was bad");
  NSString *getString = [range_ valueAtPosition:kOddPosition];
  STAssertNotNil(getString, @"String was bad");
  STAssertEquals(theString, getString, @"Stops weren't equal");
  // existing position
  NSString *theStringTake2 = @"I smell the blood of an Englishman! Take 2";
  [range_ insertStop:theStringTake2 atPosition:kOddPosition];
  STAssertEquals([range_ stopCount], kStringCount + 1, @"Stop count was bad");
  getString = [range_ valueAtPosition:kOddPosition];
  STAssertNotNil(getString, @"String was bad");
  STAssertEquals(theStringTake2, getString, @"Stops weren't equal");
  STAssertNotEquals(theString, getString, @"Should be the new value");
  STAssertNotEqualObjects(theString, getString, @"Should be the new value");
}

- (void)testRemoveStopAtPosition {
  STAssertFalse([range_ removeStopAtPosition: kOddPosition], @"Was able to remove non-existant stop");
  STAssertTrue([range_ removeStopAtPosition: kExistingPosition], @"Was unable to remove good stop");
  STAssertEquals([range_ stopCount], kStringCount - 1, @"Removing stop should adjust stop count");
}

- (void)testRemoveStopAtIndex {
  STAssertThrows([range_ removeStopAtIndex: kStringCount], @"Was able to remove non-existant stop");
  STAssertNoThrow([range_ removeStopAtIndex: kStringCount - 1], @"Was unable to remove good stop");
  STAssertEquals([range_ stopCount], kStringCount - 1, @"Removing stop should adjust stop count");  
}

- (void)testStopCount {
  STAssertEquals([range_ stopCount], kStringCount, @"Bad stop count");
}

- (void)testValueAtPosition {
  STAssertEqualObjects([range_ valueAtPosition: kExistingPosition], kStrings[kExisitingIndex], nil);
  STAssertNotEqualObjects([range_ valueAtPosition: kExistingPosition], kStrings[kStringCount - 1], nil);
  STAssertNil([range_ valueAtPosition: kOddPosition], nil);
}

- (void)testStopAtIndex {
  CGFloat thePosition;
  
  STAssertEqualObjects([range_ stopAtIndex:kStringCount - 1 position:nil], kStrings[kStringCount - 1], nil);
  STAssertEqualObjects([range_ stopAtIndex:kExisitingIndex position:&thePosition], kStrings[kExisitingIndex], nil);
  STAssertEquals(thePosition, kExistingPosition, nil);
  STAssertNotEqualObjects([range_ stopAtIndex:kStringCount - 1 position:nil], kStrings[2], nil);
  STAssertThrows([range_ stopAtIndex:kStringCount position:nil], nil);
}

- (void)testDescription {
  // we expect a description of atleast a few chars
  STAssertGreaterThan([[range_ description] length], (NSUInteger)10, nil);
}

@end
