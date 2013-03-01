//
//  GTMNSAppleEventDescriptor+Foundation.m
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

#import "GTMNSAppleEventDescriptor+Foundation.h"
#import "GTMDebugSelectorValidation.h"
#import <Carbon/Carbon.h>  // Needed Solely For keyASUserRecordFields

// Map of types to selectors.
static NSMutableDictionary *gTypeMap = nil;

@implementation NSAppleEventDescriptor (GTMAppleEventDescriptorArrayAdditions)

+ (void)gtm_registerSelector:(SEL)selector 
                    forTypes:(DescType*)types 
                       count:(NSUInteger)count {
  if (selector && types && count > 0) {
#if DEBUG
    NSAppleEventDescriptor *desc 
      = [[[NSAppleEventDescriptor alloc] initListDescriptor] autorelease];
    GTMAssertSelectorNilOrImplementedWithReturnTypeAndArguments(desc, 
                                                                selector,
                                                                @encode(id), 
                                                                NULL); 
#endif
    @synchronized(self) {
      if (!gTypeMap) {
        gTypeMap = [[NSMutableDictionary alloc] init];
      }
      NSString *selString = NSStringFromSelector(selector);
      for (NSUInteger i = 0; i < count; ++i) {
        NSNumber *key = [NSNumber numberWithUnsignedInt:types[i]];
        NSString *exists = [gTypeMap objectForKey:key];
        if (exists) {
          _GTMDevLog(@"%@ being replaced with %@ exists for type: %@", 
                    exists, selString, key);
        }
        [gTypeMap setObject:selString forKey:key];
      }
    }
  }
}

- (id)gtm_objectValue {
  id value = nil;
  
  // Check our registered types to see if we have anything
  if (gTypeMap) {
    @synchronized(gTypeMap) {
      DescType type = [self descriptorType];
      NSNumber *key = [NSNumber numberWithUnsignedInt:type];
      NSString *selectorString = [gTypeMap objectForKey:key];
      if (selectorString) {
        SEL selector = NSSelectorFromString(selectorString);
        value = [self performSelector:selector];
      } else {
        value = [self stringValue];
      }
    }
  }
  return value;
}

- (NSArray*)gtm_arrayValue {
  NSUInteger count = [self numberOfItems];
  NSAppleEventDescriptor *workingDesc = self;
  if (count == 0) {
    // Create a list to work with.
    workingDesc = [self coerceToDescriptorType:typeAEList];
    count = [workingDesc numberOfItems];
  }
  NSMutableArray *items = [NSMutableArray arrayWithCapacity:count];
  for (NSUInteger i = 1; i <= count; ++i) {
    NSAppleEventDescriptor *desc = [workingDesc descriptorAtIndex:i];
    id value = [desc gtm_objectValue];
    if (!value) {
      _GTMDevLog(@"Unknown type of descriptor %@", [desc description]);
      return nil;
    }
    [items addObject:value];
  }
  return items;
}  

- (NSDictionary*)gtm_dictionaryValue {
  NSMutableDictionary *dictionary = [NSMutableDictionary dictionary];
  NSAppleEventDescriptor *userRecord = [self descriptorForKeyword:keyASUserRecordFields];
  if (userRecord) {
    NSArray *userItems = [userRecord gtm_arrayValue];
    NSString *key = nil;
    NSString *item;
    GTM_FOREACH_OBJECT(item, userItems) {
      if (key) {
        // Save the pair and reset our state
        [dictionary setObject:item forKey:key];
        key = nil;
      } else {
        // Save it for the next pair
        key = item;
      }
    }
    if (key) {
      _GTMDevLog(@"Got a key %@ with no value in %@", key, userItems);
      return nil;
    }
  } else {
    NSUInteger count = [self numberOfItems];
    for (NSUInteger i = 1; i <= count; ++i) {
      AEKeyword key = [self keywordForDescriptorAtIndex:i];
      NSAppleEventDescriptor *desc = [self descriptorForKeyword:key];
      id value = [desc gtm_objectValue];
      if (!value) {
        _GTMDevLog(@"Unknown type of descriptor %@", [desc description]);
        return nil;
      }
      [dictionary setObject:value 
                     forKey:[GTMFourCharCode fourCharCodeWithFourCharCode:key]];
    }
  }
  return dictionary;
}  

- (NSNull*)gtm_nullValue {
  return [NSNull null];
}

+ (NSAppleEventDescriptor*)gtm_descriptorWithDouble:(double)real {
  return [NSAppleEventDescriptor descriptorWithDescriptorType:typeIEEE64BitFloatingPoint
                                                        bytes:&real 
                                                       length:sizeof(real)];
}

+ (NSAppleEventDescriptor*)gtm_descriptorWithFloat:(float)real {
  return [NSAppleEventDescriptor descriptorWithDescriptorType:typeIEEE32BitFloatingPoint
                                                        bytes:&real 
                                                       length:sizeof(real)];
}


+ (NSAppleEventDescriptor*)gtm_descriptorWithCGFloat:(CGFloat)real {
#if CGFLOAT_IS_DOUBLE
  return [self gtm_descriptorWithDouble:real];
#else
  return [self gtm_descriptorWithFloat:real];
#endif
}

- (double)gtm_doubleValue {
  // Be careful modifying this code as Xcode 3.2.5 gcc 4.2.1 (5664) was
  // generating bad code with a previous incarnation.
  NSNumber *number = [self gtm_numberValue];
  if (number) {
    return [number doubleValue];
  }
  return NAN;
}

- (float)gtm_floatValue {
  NSNumber *number = [self gtm_numberValue];
  if (number) {
    return [number floatValue];
  }
  return NAN;
}

- (CGFloat)gtm_cgFloatValue {
#if CGFLOAT_IS_DOUBLE
  return [self gtm_doubleValue];
#else
  return [self gtm_floatValue];
#endif
}

- (NSNumber*)gtm_numberValue { 
  typedef struct {
    DescType type;
    SEL selector;
  } TypeSelectorMap;
  TypeSelectorMap typeSelectorMap[] = {
    { typeFalse, @selector(numberWithBool:) },
    { typeTrue, @selector(numberWithBool:) },
    { typeBoolean, @selector(numberWithBool:) },
    { typeSInt16, @selector(numberWithShort:) },
    { typeSInt32, @selector(numberWithInt:) },
    { typeUInt32, @selector(numberWithUnsignedInt:) },
    { typeSInt64, @selector(numberWithLongLong:) },
    { typeIEEE32BitFloatingPoint, @selector(numberWithFloat:) },
    { typeIEEE64BitFloatingPoint, @selector(numberWithDouble:) }
  };
  DescType type = [self descriptorType];
  SEL selector = nil;
  for (size_t i = 0; i < sizeof(typeSelectorMap) / sizeof(TypeSelectorMap); ++i) {
    if (type == typeSelectorMap[i].type) {
      selector = typeSelectorMap[i].selector;
      break;
    }
  }
  NSAppleEventDescriptor *desc = self;
  if (!selector) {
    // COV_NF_START - Don't know how to force this in a unittest
    _GTMDevLog(@"Didn't get a valid selector?");
    desc = [self coerceToDescriptorType:typeIEEE64BitFloatingPoint];
    selector = @selector(numberWithDouble:);
    // COV_NF_END
  }
  NSData *descData = [desc data];
  const void *bytes = [descData bytes];
  if (!bytes) {
    // COV_NF_START - Don't know how to force this in a unittest
    _GTMDevLog(@"Unable to get bytes from %@", desc);
    return nil;
    // COV_NF_END
  }
  Class numberClass = [NSNumber class];
  NSMethodSignature *signature = [numberClass methodSignatureForSelector:selector];
  NSInvocation *invocation = [NSInvocation invocationWithMethodSignature:signature];
  [invocation setSelector:selector];
  [invocation setArgument:(void*)bytes atIndex:2];
  [invocation setTarget:numberClass];
  [invocation invoke];
  NSNumber *value = nil;
  [invocation getReturnValue:&value];
  return value;
}

- (GTMFourCharCode*)gtm_fourCharCodeValue {
  return [GTMFourCharCode fourCharCodeWithFourCharCode:[self typeCodeValue]];
}

- (NSAppleEventDescriptor*)gtm_appleEventDescriptor {
  return self;
}

@end

@implementation NSObject (GTMAppleEventDescriptorObjectAdditions)
- (NSAppleEventDescriptor*)gtm_appleEventDescriptor {
  return [NSAppleEventDescriptor descriptorWithString:[self description]];
}
@end

@implementation NSArray (GTMAppleEventDescriptorObjectAdditions)

+ (void)load {
  DescType types[] = { 
    typeAEList,
  };
  
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  [NSAppleEventDescriptor gtm_registerSelector:@selector(gtm_arrayValue)
                                     forTypes:types
                                        count:sizeof(types)/sizeof(DescType)];
  [pool drain];
}

- (NSAppleEventDescriptor*)gtm_appleEventDescriptor {
  NSAppleEventDescriptor *desc = [NSAppleEventDescriptor listDescriptor];
  NSUInteger count = [self count];
  for (NSUInteger i = 1; i <= count; ++i) {
    id item = [self objectAtIndex:i-1];
    NSAppleEventDescriptor *itemDesc = [item gtm_appleEventDescriptor];
    if (!itemDesc) {
      _GTMDevLog(@"Unable to create Apple Event Descriptor for %@", [self description]);
      return nil;
    }
    [desc insertDescriptor:itemDesc atIndex:i];
  }
  return desc;
}
@end

@implementation NSDictionary (GTMAppleEventDescriptorObjectAdditions)

+ (void)load {
  DescType types[] = { 
    typeAERecord,
  };
  
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  [NSAppleEventDescriptor gtm_registerSelector:@selector(gtm_dictionaryValue)
                                    forTypes:types
                                       count:sizeof(types)/sizeof(DescType)];
  [pool drain];
}

- (NSAppleEventDescriptor*)gtm_appleEventDescriptor {
  Class keyClass = nil;
  id key = nil;
  GTM_FOREACH_KEY(key, self) {
    if (!keyClass) {
      if ([key isKindOfClass:[GTMFourCharCode class]]) {
        keyClass = [GTMFourCharCode class];
      } else if ([key isKindOfClass:[NSString class]]) {
        keyClass = [NSString class];
      } else {
        _GTMDevLog(@"Keys must be of type NSString or GTMFourCharCode: %@", key);
        return nil;
      }
    }
    if (![key isKindOfClass:keyClass]) {
      _GTMDevLog(@"Keys must be homogenous (first key was of type %@) "
                 "and of type NSString or GTMFourCharCode: %@", keyClass, key);
      return nil;
    }
  }
  NSAppleEventDescriptor *desc = [NSAppleEventDescriptor recordDescriptor];
  if ([keyClass isEqual:[NSString class]]) {
    NSMutableArray *array = [NSMutableArray arrayWithCapacity:[self count] * 2];
    GTM_FOREACH_KEY(key, self) {
      [array addObject:key];
      [array addObject:[self objectForKey:key]];
    }
    NSAppleEventDescriptor *userRecord = [array gtm_appleEventDescriptor];
    if (!userRecord) {
      return nil;
    }
    [desc setDescriptor:userRecord forKeyword:keyASUserRecordFields];
  } else {
    GTM_FOREACH_KEY(key, self) {
      id value = [self objectForKey:key];
      NSAppleEventDescriptor *valDesc = [value gtm_appleEventDescriptor];
      if (!valDesc) {
        return nil;
      }
      [desc setDescriptor:valDesc forKeyword:[key fourCharCode]];
    }
  }
  return desc;
}

@end

@implementation NSNull (GTMAppleEventDescriptorObjectAdditions)
+ (void)load {
  DescType types[] = { 
    typeNull
  };
  
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  [NSAppleEventDescriptor gtm_registerSelector:@selector(gtm_nullValue)
                                      forTypes:types
                                         count:sizeof(types)/sizeof(DescType)];
  [pool drain];
}

- (NSAppleEventDescriptor*)gtm_appleEventDescriptor {
  return [NSAppleEventDescriptor nullDescriptor];
}
@end

@implementation NSString (GTMAppleEventDescriptorObjectAdditions)

+ (void)load {
  DescType types[] = { 
    typeUTF16ExternalRepresentation,
    typeUnicodeText,
    typeUTF8Text,
    typeCString,
    typePString,
    typeChar,
    typeIntlText };
  
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  [NSAppleEventDescriptor gtm_registerSelector:@selector(stringValue)
                                      forTypes:types
                                         count:sizeof(types)/sizeof(DescType)];
  [pool drain];
}

- (NSAppleEventDescriptor*)gtm_appleEventDescriptor {
  return [NSAppleEventDescriptor descriptorWithString:self];
}
@end

@implementation NSNumber (GTMAppleEventDescriptorObjectAdditions)

+ (void)load {
  DescType types[] = { 
    typeTrue,
    typeFalse,
    typeBoolean,
    typeSInt16,
    typeSInt32,
    typeUInt32,
    typeSInt64,
    typeIEEE32BitFloatingPoint,
    typeIEEE64BitFloatingPoint };
  
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  [NSAppleEventDescriptor gtm_registerSelector:@selector(gtm_numberValue)
                                     forTypes:types
                                        count:sizeof(types)/sizeof(DescType)];
  [pool drain];
}

- (NSAppleEventDescriptor*)gtm_appleEventDescriptor {
  const char *type = [self objCType];
  if (!type || strlen(type) != 1) return nil;
  
  DescType desiredType = typeNull;
  NSAppleEventDescriptor *desc = nil;
  switch (type[0]) {
    // COV_NF_START
    // I can't seem to convince objcType to return something of this type
    case 'B':
      desc = [NSAppleEventDescriptor descriptorWithBoolean:[self boolValue]];
      break;
    // COV_NF_END
     
    case 'c':
    case 'C':
    case 's':
    case 'S':
      desiredType = typeSInt16;
      break;
      
    case 'i':
    case 'l':
      desiredType = typeSInt32;
      break;
    
    // COV_NF_START
    // I can't seem to convince objcType to return something of this type
    case 'I':
    case 'L':
      desiredType = typeUInt32;
      break;
    // COV_NF_END
      
    case 'q':
    case 'Q':
      desiredType = typeSInt64;
      break;
      
    case 'f':
      desiredType = typeIEEE32BitFloatingPoint;
      break;
      
    case 'd':
    default:
      desiredType = typeIEEE64BitFloatingPoint;
      break;
  }
  
  if (!desc) {
    desc = [NSAppleEventDescriptor gtm_descriptorWithDouble:[self doubleValue]];
    if (desc && desiredType != typeIEEE64BitFloatingPoint) {
        desc = [desc coerceToDescriptorType:desiredType];
    }
  }
  return desc;  
}

@end

@implementation NSProcessInfo (GTMAppleEventDescriptorObjectAdditions)

- (NSAppleEventDescriptor*)gtm_appleEventDescriptor {
  ProcessSerialNumber psn = { 0, kCurrentProcess };
  return [NSAppleEventDescriptor descriptorWithDescriptorType:typeProcessSerialNumber
                                                        bytes:&psn
                                                       length:sizeof(ProcessSerialNumber)];
}  

@end

@implementation GTMFourCharCode (GTMAppleEventDescriptorObjectAdditions)

+ (void)load {
  DescType types[] = {
    typeType, 
    typeKeyword, 
    typeApplSignature, 
    typeEnumerated,
  };
  
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  [NSAppleEventDescriptor gtm_registerSelector:@selector(gtm_fourCharCodeValue)
                                      forTypes:types
                                         count:sizeof(types)/sizeof(DescType)];
  [pool drain];
}

- (NSAppleEventDescriptor*)gtm_appleEventDescriptor {
  return [self gtm_appleEventDescriptorOfType:typeType];
}

- (NSAppleEventDescriptor*)gtm_appleEventDescriptorOfType:(DescType)type {
  FourCharCode code = [self fourCharCode];
  return [NSAppleEventDescriptor descriptorWithDescriptorType:type 
                                                        bytes:&code 
                                                       length:sizeof(code)];
}
@end

@implementation NSAppleEventDescriptor (GTMAppleEventDescriptorAdditions)

- (BOOL)gtm_sendEventWithMode:(AESendMode)mode 
                      timeOut:(NSTimeInterval)timeout
                        reply:(NSAppleEventDescriptor**)reply {
  BOOL isGood = YES;
  AppleEvent replyEvent = { typeNull, NULL };
  OSStatus err = AESendMessage([self aeDesc], &replyEvent, mode, timeout * 60);
  NSAppleEventDescriptor *replyDesc 
    = [[[NSAppleEventDescriptor alloc] initWithAEDescNoCopy:&replyEvent] autorelease];
  if (err) {
    isGood = NO;
    _GTMDevLog(@"Unable to send message: %@ %d", self, err);
  } 
  if (isGood) {
    NSAppleEventDescriptor *errorDesc = [replyDesc descriptorForKeyword:keyErrorNumber];
    if (errorDesc && [errorDesc int32Value]) {
      isGood = NO;
    }
  }
  if (reply) {
    *reply = replyDesc;
  }
  return isGood;
}

@end
