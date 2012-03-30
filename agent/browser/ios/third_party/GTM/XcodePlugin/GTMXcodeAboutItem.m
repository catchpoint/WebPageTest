//
//  GTMXcodeAboutItem.m
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
#import "GTMXcodePlugin.h"

// Handles the about GTM Xcode Plugin menu item in the Application menu.
@interface GTMXcodeAboutItem : GTMXcodeMenuItem
@end

@implementation GTMXcodeAboutItem
+ (void)load {
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  [GTMXcodePlugin registerMenuItem:[[[self alloc] init] autorelease]];
  [pool release];
}

- (NSString*)title {
  return @"About GTM Xcode Plugin";
}

- (void)action:(id)sender {
  NSBundle *mainBundle = [GTMXcodePlugin pluginBundle];
  NSString *creditsPath = [mainBundle pathForResource:@"Credits" ofType:@"rtf"];
  NSAttributedString *credits
    = [[[NSAttributedString alloc] initWithPath:creditsPath
                             documentAttributes:nil] autorelease];

  NSString *path = [mainBundle pathForResource:@"GTM"
                                        ofType:@"icns"];
  NSImage *icon = [[[NSImage alloc] initWithContentsOfFile:path] autorelease];
  NSDictionary *optionsDict = [NSDictionary dictionaryWithObjectsAndKeys:
    credits, @"Credits",
    [mainBundle objectForInfoDictionaryKey:@"CFBundleName"], 
    @"ApplicationName",
    [mainBundle objectForInfoDictionaryKey:@"NSHumanReadableCopyright"], 
    @"Copyright",
    [mainBundle objectForInfoDictionaryKey:@"CFBundleShortVersionString"], 
    @"ApplicationVersion",
    @"", @"Version",
    icon, @"ApplicationIcon",
    nil];
  [NSApp orderFrontStandardAboutPanelWithOptions:optionsDict];
}

- (NSMenu*)insertionMenu {
  NSMenu *rootMenu = [NSApp mainMenu];
  NSMenuItem *appleMenuItem = [rootMenu itemAtIndex:0];
  return [appleMenuItem submenu];
}

- (int)insertionIndex {
  return 1;
}
@end
