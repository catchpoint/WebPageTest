//
//  GTMABAddressBook.h
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

// These classes wrap up the iPhone AddressBook 'C' API in a manner very
// similar to that found on Mac OS X. They differ only in that none of these
// routines throws, and some of the types are different as necessitated by
// the APIs that they wrap. These wrappers also protect you from a number
// of issues in the AddressBook API (as of iPhone SDK 2.0/2.1)
//
// Note that there is a strings file that you may want to localize
// (GTMABAddressBook.strings).
//
// If things seem strange, it may be due to one of the following radars:
// 6240394 AddressBook framework constants not initialized until
//         ABCreateAddressBook called
//         -- CLOSED as designed
// 6208390 Integer and real values don't work in ABMultiValueRefs
//         (and this isn't part of the title, but dictionaries don't work
//         either)
// 6207605 RecordIDs for people and groups are not unique in AddressBook
//         -- CLOSED as designed
// 6204021 kABGroupNameProperty and kABPersonFirstNameProperty have the same
//         value
// 6203982 ABPersonCopyLocalizedPropertyName returns name for
//         kABGroupNameProperty
// 6203961 ABPersonGetTypeOfProperty returns a type for kABGroupNameProperty
// 6203854 ABMultiValues hash to their address
// 6203836 ABRecords hash to their address
//         -- CLOSED behaves correctly
// 6203606 Need CFTypeIDs for AddressBook CFTypes
// 6202868 ABPersonSetImageData should validate image data
// 6202860 Passing nil person into ABGroupAddMember crashes
//         -- CLOSED behaves correctly
// 6202827 Passing nil info ABMultiValueAddValueAndLabel causes crash
//         -- CLOSED behaves correctly
// 6202807 ABMultiValueInsertValueAndLabelAtIndex allows you to insert values
//         past end
// 6201276 Removing a NULL record using ABAddressBookRemoveRecord crashes
//         -- CLOSED behaves correctly
// 6201258 Adding a NULL record using ABAddressBookAddRecord crashes
//         -- CLOSED behaves correctly
// 6201046 ABRecordSetValue returns true even if you pass in a bad type for a
//         value
// 6201005 ABRecordRemoveValue returns true for value that aren't in the record
//         -- CLOSED behaves correctly
// 6200703 ABAddressBookAddRecord doesn't add an item to the people array until
//         it's saved
// 6200638 ABAddressBookHasUnsavedChanges doesn't work
//         -- CLOSED fixed in iOS 3.2

#import "GTMDefines.h"
#import <Foundation/Foundation.h>

#if GTM_IPHONE_SDK
#import <AddressBook/AddressBook.h>
@class UIImage;
#else  // GTM_IPHONE_SDK
#import <AddressBook/AddressBook.h>
#import <AddressBook/ABAddressBookC.h>
@class NSImage;
#endif  // GTM_IPHONE_SDK

@class GTMABPerson;
@class GTMABGroup;
@class GTMABRecord;

GTM_EXTERN NSString *const kGTMABUnknownPropertyName;

#if GTM_IPHONE_SDK

@class UIImage;
typedef ABRecordID GTMABRecordID;
typedef ABPropertyID GTMABPropertyID;
typedef UIImage GTMABImage;
typedef ABPersonCompositeNameFormat GTMABPersonCompositeNameFormat;
typedef ABMultiValueIdentifier GTMABMultiValueIdentifier;
 enum _GTMABPropertyType {
  kGTMABInvalidPropertyType         = kABInvalidPropertyType,
  kGTMABStringPropertyType          = kABStringPropertyType,
  kGTMABIntegerPropertyType         = kABIntegerPropertyType,
  kGTMABRealPropertyType            = kABRealPropertyType,
  kGTMABDateTimePropertyType        = kABDateTimePropertyType,
  kGTMABDictionaryPropertyType      = kABDictionaryPropertyType,
  kGTMABMultiStringPropertyType     = kABMultiStringPropertyType,
  kGTMABMultiIntegerPropertyType    = kABMultiIntegerPropertyType,
  kGTMABMultiRealPropertyType       = kABMultiRealPropertyType,
  kGTMABMultiDateTimePropertyType   = kABMultiDateTimePropertyType,
  kGTMABMultiDictionaryPropertyType = kABMultiDictionaryPropertyType,
};
typedef CFIndex GTMABPropertyType;
#define kGTMABPersonFirstNameProperty kABPersonFirstNameProperty
#define kGTMABPersonLastNameProperty kABPersonLastNameProperty
#define kGTMABPersonBirthdayProperty kABPersonBirthdayProperty
#define kGTMABPersonPhoneProperty kABPersonPhoneProperty
#define kGTMABGroupNameProperty kABGroupNameProperty

#define kGTMABPersonPhoneMainLabel ((NSString *)kABPersonPhoneMainLabel)
#define kGTMABPersonPhoneMobileLabel ((NSString *)kABPersonPhoneMobileLabel)
#define kGTMABPersonPhoneHomeLabel ((NSString *)kABHomeLabel)
#define kGTMABPersonPhoneWorkLabel ((NSString *)kABWorkLabel)
#define kGTMABPersonPhoneWorkFaxLabel ((NSString *)kABPersonPhoneWorkFAXLabel)
#define kGTMABPersonPhoneHomeFaxLabel ((NSString *)kABPersonPhoneHomeFAXLabel)
#define kGTMABPersonPhonePagerLabel ((NSString *)kABPersonPhonePagerLabel)

#define kGTMABOtherLabel ((NSString *)kABOtherLabel)

#define kGTMABMultiValueInvalidIdentifier kABMultiValueInvalidIdentifier
#define kGTMABRecordInvalidID kABRecordInvalidID

#else  // GTM_IPHONE_SDK

@class NSImage;
typedef NSString* GTMABRecordID;
typedef NSString* GTMABPropertyID;
typedef NSString* GTMABMultiValueIdentifier;
typedef NSImage GTMABImage;
typedef uint32_t GTMABPersonCompositeNameFormat;
enum  {
  kABPersonCompositeNameFormatFirstNameFirst = 0,
  kABPersonCompositeNameFormatLastNameFirst  = 1
};
enum _GTMABPropertyType {
  kGTMABInvalidPropertyType         = kABErrorInProperty,
  kGTMABStringPropertyType          = kABStringProperty,
  kGTMABIntegerPropertyType         = kABIntegerProperty,
  kGTMABRealPropertyType            = kABRealProperty,
  kGTMABDateTimePropertyType        = kABDateProperty,
  kGTMABDictionaryPropertyType      = kABDictionaryProperty,
  kGTMABMultiStringPropertyType     = kABMultiStringProperty,
  kGTMABMultiIntegerPropertyType    = kABMultiIntegerProperty,
  kGTMABMultiRealPropertyType       = kABMultiRealProperty,
  kGTMABMultiDateTimePropertyType   = kABMultiDateProperty,
  kGTMABMultiDictionaryPropertyType = kABMultiDictionaryProperty,
};
typedef CFIndex GTMABPropertyType;
#define kGTMABPersonFirstNameProperty kABFirstNameProperty
#define kGTMABPersonLastNameProperty kABLastNameProperty
#define kGTMABPersonBirthdayProperty kABBirthdayProperty
#define kGTMABPersonPhoneProperty kABPhoneProperty
#define kGTMABGroupNameProperty kABGroupNameProperty

#define kGTMABPersonPhoneMainLabel kABPhoneMainLabel
#define kGTMABPersonPhoneMobileLabel kABPhoneMobileLabel
#define kGTMABPersonPhoneHomeLabel kABPhoneHomeLabel
#define kGTMABPersonPhoneWorkLabel kABPhoneWorkLabel
#define kGTMABPersonPhoneWorkFaxLabel kABPhoneWorkFAXLabel
#define kGTMABPersonPhoneHomeFaxLabel kABPhoneHomeFAXLabel
#define kGTMABPersonPhonePagerLabel kABPhonePagerLabel

#define kGTMABOtherLabel kABOtherLabel

#define kGTMABMultiValueInvalidIdentifier @"ABMultiValueInvalidIdentifier"
#define kGTMABRecordInvalidID @"ABRecordInvalidID"
extern NSString* const kABPersonRecordType;
extern NSString* const kABGroupRecordType;

#endif  // GTM_IPHONE_SDK

// Wrapper for an AddressBook on iPhone
@interface GTMABAddressBook : NSObject {
 @private
  ABAddressBookRef addressBook_;
}

// Returns a new instance of an address book.
+ (GTMABAddressBook *)addressBook;

// Return the address book reference
- (ABAddressBookRef)addressBookRef;

// Saves changes made since the last save
// Return YES if successful (or there was no change)
- (BOOL)save;

// Returns YES if there are unsaved changes
// The unsaved changes flag is automatically set when changes are made
// As of iPhone 2.1, this does not work, and will always return NO.
// Radar 6200638: ABAddressBookHasUnsavedChanges doesn't work
- (BOOL)hasUnsavedChanges;

// Returns a GTMABPerson matching an ID
// Returns nil if the record could not be found
- (GTMABPerson *)personForId:(GTMABRecordID)uniqueId;

// Returns a GTMABGroup matching an ID
// Returns nil if the record could not be found
- (GTMABGroup *)groupForId:(GTMABRecordID)uniqueId;

// Adds a record (ABPerson or ABGroup) to the AddressBook database
// Be sure to read notes for -people and -group.
- (BOOL)addRecord:(GTMABRecord *)record;

// Removes a record (ABPerson or ABGroup) from the AddressBook database
- (BOOL)removeRecord:(GTMABRecord *)record;

// Returns an array (GTMABPerson) of all the people in the AddressBook database
// As of iPhone 2.1, this array will not contain new entries until you save
// the address book.
// Radar 6200703: ABAddressBookAddRecord doesn't add an item to the people array
//                until it's saved
- (NSArray *)people;

// Returns an array of all the groups (GTMABGroup) in the AddressBook database
// As of iPhone 2.1, this array will not contain new entries until you save
// the address book.
// Radar 6200703: ABAddressBookAddRecord doesn't add an item to the people array
//                until it's saved
- (NSArray *)groups;

// Performs a prefix search on the composite names of people in an address book
// and returns an array of persons that match the search criteria.
// Ignores case.
- (NSArray *)peopleWithCompositeNameWithPrefix:(NSString *)prefix;

// Performs a prefix search on the composite names of groups in an address book
// and returns an array of groups that match the search criteria.
// Ignores case.
- (NSArray *)groupsWithCompositeNameWithPrefix:(NSString *)prefix;

// Returns a localized name for a given label
+ (NSString *)localizedLabel:(NSString *)label;

@end

// Wrapper for a ABRecord on iPhone.
// A abstract class. Instantiate one of the concrete subclasses, GTMABPerson or
// GTMABGroup.
@interface GTMABRecord : NSObject {
 @private
  ABRecordRef record_;
}

// Create a record with a recordRef.
// Since GTMABRecord is an abstract base class, attempting to create one
// of these directly will throw an exception. Use with one of the concrete
// subclasses.
+ (id)recordWithRecord:(ABRecordRef)record;

// Designated initializer
// Since GTMABRecord is an abstract base class, attempting to create one
// of these directly will throw an exception. Use with one of the concrete
// subclasses.
- (id)initWithRecord:(ABRecordRef)record;

// Return our recordRef
- (ABRecordRef)recordRef;

// Return the recordID for the record
- (GTMABRecordID)recordID;

// Returns the value of a given property.
// The type of the value depends on the property type.
- (id)valueForProperty:(GTMABPropertyID)property;

// Set the value of a given property.
// The type of the value must match the property type.
// Returns YES if value set properly
- (BOOL)setValue:(id)value forProperty:(GTMABPropertyID)property;

// Removes the value for the property
// Returns yes if value removed
- (BOOL)removeValueForProperty:(GTMABPropertyID)property;

// returns a human friendly name for the record
- (NSString *)compositeName;

// returns the type of a property
+ (GTMABPropertyType)typeOfProperty:(GTMABPropertyID)property;

// returns a human friendly localized name for a property
+ (NSString *)localizedPropertyName:(GTMABPropertyID)property;
@end

// Wrapper for an ABPerson on iPhone
@interface GTMABPerson : GTMABRecord

// Creates a person with a first name and a last name.
+ (GTMABPerson *)personWithFirstName:(NSString *)first
                            lastName:(NSString *)last;

// Sets image data for a person. Data must be to a block of data that
// will create a valid GTMABImage.
- (BOOL)setImageData:(NSData *)data;

// Returns the image data.
- (NSData *)imageData;

// Returns the image for a person
- (GTMABImage *)image;

// Sets a the image for a person
- (BOOL)setImage:(GTMABImage *)image;

// Returns the format in with names are composited
+ (GTMABPersonCompositeNameFormat)compositeNameFormat;
@end

// Wrapper for a ABGroup on iPhone
@interface GTMABGroup : GTMABRecord
// Create a new group named |name|
+ (GTMABGroup *)groupNamed:(NSString *)name;

// Return an array of members (GTMABPerson)
- (NSArray *)members;

// Add a member to a group
- (BOOL)addMember:(GTMABPerson *)person;

// Remove a member from a group
- (BOOL)removeMember:(GTMABPerson *)person;
@end

// GTMABMultiValue does not support NSFastEnumeration because in
// the Apple frameworks it returns identifiers which are already NSStrings.
// In our case identifiers aren't NS types, and it doesn't make sense
// to convert them to NSNumbers just to convert them back so you can
// actually get at the values and labels.
// Instead we supply valueEnumerator and labelEnumerator which you can
// fast enumerate on to get values and labels directly.
@interface GTMABMultiValue : NSObject <NSCopying, NSMutableCopying> {
 @protected
  ABMultiValueRef multiValue_;
}

// Create a multi value
- (id)initWithMultiValue:(ABMultiValueRef)multiValue;

// return it's ref
- (ABMultiValueRef)multiValueRef;

// Returns the number of value/label pairs
- (NSUInteger)count;

// Returns a value at a given index
// Returns nil if index is out of bounds
- (id)valueAtIndex:(NSUInteger)idx;

// Returns a label at a given index
// Returns nil if index is out of bounds
- (NSString *)labelAtIndex:(NSUInteger)idx;

// Returns an identifier at a given index
// Returns kABMultiValueInvalidIdentifier if index is out of bounds
- (GTMABMultiValueIdentifier)identifierAtIndex:(NSUInteger)idx;

// Returns the index of a given identifier
// Returns NSNotFound if not found
- (NSUInteger)indexForIdentifier:(GTMABMultiValueIdentifier)identifier;

// Type of the contents of this multivalue
- (GTMABPropertyType)propertyType;

// Returns the value for a given identifier
// Returns nil if the identifier is not found
- (id)valueForIdentifier:(GTMABMultiValueIdentifier)identifier;

// Returns the value for a given identifier
// Returns nil if the identifier is not found
- (NSString *)labelForIdentifier:(GTMABMultiValueIdentifier)identifier;

// Returns an enumerator for enumerating through values
- (NSEnumerator *)valueEnumerator;

// Returns an enumerator for enumerating through labels
- (NSEnumerator *)labelEnumerator;

@end

@interface GTMABMutableMultiValue : GTMABMultiValue {
 @private
  // Use unsigned long here instead of NSUInteger because that's what
  // NSFastEnumeration Protocol wants currently (iPhone 2.1)
  unsigned long mutations_;
}

// Create a new mutable multivalue with a given type
+ (id)valueWithPropertyType:(GTMABPropertyType)type;

// Create a new mutable multivalue with a given type
- (id)initWithPropertyType:(GTMABPropertyType)type;

// Create a new mutable multivalue based on |multiValue|
- (id)initWithMutableMultiValue:(ABMutableMultiValueRef)multiValue;

// Adds a value with its label
// Returns the identifier if successful, kABMultiValueInvalidIdentifier
// otherwise.
- (GTMABMultiValueIdentifier)addValue:(id)value withLabel:(CFStringRef)label;

// Insert a value/label pair at a given index
// Returns the identifier if successful. kABMultiValueInvalidIdentifier
// otherwise
// If index is out of bounds, returns kABMultiValueInvalidIdentifier.
- (GTMABMultiValueIdentifier)insertValue:(id)value
                               withLabel:(CFStringRef)label
                                 atIndex:(NSUInteger)index;

// Removes a value/label pair at a given index
// Returns NO if index out of bounds
- (BOOL)removeValueAndLabelAtIndex:(NSUInteger)index;

// Replaces a value at a given index
// Returns NO if index out of bounds
- (BOOL)replaceValueAtIndex:(NSUInteger)index withValue:(id)value;

// Replaces a label at a given index
// Returns NO if index out of bounds
- (BOOL)replaceLabelAtIndex:(NSUInteger)index withLabel:(CFStringRef)label;

@end
