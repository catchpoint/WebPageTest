//
//  GTMIBArrayTest.m
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


#import "GTMIBArray.h"
#import "GTMSenTestCase.h"
#import "GTMIBArrayTest.h"

@interface GTMIBArrayTest : GTMTestCase
@end

@interface IBArrayTestHelper : GTMIBArray
- (id)initWithObj1:(id)obj1 obj2:(id)obj2 obj3:(id)obj3
              obj4:(id)obj4 obj5:(id)obj5;
@end

@implementation IBArrayTestHelper
- (id)initWithObj1:(id)obj1 obj2:(id)obj2 obj3:(id)obj3
              obj4:(id)obj4 obj5:(id)obj5 {
  if ((self = [super init])) {
    object1_ = [obj1 retain];
    object2_ = [obj2 retain];
    object3_ = [obj3 retain];
    object4_ = [obj4 retain];
    object5_ = [obj5 retain];
  }
  return self;
}

- (void)dealloc {
  [object1_ release];
  [object2_ release];
  [object3_ release];
  [object4_ release];
  [object5_ release];
  [super dealloc];
}

@end

@implementation GTMIBArrayTest

- (void)testEmpty {
  GTMIBArray *worker = [[[GTMIBArray alloc] init] autorelease];

  STAssertNotNil(worker, nil);
  STAssertEquals([worker count], (NSUInteger)0, nil);

  worker = [[[IBArrayTestHelper alloc] initWithObj1:nil
                                               obj2:nil
                                               obj3:nil
                                               obj4:nil
                                               obj5:nil] autorelease];
  STAssertNotNil(worker, nil);
  STAssertEquals([worker count], (NSUInteger)0, nil);
}

- (void)testSparse {
  struct {
    id obj1;
    id obj2;
    id obj3;
    id obj4;
    id obj5;
    id combined;
  } data[] = {
    { @"a",  nil,  nil,  nil,  nil, @"a" },
    {  nil, @"a",  nil,  nil,  nil, @"a" },
    {  nil,  nil, @"a",  nil,  nil, @"a" },
    {  nil,  nil,  nil, @"a",  nil, @"a" },
    {  nil,  nil,  nil,  nil, @"a", @"a" },

    { @"a", @"b",  nil,  nil,  nil, @"ab" },
    { @"a", @"b", @"c",  nil,  nil, @"abc" },
    { @"a", @"b", @"c", @"d",  nil, @"abcd" },
    {  nil, @"b", @"c",  nil,  nil, @"bc" },
    {  nil,  nil, @"c", @"d",  nil, @"cd" },
    {  nil,  nil,  nil, @"d", @"e", @"de" },
    { @"a",  nil, @"c",  nil, @"e", @"ace" },

    { @"a", @"b", @"c", @"d", @"e", @"abcde" },
  };

  for (size_t i = 0; i < sizeof(data) / sizeof(data[0]); ++i) {
    GTMIBArray *worker =
      [[[IBArrayTestHelper alloc] initWithObj1:data[i].obj1
                                          obj2:data[i].obj2
                                          obj3:data[i].obj3
                                          obj4:data[i].obj4
                                          obj5:data[i].obj5] autorelease];
    STAssertNotNil(worker, @"index %zu", i);
    NSUInteger count = 0;
    if (data[i].obj1) ++count;
    if (data[i].obj2) ++count;
    if (data[i].obj3) ++count;
    if (data[i].obj4) ++count;
    if (data[i].obj5) ++count;
    STAssertEquals([worker count], count, @"index %zu", i);
    STAssertEqualObjects([worker componentsJoinedByString:@""],
                         data[i].combined,
                         @"index %zu", i);
  }
}

- (void)testRecursive {
  GTMIBArray *ibArray1 =
    [[[IBArrayTestHelper alloc] initWithObj1:@"a"
                                        obj2:@"b"
                                        obj3:@"c"
                                        obj4:@"d"
                                        obj5:@"e"] autorelease];
  GTMIBArray *ibArray2 =
    [[[IBArrayTestHelper alloc] initWithObj1:@"f"
                                        obj2:@"g"
                                        obj3:@"h"
                                        obj4:@"i"
                                        obj5:@"j"] autorelease];
  GTMIBArray *ibArray3 =
    [[[IBArrayTestHelper alloc] initWithObj1:@"k"
                                        obj2:@"l"
                                        obj3:@"m"
                                        obj4:@"n"
                                        obj5:@"o"] autorelease];
  GTMIBArray *ibArray4 =
    [[[IBArrayTestHelper alloc] initWithObj1:ibArray1
                                        obj2:@"1"
                                        obj3:ibArray2
                                        obj4:@"2"
                                        obj5:ibArray3] autorelease];
  GTMIBArray *ibArray5 =
    [[[IBArrayTestHelper alloc] initWithObj1:ibArray1
                                        obj2:@"3"
                                        obj3:nil
                                        obj4:@"4"
                                        obj5:ibArray3] autorelease];
  GTMIBArray *ibArray6 =
    [[[IBArrayTestHelper alloc] initWithObj1:nil
                                        obj2:@"5"
                                        obj3:ibArray1
                                        obj4:@"6"
                                        obj5:nil] autorelease];
  GTMIBArray *ibArray7 =
    [[[IBArrayTestHelper alloc] initWithObj1:nil
                                        obj2:@"7"
                                        obj3:ibArray1
                                        obj4:@"8"
                                        obj5:ibArray6] autorelease];
  GTMIBArray *ibArray8 =
    [[[IBArrayTestHelper alloc] initWithObj1:ibArray3
                                        obj2:@"9"
                                        obj3:ibArray7
                                        obj4:nil
                                        obj5:ibArray6] autorelease];

  struct {
    GTMIBArray *ibArray;
    NSUInteger count;
    NSString *result;
  } data[] = {
    { ibArray1,  5, @"abcde" },
    { ibArray2,  5, @"fghij" },
    { ibArray3,  5, @"klmno" },
    { ibArray4, 17, @"abcde1fghij2klmno" },
    { ibArray5, 12, @"abcde34klmno" },
    { ibArray6,  7, @"5abcde6" },
    { ibArray7, 14, @"7abcde85abcde6" },
    { ibArray8, 27, @"klmno97abcde85abcde65abcde6" },
  };

  for (size_t i = 0; i < sizeof(data) / sizeof(data[0]); ++i) {
    NSArray *worker = data[i].ibArray;
    STAssertNotNil(worker, @"index %zu", i);
    STAssertEquals([worker count], data[i].count, @"index %zu", i);
    STAssertEqualObjects([worker componentsJoinedByString:@""],
                         data[i].result,
                         @"index %zu", i);
  }
}

- (void)testEnumeration {
  GTMIBArray *worker =
    [[[IBArrayTestHelper alloc] initWithObj1:@"a"
                                        obj2:@"b"
                                        obj3:@"c"
                                        obj4:@"d"
                                        obj5:@"e"] autorelease];

  NSEnumerator *enumerator = [worker objectEnumerator];
  STAssertNotNil(enumerator, nil);
  STAssertEqualObjects([enumerator nextObject], @"a", nil);
  STAssertEqualObjects([enumerator nextObject], @"b", nil);
  STAssertEqualObjects([enumerator nextObject], @"c", nil);
  STAssertEqualObjects([enumerator nextObject], @"d", nil);
  STAssertEqualObjects([enumerator nextObject], @"e", nil);
  STAssertNil([enumerator nextObject], nil);

  enumerator = [worker reverseObjectEnumerator];
  STAssertNotNil(enumerator, nil);
  STAssertEqualObjects([enumerator nextObject], @"e", nil);
  STAssertEqualObjects([enumerator nextObject], @"d", nil);
  STAssertEqualObjects([enumerator nextObject], @"c", nil);
  STAssertEqualObjects([enumerator nextObject], @"b", nil);
  STAssertEqualObjects([enumerator nextObject], @"a", nil);
  STAssertNil([enumerator nextObject], nil);
}

#if MAC_OS_X_VERSION_MAX_ALLOWED >= MAC_OS_X_VERSION_10_5

- (void)testFastEnumeration {
  GTMIBArray *worker =
    [[[IBArrayTestHelper alloc] initWithObj1:@"a"
                                        obj2:@"b"
                                        obj3:@"c"
                                        obj4:@"d"
                                        obj5:@"e"] autorelease];

  NSUInteger idx = 0;
  for (id obj in worker) {
    switch (++idx) {
      case 1:
        STAssertEqualObjects(obj, @"a", nil);
        break;
      case 2:
        STAssertEqualObjects(obj, @"b", nil);
        break;
      case 3:
        STAssertEqualObjects(obj, @"c", nil);
        break;
      case 4:
        STAssertEqualObjects(obj, @"d", nil);
        break;
      case 5:
        STAssertEqualObjects(obj, @"e", nil);
        break;
      default:
        STFail(@"looping too many times: %zu", idx);
        break;
    }
  }
}

#endif  // MAC_OS_X_VERSION_MAX_ALLOWED >= MAC_OS_X_VERSION_10_5

- (void)testCopy {
  GTMIBArray *worker =
    [[[IBArrayTestHelper alloc] initWithObj1:@"a"
                                        obj2:@"b"
                                        obj3:@"c"
                                        obj4:@"d"
                                        obj5:@"e"] autorelease];

  // Should get back a different object, but with the same contents.

  NSArray *aCopy = [[worker copy] autorelease];
  STAssertNotEquals(aCopy, worker, nil);
  STAssertEqualObjects(aCopy, worker, nil);

  NSArray *aMutableCopy = [[worker mutableCopy] autorelease];
  STAssertNotEquals(aMutableCopy, worker, nil);
  STAssertNotEquals(aMutableCopy, aCopy, nil);
  STAssertEqualObjects(aMutableCopy, worker, nil);
  STAssertEqualObjects(aMutableCopy, aCopy, nil);
}

- (void)testFromNib {
  GTMIBArrayTestWindowController *controller =
    [[[GTMIBArrayTestWindowController alloc]
      initWithWindowNibName:@"GTMIBArrayTest"] autorelease];
  NSWindow *window = [controller window];
  STAssertNotNil(window, nil);

  NSArray *labels = [controller labelsArray];
  NSArray *fields = [controller fieldsArray];
  NSArray *everything = [controller everythingArray];
  STAssertNotNil(labels, nil);
  STAssertNotNil(fields, nil);
  STAssertNotNil(everything, nil);

  STAssertEquals([labels count], (NSUInteger)3, nil);
  STAssertEquals([fields count], (NSUInteger)3, nil);
  STAssertEquals([everything count], (NSUInteger)8, nil);

  NSSet *labelsSet = [NSSet setWithArray:labels];
  NSSet *fieldsSet = [NSSet setWithArray:fields];
  NSSet *everythingSet = [NSSet setWithArray:everything];
  STAssertTrue([labelsSet isSubsetOfSet:everythingSet], nil);
  STAssertTrue([fieldsSet isSubsetOfSet:everythingSet], nil);
}

- (void)testIsEqual {
  GTMIBArray *ibArray1 =
      [[[IBArrayTestHelper alloc] initWithObj1:@"a"
                                          obj2:@"b"
                                          obj3:@"c"
                                          obj4:@"d"
                                          obj5:@"e"] autorelease];
  GTMIBArray *ibArray2 =
      [[[IBArrayTestHelper alloc] initWithObj1:@"f"
                                          obj2:@"g"
                                          obj3:@"h"
                                          obj4:@"i"
                                          obj5:@"j"] autorelease];

  STAssertEquals([ibArray1 hash], [ibArray2 hash], nil);
  STAssertNotEqualObjects(ibArray1, ibArray2, nil);

  NSArray *ibArray1Prime = [[ibArray1 copy] autorelease];
  NSArray *ibArray2Prime = [[ibArray2 copy] autorelease];

  STAssertTrue(ibArray1 != ibArray1Prime, nil);
  STAssertTrue(ibArray2 != ibArray2Prime, nil);
  STAssertNotEqualObjects(ibArray1Prime, ibArray2Prime, nil);
  STAssertEqualObjects(ibArray1, ibArray1Prime, nil);
  STAssertEqualObjects(ibArray2, ibArray2Prime, nil);
}
  
@end

@implementation GTMIBArrayTestWindowController

- (NSArray *)labelsArray {
  return labels_;
}

- (NSArray *)fieldsArray {
  return fields_;
}

- (NSArray *)everythingArray {
  return everything_;
}

@end
