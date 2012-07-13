//
//  GTMFileSystemKQueueTest.m
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
#import "GTMFileSystemKQueue.h"
#import "GTMGarbageCollection.h"
#import "GTMUnitTestDevLog.h"


// Private methods of GTMFileSystemKQueue we use for some tests
@interface GTMFileSystemKQueue (PrivateMethods)
- (void)unregisterWithKQueue;
@end


@interface GTMFileSystemKQueueTest : GTMTestCase {
 @private
  NSString *testPath_;
  NSString *testPath2_;
}
@end


// Helper class to serve as callback target of the kqueue test
@interface GTMFSKQTestHelper : NSObject {
 @private
  int writes_, renames_, deletes_;
  __weak GTMFileSystemKQueue *queue_;
}
@end

@implementation GTMFSKQTestHelper

- (void)callbackForQueue:(GTMFileSystemKQueue *)queue
                  events:(GTMFileSystemKQueueEvents)event {
  // Can't use standard ST macros here because our helper
  // is not a subclass of GTMTestCase. This is intentional.
  if (queue != queue_) {
    NSString *file = [NSString stringWithUTF8String:__FILE__];
    NSException *exception
      = [NSException failureInEqualityBetweenObject:queue
                                          andObject:queue_
                                             inFile:file
                                             atLine:__LINE__
                                    withDescription:nil];
    [exception raise];
  }

  if (event & kGTMFileSystemKQueueWriteEvent) {
    ++writes_;
  }
  if (event & kGTMFileSystemKQueueDeleteEvent) {
    ++deletes_;
  }
  if (event & kGTMFileSystemKQueueRenameEvent) {
    ++renames_;
  }
}
- (int)totals {
  return writes_ + renames_ + deletes_;
}
- (int)writes {
  return writes_;
}
- (int)renames {
  return renames_;
}
- (int)deletes {
  return deletes_;
}

- (void)setKQueue:(GTMFileSystemKQueue *)queue {
  queue_ = queue;
}

@end


@implementation GTMFileSystemKQueueTest

- (void)setUp {
  NSString *temp = NSTemporaryDirectory();
  testPath_
    = [[temp stringByAppendingPathComponent:
                                  @"GTMFileSystemKQueueTest.testfile"] retain];
  testPath2_ = [[testPath_ stringByAppendingPathExtension:@"2"] retain];

  // make sure the files aren't in the way of the test
  NSFileManager *fm = [NSFileManager defaultManager];
#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
  NSError *error = nil;
  [fm removeItemAtPath:testPath_ error:&error];
  [fm removeItemAtPath:testPath2_ error:&error];
#else
  [fm removeFileAtPath:testPath_ handler:nil];
  [fm removeFileAtPath:testPath2_ handler:nil];
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
}

- (void)tearDown {
  // make sure we clean up the files from a failed test
  NSFileManager *fm = [NSFileManager defaultManager];
#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
  NSError *error = nil;
  [fm removeItemAtPath:testPath_ error:&error];
  [fm removeItemAtPath:testPath2_ error:&error];
#else
  [fm removeFileAtPath:testPath_ handler:nil];
  [fm removeFileAtPath:testPath2_ handler:nil];
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5

  [testPath_ release];
  testPath_ = nil;
  [testPath2_ release];
  testPath2_ = nil;
}

- (void)testInit {
  GTMFileSystemKQueue *testKQ;
  GTMFSKQTestHelper *helper = [[[GTMFSKQTestHelper alloc] init] autorelease];
  STAssertNotNil(helper, nil);

  // init should fail
  [GTMUnitTestDevLog expectString:@"Don't call init, use "
                     @"initWithPath:forEvents:acrossReplace:target:action:"];
  testKQ = [[[GTMFileSystemKQueue alloc] init] autorelease];
  STAssertNil(testKQ, nil);

  // no path
  testKQ
    = [[[GTMFileSystemKQueue alloc] initWithPath:nil
                                       forEvents:kGTMFileSystemKQueueAllEvents
                                   acrossReplace:YES
                                          target:helper
                                          action:@selector(callbackForQueue:events:)] autorelease];
  STAssertNil(testKQ, nil);

  // not events
  testKQ
    = [[[GTMFileSystemKQueue alloc] initWithPath:@"/var/log/system.log"
                                       forEvents:0
                                   acrossReplace:YES
                                          target:helper
                                          action:@selector(callbackForQueue:events:)] autorelease];
  STAssertNil(testKQ, nil);

  // no target
  testKQ
    = [[[GTMFileSystemKQueue alloc] initWithPath:@"/var/log/system.log"
                                       forEvents:kGTMFileSystemKQueueAllEvents
                                   acrossReplace:YES
                                          target:nil
                                          action:@selector(callbackForQueue:events:)] autorelease];
  STAssertNil(testKQ, nil);

  // no handler
  testKQ
    = [[[GTMFileSystemKQueue alloc] initWithPath:@"/var/log/system.log"
                                       forEvents:0
                                   acrossReplace:YES
                                          target:helper
                                          action:nil] autorelease];
  STAssertNil(testKQ, nil);


  // path that doesn't exist
  testKQ
    = [[[GTMFileSystemKQueue alloc] initWithPath:@"/path/that/does/not/exist"
                                       forEvents:kGTMFileSystemKQueueAllEvents
                                   acrossReplace:YES
                                          target:helper
                                          action:@selector(callbackForQueue:events:)] autorelease];
  STAssertNil(testKQ, nil);
}

- (void)spinForEvents:(GTMFSKQTestHelper *)helper {
  // Spin the runloop for a second so that the helper callbacks fire
  unsigned int attempts = 0;
  int initialTotals = [helper totals];
  while (([helper totals] == initialTotals) && (attempts < 10)) {  // Try for up to 2s
    [[NSRunLoop currentRunLoop] runUntilDate:[NSDate dateWithTimeIntervalSinceNow:0.2]];
    attempts++;
  }
}

- (void)testWriteAndDelete {

  NSFileManager *fm = [NSFileManager defaultManager];
  GTMFSKQTestHelper *helper = [[[GTMFSKQTestHelper alloc] init] autorelease];
  STAssertNotNil(helper, nil);

  STAssertTrue([fm createFileAtPath:testPath_ contents:nil attributes:nil], nil);
  NSFileHandle *testFH = [NSFileHandle fileHandleForWritingAtPath:testPath_];
  STAssertNotNil(testFH, nil);

  // Start monitoring the file
  GTMFileSystemKQueue *testKQ
    = [[GTMFileSystemKQueue alloc] initWithPath:testPath_
                                      forEvents:kGTMFileSystemKQueueAllEvents
                                  acrossReplace:YES
                                         target:helper
                                         action:@selector(callbackForQueue:events:)];
  STAssertNotNil(testKQ, nil);
  STAssertEqualObjects([testKQ path], testPath_, nil);
  [helper setKQueue:testKQ];

  // Write to the file
  [testFH writeData:[@"doh!" dataUsingEncoding:NSUnicodeStringEncoding]];

  // Spin the runloop for a second so that the helper callbacks fire
  [self spinForEvents:helper];
  STAssertEquals([helper totals], 1, nil);

  // Close and delete
  [testFH closeFile];
#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
  NSError *error = nil;
  STAssertTrue([fm removeItemAtPath:testPath_ error:&error], @"Err: %@", error);
#else
  STAssertTrue([fm removeFileAtPath:testPath_ handler:nil], nil);
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5

  [self spinForEvents:helper];
  STAssertEquals([helper totals], 2, nil);

  // Clean up the kqueue
  [testKQ release];
  testKQ = nil;

  STAssertEquals([helper writes], 1, nil);
  STAssertEquals([helper deletes], 1, nil);
  STAssertEquals([helper renames], 0, nil);
}

- (void)testWriteAndDeleteAndWrite {

  // One will pass YES to |acrossReplace|, the other will pass NO.

  NSFileManager *fm = [NSFileManager defaultManager];
  GTMFSKQTestHelper *helper = [[[GTMFSKQTestHelper alloc] init] autorelease];
  STAssertNotNil(helper, nil);
  GTMFSKQTestHelper *helper2 = [[[GTMFSKQTestHelper alloc] init] autorelease];
  STAssertNotNil(helper, nil);

  // Create a temp file path
  STAssertTrue([fm createFileAtPath:testPath_ contents:nil attributes:nil], nil);
  NSFileHandle *testFH = [NSFileHandle fileHandleForWritingAtPath:testPath_];
  STAssertNotNil(testFH, nil);

  // Start monitoring the file
  GTMFileSystemKQueue *testKQ
    = [[GTMFileSystemKQueue alloc] initWithPath:testPath_
                                      forEvents:kGTMFileSystemKQueueAllEvents
                                  acrossReplace:YES
                                         target:helper
                                         action:@selector(callbackForQueue:events:)];
  STAssertNotNil(testKQ, nil);
  STAssertEqualObjects([testKQ path], testPath_, nil);
  [helper setKQueue:testKQ];

  GTMFileSystemKQueue *testKQ2
    = [[GTMFileSystemKQueue alloc] initWithPath:testPath_
                                      forEvents:kGTMFileSystemKQueueAllEvents
                                  acrossReplace:NO
                                         target:helper2
                                         action:@selector(callbackForQueue:events:)];
  STAssertNotNil(testKQ2, nil);
  STAssertEqualObjects([testKQ2 path], testPath_, nil);
  [helper2 setKQueue:testKQ2];

  // Write to the file
  [testFH writeData:[@"doh!" dataUsingEncoding:NSUnicodeStringEncoding]];

  // Spin the runloop for a second so that the helper callbacks fire
  [self spinForEvents:helper];
  STAssertEquals([helper totals], 1, nil);
  STAssertEquals([helper2 totals], 1, nil);

  // Close and delete
  [testFH closeFile];
#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
  NSError *error = nil;
  STAssertTrue([fm removeItemAtPath:testPath_ error:&error], @"Err: %@", error);
#else
  STAssertTrue([fm removeFileAtPath:testPath_ handler:nil], nil);
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5

  // Recreate
  STAssertTrue([fm createFileAtPath:testPath_ contents:nil attributes:nil], nil);
  testFH = [NSFileHandle fileHandleForWritingAtPath:testPath_];
  STAssertNotNil(testFH, nil);
  [testFH writeData:[@"ha!" dataUsingEncoding:NSUnicodeStringEncoding]];

  // Spin the runloop for a second so that the helper callbacks fire
  [self spinForEvents:helper];
  STAssertEquals([helper totals], 2, nil);
  STAssertEquals([helper2 totals], 2, nil);

  // Write to it again
  [testFH writeData:[@"continued..." dataUsingEncoding:NSUnicodeStringEncoding]];

  // Spin the runloop for a second so that the helper callbacks fire
  [self spinForEvents:helper];
  STAssertEquals([helper totals], 3, nil);
  STAssertEquals([helper2 totals], 2, nil);

  // Close and delete
  [testFH closeFile];
#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
  STAssertTrue([fm removeItemAtPath:testPath_ error:&error], @"Err: %@", error);
#else
  STAssertTrue([fm removeFileAtPath:testPath_ handler:nil], nil);
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5

  // Spin the runloop for a second so that the helper callbacks fire
  [self spinForEvents:helper];
  STAssertEquals([helper totals], 4, nil);
  STAssertEquals([helper2 totals], 2, nil);

  // Clean up the kqueue
  [testKQ release];
  testKQ = nil;
  [testKQ2 release];
  testKQ2 = nil;

  STAssertEquals([helper writes], 2, nil);
  STAssertEquals([helper deletes], 2, nil);
  STAssertEquals([helper renames], 0, nil);
  STAssertEquals([helper2 writes], 1, nil);
  STAssertEquals([helper2 deletes], 1, nil);
  STAssertEquals([helper2 renames], 0, nil);
}

- (void)testWriteAndRenameAndWrite {

  // One will pass YES to |acrossReplace|, the other will pass NO.

  NSFileManager *fm = [NSFileManager defaultManager];
  GTMFSKQTestHelper *helper = [[[GTMFSKQTestHelper alloc] init] autorelease];
  STAssertNotNil(helper, nil);
  GTMFSKQTestHelper *helper2 = [[[GTMFSKQTestHelper alloc] init] autorelease];
  STAssertNotNil(helper2, nil);

  // Create a temp file path
  STAssertTrue([fm createFileAtPath:testPath_ contents:nil attributes:nil], nil);
  NSFileHandle *testFH = [NSFileHandle fileHandleForWritingAtPath:testPath_];
  STAssertNotNil(testFH, nil);

  // Start monitoring the file
  GTMFileSystemKQueue *testKQ
    = [[GTMFileSystemKQueue alloc] initWithPath:testPath_
                                      forEvents:kGTMFileSystemKQueueAllEvents
                                  acrossReplace:YES
                                         target:helper
                                         action:@selector(callbackForQueue:events:)];
  STAssertNotNil(testKQ, nil);
  STAssertEqualObjects([testKQ path], testPath_, nil);
  [helper setKQueue:testKQ];

  GTMFileSystemKQueue *testKQ2
    = [[GTMFileSystemKQueue alloc] initWithPath:testPath_
                                      forEvents:kGTMFileSystemKQueueAllEvents
                                  acrossReplace:NO
                                         target:helper2
                                         action:@selector(callbackForQueue:events:)];
  STAssertNotNil(testKQ2, nil);
  STAssertEqualObjects([testKQ2 path], testPath_, nil);
  [helper2 setKQueue:testKQ2];

  // Write to the file
  [testFH writeData:[@"doh!" dataUsingEncoding:NSUnicodeStringEncoding]];

  // Spin the runloop for a second so that the helper callbacks fire
  [self spinForEvents:helper];
  STAssertEquals([helper totals], 1, nil);
  STAssertEquals([helper2 totals], 1, nil);

  // Move it and create the file again
#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
  NSError *error = nil;
  STAssertTrue([fm moveItemAtPath:testPath_ toPath:testPath2_ error:&error],
               @"Error: %@", error);
#else
  STAssertTrue([fm movePath:testPath_ toPath:testPath2_ handler:nil], nil);
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5

  STAssertTrue([fm createFileAtPath:testPath_ contents:nil attributes:nil], nil);
  NSFileHandle *testFHPrime
    = [NSFileHandle fileHandleForWritingAtPath:testPath_];
  STAssertNotNil(testFHPrime, nil);
  [testFHPrime writeData:[@"eh?" dataUsingEncoding:NSUnicodeStringEncoding]];

  // Spin the runloop for a second so that the helper callbacks fire
  [self spinForEvents:helper];
  STAssertEquals([helper totals], 2, nil);
  STAssertEquals([helper2 totals], 2, nil);

  // Write to the new file
  [testFHPrime writeData:[@"continue..." dataUsingEncoding:NSUnicodeStringEncoding]];

  // Spin the runloop for a second so that the helper callbacks fire
  [self spinForEvents:helper];
  STAssertEquals([helper totals], 3, nil);
  STAssertEquals([helper2 totals], 2, nil);

  // Write to the old file
  [testFH writeData:[@"continue old..." dataUsingEncoding:NSUnicodeStringEncoding]];

  // Spin the runloop for a second so that the helper callbacks fire
  [self spinForEvents:helper];
  STAssertEquals([helper totals], 3, nil);
  STAssertEquals([helper2 totals], 3, nil);

  // and now close old
  [testFH closeFile];
#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
  STAssertTrue([fm removeItemAtPath:testPath2_ error:&error], @"Err: %@", error);
#else
  STAssertTrue([fm removeFileAtPath:testPath2_ handler:nil], nil);
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5

  // Spin the runloop for a second so that the helper callbacks fire
  [self spinForEvents:helper];
  STAssertEquals([helper totals], 3, nil);
  STAssertEquals([helper2 totals], 4, nil);

  // and now close new
  [testFHPrime closeFile];
#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
  STAssertTrue([fm removeItemAtPath:testPath_ error:&error], @"Err: %@", error);
#else
  STAssertTrue([fm removeFileAtPath:testPath_ handler:nil], nil);
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5

  // Spin the runloop for a second so that the helper callbacks fire
  [self spinForEvents:helper];
  STAssertEquals([helper totals], 4, nil);
  STAssertEquals([helper2 totals], 4, nil);

  // Clean up the kqueue
  [testKQ release];
  testKQ = nil;
  [testKQ2 release];
  testKQ2 = nil;

  STAssertEquals([helper writes], 2, nil);
  STAssertEquals([helper deletes], 1, nil);
  STAssertEquals([helper renames], 1, nil);
  STAssertEquals([helper2 writes], 2, nil);
  STAssertEquals([helper2 deletes], 1, nil);
  STAssertEquals([helper2 renames], 1, nil);
}

- (void)testNoSpinHang {
  // This case tests a specific historically problematic interaction of
  // GTMFileSystemKQueue and the runloop. GTMFileSystemKQueue uses the CFSocket
  // notifications (and thus the runloop) for monitoring, however, you can
  // dealloc the instance (and thus unregister the underlying kevent descriptor)
  // prior to any runloop spin. The unregister removes the pending notifications
  // from the monitored main kqueue file descriptor that CFSocket has previously
  // noticed but not yet called back. At that point a kevent() call in the
  // socket callback without a timeout would hang the runloop.

  // Warn this may hang
  NSLog(@"%s on failure this will hang.", __PRETTY_FUNCTION__);

  NSFileManager *fm = [NSFileManager defaultManager];
  GTMFSKQTestHelper *helper = [[[GTMFSKQTestHelper alloc] init] autorelease];
  STAssertNotNil(helper, nil);
  STAssertTrue([fm createFileAtPath:testPath_ contents:nil attributes:nil], nil);
  NSFileHandle *testFH = [NSFileHandle fileHandleForWritingAtPath:testPath_];
  STAssertNotNil(testFH, nil);

  // Start monitoring the file
  GTMFileSystemKQueue *testKQ
    = [[GTMFileSystemKQueue alloc] initWithPath:testPath_
                                      forEvents:kGTMFileSystemKQueueAllEvents
                                  acrossReplace:YES
                                         target:helper
                                         action:@selector(callbackForQueue:events:)];
  STAssertNotNil(testKQ, nil);
  STAssertEqualObjects([testKQ path], testPath_, nil);
  [helper setKQueue:testKQ];

  // Write to the file
  [testFH writeData:[@"doh!" dataUsingEncoding:NSUnicodeStringEncoding]];
  // Close and delete
  [testFH closeFile];
#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
  NSError *error = nil;
  STAssertTrue([fm removeItemAtPath:testPath_ error:&error], @"Err: %@", error);
#else
  STAssertTrue([fm removeFileAtPath:testPath_ handler:nil], nil);
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5

  // Now destroy the queue, with events outstanding from the CFSocket, but
  // unconsumed. For GC this involves us using a private method since |helper|
  // still has a reference. For non-GC we'll force the release.
  if (GTMIsGarbageCollectionEnabled()) {
    [testKQ unregisterWithKQueue];
  } else {
    STAssertEquals([testKQ retainCount], (NSUInteger)1, nil);
    [testKQ release];
    testKQ = nil;
  }

  // Spin the runloop, no events were delivered (and we should not hang)
  [self spinForEvents:helper];
  STAssertEquals([helper totals], 0, nil);
}

@end
