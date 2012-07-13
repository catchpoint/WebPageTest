//
//  GTMObjC2RuntimeTest.m
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

#import "GTMObjC2Runtime.h"
#import "GTMSenTestCase.h"
#import "GTMSystemVersion.h"
#import "GTMTypeCasting.h"

#import <string.h>

@protocol GTMObjC2Runtime_TestProtocol
@end

@protocol GTMObjC2Runtime_Test2Protocol
AT_OPTIONAL
- (NSString*)optional;
AT_REQUIRED
- (NSString*)required;
AT_OPTIONAL
+ (NSString*)class_optional;
AT_REQUIRED
+ (NSString*)class_required;
@end

@interface GTMObjC2RuntimeTest : GTMTestCase {
  Class cls_;
}
@end

@interface GTMObjC2Runtime_TestClass : NSObject <GTMObjC2Runtime_TestProtocol>
- (NSString*)kwyjibo;

@end

@interface GTMObjC2Runtime_TestClass (GMObjC2Runtime_TestClassCategory)
- (NSString*)eatMyShorts;
@end

@implementation GTMObjC2Runtime_TestClass

+ (NSString*)dontHaveACow {
  return @"dontHaveACow";
}

- (NSString*)kwyjibo {
  return @"kwyjibo";
}
@end

@implementation GTMObjC2Runtime_TestClass (GMObjC2Runtime_TestClassCategory)
- (NSString*)eatMyShorts {
  return @"eatMyShorts";
}

+ (NSString*)brokeHisBrain {
  return @"brokeHisBrain";
}

@end

@interface GTMObjC2NotificationWatcher : NSObject
- (void)startedTest:(NSNotification *)notification;
@end

@implementation GTMObjC2NotificationWatcher
- (id)init {
  if ((self = [super init])) {
    NSNotificationCenter *nc = [NSNotificationCenter defaultCenter];
    // We release ourselves when we are notified.
    [self retain];
    [nc addObserver:self
           selector:@selector(startedTest:)
               name:SenTestSuiteDidStartNotification
             object:nil];

  }
  return self;
}

- (void)startedTest:(NSNotification *)notification {
  // Logs if we are testing on Tiger or Leopard runtime.
  SenTestSuiteRun *suiteRun = GTM_STATIC_CAST(SenTestSuiteRun,
                                              [notification object]);
  NSString *testName = [[suiteRun test] name];
  NSString *className = NSStringFromClass([GTMObjC2RuntimeTest class]);
  if ([testName isEqualToString:className]) {
    NSString *runtimeString;
#ifndef OBJC2_UNAVAILABLE
    runtimeString = @"ObjC1";
#else
    runtimeString = @"ObjC2";
#endif
    NSLog(@"Running GTMObjC2RuntimeTests using %@ runtime.", runtimeString);
    NSNotificationCenter *nc = [NSNotificationCenter defaultCenter];
    [nc removeObserver:self];
    [self autorelease];
  }
}
@end

@implementation GTMObjC2RuntimeTest

+ (void)initialize {
  // This allows us to track which runtime we are actually testing.
  [[[GTMObjC2NotificationWatcher alloc] init] autorelease];
}

- (void)setUp {
  cls_ = [[GTMObjC2Runtime_TestClass class] retain];
}

- (void)tearDown {
  [cls_ release];
}

- (void)test_object_getClass {
  // Nil Checks
  STAssertNil(object_getClass(nil), nil);

  // Standard use check
  GTMObjC2Runtime_TestClass *test = [[[cls_ alloc] init] autorelease];
  Class cls = object_getClass(test);
  STAssertEqualObjects(cls, cls_, nil);
}

- (void)test_class_getName {
  // Nil Checks
  const char *name = class_getName(nil);
  STAssertEqualCStrings(name, "nil", nil);

  // Standard use check
  STAssertEqualCStrings(class_getName(cls_), "GTMObjC2Runtime_TestClass", nil);
}

- (void)test_class_conformsToProtocol {
  // Nil Checks
  STAssertFalse(class_conformsToProtocol(cls_, @protocol(NSObject)), nil);
  STAssertFalse(class_conformsToProtocol(cls_, nil), nil);
  // The following two tests intentionally commented out as they fail on
  // Leopard with a crash, so we fail on Tiger intentionally as well.
  // STAssertFalse(class_conformsToProtocol(nil, @protocol(NSObject)), nil);
  // STAssertFalse(class_conformsToProtocol(nil, nil), nil);

  // Standard use check
  STAssertTrue(class_conformsToProtocol(cls_,
                                        @protocol(GTMObjC2Runtime_TestProtocol)),
               nil);
}

- (void)test_class_respondsToSelector {
  // Nil Checks
  STAssertFalse(class_respondsToSelector(cls_, @selector(setUp)), nil);
  STAssertFalse(class_respondsToSelector(cls_, nil), nil);

  // Standard use check
  STAssertTrue(class_respondsToSelector(cls_, @selector(kwyjibo)), nil);
}

- (void)test_class_getSuperclass {
  // Nil Checks
  STAssertNil(class_getSuperclass(nil), nil);

  // Standard use check
  STAssertEqualObjects(class_getSuperclass(cls_), [NSObject class], nil);
}

- (void)test_class_copyMethodList {
  // Nil Checks
  Method *list = class_copyMethodList(nil, nil);
  STAssertNULL(list, nil);

  // Standard use check
  list = class_copyMethodList(cls_, nil);
  STAssertNotNULL(list, nil);
  free(list);
  unsigned int count = 0;
  list = class_copyMethodList(cls_, &count);
  STAssertNotNULL(list, nil);
  STAssertEquals(count, 2U, nil);
  STAssertNULL(list[count], nil);
  free(list);

  // Now test meta class
  count = 0;
  list = class_copyMethodList((Class)objc_getMetaClass(class_getName(cls_)),
                              &count);
  STAssertNotNULL(list, nil);
  STAssertEquals(count, 2U, nil);
  STAssertNULL(list[count], nil);
  free(list);
}

- (void)test_method_getName {
  // Nil Checks
  STAssertNULL(method_getName(nil), nil);

  // Standard use check
  Method *list = class_copyMethodList(cls_, nil);
  STAssertNotNULL(list, nil);
  const char* selName1 = sel_getName(method_getName(list[0]));
  const char* selName2 = sel_getName(@selector(kwyjibo));
  const char* selName3 = sel_getName(@selector(eatMyShorts));
  BOOL isGood = ((strcmp(selName1, selName2)) == 0 || (strcmp(selName1, selName3) == 0));
  STAssertTrue(isGood, nil);
  free(list);
}

- (void)test_method_exchangeImplementations {
  // nil checks
  method_exchangeImplementations(nil, nil);

  // Standard use check
  GTMObjC2Runtime_TestClass *test = [[GTMObjC2Runtime_TestClass alloc] init];
  STAssertNotNil(test, nil);

  // Get initial values
  NSString *val1 = [test kwyjibo];
  STAssertNotNil(val1, nil);
  NSString *val2 = [test eatMyShorts];
  STAssertNotNil(val2, nil);
  NSString *val3 = [GTMObjC2Runtime_TestClass dontHaveACow];
  STAssertNotNil(val3, nil);
  NSString *val4 = [GTMObjC2Runtime_TestClass brokeHisBrain];
  STAssertNotNil(val4, nil);

  // exchange the imps
  Method *list = class_copyMethodList(cls_, nil);
  STAssertNotNULL(list, nil);
  method_exchangeImplementations(list[0], list[1]);

  // test against initial values
  NSString *val5 = [test kwyjibo];
  STAssertNotNil(val5, nil);
  NSString *val6 = [test eatMyShorts];
  STAssertNotNil(val6, nil);
  STAssertEqualStrings(val1, val6, nil);
  STAssertEqualStrings(val2, val5, nil);

  // Check that other methods not affected
  STAssertEqualStrings([GTMObjC2Runtime_TestClass dontHaveACow], val3, nil);
  STAssertEqualStrings([GTMObjC2Runtime_TestClass brokeHisBrain], val4, nil);

  // exchange the imps back
  method_exchangeImplementations(list[0], list[1]);

  // and test against initial values again
  NSString *val7 = [test kwyjibo];
  STAssertNotNil(val7, nil);
  NSString *val8 = [test eatMyShorts];
  STAssertNotNil(val8, nil);
  STAssertEqualStrings(val1, val7, nil);
  STAssertEqualStrings(val2, val8, nil);

  method_exchangeImplementations(list[0], nil);
  method_exchangeImplementations(nil, list[0]);

  val7 = [test kwyjibo];
  STAssertNotNil(val7, nil);
  val8 = [test eatMyShorts];
  STAssertNotNil(val8, nil);
  STAssertEqualStrings(val1, val7, nil);
  STAssertEqualStrings(val2, val8, nil);

  free(list);
  [test release];
}

- (void)test_method_getImplementation {
  // Nil Checks
  STAssertNULL(method_getImplementation(nil), nil);

  // Standard use check
  Method *list = class_copyMethodList(cls_, nil);
  STAssertNotNULL(list, nil);
  STAssertNotNULL(method_getImplementation(list[0]), nil);
  free(list);
}

- (void)test_method_setImplementation {
  // Standard use check
  GTMObjC2Runtime_TestClass *test = [[GTMObjC2Runtime_TestClass alloc] init];
  Method *list = class_copyMethodList(cls_, nil);

  // Get initial value
  NSString *str1 = objc_msgSend(test, method_getName(list[0]));
  STAssertNotNil(str1, nil);

  // set the imp to something else
  IMP oldImp = method_setImplementation(list[0], method_getImplementation(list[1]));
  STAssertNotNULL(oldImp, nil);

  // make sure they are different
  NSString *str2 = objc_msgSend(test,method_getName(list[0]));
  STAssertNotNil(str2, nil);
  STAssertNotEqualStrings(str1, str2, nil);

  // reset the imp
  IMP newImp = method_setImplementation(list[0], oldImp);
  STAssertNotEquals(oldImp, newImp, nil);

  // test nils
  // Apparently it was a bug that we could call setImplementation with a nil
  // so we now test to make sure that setting to nil works as expected on
  // all systems.
#if MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5
  // Built for less then leopard gives us the behaviors we defined...
  // (doesn't take nil)
  IMP nullImp = method_setImplementation(list[0], nil);
  STAssertNULL(nullImp, nil);
  IMP testImp = method_setImplementation(list[0], newImp);
  STAssertEquals(testImp, oldImp, nil);
#else
  // Built for leopard or later means we get the os runtime behavior...
  if ([GTMSystemVersion isLeopard]) {
    // (takes nil)
    oldImp = method_setImplementation(list[0], nil);
    STAssertNotNULL(oldImp, nil);
    newImp = method_setImplementation(list[0], oldImp);
    STAssertNULL(newImp, nil);
  } else {
    // (doesn't take nil)
    IMP nullImp = method_setImplementation(list[0], nil);
    STAssertNULL(nullImp, nil);
    IMP testImp = method_setImplementation(list[0], newImp);
    STAssertEquals(testImp, oldImp, nil);
  }
#endif

  // This case intentionally not tested. Passing nil to method_setImplementation
  // on Leopard crashes. It does on Tiger as well. Half works on SnowLeopard.
  // We made our Tiger implementation the same as the SnowLeopard
  // implementation.
  // Logged as radar 5572981.
  if (![GTMSystemVersion isLeopardOrGreater]) {
    STAssertNULL(method_setImplementation(nil, nil), nil);
  }
#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
  if ([GTMSystemVersion isSnowLeopardOrGreater]) {
    STAssertNULL(method_setImplementation(nil, newImp), nil);
  }
#endif

  [test release];
  free(list);
}

- (void)test_protocol_getMethodDescription {
  // Check nil cases
  struct objc_method_description desc = protocol_getMethodDescription(nil, nil,
                                                                      YES, YES);
  STAssertNULL(desc.name, nil);
  desc = protocol_getMethodDescription(nil, @selector(optional), YES, YES);
  STAssertNULL(desc.name, nil);
  desc = protocol_getMethodDescription(@protocol(GTMObjC2Runtime_Test2Protocol),
                                       nil, YES, YES);
  STAssertNULL(desc.name, nil);

  // Instance Methods
  // Check Required case. Only OBJC2 supports required.
  desc = protocol_getMethodDescription(@protocol(GTMObjC2Runtime_Test2Protocol),
                                       @selector(optional), YES, YES);
#if OBJC_API_VERSION >= 2
  STAssertNULL(desc.name, nil);
#else
  STAssertNotNULL(desc.name, nil);
#endif

  // Check Required case. Only OBJC2 supports required.
  desc = protocol_getMethodDescription(@protocol(GTMObjC2Runtime_Test2Protocol),
                                       @selector(required), YES, YES);

  STAssertNotNULL(desc.name, nil);

  // Check Optional case. Only OBJC2 supports optional.
  desc = protocol_getMethodDescription(@protocol(GTMObjC2Runtime_Test2Protocol),
                                       @selector(optional), NO, YES);

  STAssertNotNULL(desc.name, nil);

  // Check Optional case. Only OBJC2 supports optional.
  desc = protocol_getMethodDescription(@protocol(GTMObjC2Runtime_Test2Protocol),
                                       @selector(required), NO, YES);
#if OBJC_API_VERSION >= 2
  STAssertNULL(desc.name, nil);
#else
  STAssertNotNULL(desc.name, nil);
#endif

  // Class Methods
  // Check Required case. Only OBJC2 supports required.
  desc = protocol_getMethodDescription(@protocol(GTMObjC2Runtime_Test2Protocol),
                                       @selector(class_optional), YES, NO);
#if OBJC_API_VERSION >= 2
  STAssertNULL(desc.name, nil);
#else
  STAssertNotNULL(desc.name, nil);
#endif

  // Check Required case. Only OBJC2 supports required.
  desc = protocol_getMethodDescription(@protocol(GTMObjC2Runtime_Test2Protocol),
                                       @selector(class_required), YES, NO);

  STAssertNotNULL(desc.name, nil);

  // Check Optional case. Only OBJC2 supports optional.
  desc = protocol_getMethodDescription(@protocol(GTMObjC2Runtime_Test2Protocol),
                                       @selector(class_optional), NO, NO);

  STAssertNotNULL(desc.name, nil);

  // Check Optional case. Only OBJC2 supports optional.
  desc = protocol_getMethodDescription(@protocol(GTMObjC2Runtime_Test2Protocol),
                                       @selector(class_required), NO, NO);
#if OBJC_API_VERSION >= 2
  STAssertNULL(desc.name, nil);
#else
  STAssertNotNULL(desc.name, nil);
#endif

}

@end
