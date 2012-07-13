//
//  GTMNSFileManager+Path.m
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

#import "GTMNSFileManager+Path.h"
#import "GTMDefines.h"

@implementation NSFileManager (GMFileManagerPathAdditions)

#if MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5

- (BOOL)gtm_createFullPathToDirectory:(NSString *)path
                           attributes:(NSDictionary *)attributes {
  if (!path) return NO;

  BOOL isDir;
  BOOL exists = [self fileExistsAtPath:path isDirectory:&isDir];
  
  // Quick check for the case where we have nothing to do.
  if (exists && isDir)
    return YES;
  
  NSString *actualPath = @"/";
  NSString *directory;
  
  GTM_FOREACH_OBJECT(directory, [path pathComponents]) {
    actualPath = [actualPath stringByAppendingPathComponent:directory];
    
    if ([self fileExistsAtPath:actualPath isDirectory:&isDir] && isDir) {
      continue;
    } else if ([self createDirectoryAtPath:actualPath attributes:attributes]) {
      continue;
    } else {
      return NO;
    }
  }
  
  return YES;
}

#endif // MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5

- (NSArray *)gtm_filePathsWithExtension:(NSString *)extension
                            inDirectory:(NSString *)directoryPath {
  NSArray *extensions = nil;
  
  // Treat no extension and an empty extension as the user requesting all files
  if (extension != nil && ![extension isEqualToString:@""])
    extensions = [NSArray arrayWithObject:extension];
  
  return [self gtm_filePathsWithExtensions:extensions
                               inDirectory:directoryPath];
}

- (NSArray *)gtm_filePathsWithExtensions:(NSArray *)extensions
                             inDirectory:(NSString *)directoryPath {
  if (!directoryPath) {
    return nil;
  }
  
  // |basenames| will contain only the matching file names, not their full paths.
#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
  NSArray *basenames = [self contentsOfDirectoryAtPath:directoryPath 
                                                 error:nil];
#else
  NSArray *basenames = [self directoryContentsAtPath:directoryPath];
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
  
  // Check if dir doesn't exist or couldn't be opened.
  if (!basenames) {
    return nil;
  }
  
  // Check if dir is empty.
  if ([basenames count] == 0) {
    return basenames;
  }
  
  NSMutableArray *paths = [NSMutableArray arrayWithCapacity:[basenames count]];
  NSString *basename;
  
  // Convert all the |basenames| to full paths.
  GTM_FOREACH_OBJECT(basename, basenames) {
    NSString *fullPath = [directoryPath stringByAppendingPathComponent:basename];
    [paths addObject:fullPath];
  }
  
  // Check if caller wants all files, regardless of extension.
  if ([extensions count] == 0) {
    return paths;
  }
  
  return [paths pathsMatchingExtensions:extensions];
}

@end
