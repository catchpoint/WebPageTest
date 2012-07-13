//
//  GTMXcodeMenuItem.h
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

#import <Cocoa/Cocoa.h>

@class PBXTarget;

@protocol GTMXcodeMenuItemProtocol
// name of the menu item
- (NSString*)title;

// the action to perform
- (SEL)actionSelector;

// what menu to insert the item into
- (NSMenu*)insertionMenu;

// where we want the menu item inserted
- (int)insertionIndex;

// the hot key
- (NSString*)keyEquivalent;

// the depth of the item as a hierarchical menu item
// eg 0 is in the root menu, 2 is in the Root:Debug:Attach menu
- (int)depth;

// method is called when the item is inserted
- (void)wasInserted:(NSMenuItem*)item;

// allow the icon to being added to make the menus easier to find
- (BOOL)allowGDTMenuIcon;
@end

// Concrete implementation of GTMXcodeMenuItemProtocol for menu items
// to inherit from.
@interface GTMXcodeMenuItem : NSObject<GTMXcodeMenuItemProtocol>
// the default action for menu items
- (void)action:(id)sender;

// returns the array of currently "selected files" in Xcode. This can be
// the front most text document, or a selection out of the browser window.
- (NSArray*)selectedPaths;

// Expand |path| based on |target| and |configuration|.
// If newPath is not absolute, expand kSrcRootPath and prepend it to newPath.
- (NSString *)pathByExpandingString:(NSString *)path 
              forBuildConfiguration:(NSString *)configuration
                           ofTarget:(PBXTarget *)target;

// Used to figure out what order to install menu items
- (NSComparisonResult)compareDepth:(id<GTMXcodeMenuItemProtocol>)item;

@end
