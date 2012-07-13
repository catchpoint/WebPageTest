//
//  GTMNSObject+KeyValueObservingTest.m
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

//
//  Tester.m
//  MAKVONotificationCenter
//
//  Created by Michael Ash on 10/15/08.
//

// This code is based on code by Michael Ash.
// See comment in header.

#import "GTMSenTestCase.h"
#import "GTMNSObject+KeyValueObserving.h"
#import "GTMDefines.h"
#import "GTMUnitTestDevLog.h"

@interface GTMNSObject_KeyValueObservingTest : GTMTestCase  {
  int32_t count_;
  NSMutableDictionary *dict_;
  __weak NSString *expectedValue_;
}

- (void)observeValueChange:(GTMKeyValueChangeNotification *)notification;

@end

@implementation GTMNSObject_KeyValueObservingTest
- (void)setUp {
  dict_ = [[NSMutableDictionary alloc] initWithObjectsAndKeys:
          @"foo", @"key",
          nil];
}

- (void)tearDown {
  [dict_ release];
}

- (void)testSingleChange {
  count_ = 0;
  [dict_ gtm_addObserver:self
             forKeyPath:@"key"
               selector:@selector(observeValueChange:)
               userInfo:@"userInfo"
                options:NSKeyValueObservingOptionNew];
  expectedValue_ = @"bar";
  [dict_ setObject:expectedValue_ forKey:@"key"];
  STAssertEquals(count_, (int32_t)1, nil);
  [dict_ gtm_removeObserver:self
                 forKeyPath:@"key"
                  selector:@selector(observeValueChange:)];
  [dict_ setObject:@"foo" forKey:@"key"];
  STAssertEquals(count_, (int32_t)1, nil);
}

- (void)testStopObservingAllKeyPaths {
  count_ = 0;
  [dict_ gtm_addObserver:self
              forKeyPath:@"key"
                selector:@selector(observeValueChange:)
                userInfo:@"userInfo"
                 options:NSKeyValueObservingOptionNew];
  expectedValue_ = @"bar";
  [dict_ setObject:expectedValue_ forKey:@"key"];
  STAssertEquals(count_, (int32_t)1, nil);
  [self gtm_stopObservingAllKeyPaths];
  [dict_ setObject:@"foo" forKey:@"key"];
  STAssertEquals(count_, (int32_t)1, nil);
}


- (void)testRemoving {
  [GTMUnitTestDevLogDebug expectPattern:@"-\\[GTMNSObject_KeyValueObservingTest"
   @" testRemoving\\] was not observing.*"];

  [dict_ gtm_removeObserver:self
                 forKeyPath:@"key"
                   selector:@selector(observeValueChange:)];
}

- (void)testAdding {
  [dict_ gtm_addObserver:self
              forKeyPath:@"key"
                selector:@selector(observeValueChange:)
                userInfo:@"userInfo"
                 options:NSKeyValueObservingOptionNew];
  [GTMUnitTestDevLog expectPattern:@"-\\[GTMNSObject_KeyValueObservingTest"
   @" testAdding\\] already observing.*"];
  [dict_ gtm_addObserver:self
              forKeyPath:@"key"
                selector:@selector(observeValueChange:)
                userInfo:@"userInfo"
                 options:NSKeyValueObservingOptionNew];
  [dict_ gtm_removeObserver:self
                 forKeyPath:@"key"
                   selector:@selector(observeValueChange:)];
}

- (void)observeValueChange:(GTMKeyValueChangeNotification *)notification {
  STAssertEqualObjects([notification userInfo], @"userInfo", nil);
  STAssertEqualObjects([notification keyPath], @"key", nil);
  STAssertEqualObjects([notification object], dict_, nil);
  NSDictionary *change = [notification change];
  NSString *value = [change objectForKey:NSKeyValueChangeNewKey];
  STAssertEqualObjects(value, expectedValue_, nil);
  ++count_;

  GTMKeyValueChangeNotification *copy = [[notification copy] autorelease];
  STAssertEqualObjects(notification, copy, nil);
  STAssertEquals([notification hash], [copy hash], nil);
}

@end

#if GTM_PERFORM_KVO_CHECKS
@interface GTMNSObject_KeyValueObservingChecksTest: GTMTestCase {
 @private
  id value_;
  id _value2;
  __weak NSArray *value3_;
  __weak NSString *value4;
}
- (NSString *)value4;
@end

@implementation GTMNSObject_KeyValueObservingChecksTest

- (void)setUp {
  value_ = nil;
  _value2 = nil;
}

- (void)testAddingObserver {
  [GTMUnitTestDevLogDebug expectPattern:@"warning:.*"];
  [self addObserver:self forKeyPath:@"value_" options:0 context:NULL];
  [GTMUnitTestDevLogDebug expectPattern:@"warning:.*"];
  [self addObserver:self forKeyPath:@"_value2" options:0 context:NULL];
  value3_ = [NSArray arrayWithObject:@"foo"];
  NSIndexSet *set = [NSIndexSet indexSetWithIndex:0];
  [GTMUnitTestDevLogDebug expectPattern:@"warning:.*"];
  [value3_ addObserver:self toObjectsAtIndexes:set forKeyPath:@"_fronttest"
               options:0 context:NULL];
  [GTMUnitTestDevLogDebug expectPattern:@"warning:.*"];
  [value3_ addObserver:self toObjectsAtIndexes:set forKeyPath:@"backtest_"
               options:0 context:NULL];
#if DEBUG
  // Should only throw in debug
  STAssertThrows([self valueForKey:@"value_"], nil);
#else
  STAssertNoThrow([self valueForKey:@"value_"], nil);
#endif
  value4 = @"Hello";
  STAssertEqualObjects([self valueForKey:@"value4"], @"Hello", nil);
  [self removeObserver:self forKeyPath:@"value_"];
  [self removeObserver:self forKeyPath:@"_value2"];
  [value3_ removeObserver:self fromObjectsAtIndexes:set forKeyPath:@"_fronttest"];
  [value3_ removeObserver:self fromObjectsAtIndexes:set forKeyPath:@"backtest_"];
}

- (NSString *)value4 {
  return value4;
}
@end

#endif  // GTM_PERFORM_KVO_CHECKS

