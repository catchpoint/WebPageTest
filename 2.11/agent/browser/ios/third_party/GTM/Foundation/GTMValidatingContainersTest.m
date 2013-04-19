//
//  GTMValidatingContainersTest.m
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

#import "GTMValidatingContainers.h"
#import "GTMSenTestCase.h"
#import "GTMUnitTestDevLog.h"

#pragma mark Test Support Declarations
@protocol GTMVCTestProtocol
@end

@interface GTMVCTestClass : NSObject
+ (id)instance;
@end

@interface GTMVCTestSubClass : GTMVCTestClass <GTMVCTestProtocol>
- (void)foo;
@end

@interface GTMVCValidatingTests : GTMTestCase {
  GTMVCTestClass *testClass_;
  GTMVCTestSubClass *testSubClass_;
}
@end

@interface GTMVCValidatorTests : GTMVCValidatingTests
@end 

@interface GTMVCContainerTests : GTMVCValidatingTests {
  GTMConformsToProtocolValidator *validator_;
  SEL selector_;
}
@end

@interface GTMVCArrayTests : GTMVCContainerTests
@end

@interface GTMVCDictionaryTests : GTMVCContainerTests
@end

@interface GTMVCSetTests : GTMVCContainerTests
@end

@interface GTMValidateContainerTests : GTMTestCase
@end

#pragma mark -
#pragma mark Test Support Definitions

@implementation GTMVCTestClass
+ (id)instance {
  return [[[[self class] alloc] init] autorelease];
}

- (NSString*)description {
  return NSStringFromClass([self class]);
}
@end

@implementation GTMVCTestSubClass
- (void)foo {
}
@end

@implementation GTMVCContainerTests
- (void)setUp {
  [super setUp];
  Protocol *prot = @protocol(GTMVCTestProtocol);
  validator_ = [[GTMConformsToProtocolValidator alloc] initWithProtocol:prot];
  selector_ = @selector(validateObject:forContainer:);
}

- (void)tearDown {
  [validator_ release];
  [super tearDown];
}
@end

@implementation GTMVCValidatingTests

- (void)setUp {
  [super setUp];
  testClass_ = [[GTMVCTestClass alloc] init];
  testSubClass_ = [[GTMVCTestSubClass alloc] init];
}

- (void)tearDown {
  [testClass_ release];
  [testSubClass_ release];
  [super tearDown];
}

@end

@implementation GTMVCValidatorTests

- (void)testKindOfClassValidator {
#if GTM_CONTAINERS_VALIDATE && GTM_CONTAINERS_VALIDATION_FAILED_LOG && !GTM_CONTAINERS_VALIDATION_FAILED_ASSERT
  [GTMUnitTestDevLog expectString:@"nil class"];
  GTMKindOfClassValidator *validator;
  validator = [GTMKindOfClassValidator validateAgainstClass:nil];
  STAssertNil(validator, @"should be nil");
  
  Class cls = [GTMVCTestClass class];
  validator = [GTMKindOfClassValidator validateAgainstClass:cls];
  STAssertNotNil(validator, @"should be valid");
  
  BOOL isGood = [validator validateObject:testClass_ forContainer:nil];
  STAssertTrue(isGood, @"should be validated");
  
  isGood = [validator validateObject:testSubClass_ forContainer:nil];
  STAssertTrue(isGood, @"should be validated");
  
  isGood = [validator validateObject:[NSNumber numberWithInt:0]
                        forContainer:nil];
  STAssertFalse(isGood, @"should fail");
#else  // GTM_CONTAINERS_VALIDATE && GTM_CONTAINERS_VALIDATION_FAILED_LOG && !GTM_CONTAINERS_VALIDATION_FAILED_ASSERT
  GTMKindOfClassValidator *validator;
  validator = [GTMKindOfClassValidator validateAgainstClass:nil];
  STAssertNil(validator, @"should be nil");
  
  Class cls = [GTMVCTestClass class];
  validator = [GTMKindOfClassValidator validateAgainstClass:cls];
  STAssertNil(validator, @"should be nil");
#endif  // GTM_CONTAINERS_VALIDATE && GTM_CONTAINERS_VALIDATION_FAILED_LOG && !GTM_CONTAINERS_VALIDATION_FAILED_ASSERT 
}

- (void)testMemberOfClassValidator {
#if GTM_CONTAINERS_VALIDATE && GTM_CONTAINERS_VALIDATION_FAILED_LOG && !GTM_CONTAINERS_VALIDATION_FAILED_ASSERT
  [GTMUnitTestDevLog expectString:@"nil class"];
  GTMMemberOfClassValidator *validator;
  validator = [GTMMemberOfClassValidator validateAgainstClass:nil];
  STAssertNil(validator, @"should be nil");
  
  Class cls = [GTMVCTestClass class];
  validator = [GTMMemberOfClassValidator validateAgainstClass:cls];
  STAssertNotNil(validator, @"should be valid");
  
  BOOL isGood = [validator validateObject:testClass_ forContainer:nil];
  STAssertTrue(isGood, @"should be validated");
 
  isGood = [validator validateObject:testSubClass_ forContainer:nil];
  STAssertFalse(isGood, @"should fail");
  
  isGood = [validator validateObject:nil forContainer:nil];
  STAssertFalse(isGood, @"should fail");
  
  isGood = [validator validateObject:[NSNumber numberWithInt:0]
                        forContainer:nil];
  STAssertFalse(isGood, @"should fail");
#else  // GTM_CONTAINERS_VALIDATE && GTM_CONTAINERS_VALIDATION_FAILED_LOG && !GTM_CONTAINERS_VALIDATION_FAILED_ASSERT
  GTMMemberOfClassValidator *validator;
  validator = [GTMMemberOfClassValidator validateAgainstClass:nil];
  STAssertNil(validator, @"should be nil");
  
  Class cls = [GTMVCTestClass class];
  validator = [GTMMemberOfClassValidator validateAgainstClass:cls];
  STAssertNil(validator, @"should be nil");
#endif  // GTM_CONTAINERS_VALIDATE && GTM_CONTAINERS_VALIDATION_FAILED_LOG && !GTM_CONTAINERS_VALIDATION_FAILED_ASSERT
}

- (void)testConformsToProtocolValidator {
#if GTM_CONTAINERS_VALIDATE && GTM_CONTAINERS_VALIDATION_FAILED_LOG && !GTM_CONTAINERS_VALIDATION_FAILED_ASSERT
  [GTMUnitTestDevLog expectString:@"nil protocol"];
  GTMConformsToProtocolValidator *validator;
  validator = [GTMConformsToProtocolValidator validateAgainstProtocol:nil];
  STAssertNil(validator, @"should be nil");
 
  Protocol *prot = @protocol(GTMVCTestProtocol);
  validator = [GTMConformsToProtocolValidator validateAgainstProtocol:prot];
  STAssertNotNil(validator, @"should be valid");
  
  BOOL isGood = [validator validateObject:testClass_ forContainer:nil];
  STAssertFalse(isGood, @"should fail");
  
  isGood = [validator validateObject:testSubClass_ forContainer:nil];
  STAssertTrue(isGood, @"should succeed");
  
  isGood = [validator validateObject:nil forContainer:nil];
  STAssertFalse(isGood, @"should fail");
#else  // GTM_CONTAINERS_VALIDATE && GTM_CONTAINERS_VALIDATION_FAILED_LOG && !GTM_CONTAINERS_VALIDATION_FAILED_ASSERT
  GTMConformsToProtocolValidator *validator;
  validator = [GTMConformsToProtocolValidator validateAgainstProtocol:nil];
  STAssertNil(validator, @"should be nil");
  
  Protocol *prot = @protocol(GTMVCTestProtocol);
  validator = [GTMConformsToProtocolValidator validateAgainstProtocol:prot];
  STAssertNil(validator, @"should be nil");
#endif  // GTM_CONTAINERS_VALIDATE && GTM_CONTAINERS_VALIDATION_FAILED_LOG && !GTM_CONTAINERS_VALIDATION_FAILED_ASSERT
}

- (void)testRespondsToSelectorValidator {
#if GTM_CONTAINERS_VALIDATE && GTM_CONTAINERS_VALIDATION_FAILED_LOG && !GTM_CONTAINERS_VALIDATION_FAILED_ASSERT
  [GTMUnitTestDevLog expectString:@"nil selector"];
  GTMRespondsToSelectorValidator *validator;
  validator = [GTMRespondsToSelectorValidator validateAgainstSelector:nil];
  STAssertNil(validator, @"should be nil");
  
  SEL sel = @selector(foo);
  validator = [GTMRespondsToSelectorValidator validateAgainstSelector:sel];
  STAssertNotNil(validator, @"should be valid");
  
  BOOL isGood = [validator validateObject:testClass_ forContainer:nil];
  STAssertFalse(isGood, @"should fail");
  
  isGood = [validator validateObject:testSubClass_ forContainer:nil];
  STAssertTrue(isGood, @"should succeed");
  
  isGood = [validator validateObject:nil forContainer:nil];
  STAssertFalse(isGood, @"should fail");
#else  // GTM_CONTAINERS_VALIDATE && GTM_CONTAINERS_VALIDATION_FAILED_LOG && !GTM_CONTAINERS_VALIDATION_FAILED_ASSERT
  GTMRespondsToSelectorValidator *validator;
  validator = [GTMRespondsToSelectorValidator validateAgainstSelector:nil];
  STAssertNil(validator, @"should be nil");
  
  SEL sel = @selector(foo);
  validator = [GTMRespondsToSelectorValidator validateAgainstSelector:sel];
  STAssertNil(validator, @"should be nil");
#endif  // GTM_CONTAINERS_VALIDATE && GTM_CONTAINERS_VALIDATION_FAILED_LOG && !GTM_CONTAINERS_VALIDATION_FAILED_ASSERT
}


@end

@implementation GTMVCArrayTests
- (void)testContainer {
  GTMValidatingArray *array;
  array = [GTMValidatingArray validatingArrayWithTarget:validator_
                                               selector:selector_];
  STAssertNotNil(array, @"should be valid");
  
  array = [[[GTMValidatingArray alloc] initValidatingWithTarget:validator_
                                                       selector:selector_] autorelease];
  STAssertNotNil(array, @"should be valid");
  
  [GTMUnitTestDevLog expectPattern:@"GTMVCTestClass failed container verification for GTMValidatingArray .*"];
  [array addObject:testSubClass_];
  [array addObject:testClass_];
  STAssertEquals([array objectAtIndex:0], testSubClass_, @"");
  
  [GTMUnitTestDevLog expectPattern:@"GTMVCTestClass failed container verification for GTMValidatingArray .*"];
  [array insertObject:testClass_ atIndex:0];
  [array insertObject:testSubClass_ atIndex:0];
  [GTMUnitTestDevLog expectPattern:@"GTMVCTestClass failed container verification for GTMValidatingArray .*"];
  [array replaceObjectAtIndex:0 withObject:testClass_];
  [array replaceObjectAtIndex:0 withObject:testSubClass_];
  [array removeLastObject];
  [array removeObjectAtIndex:0];
  NSUInteger expectedCount = 0U;
#if !(GTM_CONTAINERS_VALIDATE && GTM_CONTAINERS_VALIDATION_FAILED_LOG && !GTM_CONTAINERS_VALIDATION_FAILED_ASSERT)
  // If we're not validating, we don't expect any logs
  [GTMUnitTestDevLog resetExpectedLogs];
  expectedCount = 2U;
#endif  // !(GTM_CONTAINERS_VALIDATE && GTM_CONTAINERS_VALIDATION_FAILED_LOG && !GTM_CONTAINERS_VALIDATION_FAILED_ASSERT)
  STAssertEquals([array count], expectedCount, @"should have no objects left");

}
@end

@implementation GTMVCDictionaryTests
- (void)testContainer {
  GTMValidatingDictionary *dictionary;
  dictionary = [GTMValidatingDictionary validatingDictionaryWithTarget:validator_
                                                              selector:selector_];
  STAssertNotNil(dictionary, @"should be valid");
  
  dictionary = [[[GTMValidatingDictionary alloc] initValidatingWithTarget:validator_
                                                                 selector:selector_] autorelease];
  STAssertNotNil(dictionary, @"should be valid");
  
  [GTMUnitTestDevLog expectPattern:@"GTMVCTestClass failed container verification for GTMValidatingDictionary .*"];
  [dictionary setObject:testClass_ forKey:@"Key1"];
  [dictionary setObject:testSubClass_ forKey:@"Key2"];
  STAssertEquals([dictionary objectForKey:@"Key2"], testSubClass_, @"");
  STAssertNotNil([dictionary keyEnumerator], @"");
  
  [dictionary removeObjectForKey:@"Key2"];
  [dictionary removeObjectForKey:@"Key1"];
  STAssertEquals([dictionary count], (NSUInteger)0, @"should have no objects left");
  
  // So we get full code coverage
  [testSubClass_ foo];
#if !(GTM_CONTAINERS_VALIDATE && GTM_CONTAINERS_VALIDATION_FAILED_LOG && !GTM_CONTAINERS_VALIDATION_FAILED_ASSERT)
  // If we're not validating, we don't expect any logs
  [GTMUnitTestDevLog resetExpectedLogs];
#endif  // !(GTM_CONTAINERS_VALIDATE && GTM_CONTAINERS_VALIDATION_FAILED_LOG && !GTM_CONTAINERS_VALIDATION_FAILED_ASSERT)
}
@end

@implementation GTMVCSetTests
- (void)testContainer {
  GTMValidatingSet *set;
  set = [GTMValidatingSet validatingSetWithTarget:validator_
                                         selector:selector_];
  STAssertNotNil(set, @"should be valid");
  
  set = [[[GTMValidatingSet alloc] initValidatingWithTarget:validator_
                                                   selector:selector_] autorelease];
  STAssertNotNil(set, @"should be valid");
  
  [GTMUnitTestDevLog expectPattern:@"GTMVCTestClass failed container verification for GTMValidatingSet .*"];
  [set addObject:testClass_];
  [set addObject:testSubClass_];
  STAssertEqualObjects([set member:testSubClass_], testSubClass_, @"");
  STAssertNotNil([set objectEnumerator], @"");
  
  [set removeObject:testClass_];
  [set removeObject:testSubClass_];
#if !(GTM_CONTAINERS_VALIDATE && GTM_CONTAINERS_VALIDATION_FAILED_LOG && !GTM_CONTAINERS_VALIDATION_FAILED_ASSERT)
  // If we're not validating, we don't expect any logs
  [GTMUnitTestDevLog resetExpectedLogs];
#endif  // !(GTM_CONTAINERS_VALIDATE && GTM_CONTAINERS_VALIDATION_FAILED_LOG && !GTM_CONTAINERS_VALIDATION_FAILED_ASSERT)
  STAssertEquals([set count], (NSUInteger)0, @"should have no objects left");
}
@end

@implementation GTMValidateContainerTests
- (void)testValidatingContainers {
  NSDictionary *homogenousDict = [NSDictionary dictionaryWithObjectsAndKeys:
                                  [GTMVCTestSubClass instance], @"key1",
                                  [GTMVCTestSubClass instance], @"key2",
                                  nil];
  NSDictionary *heterogenousDict = [NSDictionary dictionaryWithObjectsAndKeys:
                                    [GTMVCTestClass instance], @"key1",
                                    [GTMVCTestSubClass instance], @"key2",
                                    nil];
  
  // Test bad container
  [GTMUnitTestDevLog expectPattern:@"container does not respont to -objectEnumerator: .*"];
  _GTMValidateContainerContainsKindOfClass([NSString string], 
                                           [GTMVCTestSubClass class]);
  
  _GTMValidateContainerContainsKindOfClass(homogenousDict, 
                                           [GTMVCTestSubClass class]);
  _GTMValidateContainerContainsKindOfClass(heterogenousDict, 
                                           [GTMVCTestClass class]);
  [GTMUnitTestDevLog expectPattern:@"GTMVCTestClass failed container verification for .*"];
  _GTMValidateContainerContainsKindOfClass(heterogenousDict, 
                                           [GTMVCTestSubClass class]);

  _GTMValidateContainerContainsMemberOfClass(homogenousDict, 
                                             [GTMVCTestSubClass class]);
  [GTMUnitTestDevLog expectPattern:@"GTMVCTestSubClass failed container verification for .*"];
  _GTMValidateContainerContainsMemberOfClass(heterogenousDict, 
                                             [GTMVCTestClass class]);

  _GTMValidateContainerConformsToProtocol(homogenousDict, 
                                           @protocol(GTMVCTestProtocol));
  [GTMUnitTestDevLog expectPattern:@"GTMVCTestClass failed container verification for .*"];
  _GTMValidateContainerConformsToProtocol(heterogenousDict, 
                                             @protocol(GTMVCTestProtocol));

  _GTMValidateContainerItemsRespondToSelector(homogenousDict, 
                                          @selector(foo));
  [GTMUnitTestDevLog expectPattern:@"GTMVCTestClass failed container verification for .*"];
  _GTMValidateContainerItemsRespondToSelector(heterogenousDict, 
                                          @selector(foo));
#if !(GTM_CONTAINERS_VALIDATE && GTM_CONTAINERS_VALIDATION_FAILED_LOG && !GTM_CONTAINERS_VALIDATION_FAILED_ASSERT)
  // If we're not validating, we don't expect any logs
  [GTMUnitTestDevLog resetExpectedLogs];
#endif  // !(GTM_CONTAINERS_VALIDATE && GTM_CONTAINERS_VALIDATION_FAILED_LOG && !GTM_CONTAINERS_VALIDATION_FAILED_ASSERT)
}
@end
