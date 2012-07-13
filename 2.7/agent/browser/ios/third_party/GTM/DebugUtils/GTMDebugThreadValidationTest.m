//
//  GTMDebugThreadValidationTest.m
//  Copyright 2008 Google Inc.
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
#import "GTMDebugThreadValidation.h"

// GTMDebugThreadValidation only happens on debug builds
#if DEBUG

@interface GTMDebugThreadValidationTest : GTMTestCase
@end

// A cheap flag for knowing when our thread has run

static volatile BOOL gGTMDebugThreadValidationTestDone = NO;

// This is an assertion handler that just records that an assertion has fired.
@interface GTMDebugThreadValidationCheckAssertionHandler : NSAssertionHandler {
 @private
  BOOL handledAssertion_;
}
- (void)handleFailureInMethod:(SEL)selector 
                       object:(id)object 
                         file:(NSString *)fileName 
                   lineNumber:(NSInteger)line 
                  description:(NSString *)format,...;

- (void)handleFailureInFunction:(NSString *)functionName 
                           file:(NSString *)fileName 
                     lineNumber:(NSInteger)line 
                    description:(NSString *)format,...;
- (BOOL)didHandleAssertion;
@end

@implementation GTMDebugThreadValidationTest
- (void)testOnMainThread {
  STAssertNoThrow(GTMAssertRunningOnMainThread(), nil);
}

- (void)threadFunc:(NSMutableString *)result {
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  // We'll insert our own assertion handler that will get called on the assert
  // so that we don't have to worry about the log, and exception being thrown.
  GTMDebugThreadValidationCheckAssertionHandler *handler = 
    [[[GTMDebugThreadValidationCheckAssertionHandler alloc] init] autorelease];
  NSMutableDictionary *threadDictionary 
    = [[NSThread currentThread] threadDictionary];
  [threadDictionary setObject:handler forKey:@"NSAssertionHandler"];
  GTMAssertRunningOnMainThread();
  if ([handler didHandleAssertion]) {
    [result setString:@"ASSERTED"];
  }
  [threadDictionary removeObjectForKey:@"NSAssertionHandler"];
  gGTMDebugThreadValidationTestDone = YES;
  [pool release];
}

- (void)testOnOtherThread {
  NSMutableString *result = [NSMutableString string];
  gGTMDebugThreadValidationTestDone = NO;
  [NSThread detachNewThreadSelector:@selector(threadFunc:)
                           toTarget:self
                         withObject:result];
  NSRunLoop *loop = [NSRunLoop currentRunLoop];
  
  while (!gGTMDebugThreadValidationTestDone) {
    NSDate *date = [NSDate dateWithTimeIntervalSinceNow:0.01];
    [loop runUntilDate:date];
  }
  STAssertEqualStrings(result, @"ASSERTED", @"GTMAssertRunningOnMainThread did "
                       @"not assert while running on another thread");
}
@end

@implementation GTMDebugThreadValidationCheckAssertionHandler

- (void)handleFailureInMethod:(SEL)selector 
                       object:(id)object 
                         file:(NSString *)fileName 
                   lineNumber:(NSInteger)line 
                  description:(NSString *)format,... {
  handledAssertion_ = YES;
}

- (void)handleFailureInFunction:(NSString *)functionName 
                           file:(NSString *)fileName 
                     lineNumber:(NSInteger)line 
                    description:(NSString *)format,... {
  handledAssertion_ = YES;
}

- (BOOL)didHandleAssertion {
  return handledAssertion_;
}
@end
#endif  // DEBUG
