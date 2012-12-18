//
//  GTMValidatingContainers.m
//
//  Mutable containers that do verification of objects being added to them 
//  at runtime. Support for arrays, dictionaries and sets.
//
//  Documentation on subclassing class clusters (which we are doing) is here:
//  http://developer.apple.com/documentation/Cocoa/Conceptual/CocoaFundamentals/CocoaObjects/chapter_3_section_9.html#//apple_ref/doc/uid/TP40002974-CH4-DontLinkElementID_105
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

#if GTM_CONTAINERS_VALIDATE

#import "GTMDebugSelectorValidation.h"
#if GTM_IPHONE_SDK
#import <objc/message.h>
#import <objc/runtime.h>
#else  // GTM_IPHONE_SDK
#import <objc/objc-runtime.h>
#endif  // GTM_IPHONE_SDK

GTM_INLINE BOOL VerifyObjectWithTargetAndSelectorForContainer(id anObject,
                                                              id target,
                                                              SEL selector,
                                                              id container) {
  // We must take care here, since Intel leaves junk in high bytes of return 
  // register for predicates that return BOOL.
  // For details see: 
  // http://developer.apple.com/documentation/MacOSX/Conceptual/universal_binary/universal_binary_tips/chapter_5_section_23.html
  // and
  // http://www.red-sweater.com/blog/320/abusing-objective-c-with-class#comment-83187
  BOOL isGood = ((BOOL (*)(id, SEL, id, id))objc_msgSend)(target, selector, 
                                                          anObject, container);
  if (!isGood) {
#if GTM_CONTAINERS_VALIDATION_FAILED_ASSERT
    _GTMDevAssert(isGood, @"%@ failed container verification for %@", 
                  anObject, [container description]);
#endif  // GTM_CONTAINERS_VALIDATION_FAILED_LOG
#if GTM_CONTAINERS_VALIDATION_FAILED_LOG
    _GTMDevLog(@"%@ failed container verification for %@", anObject, 
               [container description]);
#endif  // GTM_CONTAINERS_VALIDATION_FAILED_LOG
  }
  return isGood;
}

GTM_INLINE void VerifySelectorOnTarget(SEL sel, id target) {
  GTMAssertSelectorNilOrImplementedWithReturnTypeAndArguments(target, 
                                                              sel, 
                                                              @encode(BOOL), 
                                                              @encode(id), 
                                                              @encode(id),
                                                              nil);
}  

void _GTMValidateContainerContainsKindOfClass(id container, Class cls) {
  GTMKindOfClassValidator *validator;
  validator = [GTMKindOfClassValidator validateAgainstClass:cls];
  _GTMValidateContainer(container, 
                        validator, 
                        @selector(validateObject:forContainer:));
}

void _GTMValidateContainerContainsMemberOfClass(id container, Class cls) {
  GTMMemberOfClassValidator *validator;
  validator = [GTMMemberOfClassValidator validateAgainstClass:cls];
  _GTMValidateContainer(container, 
                        validator, 
                        @selector(validateObject:forContainer:));
}

void _GTMValidateContainerConformsToProtocol(id container, Protocol* prot) {
  GTMConformsToProtocolValidator *validator;
  validator = [GTMConformsToProtocolValidator validateAgainstProtocol:prot];
  _GTMValidateContainer(container, 
                        validator, 
                        @selector(validateObject:forContainer:));
}

void _GTMValidateContainerItemsRespondToSelector(id container, SEL sel) {
  GTMRespondsToSelectorValidator *validator;
  validator = [GTMRespondsToSelectorValidator validateAgainstSelector:sel];
  _GTMValidateContainer(container, 
                        validator, 
                        @selector(validateObject:forContainer:));
}

void _GTMValidateContainer(id container, id target, SEL selector) {
  if ([container respondsToSelector:@selector(objectEnumerator)]) {
    NSEnumerator *enumerator = [container objectEnumerator];
    id val;
    while ((val = [enumerator nextObject])) {
      VerifyObjectWithTargetAndSelectorForContainer(val, 
                                                    target, 
                                                    selector, 
                                                    container);
    }
  } else {
#if GTM_CONTAINERS_VALIDATION_FAILED_ASSERT
    _GTMDevAssert(0, @"container %@ does not respond to -objectEnumerator", 
                  [container description]);
#endif  // GTM_CONTAINERS_VALIDATION_FAILED_LOG
#if GTM_CONTAINERS_VALIDATION_FAILED_LOG
  _GTMDevLog(@"container does not respont to -objectEnumerator: %@", 
             [container description]);
#endif  // GTM_CONTAINERS_VALIDATION_FAILED_LOG
  }  
}
#endif  // GTM_CONTAINERS_VALIDATE

@implementation GTMValidatingArray

+ (id)validatingArrayWithTarget:(id)target selector:(SEL)sel {
  return [self validatingArrayWithCapacity:0 target:target selector:sel];
}

+ (id)validatingArrayWithCapacity:(NSUInteger)capacity 
                           target:(id)target 
                         selector:(SEL)sel {
  return [[[[self class] alloc] initValidatingWithCapacity:0 
                                                    target:target 
                                                  selector:sel] autorelease];
}

- (id)initValidatingWithTarget:(id)target selector:(SEL)sel {
  return [self initValidatingWithCapacity:0 target:target selector:sel];
}

#if GTM_CONTAINERS_VALIDATE
- (id)initValidatingWithCapacity:(NSUInteger)capacity
                          target:(id)target 
                        selector:(SEL)sel {
  if ((self = [super init])) {
    embeddedContainer_ = [[NSMutableArray alloc] initWithCapacity:capacity];
    target_ = [target retain];
    selector_ = sel;
    VerifySelectorOnTarget(selector_, target_);
  }
  return self;
}

- (void)dealloc {
  [embeddedContainer_ release];
  [target_ release];
  [super dealloc];
}

- (NSUInteger)count {
  return [embeddedContainer_ count];
}

- (id)objectAtIndex:(NSUInteger)idx {
  return [embeddedContainer_ objectAtIndex:idx];
}

- (void)addObject:(id)anObject {
  if (VerifyObjectWithTargetAndSelectorForContainer(anObject, target_, 
                                                    selector_, self)) {
    [embeddedContainer_ addObject:anObject];
  }
}

- (void)insertObject:(id)anObject atIndex:(NSUInteger)idx {
  if (VerifyObjectWithTargetAndSelectorForContainer(anObject, target_, 
                                                    selector_, self)) {
    [embeddedContainer_ insertObject:anObject atIndex:idx];
  }
}

- (void)removeLastObject {
  [embeddedContainer_ removeLastObject];
}

- (void)removeObjectAtIndex:(NSUInteger)idx {
  [embeddedContainer_ removeObjectAtIndex:idx];
}

- (void)replaceObjectAtIndex:(NSUInteger)idx withObject:(id)anObject {
    if (VerifyObjectWithTargetAndSelectorForContainer(anObject, target_, 
                                                      selector_, self)) {
    [embeddedContainer_ replaceObjectAtIndex:idx withObject:anObject];
  }
}

- (NSString*)description {
  return [NSString stringWithFormat:@"%@ - %@", 
          NSStringFromClass([self class]),
          [embeddedContainer_ description]];
}

#else  // GTM_CONTAINERS_VALIDATE
- (id)initValidatingWithCapacity:(NSUInteger)capacity
                          target:(id)target 
                        selector:(SEL)sel {
  if ((self = [super init])) {
    [self release];
  }
  return (GTMValidatingArray*)[[NSMutableArray alloc] initWithCapacity:capacity];
}
#endif  // GTM_CONTAINERS_VALIDATE
@end

@implementation GTMValidatingDictionary
+ (id)validatingDictionaryWithTarget:(id)target selector:(SEL)sel {
  return [self validatingDictionaryWithCapacity:0 target:target selector:sel];
}

+ (id)validatingDictionaryWithCapacity:(NSUInteger)capacity 
                                target:(id)target 
                              selector:(SEL)sel {
  return [[[[self class] alloc] initValidatingWithCapacity:0 
                                                    target:target 
                                                  selector:sel] autorelease];
}  

- (id)initValidatingWithTarget:(id)target selector:(SEL)sel {
  return [self initValidatingWithCapacity:0 target:target selector:sel];
}

#if GTM_CONTAINERS_VALIDATE
- (id)initValidatingWithCapacity:(NSUInteger)capacity
                          target:(id)target 
                        selector:(SEL)sel {
  if ((self = [super init])) {
    embeddedContainer_ = [[NSMutableDictionary alloc] initWithCapacity:capacity];
    target_ = [target retain];
    selector_ = sel;
    VerifySelectorOnTarget(selector_, target_);
  }
  return self;
}

- (void)dealloc {
  [target_ release];
  [embeddedContainer_ release];
  [super dealloc];
}

- (NSUInteger)count {
  return [embeddedContainer_ count];
}

- (NSEnumerator *)keyEnumerator {
  return [embeddedContainer_ keyEnumerator];
}

- (id)objectForKey:(id)aKey {
  return [embeddedContainer_ objectForKey:aKey];
}

- (void)removeObjectForKey:(id)aKey {
  [embeddedContainer_ removeObjectForKey:aKey];
}

- (void)setObject:(id)anObject forKey:(id)aKey {
  if (VerifyObjectWithTargetAndSelectorForContainer(anObject, target_, 
                                                    selector_, self)) {
    [embeddedContainer_ setObject:anObject forKey:aKey];
  }
}

- (NSString*)description {
  return [NSString stringWithFormat:@"%@ - %@", 
          NSStringFromClass([self class]),
          [embeddedContainer_ description]];
}

#else  // GTM_CONTAINERS_VALIDATE
- (id)initValidatingWithCapacity:(NSUInteger)capacity
                          target:(id)target 
                        selector:(SEL)sel {
  if ((self = [super init])) {
    [self release];
  }
  return (GTMValidatingDictionary*)[[NSMutableDictionary alloc] 
                                    initWithCapacity:capacity];

}
#endif  // GTM_CONTAINERS_VALIDATE
@end

@implementation GTMValidatingSet
+ (id)validatingSetWithTarget:(id)target selector:(SEL)sel {
  return [self validatingSetWithCapacity:0 target:target selector:sel];
}

+ (id)validatingSetWithCapacity:(NSUInteger)capacity 
                         target:(id)target 
                       selector:(SEL)sel {
  return [[[[self class] alloc] initValidatingWithCapacity:0 
                                                    target:target 
                                                  selector:sel] autorelease];
}  
- (id)initValidatingWithTarget:(id)target selector:(SEL)sel {
  return [self initValidatingWithCapacity:0 target:target selector:sel];
}

#if GTM_CONTAINERS_VALIDATE
- (id)initValidatingWithCapacity:(NSUInteger)capacity
                          target:(id)target 
                        selector:(SEL)sel {
  if ((self = [super init])) {
    embeddedContainer_ = [[NSMutableSet alloc] initWithCapacity:capacity];
    target_ = [target retain];
    selector_ = sel;
    VerifySelectorOnTarget(selector_, target_);
  }
  return self;
}

- (void)dealloc {
  [target_ release];
  [embeddedContainer_ release];
  [super dealloc];
}

- (NSUInteger)count {
  return [embeddedContainer_ count];
}

- (id)member:(id)object {
  return [embeddedContainer_ member:object];
}

- (NSEnumerator *)objectEnumerator {
  return [embeddedContainer_ objectEnumerator];
}

- (void)addObject:(id)object {
  if (object && VerifyObjectWithTargetAndSelectorForContainer(object, 
                                                              target_, 
                                                              selector_, 
                                                              self)) {
    [embeddedContainer_ addObject:object];
  }
}

- (void)removeObject:(id)object {
  [embeddedContainer_ removeObject:object];
}

- (NSString*)description {
  return [NSString stringWithFormat:@"%@ - %@", 
          NSStringFromClass([self class]),
          [embeddedContainer_ description]];
}

#else  // GTM_CONTAINERS_VALIDATE
- (id)initValidatingWithCapacity:(NSUInteger)capacity
                          target:(id)target 
                        selector:(SEL)sel {
  if ((self = [super init])) {
    [self release];
  }
  return (GTMValidatingSet*)[[NSMutableSet alloc] initWithCapacity:capacity];
}
#endif  // GTM_CONTAINERS_VALIDATE
@end

#pragma mark -
#pragma mark Simple Common Validators
@implementation GTMKindOfClassValidator
+ (id)validateAgainstClass:(Class)cls {
  return [[[[self class] alloc] initWithClass:cls] autorelease];
}

- (id)initWithClass:(Class)cls {
#if GTM_CONTAINERS_VALIDATE
  if ((self = [super init])) {
    if (!cls) {
      _GTMDevLog(@"nil class");
      [self release];
      return nil;
    }
    cls_ = cls;
  }
  return self;
#else  // GTM_CONTAINERS_VALIDATE
  if ((self = [super init])) {
    [self release];
  }
  return nil;
#endif  // GTM_CONTAINERS_VALIDATE
}

- (BOOL)validateObject:(id)object forContainer:(id)container {
  return [object isKindOfClass:cls_];
}
@end

@implementation GTMMemberOfClassValidator
+ (id)validateAgainstClass:(Class)cls {
  return [[[[self class] alloc] initWithClass:cls] autorelease];
}

- (id)initWithClass:(Class)cls {
#if GTM_CONTAINERS_VALIDATE
  if ((self = [super init])) {
    if (!cls) {
      _GTMDevLog(@"nil class");
      [self release];
      return nil;
    }
    cls_ = cls;
  }
  return self;
#else  // GTM_CONTAINERS_VALIDATE
  if ((self = [super init])) {
    [self release];
  }
  return nil;
#endif  // GTM_CONTAINERS_VALIDATE
}

- (BOOL)validateObject:(id)object forContainer:(id)container {
  return [object isMemberOfClass:cls_];
}
@end

@implementation GTMConformsToProtocolValidator
+ (id)validateAgainstProtocol:(Protocol*)prot {
  return [[[[self class] alloc] initWithProtocol:prot] autorelease];
}

- (id)initWithProtocol:(Protocol*)prot {
#if GTM_CONTAINERS_VALIDATE
  if ((self = [super init])) {
    if (!prot) {
      _GTMDevLog(@"nil protocol");
      [self release];
      return nil;
    }
    prot_ = prot;
  }
  return self;
#else  // GTM_CONTAINERS_VALIDATE
  if ((self = [super init])) {
    [self release];
  }
  return nil;
#endif  // GTM_CONTAINERS_VALIDATE
}

- (BOOL)validateObject:(id)object forContainer:(id)container {
  return [object conformsToProtocol:prot_];
}
@end

@implementation GTMRespondsToSelectorValidator
+ (id)validateAgainstSelector:(SEL)sel {
  return [[[[self class] alloc] initWithSelector:sel] autorelease];
}

- (id)initWithSelector:(SEL)sel {
#if GTM_CONTAINERS_VALIDATE
  if ((self = [super init])) {
    if (!sel) {
      _GTMDevLog(@"nil selector");
      [self release];
      return nil;
    }
    sel_ = sel;
  }
  return self;
#else  // GTM_CONTAINERS_VALIDATE
  if ((self = [super init])) {
    [self release];
  }
  return nil;
#endif  // GTM_CONTAINERS_VALIDATE
}

- (BOOL)validateObject:(id)object forContainer:(id)container {
  return [object respondsToSelector:sel_];
}
@end
