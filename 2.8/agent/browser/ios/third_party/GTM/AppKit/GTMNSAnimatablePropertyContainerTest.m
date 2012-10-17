//
//  GTMNSAnimatablePropertyContainerTest.m
//
//  Copyright (c) 2010 Google Inc. All rights reserved.
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

#import "GTMNSAnimatablePropertyContainerTest.h"
#import "GTMNSAnimatablePropertyContainer.h"
#import "GTMTypeCasting.h"
#import "GTMFoundationUnitTestingUtilities.h"

#if MAC_OS_X_VERSION_MAX_ALLOWED >= MAC_OS_X_VERSION_10_5

@implementation GTMNSAnimatablePropertyContainerWindow

#if 0
// Some useful debugging code. Enabled to track animation keys.
- (id)animationForKey:(NSString *)key {
  id value = [super animationForKey:key];
  NSLog(@"Value: %@ Key: %@", value, key);
  return value;
}
#endif

@end

@implementation GTMNSAnimatablePropertyContainerWindowBox

#if 0
// Some useful debugging code. Enabled to track animation keys.
- (id)animationForKey:(NSString *)key {
  id value = [super animationForKey:key];
  NSLog(@"Value: %@ Key: %@", value, key);
  return value;
}
#endif

- (void)set:(NSInteger)value {
  value = value;
}

@end

@implementation GTMNSAnimatablePropertyContainerWindowController

@synthesize nonLayerBox = nonLayerBox_;
@synthesize layerBox = layerBox_;

- (id)init {
  return [super initWithWindowNibName:@"GTMNSAnimatablePropertyContainerTest"];
}

- (void)windowWillClose:(NSNotification *)notification {
  if (![[notification object] isEqual:[self window]]) {
    [[NSException exceptionWithName:SenTestFailureException 
                             reason:@"Bad window in windowWillClose" 
                           userInfo:nil] raise];
  }
  [self autorelease];
}
  
@end

@implementation GTMNSAnimatablePropertyContainerTest
  
- (void)setUp {
  windowController_ 
    = [[GTMNSAnimatablePropertyContainerWindowController alloc] init];
  STAssertNotNil(windowController_, nil);
  NSWindow *window = [windowController_ window];
  STAssertNotNil(window, nil);
  timerCalled_ = [[GTMUnitTestingBooleanRunLoopContext alloc] init];
}

- (void)tearDown {
  [windowController_ close];
  windowController_ = nil;
  [timerCalled_ release];
  timerCalled_ = nil;
}

- (void)windowAlphaValueStopper:(NSTimer *)timer {
  NSWindow *window = GTM_DYNAMIC_CAST(NSWindow, [timer userInfo]);
  [timerCalled_ setShouldStop:YES];
  [[window gtm_animatorStopper] setAlphaValue:0.25];
  STAssertEquals([window alphaValue], (CGFloat)0.25, nil);
}

- (void)windowFrameStopper:(NSTimer *)timer {
  NSWindow *window = GTM_DYNAMIC_CAST(NSWindow, [timer userInfo]);
  [timerCalled_ setShouldStop:YES];
  [[window gtm_animatorStopper] setFrame:NSMakeRect(300, 300, 150, 150) 
                                 display:YES];
  STAssertEquals([window frame], NSMakeRect(300, 300, 150, 150), nil);
}

- (void)nonLayerFrameStopper:(NSTimer *)timer {
  NSView *view = GTM_DYNAMIC_CAST(NSView, [timer userInfo]);
  [timerCalled_ setShouldStop:YES];
  [[view gtm_animatorStopper] setFrame:NSMakeRect(200, 200, 200, 200)];
  STAssertEquals([view frame], NSMakeRect(200, 200, 200, 200), nil);
}

- (void)layerFrameStopper:(NSTimer *)timer {
  NSView *view = GTM_DYNAMIC_CAST(NSView, [timer userInfo]);
  [timerCalled_ setShouldStop:YES];
  [[view gtm_animatorStopper] setFrame:NSMakeRect(200, 200, 200, 200)];
  STAssertEquals([view frame], NSMakeRect(200, 200, 200, 200), nil);
}

- (void)testWindowAnimations {
  NSRunLoop *runLoop = [NSRunLoop currentRunLoop];
  
  // Test Alpha
  NSWindow *window = [windowController_ window];
  [window setAlphaValue:1.0];
  [timerCalled_ setShouldStop:NO];
  [NSAnimationContext beginGrouping];
  NSAnimationContext *currentContext = [NSAnimationContext currentContext];
  [currentContext setDuration:2];
  [[window animator] setAlphaValue:0.5];
  [NSAnimationContext endGrouping];
  [NSTimer scheduledTimerWithTimeInterval:0.1 
                                   target:self 
                                 selector:@selector(windowAlphaValueStopper:) 
                                 userInfo:window 
                                  repeats:NO];
  STAssertTrue([runLoop gtm_runUpToSixtySecondsWithContext:timerCalled_], nil);
  STAssertEquals([window alphaValue], (CGFloat)0.25, nil);
  
  // Test Frame
  [window setFrame:NSMakeRect(100, 100, 100, 100) display:YES];
  [timerCalled_ setShouldStop:NO];
  [NSAnimationContext beginGrouping];
  currentContext = [NSAnimationContext currentContext];
  [currentContext setDuration:2];
  [[window animator] setFrame:NSMakeRect(200, 200, 200, 200) display:YES];
  [NSAnimationContext endGrouping];
  [NSTimer scheduledTimerWithTimeInterval:0.1 
                                   target:self 
                                 selector:@selector(windowFrameStopper:) 
                                 userInfo:window 
                                  repeats:NO];
  STAssertTrue([runLoop gtm_runUpToSixtySecondsWithContext:timerCalled_], nil);
  STAssertEquals([window frame], NSMakeRect(300, 300, 150, 150), nil);
  
  // Test non-animation value
  [window setTitle:@"Foo"];
  [[window gtm_animatorStopper] setTitle:@"Bar"];
  STAssertEquals([window title], @"Bar", nil);
  
  // Test bad selector
  STAssertThrows([[window gtm_animatorStopper] testWindowAnimations], nil);
}

- (void)testNonLayerViewAnimations {
  NSRunLoop *runLoop = [NSRunLoop currentRunLoop];
  
  NSBox *nonLayerBox = [windowController_ nonLayerBox];
  STAssertNotNil(nonLayerBox, nil);
  
  // Test frame
  [nonLayerBox setFrame:NSMakeRect(50, 50, 50, 50)];
  [timerCalled_ setShouldStop:NO];
  [NSAnimationContext beginGrouping];
  NSAnimationContext *currentContext = [NSAnimationContext currentContext];
  [currentContext setDuration:2];
  [[nonLayerBox animator] setFrame:NSMakeRect(100, 100, 100, 100)];
  [NSAnimationContext endGrouping];
  [NSTimer scheduledTimerWithTimeInterval:0.1 
                                   target:self 
                                 selector:@selector(nonLayerFrameStopper:) 
                                 userInfo:nonLayerBox 
                                  repeats:NO];
  STAssertTrue([runLoop gtm_runUpToSixtySecondsWithContext:timerCalled_], nil);
  STAssertEquals([nonLayerBox frame], NSMakeRect(200, 200, 200, 200), nil);
  
  // Test non-animation value
  [nonLayerBox setToolTip:@"Foo"];
  [[nonLayerBox gtm_animatorStopper] setToolTip:@"Bar"];
  STAssertEquals([nonLayerBox toolTip], @"Bar", nil);
  
  // Test bad selector
  STAssertThrows([[nonLayerBox gtm_animatorStopper] testNonLayerViewAnimations], 
                 nil);
}

- (void)testLayerViewAnimations {
  NSRunLoop *runLoop = [NSRunLoop currentRunLoop];
  
  NSBox *layerBox = [windowController_ layerBox];
  STAssertNotNil(layerBox, nil);
  
  // Test frame
  [layerBox setFrame:NSMakeRect(50, 50, 50, 50)];
  [timerCalled_ setShouldStop:NO];
  [NSAnimationContext beginGrouping];
  NSAnimationContext *currentContext = [NSAnimationContext currentContext];
  [currentContext setDuration:2];
  [[layerBox animator] setFrame:NSMakeRect(100, 100, 100, 100)];
  [NSAnimationContext endGrouping];
  [NSTimer scheduledTimerWithTimeInterval:0.1 
                                   target:self 
                                 selector:@selector(layerFrameStopper:) 
                                 userInfo:layerBox 
                                  repeats:NO];
  STAssertTrue([runLoop gtm_runUpToSixtySecondsWithContext:timerCalled_], nil);
  STAssertEquals([layerBox frame], NSMakeRect(200, 200, 200, 200), nil);
  
  // Test non-animation value
  [layerBox setToolTip:@"Foo"];
  [[layerBox gtm_animatorStopper] setToolTip:@"Bar"];
  STAssertEquals([layerBox toolTip], @"Bar", nil);
  
  // Test bad selector
  STAssertThrows([[layerBox gtm_animatorStopper] testLayerViewAnimations], 
                 nil);

  // Test Short Selector
  STAssertThrows([[layerBox gtm_animatorStopper] set:1], nil);
}

@end

#endif  // MAC_OS_X_VERSION_MAX_ALLOWED >= MAC_OS_X_VERSION_10_5
