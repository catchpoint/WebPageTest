//
//  GTMTestTimerTest.m
//
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
#import "GTMTestTimer.h"

@interface GTMTestTimerTest : GTMTestCase
@end

@implementation GTMTestTimerTest
- (void)testTimer {
  GTMTestTimer *timer = GTMTestTimerCreate();
  STAssertNotNULL(timer, nil);
  GTMTestTimerRetain(timer);
  GTMTestTimerRelease(timer);
  STAssertEqualsWithAccuracy(GTMTestTimerGetSeconds(timer), 0.0, 0.0, nil);
  GTMTestTimerStart(timer);
  STAssertTrue(GTMTestTimerIsRunning(timer), nil);
  NSRunLoop *loop = [NSRunLoop currentRunLoop];
  [loop runUntilDate:[NSDate dateWithTimeIntervalSinceNow:0.1]];
  GTMTestTimerStop(timer);
  
  // We use greater than (and an almost absurd less than) because 
  // these tests are very dependant on machine load, and we don't want
  // automated tests reporting false negatives.
  STAssertGreaterThan(GTMTestTimerGetSeconds(timer), 0.1, nil);
  STAssertGreaterThan(GTMTestTimerGetMilliseconds(timer), 100.0,nil);
  STAssertGreaterThan(GTMTestTimerGetMicroseconds(timer), 100000.0, nil);
  
  // Check to make sure we're not WAY off the mark (by a factor of 10)
  STAssertLessThan(GTMTestTimerGetMicroseconds(timer), 1000000.0, nil);
  
  [loop runUntilDate:[NSDate dateWithTimeIntervalSinceNow:0.1]];
  GTMTestTimerStart(timer);
  [loop runUntilDate:[NSDate dateWithTimeIntervalSinceNow:0.1]];
  STAssertGreaterThan(GTMTestTimerGetSeconds(timer), 0.2, nil);
  GTMTestTimerStop(timer);
  STAssertEquals(GTMTestTimerGetIterations(timer), (NSUInteger)2, nil);
  GTMTestTimerRelease(timer);
}
@end
