//
//  GTMPath.m
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

#import "GTMPath.h"
#import "GTMDefines.h"

#if MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5
// NSFileManager has improved substantially in Leopard and beyond, so GTMPath
// is now deprecated.

@implementation GTMPath

+ (id)pathWithFullPath:(NSString *)fullPath {
  return [[[self alloc] initWithFullPath:fullPath] autorelease];
}

- (id)init {
  return [self initWithFullPath:nil];
}

- (id)initWithFullPath:(NSString *)fullPath {
  if ((self = [super init])) {
    fullPath_ = [[fullPath stringByResolvingSymlinksInPath] copy];
    if (![fullPath_ isAbsolutePath] || [self attributes] == nil) {
      [self release];
      return nil;
    }
  }
  
  return self;
}

- (void)dealloc {
  [fullPath_ release];
  [super dealloc];
}

- (NSString *)description {
  return [self fullPath];
}

- (NSString *)name {
  return [fullPath_ lastPathComponent];
}

- (GTMPath *)parent {
  if ([self isRoot]) return nil;
  NSString *parentPath = [fullPath_ stringByDeletingLastPathComponent];
  return [[self class] pathWithFullPath:parentPath];
}

- (BOOL)isDirectory {
  BOOL isDir = NO;
  BOOL exists = [[NSFileManager defaultManager]
                 fileExistsAtPath:fullPath_ isDirectory:&isDir];
  return exists && isDir;
}

- (BOOL)isRoot {
  return [fullPath_ isEqualToString:@"/"];
}

- (NSDictionary *)attributes {
  NSFileManager *mgr = [NSFileManager defaultManager];
  NSDictionary *attributes = [mgr fileAttributesAtPath:fullPath_ 
                                              traverseLink:NO];
  return attributes;
}

- (NSString *)fullPath {
  return [[fullPath_ copy] autorelease];
}

@end


@implementation GTMPath (GTMPathGeneration)

- (GTMPath *)createDirectoryName:(NSString *)name mode:(mode_t)mode {
  NSDictionary *attributes =
    [NSDictionary dictionaryWithObject:[NSNumber numberWithInt:mode]
                                forKey:NSFilePosixPermissions];
  return [self createDirectoryName:name attributes:attributes];
}

- (GTMPath *)createDirectoryName:(NSString *)name
                      attributes:(NSDictionary *)attributes {
  if ([name length] == 0) return nil;
  
  // We first check to see if the requested directory alread exists by trying
  // to create a GTMPath from the desired new path string. Only if the path 
  // doesn't already exist do we attempt to create it. If the path already
  // exists, we will end up returning a GTMPath for the pre-existing path.
  NSString *newPath = [fullPath_ stringByAppendingPathComponent:name];
  GTMPath *nascentPath = [GTMPath pathWithFullPath:newPath];
  if (nascentPath && ![nascentPath isDirectory]) {
    return nil;  // Return nil because the path exists, but it's not a dir
  }
  
  if (!nascentPath) {
    NSFileManager *mgr = [NSFileManager defaultManager];
    BOOL created = [mgr createDirectoryAtPath:newPath attributes:attributes];
    nascentPath = created ? [GTMPath pathWithFullPath:newPath] : nil;
  }

  return nascentPath;
}

- (GTMPath *)createFileName:(NSString *)name mode:(mode_t)mode {
  NSDictionary *attributes =
    [NSDictionary dictionaryWithObject:[NSNumber numberWithInt:mode]
                                forKey:NSFilePosixPermissions];
  return [self createFileName:name attributes:attributes];
}

- (GTMPath *)createFileName:(NSString *)name
                 attributes:(NSDictionary *)attributes {
  return [self createFileName:name attributes:attributes data:[NSData data]];
}

- (GTMPath *)createFileName:(NSString *)name
                 attributes:(NSDictionary *)attributes
                       data:(NSData *)data {
  if ([name length] == 0) return nil;
  
  // See createDirectoryName:attribute: for some high-level notes about what and
  // why this method does what it does.
  NSString *newPath = [fullPath_ stringByAppendingPathComponent:name];
  GTMPath *nascentPath = [GTMPath pathWithFullPath:newPath];
  if (nascentPath != nil && [nascentPath isDirectory]) {
    return nil;  // Return nil because the path exists, but it's a dir
  }
  
  if (nascentPath == nil) {
    BOOL created = [[NSFileManager defaultManager]
                    createFileAtPath:newPath
                            contents:data
                          attributes:attributes];
    nascentPath = created ? [GTMPath pathWithFullPath:newPath] : nil;
  }
  
  return nascentPath;
}

@end

#endif //  MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5
