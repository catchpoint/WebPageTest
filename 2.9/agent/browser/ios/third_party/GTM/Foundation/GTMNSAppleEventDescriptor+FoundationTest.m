//
//  GTMNSAppleEventDescriptor+FoundationTest.m
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

#import "GTMSenTestCase.h"
#import <Carbon/Carbon.h>
#import "GTMNSAppleEventDescriptor+Foundation.h"
#import "GTMFourCharCode.h"
#import "GTMUnitTestDevLog.h"

@interface GTMNSAppleEventDescriptor_TestObject : NSObject
@end

@implementation GTMNSAppleEventDescriptor_TestObject

- (NSAppleEventDescriptor*)gtm_appleEventDescriptor {
  return nil;
}

@end

@interface GTMNSAppleEventDescriptor_FoundationTest : GTMTestCase {
  BOOL gotEvent_;
}
- (void)handleEvent:(NSAppleEventDescriptor*)event 
          withReply:(NSAppleEventDescriptor*)reply;
- (void)handleEvent:(NSAppleEventDescriptor*)event 
          withError:(NSAppleEventDescriptor*)reply;

@end

@implementation GTMNSAppleEventDescriptor_FoundationTest
- (void)testRegisterSelectorForTypesCount {
  // Weird edge casey stuff.
  // + (void)registerSelector:(SEL)selector 
  //                 forTypes:(DescType*)types count:(int)count
  // is tested heavily by the other NSAppleEventDescriptor+foo categories.
  DescType type;
  [NSAppleEventDescriptor gtm_registerSelector:nil 
                                      forTypes:&type count:1];
  [NSAppleEventDescriptor gtm_registerSelector:@selector(initListDescriptor) 
                                      forTypes:nil count:1];
  [NSAppleEventDescriptor gtm_registerSelector:@selector(initListDescriptor) 
                                      forTypes:&type count:0];
  // Test the duplicate case
  [NSAppleEventDescriptor gtm_registerSelector:@selector(initListDescriptor) 
                                      forTypes:&type count:1];
  [GTMUnitTestDevLog expectPattern:@"initListDescriptor being replaced with "
   "initListDescriptor exists for type: [0-9]+"];
  [NSAppleEventDescriptor gtm_registerSelector:@selector(initListDescriptor) 
                                      forTypes:&type count:1];
}

- (void)testObjectValue {
  // - (void)testObjectValue is tested heavily by the other 
  // NSAppleEventDescriptor+foo categories.
  long data = 1;
  // v@#f is just a bogus descriptor type that we don't recognize.
  NSAppleEventDescriptor *desc 
    = [NSAppleEventDescriptor descriptorWithDescriptorType:'v@#f'
                                                     bytes:&data
                                                    length:sizeof(data)];
  id value = [desc gtm_objectValue];
  STAssertNil(value, nil);
}

- (void)testAppleEventDescriptor {
  // - (NSAppleEventDescriptor*)appleEventDescriptor is tested heavily by the 
  // other NSAppleEventDescriptor+foo categories.
  NSAppleEventDescriptor *desc = [self gtm_appleEventDescriptor];
  STAssertNotNil(desc, nil); 
  STAssertEquals([desc descriptorType], (DescType)typeUnicodeText, nil);
}

- (void)testDescriptorWithArrayAndArrayValue {
  // Test empty array
  NSAppleEventDescriptor *desc = [[NSArray array] gtm_appleEventDescriptor];
  STAssertNotNil(desc, nil);
  STAssertEquals([desc numberOfItems], (NSInteger)0, nil);
  
  // Complex array
  NSArray *array = [NSArray arrayWithObjects:
    [NSNumber numberWithInt:4],
    @"foo",
    [NSNumber numberWithInt:2], 
    @"bar",
    [NSArray arrayWithObjects:
      @"bam",
      [NSArray arrayWithObject:[NSNumber numberWithFloat:4.2f]],
      nil],
    nil];
  STAssertNotNil(array, nil);
  desc = [array gtm_appleEventDescriptor];
  STAssertNotNil(desc, nil);
  NSArray *array2 = [desc gtm_objectValue];
  STAssertNotNil(array2, nil);
  NSArray *array3 = [desc gtm_arrayValue];
  STAssertNotNil(array3, nil);
  STAssertTrue([array isEqualToArray:array2], 
               @"array: %@\narray2: %@\ndesc: %@", 
               [array description], [array2 description], [desc description]);
  STAssertTrue([array2 isEqualToArray:array3], 
               @"array: %@\narray2: %@\ndesc: %@", 
               [array description], [array2 description], [desc description]);
  
  // Test a single object
  array = [NSArray arrayWithObject:@"foo"];
  desc = [NSAppleEventDescriptor descriptorWithString:@"foo"];
  STAssertNotNil(desc, nil);
  array2 = [desc gtm_arrayValue];
  STAssertTrue([array isEqualToArray:array2], 
               @"array: %@\narray2: %@\ndesc: %@", 
               [array description], [array2 description], [desc description]);
  
  // Something that doesn't know how to register itself.
  GTMNSAppleEventDescriptor_TestObject *obj 
    = [[[GTMNSAppleEventDescriptor_TestObject alloc] init] autorelease];
  [GTMUnitTestDevLog expectPattern:@"Unable to create Apple Event Descriptor for .*"];
  desc = [[NSArray arrayWithObject:obj] gtm_appleEventDescriptor];
  STAssertNil(desc, @"Should be nil");
  
  // A list containing something we don't know how to deal with
  desc = [NSAppleEventDescriptor listDescriptor];
  NSAppleEventDescriptor *desc2 
    = [NSAppleEventDescriptor descriptorWithDescriptorType:'@!@#'
                                                     bytes:&desc
                                                    length:sizeof(desc)];
  [GTMUnitTestDevLog expectPattern:@"Unknown type of descriptor "
   "<NSAppleEventDescriptor: '@!@#'\\(\\$[0-9A-F]*\\$\\)>"];
  [desc insertDescriptor:desc2 atIndex:0];
  array = [desc gtm_objectValue];
  STAssertEquals([array count], (NSUInteger)0, @"Should have 0 items");
}

- (void)testDescriptorWithDictionaryAndDictionaryValue {
  // Test empty dictionary
  NSAppleEventDescriptor *desc 
    = [[NSDictionary dictionary] gtm_appleEventDescriptor];
  STAssertNotNil(desc, nil);
  STAssertEquals([desc numberOfItems], (NSInteger)0, nil);
  
  // Complex dictionary
  NSDictionary *dictionary = [NSDictionary dictionaryWithObjectsAndKeys:
    @"fooobject",
    @"fookey",
    @"barobject",
    @"barkey",
    [NSDictionary dictionaryWithObjectsAndKeys:
      @"january",
      [GTMFourCharCode fourCharCodeWithFourCharCode:cJanuary],
      @"february",
      [GTMFourCharCode fourCharCodeWithFourCharCode:cFebruary],
      nil],
    @"dictkey",
    nil];
  STAssertNotNil(dictionary, nil);
  desc = [dictionary gtm_appleEventDescriptor];
  STAssertNotNil(desc, nil);
  NSDictionary *dictionary2 = [desc gtm_objectValue];
  STAssertNotNil(dictionary2, nil);
  NSDictionary *dictionary3 = [desc gtm_dictionaryValue];
  STAssertNotNil(dictionary3, nil);
  STAssertEqualObjects(dictionary, dictionary2, 
                       @"desc: %@", [desc description]);
  STAssertEqualObjects(dictionary2, dictionary3, 
                       @"desc: %@", [desc description]);
  
  // Something that doesn't know how to register itself.
  GTMNSAppleEventDescriptor_TestObject *obj 
    = [[[GTMNSAppleEventDescriptor_TestObject alloc] init] autorelease];
  [GTMUnitTestDevLog expectPattern:@"Unable to create Apple Event Descriptor for .*"];
  desc = [[NSDictionary dictionaryWithObject:obj 
                                      forKey:@"foo"] gtm_appleEventDescriptor];
  STAssertNil(desc, @"Should be nil");

  GTMFourCharCode *fcc = [GTMFourCharCode fourCharCodeWithFourCharCode:cJanuary];
  desc = [[NSDictionary dictionaryWithObject:obj 
                                      forKey:fcc] gtm_appleEventDescriptor];
  STAssertNil(desc, @"Should be nil");
  
  // A list containing something we don't know how to deal with
  desc = [NSAppleEventDescriptor recordDescriptor];
  NSAppleEventDescriptor *desc2 
    = [NSAppleEventDescriptor descriptorWithDescriptorType:'@!@#'
                                                     bytes:&desc
                                                    length:sizeof(desc)];
  [desc setDescriptor:desc2 forKeyword:cJanuary];
  [GTMUnitTestDevLog expectPattern:@"Unknown type of descriptor "
   "<NSAppleEventDescriptor: '@!@#'\\(\\$[0-9A-F]+\\$\\)>"];
  dictionary = [desc gtm_objectValue];
  STAssertEquals([dictionary count], (NSUInteger)0, @"Should have 0 items");
  
  // A bad dictionary 
  dictionary = [NSDictionary dictionaryWithObjectsAndKeys:
    @"foo",
    [GTMFourCharCode fourCharCodeWithFourCharCode:'APPL'],
    @"bam", 
    @"bar",
    nil];
  STAssertNotNil(dictionary, nil);
  // I cannot use expectString here to the exact string because interestingly
  // dictionaries in 64 bit enumerate in a different order from dictionaries
  // on 32 bit. This is the closest pattern I can match.
  [GTMUnitTestDevLog expectPattern:@"Keys must be homogenous .*"];
  desc = [dictionary gtm_appleEventDescriptor];
  STAssertNil(desc, nil);
 
  // Another bad dictionary 
  dictionary = [NSDictionary dictionaryWithObjectsAndKeys:
                @"foo",
                [NSNumber numberWithInt:4],
                @"bam", 
                @"bar",
                nil];
  STAssertNotNil(dictionary, nil);
  // I cannot use expectString here to the exact string because interestingly
  // dictionaries in 64 bit enumerate in a different order from dictionaries
  // on 32 bit. This is the closest pattern I can match.
  [GTMUnitTestDevLog expectPattern:@"Keys must be .*"];
  desc = [dictionary gtm_appleEventDescriptor];
  STAssertNil(desc, nil);
  
  // A bad descriptor
  desc = [NSAppleEventDescriptor recordDescriptor];
  STAssertNotNil(desc, @"");
  NSArray *array = [NSArray arrayWithObjects:@"foo", @"bar", @"bam", nil];
  STAssertNotNil(array, @"");
  NSAppleEventDescriptor *userRecord = [array gtm_appleEventDescriptor];
  STAssertNotNil(userRecord, @"");
  [desc setDescriptor:userRecord forKeyword:keyASUserRecordFields];
  [GTMUnitTestDevLog expectPattern:@"Got a key bam with no value in \\(.*"];
  dictionary = [desc gtm_objectValue];
  STAssertNil(dictionary, @"Should be nil");
}

- (void)testDescriptorWithNull {  
  // Test Null
  NSNull *null = [NSNull null];
  NSAppleEventDescriptor *desc = [null gtm_appleEventDescriptor];
  STAssertNotNil(desc, nil);
  NSNull *null2 = [desc gtm_objectValue];
  STAssertNotNil(null2, nil);
  NSNull *null3 = [desc gtm_nullValue];
  STAssertNotNil(null2, nil);
  STAssertEqualObjects(null, null2, 
               @"null: %@\null2: %@\ndesc: %@", 
               [null description], [null2 description], 
               [desc description]);
  STAssertEqualObjects(null, null3, 
                       @"null: %@\null3: %@\ndesc: %@", 
                       [null description], [null3 description], 
                       [desc description]);
}

- (void)testDescriptorWithString {
  // Test empty String
  NSAppleEventDescriptor *desc = [[NSString string] gtm_appleEventDescriptor];
  STAssertNotNil(desc, nil);
  
  // Test String
  NSString *string = @"Ratatouille!";
  desc = [string gtm_appleEventDescriptor];
  STAssertNotNil(desc, nil);
  NSString *string2 = [desc gtm_objectValue];
  STAssertNotNil(string2, nil);
  STAssertEqualObjects(string, string2, 
               @"string: %@\nstring: %@\ndesc: %@", 
               [string description], [string2 description], [desc description]);
  
}

- (void)testDescriptorWithNumberAndNumberValue {
  // There's really no good way to make this into a loop sadly due
  // to me having to pass a pointer of bytes to NSInvocation as an argument.
  // I want the compiler to convert my int to the appropriate type.
  
  NSNumber *original = [NSNumber numberWithBool:YES];
  STAssertNotNil(original, @"Value: YES");
  NSAppleEventDescriptor *desc = [original gtm_appleEventDescriptor]; 
  STAssertNotNil(desc, @"Value: YES");
  id returned = [desc gtm_objectValue];
  STAssertNotNil(returned, @"Value: YES");
  STAssertTrue([returned isKindOfClass:[NSNumber class]], @"Value: YES");
  STAssertEqualObjects(original, returned, @"Value: YES");
  desc = [desc coerceToDescriptorType:typeBoolean];
  NSNumber *number = [desc gtm_numberValue];
  STAssertEqualObjects(number, original, @"Value: YES");
  
  original = [NSNumber numberWithBool:NO];
  STAssertNotNil(original, @"Value: NO");
  desc = [original gtm_appleEventDescriptor]; 
  STAssertNotNil(desc, @"Value: NO");
  returned = [desc gtm_objectValue];
  STAssertNotNil(returned, @"Value: NO");
  STAssertTrue([returned isKindOfClass:[NSNumber class]], @"Value: NO");
  STAssertEqualObjects(original, returned, @"Value: NO");
  
  sranddev(); 
  double value = rand();
  
  original = [NSNumber numberWithChar:value];
  STAssertNotNil(original, @"Value: %g", value);
  desc = [original gtm_appleEventDescriptor]; 
  STAssertNotNil(desc, @"Value: %g", value);
  returned = [desc gtm_objectValue];
  STAssertNotNil(returned, @"Value: %g", value);
  STAssertTrue([returned isKindOfClass:[NSNumber class]], @"Value: %g", value);
  STAssertEqualObjects(original, returned, @"Value: %g", value);

  value = rand();
  original = [NSNumber numberWithUnsignedChar:value];
  STAssertNotNil(original, @"Value: %g", value);
  desc = [original gtm_appleEventDescriptor];
  STAssertNotNil(desc, @"Value: %g", value);
  returned = [desc gtm_objectValue];
  STAssertNotNil(returned, @"Value: %g", value);
  STAssertTrue([returned isKindOfClass:[NSNumber class]], @"Value: %g", value);
  STAssertEqualObjects(original, returned, @"Value: %g", value);

  value = rand();
  original = [NSNumber numberWithShort:value];
  STAssertNotNil(original, @"Value: %g", value);
  desc = [original gtm_appleEventDescriptor];
  STAssertNotNil(desc, @"Value: %g", value);
  returned = [desc gtm_objectValue];
  STAssertNotNil(returned, @"Value: %g", value);
  STAssertTrue([returned isKindOfClass:[NSNumber class]], @"Value: %g", value);
  STAssertEqualObjects(original, returned, @"Value: %g", value);
  
  value = rand();
  original = [NSNumber numberWithUnsignedShort:value];
  STAssertNotNil(original, @"Value: %g", value);
  desc = [original gtm_appleEventDescriptor];
  STAssertNotNil(desc, @"Value: %g", value);
  returned = [desc gtm_objectValue];
  STAssertNotNil(returned, @"Value: %g", value);
  STAssertTrue([returned isKindOfClass:[NSNumber class]], @"Value: %g", value);
  STAssertEqualObjects(original, returned, @"Value: %g", value);
  
  value = rand();
  original = [NSNumber numberWithInt:(int)value];
  STAssertNotNil(original, @"Value: %g", value);
  desc = [original gtm_appleEventDescriptor];
  STAssertNotNil(desc, @"Value: %g", value);
  returned = [desc gtm_objectValue];
  STAssertNotNil(returned, @"Value: %g", value);
  STAssertTrue([returned isKindOfClass:[NSNumber class]], @"Value: %g", value);
  STAssertEqualObjects(original, returned, @"Value: %g", value);
  
  value = rand();
  original = [NSNumber numberWithUnsignedInt:(unsigned int)value];
  STAssertNotNil(original, @"Value: %g", value);
  desc = [original gtm_appleEventDescriptor];
  STAssertNotNil(desc, @"Value: %g", value);
  returned = [desc gtm_objectValue];
  STAssertNotNil(returned, @"Value: %g", value);
  STAssertTrue([returned isKindOfClass:[NSNumber class]], @"Value: %g", value);
  STAssertEqualObjects(original, returned, @"Value: %g", value);
  
  value = rand();
  original = [NSNumber numberWithLong:value];
  STAssertNotNil(original, @"Value: %g", value);
  desc = [original gtm_appleEventDescriptor];
  STAssertNotNil(desc, @"Value: %g", value);
  returned = [desc gtm_objectValue];
  STAssertNotNil(returned, @"Value: %g", value);
  STAssertTrue([returned isKindOfClass:[NSNumber class]], @"Value: %g", value);
  STAssertEqualObjects(original, returned, @"Value: %g", value);
  
  value = rand();
  original = [NSNumber numberWithUnsignedLong:value];
  STAssertNotNil(original, @"Value: %g", value);
  desc = [original gtm_appleEventDescriptor];
  STAssertNotNil(desc, @"Value: %g", value);
  returned = [desc gtm_objectValue];
  STAssertNotNil(returned, @"Value: %g", value);
  STAssertTrue([returned isKindOfClass:[NSNumber class]], @"Value: %g", value);
  STAssertEqualObjects(original, returned, @"Value: %g", value);
  
  value = rand();
  original = [NSNumber numberWithLongLong:value];
  STAssertNotNil(original, @"Value: %g", value);
  desc = [original gtm_appleEventDescriptor];
  STAssertNotNil(desc, @"Value: %g", value);
  returned = [desc gtm_objectValue];
  STAssertNotNil(returned, @"Value: %g", value);
  STAssertTrue([returned isKindOfClass:[NSNumber class]], @"Value: %g", value);
  STAssertEqualObjects(original, returned, @"Value: %g", value);
  
  value = rand();
  original = [NSNumber numberWithUnsignedLongLong:value];
  STAssertNotNil(original, @"Value: %g", value);
  desc = [original gtm_appleEventDescriptor];
  STAssertNotNil(desc, @"Value: %g", value);
  returned = [desc gtm_objectValue];
  STAssertNotNil(returned, @"Value: %g", value);
  STAssertTrue([returned isKindOfClass:[NSNumber class]], @"Value: %g", value);
  STAssertEqualObjects(original, returned, @"Value: %g", value);
  
  float floatA = rand();
  float floatB = rand();
  value = floatA / floatB;
  original = [NSNumber numberWithFloat:(float)value];
  STAssertNotNil(original, @"Value: %g", value);
  desc = [original gtm_appleEventDescriptor];
  STAssertNotNil(desc, @"Value: %g", value);
  returned = [desc gtm_objectValue];
  STAssertNotNil(returned, @"Value: %g", value);
  STAssertTrue([returned isKindOfClass:[NSNumber class]], @"Value: %g", value);
  STAssertEqualObjects(original, returned, @"Value: %g", value);

  double doubleA = rand();
  double doubleB = rand();
  value = doubleA / doubleB;
  original = [NSNumber numberWithDouble:value];
  STAssertNotNil(original, @"Value: %g", value);
  desc = [original gtm_appleEventDescriptor];
  STAssertNotNil(desc, @"Value: %g", value);
  returned = [desc gtm_objectValue];
  STAssertNotNil(returned, @"Value: %g", value);
  STAssertTrue([returned isKindOfClass:[NSNumber class]], @"Value: %g", value);
  STAssertEqualObjects(original, returned, @"Value: %g", value);

  value = rand();
  original = [NSNumber numberWithBool:value];
  STAssertNotNil(original, @"Value: %g", value);
  desc = [original gtm_appleEventDescriptor];
  STAssertNotNil(desc, @"Value: %g", value);
  returned = [desc gtm_objectValue];
  STAssertNotNil(returned, @"Value: %g", value);
  STAssertTrue([returned isKindOfClass:[NSNumber class]], @"Value: %g", value);
  STAssertEqualObjects(original, returned, @"Value: %g", value);
  
  value = NAN;
  original = [NSNumber numberWithDouble:value];
  STAssertNotNil(original, @"Value: %g", value);
  desc = [original gtm_appleEventDescriptor];
  STAssertNotNil(desc, @"Value: %g", value);
  returned = [desc gtm_objectValue];
  STAssertNotNil(returned, @"Value: %g", value);
  STAssertTrue([returned isKindOfClass:[NSNumber class]], @"Value: %g", value);
  STAssertEqualObjects(original, returned, @"Value: %g", value);

  value = INFINITY;
  original = [NSNumber numberWithDouble:value];
  STAssertNotNil(original, @"Value: %g", value);
  desc = [original gtm_appleEventDescriptor];
  STAssertNotNil(desc, @"Value: %g", value);
  returned = [desc gtm_objectValue];
  STAssertNotNil(returned, @"Value: %g", value);
  STAssertTrue([returned isKindOfClass:[NSNumber class]], @"Value: %g", value);
  STAssertEqualObjects(original, returned, @"Value: %g", value);
 
  value = -0.0;
  original = [NSNumber numberWithDouble:value];
  STAssertNotNil(original, @"Value: %g", value);
  desc = [original gtm_appleEventDescriptor];
  STAssertNotNil(desc, @"Value: %g", value);
  returned = [desc gtm_objectValue];
  STAssertNotNil(returned, @"Value: %g", value);
  STAssertTrue([returned isKindOfClass:[NSNumber class]], @"Value: %g", value);
  STAssertEqualObjects(original, returned, @"Value: %g", value);

  value = -INFINITY;
  original = [NSNumber numberWithDouble:value];
  STAssertNotNil(original, @"Value: %g", value);
  desc = [original gtm_appleEventDescriptor];
  STAssertNotNil(desc, @"Value: %g", value);
  returned = [desc gtm_objectValue];
  STAssertNotNil(returned, @"Value: %g", value);
  STAssertTrue([returned isKindOfClass:[NSNumber class]], @"Value: %g", value);
  STAssertEqualObjects(original, returned, @"Value: %g", value);
}

- (void)testDescriptorWithDoubleAndDoubleValue {
  sranddev(); 
  for (int i = 0; i < 1000; ++i) {
    double value1 = rand();
    double value2 = rand();
    double value = value1 / value2;
    NSAppleEventDescriptor *desc 
      = [NSAppleEventDescriptor gtm_descriptorWithDouble:value];
    STAssertNotNil(desc, @"Value: %g", value);
    double returnedValue = [desc gtm_doubleValue];
    STAssertEquals(value, returnedValue, @"Value: %g", value);
  }
  
  double specialCases[] = { 0.0f, __DBL_MIN__, __DBL_EPSILON__, INFINITY, NAN };
  for (size_t i = 0; i < sizeof(specialCases) / sizeof(double); ++i) {
    double value = specialCases[i];
    NSAppleEventDescriptor *desc 
      = [NSAppleEventDescriptor gtm_descriptorWithDouble:value];
    STAssertNotNil(desc, @"Value: %g", value);
    double returnedValue = [desc gtm_doubleValue];
    STAssertEquals(value, returnedValue, @"Value: %g", value);
  }
}

- (void)testDescriptorWithFloatAndFloatValue {
  sranddev(); 
  for (int i = 0; i < 1000; ++i) {
    float value1 = rand();
    float value2 = rand();
    float value = value1 / value2;
    NSAppleEventDescriptor *desc 
      = [NSAppleEventDescriptor gtm_descriptorWithFloat:value];
    STAssertNotNil(desc, @"Value: %f", value);
    float returnedValue = [desc gtm_floatValue];
    STAssertEquals(value, returnedValue, @"Value: %f", value);
  }
  
  float specialCases[] = { 0.0f, FLT_MIN, FLT_MAX, FLT_EPSILON, INFINITY, NAN };
  for (size_t i = 0; i < sizeof(specialCases) / sizeof(float); ++i) {
    float value = specialCases[i];
    NSAppleEventDescriptor *desc 
      = [NSAppleEventDescriptor gtm_descriptorWithFloat:value];
    STAssertNotNil(desc, @"Value: %f", value);
    float returnedValue = [desc gtm_floatValue];
    STAssertEquals(value, returnedValue, @"Value: %f", value);
  }
}

- (void)testDescriptorWithCGFloatAndCGFloatValue {
  sranddev(); 
  for (int i = 0; i < 1000; ++i) {
    CGFloat value1 = rand();
    CGFloat value2 = rand();
    CGFloat value = value1 / value2;
    NSAppleEventDescriptor *desc 
      = [NSAppleEventDescriptor gtm_descriptorWithCGFloat:value];
    STAssertNotNil(desc, @"Value: %g", (double)value);
    CGFloat returnedValue = [desc gtm_cgFloatValue];
    STAssertEquals(value, returnedValue, @"Value: %g", (double)value);
  }
  
  CGFloat specialCases[] = { 0.0f, CGFLOAT_MIN, CGFLOAT_MAX, NAN };
  for (size_t i = 0; i < sizeof(specialCases) / sizeof(CGFloat); ++i) {
    CGFloat value = specialCases[i];
    NSAppleEventDescriptor *desc 
      = [NSAppleEventDescriptor gtm_descriptorWithCGFloat:value];
    STAssertNotNil(desc, @"Value: %g", (double)value);
    CGFloat returnedValue = [desc gtm_cgFloatValue];
    STAssertEquals(value, returnedValue, @"Value: %g", (double)value);
  }
}

- (void)testDescriptorWithGTMFourCharCode {
  GTMFourCharCode *fcc = [GTMFourCharCode fourCharCodeWithFourCharCode:'APPL'];
  STAssertNotNil(fcc, nil);
  NSAppleEventDescriptor *desc = [fcc gtm_appleEventDescriptor];
  STAssertNotNil(desc, nil);
  GTMFourCharCode *fcc2 = [desc gtm_objectValue];
  STAssertNotNil(fcc2, nil);
  STAssertEqualObjects(fcc, fcc2, nil);
  STAssertEquals([desc descriptorType], (DescType)typeType, nil);
  desc = [fcc gtm_appleEventDescriptorOfType:typeKeyword];
  STAssertNotNil(desc, nil);
  fcc2 = [desc gtm_objectValue];
  STAssertNotNil(fcc2, nil);
  STAssertEqualObjects(fcc, fcc2, nil);
  STAssertEquals([desc descriptorType], (DescType)typeKeyword, nil);
}

- (void)testDescriptorWithDescriptor {
  NSAppleEventDescriptor *desc
    = [NSAppleEventDescriptor descriptorWithString:@"foo"];
  NSAppleEventDescriptor *desc2 = [desc gtm_appleEventDescriptor];
  STAssertEqualObjects(desc, desc2, nil);
}

- (void)handleEvent:(NSAppleEventDescriptor*)event 
          withReply:(NSAppleEventDescriptor*)reply {
  gotEvent_ = YES;
  NSAppleEventDescriptor *answer = [NSAppleEventDescriptor descriptorWithInt32:1];
  [reply setDescriptor:answer forKeyword:keyDirectObject];
}

- (void)handleEvent:(NSAppleEventDescriptor*)event 
          withError:(NSAppleEventDescriptor*)error {
  gotEvent_ = YES;
  NSAppleEventDescriptor *answer = [NSAppleEventDescriptor descriptorWithInt32:1];
  [error setDescriptor:answer forKeyword:keyErrorNumber];
}

- (void)testSend {
  const AEEventClass eventClass = 'Fooz';
  const AEEventID eventID = 'Ball';
  NSAppleEventManager *mgr = [NSAppleEventManager sharedAppleEventManager];
  [mgr setEventHandler:self 
           andSelector:@selector(handleEvent:withReply:)
         forEventClass:eventClass 
            andEventID:'Ball'];
  NSAppleEventDescriptor *currentProcess 
    = [[NSProcessInfo processInfo] gtm_appleEventDescriptor];
  NSAppleEventDescriptor *event 
    = [NSAppleEventDescriptor appleEventWithEventClass:eventClass
                                               eventID:eventID
                                      targetDescriptor:currentProcess
                                              returnID:kAutoGenerateReturnID
                                         transactionID:kAnyTransactionID];
  gotEvent_ = NO;
  NSAppleEventDescriptor *reply;
  BOOL goodEvent = [event gtm_sendEventWithMode:kAEWaitReply timeOut:60 reply:&reply];
  [mgr removeEventHandlerForEventClass:eventClass andEventID:eventID];
  STAssertTrue(goodEvent, @"bad event?");
  STAssertTrue(gotEvent_, @"Handler not called");
  NSAppleEventDescriptor *value = [reply descriptorForKeyword:keyDirectObject];
  STAssertEquals([value int32Value], (SInt32)1, @"didn't get reply");
  
  
  gotEvent_ = NO;
  [GTMUnitTestDevLog expectString:@"Unable to send message: "
   "<NSAppleEventDescriptor: 'Fooz'\\'Ball'{  }> -1708"];
  goodEvent = [event gtm_sendEventWithMode:kAEWaitReply timeOut:60 reply:&reply];
  STAssertFalse(goodEvent, @"good event?");
  STAssertFalse(gotEvent_, @"Handler called?");
  
  [mgr setEventHandler:self 
           andSelector:@selector(handleEvent:withError:)
         forEventClass:eventClass 
            andEventID:eventID];
  gotEvent_ = NO;
  goodEvent = [event gtm_sendEventWithMode:kAEWaitReply timeOut:60 reply:&reply];
  STAssertFalse(goodEvent, @"good event?");
  STAssertTrue(gotEvent_, @"Handler not called?");
  [mgr removeEventHandlerForEventClass:eventClass andEventID:eventID];
}

@end
