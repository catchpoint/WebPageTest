//
//  GTMNSArray+Merge.h
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
//  License for the specific language governing permissions and limitations under
//  the License.
//

#import <Foundation/Foundation.h>

// Extension to NSArray to allow merging of arrays.
//
@interface NSArray (GTMNSArrayMergingAdditions)

// Merge our array with |newArray| by sorting each array then merging the
// two arrays.  If |merger| is provided then call that method on any old
// items that compare as equal to a new item, passing the new item as
// the only argument.  If |merger| is not provided, then insert new items
// in front of matching old items.  If neither array has any items then
// nil is returned.
//
// The signature of the |merger| is:
//    - (id)merge:(id)newItem;
//
// Returns a new, sorted array.
- (NSArray *)gtm_mergeArray:(NSArray *)newArray
              mergeSelector:(SEL)merger;

// Same as above, only |comparer| is used to sort/compare the objects, just like
// -[NSArray sortedArrayUsingSelector].  If |comparer| is nil, nil is returned.
- (NSArray *)gtm_mergeArray:(NSArray *)newArray
            compareSelector:(SEL)comparer
              mergeSelector:(SEL)merger;

@end


