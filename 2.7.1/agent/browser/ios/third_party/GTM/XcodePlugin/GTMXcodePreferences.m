//
//  GTMXcodePreferences.m
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

#import "GTMXcodePreferences.h"
#import "GTMXcodePlugin.h"
#import "GTMDefines.h"

NSString *GTMXcodePreferencesMenuItemPrefChanged
  = @"GTMXcodePreferencesMenuItemPrefChanged";
NSString *GTMXcodeCorrectWhiteSpaceOnSave
  = @"GTMXcodeCorrectWhiteSpaceOnSave";
NSString *GTMXCodeSuppressMenuItemIcon
  = @"GTMXCodeSuppressMenuItemIcon";

@implementation GTMXcodePreferences

// Set our minimum size for the pane
- (NSSize)minModuleSize {
  return NSMakeSize(268, 80);
}

// Return our nice little icon
- (id)imageForPreferenceNamed:(id)parameter1 {
  NSBundle *bundle = [GTMXcodePlugin pluginBundle];
  NSString *path =  [bundle pathForImageResource:@"GTM"];
  NSImage *image = [[[NSImage alloc] initWithContentsOfFile:path] autorelease];
  [image setScalesWhenResized:YES];
  [image setSize:NSMakeSize(32, 32)];
  return image;
}

// This gets called everytime preferences are pulled up so that we can
// set up our state.
- (void)initializeFromDefaults {
  NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];

  // Handle menuitem icon (pref is suppress, button is show)
  // NOTE: this preference is negative, but the UI works as the positive, this
  // is done so the lack of the preference (ie-the default) will turn on the
  // icons.
  NSInteger state = NSOffState;
  if (![defaults boolForKey:GTMXCodeSuppressMenuItemIcon]) {
    state = NSOnState;
  }
  [showImageOnMenuItems_ setState:state];

  state = [defaults boolForKey:GTMXcodeCorrectWhiteSpaceOnSave] ? NSOnState
                                                                : NSOffState;
  [correctWhiteSpace_ setState:state];
}

// This gets called on Apply or OK is "hasChangesPending" returns YES.
- (void)saveChanges {
  NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];

  // Handle menuitem icon (pref is suppress, button is show)
  // NOTE: this preference is negative, but the UI works as the positive, this
  // is done so the lack of the preference (ie-the default) will turn on the
  // icons.
  BOOL newSetting = ([showImageOnMenuItems_ state] == NSOnState);
  BOOL oldSetting = ![defaults boolForKey:GTMXCodeSuppressMenuItemIcon];
  if (newSetting != oldSetting) {
    if (newSetting) {
      [defaults removeObjectForKey:GTMXCodeSuppressMenuItemIcon];
    } else {
      [defaults setBool:YES forKey:GTMXCodeSuppressMenuItemIcon];
    }
    NSNotificationCenter *nc = [NSNotificationCenter defaultCenter];
    [nc postNotificationName:GTMXcodePreferencesMenuItemPrefChanged
                      object:self];
  }

  BOOL setting = ([correctWhiteSpace_ state] == NSOnState);
  [defaults setBool:setting forKey:GTMXcodeCorrectWhiteSpaceOnSave];

  // save out our settings
  [defaults synchronize];
}


// Currently we'll always return YES as it doesn't hurt at all.
- (BOOL)hasChangesPending {
  return YES;
}

+ (BOOL)showImageOnMenuItems {
  // NOTE: this preference is negative, but the UI works as the positive, this
  // is done so the lack of the preference (ie-the default) will turn on the
  // icons.
  NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
  return ![defaults boolForKey:GTMXCodeSuppressMenuItemIcon];
}
@end
