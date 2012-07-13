//
//  GTMNSImage+SearchCache.h
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

// This category provides convenience methods for image initialization based
// on creating an image by searching the following locations:
//
// * A specified bundle
// * Main bundle / +[NSImage imageNamed]
// * An exact path for an image
// * An exact path for any file (using the icon)
// * An app bundle id (using the icon)
// * A file type as .extension,  'OSTYPE' (in single quotes), or UTI
// * An icon in the system icon bundle
//
// TODO(alcor): this class should have basic MRU cache
//

#import <AppKit/AppKit.h>

@interface NSImage (GTMNSImageSearchCache)
+ (NSImage *)gtm_imageWithPath:(NSString *)path;
+ (NSImage *)gtm_imageNamed:(NSString *)name;
+ (NSImage *)gtm_imageNamed:(NSString *)name forBundle:(NSBundle *)bundle;
@end
