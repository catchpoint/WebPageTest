//
//  GTMNSFileHandle+UniqueNameTest.m
//
//  Copyright 2010 Google Inc.
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
#import "GTMNSFileHandle+UniqueName.h"

@interface GTMNSFileHandle_UniqueNameTest : GTMTestCase
@end

@implementation GTMNSFileHandle_UniqueNameTest

- (void)testGTMUniqueFileObjectPathBasedOn {
  NSString *path = GTMUniqueFileObjectPathBasedOn(nil);
  STAssertNil(path, nil);
  path = GTMUniqueFileObjectPathBasedOn(@"/System");
  STAssertNil(path, nil);
  path = GTMUniqueFileObjectPathBasedOn(@"/Users/HappyXXXXXX");
  STAssertTrue([path hasPrefix:@"/Users/Happy"], nil);
  STAssertNotEqualObjects(path, @"/Users/HappyXXXXXX", nil);
}

- (void)testFileHandleWithUniqueNameBasedOnFinalPath {
  NSFileHandle *handle
    = [NSFileHandle gtm_fileHandleWithUniqueNameBasedOn:nil
                                              finalPath:nil];
  STAssertNil(handle, nil);

  // Try and create a file where we shouldn't be able to.
  NSString *path = nil;
  handle = [NSFileHandle gtm_fileHandleWithUniqueNameBasedOn:@"/System/HappyXXX.txt"
                                                   finalPath:&path];
  STAssertNil(handle, nil);
  STAssertNil(path, nil);

  NSFileManager *fm = [NSFileManager defaultManager];
  NSString *tempDir
    = [fm gtm_createTemporaryDirectoryBasedOn:@"GTMNSFileHandle_UniqueNameTestXXXXXX"];
  STAssertNotNil(tempDir, nil);
  BOOL isDirectory = NO;
  STAssertTrue([fm fileExistsAtPath:tempDir isDirectory:&isDirectory]
               && isDirectory, nil);

  // Test with extension
  handle = [NSFileHandle gtm_fileHandleWithUniqueNameBasedOn:@"HappyXXX.txt"
                                                 inDirectory:tempDir
                                                   finalPath:&path];
  STAssertNotNil(handle, nil);
  STAssertEqualObjects([path pathExtension], @"txt", nil);
  STAssertTrue([fm fileExistsAtPath:path], nil);

  // Test without extension
  handle = [NSFileHandle gtm_fileHandleWithUniqueNameBasedOn:@"HappyXXX"
                                                 inDirectory:tempDir
                                                   finalPath:&path];
  STAssertNotNil(handle, nil);
  STAssertEqualObjects([path pathExtension], @"", nil);
  STAssertTrue([fm fileExistsAtPath:path], nil);

  // Test passing in same name twice
  NSString *fullPath = [tempDir stringByAppendingPathComponent:@"HappyXXX"];
  NSString *newPath = nil;
  handle = [NSFileHandle gtm_fileHandleWithUniqueNameBasedOn:fullPath
                                                   finalPath:&newPath];
  STAssertNotNil(handle, nil);
  STAssertNotNil(newPath, nil);
  STAssertNotEqualObjects(path, newPath, nil);
  STAssertTrue([fm fileExistsAtPath:newPath], nil);

  // Test passing in same name twice with no template
  fullPath = [tempDir stringByAppendingPathComponent:@"Sad"];
  newPath = nil;
  handle = [NSFileHandle gtm_fileHandleWithUniqueNameBasedOn:fullPath
                                                   finalPath:&newPath];
  STAssertNotNil(handle, nil);
  STAssertNotNil(newPath, nil);

  newPath = nil;
  handle = [NSFileHandle gtm_fileHandleWithUniqueNameBasedOn:fullPath
                                                   finalPath:&newPath];
  STAssertNil(handle, nil);
  STAssertNil(newPath, nil);

#if MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5
  [fm removeFileAtPath:tempDir handler:nil];
#else //  MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5
  [fm removeItemAtPath:tempDir error:nil];
#endif

}

- (void)testFileHandleWithUniqueNameBasedOnInDirectorySearchMaskFinalPath {
  NSFileManager *fm = [NSFileManager defaultManager];
  NSString *path = nil;
  NSFileHandle *handle
    = [NSFileHandle gtm_fileHandleWithUniqueNameBasedOn:nil
                                            inDirectory:NSCachesDirectory
                                             domainMask:NSUserDomainMask
                                              finalPath:&path];
  STAssertNil(handle, nil);
  STAssertNil(path, nil);

  handle  = [NSFileHandle gtm_fileHandleWithUniqueNameBasedOn:@"HappyXXX.txt"
                                                  inDirectory:NSCachesDirectory
                                                   domainMask:NSUserDomainMask
                                                    finalPath:&path];
  STAssertNotNil(handle, nil);
  STAssertNotNil(path, nil);
  STAssertTrue([fm fileExistsAtPath:path], nil);
#if MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5
  [fm removeFileAtPath:path handler:nil];
#else //  MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5
  [fm removeItemAtPath:path error:nil];
#endif
}

@end

@interface GTMNSFileManager_UniqueNameTest : GTMTestCase
@end

@implementation GTMNSFileManager_UniqueNameTest

- (void)testCreateDirectoryWithUniqueNameBasedOn {
  NSFileManager *fm = [NSFileManager defaultManager];
  NSString *path
    = [fm gtm_createDirectoryWithUniqueNameBasedOn:@"/System/HappyXXX.txt"];
  STAssertNil(path, nil);
}

- (void)testCreateDirectoryWithUniqueNameBasedOnInDirectorySearchMask {
  NSFileManager *fm = [NSFileManager defaultManager];
  NSString *path = [fm gtm_createDirectoryWithUniqueNameBasedOn:nil
                                                    inDirectory:NSCachesDirectory
                                                     domainMask:NSUserDomainMask];
  STAssertNil(path, nil);

  path = [fm gtm_createDirectoryWithUniqueNameBasedOn:@"HappyXXX.txt"
                                          inDirectory:NSCachesDirectory
                                           domainMask:NSUserDomainMask];
  STAssertNotNil(path, nil);
  BOOL isDirectory = NO;
  STAssertTrue([fm fileExistsAtPath:path isDirectory:&isDirectory]
               && isDirectory, nil);
#if MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5
  [fm removeFileAtPath:path handler:nil];
#else //  MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5
  [fm removeItemAtPath:path error:nil];
#endif
}

@end

