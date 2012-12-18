//
//  GTMNSDictionary+CaseInsensitive.m
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

#import "GTMNSDictionary+CaseInsensitive.h"
#import "GTMDefines.h"
#import "GTMGarbageCollection.h"
#import <CoreFoundation/CoreFoundation.h>

@interface NSMutableDictionary (GTMNSMutableDictionaryCaseInsensitiveAdditions)

// Returns a mutable equivalent to GTMNSDictionaryCaseInsensitiveAdditions.
- (id)gtm_initWithDictionaryCaseInsensitive:(NSDictionary *)dictionary;

@end

static Boolean CaseInsensitiveEqualCallback(const void *a, const void *b) {
  id idA = (id)a;
  id idB = (id)b;
  Boolean ret = FALSE;
  if ([idA isKindOfClass:[NSString class]] &&
      [idB isKindOfClass:[NSString class]]) {
    ret = ([idA compare:idB options:NSCaseInsensitiveSearch|NSLiteralSearch]
           == NSOrderedSame);
  } else {
    ret = [idA isEqual:idB];
  }
  return ret;
}

static CFHashCode CaseInsensitiveHashCallback(const void *value) {
  id idValue = (id)value;
  CFHashCode ret = 0;
  if ([idValue isKindOfClass:[NSString class]]) {
    ret = [[idValue lowercaseString] hash];
  } else {
    ret = [idValue hash];
  }
  return ret;
}

@implementation NSDictionary (GTMNSDictionaryCaseInsensitiveAdditions)

- (id)gtm_initWithDictionaryCaseInsensitive:(NSDictionary *)dictionary {
  [self release];
  self = nil;

  CFIndex count = 0;
  void *keys = NULL;
  void *values = NULL;

  if (dictionary) {
    count = CFDictionaryGetCount((CFDictionaryRef)dictionary);

    if (count) {
      keys = malloc(count * sizeof(void *));
      values = malloc(count * sizeof(void *));
      if (!keys || !values) {
        free(keys);
        free(values);
        return self;
      }

      CFDictionaryGetKeysAndValues((CFDictionaryRef)dictionary, keys, values);
    }
  }

  CFDictionaryKeyCallBacks keyCallbacks = kCFCopyStringDictionaryKeyCallBacks;
  _GTMDevAssert(keyCallbacks.version == 0,
                @"CFDictionaryKeyCallBacks structure updated");
  keyCallbacks.equal = CaseInsensitiveEqualCallback;
  keyCallbacks.hash = CaseInsensitiveHashCallback;

  // GTMNSMakeCollectable drops the retain count in GC mode so the object can
  // be garbage collected.
  // GTMNSMakeCollectable not GTMCFAutorelease because this is an initializer
  // and in non-GC mode we need to return a +1 retain count object.
  self = GTMNSMakeCollectable(
      CFDictionaryCreate(kCFAllocatorDefault,
                         keys, values, count, &keyCallbacks,
                         &kCFTypeDictionaryValueCallBacks));

  free(keys);
  free(values);

  return self;
}

+ (id)gtm_dictionaryWithDictionaryCaseInsensitive:(NSDictionary *)dictionary {
  return [[[self alloc]
           gtm_initWithDictionaryCaseInsensitive:dictionary] autorelease];
}

@end

@implementation NSMutableDictionary (GTMNSMutableDictionaryCaseInsensitiveAdditions)

- (id)gtm_initWithDictionaryCaseInsensitive:(NSDictionary *)dictionary {
  if ((self = [super gtm_initWithDictionaryCaseInsensitive:dictionary])) {
    // GTMNSMakeCollectable drops the retain count in GC mode so the object can
    // be garbage collected.
    // GTMNSMakeCollectable not GTMCFAutorelease because this is an initializer
    // and in non-GC mode we need to return a +1 retain count object.
    id copy = GTMNSMakeCollectable(
        CFDictionaryCreateMutableCopy(kCFAllocatorDefault, 0,
                                      (CFDictionaryRef)self));
    [self release];
    self = copy;
  }
  return self;
}

@end
