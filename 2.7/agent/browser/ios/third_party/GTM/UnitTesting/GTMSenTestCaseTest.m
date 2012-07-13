//
//  GTMSenTestCaseTest.m
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

// These make use of the fact that methods are run in alphebetical order
// to have one test check that a previous one was run.  If that order ever
// changes, there is a good chance things will break.

static int gAbstractCalls_ = 0;
static int gZzCheckCalls_ = 0;

@interface GTMTestingAbstractTest : GTMTestCase
@end

@interface GTMTestingTestOne : GTMTestingAbstractTest {
  BOOL zzCheckCalled_;
}
@end

@interface GTMTestingTestTwo : GTMTestingTestOne
@end

@implementation GTMTestingAbstractTest

- (void)testAbstractUnitTest {
  STAssertFalse([self isMemberOfClass:[GTMTestingAbstractTest class]],
                @"test should not run on the abstract class");
  ++gAbstractCalls_;
}

@end

@implementation GTMTestingTestOne

- (void)testZZCheck {
  ++gZzCheckCalls_;
  if ([self isMemberOfClass:[GTMTestingTestOne class]]) {
    STAssertEquals(gAbstractCalls_, 1,
                   @"wrong number of abstract calls at this point");
  } else {
    STAssertTrue([self isMemberOfClass:[GTMTestingTestTwo class]], nil);
    STAssertEquals(gAbstractCalls_, 2,
                   @"wrong number of abstract calls at this point");
  }
}

@end

@implementation GTMTestingTestTwo

- (void)testZZZCheck {
  // Test defined at this leaf, it should always run, check on the other methods.
  STAssertEquals(gZzCheckCalls_, 2, @"the parent class method wasn't called");
}

@end
