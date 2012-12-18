//
//  GTMNSEnumerator+FilterTest.m
//
//  Copyright 2007-2008 Google Inc.
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

#import "GTMSenTestCase.h"
#import "GTMNSEnumerator+Filter.h"

@interface GTMNSEnumerator_FilterTest : GTMTestCase
@end

@implementation GTMNSEnumerator_FilterTest

- (void)testEnumeratorByMakingEachObjectPerformSelector {
  // test w/ a set of strings
  NSSet *numbers = [NSSet setWithObjects: @"1", @"2", @"3", nil];
  NSEnumerator *e = [[numbers objectEnumerator]
    gtm_enumeratorByMakingEachObjectPerformSelector:@selector(stringByAppendingString:) 
                                         withObject:@" "];
  NSMutableSet *trailingSpaces = [NSMutableSet set];
  id obj;
  while (nil != (obj = [e nextObject])) {
    [trailingSpaces addObject:obj];
  }
  NSSet *trailingSpacesGood = [NSSet setWithObjects: @"1 ", @"2 ", @"3 ", nil];
  STAssertEqualObjects(trailingSpaces, trailingSpacesGood, @"");

  // test an empty set
  NSSet *empty = [NSSet set];
  e = [[empty objectEnumerator]
    gtm_enumeratorByMakingEachObjectPerformSelector:@selector(stringByAppendingString:) 
                                         withObject:@" "];
  STAssertNil([e nextObject],
              @"shouldn't have gotten anything from first advance of "
              @"enumerator");
}

- (void)testFilteredEnumeratorByMakingEachObjectPerformSelector {
  // test with a dict of strings
  NSDictionary *testDict = [NSDictionary dictionaryWithObjectsAndKeys:
                           @"foo", @"1",
                           @"bar", @"2",
                           @"foobar", @"3",
                           nil];
  // test those that have prefixes
  NSEnumerator *e = [[testDict objectEnumerator]
    gtm_filteredEnumeratorByMakingEachObjectPerformSelector:@selector(hasPrefix:) 
                                                 withObject:@"foo"];
  // since the dictionary iterates in any order, compare as sets
  NSSet *filteredValues = [NSSet setWithArray:[e allObjects]];
  NSSet *expectedValues = [NSSet setWithObjects:@"foo", @"foobar", nil];
  STAssertEqualObjects(filteredValues, expectedValues, @"");

  // test an empty set
  NSSet *empty = [NSSet set];
  e = [[empty objectEnumerator]
    gtm_filteredEnumeratorByMakingEachObjectPerformSelector:@selector(hasPrefix:) 
                                                 withObject:@"foo"];
  STAssertNil([e nextObject],
              @"shouldn't have gotten anything from first advance of "
              @"enumerator");
  
  // test an set that will filter out
  NSSet *filterAway = [NSSet setWithObjects:@"bar", @"baz", nil];
  e = [[filterAway objectEnumerator]
    gtm_filteredEnumeratorByMakingEachObjectPerformSelector:@selector(hasPrefix:) 
                                                 withObject:@"foo"];
  STAssertNil([e nextObject],
              @"shouldn't have gotten anything from first advance of " 
              @"enumerator");
}

- (void)testEnumeratorByTargetPerformOnEachSelector {
  // test w/ a set of strings
  NSSet *numbers = [NSSet setWithObjects: @"1", @"2", @"3", nil];
  NSString *target = @"foo";
  NSEnumerator *e = [[numbers objectEnumerator]
    gtm_enumeratorByTarget:target
     performOnEachSelector:@selector(stringByAppendingString:)];
  // since the set iterates in any order, compare as sets
  NSSet *collectedValues = [NSSet setWithArray:[e allObjects]];
  NSSet *expectedValues = [NSSet setWithObjects:@"foo1", @"foo2", @"foo3", nil];
  STAssertEqualObjects(collectedValues, expectedValues, @"");
  
  // test an empty set
  NSSet *empty = [NSSet set];
  e = [[empty objectEnumerator]
    gtm_enumeratorByTarget:target
     performOnEachSelector:@selector(stringByAppendingString:)];
  STAssertNil([e nextObject],
              @"shouldn't have gotten anything from first advance of "
              @"enumerator");
}

- (id)prependString:(NSString*)pre toString:(NSString *)post {
  return [pre stringByAppendingString:post];
}

- (void)testEnumeratorByTargetPerformOnEachSelectorWithObject {
  // test w/ a set of strings
  NSSet *numbers = [NSSet setWithObjects: @"1", @"2", @"3", nil];
  NSEnumerator *e = [[numbers objectEnumerator]
                     gtm_enumeratorByTarget:self
                     performOnEachSelector:@selector(prependString:toString:)
                                 withObject:@"bar"];
  // since the set iterates in any order, compare as sets
  NSSet *collectedValues = [NSSet setWithArray:[e allObjects]];
  NSSet *expectedValues = [NSSet setWithObjects:@"1bar", 
                           @"2bar",
                           @"3bar", 
                           nil];
  STAssertEqualObjects(collectedValues, expectedValues, @"");
  
  // test an empty set
  NSSet *empty = [NSSet set];
  e = [[empty objectEnumerator]
       gtm_enumeratorByTarget:self
        performOnEachSelector:@selector(prependString:toString:)
                   withObject:@"bar"];
  STAssertNil([e nextObject],
              @"shouldn't have gotten anything from first advance of "
              @"enumerator");
}


- (void)testFilteredEnumeratorByTargetPerformOnEachSelector {
  // test w/ a set of strings
  NSSet *numbers = [NSSet setWithObjects:@"1", @"2", @"3", @"4", nil];
  NSSet *target = [NSSet setWithObjects:@"2", @"4", @"6", nil];
  NSEnumerator *e = [[numbers objectEnumerator]
    gtm_filteredEnumeratorByTarget:target
             performOnEachSelector:@selector(containsObject:)];
  // since the set iterates in any order, compare as sets
  NSSet *filteredValues = [NSSet setWithArray:[e allObjects]];
  NSSet *expectedValues = [NSSet setWithObjects:@"2", @"4", nil];
  STAssertEqualObjects(filteredValues, expectedValues, @"");

  // test an empty set
  NSSet *empty = [NSSet set];
  e = [[empty objectEnumerator]
    gtm_filteredEnumeratorByTarget:target
             performOnEachSelector:@selector(containsObject:)];
  STAssertNil([e nextObject],
              @"shouldn't have gotten anything from first advance of "
              @"enumerator");

  // test a set that will filter out
  NSSet *filterAway = [NSSet setWithObjects:@"bar", @"baz", nil];
  e = [[filterAway objectEnumerator]
    gtm_filteredEnumeratorByTarget:target
             performOnEachSelector:@selector(containsObject:)];
  STAssertNil([e nextObject],
              @"shouldn't have gotten anything from first advance of "
              @"enumerator");
}

- (BOOL)is:(id)a equalTo:(id)b {
  return [a isEqual:b];
}

- (void)testFilteredEnumeratorByTargetPerformOnEachSelectorWithObject {
  // test w/ a set of strings
  NSSet *numbers = [NSSet setWithObjects:@"1", @"2", @"3", @"4", nil];
  NSEnumerator *e = [[numbers objectEnumerator]
                     gtm_filteredEnumeratorByTarget:self
                     performOnEachSelector:@selector(is:equalTo:)
                     withObject:@"2"];
  // since the set iterates in any order, compare as sets
  NSSet *filteredValues = [NSSet setWithArray:[e allObjects]];
  NSSet *expectedValues = [NSSet setWithObjects:@"2", nil];
  STAssertEqualObjects(filteredValues, expectedValues, @"");
  
  // test an empty set
  NSSet *empty = [NSSet set];
  e = [[empty objectEnumerator]
       gtm_filteredEnumeratorByTarget:self
       performOnEachSelector:@selector(is:equalTo:)
       withObject:@"2"];
  STAssertNil([e nextObject],
              @"shouldn't have gotten anything from first advance of "
              @"enumerator");
  
  // test a set that will filter out
  NSSet *filterAway = [NSSet setWithObjects:@"bar", @"baz", nil];
  e = [[filterAway objectEnumerator]
       gtm_filteredEnumeratorByTarget:self
       performOnEachSelector:@selector(is:equalTo:)
       withObject:@"2"];
  STAssertNil([e nextObject],
              @"shouldn't have gotten anything from first advance of "
              @"enumerator");
}


@end
