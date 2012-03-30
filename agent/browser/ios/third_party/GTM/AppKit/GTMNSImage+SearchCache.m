//
//  GTMNSImage+SearchCache.m
//
//  Finds NSImages using a variety of techniques
//
//  Copyright 2009 Google Inc.
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

#import "GTMNSImage+SearchCache.h"
#import "GTMGarbageCollection.h"

@implementation NSImage (GTMNSImageSearchCache)
+ (NSImage *)gtm_imageWithPath:(NSString *)path {
  return [[[NSImage alloc] initWithContentsOfFile:path] autorelease];
}

+ (NSImage *)gtm_imageNamed:(NSString *)name {
  return [self gtm_imageNamed:name forBundle:nil];
}

+ (NSImage *)gtm_imageNamed:(NSString *)name forBundle:(NSBundle *)bundle {
  NSWorkspace *workspace = [NSWorkspace sharedWorkspace];
  NSImage *image = nil;
  
  // Check our specified bundle first
  if (!image) {
    NSString *path = [bundle pathForImageResource:name];
    if (path) image = [self gtm_imageWithPath:path];
  }
  
  // Check the main bundle and the existing NSImage namespace
  if (!image) {
    image = [NSImage imageNamed:name];
  }
  
  // Search for an image with that path
  if (!image && ([name isAbsolutePath] || [name hasPrefix:@"~"])) {
    NSString *path = [name stringByStandardizingPath];
    if ([[NSFileManager defaultManager]
          fileExistsAtPath:path]) {
      image = [self gtm_imageWithPath:path];
      if (!image) {
        image = [workspace iconForFile:path]; 
      }
    }
  }  
  // Search for a matching bundle id
  if (!image) {
    NSString *path = [workspace absolutePathForAppBundleWithIdentifier:name];
    if (path) image = [workspace iconForFile:path]; ;
  }
  
  // Search for a file .extension or 'TYPE'
  // TODO(alcor): This ALWAYS returns an image for items with ' or . as prefix
  // We might not want this
  if ([name hasPrefix:@"'"] || [name hasPrefix:@"."]) {
    image = [workspace iconForFileType:name];
  }
  
  // Search for a UTI
  if ([name rangeOfString:@"."].location != NSNotFound) {    
    NSDictionary *dict
      = GTMCFAutorelease(UTTypeCopyDeclaration((CFStringRef)name));
    NSURL *url
      = GTMCFAutorelease(UTTypeCopyDeclaringBundleURL((CFStringRef)name));
    NSString *iconName = [dict objectForKey:(NSString *)kUTTypeIconFileKey];
    
    if (url && name) {
      NSString *path
        = [[NSBundle bundleWithPath:[url path]] pathForImageResource:iconName];
      if (path)
        image = [[[NSImage alloc] initWithContentsOfFile:path] autorelease];
    }
  }
  
  return image;
}
@end
