//
//  GTMNSBezierPath+CGPathTest.m
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
#import "GTMNSBezierPath+CGPath.h"
#import "GTMAppKit+UnitTesting.h"
#import "GTMSenTestCase.h"

@interface GTMNSBezierPath_CGPathTest : GTMTestCase<GTMUnitTestViewDrawer>
@end

@implementation GTMNSBezierPath_CGPathTest

- (void)testCGPath {
  GTMAssertDrawingEqualToImageNamed(self, 
                                    NSMakeSize(100, 100), 
                                    @"GTMNSBezierPath+CGPathTest", 
                                    nil, nil);
}


// Draws all of our tests so that we can compare this to our stored image file.
- (void)gtm_unitTestViewDrawRect:(NSRect)rect contextInfo:(void*)contextInfo{
  NSBezierPath *thePath = [NSBezierPath bezierPath];
  NSPoint theStart = NSMakePoint(20.0, 20.0);
  
  // Test moveto/lineto
  [thePath moveToPoint: theStart];
  for (NSUInteger i = 0; i < 10; ++i) {
    NSPoint theNewPoint = NSMakePoint(i * 5, i * 10);
    [thePath lineToPoint: theNewPoint];
    theNewPoint = NSMakePoint(i * 2, i * 6);
    [thePath moveToPoint: theNewPoint];
  }
  
  // Test moveto/curveto
  for (NSUInteger i = 0; i < 10;  ++i) {
    NSPoint startPoint = NSMakePoint(5.0, 50.0);
    NSPoint endPoint = NSMakePoint(55.0, 50.0);
    NSPoint controlPoint1 = NSMakePoint(17.5, 50.0 + 5.0 * i);
    NSPoint controlPoint2 = NSMakePoint(42.5, 50.0 - 5.0 * i);
    [thePath moveToPoint:startPoint];
    [thePath curveToPoint:endPoint controlPoint1:controlPoint1 controlPoint2:controlPoint2];
  }
  // test close
  [thePath closePath];
  
  CGPathRef cgPath = [thePath gtm_CGPath];
  STAssertNotNULL(cgPath, @"Nil CGPath");

  CGContextRef cgContext = [[NSGraphicsContext currentContext] graphicsPort];
  STAssertNotNULL(cgContext, @"Nil cgContext");
  
  CGContextAddPath(cgContext, cgPath);
  CGContextStrokePath(cgContext);
}

@end
