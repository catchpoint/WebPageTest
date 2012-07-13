//
//  GTMUnitTestingTest.m
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

#import "GTMSenTestCase.h"
#import "GTMUnitTestingTest.h"
#import "GTMAppKit+UnitTesting.h"

NSString *const kGTMWindowNibName = @"GTMUnitTestingTest";
NSString *const kGTMWindowSaveFileName = @"GTMUnitTestingWindow";

@interface GTMUnitTestingTest : GTMTestCase {
  int expectedFailureCount_;
}
@end

// GTMUnitTestingTest support classes
@interface GTMUnitTestingView : NSObject <GTMUnitTestViewDrawer> {
  BOOL goodContext_;
}
- (BOOL)hadGoodContext;
@end

@interface GTMUnitTestingDelegate : NSObject <NSImageDelegate> {
  BOOL didEncode_;
}
- (BOOL)didEncode;
@end

@interface GTMUnitTestingProxyTest : NSProxy
- (id)init;
@end

@implementation GTMUnitTestingTest

// Brings up the window defined in the nib and takes a snapshot of it.
// We use the "empty" GTMUnitTestingTestController controller so that
// initWithWindowNibName can find the appropriate bundle to load our nib from.
// For some reason when running unit tests, with all the injecting going on
// the nib loader can get confused as to where it should load a nib from.
// Having a NSWindowController subclass in the same bundle as the nib seems
// to help the nib loader find the nib, and any custom classes that are attached
// to it.
- (void)testUnitTestingFramework {
  // set up our delegates so we can test delegate handling
  GTMUnitTestingDelegate *appDelegate = [[GTMUnitTestingDelegate alloc] init];
  [NSApp setDelegate:appDelegate];

  // Get our window
  GTMUnitTestingTestController *testWindowController
    = [[GTMUnitTestingTestController alloc] initWithWindowNibName:kGTMWindowNibName];
  NSWindow *window = [testWindowController window];
  // Test the app state. This will cover windows and menus
  GTMAssertObjectStateEqualToStateNamed(NSApp,
                                        @"GTMUnitTestingTestApp",
                                        @"Testing the app state");

  // Test the window image and state
  GTMAssertObjectEqualToStateAndImageNamed(window,
                                           kGTMWindowSaveFileName,
                                           @"Testing the window image and state");

  // Verify that all of our delegate encoders got called
  STAssertTrue([appDelegate didEncode], @"app delegate didn't get called?");

  // Clean up
  [NSApp setDelegate:nil];
  [appDelegate release];
  [testWindowController release];
}

- (void)testViewUnitTesting {
  GTMUnitTestingView *unitTestingView = [[GTMUnitTestingView alloc] init];
  GTMAssertDrawingEqualToImageNamed(unitTestingView,
                                    NSMakeSize(200,200),
                                    @"GTMUnitTestingView",
                                    NSApp,
                                    @"Testing view drawing");
  STAssertTrue([unitTestingView hadGoodContext], @"bad context?");
  [unitTestingView release];
}

- (void)testImageUnitTesting {
  NSImage *image = [NSImage imageNamed:@"NSApplicationIcon"];
  GTMUnitTestingDelegate *imgDelegate = [[GTMUnitTestingDelegate alloc] init];
  [image setDelegate:imgDelegate];
  GTMAssertObjectEqualToStateAndImageNamed(image,
                                           @"GTMUnitTestingImage",
                                           @"Testing NSImage image and state");
  STAssertTrue([imgDelegate didEncode], @"imgDelegate didn't get called?");
  [image setDelegate:nil];
  [imgDelegate release];
}

- (void)testFailures {
  NSString *const bogusTestName = @"GTMUnitTestTestingFailTest";
  NSString *tempDir = NSTemporaryDirectory();
  STAssertNotNil(tempDir, @"No Temp Dir?");
  NSString *originalPath = [NSObject gtm_getUnitTestSaveToDirectory];
  STAssertNotNil(originalPath, @"No save dir?");
  [NSObject gtm_setUnitTestSaveToDirectory:tempDir];
  STAssertEqualObjects(tempDir, [NSObject gtm_getUnitTestSaveToDirectory],
                       @"Save to dir not set?");
  NSString *statePath = [self gtm_saveToPathForStateNamed:bogusTestName];
  STAssertNotNil(statePath, @"no state path?");
  NSString *imagePath = [self gtm_saveToPathForImageNamed:bogusTestName];
  STAssertNotNil(imagePath, @"no image path?");
  GTMUnitTestingTestController *testWindowController
    = [[GTMUnitTestingTestController alloc] initWithWindowNibName:kGTMWindowNibName];
  NSWindow *window = [testWindowController window];

  // Test against a golden master filename that doesn't exist
  expectedFailureCount_ = 2;
  GTMAssertObjectEqualToStateAndImageNamed(window,
                                           bogusTestName,
                                           @"Creating image and state files");
  STAssertEquals(expectedFailureCount_, 0,
                 @"Didn't get expected failures creating files");

  // Change our image and state and verify failures
  [[testWindowController textField] setStringValue:@"Foo"];
  expectedFailureCount_ = 2;
  GTMAssertObjectEqualToStateAndImageNamed(window,
                                           kGTMWindowSaveFileName,
                                           @"Testing the window image and state");
  STAssertEquals(expectedFailureCount_, 0,
                 @"Didn't get expected failures testing files");

  // Now change the size of our image and verify failures
  NSRect oldFrame = [window frame];
  NSRect newFrame = oldFrame;
  newFrame.size.width += 1;
  [window setFrame:newFrame display:YES];
  expectedFailureCount_ = 1;
  GTMAssertObjectImageEqualToImageNamed(window,
                                        kGTMWindowSaveFileName,
                                        @"Testing the changed window size");
  [window setFrame:oldFrame display:YES];

  // Set our unit test save dir to a bogus directory and
  // run the tests again.
  [NSObject gtm_setUnitTestSaveToDirectory:@"/zim/blatz/foo/bob/bar"];
  expectedFailureCount_ = 2;
  GTMAssertObjectEqualToStateAndImageNamed(window,
                                           kGTMWindowSaveFileName,
                                           @"Testing the window image and state");
  STAssertEquals(expectedFailureCount_, 0,
                 @"Didn't get expected failures testing files");
  expectedFailureCount_ = 2;
  GTMAssertObjectEqualToStateAndImageNamed(window,
                                           @"GTMUnitTestingWindowDoesntExist",
                                           @"Testing the window image and state");
  STAssertEquals(expectedFailureCount_, 0,
                 @"Didn't get expected failures testing files");

  // Reset our unit test save dir
  [NSObject gtm_setUnitTestSaveToDirectory:nil];

  // Test against something that doesn't have an image
  expectedFailureCount_ = 1;
  GTMAssertObjectImageEqualToImageNamed(@"a string",
                                        @"GTMStringsDontHaveImages",
                                        @"Testing that strings should fail");
  STAssertEquals(expectedFailureCount_, 0, @"Didn't get expected failures testing files");

  // Test against something that doesn't implement our support
  expectedFailureCount_ = 1;
  GTMUnitTestingProxyTest *proxy = [[GTMUnitTestingProxyTest alloc] init];
  GTMAssertObjectStateEqualToStateNamed(proxy,
                                        @"NSProxiesDontDoState",
                                        @"Testing that NSProxy should fail");
  STAssertEquals(expectedFailureCount_, 0, @"Didn't get expected failures testing proxy");
  [proxy release];

  [window close];
}

- (void)failWithException:(NSException *)anException {
  if (expectedFailureCount_ > 0) {
    expectedFailureCount_ -= 1;
  } else {
    [super failWithException:anException];  // COV_NF_LINE - not expecting exception
  }
}


@end

@implementation GTMUnitTestingTestController
- (NSTextField *)textField {
  return field_;
}

@end

@implementation GTMUnitTestingDelegate

- (void)gtm_unitTestEncoderWillEncode:(id)sender inCoder:(NSCoder*)inCoder {
  // Test various encodings
  [inCoder encodeBool:YES forKey:@"BoolTest"];
  [inCoder encodeInt:1 forKey:@"IntTest"];
  [inCoder encodeInt32:1 forKey:@"Int32Test"];
  [inCoder encodeInt64:1 forKey:@"Int64Test"];
  [inCoder encodeFloat:1.0f forKey:@"FloatTest"];
  [inCoder encodeDouble:1.0 forKey:@"DoubleTest"];
  [inCoder encodeBytes:(const uint8_t*)"BytesTest" length:9 forKey:@"BytesTest"];
  didEncode_ = YES;
}

- (BOOL)didEncode {
  return didEncode_;
}
@end

@implementation GTMUnitTestingView

- (void)gtm_unitTestViewDrawRect:(NSRect)rect contextInfo:(void*)contextInfo {
  [[NSColor redColor] set];
  NSRectFill(rect);
  goodContext_ = [(id)contextInfo isEqualTo:NSApp];
}

- (BOOL)hadGoodContext {
  return goodContext_;
}
@end

// GTMUnitTestingProxyTest is for testing the case where we don't conform to
// the GTMUnitTestingEncoding protocol.
@implementation GTMUnitTestingProxyTest
- (id)init {
  return self;
}

- (BOOL)conformsToProtocol:(Protocol *)protocol {
  return NO;
}

@end
