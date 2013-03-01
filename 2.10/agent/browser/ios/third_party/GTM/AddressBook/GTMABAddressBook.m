//
//  GTMAddressBook.m
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

#import "GTMABAddressBook.h"
#import "GTMGarbageCollection.h"
#import "GTMTypeCasting.h"

#if GTM_IPHONE_SDK
#import <UIKit/UIKit.h>
#else  // GTM_IPHONE_SDK
#import <Cocoa/Cocoa.h>
#endif  // GTM_IPHONE_SDK

#if MAC_OS_X_VERSION_MAX_ALLOWED < MAC_OS_X_VERSION_10_5
// Tiger does not have this functionality, so we just set them to 0
// as they are "or'd" in. This does change the functionality slightly.
enum {
  NSDiacriticInsensitiveSearch = 0,
  NSWidthInsensitiveSearch = 0
};
#endif

NSString *const kGTMABUnknownPropertyName = @"UNKNOWN_PROPERTY";

typedef struct {
  GTMABPropertyType pType;
  Class class;
} TypeClassNameMap;

@interface GTMABMultiValue ()
- (unsigned long*)mutations;
@end

@interface GTMABMutableMultiValue ()
// Checks to see if a value is a valid type to be stored in this multivalue
- (BOOL)checkValueType:(id)value;
@end

@interface GTMABMultiValueEnumerator : NSEnumerator {
 @private
  __weak ABMultiValueRef ref_;  // ref_ cached from enumeree_
  GTMABMultiValue *enumeree_;
  unsigned long mutations_;
  NSUInteger count_;
  NSUInteger index_;
  BOOL useLabels_;
}
+ (id)valueEnumeratorFor:(GTMABMultiValue*)enumeree;
+ (id)labelEnumeratorFor:(GTMABMultiValue*)enumeree;
- (id)initWithEnumeree:(GTMABMultiValue*)enumeree useLabels:(BOOL)useLabels;
#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
- (NSUInteger)countByEnumeratingWithState:(NSFastEnumerationState *)state 
                                  objects:(id *)stackbuf 
                                    count:(NSUInteger)len;
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
@end

@implementation GTMABAddressBook
+ (GTMABAddressBook *)addressBook {
  return [[[self alloc] init] autorelease];
}

- (id)init {
  if ((self = [super init])) {
#if GTM_IPHONE_SDK
    addressBook_ = ABAddressBookCreate();
#else  // GTM_IPHONE_SDK
    addressBook_ = ABGetSharedAddressBook();
    CFRetain(addressBook_);
#endif  // GTM_IPHONE_SDK
    if (!addressBook_) {
      // COV_NF_START
      [self release];
      self = nil;
      // COV_NF_END
    }
  }
  return self;
}

- (void)dealloc {
  if (addressBook_) {
    CFRelease(addressBook_);
  }
  [super dealloc];
}

- (BOOL)save {
#if GTM_IPHONE_SDK
  CFErrorRef cfError = NULL;
  bool wasGood = ABAddressBookSave(addressBook_, &cfError);
  if (!wasGood) {
    _GTMDevLog(@"Error in [%@ %@]: %@", 
               [self class], NSStringFromSelector(_cmd), cfError);
    CFRelease(cfError);
  }
#else  // GTM_IPHONE_SDK
  bool wasGood = ABSave(addressBook_);
#endif  // GTM_IPHONE_SDK
  return wasGood ? YES : NO;
}

- (BOOL)hasUnsavedChanges {
  bool hasUnsavedChanges;
#if GTM_IPHONE_SDK
  hasUnsavedChanges = ABAddressBookHasUnsavedChanges(addressBook_);
#else  // GTM_IPHONE_SDK
  hasUnsavedChanges = ABHasUnsavedChanges(addressBook_);
#endif  // GTM_IPHONE_SDK
  return hasUnsavedChanges ? YES : NO;
}

- (BOOL)addRecord:(GTMABRecord *)record {
  // Note: we check for bad data here because of radar
  // 6201258 Adding a NULL record using ABAddressBookAddRecord crashes
  if (!record) return NO;
#if GTM_IPHONE_SDK
  CFErrorRef cfError = NULL;
  bool wasGood = ABAddressBookAddRecord(addressBook_, 
                                        [record recordRef], &cfError);
  if (cfError) {
    // COV_NF_START
    _GTMDevLog(@"Error in [%@ %@]: %@", 
               [self class], NSStringFromSelector(_cmd), cfError);
    CFRelease(cfError);  
    // COV_NF_END
  }
#else  // GTM_IPHONE_SDK
  bool wasGood = ABAddRecord(addressBook_, [record recordRef]);
#endif  // GTM_IPHONE_SDK
  return wasGood ? YES : NO;
}

- (BOOL)removeRecord:(GTMABRecord *)record {
  // Note: we check for bad data here because of radar
  // 6201276 Removing a NULL record using ABAddressBookRemoveRecord crashes
  if (!record) return NO;
#if GTM_IPHONE_SDK
  CFErrorRef cfError = NULL;
  bool wasGood = ABAddressBookRemoveRecord(addressBook_, 
                                           [record recordRef], &cfError);
  if (cfError) {
    // COV_NF_START
    _GTMDevLog(@"Error in [%@ %@]: %@", 
               [self class], NSStringFromSelector(_cmd), cfError);
    CFRelease(cfError);
    // COV_NF_END
  }
#else  // GTM_IPHONE_SDK
  GTMABRecordID recID = [record recordID];
  ABRecordRef ref = ABCopyRecordForUniqueId(addressBook_, (CFStringRef)recID);
  bool wasGood = NO;
  if (ref) {
    wasGood = ABRemoveRecord(addressBook_, [record recordRef]);
    CFRelease(ref);
  }
#endif  // GTM_IPHONE_SDK
  return wasGood ? YES : NO;
}  

- (NSArray *)people {
#if GTM_IPHONE_SDK
  NSArray *people 
    = GTMCFAutorelease(ABAddressBookCopyArrayOfAllPeople(addressBook_));
#else  // GTM_IPHONE_SDK
  NSArray *people 
    = GTMCFAutorelease(ABCopyArrayOfAllPeople(addressBook_));
#endif  // GTM_IPHONE_SDK  
  NSMutableArray *result = [NSMutableArray arrayWithCapacity:[people count]];
  id person;
  GTM_FOREACH_OBJECT(person, people) {
    [result addObject:[GTMABPerson recordWithRecord:person]];
  }
  return result;
}

- (NSArray *)groups {
#if GTM_IPHONE_SDK
  NSArray *groups 
    = GTMCFAutorelease(ABAddressBookCopyArrayOfAllGroups(addressBook_));
#else  // GTM_IPHONE_SDK
  NSArray *groups 
    = GTMCFAutorelease(ABCopyArrayOfAllGroups(addressBook_));
#endif  // GTM_IPHONE_SDK  
  NSMutableArray *result = [NSMutableArray arrayWithCapacity:[groups count]];
  id group;
  GTM_FOREACH_OBJECT(group, groups) {
    [result addObject:[GTMABGroup recordWithRecord:group]];
  }
  return result;
}

- (ABAddressBookRef)addressBookRef {
  return addressBook_;
}

- (GTMABPerson *)personForId:(GTMABRecordID)uniqueId {
  GTMABPerson *person = nil;
#if GTM_IPHONE_SDK
  ABRecordRef ref = ABAddressBookGetPersonWithRecordID(addressBook_, uniqueId);
#else  // GTM_IPHONE_SDK
  ABRecordRef ref = ABCopyRecordForUniqueId(addressBook_, 
                                            (CFStringRef)uniqueId);
#endif  // GTM_IPHONE_SDK
  if (ref) {
    person = [GTMABPerson recordWithRecord:ref];
  }
  return person;
}

- (GTMABGroup *)groupForId:(GTMABRecordID)uniqueId {
  GTMABGroup *group = nil;
#if GTM_IPHONE_SDK
  ABRecordRef ref = ABAddressBookGetGroupWithRecordID(addressBook_, uniqueId);
#else  // GTM_IPHONE_SDK
  ABRecordRef ref = ABCopyRecordForUniqueId(addressBook_, 
                                            (CFStringRef)uniqueId);
#endif  // GTM_IPHONE_SDK
  if (ref) {
    group = [GTMABGroup recordWithRecord:ref];
  }
  return group;
}

// Performs a prefix search on the composite names of people in an address book 
// and returns an array of persons that match the search criteria.
- (NSArray *)peopleWithCompositeNameWithPrefix:(NSString *)prefix {
#if GTM_IPHONE_SDK
  NSArray *people = 
    GTMCFAutorelease(ABAddressBookCopyPeopleWithName(addressBook_,
                                                     (CFStringRef)prefix));
  NSMutableArray *gtmPeople = [NSMutableArray arrayWithCapacity:[people count]];
  id person;
  GTM_FOREACH_OBJECT(person, people) {
    GTMABPerson *gtmPerson = [GTMABPerson recordWithRecord:person];
    [gtmPeople addObject:gtmPerson];
  }
  return gtmPeople;
#else
  // TODO(dmaclach): Change over to recordsMatchingSearchElement as an
  // optimization?
  // TODO(dmaclach): Make this match the way that the iPhone does it (by
  // checking both first and last names) and adding unittests for all this.
  NSArray *people = [self people];
  NSMutableArray *foundPeople = [NSMutableArray array];
  GTMABPerson *person;
  GTM_FOREACH_OBJECT(person, people) {
    NSString *compositeName = [person compositeName];
    NSRange range = [compositeName rangeOfString:prefix
                                         options:(NSCaseInsensitiveSearch 
                                                  | NSDiacriticInsensitiveSearch
                                                  | NSWidthInsensitiveSearch
                                                  | NSAnchoredSearch)];
    if (range.location != NSNotFound) {
      [foundPeople addObject:person];
    }
  }
  return foundPeople;
#endif
}

// Performs a prefix search on the composite names of groups in an address book 
// and returns an array of groups that match the search criteria.
- (NSArray *)groupsWithCompositeNameWithPrefix:(NSString *)prefix {
  NSArray *groups = [self groups];
  NSMutableArray *foundGroups = [NSMutableArray array];
  GTMABGroup *group;
  GTM_FOREACH_OBJECT(group, groups) {
    NSString *compositeName = [group compositeName];
    NSRange range = [compositeName rangeOfString:prefix
                                         options:(NSCaseInsensitiveSearch 
                                                  | NSDiacriticInsensitiveSearch
                                                  | NSWidthInsensitiveSearch
                                                  | NSAnchoredSearch)];
    if (range.location != NSNotFound) {
      [foundGroups addObject:group];
    }
  }
  return foundGroups;
}  

+ (NSString *)localizedLabel:(NSString *)label {
#if GTM_IPHONE_SDK
  return GTMCFAutorelease(ABAddressBookCopyLocalizedLabel((CFStringRef)label));
#else  // GTM_IPHONE_SDK
  return GTMCFAutorelease(ABCopyLocalizedPropertyOrLabel((CFStringRef)label));
#endif  // GTM_IPHONE_SDK
}

@end

@implementation GTMABRecord
+ (id)recordWithRecord:(ABRecordRef)record {
  return [[[self alloc] initWithRecord:record] autorelease];
}

- (id)initWithRecord:(ABRecordRef)record {
  if ((self = [super init])) {
    if ([self class] == [GTMABRecord class]) {
      [self autorelease];
      [self doesNotRecognizeSelector:_cmd];
    }
    if (!record) {
      [self release];
      self = nil;
    } else {
      record_ = (ABRecordRef)CFRetain(record);
    }
  }
  return self;
}

- (NSUInteger)hash {
  // This really isn't completely valid due to
  // 6203836 ABRecords hash to their address
  // but it's the best we can do without knowing what properties
  // are in a record, and we don't have an API for that.
  return CFHash(record_);
}

- (BOOL)isEqual:(id)object {
  // This really isn't completely valid due to
  // 6203836 ABRecords hash to their address
  // but it's the best we can do without knowing what properties
  // are in a record, and we don't have an API for that.
  return [object respondsToSelector:@selector(recordRef)] 
    && CFEqual(record_, [object recordRef]);
}

- (void)dealloc {
  if (record_) {
    CFRelease(record_);
  }
  [super dealloc];
}

- (ABRecordRef)recordRef {
  return record_;
}

- (GTMABRecordID)recordID {
#if GTM_IPHONE_SDK
  return ABRecordGetRecordID(record_);
#else  // GTM_IPHONE_SDK
  return GTMCFAutorelease(ABRecordCopyUniqueId(record_));
#endif  // GTM_IPHONE_SDK
}

- (id)valueForProperty:(GTMABPropertyID)property {
#ifdef GTM_IPHONE_SDK
  id value = GTMCFAutorelease(ABRecordCopyValue(record_, property));
#else  // GTM_IPHONE_SDK 
  id value = GTMCFAutorelease(ABRecordCopyValue(record_, (CFStringRef)property));
#endif  // GTM_IPHONE_SDK
  if (value) {
    if ([[self class] typeOfProperty:property] & kABMultiValueMask) {
      value = [[[GTMABMultiValue alloc] 
                initWithMultiValue:(ABMultiValueRef)value] autorelease];
    }
  }
  return value;
}

- (BOOL)setValue:(id)value forProperty:(GTMABPropertyID)property {
  if (!value) return NO;
  // We check the type here because of
  // Radar 6201046 ABRecordSetValue returns true even if you pass in a bad type
  //               for a value  
  TypeClassNameMap fullTypeMap[] = {
    { kGTMABStringPropertyType, [NSString class] },
    { kGTMABIntegerPropertyType, [NSNumber class] },
    { kGTMABRealPropertyType, [NSNumber class] },
    { kGTMABDateTimePropertyType, [NSDate class] },
    { kGTMABDictionaryPropertyType, [NSDictionary class] },
    { kGTMABMultiStringPropertyType, [GTMABMultiValue class] },
    { kGTMABMultiRealPropertyType, [GTMABMultiValue class] },
    { kGTMABMultiDateTimePropertyType, [GTMABMultiValue class] },
    { kGTMABMultiDictionaryPropertyType, [GTMABMultiValue class] }
  };
  GTMABPropertyType type = [[self class] typeOfProperty:property];
  BOOL wasFound = NO;
  for (size_t i = 0; i < sizeof(fullTypeMap) / sizeof(TypeClassNameMap); ++i) {
    if (fullTypeMap[i].pType == type) {
      wasFound = YES;
      if (![[value class] isSubclassOfClass:fullTypeMap[i].class]) {
        return NO;
      }
    }
  }
  if (!wasFound) {
    return NO;
  }
  if (type & kABMultiValueMask) {
    value = (id)[value multiValueRef];
  }
#if GTM_IPHONE_SDK
  CFErrorRef cfError = nil;
  bool wasGood = ABRecordSetValue(record_, property, 
                                  (CFTypeRef)value, &cfError);
  if (cfError) {
    // COV_NF_START
    _GTMDevLog(@"Error in [%@ %@]: %@", 
               [self class], NSStringFromSelector(_cmd), cfError);
    CFRelease(cfError);
    // COV_NF_END
  }
#else  // GTM_IPHONE_SDK
  bool wasGood = ABRecordSetValue(record_, (CFStringRef)property, (CFTypeRef)value);
#endif  // GTM_IPHONE_SDK
  return wasGood ? YES : NO;
}

- (BOOL)removeValueForProperty:(GTMABPropertyID)property {
#if GTM_IPHONE_SDK
  CFErrorRef cfError = nil;
  // We check to see if the value is in the property because of:
  // Radar 6201005 ABRecordRemoveValue returns true for value that aren't 
  //               in the record
  id value = [self valueForProperty:property];
  bool wasGood = value && ABRecordRemoveValue(record_, property, &cfError);
  if (cfError) {
    // COV_NF_START
    _GTMDevLog(@"Error in [%@ %@]: %@", 
               [self class], NSStringFromSelector(_cmd), cfError);
    CFRelease(cfError);
    // COV_NF_END
  }
#else  // GTM_IPHONE_SDK
  id value = [self valueForProperty:property];
  bool wasGood = value && ABRecordRemoveValue(record_, (CFStringRef)property);
#endif  // GTM_IPHONE_SDK
  return wasGood ? YES : NO;
}

// COV_NF_START
// All of these methods are to be overridden by their subclasses

- (NSString *)compositeName {
  [self doesNotRecognizeSelector:_cmd];
  return nil;
}

+ (GTMABPropertyType)typeOfProperty:(GTMABPropertyID)property {
  [self doesNotRecognizeSelector:_cmd];
  return kGTMABInvalidPropertyType;
}

+ (NSString *)localizedPropertyName:(GTMABPropertyID)property {
  [self doesNotRecognizeSelector:_cmd];
  return nil; 
}
// COV_NF_END
@end

@implementation GTMABPerson

+ (GTMABPerson *)personWithFirstName:(NSString *)first 
                            lastName:(NSString *)last {
  GTMABPerson *person = [[[self alloc] init] autorelease];
  if (person) {
    BOOL isGood = YES;
    if (first) {
      isGood = [person setValue:first 
                    forProperty:kGTMABPersonFirstNameProperty];
    }
    if (isGood && last) {
      isGood = [person setValue:last forProperty:kGTMABPersonLastNameProperty];
    }
    if (!isGood) {
      // COV_NF_START
      // Marked as NF because I don't know how to force an error
      person = nil;
      // COV_NF_END
    }
  }
  return person;
}

- (id)init {
  ABRecordRef person = ABPersonCreate();
  self = [super initWithRecord:person];
  if (person) {
    CFRelease(person);
  } 
  return self;
}

- (BOOL)setImageData:(NSData *)data {
#if GTM_IPHONE_SDK
  CFErrorRef cfError = NULL;
  bool wasGood = NO;
  if (!data) {
    wasGood = ABPersonRemoveImageData([self recordRef], &cfError);
  } else {
    // We verify that the data is good because of:
    // Radar 6202868 ABPersonSetImageData should validate image data
    UIImage *image = [UIImage imageWithData:data];
    wasGood = image && ABPersonSetImageData([self recordRef], 
                                            (CFDataRef)data, &cfError);
  }
  if (cfError) {
    // COV_NF_START
    _GTMDevLog(@"Error in [%@ %@]: %@", 
               [self class], NSStringFromSelector(_cmd), cfError);
    CFRelease(cfError);
    // COV_NF_END
  }
#else  // GTM_IPHONE_SDK
  bool wasGood = YES;
  if (data) {
    NSImage *image = [[[NSImage alloc] initWithData:data] autorelease];
    wasGood = image != nil;
  }
  wasGood = wasGood && ABPersonSetImageData([self recordRef], (CFDataRef)data);
#endif  // GTM_IPHONE_SDK
  return wasGood ? YES : NO;
}

- (GTMABImage *)image {
  NSData *data = [self imageData];
#if GTM_IPHONE_SDK
  return [UIImage imageWithData:data];
#else  // GTM_IPHONE_SDK
  return [[[NSImage alloc] initWithData:data] autorelease];
#endif  // GTM_IPHONE_SDK
}

- (BOOL)setImage:(GTMABImage *)image {
#if GTM_IPHONE_SDK
  NSData *data = UIImagePNGRepresentation(image);
#else  // GTM_IPHONE_SDK
  NSData *data = [image TIFFRepresentation];
#endif  // GTM_IPHONE_SDK
  return [self setImageData:data];
}

- (NSData *)imageData {
  return GTMCFAutorelease(ABPersonCopyImageData([self recordRef]));
}

- (NSString *)compositeName {
#if GTM_IPHONE_SDK
  return GTMCFAutorelease(ABRecordCopyCompositeName([self recordRef]));
#else  // GTM_IPHONE_SDK
  NSNumber *nsFlags = [self valueForProperty:kABPersonFlags];
  NSInteger flags = [nsFlags longValue];
  NSString *compositeName = nil;
  if (flags & kABShowAsCompany) {
    compositeName = [self valueForProperty:kABOrganizationProperty];
  } else {
    NSString *firstName = [self valueForProperty:kGTMABPersonFirstNameProperty];
    NSString *lastName = [self valueForProperty:kGTMABPersonLastNameProperty];
    
    if (firstName && lastName) {
      GTMABPersonCompositeNameFormat format;
      if (flags & kABFirstNameFirst) {
        format = kABPersonCompositeNameFormatFirstNameFirst;
      } else if (flags & kABLastNameFirst) {
        format = kABPersonCompositeNameFormatLastNameFirst;
      } else {
        format = [[self class] compositeNameFormat];
      }
      if (format == kABPersonCompositeNameFormatLastNameFirst) {
        NSString *tempStr = lastName;
        lastName = firstName;
        firstName = tempStr;
      }
      compositeName = [NSString stringWithFormat:@"%@ %@", firstName, lastName];
    } else if (firstName) {
      compositeName = firstName;
    } else if (lastName) {
      compositeName = lastName;
    } else {
      compositeName = @"";
    }
  }
    
  return compositeName;
#endif  // GTM_IPHONE_SDK
}

- (NSString *)description {
  return [NSString stringWithFormat:@"%@ %@ %@ %d", 
          [self class], 
          [self valueForProperty:kGTMABPersonFirstNameProperty],
          [self valueForProperty:kGTMABPersonLastNameProperty],
          [self recordID]];
}

+ (NSString *)localizedPropertyName:(GTMABPropertyID)property {
#if GTM_IPHONE_SDK
  return GTMCFAutorelease(ABPersonCopyLocalizedPropertyName(property)); 
#else  // GTM_IPHONE_SDK
  return ABLocalizedPropertyOrLabel(property);
#endif  // GTM_IPHONE_SDK
}

+ (GTMABPersonCompositeNameFormat)compositeNameFormat {
#if GTM_IPHONE_SDK
  return ABPersonGetCompositeNameFormat();
#else  // GTM_IPHONE_SDK
  NSInteger nameOrdering 
    = [[ABAddressBook sharedAddressBook] defaultNameOrdering];
  return nameOrdering == kABFirstNameFirst ? 
    kABPersonCompositeNameFormatFirstNameFirst :
    kABPersonCompositeNameFormatLastNameFirst;
#endif  // GTM_IPHONE_SDK
}

+ (GTMABPropertyType)typeOfProperty:(GTMABPropertyID)property {
#if GTM_IPHONE_SDK
  return ABPersonGetTypeOfProperty(property);
#else  // GTM_IPHONE_SDK
  return ABTypeOfProperty([[GTMABAddressBook addressBook] addressBookRef], 
                          (CFStringRef)kABPersonRecordType, 
                          (CFStringRef)property);
#endif  // GTM_IPHONE_SDK
}
@end

@implementation GTMABGroup

+ (GTMABGroup *)groupNamed:(NSString *)name {
  GTMABGroup *group = [[[self alloc] init] autorelease];
  if (group) {
    if (![group setValue:name forProperty:kABGroupNameProperty]) {
      // COV_NF_START
      // Can't get setValue to fail for me
      group = nil;
      // COV_NF_END
    }
  }
  return group;
}

- (id)init {
  ABRecordRef group = ABGroupCreate();
  self = [super initWithRecord:group];
  if (group) {
    CFRelease(group);
  } 
  return self;
}

- (NSArray *)members {
  NSArray *people 
    = GTMCFAutorelease(ABGroupCopyArrayOfAllMembers([self recordRef]));
  NSMutableArray *gtmPeople = [NSMutableArray arrayWithCapacity:[people count]];
  id person;
  GTM_FOREACH_OBJECT(person, people) {
    [gtmPeople addObject:[GTMABPerson recordWithRecord:(ABRecordRef)person]];
  }
  return gtmPeople;
}  

- (BOOL)addMember:(GTMABPerson *)person {
#if GTM_IPHONE_SDK
  CFErrorRef cfError = nil;
  // We check for person because of
  // Radar 6202860 Passing nil person into ABGroupAddMember crashes
  bool wasGood = person && ABGroupAddMember([self recordRef], 
                                            [person recordRef], &cfError);
  if (cfError) {
    // COV_NF_START
    _GTMDevLog(@"Error in [%@ %@]: %@", 
               [self class], NSStringFromSelector(_cmd), cfError);
    CFRelease(cfError);
    // COV_NF_END
  }
#else  // GTM_IPHONE_SDK
  bool wasGood = person && ABGroupAddMember([self recordRef], 
                                            [person recordRef]);
#endif  // GTM_IPHONE_SDK
  return wasGood ? YES : NO;
}  

- (BOOL)removeMember:(GTMABPerson *)person {
#if GTM_IPHONE_SDK
  CFErrorRef cfError = nil;
  // We check for person because of
  // Radar 6202860 Passing nil person into ABGroupAddMember crashes
  // (I know this is remove, but it crashes there too)
  bool wasGood = person && ABGroupRemoveMember([self recordRef], 
                                               [person recordRef], &cfError);
  if (cfError) {
    // COV_NF_START
    _GTMDevLog(@"Error in [%@ %@]: %@", 
               [self class], NSStringFromSelector(_cmd), cfError);
    CFRelease(cfError);
    // COV_NF_END
  }
#else  // GTM_IPHONE_SDK
  bool wasGood = person != nil;
  if (wasGood) {
    NSArray *array = GTMCFAutorelease(ABPersonCopyParentGroups([person recordRef]));
    if ([array containsObject:[self recordRef]]) {
      wasGood = ABGroupRemoveMember([self recordRef], 
                                    [person recordRef]);
    } else {
      wasGood = NO;
    }
  }
#endif  // GTM_IPHONE_SDK
  return wasGood ? YES : NO;
}  

- (NSString *)compositeName {
#if GTM_IPHONE_SDK
  return GTMCFAutorelease(ABRecordCopyCompositeName([self recordRef]));
#else  // GTM_IPHONE_SDK
  return [self valueForProperty:kGTMABGroupNameProperty];
#endif  // GTM_IPHONE_SDK
}

+ (GTMABPropertyType)typeOfProperty:(GTMABPropertyID)property {
  GTMABPropertyType type = kGTMABInvalidPropertyType;
  if (property == kABGroupNameProperty) {
    type = kGTMABStringPropertyType;
  } 
  return type;
}

+ (NSString *)localizedPropertyName:(GTMABPropertyID)property {
  NSString *name = kGTMABUnknownPropertyName;
  if (property == kABGroupNameProperty) {
    name = NSLocalizedStringFromTable(@"Name",
                                      @"GTMABAddressBook", 
                                      @"name property");
  }
  return name;
}

- (NSString *)description {
  return [NSString stringWithFormat:@"%@ %@ %d", 
          [self class], 
          [self valueForProperty:kABGroupNameProperty],
          [self recordID]];
}
@end

@implementation GTMABMultiValue
- (id)init {
  // Call super init and release so we don't leak
  [[super init] autorelease];
  [self doesNotRecognizeSelector:_cmd];
  return nil;  // COV_NF_LINE
}

- (id)initWithMultiValue:(ABMultiValueRef)multiValue {
  if ((self = [super init])) {
    if (!multiValue) {
      [self release];
      self = nil;
    } else {
      multiValue_ = CFRetain(multiValue);
    }
  }
  return self;
}

- (id)copyWithZone:(NSZone *)zone {
  return [[GTMABMultiValue alloc] initWithMultiValue:multiValue_];
}

- (id)mutableCopyWithZone:(NSZone *)zone {
  return [[GTMABMutableMultiValue alloc] initWithMultiValue:multiValue_];
}

- (NSUInteger)hash {
  // I'm implementing hash instead of using CFHash(multiValue_) because
  // 6203854 ABMultiValues hash to their address
  NSUInteger count = [self count];
  NSUInteger hash = 0;
  for (NSUInteger i = 0; i < count;  ++i) {
    NSString *label = [self labelAtIndex:i];
    id value = [self valueAtIndex:i];
    hash += [label hash];
    hash += [value hash];
  }
  return hash;
}

- (BOOL)isEqual:(id)object {
  // I'm implementing isEqual instea of using CFEquals(multiValue,...) because
  // 6203854 ABMultiValues hash to their address
  // and it appears CFEquals just calls through to hash to compare them.
  BOOL isEqual = NO;
  if ([object respondsToSelector:@selector(multiValueRef)]) { 
    isEqual = multiValue_ == [object multiValueRef];
    if (!isEqual) {
      NSUInteger count = [self count];
      NSUInteger objCount = [object count];
      isEqual = count == objCount;
      for (NSUInteger i = 0; isEqual && i < count;  ++i) {
        NSString *label = [self labelAtIndex:i];
        NSString *objLabel = [object labelAtIndex:i];
        isEqual = [label isEqual:objLabel];
        if (isEqual) {
          id value = [self valueAtIndex:i];
          GTMABMultiValue *multiValueObject 
            = GTM_STATIC_CAST(GTMABMultiValue, object);
          id objValue = [multiValueObject valueAtIndex:i];
          isEqual = [value isEqual:objValue];
        }
      }
    }
  }
  return isEqual;
}

- (void)dealloc {
  if (multiValue_) {
    CFRelease(multiValue_);
  }
  [super dealloc];
}

- (ABMultiValueRef)multiValueRef {
  return multiValue_;
}

- (NSUInteger)count {
#if GTM_IPHONE_SDK
  return ABMultiValueGetCount(multiValue_);
#else  // GTM_IPHONE_SDK
  return ABMultiValueCount(multiValue_);
#endif  // GTM_IPHONE_SDK
}

- (id)valueAtIndex:(NSUInteger)idx {
  id value = nil;
  if (idx < [self count]) {
    value = GTMCFAutorelease(ABMultiValueCopyValueAtIndex(multiValue_, idx));
    ABPropertyType type = [self propertyType];
    if (type == kGTMABIntegerPropertyType 
        || type == kGTMABRealPropertyType
        || type == kGTMABDictionaryPropertyType) {
      // This is because of
      // 6208390 Integer and real values don't work in ABMultiValueRefs
      // Apparently they forget to add a ref count on int, real and 
      // dictionary values in ABMultiValueCopyValueAtIndex, although they do 
      // remember them for all other types.
      // Once they fix this, this will lead to a leak, but I figure the leak
      // is better than the crash. Our unittests will test to make sure that
      // this is the case, and once we find a system that has this fixed, we
      // can conditionalize this code. Look for testRadar6208390 in
      // GTMABAddressBookTest.m
      // Also, search for 6208390 below and fix the fast enumerator to actually
      // be somewhat performant when this is fixed.
#ifndef __clang_analyzer__
      [value retain];
#endif  // __clang_analyzer__
    }
  }
  return value;
}

- (NSString *)labelAtIndex:(NSUInteger)idx {
  NSString *label = nil;
  if (idx < [self count]) {
    label = GTMCFAutorelease(ABMultiValueCopyLabelAtIndex(multiValue_, idx));
  }
  return label;
}

- (GTMABMultiValueIdentifier)identifierAtIndex:(NSUInteger)idx {
  GTMABMultiValueIdentifier identifier = kGTMABMultiValueInvalidIdentifier;
  if (idx < [self count]) {
#if GTM_IPHONE_SDK
    identifier = ABMultiValueGetIdentifierAtIndex(multiValue_, idx);
#else  // GTM_IPHONE_SDK
    identifier = GTMCFAutorelease(ABMultiValueCopyIdentifierAtIndex(multiValue_, 
                                                                  idx));
#endif  // GTM_IPHONE_SDK
  }
  return identifier;
}

- (NSUInteger)indexForIdentifier:(GTMABMultiValueIdentifier)identifier {
#if GTM_IPHONE_SDK
  NSUInteger idx = ABMultiValueGetIndexForIdentifier(multiValue_, identifier);
#else  // GTM_IPHONE_SDK
  NSUInteger idx = ABMultiValueIndexForIdentifier(multiValue_, 
                                                  (CFStringRef)identifier);
#endif  // GTM_IPHONE_SDK
  return idx == (NSUInteger)kCFNotFound ? (NSUInteger)NSNotFound : idx;
}

- (GTMABPropertyType)propertyType {
#if GTM_IPHONE_SDK
  return ABMultiValueGetPropertyType(multiValue_);
#else  // GTM_IPHONE_SDK
  return ABMultiValuePropertyType(multiValue_);
#endif  // GTM_IPHONE_SDK
}

- (id)valueForIdentifier:(GTMABMultiValueIdentifier)identifier {
  return [self valueAtIndex:[self indexForIdentifier:identifier]];
}

- (NSString *)labelForIdentifier:(GTMABMultiValueIdentifier)identifier {
  return [self labelAtIndex:[self indexForIdentifier:identifier]];
}

- (unsigned long*)mutations {
  // We just need some constant non-zero value here so fast enumeration works.
  // Dereferencing self should give us the isa which will stay constant
  // over the enumeration.
  return (unsigned long*)self;
}

- (NSEnumerator *)valueEnumerator {
  return [GTMABMultiValueEnumerator valueEnumeratorFor:self];
}

- (NSEnumerator *)labelEnumerator {
  return [GTMABMultiValueEnumerator labelEnumeratorFor:self];
}

@end

@implementation GTMABMutableMultiValue
+ (id)valueWithPropertyType:(GTMABPropertyType)type {
  return [[[self alloc] initWithPropertyType:type] autorelease];
}

- (id)initWithPropertyType:(GTMABPropertyType)type {
  ABMutableMultiValueRef ref = nil;
  if (type != kGTMABInvalidPropertyType) {
#if GTM_IPHONE_SDK
    ref = ABMultiValueCreateMutable(type);
#else  // GTM_IPHONE_SDK
    ref = ABMultiValueCreateMutable();
#endif  // GTM_IPHONE_SDK
  }
  self = [super initWithMultiValue:ref];
  if (ref) {
    CFRelease(ref);
  } 
  return self;
}

- (id)initWithMultiValue:(ABMultiValueRef)multiValue {
  ABMutableMultiValueRef ref = nil;
  if (multiValue) {
    ref = ABMultiValueCreateMutableCopy(multiValue);
  }
  self = [super initWithMultiValue:ref];
  if (ref) {
    CFRelease(ref);
  } 
  return self;
}

- (id)initWithMutableMultiValue:(ABMutableMultiValueRef)multiValue {
  return [super initWithMultiValue:multiValue];
}

- (BOOL)checkValueType:(id)value {
  BOOL isGood = NO;
  if (value) {
    TypeClassNameMap singleValueTypeMap[] = {
      { kGTMABStringPropertyType, [NSString class] },
      { kGTMABIntegerPropertyType, [NSNumber class] },
      { kGTMABRealPropertyType, [NSNumber class] },
      { kGTMABDateTimePropertyType, [NSDate class] },
      { kGTMABDictionaryPropertyType, [NSDictionary class] },
    };
    GTMABPropertyType type = [self propertyType] & ~kABMultiValueMask;
#if GTM_MACOS_SDK
    // Since on the desktop mutables don't have a type UNTIL they have 
    // something in them, return YES if it's empty.
    if ((type == 0) && ([self count] == 0)) return YES;
#endif  // GTM_MACOS_SDK
    for (size_t i = 0; 
         i < sizeof(singleValueTypeMap) / sizeof(TypeClassNameMap); ++i) {
      if (singleValueTypeMap[i].pType == type) {
        if ([[value class] isSubclassOfClass:singleValueTypeMap[i].class]) {
          isGood = YES;
          break;
        }
      }
    }
  }
  return isGood;
}

- (GTMABMultiValueIdentifier)addValue:(id)value withLabel:(CFStringRef)label {
  GTMABMultiValueIdentifier identifier = kGTMABMultiValueInvalidIdentifier;
  // We check label and value here because of
  // radar 6202827  Passing nil info ABMultiValueAddValueAndLabel causes crash
  bool wasGood = label && [self checkValueType:value];
  if (wasGood) {
#if GTM_IPHONE_SDK
    wasGood = ABMultiValueAddValueAndLabel(multiValue_, 
                                           value, 
                                           label, 
                                           &identifier);
#else  // GTM_IPHONE_SDK 
    wasGood = ABMultiValueAdd((ABMutableMultiValueRef)multiValue_, 
                              value, 
                              label, 
                              (CFStringRef *)&identifier);
#endif  // GTM_IPHONE_SDK
  }
  if (!wasGood) {
    identifier = kGTMABMultiValueInvalidIdentifier;
  } else {
    mutations_++;
  }
  return identifier;
}

- (GTMABMultiValueIdentifier)insertValue:(id)value 
                               withLabel:(CFStringRef)label 
                                 atIndex:(NSUInteger)idx {
  GTMABMultiValueIdentifier identifier = kGTMABMultiValueInvalidIdentifier;
  // We perform a check here to ensure that we don't get bitten by
  // Radar 6202807 ABMultiValueInsertValueAndLabelAtIndex allows you to insert 
  //               values past end
  NSUInteger count = [self count];
  // We check label and value here because of
  // radar 6202827  Passing nil info ABMultiValueAddValueAndLabel causes crash
  bool wasGood = idx <= count && label && [self checkValueType:value];
  if (wasGood) {
#if GTM_IPHONE_SDK
    wasGood = ABMultiValueInsertValueAndLabelAtIndex(multiValue_, 
                                                     value, 
                                                     label, 
                                                     idx, 
                                                     &identifier);
#else  // GTM_IPHONE_SDK
    wasGood = ABMultiValueInsert((ABMutableMultiValueRef)multiValue_, 
                                 value, 
                                 label, 
                                 idx, 
                                 (CFStringRef *)&identifier);
#endif  // GTM_IPHONE_SDK
  }
  if (!wasGood) {
    identifier = kGTMABMultiValueInvalidIdentifier;
  } else {
    mutations_++;
  }
  return identifier;
}

- (BOOL)removeValueAndLabelAtIndex:(NSUInteger)idx {
  BOOL isGood = NO;
  NSUInteger count = [self count];
  if (idx < count) {
#if GTM_IPHONE_SDK
    bool wasGood = ABMultiValueRemoveValueAndLabelAtIndex(multiValue_, 
                                                          idx);
#else  // GTM_IPHONE_SDK
    bool wasGood = ABMultiValueRemove((ABMutableMultiValueRef)multiValue_,
                                      idx);
#endif  // GTM_IPHONE_SDK
    if (wasGood) {
      mutations_++;
      isGood = YES;
    }
  }
  return isGood; 
}

- (BOOL)replaceValueAtIndex:(NSUInteger)idx withValue:(id)value {
  BOOL isGood = NO;
  NSUInteger count = [self count];
  if (idx < count && [self checkValueType:value]) {
#if GTM_IPHONE_SDK
    bool goodReplace = ABMultiValueReplaceValueAtIndex(multiValue_, 
                                                       value, idx);
#else  // GTM_IPHONE_SDK
    bool goodReplace 
      = ABMultiValueReplaceValue((ABMutableMultiValueRef)multiValue_, 
                                 (CFTypeRef)value, idx);
#endif  // GTM_IPHONE_SDK
    if (goodReplace) {
      mutations_++;
      isGood = YES;
    }
  }
  return isGood; 
}

- (BOOL)replaceLabelAtIndex:(NSUInteger)idx withLabel:(CFStringRef)label {
  BOOL isGood = NO;
  NSUInteger count = [self count];
  if (idx < count) {
#if GTM_IPHONE_SDK
    bool goodReplace = ABMultiValueReplaceLabelAtIndex(multiValue_, 
                                                       label, idx);
#else  // GTM_IPHONE_SDK
    bool goodReplace 
      = ABMultiValueReplaceLabel((ABMutableMultiValueRef)multiValue_, 
                                 (CFTypeRef)label, idx);
#endif  // GTM_IPHONE_SDK
    if (goodReplace) {
      mutations_++;
      isGood = YES;
    }
  }
  return isGood; 
}
      
- (unsigned long*)mutations {
  return &mutations_;
}
@end
      

@implementation GTMABMultiValueEnumerator

+ (id)valueEnumeratorFor:(GTMABMultiValue*)enumeree {
  return [[[self alloc] initWithEnumeree:enumeree useLabels:NO] autorelease];
}

+ (id)labelEnumeratorFor:(GTMABMultiValue*)enumeree  {
  return [[[self alloc] initWithEnumeree:enumeree useLabels:YES] autorelease];
}

- (id)initWithEnumeree:(GTMABMultiValue*)enumeree useLabels:(BOOL)useLabels {
  if ((self = [super init])) {
    if (enumeree) {
      enumeree_ = [enumeree retain];
      useLabels_ = useLabels;
    } else {
      // COV_NF_START
      // Since this is a private class where the enumeree creates us
      // there is no way we should ever get here.
      [self release];
      self = nil;
      // COV_NF_END
    }
  }
  return self;
}

- (void)dealloc {
  [enumeree_ release];
  [super dealloc];
}

#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
- (NSUInteger)countByEnumeratingWithState:(NSFastEnumerationState *)state 
                                  objects:(id *)stackbuf 
                                    count:(NSUInteger)len {
  NSUInteger i;
  if (!ref_) {
    count_ = [enumeree_ count];
    ref_ = [enumeree_ multiValueRef];
  }
  
  for (i = 0; state->state < count_ && i < len; ++i, ++state->state) {
    if (useLabels_) {
      stackbuf[i] = GTMCFAutorelease(ABMultiValueCopyLabelAtIndex(ref_, 
                                                                  state->state));
    } else {
      // TODO(dmaclach) Check this on Mac Desktop and use fast path if we can
      // Yes this is slow, but necessary in light of radar 6208390
      // Once this is fixed we can go to something similar to the label
      // case which should speed stuff up again. Hopefully anybody who wants
      // real performance is willing to move down to the C API anyways.
      stackbuf[i] = [enumeree_ valueAtIndex:state->state];
    }
  }
    
  state->itemsPtr = stackbuf;
  state->mutationsPtr = [enumeree_ mutations];
  return i;
}
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5

- (id)nextObject {
  id value = nil;
  if (!ref_) {
    count_ = [enumeree_ count];
    mutations_ = *[enumeree_ mutations];
    ref_ = [enumeree_ multiValueRef];

  }
  if (mutations_ != *[enumeree_ mutations]) {
    NSString *reason = [NSString stringWithFormat:@"*** Collection <%@> was "
                        "mutated while being enumerated", enumeree_];
    [[NSException exceptionWithName:NSGenericException
                             reason:reason
                           userInfo:nil] raise];
  }
  if (index_ < count_) {
    if (useLabels_) {
      value = GTMCFAutorelease(ABMultiValueCopyLabelAtIndex(ref_, 
                                                            index_));
    } else {
      // TODO(dmaclach) Check this on Mac Desktop and use fast path if we can
      // Yes this is slow, but necessary in light of radar 6208390
      // Once this is fixed we can go to something similar to the label
      // case which should speed stuff up again. Hopefully anybody who wants
      // real performance is willing to move down to the C API anyways.
      value = [enumeree_ valueAtIndex:index_];
    }
    index_ += 1;
  }
  return value;
}
@end

