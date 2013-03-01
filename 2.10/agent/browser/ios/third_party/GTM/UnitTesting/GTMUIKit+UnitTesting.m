//
//  GTMUIKit+UnitTesting.m
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

#import "GTMUIKit+UnitTesting.h"
#import "GTMCALayer+UnitTesting.h"
#import "GTMDefines.h"

#if !GTM_IPHONE_SDK
#error This file is for iPhone use only
#endif // GTM_IPHONE_SDK

//  A view that allows you to delegate out drawing using the formal
//  GTMUnitTestViewDelegate protocol above. This is useful when writing up unit
//  tests for visual elements.
//  Your test will often end up looking like this:
//  - (void)testFoo {
//   GTMAssertDrawingEqualToFile(self, CGSizeMake(200, 200), @"Foo", nil, nil);
//  }
//  and your testSuite will also implement the unitTestViewDrawRect method to do
//  it's actual drawing. The above creates a view of size 200x200 that draws
//  it's content using |self|'s unitTestViewDrawRect method and compares it to
//  the contents of the file Foo.tif to make sure it's valid
@implementation GTMUnitTestView

- (id)initWithFrame:(CGRect)frame 
             drawer:(id<GTMUnitTestViewDrawer>)drawer 
        contextInfo:(void*)contextInfo{
  self = [super initWithFrame:frame];
  if (self != nil) {
    drawer_ = [drawer retain];
    contextInfo_ = contextInfo;
  }
  return self;
}

- (void)dealloc {
  [drawer_ release];
  [super dealloc];
}

- (void)drawRect:(CGRect)rect {
  [drawer_ gtm_unitTestViewDrawRect:rect contextInfo:contextInfo_];
}

@end

@implementation UIView (GTMUnitTestingAdditions) 

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
  CALayer* layer = [self layer];
  return [layer gtm_unitTestImage];
}

//  Encodes the state of an object in a manner suitable for comparing
//  against a master state file so we can determine whether the
//  object is in a suitable state.
//
//  Arguments:
//    inCoder - the coder to encode our state into
- (void)gtm_unitTestEncodeState:(NSCoder*)inCoder {
  [super gtm_unitTestEncodeState:inCoder];
  [inCoder encodeBool:[self isHidden] forKey:@"ViewIsHidden"];
  CALayer* layer = [self layer];
  if (layer) {
    [layer gtm_unitTestEncodeState:inCoder];
  }
  if ([self gtm_shouldEncodeStateForSubviews]) {
    int i = 0;
    for (UIView *subview in [self subviews]) {
      [inCoder encodeObject:subview 
                     forKey:[NSString stringWithFormat:@"ViewSubView %d", i]];
      i++;
    }
  }
}

//  Returns whether gtm_unitTestEncodeState should recurse into subviews
//
//  Returns:
//    should gtm_unitTestEncodeState pick up subview state.
- (BOOL)gtm_shouldEncodeStateForSubviews {
  return YES;
}

- (BOOL)gtm_shouldEncodeStateForSublayersOfLayer:(CALayer*)layer {
  return NO;
}
@end

@implementation UIImage (GTMUnitTestingAdditions)
- (CGImageRef)gtm_unitTestImage {
  return [self CGImage];
}
@end
