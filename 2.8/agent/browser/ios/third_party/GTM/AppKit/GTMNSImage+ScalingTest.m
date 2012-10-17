//
//  GTMNSImage+ScalingTest.m
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

#import "GTMNSImage+Scaling.h"
#import "GTMGeometryUtils.h"

@interface GTMNSImage_ScalingTest : GTMTestCase
@end
  
@implementation GTMNSImage_ScalingTest

- (void)testScaling {
  NSImage *testImage = [NSImage imageNamed:@"NSApplicationIcon"];
  
  NSImageRep *rep = nil;
  NSRect bestRepRect = NSMakeRect(0, 0, 99, 99);
 
#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_6
  rep = [testImage bestRepresentationForRect:bestRepRect 
                                     context:nil 
                                       hints:nil]; 
#else
  rep = [testImage gtm_bestRepresentationForSize:bestRepRect.size];
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_6
  
  STAssertTrue(NSEqualSizes([rep size], NSMakeSize(128, 128)), nil);

  [testImage gtm_createIconRepresentations];
  STAssertNotNil([testImage gtm_representationOfSize:NSMakeSize(16, 16)], nil);
  STAssertNotNil([testImage gtm_representationOfSize:NSMakeSize(32, 32)], nil);
  
  NSImage *duplicate = [testImage gtm_duplicateOfSize:NSMakeSize(48, 48)];
  bestRepRect = NSMakeRect(0, 0, 48, 48);
#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_6
  rep = [duplicate bestRepresentationForRect:bestRepRect 
                                     context:nil 
                                       hints:nil]; 
#else
  rep = [duplicate gtm_bestRepresentationForSize:bestRepRect.size];
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_6
  STAssertTrue(NSEqualSizes([rep size], NSMakeSize(48, 48)), 
               @"Size is %@", NSStringFromSize([rep size]));
  
  // This should IMHO return 48,48 on both 10.6 and 10.5. It makes no sense
  // at all that it returns 32,32 on 10_6 when the above code works for 48,48.
  // rdar://8052200 "NSImage bestRepresentationForRect:context:hints: doesn't
  // return the best rep"
  // http://openradar.appspot.com/radar?id=394401
  bestRepRect = NSMakeRect(0, 0, 50, 50);
#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_6
  rep = [duplicate bestRepresentationForRect:bestRepRect 
                                     context:nil 
                                       hints:nil]; 
  STAssertFalse(NSEqualSizes([rep size], NSMakeSize(48, 48)), 
               @"Size is %@", NSStringFromSize([rep size]));
#else
  rep = [duplicate gtm_bestRepresentationForSize:bestRepRect.size];
  STAssertTrue(NSEqualSizes([rep size], NSMakeSize(48, 48)), 
               @"Size is %@", NSStringFromSize([rep size]));
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_6
  
}

@end
