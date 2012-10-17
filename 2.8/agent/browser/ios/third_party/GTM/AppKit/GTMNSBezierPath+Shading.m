//
//  GTMNSBezierPath+Shading.m
//
//  Category for radial and axial stroke and fill functions for NSBezierPaths
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

#import "GTMNSBezierPath+Shading.h"
#import "GTMNSBezierPath+CGPath.h"
#import "GTMShading.h"
#import "GTMGeometryUtils.h"
#import "GTMMethodCheck.h"

@interface NSBezierPath (GTMBezierPathShadingAdditionsPrivate)
//  Fills a CGPathRef either axially or radially with the given shading.
//
//  Args: 
//    path: path to fill
//    axially: if YES fill axially, otherwise fill radially
//    asStroke: if YES, clip to the stroke of the path, otherwise
//                        clip to the fill
//    from: where to shade from
//    fromRadius: in a radial fill, the radius of the from circle
//    to: where to shade to
//    toRadius: in a radial fill, the radius of the to circle
//    extendingStart: if true, extend the fill with the first color of the shade
//                    beyond |from| away from |to|
//    extendingEnd: if true, extend the fill with the last color of the shade
//                    beyond |to| away from |from|
//    shading: the shading to use for the fill
//  
- (void)gtm_fillCGPath:(CGPathRef)path 
               axially:(BOOL)axially 
              asStroke:(BOOL)asStroke
                  from:(NSPoint)fromPoint fromRadius:(CGFloat)fromRadius
                    to:(NSPoint)toPoint toRadius:(CGFloat)toRadius
        extendingStart:(BOOL)extendingStart extendingEnd:(BOOL)extendingEnd
               shading:(id<GTMShading>)shading;

//  Returns the point which is the projection of a line from point |pointA|
//  to |pointB| by length
//
//  Args: 
//    pointA: first point
//    pointB: second point
//    length: distance to project beyond |pointB| which is in line with
//            |pointA| and |pointB|
// 
//  Returns:
//    the projected point
- (NSPoint)gtm_projectLineFrom:(NSPoint)pointA
                            to:(NSPoint)pointB
                            by:(CGFloat)length;
@end


@implementation NSBezierPath (GTMBezierPathAdditionsPrivate)

- (void)gtm_fillCGPath:(CGPathRef)path 
               axially:(BOOL)axially asStroke:(BOOL)asStroke
                  from:(NSPoint)fromPoint fromRadius:(CGFloat)fromRadius
                    to:(NSPoint)toPoint toRadius:(CGFloat)toRadius
        extendingStart:(BOOL)extendingStart extendingEnd:(BOOL)extendingEnd
               shading:(id<GTMShading>)shading {
  CGFunctionRef shadingFunction = [shading shadeFunction];
  if (nil != shadingFunction) {
    CGContextRef currentContext = (CGContextRef)[[NSGraphicsContext currentContext] graphicsPort];
    if (nil != currentContext) {
      CGContextSaveGState(currentContext);
      CGFloat lineWidth = [self lineWidth];
      CGContextSetLineWidth(currentContext, lineWidth);
      if (asStroke) {
        // if we are using the stroke, we offset the from and to points
        // by half the stroke width away from the center of the stroke. 
        // Otherwise we tend to end up with fills that only cover half of the 
        // because users set the start and end points based on the center
        // of the stroke.
        CGFloat halfWidth = lineWidth * 0.5;
        fromPoint = [self gtm_projectLineFrom:toPoint to:fromPoint by:halfWidth];
        toPoint = [self gtm_projectLineFrom:fromPoint to:toPoint by:-halfWidth];
      }
      CGColorSpaceRef colorspace = [shading colorSpace];
      if (nil != colorspace) {
        CGPoint toCGPoint = GTMNSPointToCGPoint(toPoint);
        CGPoint fromCGPoint = GTMNSPointToCGPoint(fromPoint);
        CGShadingRef myCGShading;
        if(axially) {
          myCGShading = CGShadingCreateAxial(colorspace, fromCGPoint, 
                                            toCGPoint, shadingFunction, 
                                            extendingStart == YES, 
                                            extendingEnd == YES);
        }
        else {
          myCGShading = CGShadingCreateRadial(colorspace, fromCGPoint, fromRadius,
                                             toCGPoint, toRadius, shadingFunction, 
                                             extendingStart == YES, 
                                             extendingEnd == YES);
        }

        if (nil != myCGShading) {
          CGContextAddPath(currentContext,path);
          if(asStroke) {
            CGContextReplacePathWithStrokedPath(currentContext);
          }
          CGContextClip(currentContext);
          CGContextDrawShading(currentContext, myCGShading);
          CGShadingRelease(myCGShading);
        }
      }
      CGContextRestoreGState(currentContext);
    }
  }
}


- (NSPoint)gtm_projectLineFrom:(NSPoint)pointA
                            to:(NSPoint)pointB
                            by:(CGFloat)length {
  NSPoint newPoint = NSMakePoint(pointB.x, pointB.y);
  CGFloat x = (pointB.x - pointA.x);
  CGFloat y = (pointB.y - pointA.y);
  if (fpclassify(x) == FP_ZERO) {
    newPoint.y += length;
  } else if (fpclassify(y) == FP_ZERO) {
    newPoint.x += length;
  } else {
#if CGFLOAT_IS_DOUBLE  
    CGFloat angle = atan(y / x);
    newPoint.x += sin(angle) * length;
    newPoint.y += cos(angle) * length;
#else
    CGFloat angle = atanf(y / x);
    newPoint.x += sinf(angle) * length;
    newPoint.y += cosf(angle) * length;
#endif
  }
  return newPoint;
}

@end


@implementation NSBezierPath (GTMBezierPathShadingAdditions)
GTM_METHOD_CHECK(NSBezierPath, gtm_CGPath);

- (void)gtm_strokeAxiallyFrom:(NSPoint)fromPoint to:(NSPoint)toPoint 
               extendingStart:(BOOL)extendingStart extendingEnd:(BOOL)extendingEnd
                      shading:(id<GTMShading>)shading {
  CGPathRef thePath = [self gtm_CGPath];
  if (nil != thePath) {
    [self gtm_fillCGPath:thePath axially:YES asStroke:YES 
                    from:fromPoint fromRadius:(CGFloat)0.0
                      to:toPoint toRadius:(CGFloat)0.0
          extendingStart:extendingStart extendingEnd:extendingEnd 
                 shading:shading];
  }
}


- (void)gtm_strokeRadiallyFrom:(NSPoint)fromPoint fromRadius:(CGFloat)fromRadius 
                            to:(NSPoint)toPoint toRadius:(CGFloat)toRadius
                extendingStart:(BOOL)extendingStart extendingEnd:(BOOL)extendingEnd
                       shading:(id<GTMShading>)shading {
  CGPathRef thePath = [self gtm_CGPath];
  if (nil != thePath) {
    [self gtm_fillCGPath:thePath axially:NO asStroke:YES 
                    from:fromPoint fromRadius:fromRadius
                      to:toPoint toRadius:toRadius
          extendingStart:extendingStart extendingEnd:extendingEnd 
                 shading:shading];
  }
}


- (void)gtm_fillAxiallyFrom:(NSPoint)fromPoint to:(NSPoint)toPoint 
             extendingStart:(BOOL)extendingStart extendingEnd:(BOOL)extendingEnd
                    shading:(id<GTMShading>)shading {
  CGPathRef thePath = [self gtm_CGPath];
  if (nil != thePath) {
    [self gtm_fillCGPath:thePath axially:YES asStroke:NO 
                    from:fromPoint fromRadius:(CGFloat)0.0
                      to:toPoint toRadius:(CGFloat)0.0
          extendingStart:extendingStart extendingEnd:extendingEnd 
                 shading:shading];
  }
}


- (void)gtm_fillRadiallyFrom:(NSPoint)fromPoint fromRadius:(CGFloat)fromRadius 
                          to:(NSPoint)toPoint toRadius:(CGFloat)toRadius
              extendingStart:(BOOL)extendingStart extendingEnd:(BOOL)extendingEnd
                     shading:(id<GTMShading>)shading {
  CGPathRef thePath = [self gtm_CGPath];
  if (nil != thePath) {
    [self gtm_fillCGPath:thePath axially:NO asStroke:NO 
                    from:fromPoint fromRadius:fromRadius
                      to:toPoint toRadius:toRadius
          extendingStart:extendingStart extendingEnd:extendingEnd 
                 shading:shading];
  }
}

@end
