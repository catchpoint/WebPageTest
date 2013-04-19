//
//  GTMKeyValueAnimationTest.m
//
//  Copyright 2011 Google Inc.
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
#import "GTMKeyValueAnimation.h"
#import "GTMFoundationUnitTestingUtilities.h"

@interface GTMKeyValueAnimationTest : GTMTestCase <NSAnimationDelegate> {
 @private
  GTMUnitTestingBooleanRunLoopContext *context_;
  BOOL shouldStartHit_;
}
@end

@implementation GTMKeyValueAnimationTest

- (void)testAnimation {
  shouldStartHit_ = NO;
  GTMKeyValueAnimation *anim =
    [[[GTMKeyValueAnimation alloc] initWithTarget:self
                                          keyPath:@"oggle"] autorelease];
  [anim setDelegate:self];
  [anim startAnimation];
  context_ = [GTMUnitTestingBooleanRunLoopContext context];
  [[NSRunLoop currentRunLoop] gtm_runUpToSixtySecondsWithContext:context_];
  [anim stopAnimation];
  STAssertTrue([context_ shouldStop], @"Animation value never got set");
  STAssertTrue(shouldStartHit_, @"animationShouldStart not called");
}

- (BOOL)animationShouldStart:(NSAnimation*)animation {
  shouldStartHit_ = YES;
  return YES;
}

- (void)setOggle:(CGFloat)oggle {
  [context_ setShouldStop:YES];
}

@end
