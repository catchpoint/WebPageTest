//
//  GTMPathTest.m
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

#import "GTMSenTestCase.h"
#import "GTMPath.h"
#import "GTMUnitTestDevLog.h"
#import "GTMNSFileHandle+UniqueName.h"

#if MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5
// NSFileManager has improved substantially in Leopard and beyond, so GTMPath
// is now deprecated.

@interface GTMPathTest : GTMTestCase {
 @private
  NSString *testDirectory_;
}
@end

@implementation GTMPathTest

- (void)setUp {
  NSFileManager *mgr = [NSFileManager defaultManager];
  testDirectory_ 
    = [[mgr gtm_createTemporaryDirectoryBasedOn:@"GTMPathTestXXXXXX"] retain];
  
  STAssertNotNil(testDirectory_, nil);
}

- (void)tearDown {
  // Make sure it's safe to remove this directory before nuking it.
  STAssertNotNil(testDirectory_, nil);
  STAssertNotEqualObjects(testDirectory_, @"/", nil);
  [[NSFileManager defaultManager] removeFileAtPath:testDirectory_ handler:nil];
  [testDirectory_ release];
}

- (void)testBasicCreation {
  GTMPath *path = nil;
  
  path = [[[GTMPath alloc] init] autorelease];
  STAssertNil(path, nil);
  
  path = [GTMPath pathWithFullPath:@"/"];
  STAssertNotNil(path, nil);
  STAssertNil([path parent], nil);
  STAssertTrue([path isRoot], nil);
  STAssertTrue([path isDirectory], nil);
  STAssertEqualObjects([path name], @"/", nil);
  STAssertEqualObjects([path fullPath], @"/", nil);
}

- (void)testRecursiveInitialization {
  GTMPath *path = nil;
  
  path = [GTMPath pathWithFullPath:nil];
  STAssertNil(path, nil);
  
  path = [GTMPath pathWithFullPath:@""];
  STAssertNil(path, nil);
  
  path = [GTMPath pathWithFullPath:@"etc"];
  STAssertNil(path, nil);
  
  path = [GTMPath pathWithFullPath:@"/"];
  STAssertNotNil(path, nil);
  STAssertNil([path parent], nil);
  STAssertTrue([path isRoot], nil);
  STAssertTrue([path isDirectory], nil);
  STAssertEqualObjects([path name], @"/", nil);
  STAssertEqualObjects([path fullPath], @"/", nil);
  
  path = [GTMPath pathWithFullPath:@"/etc"];
  STAssertNotNil(path, nil);
  STAssertEqualObjects([path name], @"etc", nil);
  STAssertEqualObjects([path fullPath], @"/etc", nil);
  STAssertTrue([path isDirectory], nil);
  STAssertFalse([path isRoot], nil);
  STAssertNotNil([path parent], nil);
  STAssertTrue([[path parent] isRoot], nil);
  
  path = [GTMPath pathWithFullPath:@"/etc/passwd"];
  STAssertNotNil(path, nil);
  STAssertEqualObjects([path name], @"passwd", nil);
  STAssertEqualObjects([path fullPath], @"/etc/passwd", nil);
  STAssertFalse([path isDirectory], nil);
  STAssertFalse([path isRoot], nil);
  STAssertNotNil([path parent], nil);
  STAssertFalse([[path parent] isRoot], nil);
  STAssertTrue([[path parent] isDirectory], nil);
  STAssertTrue([[[path parent] parent] isRoot], nil);
  
  STAssertTrue([[path description] length] > 1, nil);
}

- (void)testCreationWithNonExistentPath {
  GTMPath *path = nil;
  
  path = [GTMPath pathWithFullPath:@" "];
  STAssertNil(path, nil);
  
  path = [GTMPath pathWithFullPath:@"/abcxyz"];
  STAssertNil(path, nil);
  
  path = [GTMPath pathWithFullPath:@"/etc/foo"];
  STAssertNil(path, nil);
  
  path = [GTMPath pathWithFullPath:@"/foo/bar/baz"];
  STAssertNil(path, nil);
}

- (void)testDirectoryCreation {
  GTMPath *tmp = [GTMPath pathWithFullPath:testDirectory_];
  GTMPath *path = nil;
  
  NSString *fooPath = [[tmp fullPath] stringByAppendingPathComponent:@"foo"];
  path = [GTMPath pathWithFullPath:fooPath];
  STAssertNil(path, nil);
  
  path = [tmp createDirectoryName:@"foo" mode:0555];
  STAssertNotNil(path, nil);
  STAssertEqualObjects([path name], @"foo", nil);
  // filePosixPermissions has odd return types in different SDKs, so we use
  // STAssertTrue to avoid the macros type checks from choking us.
  STAssertTrue([[path attributes] filePosixPermissions] == 0555, nil);
  STAssertTrue([path isDirectory], nil);
  STAssertFalse([path isRoot], nil);
  
  // Trying to create a file where a dir already exists should fail
  path = [tmp createFileName:@"foo" mode:0555];
  STAssertNil(path, nil);
  
  // Calling create again should succeed
  path = [tmp createDirectoryName:@"foo" mode:0555];
  STAssertNotNil(path, nil);
  STAssertEqualObjects([path name], @"foo", nil);
  STAssertTrue([[path attributes] filePosixPermissions] == 0555, nil);
  STAssertTrue([path isDirectory], nil);
  STAssertFalse([path isRoot], nil);
  
  GTMPath *foo = [GTMPath pathWithFullPath:fooPath];
  STAssertNotNil(foo, nil);
  STAssertEqualObjects([path name], @"foo", nil);
  STAssertTrue([[path attributes] filePosixPermissions] == 0555, nil);
  STAssertTrue([path isDirectory], nil);
  STAssertFalse([path isRoot], nil);
}

- (void)testFileCreation {
  GTMPath *tmp = [GTMPath pathWithFullPath:testDirectory_];
  GTMPath *path = nil;
  
  NSString *fooPath = [[tmp fullPath] stringByAppendingPathComponent:@"foo"];
  path = [GTMPath pathWithFullPath:fooPath];
  STAssertNil(path, nil);
    
  path = [tmp createFileName:@"foo" mode:0555];
  STAssertNotNil(path, nil);
  STAssertEqualObjects([path name], @"foo", nil);
  STAssertTrue([[path attributes] filePosixPermissions] == 0555, nil);
  STAssertFalse([path isDirectory], nil);
  STAssertFalse([path isRoot], nil);
  
  // Trying to create a dir where a file already exists should fail.
  path = [tmp createDirectoryName:@"foo" mode:0555];
  STAssertNil(path, nil);
  
  // Calling create again should succeed
  path = [tmp createFileName:@"foo" mode:0555];
  STAssertNotNil(path, nil);
  STAssertEqualObjects([path name], @"foo", nil);
  STAssertTrue([[path attributes] filePosixPermissions] == 0555, nil);
  STAssertFalse([path isDirectory], nil);
  STAssertFalse([path isRoot], nil);
  
  GTMPath *foo = [GTMPath pathWithFullPath:fooPath];
  STAssertNotNil(foo, nil);
  STAssertEqualObjects([path name], @"foo", nil);
  STAssertTrue([[path attributes] filePosixPermissions] == 0555, nil);
  STAssertFalse([path isDirectory], nil);
  STAssertFalse([path isRoot], nil);
  
  // Make sure we can't create a file/directory rooted off of |foo|, since it's
  // not a directory.
  path = [foo createFileName:@"bar" mode:0555];
  STAssertNil(path, nil);
  path = [foo createDirectoryName:@"bar" mode:0555];
  STAssertNil(path, nil);
}

- (void)testHierarchyCreation {
  GTMPath *tmp = [GTMPath pathWithFullPath:testDirectory_];
  NSString *fooPath = [[tmp fullPath] stringByAppendingPathComponent:@"foo"];
  GTMPath *path = [GTMPath pathWithFullPath:fooPath];
  STAssertNil(path, nil);
  
  path = [[[tmp createDirectoryName:@"foo" mode:0755]
                  createDirectoryName:@"bar" mode:0756]
                    createDirectoryName:@"baz" mode:0757];
  STAssertNotNil(path, nil);
  
  // Check "baz"
  STAssertEqualObjects([path name], @"baz", nil);
  STAssertTrue([[path attributes] filePosixPermissions] == 0757, nil);
  
  // Check "bar"
  path = [path parent];
  STAssertEqualObjects([path name], @"bar", nil);
  STAssertTrue([[path attributes] filePosixPermissions] == 0756, nil);
  
  // Check "foo"
  path = [path parent];
  STAssertEqualObjects([path name], @"foo", nil);
  STAssertTrue([[path attributes] filePosixPermissions] == 0755, nil);
}

@end

#endif //  MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5
