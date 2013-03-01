//
//  GTMXcodeCreateUnitTextExecutable.m
//
//  Copyright 2007-2009 Google Inc.
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

#import "GTMXcodeMenuItem.h"
#import "PBXAppDelegate.h"
#import "PBXExtendedApplication.h"
#import "GTMXcodePlugin.h"
#import "NSTask+Script.h"
#import "GTMMethodCheck.h"

// Implements the Create Unit Test Executable menu item
@interface GTMXcodeCreateUnitTextExecutable : GTMXcodeMenuItem
@end

@implementation GTMXcodeCreateUnitTextExecutable
GTM_METHOD_CHECK(NSTask, gtm_runScript:withArguments:);

+ (void)load {
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  [GTMXcodePlugin registerMenuItem:[[[self alloc] init] autorelease]];
  [pool release];
}

- (NSString*)title {
  return @"Create UnitTest Executable";
}

- (void)action:(id)sender {
  [NSTask gtm_runScript:@"CreateUnitTestExecutable" withArguments:nil];
}

- (BOOL)validateMenuItem:(id <NSMenuItem>)menuItem {
  return [NSApp currentProject] != nil;
}

- (NSMenu*)insertionMenu {
  return [[NSApp delegate] projectMenu];
}

- (int)insertionIndex {
  return 15;
}
@end
