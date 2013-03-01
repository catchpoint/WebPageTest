//
//  GTMXcodeQuickLinksItem.m
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
#import "PBXAppDelegate.h"
#import "GTMDefines.h"

// Handles all the quick link menu items in the help menu.
// Creates a separator and two menu items with submenu items
// linking to useful URLS.

NSString* kGoogleStyleGuideMenuItem = @"Google Style Guides";
NSString* kGoogleOtherSitesMenuItem = @"Other Useful Sites";

@interface GTMXcodeStyleGuideSeparatorItem : GTMXcodeMenuItem
@end

@implementation GTMXcodeStyleGuideSeparatorItem
+ (void)load {
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  [GTMXcodePlugin registerMenuItem:[[[self alloc] init] autorelease]];
  [pool release];
}

- (NSString*)title {
  return @"-";
}

- (NSMenu*)insertionMenu {
  return [[NSApp delegate] helpMenu];
}

- (int)insertionIndex {
  return 14;
}
@end

@interface GTMXcodeStyleGuidesItem : GTMXcodeMenuItem
@end

@implementation GTMXcodeStyleGuidesItem
+ (void)load {
  [GTMXcodePlugin registerMenuItem:[[[self alloc] init] autorelease]];
}

- (NSString*)title {
  return kGoogleStyleGuideMenuItem;
}

- (NSMenu*)insertionMenu {
  return [[NSApp delegate] helpMenu];
}

- (int)insertionIndex {
  return 15;
}

- (void)wasInserted:(NSMenuItem*)item {
  NSMenu *menu = [[[NSMenu alloc] initWithTitle:kGoogleStyleGuideMenuItem] autorelease];
  [item setSubmenu:menu];
}
@end

@interface GTMXcodeOtherUsefulSitesItem : GTMXcodeMenuItem
@end

@implementation GTMXcodeOtherUsefulSitesItem
+ (void)load {
  [GTMXcodePlugin registerMenuItem:[[[self alloc] init] autorelease]];
}

- (NSString*)title {
  return kGoogleOtherSitesMenuItem;
}

- (NSMenu*)insertionMenu {
  return [[NSApp delegate] helpMenu];
}

- (int)insertionIndex {
  return 16;
}

- (void)wasInserted:(NSMenuItem*)item {
  NSMenu *menu = [[[NSMenu alloc] initWithTitle:kGoogleOtherSitesMenuItem] autorelease];
  [item setSubmenu:menu];
}
@end

@interface GTMXcodeOpenUrlItem : GTMXcodeMenuItem {
  NSString *title_;
  NSString *parent_;
  NSString *url_;
  int index_;
}
- (id)initWithTitle:(NSString*)title parent:(NSString*)parent url:(NSString*)url index:(int)index;
@end

@implementation GTMXcodeOpenUrlItem
+ (void)load {
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  struct OpenUrlItemDesc {
    NSString *title;
    NSString *parent;
    NSString *url;
    int index;
  };

  struct OpenUrlItemDesc items [] = {
    {
      @"Objective-C Style Guide",
      kGoogleStyleGuideMenuItem,
      @"http://google-styleguide.googlecode.com/svn/trunk/objcguide.xml",
      0
    },
    {
      @"C++ Style Guide",
      kGoogleStyleGuideMenuItem,
      @"http://google-styleguide.googlecode.com/svn/trunk/cppguide.xml",
      1
    },
    {
      @"Radar",
      kGoogleOtherSitesMenuItem,
      @"https://bugreport.apple.com/cgi-bin/WebObjects/RadarWeb.woa",
      0
    },
    {
      @"TN2124 Mac OS X Debugging Magic",
      kGoogleOtherSitesMenuItem,
      @"http://developer.apple.com/mac/library/technotes/tn2004/tn2124.html",
      1
    },
  };

  for(size_t i = 0; i < sizeof(items) / sizeof(struct OpenUrlItemDesc); ++i) {
    GTMXcodeOpenUrlItem *item = [[[self alloc] initWithTitle:items[i].title
                                                     parent:items[i].parent
                                                        url:items[i].url
                                                      index:items[i].index]
                                autorelease];
    [GTMXcodePlugin registerMenuItem:item];
  }
  [pool release];
}

- (id)initWithTitle:(NSString*)title
             parent:(NSString*)parent
                url:(NSString*)url
              index:(int)idx {
  if ((self = [super init])) {
    title_ = title;
    parent_ = parent;
    url_ = url;
    index_ = idx;
  }
  return self;
}

- (NSString*)title {
  return title_;
}

- (NSString*)urlToOpen {
  return url_;
}

- (NSString*)parentMenuName {
  return parent_;
}

- (void)action:(id)sender {
  NSURL *url = [NSURL URLWithString:[self urlToOpen]];
  [[NSWorkspace sharedWorkspace] openURL:url];
}

- (NSMenu*)insertionMenu {
  NSMenu *menu = [[NSApp delegate] helpMenu];
  NSInteger menuIndex = [menu indexOfItemWithTitle:[self parentMenuName]];
  NSMenuItem *menuItem = [menu itemAtIndex:menuIndex];
  return [menuItem submenu];
}

- (int)depth {
  return 2;
}

- (int)insertionIndex {
  return index_;
}

- (BOOL)allowGDTMenuIcon {
  return NO;
}
@end




