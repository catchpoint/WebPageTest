//
//  GTMLinearRGBShading.h
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

#import <Cocoa/Cocoa.h>
#import "GTMShading.h"
#import "GTMCalculatedRange.h"

///  A shading that does returns smooth linear values for RGB.
//
///  Thus if you create a shading from 0.0->red to 1.0->blue you will get
///  \verbatim
///    - 0.5->purple
///    - 0.75->eggplant
///    - 0.25->magenta
/// \endverbatim

@interface GTMLinearRGBShading : GTMCalculatedRange <GTMShading> {
@private
  CGFunctionRef function_;  // function used to calculated shading (STRONG)
  CGColorSpaceRef colorSpace_; // colorspace used for shading (STRONG)
  BOOL isCalibrated_;  // are we using calibrated or device RGB.
  CGFloat colorValue_[4];  // the RGBA color values
}

///  Generate a shading with color |begin| at position 0.0 and color |end| at 1.0.
//
//  Args: 
//    begin: color at beginning of range
//    end: color at end of range
//    colorSpaceName: name of colorspace to draw into must be either
//                    NSCalibratedRGBColorSpace or NSDeviceRGBColorSpace
//
//  Returns:
//    a GTMLinearRGBShading
+ (id)shadingFromColor:(NSColor *)begin toColor:(NSColor *)end 
        fromSpaceNamed:(NSString*)colorSpaceName;

///  Generate a shading with a collection of colors at various positions.
//
//  Args:
//    colors: a C style array containg the colors we are adding
//    colorSpaceName: name of colorspace to draw into must be either
//                    NSCalibratedRGBColorSpace or NSDeviceRGBColorSpace
//    positions: a C style array containg the positions we want to 
//              add the colors at
//    numberOfColors: how many colors/positions we are adding
//
//  Returns:
//    a GTMLinearRGBShading
+ (id)shadingWithColors:(NSColor **)colors
         fromSpaceNamed:(NSString*)colorSpaceName
            atPositions:(CGFloat *)positions 
                  count:(NSUInteger)numberOfColors;

/// Designated initializer
//  Args:
//    colorSpaceName - name of the colorspace to use must be either
//                     NSCalibratedRGBColorSpace or NSDeviceRGBColorSpace
- (id)initWithColorSpaceName:(NSString*)colorSpaceName;

@end
