//
//  GTMNSImage+Scaling.m
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

#import "GTMNSImage+Scaling.h"
#import "GTMGeometryUtils.h"

@implementation NSImage (GTMNSImageScaling)

#if MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_6
// If you are on SnowLeopard use 
// -[NSImage bestRepresentationForRect:context:hints:] 
- (NSImageRep *)gtm_bestRepresentationForSize:(NSSize)size {
  NSImageRep *bestRep = [self gtm_representationOfSize:size];
  if (bestRep) {
    return bestRep;
  } 
  NSArray *reps = [self representations];
  
  CGFloat repDistance = CGFLOAT_MAX;
  
  NSImageRep *thisRep;
  GTM_FOREACH_OBJECT(thisRep, reps) {
    CGFloat thisDistance;
    thisDistance = MIN(size.width - [thisRep size].width,
                       size.height - [thisRep size].height);  
    
    if (repDistance < 0 && thisDistance > 0) continue;
    if (ABS(thisDistance) < ABS(repDistance)
        || (thisDistance < 0 && repDistance > 0)) {
      repDistance = thisDistance;
      bestRep = thisRep;
    }
  }
  
  if (!bestRep) {
    bestRep = [self bestRepresentationForDevice:nil];
  }
  
  return bestRep;
}
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_6

- (NSImageRep *)gtm_representationOfSize:(NSSize)size {
  NSArray *reps = [self representations];
  
  NSImageRep *thisRep;
  GTM_FOREACH_OBJECT(thisRep, reps) {
    if (NSEqualSizes([thisRep size], size)) {
      return thisRep;
    }
  }
  return nil;
}

- (BOOL)gtm_createIconRepresentations {
  [self setFlipped:NO];
  [self gtm_createRepresentationOfSize:NSMakeSize(16, 16)];  
  [self gtm_createRepresentationOfSize:NSMakeSize(32, 32)];
  [self setScalesWhenResized:NO];
  return YES;
}

- (BOOL)gtm_createRepresentationOfSize:(NSSize)size { 
  if ([self gtm_representationOfSize:size]) {
    return NO;
  }

  NSBitmapImageRep *bestRep;
#if MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_6
  bestRep = (NSBitmapImageRep *)[self gtm_bestRepresentationForSize:size];
#else
  bestRep 
    = (NSBitmapImageRep *)[self bestRepresentationForRect:GTMNSRectOfSize(size)
                                                  context:nil
                                                    hints:nil];
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_6
  
  NSRect drawRect = GTMNSScaleRectToRect(GTMNSRectOfSize([bestRep size]), 
                                       GTMNSRectOfSize(size),
                                       GTMScaleProportionally,
                                       GTMRectAlignCenter);
  // Using NSSelectorFromString because CGImage isn't a declared selector
  // on Tiger, and just using straight @selector(CGImage) will cause compile
  // errors on a 10.4 SDK.
  SEL cgImageSel = NSSelectorFromString(@"CGImage");
  if ([bestRep respondsToSelector:cgImageSel]) {
    CGImageRef imageRef = (CGImageRef)[bestRep performSelector:cgImageSel];
    
    CGColorSpaceRef cspace = CGColorSpaceCreateDeviceRGB();   
    if (!cspace) return NO;
    
    CGContextRef smallContext = 
      CGBitmapContextCreate(NULL,
                            size.width,
                            size.height,
                            8,            // bits per component
                            size.width * 4, // bytes per pixel
                            cspace,
                            kCGBitmapByteOrder32Host
                            | kCGImageAlphaPremultipliedLast);
    CFRelease(cspace);
    
    if (!smallContext) return NO;
 
    
    CGContextDrawImage(smallContext, GTMNSRectToCGRect(drawRect), imageRef);
    
    CGImageRef smallImage = CGBitmapContextCreateImage(smallContext);
   
    if (smallImage) {
      NSBitmapImageRep *cgRep = 
       [[[NSBitmapImageRep alloc] initWithCGImage:smallImage] autorelease];
      [self addRepresentation:cgRep];   
      CGImageRelease(smallImage);
    } else {
      CGContextRelease(smallContext);
      return NO;
    }
    CGContextRelease(smallContext);
    return YES;
  } else {
    // This functionality is here to allow it to work under Tiger
    // It can probably only be called safely from the main thread
    NSImage* scaledImage = [[NSImage alloc] initWithSize:size];
    [scaledImage lockFocus];
    NSGraphicsContext *graphicsContext = [NSGraphicsContext currentContext];
    [graphicsContext setImageInterpolation:NSImageInterpolationHigh];
    [graphicsContext setShouldAntialias:YES];
    [bestRep drawInRect:drawRect];
    NSBitmapImageRep* iconRep = 
    [[[NSBitmapImageRep alloc] initWithFocusedViewRect:
      NSMakeRect(0, 0, size.width, size.height)] autorelease];
    [scaledImage unlockFocus];
    [scaledImage release];
    [self addRepresentation:iconRep];
    return YES; 
  }
  return NO;
}

- (void)gtm_removeRepresentationsLargerThanSize:(NSSize)size {
  NSMutableArray *repsToRemove = [NSMutableArray array];
  NSImageRep *thisRep;
  // Remove them in a second loop so we don't change things will doing the
  // initial loop.
  GTM_FOREACH_OBJECT(thisRep, [self representations]) {
    if ([thisRep size].width > size.width
        && [thisRep size].height > size.height) {
      [repsToRemove addObject:thisRep];
    }
  }
  GTM_FOREACH_OBJECT(thisRep, repsToRemove) {
    [self removeRepresentation:thisRep];
  }
}

- (NSImage *)gtm_duplicateOfSize:(NSSize)size {
  NSImage *duplicate = [[self copy] autorelease];
  [duplicate gtm_shrinkToSize:size];
  [duplicate setFlipped:NO];
  return duplicate;
}

- (void)gtm_shrinkToSize:(NSSize)size {
  [self gtm_createRepresentationOfSize:size];
  [self setSize:size];
  [self gtm_removeRepresentationsLargerThanSize:size];
}
@end
