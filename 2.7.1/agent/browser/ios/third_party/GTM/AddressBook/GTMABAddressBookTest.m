//
//  GTMAddressBookTest.m
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
#import "GTMABAddressBook.h"

#if GTM_IPHONE_SDK
#import "UIKit/UIKit.h"
#else
#import <AppKit/AppKit.h>
#endif  // GTM_IPHONE_SDK

static NSString *const kGTMABTestFirstName = @"GTMABAddressBookTestFirstName";
static NSString *const kGTMABTestLastName = @"GTMABAddressBookTestLastName";
static NSString *const kGTMABTestGroupName = @"GTMABAddressBookTestGroupName";

@interface GTMABAddressBookTest : GTMTestCase {
 @private
  GTMABAddressBook *book_;
}
@end


@implementation GTMABAddressBookTest
- (void)setUp {
  // Create a book forcing it out of it's autorelease pool.
  // I force it out of the release pool, so that we will see any errors
  // for it immediately at teardown, and it will be clear which release
  // caused us problems.
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  book_ = [[GTMABAddressBook addressBook] retain];
  [pool release];
  STAssertNotNil(book_, nil);
  NSArray *people
    = [book_ peopleWithCompositeNameWithPrefix:kGTMABTestFirstName];
  GTMABPerson *person;
  GTM_FOREACH_OBJECT(person, people) {
    [book_ removeRecord:person];
  }
  NSArray *groups
    = [book_ groupsWithCompositeNameWithPrefix:kGTMABTestGroupName];
  GTMABGroup *group;
  GTM_FOREACH_OBJECT(group, groups) {
    [book_ removeRecord:group];
  }
  [book_ save];
}

- (void)tearDown {
  [book_ release];
}

- (void)testGenericAddressBook {
  STAssertEqualObjects([GTMABAddressBook localizedLabel:(NSString *)kABHomeLabel],
                       @"home",
                       nil);
  STAssertThrows([GTMABRecord recordWithRecord:nil], nil);
}

- (void)testAddingAndRemovingPerson {
  // Create a person
  GTMABPerson *person = [GTMABPerson personWithFirstName:kGTMABTestFirstName
                                                lastName:kGTMABTestLastName];
  STAssertNotNil(person, nil);

  // Add person
  NSArray *people = [book_ people];
  STAssertFalse([people containsObject:person], nil);
  STAssertTrue([book_ addRecord:person], nil);
#if GTM_IPHONE_SDK && (__IPHONE_OS_VERSION_MIN_REQUIRED < __IPHONE_3_2)
  // Normally this next line would be STAssertTrue, however due to
  // Radar 6200638: ABAddressBookHasUnsavedChanges doesn't work
  // We will check to make sure it stays broken ;-)
  STAssertFalse([book_ hasUnsavedChanges], nil);
#else  // GTM_IPHONE_SDK
  STAssertTrue([book_ hasUnsavedChanges], nil);
#endif  // GTM_IPHONE_SDK

  people = [book_ people];
  STAssertNotNil(people, nil);
#if GTM_IPHONE_SDK
  // Normally this next line would be STAssertTrue, however due to
  // Radar 6200703: ABAddressBookAddRecord doesn't add an item to the people
  //                array until it's saved
  // We will check to make sure it stays broken ;-)
  STAssertFalse([people containsObject:person], nil);
#else  // GTM_IPHONE_SDK
  STAssertTrue([people containsObject:person], nil);
#endif  // GTM_IPHONE_SDK

  // Save book_
  STAssertTrue([book_ save], nil);
  people = [book_ people];
  STAssertNotNil(people, nil);
  STAssertTrue([people containsObject:person], nil);
  people = [book_ peopleWithCompositeNameWithPrefix:kGTMABTestFirstName];
  STAssertEqualObjects([people objectAtIndex:0], person, nil);

  GTMABRecordID recordID = [person recordID];
  STAssertNotEquals(recordID, kGTMABRecordInvalidID, nil);

  GTMABRecord *record = [book_ personForId:recordID];
  STAssertEqualObjects(record, person, nil);

  // Remove person
  STAssertTrue([book_ removeRecord:person], nil);
  people = [book_ peopleWithCompositeNameWithPrefix:kGTMABTestFirstName];
  STAssertEquals([people count], (NSUInteger)0, nil);

#if GTM_IPHONE_SDK && (__IPHONE_OS_VERSION_MIN_REQUIRED < __IPHONE_3_2)
  // Normally this next line would be STAssertTrue, however due to
  // Radar 6200638: ABAddressBookHasUnsavedChanges doesn't work
  // We will check to make sure it stays broken ;-)
  STAssertFalse([book_ hasUnsavedChanges], nil);
#else  // GTM_IPHONE_SDK
  STAssertTrue([book_ hasUnsavedChanges], nil);
#endif  // GTM_IPHONE_SDK
  people = [book_ people];
  STAssertFalse([people containsObject:person], nil);

  // Save Book
  STAssertTrue([book_ save], nil);
  people = [book_ people];
  STAssertFalse([book_ hasUnsavedChanges], nil);
  STAssertFalse([people containsObject:person], nil);
  record = [book_ personForId:recordID];
  STAssertNil(record, nil);

  // Bogus data
  STAssertFalse([book_ addRecord:nil], nil);
  STAssertFalse([book_ removeRecord:nil], nil);

  STAssertNotNULL([book_ addressBookRef], nil);

}

- (void)testAddingAndRemovingGroup {
  // Create a group
  GTMABGroup *group = [GTMABGroup groupNamed:kGTMABTestGroupName];
  STAssertNotNil(group, nil);

  // Add group
  NSArray *groups = [book_ groups];
  STAssertFalse([groups containsObject:group], nil);
  STAssertTrue([book_ addRecord:group], nil);
#if GTM_IPHONE_SDK && (__IPHONE_OS_VERSION_MIN_REQUIRED < __IPHONE_3_2)
  // Normally this next line would be STAssertTrue, however due to
  // Radar 6200638: ABAddressBookHasUnsavedChanges doesn't work
  // We will check to make sure it stays broken ;-)
  STAssertFalse([book_ hasUnsavedChanges], nil);
#else  // GTM_IPHONE_SDK
  STAssertTrue([book_ hasUnsavedChanges], nil);
#endif  // GTM_IPHONE_SDK

  groups = [book_ groups];
  STAssertNotNil(groups, nil);
#if GTM_IPHONE_SDK
  // Normally this next line would be STAssertTrue, however due to
  // Radar 6200703: ABAddressBookAddRecord doesn't add an item to the groups
  //                array until it's saved
  // We will check to make sure it stays broken ;-)
  STAssertFalse([groups containsObject:group], nil);
#else  // GTM_IPHONE_SDK
  STAssertTrue([groups containsObject:group], nil);
#endif  // GTM_IPHONE_SDK

  // Save book_
  STAssertTrue([book_ save], nil);
  groups = [book_ groups];
  STAssertNotNil(groups, nil);
  STAssertTrue([groups containsObject:group], nil);
  groups = [book_ groupsWithCompositeNameWithPrefix:kGTMABTestGroupName];
  STAssertEqualObjects([groups objectAtIndex:0], group, nil);

  GTMABRecordID recordID = [group recordID];
  STAssertNotEquals(recordID, kGTMABRecordInvalidID, nil);

  GTMABRecord *record = [book_ groupForId:recordID];
  STAssertEqualObjects(record, group, nil);

  // Remove group
  STAssertTrue([book_ removeRecord:group], nil);

#if GTM_IPHONE_SDK && (__IPHONE_OS_VERSION_MIN_REQUIRED < __IPHONE_3_2)
  // Normally this next line would be STAssertTrue, however due to
  // Radar 6200638: ABAddressBookHasUnsavedChanges doesn't work
  // We will check to make sure it stays broken ;-)
  STAssertFalse([book_ hasUnsavedChanges], nil);
#else  // GTM_IPHONE_SDK
  STAssertTrue([book_ hasUnsavedChanges], nil);
#endif  // GTM_IPHONE_SDK
  groups = [book_ groups];
  STAssertFalse([groups containsObject:group], nil);

  // Save Book
  STAssertTrue([book_ save], nil);
  groups = [book_ groups];
  STAssertFalse([book_ hasUnsavedChanges], nil);
  STAssertFalse([groups containsObject:group], nil);
  groups = [book_ groupsWithCompositeNameWithPrefix:kGTMABTestGroupName];
  STAssertEquals([groups count], (NSUInteger)0, nil);
  record = [book_ groupForId:recordID];
  STAssertNil(record, nil);
}

- (void)testPerson {
  GTMABPerson *person = [[[GTMABPerson alloc] initWithRecord:nil] autorelease];
  STAssertNil(person, nil);
  person = [GTMABPerson personWithFirstName:kGTMABTestFirstName
                                   lastName:nil];
  STAssertNotNil(person, nil);
  STAssertEqualObjects([person compositeName], kGTMABTestFirstName, nil);
  NSString *firstName = [person valueForProperty:kGTMABPersonFirstNameProperty];
  STAssertEqualObjects(firstName, kGTMABTestFirstName, nil);
  NSString *lastName = [person valueForProperty:kGTMABPersonLastNameProperty];
  STAssertNil(lastName, nil);
  STAssertTrue([person removeValueForProperty:kGTMABPersonFirstNameProperty], nil);
  STAssertFalse([person removeValueForProperty:kGTMABPersonFirstNameProperty], nil);
  STAssertFalse([person removeValueForProperty:kGTMABPersonLastNameProperty], nil);
  STAssertFalse([person setValue:nil forProperty:kGTMABPersonFirstNameProperty], nil);
  STAssertFalse([person setValue:[NSNumber numberWithInt:1]
                     forProperty:kGTMABPersonFirstNameProperty], nil);
  STAssertFalse([person setValue:@"Bart"
                     forProperty:kGTMABPersonBirthdayProperty], nil);

  GTMABPropertyType property
    = [GTMABPerson typeOfProperty:kGTMABPersonLastNameProperty];
  STAssertEquals(property, (GTMABPropertyType)kGTMABStringPropertyType, nil);

  NSString *string
    = [GTMABPerson localizedPropertyName:kGTMABPersonLastNameProperty];
  STAssertEqualObjects(string, @"Last", nil);

  string = [GTMABPerson localizedPropertyName:kGTMABRecordInvalidID];
#ifdef GTM_IPHONE_SDK
  STAssertEqualObjects(string, kGTMABUnknownPropertyName, nil);
#else  // GTM_IPHONE_SDK
  STAssertEqualObjects(string, kGTMABRecordInvalidID, nil);
#endif  // GTM_IPHONE_SDK
  string = [person description];
  STAssertNotNil(string, nil);

  GTMABPersonCompositeNameFormat format = [GTMABPerson compositeNameFormat];
  STAssertTrue(format == kABPersonCompositeNameFormatFirstNameFirst ||
               format == kABPersonCompositeNameFormatLastNameFirst, nil);

  NSData *data = [person imageData];
  STAssertNil(data, nil);
  STAssertTrue([person setImageData:nil], nil);
  data = [person imageData];
  STAssertNil(data, nil);
  NSBundle *bundle = [NSBundle bundleForClass:[self class]];
  NSString *phonePath = [bundle pathForResource:@"phone" ofType:@"png"];
  STAssertNotNil(phonePath, nil);
  GTMABImage *image
    = [[[GTMABImage alloc] initWithContentsOfFile:phonePath] autorelease];
  STAssertNotNil(image, nil);
#ifdef GTM_IPHONE_SDK
  data = UIImagePNGRepresentation(image);
#else  // GTM_IPHONE_SDK
  data = [image TIFFRepresentation];
#endif  // GTM_IPHONE_SDK
  STAssertTrue([person setImageData:data], nil);
  NSData *data2 = [person imageData];
  STAssertEqualObjects(data, data2, nil);
  STAssertTrue([person setImageData:nil], nil);
  data = [person imageData];
  STAssertNil(data, nil);

  STAssertTrue([person setImage:image], nil);
  GTMABImage *image2 = [person image];
  STAssertNotNil(image2, nil);
#ifdef GTM_IPHONE_SDK
  STAssertEqualObjects(UIImagePNGRepresentation(image),
                       UIImagePNGRepresentation(image2), nil);
#else  // GTM_IPHONE_SDK
  STAssertEqualObjects([image TIFFRepresentation],
                       [image2 TIFFRepresentation], nil);
#endif  // GTM_IPHONE_SDK

  person = [GTMABPerson personWithFirstName:kGTMABTestFirstName
                                   lastName:kGTMABTestLastName];

  data = [NSData dataWithBytes:"a" length:1];
  STAssertFalse([person setImageData:data], nil);

  GTMABMutableMultiValue *value
    = [GTMABMutableMultiValue valueWithPropertyType:kGTMABStringPropertyType];
  STAssertNotNil(value, nil);
  STAssertNotEquals([value addValue:@"222-222-2222"
                          withLabel:(CFStringRef)kABHomeLabel],
                    kGTMABMultiValueInvalidIdentifier, nil);
  STAssertNotEquals([value addValue:@"333-333-3333"
                          withLabel:(CFStringRef)kABWorkLabel],
                    kGTMABMultiValueInvalidIdentifier, nil);
  STAssertTrue([person setValue:value
                    forProperty:kGTMABPersonPhoneProperty], nil);
  id value2 = [person valueForProperty:kGTMABPersonPhoneProperty];
  STAssertNotNil(value2, nil);
  STAssertEqualObjects(value, value2, nil);
  STAssertEquals([value hash], [value2 hash], nil);
  STAssertNotEquals([person hash], (NSUInteger)0, nil);
}

- (void)testGroup {
  GTMABGroup *group = [[[GTMABGroup alloc] initWithRecord:nil] autorelease];
  STAssertNil(group, nil);
  group = [GTMABGroup groupNamed:kGTMABTestGroupName];
  STAssertNotNil(group, nil);
  STAssertEqualObjects([group compositeName], kGTMABTestGroupName, nil);
  NSString *name = [group valueForProperty:kABGroupNameProperty];
  STAssertEqualObjects(name, kGTMABTestGroupName, nil);
  NSString *lastName = [group valueForProperty:kGTMABPersonLastNameProperty];
  STAssertNil(lastName, nil);
  STAssertTrue([group removeValueForProperty:kABGroupNameProperty], nil);
  STAssertFalse([group removeValueForProperty:kABGroupNameProperty], nil);
  STAssertFalse([group removeValueForProperty:kGTMABPersonLastNameProperty], nil);
  STAssertFalse([group setValue:nil forProperty:kABGroupNameProperty], nil);
  STAssertFalse([group setValue:[NSNumber numberWithInt:1]
                    forProperty:kABGroupNameProperty], nil);
  STAssertFalse([group setValue:@"Bart"
                    forProperty:kGTMABPersonBirthdayProperty], nil);

  ABPropertyType property = [GTMABGroup typeOfProperty:kABGroupNameProperty];
  STAssertEquals(property, (ABPropertyType)kGTMABStringPropertyType, nil);

  property = [GTMABGroup typeOfProperty:kGTMABPersonLastNameProperty];
  STAssertEquals(property, (ABPropertyType)kGTMABInvalidPropertyType, nil);

  NSString *string = [GTMABGroup localizedPropertyName:kABGroupNameProperty];
  STAssertEqualObjects(string, @"Name", nil);

  string = [GTMABGroup localizedPropertyName:kGTMABPersonLastNameProperty];
  STAssertEqualObjects(string, kGTMABUnknownPropertyName, nil);

  string = [GTMABGroup localizedPropertyName:kGTMABRecordInvalidID];
  STAssertEqualObjects(string, kGTMABUnknownPropertyName, nil);

  string = [group description];
  STAssertNotNil(string, nil);

  // Adding and removing members
  group = [GTMABGroup groupNamed:kGTMABTestGroupName];
  NSArray *members = [group members];
  STAssertEquals([members count], (NSUInteger)0, @"Members: %@", members);

  STAssertFalse([group addMember:nil], nil);

  members = [group members];
  STAssertEquals([members count], (NSUInteger)0, @"Members: %@", members);

  GTMABPerson *person = [GTMABPerson personWithFirstName:kGTMABTestFirstName
                                                lastName:kGTMABTestLastName];
  STAssertNotNil(person, nil);
  STAssertTrue([book_ addRecord:person], nil);
  STAssertTrue([book_ save], nil);
  STAssertTrue([book_ addRecord:group], nil);
  STAssertTrue([book_ save], nil);
  STAssertTrue([group addMember:person], nil);
  STAssertTrue([book_ save], nil);
  members = [group members];
  STAssertEquals([members count], (NSUInteger)1, @"Members: %@", members);
  STAssertTrue([group removeMember:person], nil);
  STAssertFalse([group removeMember:person], nil);
  STAssertFalse([group removeMember:nil], nil);
  STAssertTrue([book_ removeRecord:group], nil);
  STAssertTrue([book_ removeRecord:person], nil);
  STAssertTrue([book_ save], nil);
}


- (void)testMultiValues {
  STAssertThrows([[GTMABMultiValue alloc] init], nil);
  STAssertThrows([[GTMABMutableMultiValue alloc] init], nil);
  GTMABMultiValue *value = [[GTMABMultiValue alloc] initWithMultiValue:nil];
  STAssertNil(value, nil);
  GTMABMutableMultiValue *mutValue
    = [GTMABMutableMultiValue valueWithPropertyType:kGTMABInvalidPropertyType];
  STAssertNil(mutValue, nil);
  mutValue
    = [[[GTMABMutableMultiValue alloc]
        initWithMutableMultiValue:nil] autorelease];
  STAssertNil(mutValue, nil);
  mutValue
    = [[[GTMABMutableMultiValue alloc]
        initWithMultiValue:nil] autorelease];
  STAssertNil(mutValue, nil);
#if GTM_IPHONE_SDK
  // Only the IPhone version actually allows you to check types of a multivalue
  // before you stick anything in it
  const GTMABPropertyType types[] = {
    kGTMABStringPropertyType,
    kGTMABIntegerPropertyType,
    kGTMABRealPropertyType,
    kGTMABDateTimePropertyType,
    kGTMABDictionaryPropertyType,
    kGTMABMultiStringPropertyType,
    kGTMABMultiIntegerPropertyType,
    kGTMABMultiRealPropertyType,
    kGTMABMultiDateTimePropertyType,
    kGTMABMultiDictionaryPropertyType
  };
  for (size_t i = 0; i < sizeof(types) / sizeof(GTMABPropertyType); ++i) {
    mutValue = [GTMABMutableMultiValue valueWithPropertyType:types[i]];
    STAssertNotNil(mutValue, nil);
    // Oddly the Apple APIs allow you to create a mutable multi value with
    // either a property type of kABFooPropertyType or kABMultiFooPropertyType
    // and apparently you get back basically the same thing. However if you
    // ask a type that you created with kABMultiFooPropertyType for it's type
    // it returns just kABFooPropertyType.
    STAssertEquals([mutValue propertyType],
                   (GTMABPropertyType)(types[i] & ~kABMultiValueMask), nil);
  }
#endif  // GTM_IPHONE_SDK
  mutValue
    = [GTMABMutableMultiValue valueWithPropertyType:kGTMABStringPropertyType];
  STAssertNotNil(mutValue, nil);
  value = [[mutValue copy] autorelease];
  STAssertEqualObjects([value class], [GTMABMultiValue class], nil);
  mutValue = [[value mutableCopy] autorelease];
  STAssertEqualObjects([mutValue class], [GTMABMutableMultiValue class], nil);
  STAssertEquals([mutValue count], (NSUInteger)0, nil);
  STAssertNil([mutValue valueAtIndex:0], nil);
  STAssertNil([mutValue labelAtIndex:0], nil);
#if GTM_IPHONE_SDK
  STAssertEquals([mutValue identifierAtIndex:0],
                 kGTMABMultiValueInvalidIdentifier, nil);
  STAssertEquals([mutValue propertyType],
                 (GTMABPropertyType)kGTMABStringPropertyType, nil);
#else  // GTM_IPHONE_SDK
  STAssertEqualObjects([mutValue identifierAtIndex:0],
                       kGTMABMultiValueInvalidIdentifier, nil);
#endif  // GTM_IPHONE_SDK
  GTMABMultiValueIdentifier ident
    = [mutValue addValue:nil withLabel:(CFStringRef)kABHomeLabel];
#if GTM_IPHONE_SDK
  STAssertEquals(ident, kGTMABMultiValueInvalidIdentifier, nil);
#else  // GTM_IPHONE_SDK
  STAssertEqualObjects(ident, kGTMABMultiValueInvalidIdentifier, nil);
#endif  // GTM_IPHONE_SDK

  ident = [mutValue addValue:@"val1"
                   withLabel:nil];
#if GTM_IPHONE_SDK
  STAssertEquals(ident, kGTMABMultiValueInvalidIdentifier, nil);
#else  // GTM_IPHONE_SDK
  STAssertEqualObjects(ident, kGTMABMultiValueInvalidIdentifier, nil);
#endif  // GTM_IPHONE_SDK
  ident = [mutValue insertValue:@"val1"
                      withLabel:nil
                        atIndex:0];
#if GTM_IPHONE_SDK
  STAssertEquals(ident, kGTMABMultiValueInvalidIdentifier, nil);
#else  // GTM_IPHONE_SDK
  STAssertEqualObjects(ident, kGTMABMultiValueInvalidIdentifier, nil);
#endif  // GTM_IPHONE_SDK
  ident = [mutValue insertValue:nil
                      withLabel:(CFStringRef)kABHomeLabel
                        atIndex:0];
#if GTM_IPHONE_SDK
  STAssertEquals(ident, kGTMABMultiValueInvalidIdentifier, nil);
#else  // GTM_IPHONE_SDK
  STAssertEqualObjects(ident, kGTMABMultiValueInvalidIdentifier, nil);
#endif  // GTM_IPHONE_SDK
  ident = [mutValue addValue:@"val1"
                   withLabel:(CFStringRef)kABHomeLabel];
#if GTM_IPHONE_SDK
  STAssertNotEquals(ident, kGTMABMultiValueInvalidIdentifier, nil);
#else  // GTM_IPHONE_SDK
  STAssertNotEqualObjects(ident, kGTMABMultiValueInvalidIdentifier, nil);
#endif  // GTM_IPHONE_SDK
  GTMABMultiValueIdentifier identCheck = [mutValue identifierAtIndex:0];
#if GTM_IPHONE_SDK
  STAssertEquals(ident, identCheck, nil);
#else  // GTM_IPHONE_SDK
  STAssertEqualObjects(ident, identCheck, nil);
#endif  // GTM_IPHONE_SDK
  NSUInteger idx = [mutValue indexForIdentifier:ident];
  STAssertEquals(idx, (NSUInteger)0, nil);
  STAssertTrue([mutValue replaceLabelAtIndex:0
                                   withLabel:(CFStringRef)kABWorkLabel], nil);
  STAssertFalse([mutValue replaceLabelAtIndex:10
                                    withLabel:(CFStringRef)kABWorkLabel], nil);
  STAssertTrue([mutValue replaceValueAtIndex:0
                                   withValue:@"newVal1"], nil);
  STAssertFalse([mutValue replaceValueAtIndex:10
                                    withValue:@"newVal1"], nil);

  STAssertEqualObjects([mutValue valueForIdentifier:ident], @"newVal1", nil);
  STAssertEqualObjects([mutValue labelForIdentifier:ident],
                       (NSString *)kABWorkLabel, nil);

  GTMABMultiValueIdentifier ident2
    = [mutValue insertValue:@"val2"
                  withLabel:(CFStringRef)kABOtherLabel
                    atIndex:0];
  STAssertNotEquals(ident2, kGTMABMultiValueInvalidIdentifier, nil);
  STAssertNotEquals(ident2, ident, nil);
  GTMABMultiValueIdentifier ident3
    = [mutValue insertValue:@"val3"
                  withLabel:(CFStringRef)kGTMABPersonPhoneMainLabel
                    atIndex:10];
#if GTM_IPHONE_SDK
  STAssertEquals(ident3, kGTMABMultiValueInvalidIdentifier, nil);
#else  // GTM_IPHONE_SDK
  STAssertEqualObjects(ident3, kGTMABMultiValueInvalidIdentifier, nil);
#endif  // GTM_IPHONE_SDK
  NSUInteger idx3 = [mutValue indexForIdentifier:ident3];
  STAssertEquals(idx3, (NSUInteger)NSNotFound, nil);
  STAssertTrue([mutValue removeValueAndLabelAtIndex:1], nil);
  STAssertFalse([mutValue removeValueAndLabelAtIndex:1], nil);

  NSUInteger idx4
    = [mutValue indexForIdentifier:kGTMABMultiValueInvalidIdentifier];
  STAssertEquals(idx4, (NSUInteger)NSNotFound, nil);

  STAssertNotNULL([mutValue multiValueRef], nil);

  // Enumerator test
  mutValue
    = [GTMABMutableMultiValue valueWithPropertyType:kGTMABIntegerPropertyType];
  STAssertNotNil(mutValue, nil);
  for (int i = 0; i < 100; i++) {
    NSString *label = [NSString stringWithFormat:@"label %d", i];
    NSNumber *val = [NSNumber numberWithInt:i];
    STAssertNotEquals([mutValue addValue:val
                               withLabel:(CFStringRef)label],
                      kGTMABMultiValueInvalidIdentifier, nil);
  }
  int count = 0;
  NSString *label;
  GTM_FOREACH_ENUMEREE(label, [mutValue labelEnumerator]) {
    NSString *testLabel = [NSString stringWithFormat:@"label %d", count++];
    STAssertEqualObjects(label, testLabel, nil);
  }
  count = 0;
  value = [[mutValue copy] autorelease];
  NSNumber *val;
  GTM_FOREACH_ENUMEREE(val, [value valueEnumerator]) {
    STAssertEqualObjects(val, [NSNumber numberWithInt:count++], nil);
  }

  // Test messing with the values while we're enumerating them
  NSEnumerator *labelEnum = [mutValue labelEnumerator];
  NSEnumerator *valueEnum = [mutValue valueEnumerator];
  STAssertNotNil(labelEnum, nil);
  STAssertNotNil(valueEnum, nil);
  STAssertNotNil([labelEnum nextObject], nil);
  STAssertNotNil([valueEnum nextObject], nil);
  STAssertTrue([mutValue removeValueAndLabelAtIndex:0], nil);
  STAssertThrows([labelEnum nextObject], nil);
  STAssertThrows([valueEnum nextObject], nil);

  // Test messing with the values while we're fast enumerating them
  // Should throw an exception on the second access.
   BOOL exceptionThrown = NO;
  // Start at one because we removed index 0 above.
  count = 1;
  @try {
    GTM_FOREACH_ENUMEREE(label, [mutValue labelEnumerator]) {
      NSString *testLabel = [NSString stringWithFormat:@"label %d", count++];
      STAssertEqualObjects(label, testLabel, nil);
      STAssertTrue([mutValue removeValueAndLabelAtIndex:50], nil);
    }
  } @catch(NSException *e) {
    STAssertEqualObjects([e name], NSGenericException, @"Got %@ instead", e);
    STAssertEquals(count, 2,
                   @"Should have caught it on the second access");
    exceptionThrown = YES;
  }  // COV_NF_LINE - because we always catch, this brace doesn't get exec'd
  STAssertTrue(exceptionThrown, @"We should have thrown an exception"
               @" because the values under the enumerator were modified");

}

#if GTM_IPHONE_SDK
- (void)testRadar6208390 {
  GTMABPropertyType types[] = {
    kGTMABStringPropertyType,
    kGTMABIntegerPropertyType,
    kGTMABRealPropertyType,
    kGTMABDateTimePropertyType,
    kGTMABDictionaryPropertyType
  };
  for (size_t j = 0; j < sizeof(types) / sizeof(ABPropertyType); ++j) {
    ABPropertyType type = types[j];
#ifdef GTM_IPHONE_SDK
    ABMultiValueRef ref = ABMultiValueCreateMutable(type);
#else  // GTM_IPHONE_SDK
    ABMutableMultiValueRef ref = ABMultiValueCreateMutable();
#endif  // GTM_IPHONE_SDK
    STAssertNotNULL(ref, nil);
    NSString *label = [[NSString alloc] initWithString:@"label"];
    STAssertNotNil(label, nil);
    id val = nil;
    if (type == kGTMABDictionaryPropertyType) {
      val = [[NSDictionary alloc] initWithObjectsAndKeys:@"1", @"1", nil];
    } else if (type == kGTMABStringPropertyType) {
      val = [[NSString alloc] initWithFormat:@"value %d"];
    } else if (type == kGTMABIntegerPropertyType
               || type == kGTMABRealPropertyType ) {
      val = [[NSNumber alloc] initWithInt:143];
    } else if (type == kGTMABDateTimePropertyType) {
      val = [[NSDate alloc] init];
    }
    STAssertNotNil(val,
                   @"Testing type %d, %@", type, val);
    NSUInteger firstRetainCount = [val retainCount];
    STAssertNotEquals(firstRetainCount,
                      (NSUInteger)0,
                      @"Testing type %d, %@", type, val);

    GTMABMultiValueIdentifier identifier;
    STAssertTrue(ABMultiValueAddValueAndLabel(ref,
                                              val,
                                              (CFStringRef)label,
                                              &identifier),
                 @"Testing type %d, %@", type, val);
    NSUInteger secondRetainCount = [val retainCount];
    STAssertEquals(firstRetainCount + 1,
                   secondRetainCount,
                   @"Testing type %d, %@", type, val);
    [label release];
    [val release];
    NSUInteger thirdRetainCount = [val retainCount];
    STAssertEquals(firstRetainCount,
                   thirdRetainCount,
                   @"Testing type %d, %@", type, val);

    id oldVal = val;
    val = (id)ABMultiValueCopyValueAtIndex(ref, 0);
    NSUInteger fourthRetainCount = [val retainCount];

    // kABDictionaryPropertyTypes appear to do an actual copy, so the retain
    // count checking trick won't work. We only check the retain count if
    // we didn't get a new version.
    if (val == oldVal) {
      if (type == kGTMABIntegerPropertyType
          || type == kGTMABRealPropertyType) {
        // We are verifying that yes indeed 6208390 is still broken
        STAssertEquals(fourthRetainCount,
                       thirdRetainCount,
                       @"Testing type %d, %@. If you see this error it may "
                       @"be time to update the code to change retain behaviors"
                       @"with this os version", type, val);
      } else {
        STAssertEquals(fourthRetainCount,
                       thirdRetainCount + 1,
                       @"Testing type %d, %@", type, val);
        [val release];
      }
    } else {
      [val release];
    }
    CFRelease(ref);
  }
}

// Globals used by testRadar6240394.
static GTMABPropertyID gGTMTestID;
static const GTMABPropertyID *gGTMTestIDPtr;

void __attribute__((constructor))SetUpIDForTestRadar6240394(void) {
  // These must be set up BEFORE ABAddressBookCreate is called.
  gGTMTestID = kGTMABPersonLastNameProperty;
  gGTMTestIDPtr = &kGTMABPersonLastNameProperty;
}

- (void)testRadar6240394 {
  // As of iPhone SDK 2.1, the property IDs aren't initialized until
  // ABAddressBookCreate is actually called. They will return zero until
  // then. Logged as radar 6240394.
  STAssertEquals(gGTMTestID, 0, @"If this isn't zero, Apple has fixed 6240394");
  (void)ABAddressBookCreate();
  STAssertEquals(*gGTMTestIDPtr, kGTMABPersonLastNameProperty,
                 @"If this doesn't work, something else has broken");
}

#endif  // GTM_IPHONE_SDK
@end
