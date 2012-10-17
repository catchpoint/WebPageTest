//
//  GTMNSAppleEventDescriptor+Foundation.h
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

#import <Foundation/Foundation.h>
#import "GTMDefines.h"
#import "GTMFourCharCode.h"

// A category for dealing with NSAppleEventDescriptors and NSArrays.
@interface NSAppleEventDescriptor (GTMAppleEventDescriptorArrayAdditions)
// Used to register the types you know how to convert into
// NSAppleEventDescriptors.
// See examples in GTMNSAppleEventDescriptor+Foundation.
// Args:
//  selector - selector to call for any of the types in |types|
//    -(NSAppleEventDesc *)selector_name;
//  types - an std c array of types of length |count|
//  count - number of types in |types|
+ (void)gtm_registerSelector:(SEL)selector
                    forTypes:(DescType*)types
                       count:(NSUInteger)count;

// Returns an NSObject for any NSAppleEventDescriptor
// Uses types registerd by registerSelector:forTypes:count: to determine
// what type of object to create. If it doesn't know a type, it attempts
// to return [self stringValue].
- (id)gtm_objectValue;

// Return an NSArray for an AEList
// Returns nil on failure.
- (NSArray*)gtm_arrayValue;

// Return an NSDictionary for an AERecord
// Returns nil on failure.
- (NSDictionary*)gtm_dictionaryValue;

// Return an NSNull for a desc of typeNull
// Returns nil on failure.
- (NSNull*)gtm_nullValue;

// Return a NSAppleEventDescriptor for a double value.
+ (NSAppleEventDescriptor*)gtm_descriptorWithDouble:(double)real;

// Return a NSAppleEventDescriptor for a float value.
+ (NSAppleEventDescriptor*)gtm_descriptorWithFloat:(float)real;

// Return a NSAppleEventDescriptor for a CGFloat value.
+ (NSAppleEventDescriptor*)gtm_descriptorWithCGFloat:(CGFloat)real;

// Attempt to extract a double value. Returns NAN on error.
- (double)gtm_doubleValue;

// Attempt to extract a float value. Returns NAN on error.
- (float)gtm_floatValue;

// Attempt to extract a CGFloat value. Returns NAN on error.
- (CGFloat)gtm_cgFloatValue;

// Attempt to extract a NSNumber. Returns nil on error.
- (NSNumber*)gtm_numberValue;

// Attempt to return a GTMFourCharCode. Returns nil on error.
- (GTMFourCharCode*)gtm_fourCharCodeValue;
@end

@interface NSObject (GTMAppleEventDescriptorObjectAdditions)
// A informal protocol that objects can override to return appleEventDescriptors
// for their type. The default is to return [self description] rolled up
// in an NSAppleEventDescriptor. Built in support for:
// NSArray, NSDictionary, NSNull, NSString, NSNumber and NSProcessInfo
- (NSAppleEventDescriptor*)gtm_appleEventDescriptor;
@end

@interface NSAppleEventDescriptor (GTMAppleEventDescriptorAdditions)
// Allows you to send events.
// Returns YES if send was successful.
- (BOOL)gtm_sendEventWithMode:(AESendMode)mode
                      timeOut:(NSTimeInterval)timeout
                        reply:(NSAppleEventDescriptor**)reply;
@end

@interface GTMFourCharCode (GTMAppleEventDescriptorObjectAdditions)

// if you call gtm_appleEventDescriptor on GTMFourCharCode it will be of
// type typeType. If you need something different (like typeProperty) this
// allows you to define the type you want.
- (NSAppleEventDescriptor*)gtm_appleEventDescriptorOfType:(DescType)type;
@end
