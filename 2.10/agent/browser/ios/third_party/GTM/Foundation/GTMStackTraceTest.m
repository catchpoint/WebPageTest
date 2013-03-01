//
//  GTMStackTraceTest.m
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

#import <Foundation/Foundation.h>
#import "GTMStackTrace.h"
#import "GTMSenTestCase.h"

@interface GTMStackTraceTest : GTMTestCase
@end

@implementation GTMStackTraceTest
+ (BOOL)classMethodTest {
  NSString *stacktrace = GTMStackTrace();
  NSArray *stacklines = [stacktrace componentsSeparatedByString:@"\n"];
  NSString *firstFrame = [stacklines objectAtIndex:0];
  NSRange range = [firstFrame rangeOfString:@"+"];
  return range.location != NSNotFound;
}

- (void)testStackTraceBasic {
  NSString *stacktrace = GTMStackTrace();
  NSArray *stacklines = [stacktrace componentsSeparatedByString:@"\n"];

  STAssertGreaterThan([stacklines count], (NSUInteger)3,
                      @"stack trace must have > 3 lines");
  STAssertLessThan([stacklines count], (NSUInteger)25,
                   @"stack trace must have < 25 lines");
  
  NSString *firstFrame = [stacklines objectAtIndex:0];
  NSRange range = [firstFrame rangeOfString:@"testStackTraceBasic"];
  STAssertNotEquals(range.location, (NSUInteger)NSNotFound,
                    @"First frame should contain testStackTraceBasic,"
                    " stack trace: %@", stacktrace);
  range = [firstFrame rangeOfString:@"#0"];
  STAssertNotEquals(range.location, (NSUInteger)NSNotFound,
                    @"First frame should contain #0, stack trace: %@", 
                    stacktrace);
  
  range = [firstFrame rangeOfString:@"-"];
  STAssertNotEquals(range.location, (NSUInteger)NSNotFound,
                    @"First frame should contain - since it's "
                    @"an instance method: %@", stacktrace);
  STAssertTrue([[self class] classMethodTest], @"First frame should contain"
               @"+ since it's a class method");
}

-(void)testGetStackAddressDescriptors {
  struct GTMAddressDescriptor descs[100];
  size_t depth = sizeof(descs) / sizeof(struct GTMAddressDescriptor);
  depth = GTMGetStackAddressDescriptors(descs, depth);
  // Got atleast 4...
  STAssertGreaterThan(depth, (size_t)4, nil);
  // All that we got have symbols
  for (NSUInteger lp = 0 ; lp < depth ; ++lp) {
    STAssertNotNULL(descs[lp].symbol, @"didn't get a symbol at depth %lu", lp);
  }
  
  // Do it again, but don't give it enough space (to make sure it handles that)
  size_t fullDepth = depth;
  STAssertGreaterThan(fullDepth, (size_t)4, nil);
  depth -= 2;
  depth = GTMGetStackAddressDescriptors(descs, depth);
  STAssertLessThan(depth, fullDepth, nil);
  // All that we got have symbols
  for (NSUInteger lp = 0 ; lp < depth ; ++lp) {
    STAssertNotNULL(descs[lp].symbol, @"didn't get a symbol at depth %lu", lp);
  }
  
}

#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5

- (void)helperThatThrows {
  [NSException raise:@"TestException" format:@"TestExceptionDescription"];
}

- (void)testStackExceptionTrace {
  NSException *exception = nil;
  @try {
    [self helperThatThrows];
  }
  @catch (NSException * e) {
    exception = e;
  }
  STAssertNotNil(exception, nil);
  NSString *stacktrace = GTMStackTraceFromException(exception);
  NSArray *stacklines = [stacktrace componentsSeparatedByString:@"\n"];
  
  STAssertGreaterThan([stacklines count], (NSUInteger)4,
                      @"stack trace must have > 4 lines");
  STAssertLessThan([stacklines count], (NSUInteger)25,
                   @"stack trace must have < 25 lines");
  STAssertEquals([stacklines count],
                 [[exception callStackReturnAddresses] count],
                 @"stack trace should have the same number of lines as the "
                 @" array of return addresses.  stack trace: %@", stacktrace);
  
  // we can't look for it on a specific frame because NSException doesn't
  // really document how deep the stack will be
  NSRange range = [stacktrace rangeOfString:@"testStackExceptionTrace"];
  STAssertNotEquals(range.location, (NSUInteger)NSNotFound,
                    @"Stack trace should contain testStackExceptionTrace,"
                    " stack trace: %@", stacktrace);
}

#endif

#if MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5

- (void)testProgramCountersBasic {
  void *pcs[10];
  NSUInteger depth = 10;
  depth = GTMGetStackProgramCounters(pcs, depth);
  
  STAssertGreaterThan(depth, (NSUInteger)3, @"stack trace must have > 3 lines");
  STAssertLessThanOrEqual(depth, (NSUInteger)10, 
                          @"stack trace must have < 10 lines");
  
  // pcs is an array of program counters from the stack.  pcs[0] should match
  // the call into GTMGetStackProgramCounters, which is tough for us to check.
  // However, we can verify that pcs[1] is equal to our current return address
  // for our current function.
  void *current_pc = __builtin_return_address(0);
  STAssertEquals(pcs[1], current_pc, @"pcs[1] should equal the current PC");
}

- (void)testProgramCountersMore {
  void *pcs0[0];
  NSUInteger depth0 = 0;
  depth0 = GTMGetStackProgramCounters(pcs0, depth0);
  STAssertEquals(depth0, (NSUInteger)0, @"stack trace must have 0 lines");

  void *pcs1[1];
  NSUInteger depth1 = 1;
  depth1 = GTMGetStackProgramCounters(pcs1, depth1);
  STAssertEquals(depth1, (NSUInteger)1, @"stack trace must have 1 lines");
  
  void *pcs2[2];
  NSUInteger depth2 = 2;
  depth2 = GTMGetStackProgramCounters(pcs2, depth2);
  STAssertEquals(depth2, (NSUInteger)2, @"stack trace must have 2 lines");
  void *current_pc = __builtin_return_address(0);
  STAssertEquals(pcs2[1], current_pc, @"pcs[1] should equal the current PC");
}

#endif  // MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5

@end
