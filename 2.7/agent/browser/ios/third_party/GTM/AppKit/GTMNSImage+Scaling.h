//
//  GTMNSImage+Scaling.h
//
//  Scales NSImages to a variety of sizes for drawing
//
//  Copyright 2006-2008 Google Inc.
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
#import "GTMDefines.h"

@interface NSImage (GTMNSImageScaling)

// Return an existing representation of a size
- (NSImageRep *)gtm_representationOfSize:(NSSize)size;

#if MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_6
// Return the exact or next largest representation for a size
// If you are on SnowLeopard use 
// -[NSImage bestRepresentationForRect:context:hints:]
// Also, please see http://openradar.appspot.com/radar?id=394401
// and read notes in GTMNSImage+ScalingTest.m. Search for "8052200".
- (NSImageRep *)gtm_bestRepresentationForSize:(NSSize)size;
#endif

// Create a new represetation for a given size
- (BOOL)gtm_createRepresentationOfSize:(NSSize)size;

// Create 32 and 16px reps
- (BOOL)gtm_createIconRepresentations;

// Remove reps larger than a given size and create a new rep if needed
- (void)gtm_shrinkToSize:(NSSize)size;

// Remove reps larger than a given size
- (void)gtm_removeRepresentationsLargerThanSize:(NSSize)size;

// Return a dup shrunk to a given size
- (NSImage *)gtm_duplicateOfSize:(NSSize)size;
@end
