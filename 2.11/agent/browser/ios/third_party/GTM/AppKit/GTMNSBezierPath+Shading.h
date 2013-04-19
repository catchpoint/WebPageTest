//
//  GTMNSBezierPath+Shading.h
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

#import <Cocoa/Cocoa.h>
#import "GTMDefines.h"

@protocol GTMShading;

//
///  Category for radial and axial stroke and fill functions for NSBezierPaths
//
@interface NSBezierPath (GTMBezierPathShadingAdditions)

///  Stroke the path axially with a color blend defined by |shading|.
//
///  The fill will extend from |fromPoint| to |toPoint| and will extend
///  indefinitely perpendicular to the axis of the line defined by the
///  two points. You can extend beyond the |fromPoint|/|toPoint by setting 
///  |extendingStart|/|extendingEnd| respectively.
//  
//  Args: 
//    fromPoint: point to start the shading at
//    toPoint: point to end the shading at
//    extendingStart: should we extend the shading before |fromPoint| using 
//                    the first color in our shading?
//    extendingEnd: should we extend the shading after |toPoint| using the
//                  last color in our shading?
//    shading: the shading to use to take our colors from.
//
- (void)gtm_strokeAxiallyFrom:(NSPoint)fromPoint to:(NSPoint)toPoint 
               extendingStart:(BOOL)extendingStart extendingEnd:(BOOL)extendingEnd
                      shading:(id<GTMShading>)shading;

///  Stroke the path radially with a color blend defined by |shading|.
//
///  The fill will extend from the circle with center |fromPoint| 
///  and radius |fromRadius| to the circle with center |toPoint|
///  with radius |toRadius|.
///  You can extend beyond the |fromPoint|/|toPoint| by setting 
///  |extendingStart|/|extendingEnd| respectively.
//  
//  Args: 
//    fromPoint: center of the circle to start the shading at
//    fromRadius: radius of the circle to start the shading at
//    toPoint: center of the circle to to end the shading at
//    toRadius: raidus of the circle to end the shading at
//    extendingStart: should we extend the shading before |fromPoint| using 
//                    the first color in our shading?
//    extendingEnd: should we extend the shading after |toPoint| using the
//                  last color in our shading?
//    shading: the shading to use to take our colors from.
//
- (void)gtm_strokeRadiallyFrom:(NSPoint)fromPoint fromRadius:(CGFloat)fromRadius 
                            to:(NSPoint)toPoint toRadius:(CGFloat)toRadius
                extendingStart:(BOOL)extendingStart extendingEnd:(BOOL)extendingEnd
                       shading:(id<GTMShading>)shading;

///  Fill the path radially with a color blend defined by |shading|.
//
///  The fill will extend from the circle with center |fromPoint| 
///  and radius |fromRadius| to the circle with center |toPoint|
///  with radius |toRadius|.
///  You can extend beyond the |fromPoint|/|toPoint by setting 
///  |extendingStart|/|extendingEnd| respectively.
//  
//  Args: 
//    fromPoint: center of the circle to start the shading at
//    fromRadius: radius of the circle to start the shading at
//    toPoint: center of the circle to to end the shading at
//    toRadius: radius of the circle to end the shading at
//    extendingStart: should we extend the shading before |fromPoint| using 
//                    the first color in our shading?
//    extendingEnd: should we extend the shading after |toPoint| using the
//                  last color in our shading?
//    shading: the shading to use to take our colors from.
//
- (void)gtm_fillAxiallyFrom:(NSPoint)fromPoint to:(NSPoint)toPoint 
             extendingStart:(BOOL)extendingStart extendingEnd:(BOOL)extendingEnd
                    shading:(id<GTMShading>)shading;

///  Fill the path radially with a color blend defined by |shading|.
//
///  The fill will extend from the circle with center |fromPoint| 
///  and radius |fromRadius| to the circle with center |toPoint|
///  with radius |toRadius|.
///  You can extend beyond the |fromPoint|/|toPoint by setting 
///  |extendingStart|/|extendingEnd| respectively.
//  
//  Args: 
//    fromPoint: center of the circle to start the shading at
//    fromRadius: radius of the circle to start the shading at
//    toPoint: center of the circle to to end the shading at
//    toRadius: radius of the circle to end the shading at
//    extendingStart: should we extend the shading before |fromPoint| using 
//                    the first color in our shading?
//    extendingEnd: should we extend the shading after |toPoint| using the
//                  last color in our shading?
//    shading: the shading to use to take our colors from.
//
- (void)gtm_fillRadiallyFrom:(NSPoint)fromPoint fromRadius:(CGFloat)fromRadius 
                          to:(NSPoint)toPoint toRadius:(CGFloat)toRadius
              extendingStart:(BOOL)extendingStart extendingEnd:(BOOL)extendingEnd
                     shading:(id<GTMShading>)shading;
@end
