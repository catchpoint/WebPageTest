//
//  GTMCalculatedRange.h
//
//  This is a collection that allows you to calculate a value based on
//  defined stops in a range.
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

#import <Foundation/Foundation.h>
#import "GTMDefines.h"
#if GTM_IPHONE_SDK
#import <CoreGraphics/CoreGraphics.h>
#endif //  GTM_IPHONE_SDK

///  Allows you to calculate a value based on defined stops in a range.
//
///  For example if you have a range from 0.0 to 1.0 where the stop
///  located at 0.0 is red and the stop located at 1.0 is blue,
///  the value based on the position 0.5 would come out as purple assuming
///  that the valueAtPosition function calculates a purely linear mapping between
///  the stops at 0.0 and 1.0. Stops have indices and are sorted from lowest to
///  highest. The example above would have 2 stops. Stop 0 would be red and stop
///  1 would be blue.
///
///  Subclasses of GTMCalculatedRange are expected to override the valueAtPosition:
///  method to return a value based on the position passed in, and the stops
///  that are currently set in the range. Stops do not necessarily have to
///  be the same type as the values that are calculated, but normally they are.
@interface GTMCalculatedRange : NSObject {
  NSMutableArray *storage_;
}

//  Adds a stop to the range at |position|. If there is already a stop
//  at position |position| it is replaced.
//
//  Args:
//    item: the object to place at |position|.
//    position: the position in the range to put |item|.
//
- (void)insertStop:(id)item atPosition:(CGFloat)position;

//  Removes a stop from the range at |position|.
//
//  Args:
//    position: the position in the range to remove |item|.
//
//  Returns:
//    YES if there is a stop at |position| that has been removed
//    NO if there is not a stop at the |position|
- (BOOL)removeStopAtPosition:(CGFloat)position;

//  Removes stop |index| from the range. Stops are ordered
//  based on position where index of x <  index of y if position
//  of x < position of y.
//
//  Args:
//    item: the object to place at |position|.
//    position: the position in the range to put |item|.
//
- (void)removeStopAtIndex:(NSUInteger)index;

//  Returns the number of stops in the range.
//
//  Returns:
//    number of stops
- (NSUInteger)stopCount;

//  Returns the value at position |position|.
//  This function should be overridden by subclasses to calculate a
//  value for any given range.
//  The default implementation returns a value if there happens to be
//  a stop for the given position. Otherwise it returns nil.
//
//  Args:
//    position: the position to calculate a value for.
//
//  Returns:
//    value for position
- (id)valueAtPosition:(CGFloat)position;

//  Returns the |index|'th stop and position in the set.
//  Throws an exception if out of range.
//
//  Args:
//    index: the index of the stop
//    outPosition: a pointer to a value to be filled in with a position.
//                  this can be NULL, in which case no position is returned.
//
//  Returns:
//    the stop at the index.
- (id)stopAtIndex:(NSUInteger)index position:(CGFloat*)outPosition;
@end
