//
//  GTMValidatingContainers.h
//
//  Mutable containers that do verification of objects being added to them 
//  at runtime. Support for arrays, dictionaries and sets.
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

// GTMValidatingContainers are a set of mutable container classes that allow
// you to have a selector on a target that is called to verify that the objects 
// being put into the container are valid. This can be controlled at compile 
// time so that you don't take the performance hit in a release build using the 
// GTM_CONTAINERS_VALIDATE macro.
// We have supplied validators for simple cases such as kindOfClass or 
// conformsToProtocol. See GTMKindOfClassValidator et al. for details.
//
// Example of usage:
// id target = [GTMKindOfClassValidator validateAgainstClass:[NSString class]];
// SEL selector = @selector(validateObject:forContainer:);
// GTMValidatingArray *array = [GTMValidatingArray validatingArrayWithTarget:target
//                                                                  selector:selector];
// [array addObject:@"foo"]; // Will be good
// [array addObject:[NSNumber numberWithInt:2]]; // Will fail
//
// By setting the GTM_CONTAINERS_VALIDATION_FAILED_LOG and 
// GTM_CONTAINERS_VALIDATION_FAILED_ASSERT macros you can control what happens
// when a validation fails. If you implement your own validators, you may want
// to control their internals using the same macros for consistency.
//
// Note that the validating collection types retain their targets.

#import <Foundation/Foundation.h>
#import "GTMDefines.h"

// By default we only validate containers in debug. If you want to validate
// in release as well, #define GTM_CONTAINERS_VALIDATE in a prefix or build
// settings.
#ifndef GTM_CONTAINERS_VALIDATE
#if DEBUG
#define GTM_CONTAINERS_VALIDATE 1
#else  // DEBUG
#define GTM_CONTAINERS_VALIDATE 0
#endif  // DEBUG
#endif  // GTM_CONTAINERS_VALIDATE

// If GTM_CONTAINERS_VALIDATE is on, and log and assert are both turned off
// (see below), the object that failed validation will just not be added
// to the container.

// If you don't want log to occur on validation failure define
// GTM_CONTAINERS_VALIDATION_FAILED_LOG to 0 in a prefix or build settings.
#ifndef GTM_CONTAINERS_VALIDATION_FAILED_LOG
#define GTM_CONTAINERS_VALIDATION_FAILED_LOG GTM_CONTAINERS_VALIDATE
#endif  // GTM_CONTAINERS_VALIDATION_FAILED_LOG

// If you don't want an assert to occur on validation failure define
// GTM_CONTAINERS_VALIDATION_FAILED_ASSERT to 0 in a prefix or build settings.
#ifndef GTM_CONTAINERS_VALIDATION_FAILED_ASSERT
#define GTM_CONTAINERS_VALIDATION_FAILED_ASSERT GTM_CONTAINERS_VALIDATE
#endif  // GTM_CONTAINERS_VALIDATION_FAILED_ASSERT

// Sometimes you get a container back from somebody else and want to validate
// that it contains what you think it contains. _GTMValidateContainer
// allows you to do exactly that. _GTMValidateContainer... give you specialty
// functions for doing common types of validations. These all inline to nothing
// if GTM_CONTAINERS_VALIDATE is not defined.
#if GTM_CONTAINERS_VALIDATE
void _GTMValidateContainer(id container, id target, SEL selector);
void _GTMValidateContainerContainsKindOfClass(id container, Class cls);
void _GTMValidateContainerContainsMemberOfClass(id container, Class cls);
void _GTMValidateContainerConformsToProtocol(id container, Protocol *prot);
void _GTMValidateContainerItemsRespondToSelector(id container, SEL sel);
#else
GTM_INLINE void _GTMValidateContainer(id container, id target, SEL selector) {
}
GTM_INLINE void _GTMValidateContainerContainsKindOfClass(id container,
                                                         Class cls) {
}
GTM_INLINE void _GTMValidateContainerContainsMemberOfClass(id container, 
                                                           Class cls) {
}
GTM_INLINE void _GTMValidateContainerConformsToProtocol(id container, 
                                                        Protocol *prot) {
}
GTM_INLINE void _GTMValidateContainerItemsRespondToSelector(id container, 
                                                            SEL sel) {
}
#endif


// See comments near top of file for class description.
@interface GTMValidatingArray : NSMutableArray {
#if GTM_CONTAINERS_VALIDATE
  NSMutableArray *embeddedContainer_;
  id target_;
  SEL selector_;
#endif  // #if GTM_CONTAINERS_VALIDATE
}
+ (id)validatingArrayWithTarget:(id)target selector:(SEL)sel;
+ (id)validatingArrayWithCapacity:(NSUInteger)capacity 
                           target:(id)target 
                         selector:(SEL)sel;
- (id)initValidatingWithTarget:(id)target selector:(SEL)sel;
- (id)initValidatingWithCapacity:(NSUInteger)capacity
                          target:(id)target 
                        selector:(SEL)sel;
@end

// See comments near top of file for class description.
@interface GTMValidatingDictionary : NSMutableDictionary {
#if GTM_CONTAINERS_VALIDATE
  NSMutableDictionary *embeddedContainer_;
  id target_;
  SEL selector_;
#endif  // #if GTM_CONTAINERS_VALIDATE
}
+ (id)validatingDictionaryWithTarget:(id)target selector:(SEL)sel;
+ (id)validatingDictionaryWithCapacity:(NSUInteger)capacity 
                                target:(id)target 
                              selector:(SEL)sel;
- (id)initValidatingWithTarget:(id)target selector:(SEL)sel;
- (id)initValidatingWithCapacity:(NSUInteger)capacity
                          target:(id)target 
                        selector:(SEL)sel;
@end

// See comments near top of file for class description.
@interface GTMValidatingSet : NSMutableSet {
#if GTM_CONTAINERS_VALIDATE
  NSMutableSet *embeddedContainer_;
  id target_;
  SEL selector_;
#endif  // #if GTM_CONTAINERS_VALIDATE
}
+ (id)validatingSetWithTarget:(id)target selector:(SEL)sel;
+ (id)validatingSetWithCapacity:(NSUInteger)capacity 
                         target:(id)target 
                       selector:(SEL)sel;
- (id)initValidatingWithTarget:(id)target selector:(SEL)sel;
- (id)initValidatingWithCapacity:(NSUInteger)capacity
                          target:(id)target 
                        selector:(SEL)sel;
@end

#pragma mark -
#pragma mark Simple Common Validators
// See comments near top of file for examples of how these are used.
@protocol GTMContainerValidatorProtocol
- (BOOL)validateObject:(id)object forContainer:(id)container;
@end

// Validates that a given object is a kind of class (instance of class or an
// instance of any class that inherits from that class)
@interface GTMKindOfClassValidator : NSObject <GTMContainerValidatorProtocol> {
  Class cls_;
}
+ (id)validateAgainstClass:(Class)cls;
- (id)initWithClass:(Class)cls;
@end

// Validates that a given object is a member of class (exact instance of class)
@interface GTMMemberOfClassValidator : NSObject <GTMContainerValidatorProtocol> {
  Class cls_;
}
+ (id)validateAgainstClass:(Class)cls;
- (id)initWithClass:(Class)cls;
@end

// Validates that a given object conforms to a protocol
@interface GTMConformsToProtocolValidator : NSObject <GTMContainerValidatorProtocol> {
  Protocol* prot_;
}
+ (id)validateAgainstProtocol:(Protocol*)prot;
- (id)initWithProtocol:(Protocol*)prot;
@end

// Validates that a given object responds to a given selector
@interface GTMRespondsToSelectorValidator : NSObject <GTMContainerValidatorProtocol> {
  SEL sel_;
}
+ (id)validateAgainstSelector:(SEL)sel;
- (id)initWithSelector:(SEL)sel;
@end
