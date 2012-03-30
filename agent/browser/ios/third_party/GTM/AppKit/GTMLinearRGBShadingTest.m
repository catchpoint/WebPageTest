//
//  GTMLinearRGBShadingTest.m
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

#import <SenTestingKit/SenTestingKit.h>
#import "GTMSenTestCase.h"
#import "GTMLinearRGBShading.h"

@interface GTMLinearRGBShadingTest : GTMTestCase
@end

@implementation GTMLinearRGBShadingTest
- (void)testShadingFrom {
  // Create a shading from red to blue, and check if 50% is purple
  NSColor *red = [NSColor redColor];
  NSColor *blue = [NSColor blueColor];
  NSColor *purple = [NSColor purpleColor];
  GTMLinearRGBShading *theShading =
    [GTMLinearRGBShading shadingFromColor:red
                                  toColor:blue
                           fromSpaceNamed:NSCalibratedRGBColorSpace];
  STAssertNotNil(theShading,nil);
  STAssertEquals([theShading stopCount], (NSUInteger)2, nil);
  CGFloat *theColor = (CGFloat*)[theShading valueAtPosition: 0.5];
  STAssertEqualsWithAccuracy(theColor[0], [purple redComponent], 0.001, nil);
  STAssertEqualsWithAccuracy(theColor[1], [purple greenComponent], 0.001, nil);
  STAssertEqualsWithAccuracy(theColor[2], [purple blueComponent], 0.001, nil);
  STAssertEqualsWithAccuracy(theColor[3], [purple alphaComponent], 0.001, nil);
}

- (void)testShadingWith {
  // Create a shading with kColorCount colors and make sure all the values are there.
  enum { kColorCount = 100 };
  NSColor *theColors[kColorCount];
  CGFloat thePositions[kColorCount];
  const CGFloat kColorIncrement = 1.0 / kColorCount;
  for (NSUInteger i = 0; i < kColorCount; i++) {
    CGFloat newValue = kColorIncrement * i;
    thePositions[i] = newValue;
    theColors[i] = [NSColor colorWithCalibratedRed:newValue 
                                             green:newValue 
                                              blue:newValue 
                                             alpha:newValue];
  }
  GTMLinearRGBShading *theShading =
    [GTMLinearRGBShading shadingWithColors:theColors
                            fromSpaceNamed:NSCalibratedRGBColorSpace
                               atPositions:thePositions
                                     count:kColorCount];
  for (NSUInteger i = 0; i < kColorCount; i++) {
    CGFloat newValue = kColorIncrement * i;
    CGFloat *theColor = (CGFloat*)[theShading valueAtPosition:newValue];
    STAssertEqualsWithAccuracy(theColor[0], newValue, 0.001, nil);
    STAssertEqualsWithAccuracy(theColor[1], newValue, 0.001, nil);
    STAssertEqualsWithAccuracy(theColor[2], newValue, 0.001, nil);
    STAssertEqualsWithAccuracy(theColor[3], newValue, 0.001, nil);
  }
  // Create a shading with 1 color to test that special handling
  NSColor *purple = [NSColor purpleColor];
  NSColor *singleColor[1] = { purple };
  CGFloat singlePosition[1] = { 0.5 };
  theShading =
    [GTMLinearRGBShading shadingWithColors:singleColor
                            fromSpaceNamed:NSCalibratedRGBColorSpace
                               atPositions:singlePosition
                                     count:1];
  // test over a range to make sure we always get the same color
  for (NSUInteger i = 0; i < kColorCount; i++) {
    CGFloat newValue = kColorIncrement * i;
    CGFloat *theColor = (CGFloat*)[theShading valueAtPosition:newValue];
    STAssertEqualsWithAccuracy(theColor[0], [purple redComponent], 0.001, nil);
    STAssertEqualsWithAccuracy(theColor[1], [purple greenComponent], 0.001, nil);
    STAssertEqualsWithAccuracy(theColor[2], [purple blueComponent], 0.001, nil);
    STAssertEqualsWithAccuracy(theColor[3], [purple alphaComponent], 0.001, nil);
  }
}

- (void)testShadeFunction {
  GTMLinearRGBShading *theShading =
    [GTMLinearRGBShading shadingWithColors:nil
                            fromSpaceNamed:NSCalibratedRGBColorSpace
                               atPositions:nil
                                     count:0];
  CGFunctionRef theFunction = [theShading shadeFunction];
  STAssertNotNULL(theFunction, nil);
  STAssertEquals(CFGetTypeID(theFunction), CGFunctionGetTypeID(), nil);  
}

- (void)testColorSpace {
  // Calibrated RGB
  GTMLinearRGBShading *theShading =
    [GTMLinearRGBShading shadingWithColors:nil
                            fromSpaceNamed:NSCalibratedRGBColorSpace
                               atPositions:nil
                                     count:0];
  CGColorSpaceRef theColorSpace = [theShading colorSpace];
  STAssertNotNULL(theColorSpace, nil);
  STAssertEquals(CFGetTypeID(theColorSpace), CGColorSpaceGetTypeID(), nil);

  // Device RGB
  theShading =
    [GTMLinearRGBShading shadingWithColors:nil
                            fromSpaceNamed:NSDeviceRGBColorSpace
                               atPositions:nil
                                     count:0];
  theColorSpace = [theShading colorSpace];
  STAssertNotNULL(theColorSpace, nil);
  STAssertEquals(CFGetTypeID(theColorSpace), CGColorSpaceGetTypeID(), nil);
  
  // Device CMYK (not supported)
  theShading =
    [GTMLinearRGBShading shadingWithColors:nil
                            fromSpaceNamed:NSDeviceCMYKColorSpace
                               atPositions:nil
                                     count:0];
  STAssertNULL(theShading, nil);
}
@end
