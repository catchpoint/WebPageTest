//
//  GTMUILocalizerTest.m
//
//  Copyright 2011 Google Inc.
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

#import "GTMUILocalizerTest.h"
#import "GTMSenTestCase.h"

@interface TestUILocalizer : GTMUILocalizer
- (void)localize:(id)object;
@end

@implementation TestUILocalizer
- (NSString *)localizedStringForString:(NSString *)string {
  return [string substringFromIndex:5];
}

- (void)localize:(id)object {
  [self localizeObject:object recursively:YES];
}
@end


@implementation GTMUILocalizerTestViewController

@synthesize label = label_;

- (id)init {
  NSBundle *bundle = [NSBundle bundleForClass:[self class]];
  return [self initWithNibName:@"GTMUILocalizerTest" bundle:bundle];
}
@end

@interface GTMUILocalizerTest : GTMTestCase
@end

@implementation GTMUILocalizerTest
- (void)testLocalization {
  GTMUILocalizerTestViewController* controller =
    [[GTMUILocalizerTestViewController alloc] init];

  // Load the view.
  [controller view];

  STAssertEqualStrings(@"^IDS_FOO", [[controller label] text], nil);

// Accessibility label seems to not be working at all. They always are nil.
// Even when setting those explicitely there, the getter always returns nil.
// This might cause because the gobal accessibility switch is not on during the
// tests.
#if 0
  STAssertEqualStrings(@"^IDS_FOO", [[controller view] accessibilityLabel],
      nil);
  STAssertEqualStrings(@"^IDS_FOO", [[controller view] accessibilityHint],
      nil);
  STAssertEqualStrings(@"^IDS_FOO", [[controller label] accessibilityLabel],
      nil);
  STAssertEqualStrings(@"^IDS_FOO", [[controller label] accessibilityHint],
      nil);
#endif

  TestUILocalizer *localizer = [[TestUILocalizer alloc] init];
  [localizer localize:[controller view]];

  STAssertEqualStrings(@"FOO", [[controller label] text], nil);

// Accessibility label seems to not be working at all. They always are nil.
#if 0
  STAssertEqualStrings(@"FOO", [[controller view] accessibilityLabel], nil);
  STAssertEqualStrings(@"FOO", [[controller view] accessibilityHint], nil);
  STAssertEqualStrings(@"FOO", [[controller label] accessibilityLabel], nil);
  STAssertEqualStrings(@"FOO", [[controller label] accessibilityHint], nil);
#endif
}
@end
