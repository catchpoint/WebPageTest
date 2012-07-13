//
//  GTMLoginItems.m
//  Based on AELoginItems from DTS.
//
//  Copyright 2007-2008 Google Inc.
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

#import "GTMLoginItems.h"
#import "GTMDefines.h"
#import "GTMGarbageCollection.h"

#include <Carbon/Carbon.h>

// Exposed constants
NSString * const kGTMLoginItemsNameKey = @"Name";
NSString * const kGTMLoginItemsPathKey = @"Path";
NSString * const kGTMLoginItemsHiddenKey = @"Hide";

// kLSSharedFileListLoginItemHidden is supported on
// 10.5, but missing from the 10.5 headers.
// http://openradar.appspot.com/6482251
#if MAC_OS_X_VERSION_MAX_ALLOWED < MAC_OS_X_VERSION_10_6
static NSString * const kLSSharedFileListLoginItemHidden =
    @"com.apple.loginitem.HideOnLaunch";
#endif  // MAC_OS_X_VERSION_MAX_ALLOWED < MAC_OS_X_VERSION_10_6

@interface GTMLoginItems (PrivateMethods)
+ (NSInteger)indexOfLoginItemWithValue:(id)value
                                forKey:(NSString *)key
                            loginItems:(NSArray *)items;
#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
+ (LSSharedFileListRef)loginItemsFileListRef;
+ (NSArray *)loginItemsArrayForFileListRef:(LSSharedFileListRef)fileListRef;
#else  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
+ (BOOL)compileAndRunScript:(NSString *)script
                  withError:(NSError **)errorInfo;
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
@end

@implementation GTMLoginItems (PrivateMethods)

+ (NSInteger)indexOfLoginItemWithValue:(id)value
                                forKey:(NSString *)key
                            loginItems:(NSArray *)items {
  if (!value || !key || !items) return NSNotFound;
  NSDictionary *item = nil;
  NSInteger found = -1;
  GTM_FOREACH_OBJECT(item, items) {
    ++found;
    id itemValue = [item objectForKey:key];
    if (itemValue && [itemValue isEqual:value]) {
      return found;
    }
  }
  return NSNotFound;
}

#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5

+ (LSSharedFileListRef)loginItemsFileListRef {
  LSSharedFileListRef loginItemsRef =
      LSSharedFileListCreate(NULL, kLSSharedFileListSessionLoginItems, NULL);
  return (LSSharedFileListRef)GTMCFAutorelease(loginItemsRef);
}

+ (NSArray *)loginItemsArrayForFileListRef:(LSSharedFileListRef)fileListRef {
  UInt32 seedValue;
  CFArrayRef filelistArrayRef = LSSharedFileListCopySnapshot(fileListRef,
                                                        &seedValue);
  return GTMCFAutorelease(filelistArrayRef);
}

#else  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5

+ (BOOL)compileAndRunScript:(NSString *)script
                  withError:(NSError **)errorInfo {
  if ([script length] == 0) {
    // COV_NF_START - no real way to test this
    if (errorInfo)
      *errorInfo = [NSError errorWithDomain:@"GTMLoginItems" code:-90 userInfo:nil];
    return NO;
    // COV_NF_END
  }
  NSAppleScript *query = [[[NSAppleScript alloc] initWithSource:script] autorelease];
  NSDictionary *errDict = nil;
  if ( ![query compileAndReturnError:&errDict]) {
    // COV_NF_START - no real way to test this
    if (errorInfo)
      *errorInfo = [NSError errorWithDomain:@"GTMLoginItems" code:-91 userInfo:errDict];
    return NO;
    // COV_NF_END
  }
  NSAppleEventDescriptor *scriptResult = [query executeAndReturnError:&errDict];
  if (!scriptResult) {
    // COV_NF_START - no real way to test this
    if (errorInfo)
      *errorInfo = [NSError errorWithDomain:@"GTMLoginItems" code:-92 userInfo:errDict];
    return NO;
    // COV_NF_END
  }
  // we don't process the result
  return YES;
}

#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5

@end

@implementation GTMLoginItems

#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5

+ (NSArray*)loginItems:(NSError **)errorInfo {
  // get the login items from LaunchServices
  LSSharedFileListRef loginItemsRef = [self loginItemsFileListRef];
  if (!loginItemsRef) {
    // COV_NF_START - no real way to test this
    if (errorInfo) {
      *errorInfo = [NSError errorWithDomain:@"GTMLoginItems"
                                       code:-1
                                   userInfo:nil];
    }
    return nil;
    // COV_NF_END
  }
  NSArray *fileList = [self loginItemsArrayForFileListRef:loginItemsRef];

  // build our results
  NSMutableArray *result = [NSMutableArray array];
  for (id fileItem in fileList) {
    LSSharedFileListItemRef itemRef = (LSSharedFileListItemRef)fileItem;
    // name
    NSMutableDictionary *item = [NSMutableDictionary dictionary];
    CFStringRef nameRef = LSSharedFileListItemCopyDisplayName(itemRef);
    if (nameRef) {
      [item setObject:[(NSString *)nameRef stringByDeletingPathExtension]
               forKey:kGTMLoginItemsNameKey];
      CFRelease(nameRef);
    }
    // path
    CFURLRef urlRef = NULL;
    if (LSSharedFileListItemResolve(itemRef, 0, &urlRef, NULL) == noErr) {
      if (urlRef) {
        NSString *path = [(NSURL *)urlRef path];
        if (path) {
          [item setObject:path forKey:kGTMLoginItemsPathKey];
        }
        CFRelease(urlRef);
      }
    }
    // hidden
    CFBooleanRef hiddenRef = LSSharedFileListItemCopyProperty(itemRef,
        (CFStringRef)kLSSharedFileListLoginItemHidden);
    if (hiddenRef) {
      if (hiddenRef == kCFBooleanTrue) {
        [item setObject:[NSNumber numberWithBool:YES]
                 forKey:kGTMLoginItemsHiddenKey];
      }
      CFRelease(hiddenRef);
    }
    [result addObject:item];
  }

  return result;
}

#else  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5

+ (NSArray*)loginItems:(NSError **)errorInfo {
  NSDictionary *errDict = nil;
  // get the script compiled and saved off
  static NSAppleScript *query = nil;
  if (!query) {
    NSString *querySource = @"tell application \"System Events\" to get properties of login items";
    query = [[NSAppleScript alloc] initWithSource:querySource];
    if ( ![query compileAndReturnError:&errDict]) {
      // COV_NF_START - no real way to test this
      if (errorInfo)
        *errorInfo = [NSError errorWithDomain:@"GTMLoginItems" code:-1 userInfo:errDict];
      [query release];
      query = nil;
      return nil;
      // COV_NF_END
    }
  }
  // run the script
  NSAppleEventDescriptor *scriptResult = [query executeAndReturnError:&errDict];
  if (!scriptResult) {
    // COV_NF_START - no real way to test this
    if (errorInfo)
      *errorInfo = [NSError errorWithDomain:@"GTMLoginItems" code:-2 userInfo:errDict];
    return nil;
    // COV_NF_END
  }
  // build our results
  NSMutableArray *result = [NSMutableArray array];
  NSInteger count = [scriptResult numberOfItems];
  for (NSInteger i = 0; i < count; ++i) {
    NSAppleEventDescriptor *aeItem = [scriptResult descriptorAtIndex:i+1];
    NSAppleEventDescriptor *hidn = [aeItem descriptorForKeyword:kAEHidden];
    NSAppleEventDescriptor *nam = [aeItem descriptorForKeyword:pName];
    NSAppleEventDescriptor *ppth = [aeItem descriptorForKeyword:'ppth'];
    NSMutableDictionary *item = [NSMutableDictionary dictionary];
    if (hidn && [hidn booleanValue]) {
      [item setObject:[NSNumber numberWithBool:YES] forKey:kGTMLoginItemsHiddenKey];
    }
    if (nam) {
      NSString *name = [nam stringValue];
      if (name) {
        [item setObject:name forKey:kGTMLoginItemsNameKey];
      }
    }
    if (ppth) {
      NSString *path = [ppth stringValue];
      if (path) {
        [item setObject:path forKey:kGTMLoginItemsPathKey];
      }
    }
    [result addObject:item];
  }

  return result;
}

#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5

+ (BOOL)pathInLoginItems:(NSString *)path {
  NSArray *loginItems = [self loginItems:nil];
  NSInteger itemIndex = [self indexOfLoginItemWithValue:path
                                                 forKey:kGTMLoginItemsPathKey
                                             loginItems:loginItems];
  return (itemIndex != NSNotFound) ? YES : NO;
}

+ (BOOL)itemWithNameInLoginItems:(NSString *)name {
  NSArray *loginItems = [self loginItems:nil];
  NSInteger itemIndex = [self indexOfLoginItemWithValue:name
                                                 forKey:kGTMLoginItemsNameKey
                                             loginItems:loginItems];
  return (itemIndex != NSNotFound) ? YES : NO;
}

+ (void)addPathToLoginItems:(NSString*)path hide:(BOOL)hide {
  if (!path) return;
  // make sure it isn't already there
  if ([self pathInLoginItems:path]) return;
  // now append it
#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
  NSURL *url = [NSURL fileURLWithPath:path];
  if (url) {
    LSSharedFileListRef loginItemsRef = [self loginItemsFileListRef];
    if (loginItemsRef) {
      NSDictionary *setProperties =
          [NSDictionary dictionaryWithObject:[NSNumber numberWithBool:hide]
              forKey:(id)kLSSharedFileListLoginItemHidden];
      LSSharedFileListItemRef itemRef =
          LSSharedFileListInsertItemURL(loginItemsRef,
                                        kLSSharedFileListItemLast, NULL, NULL,
                                        (CFURLRef)url,
                                        (CFDictionaryRef)setProperties, NULL);
      if (itemRef) CFRelease(itemRef);
    }
  }
#else  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
  NSString *scriptSource =
    [NSString stringWithFormat:
      @"tell application \"System Events\" to make new login item with properties { path:\"%s\", hidden:%s } at end",
      [path UTF8String],
      (hide ? "yes" : "no")];
  [self compileAndRunScript:scriptSource withError:nil];
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
}

+ (void)removePathFromLoginItems:(NSString*)path {
  if ([path length] == 0) return;
#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
  NSURL *url = [NSURL fileURLWithPath:path];
  LSSharedFileListRef loginItemsRef = [self loginItemsFileListRef];
  if (loginItemsRef) {
    NSArray *fileList = [self loginItemsArrayForFileListRef:loginItemsRef];
    for (id item in fileList) {
      LSSharedFileListItemRef itemRef = (LSSharedFileListItemRef)item;
      CFURLRef urlRef = NULL;
      if (LSSharedFileListItemResolve(itemRef, 0, &urlRef, NULL) == noErr) {
        if (urlRef) {
          if (CFEqual(urlRef, (CFURLRef)url)) {
            LSSharedFileListItemRemove(loginItemsRef, itemRef);
          }
          CFRelease(urlRef);
        }
      }
    }
  }
#else  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
  NSString *scriptSource =
    [NSString stringWithFormat:
      @"tell application \"System Events\" to delete (login items whose path is \"%s\")",
      [path UTF8String]];
  [self compileAndRunScript:scriptSource withError:nil];
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
}

+ (void)removeItemWithNameFromLoginItems:(NSString *)name {
  if ([name length] == 0) return;
#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
  LSSharedFileListRef loginItemsRef = [self loginItemsFileListRef];
  if (loginItemsRef) {
    NSArray *fileList = [self loginItemsArrayForFileListRef:loginItemsRef];
    for (id item in fileList) {
      LSSharedFileListItemRef itemRef = (LSSharedFileListItemRef)item;
      CFStringRef itemNameRef = LSSharedFileListItemCopyDisplayName(itemRef);
      if (itemNameRef) {
        NSString *itemName =
            [(NSString *)itemNameRef stringByDeletingPathExtension];
        if ([itemName isEqual:name]) {
          LSSharedFileListItemRemove(loginItemsRef, itemRef);
        }
        CFRelease(itemNameRef);
      }
    }
  }
#else  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
  NSString *scriptSource =
    [NSString stringWithFormat:
      @"tell application \"System Events\" to delete (login items whose name is \"%s\")",
      [name UTF8String]];
  [self compileAndRunScript:scriptSource withError:nil];
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
}

@end
