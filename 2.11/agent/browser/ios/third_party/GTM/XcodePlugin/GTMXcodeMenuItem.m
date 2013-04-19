//
//  GTMXcodeMenuItem.m
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
#import "GTMNSEnumerator+Filter.h"
#import "PBXAppDelegate.h"
#import "PBXProject.h"
#import "PBXTarget.h"
#import "GTMMethodCheck.h"
#import "GTMDefines.h"

static NSString *const kGTMSrcRootPath = @"$(SRCROOT)/";

@implementation GTMXcodeMenuItem

GTM_METHOD_CHECK(NSEnumerator, gtm_filteredEnumeratorByMakingEachObjectPerformSelector:withObject:);
GTM_METHOD_CHECK(NSEnumerator, gtm_enumeratorByMakingEachObjectPerformSelector:withObject:);

- (NSString*)keyEquivalent {
  return @"";
}

- (NSMenu*)insertionMenu {
  NSMenu *rootMenu = [NSApp mainMenu];
  NSInteger googleIndex = [rootMenu indexOfItemWithTitle:@"Google Scripts"];
  NSMenuItem *googleMenuItem = [rootMenu itemAtIndex:googleIndex];
  return [googleMenuItem submenu];
}

- (SEL)actionSelector {
  return @selector(action:);
}

- (void)action:(id)sender {
  NSBeep();
}

- (int)insertionIndex {
  return 0;
}

- (NSString*)title {
  return @"Unnamed";
}

- (int)depth {
  return 1;
}

- (NSComparisonResult)compareDepth:(id<GTMXcodeMenuItemProtocol>)item {
  int itemDepth = [item depth];
  int selfDepth = [self depth];
  
  if (selfDepth > itemDepth) {
    return NSOrderedDescending;
  } else if (selfDepth == itemDepth) {
    int itemInsertionIndex = [item insertionIndex];
    int selfInsertionIndex = [self insertionIndex];
    if (selfInsertionIndex > itemInsertionIndex) {
      return NSOrderedDescending;
    } else if (selfInsertionIndex == itemInsertionIndex) {
      return NSOrderedSame;
    } else {
      return NSOrderedAscending;
    }
  } else {
    return NSOrderedAscending;
  }
}

- (NSArray*)selectedPaths {
  NSArray *paths = nil;
  PBXWindowController *controller = [[NSApp mainWindow] windowController];
  if (controller) {
    PBXModule *activeModule = [controller activeModule];
    if ([activeModule conformsToProtocol:@protocol(XCSelectionSource)]) {
      XCProjectBasedSelection *selection 
        = (XCProjectBasedSelection *)[activeModule xcSelection];
      if ([selection isKindOfClass:[XCProjectBasedSelection class]]) {
        NSArray* selectionItems = [selection items];
        if (selectionItems) {
          NSEnumerator *pathEnum = [selectionItems objectEnumerator];
          pathEnum 
            = [pathEnum gtm_filteredEnumeratorByMakingEachObjectPerformSelector:@selector(isMemberOfClass:)
                                                                     withObject:NSClassFromString(@"PBXFileReference")];
          pathEnum 
            = [pathEnum gtm_enumeratorByMakingEachObjectPerformSelector:@selector(resolvedAbsolutePath)
                                                             withObject:nil];
          paths = [pathEnum allObjects];
        }
      }
    }
  }
  return paths;
}  

- (void)wasInserted:(NSMenuItem*)item {
}

- (BOOL)allowGDTMenuIcon {
  return YES;
}

// Expand |path| based on |target| and |configuration|.
// If newPath is not absolute, expand kSrcRootPath and prepend it to newPath.
- (NSString *)pathByExpandingString:(NSString *)path 
              forBuildConfiguration:(NSString *)configuration
                           ofTarget:(PBXTarget *)target {
  NSString *newPath = [target stringByExpandingString:path
                           forBuildConfigurationNamed:configuration];
  if (![newPath hasPrefix:@"/"]) {
    NSString *srcRoot = [target stringByExpandingString:kGTMSrcRootPath
                             forBuildConfigurationNamed:configuration];
    if (srcRoot) {
      newPath = [srcRoot stringByAppendingString:newPath];
    }
  }
  return newPath;
}

@end
