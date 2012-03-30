//
//  GTMNSFileManager+Carbon.h
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


// A few useful methods for dealing with paths and carbon structures
@interface NSFileManager (GTMFileManagerCarbonAdditions)

// Converts a path to an alias
// Args:
//   path - the path to convert
//
// Returns:
//   An alias wrapped up in an autoreleased NSData. Nil on failure.
//
- (NSData *)gtm_aliasDataForPath:(NSString *)path;

// Converts an alias to a path
// Args:
//   alias - an alias wrapped up in an NSData
//
// Returns:
//   The path. Nil on failure.
//
- (NSString *)gtm_pathFromAliasData:(NSData *)alias;

// Converts an alias to a path without optional triggering of UI.
// Args:
//   alias - an alias wrapped up in an NSData
//   resolve - whether to try to resolve the alias, or simply read path data
//   withUI - whether to show UI when trying to resolve
//
// Returns:
//   The path. Nil on failure.
//
- (NSString *)gtm_pathFromAliasData:(NSData *)alias 
                            resolve:(BOOL)resolve 
                             withUI:(BOOL)withUI;
  
// Converts a path to an FSRef *
// Args:
//   path - the path to convert
//
// Returns:
//   An autoreleased FSRef *. Nil on failure.
//
- (FSRef *)gtm_FSRefForPath:(NSString *)path;

// Converts an FSRef to a path
// Args:
//   fsRef - the FSRef to convert
//
// Returns:
//   The path. Nil on failure.
//
- (NSString *)gtm_pathFromFSRef:(FSRef *)fsRef;
@end
