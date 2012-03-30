//
//  GTMNSWorkspace+RunningTest.m
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
#import "GTMNSWorkspace+Running.h"
#import <unistd.h>

@interface GTMNSWorkspace_RunningTest : GTMTestCase
@end

@implementation GTMNSWorkspace_RunningTest

- (void)testBasics {
  NSWorkspace *ws = [NSWorkspace sharedWorkspace];
  
  // Test an app that should be running
  STAssertTrue([ws gtm_isAppWithIdentifierRunning:@"com.apple.finder"], nil);
  
  // Check to make sure that we are on the list
  STAssertTrue([ws gtm_isAppWithIdentifierRunning:
                @"com.google.GTMUIUnitTestingHarness"], nil);
  STAssertFalse([ws gtm_isAppWithIdentifierRunning:@"com.google.nothing"], nil);
  
  NSDictionary *processInfo = [ws gtm_processInfoDictionary];
  STAssertNotNil(processInfo, nil);
  
  BOOL wasLaunchedAsLoginItem = [ws gtm_wasLaunchedAsLoginItem];
  STAssertFalse(wasLaunchedAsLoginItem, nil);
  
  pid_t pid = getpid();
  NSDictionary *processInfo2 = [ws gtm_processInfoDictionaryForPID:pid];
  STAssertNotNil(processInfo2, nil);
  STAssertEqualObjects(processInfo, processInfo2, nil);
  
  ProcessSerialNumber num = { 0, 0 };
  BOOL gotPSN = [ws gtm_processSerialNumber:&num
                               withBundleID:@"com.apple.finder"];
  STAssertTrue(gotPSN, nil);
  STAssertGreaterThan(num.highLongOfPSN + num.lowLongOfPSN, (UInt32)0, nil);
  gotPSN = [ws gtm_processSerialNumber:&num
                          withBundleID:@"bad.bundle.id"];
  STAssertFalse(gotPSN, nil);

  gotPSN = [ws gtm_processSerialNumber:NULL
                          withBundleID:nil];
  STAssertFalse(gotPSN, nil);
  
  processInfo = [ws gtm_processInfoDictionaryForActiveApp];
  STAssertNotNil(processInfo, nil);
  
  // Only check the keys that have to be there
  NSString *const keys[] = {
    kGTMWorkspaceRunningPSN,
    kGTMWorkspaceRunningFlavor, kGTMWorkspaceRunningAttributes,
    kGTMWorkspaceRunningLSBackgroundOnly,
    kGTMWorkspaceRunningLSUIElement,
    kGTMWorkspaceRunningCheckedIn,
    kGTMWorkspaceRunningBundleVersion,
    kGTMWorkspaceRunningLSUIPresentationMode,
    
  };
  for (size_t i = 0; i < sizeof(keys) / sizeof(NSString *); ++i) {
    NSString *const key = keys[i];
    STAssertNotNil([processInfo objectForKey:key], 
                   @"Couldn't get %@ from %@", key, processInfo);
  }
}

@end
