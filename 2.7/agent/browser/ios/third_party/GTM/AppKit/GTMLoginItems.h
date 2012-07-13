//
//  GTMLoginItems.h
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

#import <Foundation/Foundation.h>
#import "GTMDefines.h"

/// Login items key constants, used as keys in |+loginItems|
//
// Item name
GTM_EXTERN NSString * const kGTMLoginItemsNameKey;
// Item path
GTM_EXTERN NSString * const kGTMLoginItemsPathKey;
// Hidden (NSNumber bool)
GTM_EXTERN NSString * const kGTMLoginItemsHiddenKey;

/// GTMLoginItems
//
///  A helper class to manipulate the user's Login Items.
@interface GTMLoginItems : NSObject

/// Obtain a complete list of all login items.
//
//  Returns:
//    Autoreleased array of dictionaries keyed with kGTMLoginItemsPathKey, etc.
//
+ (NSArray *)loginItems:(NSError **)errorInfo;

/// Check if the given path is in the current user's Login Items
//
//  Args:
//    path: path to the application
//
//  Returns:
//   YES if the path is in the Login Items
// 
+ (BOOL)pathInLoginItems:(NSString *)path;

/// Check if the given name is in the current user's Login Items
//
//  Args:
//    name: name to the application
//
//  Returns:
//   YES if the name is in the Login Items
// 
+ (BOOL)itemWithNameInLoginItems:(NSString *)name;

/// Add the given path to the current user's Login Items. Does nothing if the
/// path is already there.
//
// Args:
//   path: path to add
//   hide: Set to YES to have the item launch hidden
//
+ (void)addPathToLoginItems:(NSString *)path hide:(BOOL)hide;

/// Remove the given path from the current user's Login Items. Does nothing if
/// the path is not there.
//
//  Args:
//    path: the path to remove
//
+ (void)removePathFromLoginItems:(NSString *)path;

/// Remove the given item name from the current user's Login Items. Does nothing
/// if no item with that name is present.
//
//  Args:
//    name: name of the item to remove
//
+ (void)removeItemWithNameFromLoginItems:(NSString *)name;

@end
