//
//  GTMXcodePlugin.m
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

#import "GTMXcodePlugin.h"
#import "GTMXcodeMenuItem.h"
#import "PBXPreferencesModule.h"
#import "GTMXcodePreferences.h"
#import "GTMDefines.h"

@interface GTMXcodePlugin (PrivateMethods)

// Called when the preference panel has been loaded so we can set up our
// preference pane.
- (void)preferencesPanelDidLoadNotification:(NSNotification *)notification;

// Called when we start tracking the menu
- (void)begunTracking:(NSNotification *)notification;

// Called whenever the pref for showing the menuitem icon changes
- (void)updateMenuIcons:(NSNotification *)notification;

// the image to use for our menu items
- (NSImage *)imageForMenuItems;
@end

// Our dictionary of menu items to add
static NSMutableDictionary *gRegisteredMenuItems = nil;

static NSMutableArray *gRegisteredClasses = nil;

@implementation GTMXcodePlugin
+ (void)registerMenuItem:(id)item {
  @synchronized([self class]) {
    static int gTag = 0xDADE;
    if (!gRegisteredMenuItems) {
      gRegisteredMenuItems = [[NSMutableDictionary alloc] init];
    }
    if (item) {
      [gRegisteredMenuItems setObject:item
                               forKey:[NSNumber numberWithInt:gTag++]];
    }
  }
}

+ (void)registerSwizzleClass:(Class)cls {
  @synchronized([self class]) {
    if (!gRegisteredClasses) {
      gRegisteredClasses = [[NSMutableArray alloc] init];
    }
    if (cls) {
      [gRegisteredClasses addObject:cls];
    }
  }
}

- (id)init {
  self = [super init];
  if (!self) return nil;

  NSBundle *bundle = [NSBundle bundleForClass:[self class]];
  NSString *version = [bundle objectForInfoDictionaryKey:@"CFBundleVersion"];
  NSLog(@"GTMXcodePlugin loaded (%@)", version);

  NSNotificationCenter *nc = [NSNotificationCenter defaultCenter];

  [nc addObserver:self
         selector:@selector(preferencesPanelDidLoadNotification:)
             name:PBXPreferencesPanelDidLoadNotification
           object:nil];

  [nc addObserver:self
         selector:@selector(begunTracking:)
             name:NSMenuDidBeginTrackingNotification
           object:[NSApp mainMenu]];

  [nc addObserver:self
         selector:@selector(updateMenuIcons:)
             name:GTMXcodePreferencesMenuItemPrefChanged
           object:nil];

  NSEnumerator *enumerator = [gRegisteredClasses objectEnumerator];
  Class cls;
  while ((cls = [enumerator nextObject])) {
    [[[cls alloc] init] autorelease];
  }
  return self;
}

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  [gRegisteredMenuItems removeAllObjects];
  [gRegisteredMenuItems release];
  [super dealloc];
}


- (void)preferencesPanelDidLoadNotification:(NSNotification *)notification {
  GTMXcodePreferences *prefs = [[[GTMXcodePreferences alloc] init] autorelease];
  [[PBXPreferencesModule sharedPreferences] addPreferenceNamed:@"Google"
                                                         owner:prefs];
}

- (NSImage *)imageForMenuItems {
  NSBundle *pluginBundle = [GTMXcodePlugin pluginBundle];
  NSString *path = [pluginBundle pathForResource:@"GTM"
                                          ofType:@"icns"];
  NSImage *image = [[[NSImage alloc] initWithContentsOfFile:path] autorelease];
  [image setScalesWhenResized:YES];
  [image setSize:NSMakeSize(16, 16)];
  return image;
}

- (void)begunTracking:(NSNotification *)notification {
  NSImage *image = nil;
  if ([GTMXcodePreferences showImageOnMenuItems]) {
    image = [self imageForMenuItems];
  }
  NSArray *sortedKeys
    = [gRegisteredMenuItems keysSortedByValueUsingSelector:@selector(compareDepth:)];
  NSEnumerator *keyEnum = [sortedKeys objectEnumerator];
  NSNumber *key;
  while ((key = [keyEnum nextObject])) {
    id<GTMXcodeMenuItemProtocol> item = [gRegisteredMenuItems objectForKey:key];
    NSInteger insertionIndex = [item insertionIndex];
    NSMenu *insertionMenu = [item insertionMenu];
    NSInteger itemCount = [insertionMenu numberOfItems];
    if (insertionIndex > itemCount) {
      insertionIndex = itemCount;
    }
    NSString *itemTitle = [item title];
    if ([itemTitle isEqualToString:@"-"]) {
      [insertionMenu insertItem:[NSMenuItem separatorItem]
                        atIndex:insertionIndex];
    } else {
      NSMenuItem *menuItem 
        = [insertionMenu insertItemWithTitle:[item title]
                                      action:[item actionSelector]
                               keyEquivalent:[item keyEquivalent]
                                     atIndex:insertionIndex];
      if (image && [item allowGDTMenuIcon]) {
        [menuItem setImage:image];
      }
      [menuItem setTarget:item];
      [menuItem setTag:[key intValue]];
      [item wasInserted:menuItem];
    }
  }

  // Now that we are installed, unregister us from the notification.
  NSNotificationCenter *center = [NSNotificationCenter defaultCenter];
  [center removeObserver:self 
                    name:NSMenuDidBeginTrackingNotification 
                  object:[NSApp mainMenu]];
}

- (void)updateMenuIcons:(NSNotification *)notification {
  // we use our own notification since the normal defaults one doesn't let you
  // tell which changed.
  NSImage *image = nil;
  if ([GTMXcodePreferences showImageOnMenuItems]) {
    image = [self imageForMenuItems];
  }
  NSEnumerator *keyEnum = [gRegisteredMenuItems keyEnumerator];
  NSNumber *key;
  while ((key = [keyEnum nextObject])) {
    id<GTMXcodeMenuItemProtocol> item = [gRegisteredMenuItems objectForKey:key];
    NSMenu *insertionMenu = [item insertionMenu];
    NSMenuItem *menuItem = [insertionMenu itemWithTag:[key intValue]];
    // play it safe, make sure it's the right target
    if (menuItem && (item == [menuItem target])) {
      // if the user wants images and this item should get it, then set the
      // image.  if either wasn't true, just set it to nil to clear the
      // menu.
      if (image && [item allowGDTMenuIcon]) {
        [menuItem setImage:image];
      } else {
        [menuItem setImage:nil];
      }
    }
  }
}

+ (NSBundle*)pluginBundle {
  return [NSBundle bundleForClass:self];
}

+ (float)xCodeVersion {
  NSBundle *bundle = [NSBundle mainBundle];
  id object = [bundle objectForInfoDictionaryKey:@"CFBundleShortVersionString"];
  float value = [object floatValue];
  if (!(value > 0.0)) {
    NSLog(@"Unable to get Xcode Version");
  }
  return value;
}

@end
