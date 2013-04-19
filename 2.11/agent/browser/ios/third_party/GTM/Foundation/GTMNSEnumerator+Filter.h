//
//  GTMNSEnumerator+Filter.h
//
//  Copyright 2007-2009 Google Inc.
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

// A generic category for methods that allow us to filter enumeratable
// containers, inspired by C++ Standard Library's use of iterators.
// Like in C++, these assume the underlying container is not modified during
// the lifetime of the iterator.
//
@interface NSEnumerator (GTMEnumeratorFilterAdditions)

// Performs -[element predicate:argument] on each object in self.
// Returns an enumerator where -[element predicate:argument] returned YES.
// Predicate must be of form -(BOOL)predicate:(id)argument.
- (NSEnumerator *)gtm_filteredEnumeratorByMakingEachObjectPerformSelector:(SEL)predicate
                                                               withObject:(id)argument;

// Performs -[element selector:argument] on each object in self.
// Returns an enumerator of the return values of -[element selector:argument].
// Selector must be of form -(id)selector:(id)argument.
- (NSEnumerator *)gtm_enumeratorByMakingEachObjectPerformSelector:(SEL)selector
                                                       withObject:(id)argument;

// Performs -[target predicate:element] on each object in self.
// Returns an enumerator where -[target predicate:element] returned YES.
// Predicate must be of form -(BOOL)predicate:(id)element.
- (NSEnumerator *)gtm_filteredEnumeratorByTarget:(id)target
                           performOnEachSelector:(SEL)predicate;

// Performs -[target predicate:element withObject:object] on each object in self.
// Returns an enumerator where -[target predicate:element withObject:object]
// returned YES.
// Predicate must be of form -(BOOL)predicate:(id)element withObject:(id)object.
- (NSEnumerator *)gtm_filteredEnumeratorByTarget:(id)target
                           performOnEachSelector:(SEL)predicate
                                      withObject:(id)object;

// Performs -[target selector:element] on each object in self.
// Returns an enumerator of the return values of -[target selector:element].
// Selector must be of form -(id)selector:(id)element.
- (NSEnumerator *)gtm_enumeratorByTarget:(id)target
                   performOnEachSelector:(SEL)selector;

// Performs -[target selector:element withObject:object] on each object in self.
// Returns an enumerator of the return values of 
// -[target selector:element withObject:object].
// Selector must be of form -(id)selector:(id)element withObject:(id)object.
- (NSEnumerator *)gtm_enumeratorByTarget:(id)target
                   performOnEachSelector:(SEL)selector
                              withObject:(id)object;

@end

