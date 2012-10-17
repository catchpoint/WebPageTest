//
//  GTMNSArray+Merge.m
//
//  Copyright 2008 Google Inc.
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
//  License for the specific language governing permissions and limitations 
//  under the License.
//

#import "GTMNSArray+Merge.h"

#import "GTMDefines.h"

#if GTM_IPHONE_SDK
#import <objc/message.h>
#else  // GTM_IPHONE_SDK
#import <objc/objc-runtime.h>
#endif  // GTM_IPHONE_SDK

@implementation NSArray (GTMNSArrayMergingAdditions)

- (NSArray *)gtm_mergeArray:(NSArray *)newArray
              mergeSelector:(SEL)merger {
  return [self gtm_mergeArray:newArray
              compareSelector:@selector(compare:)
                mergeSelector:merger];
}

- (NSArray *)gtm_mergeArray:(NSArray *)newArray
            compareSelector:(SEL)comparer
              mergeSelector:(SEL)merger {
  // must have a compare selector
  if (!comparer) return nil;

  // Sort and merge the contents of |self| with |newArray|.
  NSArray *sortedMergedArray = nil;
  if ([self count] && [newArray count]) {
    NSMutableArray *mergingArray = [NSMutableArray arrayWithArray:self];
    [mergingArray sortUsingSelector:comparer];
    NSArray *sortedNewArray
      = [newArray sortedArrayUsingSelector:comparer];
    
    NSUInteger oldIndex = 0;
    NSUInteger oldCount = [mergingArray count];
    id oldItem = (oldIndex < oldCount)
                 ? [mergingArray objectAtIndex:0]
                 : nil;
    
    id newItem = nil;
    GTM_FOREACH_OBJECT(newItem, sortedNewArray) {
      BOOL stillLooking = YES;
      while (oldIndex < oldCount && stillLooking) {
        // We must take care here, since Intel leaves junk in high bytes of
        // return register for predicates that return BOOL.
        // For details see: 
        // http://developer.apple.com/documentation/MacOSX/Conceptual/universal_binary/universal_binary_tips/chapter_5_section_23.html
        // and
        // http://www.red-sweater.com/blog/320/abusing-objective-c-with-class#comment-83187
        NSComparisonResult result
          = ((NSComparisonResult (*)(id, SEL, id))objc_msgSend)(newItem, comparer, oldItem);
        if (result == NSOrderedSame && merger) {
          // It's a match!
          id repItem = [oldItem performSelector:merger
                                     withObject:newItem];
          [mergingArray replaceObjectAtIndex:oldIndex
                                  withObject:repItem];
          ++oldIndex;
          oldItem = (oldIndex < oldCount)
                    ? [mergingArray objectAtIndex:oldIndex]
                    : nil;
          stillLooking = NO;
        } else if (result == NSOrderedAscending
                   || (result == NSOrderedSame && !merger)) {
          // This is either a new item and belongs right here, or it's
          // a match to an existing item but we're not merging.
          [mergingArray insertObject:newItem
                             atIndex:oldIndex];
          ++oldIndex;
          ++oldCount;
          stillLooking = NO;
        } else {
          ++oldIndex;
          oldItem = (oldIndex < oldCount)
                    ? [mergingArray objectAtIndex:oldIndex]
                    : nil;
        }
      }
      if (stillLooking) {
        // Once we get here, the rest of the new items get appended.
        [mergingArray addObject:newItem];
      }
    }
    sortedMergedArray = mergingArray;
  } else if ([self count]) {
    sortedMergedArray = [self sortedArrayUsingSelector:comparer];
  } else if ([newArray count]) {
    sortedMergedArray = [newArray sortedArrayUsingSelector:comparer];
  }
  return sortedMergedArray;
}

@end
