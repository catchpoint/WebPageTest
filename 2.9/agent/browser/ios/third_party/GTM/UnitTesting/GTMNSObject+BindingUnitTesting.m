//
//  GTMNSObject+BindingUnitTesting.m
//  
//  An informal protocol for doing advanced binding unittesting with objects.
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

#import <AppKit/AppKit.h>
#import "GTMDefines.h"
#import "GTMNSObject+BindingUnitTesting.h"
#import "GTMSystemVersion.h"

BOOL GTMDoExposedBindingsFunctionCorrectly(NSObject *object, 
                                           NSArray **errors) {
  NSMutableArray *errorArray = [NSMutableArray array];
  if (errors) {
    *errors = nil;
  }
  NSArray *bindings = [object exposedBindings];
  if ([bindings count]) {
    NSArray *bindingsToIgnore = [object gtm_unitTestExposedBindingsToIgnore];
    NSString *bindingKey;
    GTM_FOREACH_OBJECT(bindingKey, bindings) {
      if (![bindingsToIgnore containsObject:bindingKey]) {
        Class theClass = [object valueClassForBinding:bindingKey];
        if (!theClass) {
          NSString *error 
            = [NSString stringWithFormat:@"%@ should have valueClassForBinding '%@'",
               object, bindingKey];
          [errorArray addObject:error];
          continue;
        }
        @try {
          @try {
            [object valueForKey:bindingKey];
          }
          @catch (NSException *e) {
            _GTMDevLog(@"%@ is not key value coding compliant for key %@", 
                       object, bindingKey);
            continue;
          }  // COV_NF_LINE - compiler bug
          NSArray *testValues 
            = [object gtm_unitTestExposedBindingsTestValues:bindingKey];
          GTMBindingUnitTestData *testData;
          GTM_FOREACH_OBJECT(testData, testValues) {
            id valueToSet = [testData valueToSet];
            [object setValue:valueToSet forKey:bindingKey];
            id valueReceived = [object valueForKey:bindingKey];
            id desiredValue = [testData expectedValue];
            if (![desiredValue gtm_unitTestIsEqualTo:valueReceived]) {
              NSString *error 
                = [NSString stringWithFormat:@"%@ unequal to expected %@ for binding '%@'",
                   valueReceived, desiredValue, bindingKey];
              [errorArray addObject:error];
              continue;
            }
          }
        }
        @catch(NSException *e) {
          NSString *error 
            = [NSString stringWithFormat:@"%@:%@-> Binding %@", 
               [e name], [e reason], bindingKey];
          [errorArray addObject:error];
        }  // COV_NF_LINE - compiler bug
      }
    }
  } else {
    NSString *error = 
      [NSString stringWithFormat:@"%@ does not have any exposed bindings",
       object];
    [errorArray addObject:error];
  }
  if (errors) {
    *errors = errorArray;
  }
  return [errorArray count] == 0;
}

@implementation GTMBindingUnitTestData
+ (id)testWithIdentityValue:(id)value {
  return [self testWithValue:value expecting:value];
}

+ (id)testWithValue:(id)value expecting:(id)expecting {
  return [[[self alloc] initWithValue:value expecting:expecting] autorelease];
}

- (id)initWithValue:(id)value expecting:(id)expecting {
  if ((self = [super init])) {
    valueToSet_ = [value retain];
    expectedValue_ = [expecting retain];
  }
  return self;
}

- (BOOL)isEqual:(id)object {
  BOOL isEqual = [object isMemberOfClass:[self class]];
  if (isEqual) {
    id objValue = [object valueToSet];
    id objExpect = [object expectedValue];
    isEqual = (((valueToSet_ == objValue) || ([valueToSet_ isEqual:objValue]))
      && ((expectedValue_ == objExpect) || ([expectedValue_ isEqual:objExpect])));
  }
  return isEqual;
}

- (NSUInteger)hash {
  return [valueToSet_ hash] + [expectedValue_ hash];
}

- (void)dealloc {
  [valueToSet_ release];
  [expectedValue_ release];
  [super dealloc];
}

- (id)valueToSet {
  return valueToSet_;
}

- (id)expectedValue {
  return expectedValue_;
}
@end

@implementation NSObject (GTMBindingUnitTestingAdditions)

- (NSMutableArray*)gtm_unitTestExposedBindingsToIgnore {
  NSMutableArray *array = [NSMutableArray arrayWithObject:NSValueBinding];
  if ([[self exposedBindings] containsObject:NSFontBinding]) {
    NSString *fontBindings[] = { NSFontBoldBinding, NSFontFamilyNameBinding, 
    NSFontItalicBinding, NSFontNameBinding, NSFontSizeBinding };
    for (size_t i = 0; i < sizeof(fontBindings) / sizeof(NSString*); ++i) {
      [array addObject:fontBindings[i]];
    }
  }
  return array;
}

- (NSMutableArray*)gtm_unitTestExposedBindingsTestValues:(NSString*)binding {
  
  NSMutableArray *array = [NSMutableArray array];
  id value = [self valueForKey:binding];
  
  // Always test identity if possible
  if (value) {
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
  }
  
  // Now some default test values for a variety of bindings to make
  // sure that we cover all the bases and save other people writing lots of
  // duplicate test code.
  
  // If anybody can think of more to add, please go nuts.
  if ([binding isEqualToString:NSAlignmentBinding]) {
    value = [NSNumber numberWithInt:NSLeftTextAlignment];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    value = [NSNumber numberWithInt:NSRightTextAlignment];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    value = [NSNumber numberWithInt:NSCenterTextAlignment];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    value = [NSNumber numberWithInt:NSJustifiedTextAlignment];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    value = [NSNumber numberWithInt:NSNaturalTextAlignment];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    NSNumber *valueToSet = [NSNumber numberWithInt:500];
    [array addObject:[GTMBindingUnitTestData testWithValue:valueToSet
                                                 expecting:value]];
    valueToSet = [NSNumber numberWithInt:-1];
    [array addObject:[GTMBindingUnitTestData testWithValue:valueToSet
                                                 expecting:value]];
  } else if ([binding isEqualToString:NSAlternateImageBinding] || 
             [binding isEqualToString:NSImageBinding] || 
             [binding isEqualToString:NSMixedStateImageBinding] || 
             [binding isEqualToString:NSOffStateImageBinding] ||
             [binding isEqualToString:NSOnStateImageBinding]) {
    // This handles all image bindings
    value = [NSImage imageNamed:@"NSApplicationIcon"];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
  } else if ([binding isEqualToString:NSAnimateBinding] || 
             [binding isEqualToString:NSDocumentEditedBinding] ||
             [binding isEqualToString:NSEditableBinding] ||
             [binding isEqualToString:NSEnabledBinding] ||
             [binding isEqualToString:NSHiddenBinding] ||
             [binding isEqualToString:NSVisibleBinding] || 
             [binding isEqualToString:NSIsIndeterminateBinding] ||
             // NSTranparentBinding 10.5 only
             [binding isEqualToString:@"transparent"]) {
    // This handles all bool value bindings
    value = [NSNumber numberWithBool:YES];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    value = [NSNumber numberWithBool:NO];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
  } else if ([binding isEqualToString:NSAlternateTitleBinding] ||
             [binding isEqualToString:NSHeaderTitleBinding] ||
             [binding isEqualToString:NSLabelBinding] ||
             [binding isEqualToString:NSTitleBinding] ||
             [binding isEqualToString:NSToolTipBinding]) {
    // This handles all string value bindings
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:@"happy"]];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:@""]];
    
    // Test some non-ascii roman text
    char a_not_alpha[] = { 'A', 0xE2, 0x89, 0xA2, 0xCE, 0x91, '.', 0x00 };
    value = [NSString stringWithUTF8String:a_not_alpha];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    // Test some korean
    char hangugo[] = { 0xED, 0x95, 0x9C, 0xEA, 0xB5, 
                       0xAD, 0xEC, 0x96, 0xB4, 0x00 };   
    value = [NSString stringWithUTF8String:hangugo];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    // Test some japanese
    char nihongo[] = { 0xE6, 0x97, 0xA5, 0xE6, 0x9C,
                       0xAC, 0xE8, 0xAA, 0x9E, 0x00 };
    value = [NSString stringWithUTF8String:nihongo];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    // Test some arabic 
    char arabic[] = { 0xd9, 0x83, 0xd8, 0xa7, 0xd9, 0x83, 0xd8, 0xa7, 0x00 };
    value = [NSString stringWithUTF8String:arabic];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
  } else if ([binding isEqualToString:NSRepresentedFilenameBinding]) {
    // This handles all path bindings
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:@"/happy"]];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:@"/"]];
    
    // Test some non-ascii roman text
    char a_not_alpha[] = { '/', 'A', 0xE2, 0x89, 0xA2, 0xCE, 0x91, '.', 0x00 };
    value = [NSString stringWithUTF8String:a_not_alpha];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    // Test some korean
    char hangugo[] = { '/', 0xED, 0x95, 0x9C, 0xEA, 0xB5, 
      0xAD, 0xEC, 0x96, 0xB4, 0x00 };    
    value = [NSString stringWithUTF8String:hangugo];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    // Test some japanese
    char nihongo[] = { '/', 0xE6, 0x97, 0xA5, 0xE6, 0x9C,
      0xAC, 0xE8, 0xAA, 0x9E, 0x00 };
    value = [NSString stringWithUTF8String:nihongo];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    // Test some arabic 
    char arabic[] = { '/', 0xd9, 0x83, 0xd8, 0xa7, 0xd9, 0x83, 0xd8, 0xa7, 0x00 };
    value = [NSString stringWithUTF8String:arabic];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
  } else if ([binding isEqualToString:NSMaximumRecentsBinding]) {
    value = [NSNumber numberWithInt:0];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    value = [NSNumber numberWithInt:-1];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    value = [NSNumber numberWithInt:INT16_MAX];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    value = [NSNumber numberWithInt:INT16_MIN];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];    
  } else if ([binding isEqualToString:NSRowHeightBinding]) {
     NSNumber *valueOne = [NSNumber numberWithInt:1];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:valueOne]];
    value = [NSNumber numberWithInt:0];
    id value2 = [NSNumber numberWithInt:INT16_MIN];
    // Row height no longer accepts <= 0 values on SnowLeopard
    // which is a good thing.
    if ([GTMSystemVersion isSnowLeopardOrGreater]) {
      [array addObject:[GTMBindingUnitTestData testWithValue:value
                                                   expecting:valueOne]];
      
      [array addObject:[GTMBindingUnitTestData testWithValue:value2
                                                   expecting:valueOne]];
    } else {
      [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
      [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value2]];
    }
    value = [NSNumber numberWithInt:INT16_MAX];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
  } else if ([binding isEqualToString:NSMaxValueBinding] ||
             [binding isEqualToString:NSMaxWidthBinding] ||
             [binding isEqualToString:NSMinValueBinding] ||
             [binding isEqualToString:NSMinWidthBinding] || 
             [binding isEqualToString:NSContentWidthBinding] || 
             [binding isEqualToString:NSContentHeightBinding] ||
             [binding isEqualToString:NSWidthBinding] ||
             [binding isEqualToString:NSAnimationDelayBinding]) {
    // NSAnimationDelay is deprecated on SnowLeopard. We continue to test it
    // to make sure it doesn't get broken.
      
    // This handles all float value bindings
    value = [NSNumber numberWithFloat:0];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    value = [NSNumber numberWithFloat:FLT_MAX];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    value = [NSNumber numberWithFloat:-FLT_MAX];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    value = [NSNumber numberWithFloat:FLT_MIN];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    value = [NSNumber numberWithFloat:-FLT_MIN];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    value = [NSNumber numberWithFloat:FLT_EPSILON];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    value = [NSNumber numberWithFloat:-FLT_EPSILON];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
  } else if ([binding isEqualToString:NSTextColorBinding]) {
    // This handles all color value bindings
    value = [NSColor colorWithCalibratedWhite:1.0 alpha:1.0];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    value = [NSColor colorWithCalibratedWhite:1.0 alpha:0.0];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    value = [NSColor colorWithCalibratedWhite:1.0 alpha:0.5];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    value = [NSColor colorWithCalibratedRed:0.5 green:0.5 blue:0.5 alpha:0.5];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    value = [NSColor colorWithDeviceCyan:0.25 magenta:0.25 yellow:0.25 
                                   black:0.25 alpha:0.25];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
  } else if ([binding isEqualToString:NSFontBinding]) {
    // This handles all font value bindings
    value = [NSFont boldSystemFontOfSize:[NSFont systemFontSize]];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    value = [NSFont toolTipsFontOfSize:[NSFont smallSystemFontSize]];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
    value = [NSFont labelFontOfSize:144.0];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
  } else if ([binding isEqualToString:NSRecentSearchesBinding] || 
             [binding isEqualToString:NSSortDescriptorsBinding]) {
    // This handles all array value bindings
    value = [NSArray array];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
  } else if ([binding isEqualToString:NSTargetBinding]) {
    value = [NSNull null];
    [array addObject:[GTMBindingUnitTestData testWithIdentityValue:value]];
  } else {
    _GTMDevLog(@"Skipped Binding: %@ for %@", binding, self);  // COV_NF_LINE
  }
  return array;
}

- (BOOL)gtm_unitTestIsEqualTo:(id)value {
  return [self isEqualTo:value];
}

@end

#pragma mark -
#pragma mark All the special AppKit Bindings issues below

@interface NSImage (GTMBindingUnitTestingAdditions) 
@end

@implementation NSImage (GTMBindingUnitTestingAdditions)
- (BOOL)gtm_unitTestIsEqualTo:(id)value {
  // NSImage just does pointer equality in the default isEqualTo implementation
  // we need something a little more heavy duty that actually compares the
  // images internally.
  return [[self TIFFRepresentation] isEqualTo:[value TIFFRepresentation]];
}
@end

@interface NSScroller (GTMBindingUnitTestingAdditions) 
@end

@implementation NSScroller (GTMBindingUnitTestingAdditions)
- (NSMutableArray*)gtm_unitTestExposedBindingsToIgnore {
  NSMutableArray *array = [super gtm_unitTestExposedBindingsToIgnore];
  SInt32 major, minor, bugFix;
  [GTMSystemVersion getMajor:&major minor:&minor bugFix:&bugFix];
  if (major <= 10 && minor <= 5 && bugFix <= 5) {
    // rdar://5849154 - NSScroller exposes binding with no value 
    //                  class for NSValueBinding
    [array addObject:NSValueBinding];
  }
  if (major <= 10 && minor <= 6) {
    // Broken on SnowLeopard and below
    // rdar://5849236 - NSScroller exposes binding for NSFontBinding
    [array addObject:NSFontBinding];
  }
  return array;
}
@end

@interface NSTextField (GTMBindingUnitTestingAdditions) 
@end

@implementation NSTextField (GTMBindingUnitTestingAdditions)

- (NSMutableArray*)gtm_unitTestExposedBindingsToIgnore {
  NSMutableArray *array = [super gtm_unitTestExposedBindingsToIgnore];
  // Not KVC Compliant
  for (int i = 0; i < 10; i++) {
    [array addObject:[NSString stringWithFormat:@"displayPatternValue%d", i]];
  }
  return array;
}

- (NSMutableArray *)gtm_unitTestExposedBindingsTestValues:(NSString*)binding {
  NSMutableArray *array = [super gtm_unitTestExposedBindingsTestValues:binding];
  if ([binding isEqualToString:NSAlignmentBinding]) {
    SInt32 major, minor, bugFix;
    [GTMSystemVersion getMajor:&major minor:&minor bugFix:&bugFix];
    if (major <= 10 && minor <= 6) {
      // rdar://5851487 - If NSAlignmentBinding for a NSTextField is set to -1 
      //                  and then got it returns 7
      NSNumber *textAlignment = [NSNumber numberWithInt:NSNaturalTextAlignment];
      GTMBindingUnitTestData *dataToRemove =
        [GTMBindingUnitTestData testWithValue:[NSNumber numberWithInt:-1] 
                                    expecting:textAlignment];
      [array removeObject:dataToRemove];
      GTMBindingUnitTestData *dataToAdd =
        [GTMBindingUnitTestData testWithValue:[NSNumber numberWithInt:-1] 
                                    expecting:[NSNumber numberWithInt:7]];
      [array addObject:dataToAdd];
    }
  }
  return array;
}
@end

@interface NSSearchField (GTMBindingUnitTestingAdditions) 
@end

@implementation NSSearchField (GTMBindingUnitTestingAdditions)

- (NSMutableArray*)gtm_unitTestExposedBindingsToIgnore {
  NSMutableArray *array = [super gtm_unitTestExposedBindingsToIgnore];
  SInt32 major, minor, bugFix;
  [GTMSystemVersion getMajor:&major minor:&minor bugFix:&bugFix];
  if (major <= 10 && minor <= 6) {
    // rdar://5851491 - Setting NSAlignmentBinding of search field to 
    //                  NSCenterTextAlignment broken
    // Broken on 10.6 and below.
    [array addObject:NSAlignmentBinding];
  }
  // Not KVC Compliant
  [array addObject:NSPredicateBinding];
  return array;
}

@end

@interface NSWindow (GTMBindingUnitTestingAdditions) 
@end

@implementation NSWindow (GTMBindingUnitTestingAdditions)

- (NSMutableArray*)gtm_unitTestExposedBindingsToIgnore {
  NSMutableArray *array = [super gtm_unitTestExposedBindingsToIgnore];
  // Not KVC Compliant
  [array addObject:NSContentWidthBinding];
  [array addObject:NSContentHeightBinding];
  for (int i = 0; i < 10; i++) {
    [array addObject:[NSString stringWithFormat:@"displayPatternTitle%d", i]];
  }
  return array;
}

@end

@interface NSBox (GTMBindingUnitTestingAdditions) 
@end

@implementation NSBox (GTMBindingUnitTestingAdditions)

- (NSMutableArray*)gtm_unitTestExposedBindingsToIgnore {
  NSMutableArray *array = [super gtm_unitTestExposedBindingsToIgnore];
  // Not KVC Compliant
  for (int i = 0; i < 10; i++) {
    [array addObject:[NSString stringWithFormat:@"displayPatternTitle%d", i]];
  }
  return array;
}

@end

@interface NSTableView (GTMBindingUnitTestingAdditions) 
@end

@implementation NSTableView (GTMBindingUnitTestingAdditions)

- (NSMutableArray*)gtm_unitTestExposedBindingsToIgnore {
  NSMutableArray *array = [super gtm_unitTestExposedBindingsToIgnore];
  SInt32 major, minor, bugFix;
  [GTMSystemVersion getMajor:&major minor:&minor bugFix:&bugFix];
  if (major <= 10 && minor <= 6) {
    // rdar://6288332 - NSTableView does not respond to NSFontBinding
    // Broken on 10.5 and SnowLeopard
    [array addObject:NSFontBinding];
  }
  // Not KVC Compliant
  [array addObject:NSContentBinding];
  [array addObject:NSDoubleClickTargetBinding];
  [array addObject:NSDoubleClickArgumentBinding];
  [array addObject:NSSelectionIndexesBinding];
  return array;
}

@end

@interface NSTextView (GTMBindingUnitTestingAdditions) 
@end

@implementation NSTextView (GTMBindingUnitTestingAdditions)

- (NSMutableArray*)gtm_unitTestExposedBindingsToIgnore {
  NSMutableArray *array = [super gtm_unitTestExposedBindingsToIgnore];
  SInt32 major, minor, bugFix;
  [GTMSystemVersion getMajor:&major minor:&minor bugFix:&bugFix];
  if (major <= 10 && minor <= 6) {
    //rdar://5849335 - NSTextView only partially KVC compliant for key 
    //                 NSAttributedStringBinding
    [array addObject:NSAttributedStringBinding];
  }
  // Not KVC Compliant
  [array addObject:NSDataBinding];
  [array addObject:NSValueURLBinding];
  [array addObject:NSValuePathBinding];
  return array;
}

@end

@interface NSTabView (GTMBindingUnitTestingAdditions) 
@end

@implementation NSTabView (GTMBindingUnitTestingAdditions)

- (NSMutableArray*)gtm_unitTestExposedBindingsToIgnore {
  NSMutableArray *array = [super gtm_unitTestExposedBindingsToIgnore];
  SInt32 major, minor, bugFix;
  [GTMSystemVersion getMajor:&major minor:&minor bugFix:&bugFix];
  if (major <= 10 && minor <= 6) {
    // rdar://5849248 - NSTabView exposes binding with no value class 
    //                  for NSSelectedIdentifierBinding 
    [array addObject:NSSelectedIdentifierBinding];
  }
  // Not KVC Compliant
  [array addObject:NSSelectedIndexBinding];
  [array addObject:NSSelectedLabelBinding];
  return array;
}

@end

@interface NSButton (GTMBindingUnitTestingAdditions) 
@end

@implementation NSButton (GTMBindingUnitTestingAdditions)

- (NSMutableArray*)gtm_unitTestExposedBindingsToIgnore {
  NSMutableArray *array = [super gtm_unitTestExposedBindingsToIgnore];
  // Not KVC Compliant
  [array addObject:NSArgumentBinding];
  return array;
}

@end

@interface NSProgressIndicator (GTMBindingUnitTestingAdditions) 
@end

@implementation NSProgressIndicator (GTMBindingUnitTestingAdditions)

- (NSMutableArray*)gtm_unitTestExposedBindingsToIgnore {
  NSMutableArray *array = [super gtm_unitTestExposedBindingsToIgnore];
  // Not KVC Compliant
  [array addObject:NSAnimateBinding];
  return array;
}

@end
