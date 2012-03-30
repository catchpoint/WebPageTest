//
//  GTMXcodeGCovItem.m
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
#import "PBXExtendedApplication.h"
#import "PBXProject.h"
#import "PBXTarget.h"
#import "GTMMethodCheck.h"
#import "NSTask+Script.h"
#import "GTMDefines.h"

// Indices for our various menu items
enum {
  kGTMXcodeGCovSeparatorItemIndex = 19,
  kGTMXcodeGCovEnableCoverageItemIndex,
  kGTMXcodeGCovCheckCoverageMenuItemIndex,
  kGTMXcodeGCovCleanCoverageMenuItemIndex,
  kGTMXcodeGCovCleanCoverageAndBuildMenuItemIndex,
};

// The different methods of open coverage provided.
typedef enum {
  kGTMXcodeGCovOpenFile,
  kGTMXcodeGCovOpenTarget,
  kGTMXcodeGCovOpenBuildFolder,
} GTMXcodeGCovOpenMode;

typedef enum {
  kGTMXcodeGCovCleanDataTarget,
  kGTMXcodeGCovCleanDataBuildFolder,
} GTMXcodeGCovCleanMode;

// Some paths that we resolve
NSString *const kObjectsDirPath
  = @"$(OBJECT_FILE_DIR)-$(BUILD_VARIANTS)";
NSString *const kObjectsDirNoArchPath
  = @"$(OBJECT_FILE_DIR)-$(BUILD_VARIANTS)";
NSString *const kBuildRootDirPath = @"$(BUILD_ROOT)";

// the title for our menu items w/ submenus
NSString *kShowCodeCoverageForMenuTitle = @"Show Code Coverage For";
NSString *kCleanCodeCoverageDataForMenuTitle = @"Clean Code Coverage Data For";

// Separator above the GCov menu items
@interface GTMXcodeGCovSeparatorItem : GTMXcodeMenuItem
@end

// Enable Code Coverage menu item
@interface GTMXcodeGCovEnableItem : GTMXcodeMenuItem
@end

// Check coverage for menu
@interface GTMXcodeGCovCoverageMenuItem : GTMXcodeMenuItem {
  NSString *title_;
  int index_;
}
- (id)initWithTitle:(NSString *)title index:(int)index;
@end

// Check coverage for option
@interface GTMXcodeGCovCheckCoverageItem : GTMXcodeMenuItem {
  NSString *title_;
  GTMXcodeGCovOpenMode mode_;
  int index_;
}
- (id)initWithTitle:(NSString *)title
               mode:(GTMXcodeGCovOpenMode)mode
              index:(int)index;
@end

// Clean coverage data item
@interface GTMXcodeGCovCleanItem : GTMXcodeMenuItem {
  NSString *title_;
  GTMXcodeGCovCleanMode mode_;
  int index_;
}
- (id)initWithTitle:(NSString *)title
               mode:(GTMXcodeGCovCleanMode)mode
              index:(int)index;
@end

@interface GTMXcodeGCovCleanAndBuildItem : GTMXcodeMenuItem
@end

// Category for checking if gcov is enabled on current target
@interface PBXExtendedApplication (GTMXcodeGCovMenuItemAdditions)
- (BOOL)gtm_gcovEnabledForActiveTarget;
@end

@interface NSString (GTMXcodeGCovItem)
- (BOOL)gtm_isCOrObjCFile;
@end

@implementation GTMXcodeGCovSeparatorItem
+ (void)load {
  [GTMXcodePlugin registerMenuItem:[[[self alloc] init] autorelease]];
}

- (NSString*)title {
  return @"-";
}

- (NSMenu*)insertionMenu {
  return [[NSApp delegate] buildMenu];
}

- (int)insertionIndex {
  return kGTMXcodeGCovSeparatorItemIndex;
}
@end

@implementation GTMXcodeGCovCoverageMenuItem
+ (void)load {
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  GTMXcodeGCovCoverageMenuItem *item
    = [[[self alloc] initWithTitle:kShowCodeCoverageForMenuTitle
                             index:kGTMXcodeGCovCheckCoverageMenuItemIndex]
       autorelease];
  [GTMXcodePlugin registerMenuItem:item];
  item = [[[self alloc] initWithTitle:kCleanCodeCoverageDataForMenuTitle
                                index:kGTMXcodeGCovCleanCoverageMenuItemIndex]
          autorelease];
  [GTMXcodePlugin registerMenuItem:item];
  [pool release];
}

- (id)initWithTitle:(NSString *)title index:(int)idx {
  if ((self = [super init])) {
    title_ = title;
    index_ = idx;
  }
  return self;
}

- (NSString*)title {
  return title_;
}

- (NSMenu*)insertionMenu {
  return [[NSApp delegate] buildMenu];
}

- (int)insertionIndex {
  return index_;
}

- (void)wasInserted:(NSMenuItem*)item {
  NSMenu *menu = [[[NSMenu alloc] initWithTitle:title_] autorelease];
  [item setSubmenu:menu];
}
@end

@implementation GTMXcodeGCovCheckCoverageItem
GTM_METHOD_CHECK(NSTask, gtm_runScript:withArguments:);

+ (void)load {
  struct OpenItemDesc {
    NSString *title;
    GTMXcodeGCovOpenMode mode;
    int index;
  };

  struct OpenItemDesc items [] = {
    { @"Selected file", kGTMXcodeGCovOpenFile, 0 },
    { @"Current target", kGTMXcodeGCovOpenTarget, 1 },
    { @"Current project", kGTMXcodeGCovOpenBuildFolder, 2 },
  };
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  for(size_t i = 0; i < sizeof(items) / sizeof(struct OpenItemDesc); ++i) {
    GTMXcodeGCovCheckCoverageItem *item
      = [[[self alloc] initWithTitle:items[i].title
                                mode:items[i].mode
                               index:items[i].index] autorelease];
    [GTMXcodePlugin registerMenuItem:item];
  }
  [pool release];
}

- (id)initWithTitle:(NSString *)title
               mode:(GTMXcodeGCovOpenMode)mode
              index:(int)idx {
  if ((self = [super init])) {
    title_ = title;
    mode_ = mode;
    index_ = idx;
  }
  return self;
}

- (NSMenu*)insertionMenu {
  NSMenu *menu = [[NSApp delegate] buildMenu];
  NSInteger menuIndex
    = [menu indexOfItemWithTitle:kShowCodeCoverageForMenuTitle];
  NSMenuItem *menuItem = [menu itemAtIndex:menuIndex];
  return [menuItem submenu];
}

- (NSString*)title {
  return title_;
}

- (void)action:(id)sender {
  NSString *pathToOpen = nil;
  PBXProject *project = [NSApp currentProject];
  PBXTarget *target = [project activeTarget];
  NSString *buildConfig = [project activeBuildConfigurationName];
  if (mode_ == kGTMXcodeGCovOpenFile) {
    NSArray *selectedPaths = [self selectedPaths];
    NSString *selectedPath = nil;
    if ([selectedPaths count] == 1) {
      NSString *path = [selectedPaths objectAtIndex:0];
      if ([path gtm_isCOrObjCFile]) {
        selectedPath = path;
      }
      if (selectedPath) {
        NSString *srcFileName = [selectedPath lastPathComponent];
        NSUInteger fileLength = [srcFileName length];
        NSUInteger extensionLength = [[srcFileName pathExtension] length];
        NSString *subStr
          = [srcFileName substringToIndex:(fileLength - extensionLength)];
        NSString *gcdaFileName = [NSString stringWithFormat:@"%@gcda", subStr];
        NSString *objectsDir = [self pathByExpandingString:kObjectsDirPath
                                     forBuildConfiguration:buildConfig
                                                  ofTarget:target];
        NSString *activeArchitecture = [project activeArchitecture];
        NSString *archPath 
          = [objectsDir stringByAppendingPathComponent:activeArchitecture];
        NSString *gcdaPath
          = [archPath stringByAppendingPathComponent:gcdaFileName];
        pathToOpen = gcdaPath;
      }
    }
  } else if (mode_ == kGTMXcodeGCovOpenTarget) {
    NSString *objectsDirNoArch 
      = [self pathByExpandingString:kObjectsDirNoArchPath
              forBuildConfiguration:buildConfig
                           ofTarget:target];    
    pathToOpen = objectsDirNoArch;
  } else if (mode_ == kGTMXcodeGCovOpenBuildFolder) {
    NSString *buildRootDir = [self pathByExpandingString:kBuildRootDirPath
                                   forBuildConfiguration:buildConfig
                                                ofTarget:target];    
    pathToOpen = buildRootDir;
  }
  if (pathToOpen) {
    [NSTask gtm_runScript:@"opencoverage" withArguments:pathToOpen, nil];
  }
}

- (BOOL)validateMenuItem:(NSMenuItem*)menuItem {
  BOOL isGood = NO;
  switch (mode_) {
    case kGTMXcodeGCovOpenFile:
      if ([NSApp gtm_gcovEnabledForActiveTarget]) {
        NSArray *selectedPaths = [self selectedPaths];
        if ([selectedPaths count] == 1) {
          NSString *path = [selectedPaths objectAtIndex:0];
          if ([path gtm_isCOrObjCFile]) {
            isGood = YES;
          }
        }
      }
      break;
    case kGTMXcodeGCovOpenTarget:
      isGood = [NSApp gtm_gcovEnabledForActiveTarget];
      break;
    case kGTMXcodeGCovOpenBuildFolder:
      isGood = ([NSApp currentProject] != nil);
      break;
  }
  return isGood;
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


@implementation GTMXcodeGCovEnableItem
GTM_METHOD_CHECK(NSTask, gtm_runScript:withArguments:);
+ (void)load {
  [GTMXcodePlugin registerMenuItem:[[[self alloc] init] autorelease]];
}

- (NSMenu*)insertionMenu {
  return [[NSApp delegate] buildMenu];
}

- (NSString*)title {
  return @"";
}

- (void)action:(id)sender {
  NSString *enabled = [NSApp gtm_gcovEnabledForActiveTarget] ? @"NO" : @"YES";
  [NSTask gtm_runScript:@"EnableGCov" withArguments:enabled, nil];
}

- (BOOL)validateMenuItem:(NSMenuItem*)menuItem {
  BOOL isGood = NO;
  NSString *title = @"Turn Code Coverage On";
  PBXProject *project = [NSApp currentProject];
  if (project) {
    isGood = YES;
    if ([NSApp gtm_gcovEnabledForActiveTarget]) {
      title = @"Turn Code Coverage Off";
    }
  }
  [menuItem setTitle:title];
  return isGood;
}

- (int)insertionIndex {
  return kGTMXcodeGCovEnableCoverageItemIndex;
}
@end

@implementation GTMXcodeGCovCleanItem
GTM_METHOD_CHECK(NSTask, gtm_runScript:withArguments:);
+ (void)load {
  struct CleanItemDesc {
    NSString *title;
    GTMXcodeGCovCleanMode mode;
    int index;
  };

  struct CleanItemDesc items [] = {
    { @"Current target", kGTMXcodeGCovCleanDataTarget, 0 },
    { @"Current project", kGTMXcodeGCovCleanDataBuildFolder, 1 },
  };

  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  for(size_t i = 0; i < sizeof(items) / sizeof(struct CleanItemDesc); ++i) {
    GTMXcodeGCovCleanItem *item = [[[self alloc] initWithTitle:items[i].title
                                                         mode:items[i].mode
                                                        index:items[i].index]
                                  autorelease];
    [GTMXcodePlugin registerMenuItem:item];
  }
  [pool release];
}

- (id)initWithTitle:(NSString *)title
               mode:(GTMXcodeGCovCleanMode)mode
              index:(int)idx {
  if ((self = [super init])) {
    title_ = title;
    mode_ = mode;
    index_ = idx;
  }
  return self;
}

- (NSMenu*)insertionMenu {
  NSMenu *menu = [[NSApp delegate] buildMenu];
  NSInteger menuIndex
    = [menu indexOfItemWithTitle:kCleanCodeCoverageDataForMenuTitle];
  NSMenuItem *menuItem = [menu itemAtIndex:menuIndex];
  return [menuItem submenu];
}

- (NSString*)title {
  return title_;
}

- (void)action:(id)sender {
  NSString *pathToClean = nil;
  PBXProject *project = [NSApp currentProject];
  PBXTarget *target = [project activeTarget];
  NSString *buildConfig = [project activeBuildConfigurationName];
  if (mode_ == kGTMXcodeGCovCleanDataTarget) {
    NSString *objectsDirNoArch
      = [self pathByExpandingString:kObjectsDirNoArchPath
              forBuildConfiguration:buildConfig
                           ofTarget:target];    
    pathToClean = objectsDirNoArch;
  } else if (mode_ == kGTMXcodeGCovCleanDataBuildFolder) {
    NSString *buildRootDir = [self pathByExpandingString:kBuildRootDirPath
                                         forBuildConfiguration:buildConfig
                                                      ofTarget:target];   
    pathToClean = buildRootDir;
  }
  if (pathToClean) {
    [NSTask gtm_runScript:@"ResetGCov" withArguments:pathToClean, nil];
  }
}

- (BOOL)validateMenuItem:(NSMenuItem*)menuItem {
  BOOL isGood = NO;
  switch (mode_) {
    case kGTMXcodeGCovCleanDataTarget:
      isGood = [NSApp gtm_gcovEnabledForActiveTarget];
      break;
    case kGTMXcodeGCovCleanDataBuildFolder:
      isGood = ([NSApp currentProject] != nil);
      break;
  }
  return isGood;
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

@implementation GTMXcodeGCovCleanAndBuildItem
+ (void)load {
  [GTMXcodePlugin registerMenuItem:[[[self alloc] init] autorelease]];
}

- (NSString*)title {
  return @"Clean Project Coverage and Build";
}

- (NSMenu*)insertionMenu {
  return [[NSApp delegate] buildMenu];
}

- (int)insertionIndex {
  return kGTMXcodeGCovCleanCoverageAndBuildMenuItemIndex;
}

- (BOOL)validateMenuItem:(NSMenuItem*)menuItem {
  return [NSApp gtm_gcovEnabledForActiveTarget];
}

- (void)action:(id)sender {
  NSString *pathToClean = nil;
  PBXProject *project = [NSApp currentProject];
  PBXTarget *target = [project activeTarget];
  NSString *buildConfig = [project activeBuildConfigurationName];
  NSString *buildRootDir = [self pathByExpandingString:kBuildRootDirPath
                                 forBuildConfiguration:buildConfig
                                              ofTarget:target];    
  pathToClean = buildRootDir;
  if (pathToClean) {
    [NSTask gtm_runScript:@"CleanCovAndBuild" withArguments:pathToClean, nil];
  }
}

@end

@implementation PBXExtendedApplication (GTMXcodeGCovMenuItemAdditions)
- (BOOL)gtm_gcovEnabledForActiveTarget {
  BOOL answer = NO;
  PBXProject *project = [NSApp currentProject];
  PBXTarget *target = [project activeTarget];
  NSString *buildConfig = [project activeBuildConfigurationName];
  if (project && target && buildConfig) {
    NSString *setting = [target stringByExpandingString:@"$(OTHER_LDFLAGS)"
                             forBuildConfigurationNamed:buildConfig];
    answer = [setting rangeOfString:@"-lgcov"].length != 0;
  }
  return answer;
}
@end

@implementation NSString (GTMXcodeGCovItem)
- (BOOL)gtm_isCOrObjCFile {
  return [self hasSuffix:@".c"] || [self hasSuffix:@".cpp"]
  || [self hasSuffix:@".cc"] || [self hasSuffix:@".cp"]
  || [self hasSuffix:@".m"] || [self hasSuffix:@".mm"];
}
@end

