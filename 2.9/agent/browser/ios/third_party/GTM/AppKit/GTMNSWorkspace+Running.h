//
//  GTMNSWorkspace+Running.h
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

#import <AppKit/AppKit.h>
#import "GTMDefines.h"

// Process Dictionary keys
//
// NOTE: According to ProcessInformationCopyDictionary, the following may not be
// in the dictionary depending on the type of process:
//   kGTMWorkspaceRunningParentPSN, kGTMWorkspaceRunningFileType,
//   kGTMWorkspaceRunningFileCreator, kGTMWorkspaceRunningPID,
//   kGTMWorkspaceRunningBundlePath, kGTMWorkspaceRunningBundleIdentifier,
//   kGTMWorkspaceRunningBundleName, kGTMWorkspaceRunningBundleExecutable,
// And experience says the follow might also not be there:
//   kGTMWorkspaceRunningIsHidden

// Make sure to use numberToProcessSerialNumber: on the return values
// of these keys to get valid PSNs on both Leopard and Tiger.
// Numeric types come back as a NSNumber.
GTM_EXTERN NSString *const kGTMWorkspaceRunningPSN;  // long long
GTM_EXTERN NSString *const kGTMWorkspaceRunningParentPSN;  // long long

GTM_EXTERN NSString *const kGTMWorkspaceRunningFlavor;  // SInt32
GTM_EXTERN NSString *const kGTMWorkspaceRunningAttributes;  // SInt32
GTM_EXTERN NSString *const kGTMWorkspaceRunningFileType;  // NSString
GTM_EXTERN NSString *const kGTMWorkspaceRunningFileCreator;  // NSString
GTM_EXTERN NSString *const kGTMWorkspaceRunningPID;  // long
GTM_EXTERN NSString *const kGTMWorkspaceRunningLSBackgroundOnly;  // bool
GTM_EXTERN NSString *const kGTMWorkspaceRunningLSUIElement;  // bool
GTM_EXTERN NSString *const kGTMWorkspaceRunningIsHidden;  // bool
GTM_EXTERN NSString *const kGTMWorkspaceRunningCheckedIn;  // bool
GTM_EXTERN NSString *const kGTMWorkspaceRunningLSUIPresentationMode;  // Short
GTM_EXTERN NSString *const kGTMWorkspaceRunningBundlePath;  // NSString
GTM_EXTERN NSString *const kGTMWorkspaceRunningBundleVersion;  // NSString
// The docs for ProcessInformationCopyDictionary say we should use the constants
// instead of the raw string values, so map our values to those keys.
#define kGTMWorkspaceRunningBundleIdentifier  (NSString*)kCFBundleIdentifierKey // NSString
#define kGTMWorkspaceRunningBundleName        (NSString*)kCFBundleNameKey // NSString
#define kGTMWorkspaceRunningBundleExecutable  (NSString*)kCFBundleExecutableKey // NSString

// A category for getting information about other running processes
@interface NSWorkspace (GTMWorkspaceRunningAdditions)

// Returns a YES/NO if a process w/ the given identifier is running
- (BOOL)gtm_isAppWithIdentifierRunning:(NSString *)identifier;

// Returns a dictionary with info for our process. 
//See Process Dictionary Keys above for values
- (NSDictionary *)gtm_processInfoDictionary;

// Returns a dictionary with info for the active process. 
// See Process Dictionary Keys above for values
- (NSDictionary *)gtm_processInfoDictionaryForActiveApp;

// Returns a dictionary with info for the process. 
//See Process Dictionary Keys above for values
- (NSDictionary *)gtm_processInfoDictionaryForPID:(pid_t)pid;

// Returns a dictionary with info for the process. 
// See Process Dictionary Keys above for values
- (NSDictionary *)gtm_processInfoDictionaryForPSN:(const ProcessSerialNumberPtr)psn;

// Returns true if we were launched as a login item.
- (BOOL)gtm_wasLaunchedAsLoginItem;

// Returns true if we were launched by a given bundleid
- (BOOL)gtm_wasLaunchedByProcess:(NSString*)bundleid;

// Returns true if the PSN was found for the running app with bundleID
- (BOOL)gtm_processSerialNumber:(ProcessSerialNumber*)outPSN 
                   withBundleID:(NSString*)bundleID;

// Converts PSNs stored in NSNumbers to real PSNs
- (ProcessSerialNumber)gtm_numberToProcessSerialNumber:(NSNumber*)number;

// Returns a dictionary of launched applications like
// -[NSWorkspace launchedApplications], but does it much faster than the current
// version in Leopard which appears to regenerate the dictionary from scratch
// each time you request it. 
// NB The main runloop has to run for this to stay up to date.
- (NSArray *)gtm_launchedApplications;

@end
