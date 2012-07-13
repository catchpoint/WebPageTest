//
//  GTMCalculatedRange.m
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

#import "GTMCalculatedRange.h"

//  Our internal storage type. It keeps track of an item and it's
//  position.
@interface GTMCalculatedRangeStopPrivate : NSObject {
  id item_; // the item (STRONG)
  CGFloat position_; //
}
+ (id)stopWithObject:(id)item position:(CGFloat)inPosition;
- (id)initWithObject:(id)item position:(CGFloat)inPosition;
- (id)item;
- (CGFloat)position;
@end

GTM_INLINE BOOL FPEqual(CGFloat a, CGFloat b) {
  return (fpclassify(a - b) == FP_ZERO);
}

@implementation GTMCalculatedRangeStopPrivate
+ (id)stopWithObject:(id)item position:(CGFloat)inPosition {
  return [[[[self class] alloc] initWithObject:item position:inPosition] autorelease];
}

- (id)initWithObject:(id)item position:(CGFloat)inPosition {
  self = [super init];
  if (self != nil) {
    item_ = [item retain];
    position_ = inPosition;
  }
  return self;
}

- (void)dealloc {
  [item_ release];
  [super dealloc];
}

- (id)item {
  return item_;
}

- (CGFloat)position {
  return position_;
}

- (NSString *)description {
  return [NSString stringWithFormat: @"%f %@", position_, item_];
}
@end

@implementation GTMCalculatedRange
- (id)init {
  self = [super init];
  if (self != nil) {
    storage_ = [[NSMutableArray arrayWithCapacity:0] retain]; 
  }
  return self;
}
- (void)dealloc {
  [storage_ release];
  [super dealloc];
}

- (void)insertStop:(id)item atPosition:(CGFloat)position {
  NSUInteger positionIndex = 0;
  GTMCalculatedRangeStopPrivate *theStop;
  GTM_FOREACH_OBJECT(theStop, storage_) {
    if ([theStop position] < position) {
      positionIndex += 1;
    }
    else if (FPEqual([theStop position], position)) {
      // remove and stop the enum since we just modified the object
      [storage_ removeObjectAtIndex:positionIndex];
      break;
    }
  }
  [storage_ insertObject:[GTMCalculatedRangeStopPrivate stopWithObject:item position:position] 
                 atIndex:positionIndex];
}

- (BOOL)removeStopAtPosition:(CGFloat)position {
  NSUInteger positionIndex = 0;
  BOOL foundStop = NO;
  GTMCalculatedRangeStopPrivate *theStop;
  GTM_FOREACH_OBJECT(theStop, storage_) {
    if (FPEqual([theStop position], position)) {
      break;
    } else {
       positionIndex += 1;
    }
  }
  if (nil != theStop) {
    [self removeStopAtIndex:positionIndex];
    foundStop = YES;
  }
  return foundStop;
}

- (void)removeStopAtIndex:(NSUInteger)positionIndex {
  [storage_ removeObjectAtIndex:positionIndex];
}

- (NSUInteger)stopCount {
  return [storage_ count];
}

- (id)stopAtIndex:(NSUInteger)positionIndex position:(CGFloat*)outPosition {
  GTMCalculatedRangeStopPrivate *theStop = [storage_ objectAtIndex:positionIndex];
  if (nil != outPosition) {
    *outPosition = [theStop position];
  }
  return [theStop item];
}
  
- (id)valueAtPosition:(CGFloat)position {
  id theValue = nil;
  GTMCalculatedRangeStopPrivate *theStop;
  GTM_FOREACH_OBJECT(theStop, storage_) {
    if (FPEqual([theStop position], position)) {
      theValue = [theStop item];
      break;
    }
  }
  return theValue;
}

- (NSString *)description {
  return [storage_ description];
}
@end
