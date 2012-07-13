/* Copyright (c) 2010 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#import "GTMURITemplate.h"

#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5

#import "GTMSenTestCase.h"
#import "GTMScriptRunner.h"

@interface GTMURITemplateTest : GTMTestCase
- (NSDictionary *)loadTestSuitesNamed:(NSString *)testSuitesName;
- (NSDictionary *)parseJSONString:(NSString *)json error:(NSError **)error;
- (void)runTestSuites:(NSDictionary *)testSuites;
@end

@implementation GTMURITemplateTest

- (NSDictionary *)parseJSONString:(NSString *)json error:(NSError **)error {
  NSDictionary *result = nil;

  // If we ever get a JSON parser in GTM (or the system gets one, next cat?),
  // then we can skip this conversion dance.

  NSString *fileName = [NSString stringWithFormat:@"URITemplate_%u.plist", arc4random()];
  NSString *tempOutPath = [NSTemporaryDirectory() stringByAppendingPathComponent:fileName];

  GTMScriptRunner *runner = [GTMScriptRunner runnerWithPython];
  NSString *command = [NSString stringWithFormat:
                       @"import Foundation\n"
                       @"import json\n"
                       @"str_of_json = \"\"\"%@\"\"\"\n"
                       @"Foundation.NSDictionary.dictionaryWithDictionary_(json.loads(str_of_json)).writeToFile_atomically_('%@', True)\n",
                       json, tempOutPath];
  NSString *errStr = nil;
  NSString *outStr = [runner run:command standardError:&errStr];

  STAssertNil(outStr, @"got something on stdout: %@", outStr);
  STAssertNil(errStr, @"got something on stderr: %@", errStr);
  result = [NSDictionary dictionaryWithContentsOfFile:tempOutPath];

  [[NSFileManager defaultManager] removeItemAtPath:tempOutPath
                                             error:NULL];

  return result;
}

- (NSDictionary *)loadTestSuitesNamed:(NSString *)testSuitesName {
  NSBundle *testBundle = [NSBundle bundleForClass:[self class]];
  STAssertNotNil(testBundle, nil);

  NSString *testSuitesPath = [testBundle pathForResource:testSuitesName
                                                  ofType:nil];
  STAssertNotNil(testSuitesPath, @"%@ not found", testSuitesName);

  NSError *error = nil;
  NSString *testSuitesStr = [NSString stringWithContentsOfFile:testSuitesPath
                                                      encoding:NSUTF8StringEncoding
                                                         error:&error];
  STAssertNil(error, @"Loading %@, error %@", testSuitesName, error);
  STAssertNotNil(testSuitesStr, @"Loading %@", testSuitesName);

  NSDictionary *testSuites = [self parseJSONString:testSuitesStr
                                             error:&error];
  STAssertNil(error, @"Parsing %@, error %@", testSuitesName, error);
  STAssertNotNil(testSuites, @"failed to parse");

  return testSuites;
}

- (void)runTestSuites:(NSDictionary *)testSuites {
  // The file holds a set of named suites...
  for (NSString *suiteName in testSuites) {
    NSDictionary *suite = [testSuites objectForKey:suiteName];
    // Each suite has variables and test cases...
    NSDictionary *vars = [suite objectForKey:@"variables"];
    NSArray *testCases = [suite objectForKey:@"testcases"];
    STAssertTrue([vars count] != 0, @"'%@' no variables?", suiteName);
    STAssertTrue([testCases count] != 0, @"'%@' no testcases?", suiteName);
    NSUInteger idx = 0;
    for (NSArray *testCase in testCases) {
      // Each case is an array of the template and value...
      STAssertEquals([testCase count], (NSUInteger)2,
                     @" test index %lu of '%@'", (unsigned long)idx, suiteName);

      NSString *testTemplate = [testCase objectAtIndex:0];
      NSString *expectedResult = [testCase objectAtIndex:1];

      NSString *result = [GTMURITemplate expandTemplate:testTemplate
                                                 values:vars];
      STAssertEqualObjects(result, expectedResult,
                           @"template was '%@' (index %lu of '%@')",
                           testTemplate, (unsigned long)idx, suiteName);
      ++idx;
    }
  }
}

- (void)testRFCSuite {
  // All of the examples from the RFC are in the python impl source as json
  // test data.  A copy is in the GTM tree as GTMURITemplateJSON.txt.  The
  // original can be found at:
  // http://code.google.com/p/uri-templates/source/browse/trunk/testdata.json
  NSDictionary *testSuites = [self loadTestSuitesNamed:@"GTMURITemplateRFCTests.json"];
  STAssertNotNil(testSuites, nil);
  [self runTestSuites:testSuites];
}

- (void)testExtraSuite {
  // These are follow up cases not explictly listed in the spec, but does
  // as cases to confirm behaviors.  The list was sent to the w3c uri list
  // for confirmation:
  //   http://lists.w3.org/Archives/Public/uri/2010Sep/thread.html
  NSDictionary *testSuites = [self loadTestSuitesNamed:@"GTMURITemplateExtraTests.json"];
  STAssertNotNil(testSuites, nil);
  [self runTestSuites:testSuites];
}

@end

#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
