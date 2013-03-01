//
//  GTMUnitTestingBindingTest.m
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
#import "GTMUnitTestingTest.h"
#import "GTMNSObject+BindingUnitTesting.h"

@interface GTMUnitTestingBindingTest : GTMTestCase {
  int expectedFailureCount_;
}
@end

@interface GTMUnitTestingBindingBadClass : NSObject
@end

@implementation GTMUnitTestingBindingTest

// Iterates through all of our subviews testing the exposed bindings
- (void)doSubviewBindingTest:(NSView*)view {
  NSArray *subviews = [view subviews];
  NSView *subview;
  GTM_FOREACH_OBJECT(subview, subviews) {
    GTMTestExposedBindings(subview, @"testing %@", subview);
    [self doSubviewBindingTest:subview];
  }
}

- (void)testBindings {
  // Get our window to work with and test it's bindings
  GTMUnitTestingTestController *testWindowController 
    = [[GTMUnitTestingTestController alloc] initWithWindowNibName:@"GTMUnitTestingTest"];
  NSWindow *window = [testWindowController window];
  GTMTestExposedBindings(window, @"Window failed binding test");
  [self doSubviewBindingTest:[window contentView]];
  [window close];
  [testWindowController release];

  // Run a test against something with no bindings. 
  // We're expecting a failure here.
  expectedFailureCount_ = 1;
  GTMTestExposedBindings(@"foo", @"testing no bindings");
  STAssertEquals(expectedFailureCount_, 0, @"Didn't get expected failures testing bindings");
  
  // Run test against some with bad bindings.
  // We're expecting failures here.
  expectedFailureCount_ = 4;
  GTMUnitTestingBindingBadClass *bad = [[[GTMUnitTestingBindingBadClass alloc] init] autorelease];
  GTMTestExposedBindings(bad, @"testing bad bindings");
  STAssertEquals(expectedFailureCount_, 0, @"Didn't get expected failures testing bad bindings");
}

- (void)failWithException:(NSException *)anException {
  if (expectedFailureCount_ > 0) {
    expectedFailureCount_ -= 1;
  } else {
    [super failWithException:anException];  // COV_NF_LINE - not expecting exception
  }
}

@end

// Forces several error cases in our binding tests to test them
@implementation GTMUnitTestingBindingBadClass

NSString *const kGTMKeyWithNoClass = @"keyWithNoClass";
NSString *const kGTMKeyWithNoValue = @"keyWithNoValue";
NSString *const kGTMKeyWeCantSet = @"keyWeCantSet";
NSString *const kGTMKeyThatIsntEqual = @"keyThatIsntEqual";

- (NSArray *)exposedBindings {
  return [NSArray arrayWithObjects:kGTMKeyWithNoClass, 
                                   kGTMKeyWithNoValue, 
                                   kGTMKeyWeCantSet, 
                                   kGTMKeyThatIsntEqual,
                                   nil];
}

- (NSArray*)gtm_unitTestExposedBindingsTestValues:(NSString*)binding {
  GTMBindingUnitTestData *data 
    = [GTMBindingUnitTestData testWithIdentityValue:kGTMKeyThatIsntEqual];
  return [NSArray arrayWithObject:data];
}

- (Class)valueClassForBinding:(NSString*)binding {
  return [binding isEqualTo:kGTMKeyWithNoClass] ? nil : [NSString class];
}

- (id)valueForKey:(NSString*)binding {
  if ([binding isEqualTo:kGTMKeyWithNoValue]) {
    [NSException raise:NSUndefinedKeyException format:@""];
  }
  return @"foo";
}

- (void)setValue:(id)value forKey:(NSString*)binding {
  if ([binding isEqualTo:kGTMKeyWeCantSet]) {
    [NSException raise:NSUndefinedKeyException format:@""];
  }
}
@end

