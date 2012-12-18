//
//  GTMUIKit+UnitTesting.h
//
//  Code for making unit testing of graphics/UI easier. Generally you
//  will only want to look at the macros:
//    GTMAssertDrawingEqualToFile
//    GTMAssertViewRepEqualToFile
//  and the protocol GTMUnitTestViewDrawer. When using these routines
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

#import <UIKit/UIKit.h>
#import "GTMNSObject+UnitTesting.h"

@protocol GTMUnitTestViewDrawer;

//  Fails when the |a1|'s drawing in an area |a2| does not equal the image file named |a3|.
//  See the description of the GTMAssertViewRepEqualToFile macro
//  to understand how |a3| is found and written out.
//  See the description of the GTMUnitTestView for a better idea
//  how the view works.
//  Implemented as a macro to match the rest of the SenTest macros.
//
//  Args:
//    a1: The object that implements the GTMUnitTestViewDrawer protocol
//        that is doing the drawing.
//    a2: The size of the drawing
//    a3: The name of the image file to check against.
//        Do not include the extension
//    a4: contextInfo to pass to drawer
//    description: A format string as in the printf() function. 
//        Can be nil or an empty string but must be present. 
//    ...: A variable number of arguments to the format string. Can be absent.
//

#define GTMAssertDrawingEqualToFile(a1, a2, a3, a4, description, ...) \
  do { \
    id<GTMUnitTestViewDrawer> a1Drawer = (a1); \
    CGSize a2Size = (a2); \
    NSString* a3String = (a3); \
    void *a4ContextInfo = (a4); \
    CGRect frame = CGRectMake(0, 0, a2Size.width, a2Size.height); \
    GTMUnitTestView *view = [[[GTMUnitTestView alloc] initWithFrame:frame drawer:a1Drawer contextInfo:a4ContextInfo] autorelease]; \
    GTMAssertObjectImageEqualToImageNamed(view, a3String, STComposeString(description, ##__VA_ARGS__)); \
  } while(0)

//  Category for making unit testing of graphics/UI easier.

//  Allows you to take a state of a view. Supports both image and state.
//  See GTMNSObject+UnitTesting.h for details.
@interface UIView (GTMUnitTestingAdditions) <GTMUnitTestingImaging>

//  Encodes the state of an object in a manner suitable for comparing against a master state file
//  This enables us to determine whether the object is in a suitable state.
//
//  Arguments:
//    inCoder - the coder to encode our state into
- (void)gtm_unitTestEncodeState:(NSCoder*)inCoder;

//  Returns whether gtm_unitTestEncodeState should recurse into subviews
//
//  Returns:
//    should gtm_unitTestEncodeState pick up subview state.
- (BOOL)gtm_shouldEncodeStateForSubviews;
@end

// Category to help UIImage testing. UIImage can be tested using
// GTMAssertObjectImageEqualToImageNamed macro, which automatically creates
// result images and diff images in case test fails.
@interface UIImage (GTMUnitTestingAdditions) <GTMUnitTestingImaging>
@end

//  A view that allows you to delegate out drawing using the formal 
//  GTMUnitTestViewDelegate protocol
//  This is useful when writing up unit tests for visual elements.
//  Your test will often end up looking like this:
//  - (void)testFoo {
//   GTMAssertDrawingEqualToFile(self, CGSizeMake(200, 200), @"Foo", nil, nil);
//  }
//  and your testSuite will also implement the unitTestViewDrawRect method to do
//  it's actual drawing. The above creates a view of size 200x200 that draws
//  it's content using |self|'s unitTestViewDrawRect method and compares it to
//  the contents of the file Foo.tif to make sure it's valid
@interface GTMUnitTestView : UIView {
 @private
  id<GTMUnitTestViewDrawer> drawer_; // delegate for doing drawing (STRONG) 
  void* contextInfo_; // info passed in by user for them to use when drawing
}

//  Create a GTMUnitTestView.
//
//  Args:
//    rect: the area to draw.
//    drawer: the object that will do the drawing via the GTMUnitTestViewDrawer
//            protocol
//    contextInfo: 
- (id)initWithFrame:(CGRect)frame drawer:(id<GTMUnitTestViewDrawer>)drawer contextInfo:(void*)contextInfo;

@end

/// \cond Protocols

// Formal protocol for doing unit testing of views. See description of
// GTMUnitTestView for details.
@protocol GTMUnitTestViewDrawer <NSObject>

//  Draw the view. Equivalent to drawRect on a standard UIView.
//
//  Args:
//    rect: the area to draw.
- (void)gtm_unitTestViewDrawRect:(CGRect)rect contextInfo:(void*)contextInfo;

@end
