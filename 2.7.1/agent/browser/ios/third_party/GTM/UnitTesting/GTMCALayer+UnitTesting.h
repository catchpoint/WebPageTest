//
//  GTMCALayer+UnitTesting.h
//
//  Code for making unit testing of graphics/UI easier. Generally you
//  will only want to look at the macros:
//    GTMAssertDrawingEqualToFile
//    GTMAssertViewRepEqualToFile
//  and the protocol GTMUnitTestCALayerDrawer. When using these routines
//  make sure you are using device colors and not calibrated/generic colors
//  or else your test graphics WILL NOT match across devices/graphics cards.
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

#import <QuartzCore/QuartzCore.h>
#import "GTMNSObject+UnitTesting.h"

//  Category for making unit testing of graphics/UI easier.

//  Allows you to take a state of a view. Supports both image and state.
//  See GTMNSObject+UnitTesting.h for details.
@interface CALayer (GTMUnitTestingAdditions) <GTMUnitTestingImaging>
//  Returns whether gtm_unitTestEncodeState should recurse into sublayers
//
//  Returns:
//    should gtm_unitTestEncodeState pick up sublayer state.
- (BOOL)gtm_shouldEncodeStateForSublayers;
@end

@interface NSObject (GTMCALayerUnitTestingDelegateMethods)
// Delegate method that allows a delegate for a layer to
// decide whether we should recurse 
- (BOOL)gtm_shouldEncodeStateForSublayersOfLayer:(CALayer*)layer;
@end
