//
//  GTMNSFileManager+Path.h
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

#import <Foundation/Foundation.h>


/// A few useful methods for dealing with paths.
@interface NSFileManager (GMFileManagerPathAdditions)

#if MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5

/// For the Unix-y at heart, this is "mkdir -p".  It tries to create 
/// the directory specified by |path|, and any intervening directories that
/// are needed.  Each directory that is created is created with |attributes|
/// (see other NSFileManager doco for the details on |attributes|).
///
/// If you are building for 10.5 or later, you should just use the new api:
///  createDirectoryAtPath:withIntermediateDirectories:attributes:error:
/// 
/// Also if you need more control over the creation of paths and their
/// attributes, look into using GTMPath.
///
/// Args:
///   path - the path of the directory to create.
///   attributes - these are defined in the "Constants" section of Apple's
///                NSFileManager doco
///
/// Returns:
///   YES if |path| exists or was able to be created successfully
///   NO otherwise
///
- (BOOL)gtm_createFullPathToDirectory:(NSString *)path
                           attributes:(NSDictionary *)attributes;

#endif // MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5

/// Return an the paths for all resources in |directoryPath| that have the
/// |extension| file extension.
///
/// Args:
///   extension - the file extension (excluding the leading ".") to match.
///               If nil, all files are matched.
///   directoryPath - the directory to look in.  NOTE: Subdirectories are NOT
///                   traversed.
/// 
/// Returns:
///   An NSArray of absolute file paths that have |extension|.  nil is returned
///   if |directoryPath| doesn't exist or can't be opened, and returns an empty
///   array if |directoryPath| is empty.  ".", "..", and resource forks are never returned.
///
- (NSArray *)gtm_filePathsWithExtension:(NSString *)extension
                            inDirectory:(NSString *)directoryPath;

/// Same as -filePathsWithExtension:inDirectory: except |extensions| is an 
/// NSArray of extensions to match.
///
- (NSArray *)gtm_filePathsWithExtensions:(NSArray *)extensions
                             inDirectory:(NSString *)directoryPath;

@end
