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

#import <AppKit/AppKit.h>
#import <Carbon/Carbon.h>

static BOOL ImportScriptBundle(NSMutableDictionary *attributes, 
                               NSString *path) {
  NSBundle *scriptBundle = [NSBundle bundleWithPath:path];
  NSString *descriptionPath = [scriptBundle pathForResource:@"description" 
                                                     ofType:@"rtfd"];
  NSAttributedString *attrString = nil;
  if (descriptionPath) {
    attrString = [[[NSAttributedString alloc] initWithPath:descriptionPath
                                        documentAttributes:NULL] autorelease];
  }
  BOOL wasGood = NO;
  if (attrString) {
    NSString *description = [attrString string];
    [attributes setObject:description forKey:(NSString*)kMDItemDescription];
    wasGood = YES;
  }
  
  NSArray *scripts = [scriptBundle pathsForResourcesOfType:@"scpt" 
                                               inDirectory:@"Scripts"];
  NSEnumerator *scriptEnum = [scripts objectEnumerator];
  NSString *scriptPath;
  NSMutableArray *scriptSources = [NSMutableArray array]; 
  while ((scriptPath = [scriptEnum nextObject])) {
    NSURL *scriptURL = [NSURL fileURLWithPath:scriptPath];
    NSDictionary *error;
    NSAppleScript *script 
      = [[[NSAppleScript alloc] initWithContentsOfURL:scriptURL
                                                error:&error]
         autorelease];
    NSString *scriptSource = [script source];
    if (scriptSource) {
      [scriptSources addObject:scriptSource];
    }
  }
  if ([scriptSources count]) {
    NSString *source = [scriptSources componentsJoinedByString:@"\n"];
    [attributes setObject:source forKey:(NSString*)kMDItemTextContent];
    wasGood = YES;
  }
  return wasGood;
}

static BOOL ImportScript(NSMutableDictionary *attributes, 
                         NSString *path) {
  NSURL *fileURL = [NSURL fileURLWithPath:path];
  FSRef ref;
  BOOL wasGood = NO;
  if (CFURLGetFSRef((CFURLRef)fileURL, &ref)) {
    ResFileRefNum resFile = FSOpenResFile(&ref, fsRdPerm);
    if (resFile) {
      const ResID kScriptDescriptionResID = 1128;
      ResFileRefNum curResFile = CurResFile();
      UseResFile(resFile);
      Handle res = Get1Resource('TEXT', kScriptDescriptionResID);
      if (res) {
        NSString *descString 
          = [[[NSString alloc]initWithBytes:(char*)(*res)
                                     length:GetHandleSize(res) 
                                   encoding:NSMacOSRomanStringEncoding] autorelease];
        ReleaseResource(res);
        if (descString) {
          [attributes setObject:descString forKey:(NSString*)kMDItemDescription];
          wasGood = YES;
        }
      }
      UseResFile(curResFile);
      CloseResFile(resFile);
    }
   
    NSDictionary *error;
    NSAppleScript *script = [[[NSAppleScript alloc] initWithContentsOfURL:fileURL
                                                                    error:&error]
                             autorelease];
    NSString *scriptSource = [script source];
    if (scriptSource) {
      [attributes setObject:scriptSource forKey:(NSString*)kMDItemTextContent];
      wasGood = YES;
    }
  }
  return wasGood;
}

// Currently grabs the script description and puts it into kMDItemDescription.
// Grabs the script code and puts it into kMDItemTextContent.
Boolean GetMetadataForFile(void* interface, 
                           CFMutableDictionaryRef cfAttributes, 
                           CFStringRef cfContentTypeUTI,
                           CFStringRef cfPathToFile) {
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  NSMutableDictionary *attributes = (NSMutableDictionary*)cfAttributes;
  NSString *pathToFile = (NSString*)cfPathToFile;
  BOOL wasGood = NO;
  if (UTTypeConformsTo(cfContentTypeUTI, CFSTR("com.apple.applescript.scriptbundle"))) {
    wasGood = ImportScriptBundle(attributes, pathToFile);
  } else if (UTTypeConformsTo(cfContentTypeUTI, CFSTR("com.apple.applescript.script"))) {
    wasGood = ImportScript(attributes, pathToFile);
  }
  [pool release];
  return wasGood ? TRUE : FALSE;
}
