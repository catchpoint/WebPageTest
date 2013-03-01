//
//  GTMNSBezierPath+ShadingTest.m
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

#import <SenTestingKit/SenTestingKit.h>

#import "GTMLinearRGBShading.h"
#import "GTMAppKit+UnitTesting.h"
#import "GTMNSBezierPath+Shading.h"

@interface GTMNSBezierPath_ShadingTest : GTMTestCase<GTMUnitTestViewDrawer>
@end
  
@implementation GTMNSBezierPath_ShadingTest

- (void)testShadings {
  GTMAssertDrawingEqualToImageNamed(self,
                                    NSMakeSize(310, 410), 
                                    @"GTMNSBezierPath+ShadingTest", nil, nil);
}

- (void)gtm_unitTestViewDrawRect:(NSRect)rect contextInfo:(void*)contextInfo {
  
  NSColor *theColorArray[] = { [NSColor blueColor],
    [NSColor redColor], [NSColor yellowColor],
    [NSColor blueColor], [NSColor greenColor],
    [NSColor redColor] };
  CGFloat theFloatArray[] = { 0.0, 0.2, 0.4, 0.6, 0.8, 1.0 };
  
  GTMLinearRGBShading *shading =
    [GTMLinearRGBShading shadingWithColors:theColorArray
                            fromSpaceNamed:NSCalibratedRGBColorSpace
                               atPositions:theFloatArray
                                     count:sizeof(theFloatArray)/sizeof(CGFloat)]; 
  NSBezierPath *shadedPath;
  
  // axial stroke rect - diagonal fill
  NSRect axialStrokeRect = NSMakeRect(10.0f, 10.0f, 90.0f, 90.0f);
  shadedPath = [NSBezierPath bezierPathWithRect:axialStrokeRect];
  [shadedPath setLineWidth: 10.0f];
  NSPoint startPoint = NSMakePoint(axialStrokeRect.origin.x + 20.0f,
                                   axialStrokeRect.origin.y + 20.0f);
  NSPoint endPoint = NSMakePoint(axialStrokeRect.origin.x + axialStrokeRect.size.width - 20.0f,
                                 axialStrokeRect.origin.y + axialStrokeRect.size.height - 20.0f);
  [shadedPath gtm_strokeAxiallyFrom:startPoint to:endPoint extendingStart:YES extendingEnd:YES shading:shading];

  // axial stroke rect - v line fill
  axialStrokeRect = NSMakeRect(110.0f, 10.0f, 90.0f, 90.0f);
  shadedPath = [NSBezierPath bezierPathWithRect:axialStrokeRect];
  [shadedPath setLineWidth: 10.0f];
  startPoint = NSMakePoint(axialStrokeRect.origin.x + axialStrokeRect.size.width / 2.0f,
                           axialStrokeRect.origin.y + 20.0f);
  endPoint = NSMakePoint(axialStrokeRect.origin.x + axialStrokeRect.size.width / 2.0f,
                         axialStrokeRect.origin.y + axialStrokeRect.size.height - 20.0f);
  [shadedPath gtm_strokeAxiallyFrom:startPoint to:endPoint extendingStart:YES extendingEnd:YES shading:shading];
  
  // axial stroke rect - h line fill
  axialStrokeRect = NSMakeRect(210.0f, 10.0f, 90.0f, 90.0f);
  shadedPath = [NSBezierPath bezierPathWithRect:axialStrokeRect];
  [shadedPath setLineWidth: 10.0f];
  startPoint = NSMakePoint(axialStrokeRect.origin.x + 20.0f,
                           axialStrokeRect.origin.y + axialStrokeRect.size.height / 2.0f);
  endPoint = NSMakePoint(axialStrokeRect.origin.x + axialStrokeRect.size.width - 20.0f,
                         axialStrokeRect.origin.y + axialStrokeRect.size.height / 2.0f);
  [shadedPath gtm_strokeAxiallyFrom:startPoint to:endPoint extendingStart:YES extendingEnd:YES shading:shading];
  
  // axial fill rect - diagonal fill
  NSRect axialFillRect = NSMakeRect(10.0f, 110.0f, 90.0f, 90.0f);
  shadedPath = [NSBezierPath bezierPathWithRect:axialFillRect];
  startPoint = NSMakePoint(axialFillRect.origin.x + 20.0f,
                           axialFillRect.origin.y + 20.0f);
  endPoint = NSMakePoint(axialFillRect.origin.x + axialFillRect.size.width - 20.0f,
                         axialFillRect.origin.y + axialFillRect.size.height - 20.0f);
  [shadedPath gtm_fillAxiallyFrom:startPoint to:endPoint extendingStart:YES extendingEnd:YES shading:shading];
  
  // axial fill rect - v line fill
  axialFillRect = NSMakeRect(110.0f, 110.0f, 90.0f, 90.0f);
  shadedPath = [NSBezierPath bezierPathWithRect:axialFillRect];
  startPoint = NSMakePoint(axialFillRect.origin.x + axialFillRect.size.width / 2.0f,
                           axialFillRect.origin.y + 20.0f);
  endPoint = NSMakePoint(axialFillRect.origin.x + axialFillRect.size.width / 2.0f,
                         axialFillRect.origin.y + axialFillRect.size.height - 20.0f);
  [shadedPath gtm_fillAxiallyFrom:startPoint to:endPoint extendingStart:YES extendingEnd:YES shading:shading];
  
  // axial fill rect - h line fill
  axialFillRect = NSMakeRect(210.0f, 110.0f, 90.0f, 90.0f);
  shadedPath = [NSBezierPath bezierPathWithRect:axialFillRect];
  startPoint = NSMakePoint(axialFillRect.origin.x + 20.0f,
                           axialFillRect.origin.y + axialFillRect.size.height / 2.0f);
  endPoint = NSMakePoint(axialFillRect.origin.x + axialFillRect.size.width - 20.0f,
                         axialFillRect.origin.y + axialFillRect.size.height / 2.0f);
  [shadedPath gtm_fillAxiallyFrom:startPoint to:endPoint extendingStart:YES extendingEnd:YES shading:shading];
  
  // radial stroke rect - diagonal fill
  NSRect radialStrokeRect = NSMakeRect(10.0f, 210.0f, 90.0f, 90.0f);
  shadedPath = [NSBezierPath bezierPathWithRect:radialStrokeRect];
  startPoint = NSMakePoint(radialStrokeRect.origin.x + 20.0f,
                           radialStrokeRect.origin.y + 20.0f);
  endPoint = NSMakePoint(radialStrokeRect.origin.x + radialStrokeRect.size.width - 20.0f,
                         radialStrokeRect.origin.y + radialStrokeRect.size.height - 20.0f);
  [shadedPath gtm_strokeRadiallyFrom:startPoint fromRadius:60.0f 
                                  to:endPoint toRadius:20.0f
                      extendingStart:YES extendingEnd:YES shading:shading];
  
  // radial stroke rect - v line fill
  radialStrokeRect = NSMakeRect(110.0f, 210.0f, 90.0f, 90.0f);
  shadedPath = [NSBezierPath bezierPathWithRect:radialStrokeRect];
  startPoint = NSMakePoint(radialStrokeRect.origin.x + radialStrokeRect.size.width / 2.0f,
                           radialStrokeRect.origin.y + 20.0f);
  endPoint = NSMakePoint(radialStrokeRect.origin.x + radialStrokeRect.size.width / 2.0f,
                         radialStrokeRect.origin.y + radialStrokeRect.size.height - 20.0f);
  [shadedPath gtm_strokeRadiallyFrom:startPoint fromRadius:60.0f 
                                  to:endPoint toRadius:20.0f
                      extendingStart:YES extendingEnd:YES shading:shading];
  
  // radial stroke rect - h line fill
  radialStrokeRect = NSMakeRect(210.0f, 210.0f, 90.0f, 90.0f);
  shadedPath = [NSBezierPath bezierPathWithRect:radialStrokeRect];
  startPoint = NSMakePoint(radialStrokeRect.origin.x + 20.0f,
                           radialStrokeRect.origin.y + radialStrokeRect.size.height / 2.0f);
  endPoint = NSMakePoint(radialStrokeRect.origin.x + radialStrokeRect.size.width - 20.0f,
                         radialStrokeRect.origin.y + radialStrokeRect.size.height / 2.0f);
  [shadedPath gtm_strokeRadiallyFrom:startPoint fromRadius:60.0f 
                                  to:endPoint toRadius:20.0f
                      extendingStart:YES extendingEnd:YES shading:shading];
  
  // radial fill rect - diagonal fill
  NSRect radialFillRect = NSMakeRect(10.0f, 310.0f, 90.0f, 90.0f);
  shadedPath = [NSBezierPath bezierPathWithRect:radialFillRect];
  startPoint = NSMakePoint(radialFillRect.origin.x + 20.0f,
                           radialFillRect.origin.y + 20.0f);
  endPoint = NSMakePoint(radialFillRect.origin.x + radialFillRect.size.width - 20.0f,
                         radialFillRect.origin.y + radialFillRect.size.height - 20.0f);
  [shadedPath gtm_fillRadiallyFrom:startPoint fromRadius:10.0f 
                                to:endPoint toRadius:20.0f
                    extendingStart:YES extendingEnd:YES shading:shading];

  // radial fill rect - v line fill
  radialFillRect = NSMakeRect(110.0f, 310.0f, 90.0f, 90.0f);
  shadedPath = [NSBezierPath bezierPathWithRect:radialFillRect];
  startPoint = NSMakePoint(radialFillRect.origin.x + radialFillRect.size.width / 2.0f,
                           radialFillRect.origin.y + 20.0f);
  endPoint = NSMakePoint(radialFillRect.origin.x + radialFillRect.size.width / 2.0f,
                         radialFillRect.origin.y + radialFillRect.size.height - 20.0f);
  [shadedPath gtm_fillRadiallyFrom:startPoint fromRadius:10.0f 
                                to:endPoint toRadius:20.0f
                    extendingStart:YES extendingEnd:YES shading:shading];
  
  // radial fill rect - h line fill
  radialFillRect = NSMakeRect(210.0f, 310.0f, 90.0f, 90.0f);
  shadedPath = [NSBezierPath bezierPathWithRect:radialFillRect];
  startPoint = NSMakePoint(radialFillRect.origin.x + 20.0f,
                           radialFillRect.origin.y + radialFillRect.size.height / 2.0f);
  endPoint = NSMakePoint(radialFillRect.origin.x + radialFillRect.size.width - 20.0f,
                         radialFillRect.origin.y + radialFillRect.size.height / 2.0f);
  [shadedPath gtm_fillRadiallyFrom:startPoint fromRadius:10.0f 
                                to:endPoint toRadius:20.0f
                    extendingStart:YES extendingEnd:YES shading:shading];
}

@end
