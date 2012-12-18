//
//  GTMPath.h
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

#if MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5
// NSFileManager has improved substantially in Leopard and beyond, so GTMPath
// is now deprecated.

// GTMPath
//
// This class represents a single, absolute file system path. The represented
// path must exist at the time of creation. This class also allows you to easily
// create new paths (or full hierarchies) based on existing GTMPath instances.
//
// Given a GTMPath instance, new files and directories can be created inside
// that path providing the instance refers to a directory. It is an error to try
// to create a file/directory from a GTMPath that represents a file (this should
// be common sense: clearly mkdir /etc/passwd/foo won't work).
//
// === Examples ===
//
// 1. This sample creates a GTMPath that references /tmp, then gets the
//    attributes for that directory.
//
//   GTMPath *tmp = [GTMPath pathWithFullPath:@"/tmp"];
//   NSDictionary *attr = [tmp attributes];
//
//
// 2. This sample creates a new directory inside /tmp named "foo".
//
//   GTMPath *tmp = [GTMPath pathWithFullPath:@"/tmp"];
//   GTMPath *foo = [tmp createDirectoryName:@"foo" mode:0755];
//
//
// 3. This sample creates a GTMPath instance that represents a user's ~/Library
//    folder.
//
//   GTMPath *library = [GTMPath pathWithFullPath:@"/Users/bob/Library"];
//   ...
//   
//
// 4. This sample creates a directory hierarchy, where each level has its own
//    mode. Notice that the return value from these -create* methods is the
//    GTMPath that was just created. This allows these creation calls to be
//    chained together enabling easy creation of directory hierarchies. 
//    This is one of the big benefits of this class.
//
//   GTMPath *tmp = [GTMPath pathWithFullPath:@"/tmp"];
//   GTMPath *baz = [[[tmp createDirectoryName:@"foo" mode:0755]
//                        createDirectoryName:@"bar" mode:0756]
//                       createDirectoryName:@"baz" mode:0757];
//
@interface GTMPath : NSObject {
 @private
  NSString *fullPath_;
}

// Returns a GTMPath instance that represents the full path specified by
// |fullPath|. Note that |fullPath| MUST be an absolute path.
+ (id)pathWithFullPath:(NSString *)fullPath;

// Returns a GTMPath instance that represents the full path specified by
// |fullPath|. Note that |fullPath| MUST be an absolute path. This method is the
// designated initializer.
- (id)initWithFullPath:(NSString *)fullPath;

// Returns the name of this GTMPath instance. This is not the full path. It is
// just the component name of this GTMPath instance. This is equivalent to 
// the Unix basename(3) function.
- (NSString *)name;

// Returns this path's parent GTMPath. This method will ONLY (and always) return
// nil when |name| is "/". In otherwords, parent will be nil IFF this GTMPath
// instance represents the root path, because "/" doesn't really have a parent.
- (GTMPath *)parent;

// Returns YES if this GTMPath represents a directory.
- (BOOL)isDirectory;

// Returns YES if this GTMPath instance represents the root path "/".
- (BOOL)isRoot;

// Returns the file system attributes of the path represented by this GTMPath
// instance. See -[NSFileManager fileAttributesAtPath:...] for details.
- (NSDictionary *)attributes;

// Returns a string representation of the absolute path represented by this 
// GTMPath instance.
- (NSString *)fullPath;

@end


// Methods for creating files and directories inside a GTMPath instance. These
// methods are only allowed to be called on GTMPath instances that represent
// directories. See the NSFileManager documentation for details about the 
// |attributes| parameters.
@interface GTMPath (GTMPathGeneration)

// Creates a new directory with the specified mode or attributes inside the 
// current GTMPath instance. If the creation is successful, a GTMPath for the 
// newly created directory is returned. Otherwise, nil is returned.
- (GTMPath *)createDirectoryName:(NSString *)name mode:(mode_t)mode;
- (GTMPath *)createDirectoryName:(NSString *)name
                      attributes:(NSDictionary *)attributes;

// Creates a new file with the specified mode or attributes inside the 
// current GTMPath instance. If the creation is successful, a GTMPath for the 
// newly created file is returned. Otherwise, nil is returned. |data| is the
// data to put in the file when created.
- (GTMPath *)createFileName:(NSString *)name mode:(mode_t)mode;
- (GTMPath *)createFileName:(NSString *)name
                 attributes:(NSDictionary *)attributes;
- (GTMPath *)createFileName:(NSString *)name
                 attributes:(NSDictionary *)attributes
                       data:(NSData *)data;

@end

#endif //  MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5
