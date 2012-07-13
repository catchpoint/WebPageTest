//
//  GTMRegexTest.m
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
#import "GTMRegex.h"
#import "GTMUnitTestDevLog.h"

//
// NOTE:
//
// We don't really test any of the pattern matching since that's testing
// libregex, we just want to test our wrapper.
//

@interface GTMRegexTest : GTMTestCase
@end

@interface NSString_GTMRegexAdditions : GTMTestCase
@end

@implementation GTMRegexTest

- (void)testEscapedPatternForString {
  STAssertEqualStrings([GTMRegex escapedPatternForString:@"abcdefghijklmnopqrstuvwxyz0123456789"],
                       @"abcdefghijklmnopqrstuvwxyz0123456789",
                       nil);
  STAssertEqualStrings([GTMRegex escapedPatternForString:@"^.[$()|*+?{\\"],
                       @"\\^\\.\\[\\$\\(\\)\\|\\*\\+\\?\\{\\\\",
                       nil);
  STAssertEqualStrings([GTMRegex escapedPatternForString:@"a^b.c[d$e(f)g|h*i+j?k{l\\m"],
                       @"a\\^b\\.c\\[d\\$e\\(f\\)g\\|h\\*i\\+j\\?k\\{l\\\\m",
                       nil);

  STAssertNil([GTMRegex escapedPatternForString:nil], nil);
  STAssertEqualStrings([GTMRegex escapedPatternForString:@""], @"", nil);
}


- (void)testInit {

  // fail cases
  STAssertNil([[[GTMRegex alloc] init] autorelease], nil);
  STAssertNil([[[GTMRegex alloc] initWithPattern:nil] autorelease], nil);
  STAssertNil([[[GTMRegex alloc] initWithPattern:nil
                                         options:kGTMRegexOptionIgnoreCase] autorelease], nil);
  [GTMUnitTestDevLog expectString:@"Invalid pattern \"(.\", error: \"parentheses not balanced\""];
  STAssertNil([[[GTMRegex alloc] initWithPattern:@"(."] autorelease], nil);
  [GTMUnitTestDevLog expectString:@"Invalid pattern \"(.\", error: \"parentheses not balanced\""];
  STAssertNil([[[GTMRegex alloc] initWithPattern:@"(."
                                         options:kGTMRegexOptionIgnoreCase] autorelease], nil);
  // fail cases w/ error param
  NSError *error = nil;
  STAssertNil([[[GTMRegex alloc] initWithPattern:nil
                                         options:kGTMRegexOptionIgnoreCase
                                       withError:&error] autorelease], nil);
  STAssertNil(error, @"no pattern, shouldn't get error object");
  STAssertNil([[[GTMRegex alloc] initWithPattern:@"(."
                                         options:kGTMRegexOptionIgnoreCase
                                       withError:&error] autorelease], nil);
  STAssertNotNil(error, nil);
  STAssertEqualObjects([error domain], kGTMRegexErrorDomain, nil);
  STAssertEquals([error code], (NSInteger)kGTMRegexPatternParseFailedError, nil);
  NSDictionary *userInfo = [error userInfo];
  STAssertNotNil(userInfo, @"failed to get userInfo from error");
  STAssertEqualObjects([userInfo objectForKey:kGTMRegexPatternErrorPattern], @"(.", nil);
  STAssertNotNil([userInfo objectForKey:kGTMRegexPatternErrorErrorString], nil);

  // basic pattern w/ options
  STAssertNotNil([[[GTMRegex alloc] initWithPattern:@"(.*)"] autorelease], nil);
  STAssertNotNil([[[GTMRegex alloc] initWithPattern:@"(.*)"
                                            options:0] autorelease], nil);
  STAssertNotNil([[[GTMRegex alloc] initWithPattern:@"(.*)"
                                            options:kGTMRegexOptionIgnoreCase] autorelease], nil);
  error = nil;
  STAssertNotNil([[[GTMRegex alloc] initWithPattern:@"(.*)"
                                            options:kGTMRegexOptionIgnoreCase
                                          withError:&error] autorelease], nil);
  STAssertNil(error, @"shouldn't have been any error");

  // fail cases (helper)
  STAssertNil([GTMRegex regexWithPattern:nil], nil);
  STAssertNil([GTMRegex regexWithPattern:nil
                                 options:0], nil);
  [GTMUnitTestDevLog expectString:@"Invalid pattern \"(.\", error: \"parentheses not balanced\""];
  STAssertNil([GTMRegex regexWithPattern:@"(."], nil);
  [GTMUnitTestDevLog expectString:@"Invalid pattern \"(.\", error: \"parentheses not balanced\""];
  STAssertNil([GTMRegex regexWithPattern:@"(."
                                 options:0], nil);
  // fail cases (helper) w/ error param
  STAssertNil([GTMRegex regexWithPattern:nil
                                 options:kGTMRegexOptionIgnoreCase
                               withError:&error], nil);
  STAssertNil(error, @"no pattern, shouldn't get error object");
  STAssertNil([GTMRegex regexWithPattern:@"(."
                                 options:kGTMRegexOptionIgnoreCase
                               withError:&error], nil);
  STAssertNotNil(error, nil);
  STAssertEqualObjects([error domain], kGTMRegexErrorDomain, nil);
  STAssertEquals([error code], (NSInteger)kGTMRegexPatternParseFailedError, nil);
  userInfo = [error userInfo];
  STAssertNotNil(userInfo, @"failed to get userInfo from error");
  STAssertEqualObjects([userInfo objectForKey:kGTMRegexPatternErrorPattern], @"(.", nil);
  STAssertNotNil([userInfo objectForKey:kGTMRegexPatternErrorErrorString], nil);
  
  // basic pattern w/ options (helper)
  STAssertNotNil([GTMRegex regexWithPattern:@"(.*)"], nil);
  STAssertNotNil([GTMRegex regexWithPattern:@"(.*)"
                                    options:0], nil);
  STAssertNotNil([GTMRegex regexWithPattern:@"(.*)"
                                    options:kGTMRegexOptionIgnoreCase], nil);
  error = nil;
  STAssertNotNil([GTMRegex regexWithPattern:@"(.*)"
                                    options:kGTMRegexOptionIgnoreCase
                                  withError:&error], nil);
  STAssertNil(error, @"shouldn't have been any error");
  
  // not really a test on GTMRegex, but make sure we block attempts to directly
  // alloc/init a GTMRegexStringSegment.
  STAssertThrowsSpecificNamed([[[GTMRegexStringSegment alloc] init] autorelease],
                              NSException, NSInvalidArgumentException,
                              @"shouldn't have been able to alloc/init a GTMRegexStringSegment");
}

- (void)testOptions {

  NSString *testString = @"aaa AAA\nbbb BBB\n aaa aAa\n bbb BbB";

  // default options
  GTMRegex *regex = [GTMRegex regexWithPattern:@"a+"];
  STAssertNotNil(regex, nil);
  NSEnumerator *enumerator = [regex segmentEnumeratorForString:testString];
  STAssertNotNil(enumerator, nil);
  // "aaa"
  GTMRegexStringSegment *seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"aaa", nil);
  // " AAA\nbbb BBB\n "
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @" AAA\nbbb BBB\n ", nil);
  // "aaa"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"aaa", nil);
  // " "
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @" ", nil);
  // "a"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"a", nil);
  // "A"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"A", nil);
  // "a"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"a", nil);
  // "\n bbb BbB"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"\n bbb BbB", nil);
  // (end)
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // kGTMRegexOptionIgnoreCase
  regex = [GTMRegex regexWithPattern:@"a+" options:kGTMRegexOptionIgnoreCase];
  STAssertNotNil(regex, nil);
  enumerator = [regex segmentEnumeratorForString:testString];
  STAssertNotNil(enumerator, nil);
  // "aaa"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"aaa", nil);
  // " "
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @" ", nil);
  // "AAA"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"AAA", nil);
  // "\nbbb BBB\n "
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"\nbbb BBB\n ", nil);
  // "aaa"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"aaa", nil);
  // " "
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @" ", nil);
  // "aAa"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"aAa", nil);
  // "\n bbb BbB"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"\n bbb BbB", nil);
  // (end)
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // defaults w/ '^'
  regex = [GTMRegex regexWithPattern:@"^a+"];
  STAssertNotNil(regex, nil);
  enumerator = [regex segmentEnumeratorForString:testString];
  STAssertNotNil(enumerator, nil);
  // "aaa"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"aaa", nil);
  // " AAA\nbbb BBB\n aaa aAa\n bbb BbB"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @" AAA\nbbb BBB\n aaa aAa\n bbb BbB", nil);
  // (end)
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // defaults w/ '$'
  regex = [GTMRegex regexWithPattern:@"B+$"];
  STAssertNotNil(regex, nil);
  enumerator = [regex segmentEnumeratorForString:testString];
  STAssertNotNil(enumerator, nil);
  // "aaa AAA\nbbb "
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"aaa AAA\nbbb ", nil);
  // "BBB"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"BBB", nil);
  // "\n aaa aAa\n bbb Bb"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"\n aaa aAa\n bbb Bb", nil);
  // "B"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"B", nil);
  // (end)
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // kGTMRegexOptionIgnoreCase w/ '$'
  regex = [GTMRegex regexWithPattern:@"B+$"
                            options:kGTMRegexOptionIgnoreCase];
  STAssertNotNil(regex, nil);
  enumerator = [regex segmentEnumeratorForString:testString];
  STAssertNotNil(enumerator, nil);
  // "aaa AAA\nbbb "
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"aaa AAA\nbbb ", nil);
  // "BBB"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"BBB", nil);
  // "\n aaa aAa\n bbb "
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"\n aaa aAa\n bbb ", nil);
  // "BbB"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"BbB", nil);
  // (end)
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // test w/ kGTMRegexOptionSupressNewlineSupport and \n in the string
  regex = [GTMRegex regexWithPattern:@"a.*b" options:kGTMRegexOptionSupressNewlineSupport];
  STAssertNotNil(regex, nil);
  enumerator = [regex segmentEnumeratorForString:testString];
  STAssertNotNil(enumerator, nil);
  // "aaa AAA\nbbb BBB\n aaa aAa\n bbb Bb"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"aaa AAA\nbbb BBB\n aaa aAa\n bbb Bb", nil);
  // "B"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"B", nil);
  // (end)
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // test w/o kGTMRegexOptionSupressNewlineSupport and \n in the string
  // (this is no match since it '.' can't match the '\n')
  regex = [GTMRegex regexWithPattern:@"a.*b"];
  STAssertNotNil(regex, nil);
  enumerator = [regex segmentEnumeratorForString:testString];
  STAssertNotNil(enumerator, nil);
  // "aaa AAA\nbbb BBB\n aaa aAa\n bbb BbB"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"aaa AAA\nbbb BBB\n aaa aAa\n bbb BbB", nil);
  // (end)
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);
  
  // kGTMRegexOptionSupressNewlineSupport w/ '^'
  regex = [GTMRegex regexWithPattern:@"^a+" options:kGTMRegexOptionSupressNewlineSupport];
  STAssertNotNil(regex, nil);
  enumerator = [regex segmentEnumeratorForString:testString];
  STAssertNotNil(enumerator, nil);
  // "aaa"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"aaa", nil);
  // " AAA\nbbb BBB\n aaa aAa\n bbb BbB"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @" AAA\nbbb BBB\n aaa aAa\n bbb BbB", nil);
  // (end)
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // kGTMRegexOptionSupressNewlineSupport w/ '$'
  regex = [GTMRegex regexWithPattern:@"B+$" options:kGTMRegexOptionSupressNewlineSupport];
  STAssertNotNil(regex, nil);
  enumerator = [regex segmentEnumeratorForString:testString];
  STAssertNotNil(enumerator, nil);
  // "aaa AAA\nbbb BBB\n aaa aAa\n bbb Bb"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"aaa AAA\nbbb BBB\n aaa aAa\n bbb Bb", nil);
  // "B"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"B", nil);
  // (end)
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);
}

- (void)testSubPatternCount {
  STAssertEquals((NSUInteger)0, [[GTMRegex regexWithPattern:@".*"] subPatternCount], nil);
  STAssertEquals((NSUInteger)1, [[GTMRegex regexWithPattern:@"(.*)"] subPatternCount], nil);
  STAssertEquals((NSUInteger)1, [[GTMRegex regexWithPattern:@"[fo]*(.*)[bar]*"] subPatternCount], nil);
  STAssertEquals((NSUInteger)3, [[GTMRegex regexWithPattern:@"([fo]*)(.*)([bar]*)"] subPatternCount], nil);
  STAssertEquals((NSUInteger)7, [[GTMRegex regexWithPattern:@"(([bar]*)|([fo]*))(.*)(([bar]*)|([fo]*))"] subPatternCount], nil);
}

- (void)testMatchesString {
  // simple pattern
  GTMRegex *regex = [GTMRegex regexWithPattern:@"foo.*bar"];
  STAssertNotNil(regex, nil);
  STAssertTrue([regex matchesString:@"foobar"], nil);
  STAssertTrue([regex matchesString:@"foobydoo spambar"], nil);
  STAssertFalse([regex matchesString:@"zzfoobarzz"], nil);
  STAssertFalse([regex matchesString:@"zzfoobydoo spambarzz"], nil);
  STAssertFalse([regex matchesString:@"abcdef"], nil);
  STAssertFalse([regex matchesString:@""], nil);
  STAssertFalse([regex matchesString:nil], nil);
  // pattern w/ sub patterns
  regex = [GTMRegex regexWithPattern:@"(foo)(.*)(bar)"];
  STAssertNotNil(regex, nil);
  STAssertTrue([regex matchesString:@"foobar"], nil);
  STAssertTrue([regex matchesString:@"foobydoo spambar"], nil);
  STAssertFalse([regex matchesString:@"zzfoobarzz"], nil);
  STAssertFalse([regex matchesString:@"zzfoobydoo spambarzz"], nil);
  STAssertFalse([regex matchesString:@"abcdef"], nil);
  STAssertFalse([regex matchesString:@""], nil);
  STAssertFalse([regex matchesString:nil], nil);
}

- (void)testSubPatternsOfString {
  GTMRegex *regex = [GTMRegex regexWithPattern:@"(fo(o+))((bar)|(baz))"];
  STAssertNotNil(regex, nil);
  STAssertEquals((NSUInteger)5, [regex subPatternCount], nil);
  NSArray *subPatterns = [regex subPatternsOfString:@"foooooobaz"];
  STAssertNotNil(subPatterns, nil);
  STAssertEquals((NSUInteger)6, [subPatterns count], nil);
  STAssertEqualStrings(@"foooooobaz", [subPatterns objectAtIndex:0], nil);
  STAssertEqualStrings(@"foooooo", [subPatterns objectAtIndex:1], nil);
  STAssertEqualStrings(@"ooooo", [subPatterns objectAtIndex:2], nil);
  STAssertEqualStrings(@"baz", [subPatterns objectAtIndex:3], nil);
  STAssertEqualObjects([NSNull null], [subPatterns objectAtIndex:4], nil);
  STAssertEqualStrings(@"baz", [subPatterns objectAtIndex:5], nil);

  // not there
  subPatterns = [regex subPatternsOfString:@"aaa"];
  STAssertNil(subPatterns, nil);

  // not extra stuff on either end
  subPatterns = [regex subPatternsOfString:@"ZZZfoooooobaz"];
  STAssertNil(subPatterns, nil);
  subPatterns = [regex subPatternsOfString:@"foooooobazZZZ"];
  STAssertNil(subPatterns, nil);
  subPatterns = [regex subPatternsOfString:@"ZZZfoooooobazZZZ"];
  STAssertNil(subPatterns, nil);
}

- (void)testFirstSubStringMatchedInString {
  // simple pattern
  GTMRegex *regex = [GTMRegex regexWithPattern:@"foo.*bar"];
  STAssertNotNil(regex, nil);
  STAssertEqualStrings([regex firstSubStringMatchedInString:@"foobar"],
                       @"foobar", nil);
  STAssertEqualStrings([regex firstSubStringMatchedInString:@"foobydoo spambar"],
                       @"foobydoo spambar", nil);
  STAssertEqualStrings([regex firstSubStringMatchedInString:@"zzfoobarzz"],
                       @"foobar", nil);
  STAssertEqualStrings([regex firstSubStringMatchedInString:@"zzfoobydoo spambarzz"],
                       @"foobydoo spambar", nil);
  STAssertNil([regex firstSubStringMatchedInString:@"abcdef"], nil);
  STAssertNil([regex firstSubStringMatchedInString:@""], nil);
  // pattern w/ sub patterns
  regex = [GTMRegex regexWithPattern:@"(foo)(.*)(bar)"];
  STAssertNotNil(regex, nil);
  STAssertEqualStrings([regex firstSubStringMatchedInString:@"foobar"],
                       @"foobar", nil);
  STAssertEqualStrings([regex firstSubStringMatchedInString:@"foobydoo spambar"],
                       @"foobydoo spambar", nil);
  STAssertEqualStrings([regex firstSubStringMatchedInString:@"zzfoobarzz"],
                       @"foobar", nil);
  STAssertEqualStrings([regex firstSubStringMatchedInString:@"zzfoobydoo spambarzz"],
                       @"foobydoo spambar", nil);
  STAssertNil([regex firstSubStringMatchedInString:@"abcdef"], nil);
  STAssertNil([regex firstSubStringMatchedInString:@""], nil);
}

- (void)testMatchesSubStringInString {
  // simple pattern
  GTMRegex *regex = [GTMRegex regexWithPattern:@"foo.*bar"];
  STAssertNotNil(regex, nil);
  STAssertTrue([regex matchesSubStringInString:@"foobar"], nil);
  STAssertTrue([regex matchesSubStringInString:@"foobydoo spambar"], nil);
  STAssertTrue([regex matchesSubStringInString:@"zzfoobarzz"], nil);
  STAssertTrue([regex matchesSubStringInString:@"zzfoobydoo spambarzz"], nil);
  STAssertFalse([regex matchesSubStringInString:@"abcdef"], nil);
  STAssertFalse([regex matchesSubStringInString:@""], nil);
  // pattern w/ sub patterns
  regex = [GTMRegex regexWithPattern:@"(foo)(.*)(bar)"];
  STAssertNotNil(regex, nil);
  STAssertTrue([regex matchesSubStringInString:@"foobar"], nil);
  STAssertTrue([regex matchesSubStringInString:@"foobydoo spambar"], nil);
  STAssertTrue([regex matchesSubStringInString:@"zzfoobarzz"], nil);
  STAssertTrue([regex matchesSubStringInString:@"zzfoobydoo spambarzz"], nil);
  STAssertFalse([regex matchesSubStringInString:@"abcdef"], nil);
  STAssertFalse([regex matchesSubStringInString:@""], nil);
}

- (void)testSegmentEnumeratorForString {
  GTMRegex *regex = [GTMRegex regexWithPattern:@"foo+ba+r"];
  STAssertNotNil(regex, nil);
  
  // test odd input
  NSEnumerator *enumerator = [regex segmentEnumeratorForString:@""];
  STAssertNotNil(enumerator, nil);
  enumerator = [regex segmentEnumeratorForString:nil];
  STAssertNil(enumerator, nil);
  
  // on w/ the normal tests
  enumerator = [regex segmentEnumeratorForString:@"afoobarbfooobaarfoobarzz"];
  STAssertNotNil(enumerator, nil);
  // "a"
  GTMRegexStringSegment *seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"a", nil);
  // "foobar"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"foobar", nil);
  // "b"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"b", nil);
  // "fooobaar"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"fooobaar", nil);
  // "foobar"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"foobar", nil);
  // "zz"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"zz", nil);
  // (end)
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // test no match
  enumerator = [regex segmentEnumeratorForString:@"aaa"];
  STAssertNotNil(enumerator, nil);
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"aaa", nil);
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // test only match
  enumerator = [regex segmentEnumeratorForString:@"foobar"];
  STAssertNotNil(enumerator, nil);
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"foobar", nil);
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // now test the saved sub segments
  regex = [GTMRegex regexWithPattern:@"(foo)((bar)|(baz))"];
  STAssertNotNil(regex, nil);
  STAssertEquals((NSUInteger)4, [regex subPatternCount], nil);
  enumerator = [regex segmentEnumeratorForString:@"foobarxxfoobaz"];
  STAssertNotNil(enumerator, nil);
  // "foobar"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"foobar", nil);
  STAssertEqualStrings([seg subPatternString:0], @"foobar", nil);
  STAssertEqualStrings([seg subPatternString:1], @"foo", nil);
  STAssertEqualStrings([seg subPatternString:2], @"bar", nil);
  STAssertEqualStrings([seg subPatternString:3], @"bar", nil);
  STAssertNil([seg subPatternString:4], nil); // nothing matched "(baz)"
  STAssertNil([seg subPatternString:5], nil);
  // "xx"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"xx", nil);
  STAssertEqualStrings([seg subPatternString:0], @"xx", nil);
  STAssertNil([seg subPatternString:1], nil);
  // "foobaz"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"foobaz", nil);
  STAssertEqualStrings([seg subPatternString:0], @"foobaz", nil);
  STAssertEqualStrings([seg subPatternString:1], @"foo", nil);
  STAssertEqualStrings([seg subPatternString:2], @"baz", nil);
  STAssertNil([seg subPatternString:3], nil); // (nothing matched "(bar)"
  STAssertEqualStrings([seg subPatternString:4], @"baz", nil);
  STAssertNil([seg subPatternString:5], nil);
  // (end)
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // test all objects
  regex = [GTMRegex regexWithPattern:@"foo+ba+r"];
  STAssertNotNil(regex, nil);
  enumerator = [regex segmentEnumeratorForString:@"afoobarbfooobaarfoobarzz"];
  STAssertNotNil(enumerator, nil);
  NSArray *allSegments = [enumerator allObjects];
  STAssertNotNil(allSegments, nil);
  STAssertEquals((NSUInteger)6, [allSegments count], nil);

  // test we are getting the flags right for newline
  regex = [GTMRegex regexWithPattern:@"^a"];
  STAssertNotNil(regex, nil);
  enumerator = [regex segmentEnumeratorForString:@"aa\naa"];
  STAssertNotNil(enumerator, nil);
  // "a"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"a", nil);
  // "a\n"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"a\n", nil);
  // "a"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"a", nil);
  // "a"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"a", nil);
  // (end)
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // test we are getting the flags right for newline, part 2
  regex = [GTMRegex regexWithPattern:@"^a*$"];
  STAssertNotNil(regex, nil);
  enumerator = [regex segmentEnumeratorForString:@"aa\naa\nbb\naa"];
  STAssertNotNil(enumerator, nil);
  // "aa"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"aa", nil);
  // "\n"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"\n", nil);
  // "aa"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"aa", nil);
  // "\nbb\n"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"\nbb\n", nil);
  // "aa"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"aa", nil);
  // (end)
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // make sure the enum cleans up if not walked to the end
  regex = [GTMRegex regexWithPattern:@"b+"];
  STAssertNotNil(regex, nil);
  enumerator = [regex segmentEnumeratorForString:@"aabbcc"];
  STAssertNotNil(enumerator, nil);
  // "aa"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"aa", nil);
  // and done w/o walking the rest
}

- (void)testMatchSegmentEnumeratorForString {
  GTMRegex *regex = [GTMRegex regexWithPattern:@"foo+ba+r"];
  STAssertNotNil(regex, nil);

  // test odd input
  NSEnumerator *enumerator = [regex matchSegmentEnumeratorForString:@""];
  STAssertNotNil(enumerator, nil);
  enumerator = [regex matchSegmentEnumeratorForString:nil];
  STAssertNil(enumerator, nil);
  
  // on w/ the normal tests
  enumerator = [regex matchSegmentEnumeratorForString:@"afoobarbfooobaarfoobarzz"];
  STAssertNotNil(enumerator, nil);
  // "a" - skipped
  // "foobar"
  GTMRegexStringSegment *seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"foobar", nil);
  // "b" - skipped
  // "fooobaar"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"fooobaar", nil);
  // "foobar"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"foobar", nil);
  // "zz" - skipped
  // (end)
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // test no match
  enumerator = [regex matchSegmentEnumeratorForString:@"aaa"];
  STAssertNotNil(enumerator, nil);
  seg = [enumerator nextObject];
  STAssertNil(seg, nil); // should have gotten nothing

  // test only match
  enumerator = [regex matchSegmentEnumeratorForString:@"foobar"];
  STAssertNotNil(enumerator, nil);
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"foobar", nil);
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // now test the saved sub segments
  regex = [GTMRegex regexWithPattern:@"(foo)((bar)|(baz))"];
  STAssertNotNil(regex, nil);
  STAssertEquals((NSUInteger)4, [regex subPatternCount], nil);
  enumerator = [regex matchSegmentEnumeratorForString:@"foobarxxfoobaz"];
  STAssertNotNil(enumerator, nil);
  // "foobar"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"foobar", nil);
  STAssertEqualStrings([seg subPatternString:0], @"foobar", nil);
  STAssertEqualStrings([seg subPatternString:1], @"foo", nil);
  STAssertEqualStrings([seg subPatternString:2], @"bar", nil);
  STAssertEqualStrings([seg subPatternString:3], @"bar", nil);
  STAssertNil([seg subPatternString:4], nil); // nothing matched "(baz)"
  STAssertNil([seg subPatternString:5], nil);
  // "xx" - skipped
  // "foobaz"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"foobaz", nil);
  STAssertEqualStrings([seg subPatternString:0], @"foobaz", nil);
  STAssertEqualStrings([seg subPatternString:1], @"foo", nil);
  STAssertEqualStrings([seg subPatternString:2], @"baz", nil);
  STAssertNil([seg subPatternString:3], nil); // (nothing matched "(bar)"
  STAssertEqualStrings([seg subPatternString:4], @"baz", nil);
  STAssertNil([seg subPatternString:5], nil);
  // (end)
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // test all objects
  regex = [GTMRegex regexWithPattern:@"foo+ba+r"];
  STAssertNotNil(regex, nil);
  enumerator = [regex matchSegmentEnumeratorForString:@"afoobarbfooobaarfoobarzz"];
  STAssertNotNil(enumerator, nil);
  NSArray *allSegments = [enumerator allObjects];
  STAssertNotNil(allSegments, nil);
  STAssertEquals((NSUInteger)3, [allSegments count], nil);
  
  // test we are getting the flags right for newline
  regex = [GTMRegex regexWithPattern:@"^a"];
  STAssertNotNil(regex, nil);
  enumerator = [regex matchSegmentEnumeratorForString:@"aa\naa"];
  STAssertNotNil(enumerator, nil);
  // "a"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"a", nil);
  // "a\n" - skipped
  // "a"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"a", nil);
  // "a" - skipped
  // (end)
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // test we are getting the flags right for newline, part 2
  regex = [GTMRegex regexWithPattern:@"^a*$"];
  STAssertNotNil(regex, nil);
  enumerator = [regex matchSegmentEnumeratorForString:@"aa\naa\nbb\naa"];
  STAssertNotNil(enumerator, nil);
  // "aa"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"aa", nil);
  // "\n" - skipped
  // "aa"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"aa", nil);
  // "\nbb\n" - skipped
  // "aa"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"aa", nil);
  // (end)
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);
}

- (void)testStringByReplacingMatchesInStringWithReplacement {
  GTMRegex *regex = [GTMRegex regexWithPattern:@"(foo)(.*)(bar)"];
  STAssertNotNil(regex, nil);
  // the basics
  STAssertEqualStrings(@"weeZbarZbydoo spamZfooZdoggies",
                       [regex stringByReplacingMatchesInString:@"weefoobydoo spambardoggies"
                                               withReplacement:@"Z\\3Z\\2Z\\1Z"],
                       nil);
  // nil/empty replacement
  STAssertEqualStrings(@"weedoggies",
                       [regex stringByReplacingMatchesInString:@"weefoobydoo spambardoggies"
                                               withReplacement:nil],
                       nil);
  STAssertEqualStrings(@"weedoggies",
                       [regex stringByReplacingMatchesInString:@"weefoobydoo spambardoggies"
                                               withReplacement:@""],
                       nil);
  STAssertEqualStrings(@"",
                       [regex stringByReplacingMatchesInString:@""
                                               withReplacement:@"abc"],
                       nil);
  STAssertNil([regex stringByReplacingMatchesInString:nil
                                      withReplacement:@"abc"],
              nil);
  // use optional and invale subexpression parts to confirm that works
  regex = [GTMRegex regexWithPattern:@"(fo(o+))((bar)|(baz))"];
  STAssertNotNil(regex, nil);
  STAssertEqualStrings(@"aaa baz bar bar foo baz aaa",
                       [regex stringByReplacingMatchesInString:@"aaa foooooobaz fooobar bar foo baz aaa"
                                               withReplacement:@"\\4\\5"],
                       nil);
  STAssertEqualStrings(@"aaa ZZZ ZZZ bar foo baz aaa",
                       [regex stringByReplacingMatchesInString:@"aaa foooooobaz fooobar bar foo baz aaa"
                                               withReplacement:@"Z\\10Z\\12Z"],
                       nil);
  // test slashes in replacement that aren't part of the subpattern reference
  regex = [GTMRegex regexWithPattern:@"a+"];
  STAssertNotNil(regex, nil);
  STAssertEqualStrings(@"z\\\\0 \\\\a \\\\\\\\0z",
                       [regex stringByReplacingMatchesInString:@"zaz"
                                               withReplacement:@"\\\\0 \\\\\\0 \\\\\\\\0"],
                       nil);
  STAssertEqualStrings(@"z\\\\a \\\\\\\\0 \\\\\\\\az",
                       [regex stringByReplacingMatchesInString:@"zaz"
                                               withReplacement:@"\\\\\\0 \\\\\\\\0 \\\\\\\\\\0"],
                       nil);
  STAssertEqualStrings(@"z\\\\\\\\0 \\\\\\\\a \\\\\\\\\\\\0z",
                       [regex stringByReplacingMatchesInString:@"zaz"
                                               withReplacement:@"\\\\\\\\0 \\\\\\\\\\0 \\\\\\\\\\\\0"],
                       nil);
}

- (void)testDescriptions {
  // default options
  GTMRegex *regex = [GTMRegex regexWithPattern:@"a+"];
  STAssertNotNil(regex, nil);
  STAssertGreaterThan([[regex description] length], (NSUInteger)10,
                      @"failed to get a reasonable description for regex");
  // enumerator
  NSEnumerator *enumerator = [regex segmentEnumeratorForString:@"aaabbbccc"];
  STAssertNotNil(enumerator, nil);
  STAssertGreaterThan([[enumerator description] length], (NSUInteger)10,
                      @"failed to get a reasonable description for regex enumerator");
  // string segment
  GTMRegexStringSegment *seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertGreaterThan([[seg description] length], (NSUInteger)10,
                      @"failed to get a reasonable description for regex string segment");
  // regex w/ other options
  regex = [GTMRegex regexWithPattern:@"a+"
                             options:(kGTMRegexOptionIgnoreCase | kGTMRegexOptionSupressNewlineSupport)];
  STAssertNotNil(regex, nil);
  STAssertGreaterThan([[regex description] length], (NSUInteger)10,
                      @"failed to get a reasonable description for regex w/ options");
}

@end

@implementation NSString_GTMRegexAdditions
// Only partial tests to test that the call get through correctly since the
// above really tests them.

- (void)testMatchesPattern {
  // simple pattern
  STAssertTrue([@"foobar" gtm_matchesPattern:@"foo.*bar"], nil);
  STAssertTrue([@"foobydoo spambar" gtm_matchesPattern:@"foo.*bar"], nil);
  STAssertFalse([@"zzfoobarzz" gtm_matchesPattern:@"foo.*bar"], nil);
  STAssertFalse([@"zzfoobydoo spambarzz" gtm_matchesPattern:@"foo.*bar"], nil);
  STAssertFalse([@"abcdef" gtm_matchesPattern:@"foo.*bar"], nil);
  STAssertFalse([@"" gtm_matchesPattern:@"foo.*bar"], nil);
  // pattern w/ sub patterns
  STAssertTrue([@"foobar" gtm_matchesPattern:@"(foo)(.*)(bar)"], nil);
  STAssertTrue([@"foobydoo spambar" gtm_matchesPattern:@"(foo)(.*)(bar)"], nil);
  STAssertFalse([@"zzfoobarzz" gtm_matchesPattern:@"(foo)(.*)(bar)"], nil);
  STAssertFalse([@"zzfoobydoo spambarzz" gtm_matchesPattern:@"(foo)(.*)(bar)"], nil);
  STAssertFalse([@"abcdef" gtm_matchesPattern:@"(foo)(.*)(bar)"], nil);
  STAssertFalse([@"" gtm_matchesPattern:@"(foo)(.*)(bar)"], nil);
}

- (void)testSubPatternsOfPattern {
  NSArray *subPatterns = [@"foooooobaz" gtm_subPatternsOfPattern:@"(fo(o+))((bar)|(baz))"];
  STAssertNotNil(subPatterns, nil);
  STAssertEquals((NSUInteger)6, [subPatterns count], nil);
  STAssertEqualStrings(@"foooooobaz", [subPatterns objectAtIndex:0], nil);
  STAssertEqualStrings(@"foooooo", [subPatterns objectAtIndex:1], nil);
  STAssertEqualStrings(@"ooooo", [subPatterns objectAtIndex:2], nil);
  STAssertEqualStrings(@"baz", [subPatterns objectAtIndex:3], nil);
  STAssertEqualObjects([NSNull null], [subPatterns objectAtIndex:4], nil);
  STAssertEqualStrings(@"baz", [subPatterns objectAtIndex:5], nil);

  // not there
  subPatterns = [@"aaa" gtm_subPatternsOfPattern:@"(fo(o+))((bar)|(baz))"];
  STAssertNil(subPatterns, nil);

  // not extra stuff on either end
  subPatterns = [@"ZZZfoooooobaz" gtm_subPatternsOfPattern:@"(fo(o+))((bar)|(baz))"];
  STAssertNil(subPatterns, nil);
  subPatterns = [@"foooooobazZZZ" gtm_subPatternsOfPattern:@"(fo(o+))((bar)|(baz))"];
  STAssertNil(subPatterns, nil);
  subPatterns = [@"ZZZfoooooobazZZZ" gtm_subPatternsOfPattern:@"(fo(o+))((bar)|(baz))"];
  STAssertNil(subPatterns, nil);
}

- (void)testFirstSubStringMatchedByPattern {
  // simple pattern
  STAssertEqualStrings([@"foobar" gtm_firstSubStringMatchedByPattern:@"foo.*bar"],
                       @"foobar", nil);
  STAssertEqualStrings([@"foobydoo spambar" gtm_firstSubStringMatchedByPattern:@"foo.*bar"],
                       @"foobydoo spambar", nil);
  STAssertEqualStrings([@"zzfoobarzz" gtm_firstSubStringMatchedByPattern:@"foo.*bar"],
                       @"foobar", nil);
  STAssertEqualStrings([@"zzfoobydoo spambarzz" gtm_firstSubStringMatchedByPattern:@"foo.*bar"],
                       @"foobydoo spambar", nil);
  STAssertNil([@"abcdef" gtm_firstSubStringMatchedByPattern:@"foo.*bar"], nil);
  STAssertNil([@"" gtm_firstSubStringMatchedByPattern:@"foo.*bar"], nil);
  // pattern w/ sub patterns
  STAssertEqualStrings([@"foobar" gtm_firstSubStringMatchedByPattern:@"(foo)(.*)(bar)"],
                       @"foobar", nil);
  STAssertEqualStrings([@"foobydoo spambar" gtm_firstSubStringMatchedByPattern:@"(foo)(.*)(bar)"],
                       @"foobydoo spambar", nil);
  STAssertEqualStrings([@"zzfoobarzz" gtm_firstSubStringMatchedByPattern:@"(foo)(.*)(bar)"],
                       @"foobar", nil);
  STAssertEqualStrings([@"zzfoobydoo spambarzz" gtm_firstSubStringMatchedByPattern:@"(foo)(.*)(bar)"],
                       @"foobydoo spambar", nil);
  STAssertNil([@"abcdef" gtm_firstSubStringMatchedByPattern:@"(foo)(.*)(bar)"], nil);
  STAssertNil([@"" gtm_firstSubStringMatchedByPattern:@"(foo)(.*)(bar)"], nil);
}

- (void)testSubStringMatchesPattern {
  // simple pattern
  STAssertTrue([@"foobar" gtm_subStringMatchesPattern:@"foo.*bar"], nil);
  STAssertTrue([@"foobydoo spambar" gtm_subStringMatchesPattern:@"foo.*bar"], nil);
  STAssertTrue([@"zzfoobarzz" gtm_subStringMatchesPattern:@"foo.*bar"], nil);
  STAssertTrue([@"zzfoobydoo spambarzz" gtm_subStringMatchesPattern:@"foo.*bar"], nil);
  STAssertFalse([@"abcdef" gtm_subStringMatchesPattern:@"foo.*bar"], nil);
  STAssertFalse([@"" gtm_subStringMatchesPattern:@"foo.*bar"], nil);
  // pattern w/ sub patterns
  STAssertTrue([@"foobar" gtm_subStringMatchesPattern:@"(foo)(.*)(bar)"], nil);
  STAssertTrue([@"foobydoo spambar" gtm_subStringMatchesPattern:@"(foo)(.*)(bar)"], nil);
  STAssertTrue([@"zzfoobarzz" gtm_subStringMatchesPattern:@"(foo)(.*)(bar)"], nil);
  STAssertTrue([@"zzfoobydoo spambarzz" gtm_subStringMatchesPattern:@"(foo)(.*)(bar)"], nil);
  STAssertFalse([@"abcdef" gtm_subStringMatchesPattern:@"(foo)(.*)(bar)"], nil);
  STAssertFalse([@"" gtm_subStringMatchesPattern:@"(foo)(.*)(bar)"], nil);
}

- (void)testSegmentEnumeratorForPattern {
  NSEnumerator *enumerator =
    [@"afoobarbfooobaarfoobarzz" gtm_segmentEnumeratorForPattern:@"foo+ba+r"];
  STAssertNotNil(enumerator, nil);
  // "a"
  GTMRegexStringSegment *seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"a", nil);
  // "foobar"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"foobar", nil);
  // "b"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"b", nil);
  // "fooobaar"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"fooobaar", nil);
  // "foobar"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"foobar", nil);
  // "zz"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"zz", nil);
  // (end)
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // test no match
  enumerator = [@"aaa" gtm_segmentEnumeratorForPattern:@"foo+ba+r"];
  STAssertNotNil(enumerator, nil);
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"aaa", nil);
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // test only match
  enumerator = [@"foobar" gtm_segmentEnumeratorForPattern:@"foo+ba+r"];
  STAssertNotNil(enumerator, nil);
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"foobar", nil);
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // now test the saved sub segments
  enumerator =
    [@"foobarxxfoobaz" gtm_segmentEnumeratorForPattern:@"(foo)((bar)|(baz))"];
  STAssertNotNil(enumerator, nil);
  // "foobar"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"foobar", nil);
  STAssertEqualStrings([seg subPatternString:0], @"foobar", nil);
  STAssertEqualStrings([seg subPatternString:1], @"foo", nil);
  STAssertEqualStrings([seg subPatternString:2], @"bar", nil);
  STAssertEqualStrings([seg subPatternString:3], @"bar", nil);
  STAssertNil([seg subPatternString:4], nil); // nothing matched "(baz)"
  STAssertNil([seg subPatternString:5], nil);
  // "xx"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertFalse([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"xx", nil);
  STAssertEqualStrings([seg subPatternString:0], @"xx", nil);
  STAssertNil([seg subPatternString:1], nil);
  // "foobaz"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"foobaz", nil);
  STAssertEqualStrings([seg subPatternString:0], @"foobaz", nil);
  STAssertEqualStrings([seg subPatternString:1], @"foo", nil);
  STAssertEqualStrings([seg subPatternString:2], @"baz", nil);
  STAssertNil([seg subPatternString:3], nil); // (nothing matched "(bar)"
  STAssertEqualStrings([seg subPatternString:4], @"baz", nil);
  STAssertNil([seg subPatternString:5], nil);
  // (end)
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // test all objects
  enumerator = [@"afoobarbfooobaarfoobarzz" gtm_segmentEnumeratorForPattern:@"foo+ba+r"];
  STAssertNotNil(enumerator, nil);
  NSArray *allSegments = [enumerator allObjects];
  STAssertNotNil(allSegments, nil);
  STAssertEquals((NSUInteger)6, [allSegments count], nil);
}

- (void)testMatchSegmentEnumeratorForPattern {
  NSEnumerator *enumerator =
    [@"afoobarbfooobaarfoobarzz" gtm_matchSegmentEnumeratorForPattern:@"foo+ba+r"];
  STAssertNotNil(enumerator, nil);
  // "a" - skipped
  // "foobar"
  GTMRegexStringSegment *seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"foobar", nil);
  // "b" - skipped
  // "fooobaar"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"fooobaar", nil);
  // "foobar"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"foobar", nil);
  // "zz" - skipped
  // (end)
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // test no match
  enumerator = [@"aaa" gtm_matchSegmentEnumeratorForPattern:@"foo+ba+r"];
  STAssertNotNil(enumerator, nil);
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // test only match
  enumerator = [@"foobar" gtm_matchSegmentEnumeratorForPattern:@"foo+ba+r"];
  STAssertNotNil(enumerator, nil);
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"foobar", nil);
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // now test the saved sub segments
  enumerator =
    [@"foobarxxfoobaz" gtm_matchSegmentEnumeratorForPattern:@"(foo)((bar)|(baz))"];
  STAssertNotNil(enumerator, nil);
  // "foobar"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"foobar", nil);
  STAssertEqualStrings([seg subPatternString:0], @"foobar", nil);
  STAssertEqualStrings([seg subPatternString:1], @"foo", nil);
  STAssertEqualStrings([seg subPatternString:2], @"bar", nil);
  STAssertEqualStrings([seg subPatternString:3], @"bar", nil);
  STAssertNil([seg subPatternString:4], nil); // nothing matched "(baz)"
  STAssertNil([seg subPatternString:5], nil);
  // "xx" - skipped
  // "foobaz"
  seg = [enumerator nextObject];
  STAssertNotNil(seg, nil);
  STAssertTrue([seg isMatch], nil);
  STAssertEqualStrings([seg string], @"foobaz", nil);
  STAssertEqualStrings([seg subPatternString:0], @"foobaz", nil);
  STAssertEqualStrings([seg subPatternString:1], @"foo", nil);
  STAssertEqualStrings([seg subPatternString:2], @"baz", nil);
  STAssertNil([seg subPatternString:3], nil); // (nothing matched "(bar)"
  STAssertEqualStrings([seg subPatternString:4], @"baz", nil);
  STAssertNil([seg subPatternString:5], nil);
  // (end)
  seg = [enumerator nextObject];
  STAssertNil(seg, nil);

  // test all objects
  enumerator = [@"afoobarbfooobaarfoobarzz" gtm_matchSegmentEnumeratorForPattern:@"foo+ba+r"];
  STAssertNotNil(enumerator, nil);
  NSArray *allSegments = [enumerator allObjects];
  STAssertNotNil(allSegments, nil);
  STAssertEquals((NSUInteger)3, [allSegments count], nil);
}

- (void)testAllSubstringsMatchedByPattern {
  NSArray *segments =
    [@"afoobarbfooobaarfoobarzz" gtm_allSubstringsMatchedByPattern:@"foo+ba+r"];
  STAssertNotNil(segments, nil);
  STAssertEquals((NSUInteger)3, [segments count], nil);
  STAssertEqualStrings([segments objectAtIndex:0], @"foobar", nil);
  STAssertEqualStrings([segments objectAtIndex:1], @"fooobaar", nil);
  STAssertEqualStrings([segments objectAtIndex:2], @"foobar", nil);

  // test no match
  segments = [@"aaa" gtm_allSubstringsMatchedByPattern:@"foo+ba+r"];
  STAssertNotNil(segments, nil);
  STAssertEquals((NSUInteger)0, [segments count], nil);

  // test only match
  segments = [@"foobar" gtm_allSubstringsMatchedByPattern:@"foo+ba+r"];
  STAssertNotNil(segments, nil);
  STAssertEquals((NSUInteger)1, [segments count], nil);
  STAssertEqualStrings([segments objectAtIndex:0], @"foobar", nil);
}

- (void)testStringByReplacingMatchesOfPatternWithReplacement {
  // the basics
  STAssertEqualStrings(@"weeZbarZbydoo spamZfooZdoggies",
                       [@"weefoobydoo spambardoggies" gtm_stringByReplacingMatchesOfPattern:@"(foo)(.*)(bar)"
                                                                            withReplacement:@"Z\\3Z\\2Z\\1Z"],
                       nil);
  // nil/empty replacement
  STAssertEqualStrings(@"weedoggies",
                       [@"weefoobydoo spambardoggies" gtm_stringByReplacingMatchesOfPattern:@"(foo)(.*)(bar)"
                                                                            withReplacement:nil],
                       nil);
  STAssertEqualStrings(@"weedoggies",
                       [@"weefoobydoo spambardoggies" gtm_stringByReplacingMatchesOfPattern:@"(foo)(.*)(bar)"
                                                                            withReplacement:@""],
                       nil);
  STAssertEqualStrings(@"",
                       [@"" gtm_stringByReplacingMatchesOfPattern:@"(foo)(.*)(bar)"
                                               withReplacement:@"abc"],
                       nil);
  // use optional and invale subexpression parts to confirm that works
  STAssertEqualStrings(@"aaa baz bar bar foo baz aaa",
                       [@"aaa foooooobaz fooobar bar foo baz aaa" gtm_stringByReplacingMatchesOfPattern:@"(fo(o+))((bar)|(baz))"
                                                                                        withReplacement:@"\\4\\5"],
                       nil);
  STAssertEqualStrings(@"aaa ZZZ ZZZ bar foo baz aaa",
                       [@"aaa foooooobaz fooobar bar foo baz aaa" gtm_stringByReplacingMatchesOfPattern:@"(fo(o+))((bar)|(baz))"
                                                                                        withReplacement:@"Z\\10Z\\12Z"],
                       nil);
  // test slashes in replacement that aren't part of the subpattern reference
  STAssertEqualStrings(@"z\\\\0 \\\\a \\\\\\\\0z",
                       [@"zaz" gtm_stringByReplacingMatchesOfPattern:@"a+"
                                                     withReplacement:@"\\\\0 \\\\\\0 \\\\\\\\0"],
                       nil);
  STAssertEqualStrings(@"z\\\\a \\\\\\\\0 \\\\\\\\az",
                       [@"zaz" gtm_stringByReplacingMatchesOfPattern:@"a+"
                                                     withReplacement:@"\\\\\\0 \\\\\\\\0 \\\\\\\\\\0"],
                       nil);
  STAssertEqualStrings(@"z\\\\\\\\0 \\\\\\\\a \\\\\\\\\\\\0z",
                       [@"zaz" gtm_stringByReplacingMatchesOfPattern:@"a+"
                                                     withReplacement:@"\\\\\\\\0 \\\\\\\\\\0 \\\\\\\\\\\\0"],
                       nil);
}

@end
