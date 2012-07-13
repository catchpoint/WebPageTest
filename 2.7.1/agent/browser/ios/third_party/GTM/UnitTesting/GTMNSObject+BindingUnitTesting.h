//
//  GTMNSObject+BindingUnitTesting.h
//
//  Utilities for doing advanced unittesting with object bindings.
//
//  Copyright 2006-2008 Google Inc.
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

#include <Foundation/Foundation.h>

// Utility functions for GTMTestExposedBindings Macro. Don't use it directly
// but use the macro below instead
BOOL GTMDoExposedBindingsFunctionCorrectly(NSObject *object, 
                                           NSArray **errors);

// Tests the setters and getters for exposed bindings
// For objects that expose bindings, this tests them for you, saving you from
// having to write a whole pile of set/get test code if you add binding support.
// You will need to implement valueClassForBinding: for your bindings,
// and you may possibly want to implement unitTestExposedBindingsToIgnore
// and unitTestExposedBindingsTestValues. See descriptions of those
// methods below for details.
//  Implemented as a macro to match the rest of the SenTest macros.
//
//  Args:
//    a1: The object to be checked.
//    description: A format string as in the printf() function. 
//        Can be nil or an empty string but must be present. 
//    ...: A variable number of arguments to the format string. Can be absent.
//
#define GTMTestExposedBindings(a1, description, ...) \
do { \
  NSObject *a1Object = (a1); \
  NSArray *errors = nil; \
  BOOL isGood = GTMDoExposedBindingsFunctionCorrectly(a1Object, &errors); \
  if (!isGood) { \
    NSString *failString; \
    GTM_FOREACH_OBJECT(failString, errors) { \
      if (description != nil) { \
        STFail(@"%@: %@", failString, STComposeString(description, ##__VA_ARGS__)); \
      } else { \
        STFail(@"%@", failString); \
      } \
    } \
  } \
} while(0)

// Utility class for setting up Binding Tests. Basically a pair of a value to
// set a binding to, followed by the expected return value.
// See description of gtm_unitTestExposedBindingsTestValues: below
// for example of usage.
@interface GTMBindingUnitTestData : NSObject {
 @private
  id valueToSet_;
  id expectedValue_;
}

+ (id)testWithIdentityValue:(id)value;
+ (id)testWithValue:(id)value expecting:(id)expecting;
- (id)initWithValue:(id)value expecting:(id)expecting;
- (id)valueToSet;
- (id)expectedValue;
@end

@interface NSObject (GTMBindingUnitTestingAdditions)
// Allows you to ignore certain bindings when running GTMTestExposedBindings
// If you have bindings you want to ignore, add them to the array returned
// by this method. The standard way to implement this would be:
// - (NSMutableArray*)unitTestExposedBindingsToIgnore {
//    NSMutableArray *array = [super unitTestExposedBindingsToIgnore];
//    [array addObject:@"bindingToIgnore1"];
//    ...
//    return array;
//  }
// The NSObject implementation by default will ignore NSFontBoldBinding,
// NSFontFamilyNameBinding, NSFontItalicBinding, NSFontNameBinding and 
// NSFontSizeBinding if your exposed bindings contains NSFontBinding because
// the NSFont*Bindings are NOT KVC/KVO compliant.
- (NSMutableArray*)gtm_unitTestExposedBindingsToIgnore;

// Allows you to set up test values for your different bindings.
// if you have certain values you want to test against your bindings, add
// them to the array returned by this method. The array is an array of
// GTMBindingUnitTestData.
//  The standard way to implement this would be:
// - (NSMutableArray*)gtm_unitTestExposedBindingsTestValues:(NSString*)binding {
//    NSMutableArray *dict = [super unitTestExposedBindingsTestValues:binding];
//    if ([binding isEqualToString:@"myBinding"]) {
//      MySpecialBindingValueSet *value 
//        = [[[MySpecialBindingValueSet alloc] init] autorelease];
//      [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
//      ...
//    else if ([binding isEqualToString:@"myBinding2"]) {
//      ...
//    }
//    return array;
//  }
// The NSObject implementation handles many of the default bindings, and
// gives you a reasonable set of test values to start.
// See the implementation for the current list of bindings, and values that we
// set for those bindings.
- (NSMutableArray*)gtm_unitTestExposedBindingsTestValues:(NSString*)binding;

// A special version of isEqualTo to test whether two binding values are equal
// by default it calls directly to isEqualTo: but can be overridden for special
// cases (like NSImages) where the standard isEqualTo: isn't sufficient.
- (BOOL)gtm_unitTestIsEqualTo:(id)value;
@end
