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
static BOOL ImportProjectFile(NSMutableDictionary *attributes, 
                              NSString *pathToFile) {
  pathToFile = [pathToFile stringByAppendingPathComponent:@"project.pbxproj"];
  NSMutableSet *filenames = [[[NSMutableSet alloc] init] autorelease];
  NSMutableSet *comments = [[[NSMutableSet alloc] init] autorelease];
  BOOL wasGood = NO;
  NSDictionary *dict = [NSDictionary dictionaryWithContentsOfFile:pathToFile];
  if (dict) {
    NSDictionary *objects = [dict objectForKey:@"objects"];
    if (objects) {
      NSEnumerator *objEnumerator = [objects objectEnumerator];
      NSDictionary *object;
      while ((object = [objEnumerator nextObject])) {
        NSString *isaType = [object objectForKey:@"isa"];
        if ([isaType caseInsensitiveCompare:@"PBXFileReference"] == NSOrderedSame) {
          NSString *path = [object objectForKey:@"path"];
          if (path) {
            [filenames addObject:[path lastPathComponent]];
          }
        } else if ([isaType caseInsensitiveCompare:@"PBXNativeTarget"] == NSOrderedSame) {
          NSString *name = [object objectForKey:@"name"];
          if (name) {
            [filenames addObject:name];
          }
          name = [object objectForKey:@"productName"];
          if (name) {
            [filenames addObject:name];
          }
        }
        NSString *comment = [object objectForKey:@"comments"]; 
        if (comment) {
          [comments addObject:comment];
        }
      }
    }
  }
  if ([filenames count]) {
    NSString *description = [[filenames allObjects] componentsJoinedByString:@"\n"];
    [attributes setObject:description forKey:(NSString*)kMDItemDescription];
    wasGood = YES;
  }
  if ([comments count]) {
    NSString *comment = [[comments allObjects] componentsJoinedByString:@"\n"];
    [attributes setObject:comment forKey:(NSString*)kMDItemComment];
    wasGood = YES;
  }
  return wasGood;
}  

// Currently grabs all the filenames, target names, and product names
// and sticks them into kMDItemDescription.
// It also grabs all of the comments and sticks them into kMDItemComment.
Boolean GetMetadataForFile(void* interface, 
                           CFMutableDictionaryRef cfAttributes, 
                           CFStringRef contentTypeUTI,
                           CFStringRef cfPathToFile) {
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  NSMutableDictionary *attributes = (NSMutableDictionary*)cfAttributes;
  NSString *pathToFile = (NSString*)cfPathToFile;
  BOOL wasGood = NO;
  if (UTTypeConformsTo(contentTypeUTI, CFSTR("com.apple.xcode.project"))) {
    wasGood = ImportProjectFile(attributes, pathToFile);
  }
  [pool release];
  return wasGood == NO ? FALSE : TRUE;
}
