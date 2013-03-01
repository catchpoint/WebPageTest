//
//  GTMNSEnumerator+Filter.m
//
//  Copyright 2007-2009 Google Inc.
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

#import "GTMNSEnumerator+Filter.h"
#import "GTMDebugSelectorValidation.h"
#import "GTMDefines.h"
#if GTM_IPHONE_SDK
#import <objc/message.h>
#import <objc/runtime.h>
#else
#import <objc/objc-runtime.h>
#endif

// a private subclass of NSEnumerator that does all the work.
// public interface just returns one of these.
// This top level class contains all the additional boilerplate. Specific
// behavior is in the subclasses.
@interface GTMEnumeratorPrivateBase : NSEnumerator {
 @protected
  NSEnumerator *base_;
  SEL operation_; // either a predicate or a transform depending on context.
  id target_;  // may be nil
  id object_;  // may be nil
}
@end

@interface GTMEnumeratorPrivateBase (SubclassesMustProvide)
- (BOOL)filterObject:(id)obj returning:(id *)resultp;
@end

@implementation GTMEnumeratorPrivateBase
- (id)initWithBase:(NSEnumerator *)base
               sel:(SEL)filter
            target:(id)optionalTarget
            object:(id)optionalOther {
  self = [super init];
  if (self) {

    // someone would have to subclass or directly create an object of this
    // class, and this class is private to this impl.
    _GTMDevAssert(base, @"can't initWithBase: a nil base enumerator");
    base_ = [base retain];
    operation_ = filter;
    target_ = [optionalTarget retain];
    object_ = [optionalOther retain];
  }
  return self;
}

// we don't provide an init because this base class is private to this
// impl, and no one would be able to create it (if they do, they get whatever
// they happens...).

- (void)dealloc {
  [base_ release];
  [target_ release];
  [object_ release];
  [super dealloc];
}

- (id)nextObject {
  for (id obj = [base_ nextObject]; obj; obj = [base_ nextObject]) {
    id result = nil;
    if ([self filterObject:obj returning:&result]) {
      return result;
    }
  }
  return nil;
}
@end

// a transformer, for each item in the enumerator, returns a f(item).
@interface GTMEnumeratorTransformer : GTMEnumeratorPrivateBase
@end
@implementation GTMEnumeratorTransformer
- (BOOL)filterObject:(id)obj returning:(id *)resultp {
  *resultp = [obj performSelector:operation_ withObject:object_];
  return nil != *resultp;
}
@end

// a transformer, for each item in the enumerator, returns a f(item).
// a target transformer swaps the target and the argument.
@interface GTMEnumeratorTargetTransformer : GTMEnumeratorPrivateBase
@end
@implementation GTMEnumeratorTargetTransformer
- (BOOL)filterObject:(id)obj returning:(id *)resultp {
  *resultp = [target_ performSelector:operation_
                           withObject:obj
                           withObject:object_];
  return nil != *resultp;
}
@end

// a filter, for each item in the enumerator, if(f(item)) { returns item. }
@interface GTMEnumeratorFilter : GTMEnumeratorPrivateBase
@end
@implementation GTMEnumeratorFilter
// We must take care here, since Intel leaves junk in high bytes of return
// register for predicates that return BOOL.
// For details see:
// http://developer.apple.com/legacy/mac/library/documentation/MacOSX/Conceptual/universal_binary/universal_binary_tips/universal_binary_tips.html#//apple_ref/doc/uid/TP40002217-CH239-280661
// and
// http://www.red-sweater.com/blog/320/abusing-objective-c-with-class#comment-83187
- (BOOL)filterObject:(id)obj returning:(id *)resultp {
  *resultp = obj;
  return ((BOOL (*)(id, SEL, id))objc_msgSend)(obj, operation_, object_);
}
@end

// a target filter, for each item in the enumerator, if(f(item)) { returns item. }
// a target transformer swaps the target and the argument.
@interface GTMEnumeratorTargetFilter : GTMEnumeratorPrivateBase
@end
@implementation GTMEnumeratorTargetFilter
// We must take care here, since Intel leaves junk in high bytes of return
// register for predicates that return BOOL.
// For details see:
// http://developer.apple.com/legacy/mac/library/documentation/MacOSX/Conceptual/universal_binary/universal_binary_tips/universal_binary_tips.html#//apple_ref/doc/uid/TP40002217-CH239-280661
// and
// http://www.red-sweater.com/blog/320/abusing-objective-c-with-class#comment-83187
- (BOOL)filterObject:(id)obj returning:(id *)resultp {
  *resultp = obj;
  return ((BOOL (*)(id, SEL, id, id))objc_msgSend)(target_, operation_, obj, object_);
}
@end

@implementation NSEnumerator (GTMEnumeratorFilterAdditions)

- (NSEnumerator *)gtm_filteredEnumeratorByMakingEachObjectPerformSelector:(SEL)selector
                                                               withObject:(id)argument {
  return [[[GTMEnumeratorFilter alloc] initWithBase:self
                                                sel:selector
                                             target:nil
                                             object:argument] autorelease];
}

- (NSEnumerator *)gtm_enumeratorByMakingEachObjectPerformSelector:(SEL)selector
                                                       withObject:(id)argument {
  return [[[GTMEnumeratorTransformer alloc] initWithBase:self
                                                     sel:selector
                                                  target:nil
                                                  object:argument] autorelease];
}


- (NSEnumerator *)gtm_filteredEnumeratorByTarget:(id)target
                           performOnEachSelector:(SEL)predicate {
  // make sure the object impls this selector taking an object as an arg.
  GTMAssertSelectorNilOrImplementedWithReturnTypeAndArguments(target, predicate,
                                                              @encode(BOOL),
                                                              @encode(id),
                                                              NULL);
  return [[[GTMEnumeratorTargetFilter alloc] initWithBase:self
                                                      sel:predicate
                                                   target:target
                                                   object:nil] autorelease];
}

- (NSEnumerator *)gtm_filteredEnumeratorByTarget:(id)target
                           performOnEachSelector:(SEL)predicate
                                      withObject:(id)object {
  // make sure the object impls this selector taking an object as an arg.
  GTMAssertSelectorNilOrImplementedWithReturnTypeAndArguments(target, predicate,
                                                              @encode(BOOL),
                                                              @encode(id),
                                                              @encode(id),
                                                              NULL);
  return [[[GTMEnumeratorTargetFilter alloc] initWithBase:self
                                                      sel:predicate
                                                   target:target
                                                   object:object] autorelease];
}

- (NSEnumerator *)gtm_enumeratorByTarget:(id)target
                   performOnEachSelector:(SEL)selector {
  // make sure the object impls this selector taking an object as an arg.
  GTMAssertSelectorNilOrImplementedWithReturnTypeAndArguments(target, selector,
                                                              @encode(id),
                                                              @encode(id),
                                                              NULL);
  return [[[GTMEnumeratorTargetTransformer alloc] initWithBase:self
                                                           sel:selector
                                                        target:target
                                                        object:nil]
          autorelease];
}

- (NSEnumerator *)gtm_enumeratorByTarget:(id)target
                   performOnEachSelector:(SEL)selector
                              withObject:(id)object {
  // make sure the object impls this selector taking an object as an arg.
  GTMAssertSelectorNilOrImplementedWithReturnTypeAndArguments(target, selector,
                                                              @encode(id),
                                                              @encode(id),
                                                              @encode(id),
                                                              NULL);
  return [[[GTMEnumeratorTargetTransformer alloc] initWithBase:self
                                                           sel:selector
                                                        target:target
                                                        object:object]
          autorelease];
}

@end

