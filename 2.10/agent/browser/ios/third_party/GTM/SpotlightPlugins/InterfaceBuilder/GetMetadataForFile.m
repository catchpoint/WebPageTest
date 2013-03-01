//
//  GetMetadataForFile.m
//
//  Copyright 2008 Google Inc.
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

#import <Foundation/Foundation.h>
#import "GTMGarbageCollection.h"

static BOOL AddStringsToTextContent(NSSet *stringSet, 
                                    NSMutableDictionary *attributes) {
  BOOL wasGood = NO;
  if ([stringSet count]) {
    NSString *allStrings = [[stringSet allObjects] componentsJoinedByString:@"\n"];
    NSString *oldContent = [attributes objectForKey:(NSString*)kMDItemTextContent];
    if (oldContent) {
      allStrings = [NSString stringWithFormat:@"%@\n%@", allStrings, oldContent];
    }
    [attributes setObject:allStrings forKey:(NSString*)kMDItemTextContent];
    wasGood = YES;
  }
  return wasGood;
}

static BOOL ExtractClasses(NSDictionary *ibToolData,
                           NSMutableDictionary *attributes) {
  NSString *classesKey = @"com.apple.ibtool.document.classes";
  NSDictionary *classes = [ibToolData objectForKey:classesKey];
  NSMutableSet *classSet = [NSMutableSet set];
  NSUserDefaults *ud = [NSUserDefaults standardUserDefaults]; 
  NSArray *classPrefixesToIgnore 
    = [ud objectForKey:@"classPrefixesToIgnore"];
  if (!classPrefixesToIgnore) {
    classPrefixesToIgnore = [NSArray arrayWithObjects:
                             @"IB", 
                             @"FirstResponder", 
                             @"NS", 
                             @"Web", 
                             nil];
    [ud setObject:classPrefixesToIgnore forKey:@"classPrefixesToIgnore"];
    [ud synchronize];
  }
  NSDictionary *entry;
  NSEnumerator *entryEnum = [classes objectEnumerator];
  while ((entry = [entryEnum nextObject])) {
    NSString *classStr = [entry objectForKey:@"class"];
    if (classStr) {
      NSString *prefix;
      NSEnumerator *classPrefixesToIgnoreEnum 
        = [classPrefixesToIgnore objectEnumerator];
      while (classStr && (prefix = [classPrefixesToIgnoreEnum nextObject])) {
        if ([classStr hasPrefix:prefix]) {
          classStr = nil;
        }
      }
      if (classStr) {
        [classSet addObject:classStr];
      }
    }
  }
  return AddStringsToTextContent(classSet, attributes);
}

static BOOL ExtractLocalizableStrings(NSDictionary *ibToolData,
                                      NSMutableDictionary *attributes) {
  NSString *localStrKey = @"com.apple.ibtool.document.localizable-strings";
  NSDictionary *strings = [ibToolData objectForKey:localStrKey];
  NSMutableSet *stringSet = [NSMutableSet set];
  NSDictionary *entry;
  NSEnumerator *entryEnum = [strings objectEnumerator];
  while ((entry = [entryEnum nextObject])) {
    NSEnumerator *stringEnum = [entry objectEnumerator];
    NSString *string;
    while ((string = [stringEnum nextObject])) {
      [stringSet addObject:string];
    }
  }
  return AddStringsToTextContent(stringSet, attributes);
}

static BOOL ExtractConnections(NSDictionary *ibToolData,
                               NSMutableDictionary *attributes) {
  NSString *connectionsKey = @"com.apple.ibtool.document.connections";
  NSDictionary *connections = [ibToolData objectForKey:connectionsKey];
  NSMutableSet *connectionsSet = [NSMutableSet set];
  NSDictionary *entry;
  NSEnumerator *entryEnum = [connections objectEnumerator];
  while ((entry = [entryEnum nextObject])) {
    NSString *typeStr = [entry objectForKey:@"type"];
    NSString *value = nil;
    if (typeStr) {
      if ([typeStr isEqualToString:@"IBBindingConnection"]) {
        value = [entry objectForKey:@"keypath"];
      } else if ([typeStr isEqualToString:@"IBCocoaOutletConnection"] ||
                 [typeStr isEqualToString:@"IBCocoaActionConnection"]) {
        value = [entry objectForKey:@"label"];
      }
      if (value) {
        [connectionsSet addObject:value];
      }
    }
  }
  return AddStringsToTextContent(connectionsSet, attributes);
}

static NSString *FindIBTool(void) {
  NSString *result = nil;

  NSString *possiblePaths[] = {
    @"/usr/bin/ibtool",
    @"/Developer/usr/bin/ibtool",
  };

  NSFileManager *fm = [NSFileManager defaultManager];
  BOOL isDir;
  for (size_t i = 0; i < (sizeof(possiblePaths) / sizeof(NSString*)); ++i) {
    if ([fm fileExistsAtPath:possiblePaths[i] isDirectory:&isDir] &&
        !isDir) {
      result = possiblePaths[i];
      break;
    }
  }

  return result;
}

static NSData *CommandOutput(NSString *cmd) {
  NSMutableData *result = [NSMutableData data];

  // NOTE: we use popen/pclose in here instead of NSTask because NSTask uses
  // a delayed selector to clean up the process it spawns, so since we have
  // no runloop it gets ungly trying to clean up the zombie process.

  FILE *fp;
  char buffer[2048];
  size_t len;
  if((fp = popen([cmd UTF8String], "r"))) {
    // spool it all in
    while ((len = fread(buffer, 1, sizeof(buffer), fp)) > 0) {
      [result appendBytes:buffer length:len];
    }
    // make sure we get a clean exit status
    if (pclose(fp) != 0) {
      result = nil;
    }
  }
  return result;
}

static BOOL ImportIBFile(NSMutableDictionary *attributes, 
                         NSString *pathToFile) {
  BOOL wasGood = NO;
  NSString *ibtoolPath = FindIBTool();
  if (ibtoolPath) {
    NSString *cmdString 
      = @"%@ --classes --localizable-strings --connections \"%@\"";
    NSString *cmd = [NSString stringWithFormat:cmdString, ibtoolPath, pathToFile];
    NSData *data = CommandOutput(cmd);
    if (data) {
      NSDictionary *results 
        = GTMCFAutorelease(CFPropertyListCreateFromXMLData(NULL, 
                                                           (CFDataRef)data ,
                                                           kCFPropertyListImmutable,
                                                           NULL));
      if (results && [results isKindOfClass:[NSDictionary class]]) {
        wasGood = ExtractClasses(results, attributes);
        wasGood |= ExtractLocalizableStrings(results, attributes);
        wasGood |= ExtractConnections(results, attributes);
      }
    }
  }
  
  return wasGood;
}

// Grabs all of the classes, localizable strings, bindings, outlets 
// and actions and sticks them into kMDItemTextContent.
Boolean GetMetadataForFile(void* interface, 
                           CFMutableDictionaryRef cfAttributes, 
                           CFStringRef contentTypeUTI,
                           CFStringRef cfPathToFile) {
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  NSMutableDictionary *attributes = (NSMutableDictionary*)cfAttributes;
  NSString *pathToFile = (NSString*)cfPathToFile;
  BOOL wasGood = NO;
  if (UTTypeConformsTo(contentTypeUTI, 
                       CFSTR("com.apple.interfacebuilder.document"))
      || UTTypeConformsTo(contentTypeUTI, 
                          CFSTR("com.apple.interfacebuilder.document.cocoa"))
      || UTTypeConformsTo(contentTypeUTI, 
                          CFSTR("com.apple.interfacebuilder.document.carbon"))) {
    wasGood = ImportIBFile(attributes, pathToFile);
  }
  [pool release];
  return  wasGood == NO ? FALSE : TRUE;
}
