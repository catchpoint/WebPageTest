//
//  GTMNSImage+SearchCacheTest.m
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

#import <Cocoa/Cocoa.h>

#import "GTMSenTestCase.h"

#import "GTMNSImage+SearchCache.h"
#import "GTMGeometryUtils.h"

@interface GTMNSImage_SearchCacheTest : GTMTestCase
@end

@implementation GTMNSImage_SearchCacheTest

- (void)testSearchCache {
  NSImage *testImage = [NSImage gtm_imageNamed:@"NSApplicationIcon"];  
  STAssertNotNil(testImage, nil);

  testImage = [NSImage gtm_imageNamed:@"com.apple.Xcode"];
  STAssertNotNil(testImage, nil);

#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
  // The stencil images only exist on 10.5+
  testImage = [NSImage gtm_imageNamed:NSImageNameBonjour];
  STAssertNotNil(testImage, nil);
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5

  testImage = [NSImage gtm_imageNamed:(NSString *)kUTTypeFolder];
  STAssertNotNil(testImage, nil);
  
  testImage = [NSImage gtm_imageNamed:@"~/Library"];
  STAssertNotNil(testImage, nil);
  
  testImage = [NSImage gtm_imageNamed:@"'APPL'"];
  STAssertNotNil(testImage, nil);
  
  testImage = [NSImage gtm_imageNamed:@"ponies for sale"];
  STAssertNil(testImage, nil);
  
  testImage = [NSImage gtm_imageNamed:@"/An/Invalid/Path"];
  STAssertNil(testImage, nil);
}

@end
