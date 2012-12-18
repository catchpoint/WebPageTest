//
//  GTMCALayer+UnitTesting.m
//  
//  Category for making unit testing of graphics/UI easier.
//  Allows you to save a view out to a image file, and compare a view
//  with a previously stored representation to make sure it hasn't changed.
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

#import "GTMCALayer+UnitTesting.h"
#import "GTMGarbageCollection.h"

@implementation CALayer (GTMUnitTestingAdditions) 

//  Returns an image containing a representation of the object
//  suitable for use in comparing against a master image.
//  NB this means that all colors should be from "NSDevice" color space
//  Does all of it's drawing with smoothfonts and antialiasing off
//  to avoid issues with font smoothing settings and antialias differences
//  between ppc and x86.
//
//  Returns:
//    an image of the object
- (CGImageRef)gtm_unitTestImage {
  CGRect bounds = [self bounds];
  CGSize size = CGSizeMake(CGRectGetWidth(bounds), CGRectGetHeight(bounds));
  CGContextRef context = GTMCreateUnitTestBitmapContextOfSizeWithData(size,
                                                                      NULL);
  _GTMDevAssert(context, @"Couldn't create context");
  
  // iPhone renders are flipped
  CGAffineTransform transform = CGAffineTransformMakeTranslation(0, size.height);
  transform = CGAffineTransformScale(transform, 1.0, -1.0);
  CGContextConcatCTM(context, transform);
  
  [self renderInContext:context];
  CGImageRef image = CGBitmapContextCreateImage(context);
  CFRelease(context);
  return (CGImageRef)GTMCFAutorelease(image);
}

//  Encodes the state of an object in a manner suitable for comparing
//  against a master state file so we can determine whether the
//  object is in a suitable state.
//
//  Arguments:
//    inCoder - the coder to encode our state into
- (void)gtm_unitTestEncodeState:(NSCoder*)inCoder {
  [super gtm_unitTestEncodeState:inCoder];
  [inCoder encodeBool:[self isHidden] forKey:@"LayerIsHidden"];
  [inCoder encodeBool:[self isDoubleSided] forKey:@"LayerIsDoublesided"];
  [inCoder encodeBool:[self isOpaque] forKey:@"LayerIsOpaque"];
  [inCoder encodeFloat:[self opacity] forKey:@"LayerOpacity"];
  // TODO: There is a ton more we can add here. What are we interested in?
  if ([self gtm_shouldEncodeStateForSublayers]) {
    int i = 0;
    for (CALayer *subLayer in [self sublayers]) {
      [inCoder encodeObject:subLayer 
                     forKey:[NSString stringWithFormat:@"CALayerSubLayer %d", i]];
      i = i + 1;
    }
  }
}

//  Returns whether gtm_unitTestEncodeState should recurse into sublayers
//
//  Returns:
//    should gtm_unitTestEncodeState pick up sublayer state.
- (BOOL)gtm_shouldEncodeStateForSublayers {
  BOOL value = YES;
  if([self.delegate respondsToSelector:@selector(gtm_shouldEncodeStateForSublayersOfLayer:)]) {
    value = [self.delegate gtm_shouldEncodeStateForSublayersOfLayer:self];
  }
  return value;
}

@end
