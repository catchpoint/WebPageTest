//
//  GTMLoggerRingBufferWriterTest.m
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
#import "GTMLoggerRingBufferWriter.h"
#import "GTMLogger.h"
#import "GTMUnitTestDevLog.h"

// --------------------------------------------------
// CountingWriter keeps a count of the number of times it has been
// told to write something, and also keeps track of what it was
// asked to log.

@interface CountingWriter : NSObject<GTMLogWriter> {
 @private
  NSMutableArray *loggedContents_;
}

- (NSUInteger)count;
- (NSArray *)loggedContents;
- (void)reset;

@end  // CountingWriter

@implementation CountingWriter
- (void)logMessage:(NSString *)msg level:(GTMLoggerLevel)level {
  if (!loggedContents_) {
    loggedContents_ = [[NSMutableArray alloc] init];
  }
  [loggedContents_ addObject:msg];
}  // logMessage

- (void)dealloc {
  [loggedContents_ release];
  [super dealloc];
}  // dealloc

- (void)reset {
  [loggedContents_ release];
  loggedContents_ = nil;
}  // reset

- (NSUInteger)count {
  return [loggedContents_ count];
}  // count

- (NSArray *)loggedContents {
  return loggedContents_;
}  // loggedContents

@end  // CountingWriter


@interface GTMLoggerRingBufferWriterTest : GTMTestCase {
 @private
  GTMLogger *logger_;
  CountingWriter *countingWriter_;
}
@end  // GTMLoggerRingBufferWriterTest


// --------------------------------------------------

@implementation GTMLoggerRingBufferWriterTest

// Utilty to compare the set of messages captured by a CountingWriter
// with an array of expected messages.  The messages are expected to
// be in the same order in both places.

- (void)compareWriter:(CountingWriter *)writer
  withExpectedLogging:(NSArray *)expected
                 line:(int)line {
  NSArray *loggedContents = [writer loggedContents];

  STAssertEquals([expected count], [loggedContents count],
                 @"count mismatch from line %d", line);

  for (unsigned int i = 0; i < [expected count]; i++) {
    STAssertEqualObjects([expected objectAtIndex:i],
                         [loggedContents objectAtIndex:i],
                         @"logging mistmatch at index %d from line %d",
                         i, line);
  }
  
}  // compareWithExpectedLogging


- (void)setUp {
  countingWriter_ = [[CountingWriter alloc] init];
  logger_ = [[GTMLogger alloc] init];
}  // setUp


- (void)tearDown {
  [countingWriter_ release];
  [logger_ release];
}  // tearDown


- (void)testCreation {

  // Make sure initializers work.
  GTMLoggerRingBufferWriter *writer =
    [GTMLoggerRingBufferWriter ringBufferWriterWithCapacity:32
                                                     writer:countingWriter_];
  STAssertEquals([writer capacity], (NSUInteger)32, nil);
  STAssertTrue([writer writer] == countingWriter_, nil);
  STAssertEquals([writer count], (NSUInteger)0, nil);
  STAssertEquals([writer droppedLogCount], (NSUInteger)0, nil);
  STAssertEquals([writer totalLogged], (NSUInteger)0, nil);

  // Try with invalid arguments.  Should always get nil back.
  writer =
    [GTMLoggerRingBufferWriter ringBufferWriterWithCapacity:0
                                                     writer:countingWriter_];
  STAssertNil(writer, nil);

  writer = [GTMLoggerRingBufferWriter ringBufferWriterWithCapacity:32
                                                             writer:nil];
  STAssertNil(writer, nil);

  writer = [[GTMLoggerRingBufferWriter alloc] init];
  STAssertNil(writer, nil);

}  // testCreation


- (void)testLogging {
  GTMLoggerRingBufferWriter *writer =
    [GTMLoggerRingBufferWriter ringBufferWriterWithCapacity:4
                                                     writer:countingWriter_];
  [logger_ setWriter:writer];
  
  // Shouldn't do anything if there are no contents.
  [writer dumpContents];
  STAssertEquals([writer count], (NSUInteger)0, nil);
  STAssertEquals([countingWriter_ count], (NSUInteger)0, nil);

  // Log a single item.  Make sure the counts are accurate.
  [logger_ logDebug:@"oop"];
  STAssertEquals([writer count], (NSUInteger)1, nil);
  STAssertEquals([writer totalLogged], (NSUInteger)1, nil);
  STAssertEquals([writer droppedLogCount], (NSUInteger)0, nil);
  STAssertEquals([countingWriter_ count], (NSUInteger)0, nil);

  // Log a second item.  Also make sure counts are accurate.
  [logger_ logDebug:@"ack"];
  STAssertEquals([writer count], (NSUInteger)2, nil);
  STAssertEquals([writer totalLogged], (NSUInteger)2, nil);
  STAssertEquals([writer droppedLogCount], (NSUInteger)0, nil);
  STAssertEquals([countingWriter_ count], (NSUInteger)0, nil);

  // Print them, and make sure the countingWriter sees the right stuff.
  [writer dumpContents];
  STAssertEquals([countingWriter_ count], (NSUInteger)2, nil);
  STAssertEquals([writer count], (NSUInteger)2, nil);  // Should not be zeroed.
  STAssertEquals([writer totalLogged], (NSUInteger)2, nil);

  [self compareWriter:countingWriter_
        withExpectedLogging:[NSArray arrayWithObjects:@"oop",@"ack", nil]
                 line:__LINE__];


  // Wipe the slates clean.
  [writer reset];
  [countingWriter_ reset];
  STAssertEquals([writer count], (NSUInteger)0, nil);
  STAssertEquals([writer totalLogged], (NSUInteger)0, nil);

  // An error log level should print the buffer and empty it.
  [logger_ logDebug:@"oop"];
  [logger_ logInfo:@"ack"];
  STAssertEquals([writer droppedLogCount], (NSUInteger)0, nil);
  STAssertEquals([writer totalLogged], (NSUInteger)2, nil);

  [logger_ logError:@"blargh"];
  STAssertEquals([countingWriter_ count], (NSUInteger)3, nil);
  STAssertEquals([writer droppedLogCount], (NSUInteger)0, nil);

  [self compareWriter:countingWriter_
        withExpectedLogging:[NSArray arrayWithObjects:@"oop", @"ack",
                                     @"blargh", nil]
                 line:__LINE__];


  // An assert log level should do the same.  This also fills the
  // buffer to its limit without wrapping.
  [countingWriter_ reset];
  [logger_ logDebug:@"oop"];
  [logger_ logInfo:@"ack"];
  [logger_ logDebug:@"blargh"];
  STAssertEquals([writer droppedLogCount], (NSUInteger)0, nil);
  STAssertEquals([writer count], (NSUInteger)3, nil);
  STAssertEquals([writer totalLogged], (NSUInteger)3, nil);

  [logger_ logAssert:@"ouch"];
  STAssertEquals([countingWriter_ count], (NSUInteger)4, nil);
  STAssertEquals([writer droppedLogCount], (NSUInteger)0, nil);
  [self compareWriter:countingWriter_
        withExpectedLogging:[NSArray arrayWithObjects:@"oop", @"ack",
                                     @"blargh", @"ouch", nil]
                 line:__LINE__];


  // Try with exactly one wrap around.
  [countingWriter_ reset];
  [logger_ logInfo:@"ack"];
  [logger_ logDebug:@"oop"];
  [logger_ logDebug:@"blargh"];
  [logger_ logDebug:@"flong"];  // Fills buffer
  STAssertEquals([writer droppedLogCount], (NSUInteger)0, nil);
  STAssertEquals([writer count], (NSUInteger)4, nil);

  [logger_ logAssert:@"ouch"];  // should drop "ack"
  STAssertEquals([countingWriter_ count], (NSUInteger)4, nil);

  [self compareWriter:countingWriter_
        withExpectedLogging:[NSArray arrayWithObjects:@"oop", @"blargh",
                                     @"flong", @"ouch", nil]
                 line:__LINE__];


  // Try with more than one wrap around.
  [countingWriter_ reset];
  [logger_ logInfo:@"ack"];
  [logger_ logDebug:@"oop"];
  [logger_ logDebug:@"blargh"];
  [logger_ logDebug:@"flong"];  // Fills buffer
  [logger_ logDebug:@"bloogie"];  // should drop "ack"
  STAssertEquals([writer droppedLogCount], (NSUInteger)1, nil);
  STAssertEquals([writer count], (NSUInteger)4, nil);

  [logger_ logAssert:@"ouch"];  // should drop "oop"
  STAssertEquals([countingWriter_ count], (NSUInteger)4, nil);

  [self compareWriter:countingWriter_
        withExpectedLogging:[NSArray arrayWithObjects:@"blargh",
                                     @"flong", @"bloogie", @"ouch", nil]
                 line:__LINE__];
}  // testBasics


- (void)testCornerCases {
  // make sure we work with small buffer sizes.

  GTMLoggerRingBufferWriter *writer =
    [GTMLoggerRingBufferWriter ringBufferWriterWithCapacity:1
                                                     writer:countingWriter_];
  [logger_ setWriter:writer];

  [logger_ logInfo:@"ack"];
  STAssertEquals([countingWriter_ count], (NSUInteger)0, nil);  
  STAssertEquals([writer count], (NSUInteger)1, nil);
  [writer dumpContents];
  STAssertEquals([countingWriter_ count], (NSUInteger)1, nil);  

  [self compareWriter:countingWriter_
        withExpectedLogging:[NSArray arrayWithObjects:@"ack", nil]
                 line:__LINE__];

  [logger_ logDebug:@"oop"];  // should drop "ack"
  STAssertEquals([writer count], (NSUInteger)1, nil);
  STAssertEquals([writer droppedLogCount], (NSUInteger)1, nil);

  [countingWriter_ reset];
  [logger_ logError:@"snoogy"];  // should drop "oop"
  STAssertEquals([countingWriter_ count], (NSUInteger)1, nil);  

  [self compareWriter:countingWriter_
  withExpectedLogging:[NSArray arrayWithObjects:@"snoogy", nil]
                 line:__LINE__];

}  // testCornerCases



// Run 10 threads, all logging through the same logger.  

static volatile NSUInteger gStoppedThreads = 0; // Total number that have stopped.

- (void)bangMe:(id)info {
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];

  GTMLogger *logger = (GTMLogger *)info;

  // Log a string.
  for (int i = 0; i < 27; i++) {
    [logger logDebug:@"oop"];
  }

  // log another string which should push the first string out.
  // if we see any "oop"s in the logger output, then we know it got
  // confused.
  for (int i = 0; i < 15; i++) {
    [logger logDebug:@"ack"];
  }

  [pool release];
  @synchronized ([self class]) {
    gStoppedThreads++;
  }

}  // bangMe


- (void)testThreading {
  const NSUInteger kThreadCount = 10;
  const NSUInteger kCapacity = 10;

  GTMLoggerRingBufferWriter *writer =
    [GTMLoggerRingBufferWriter ringBufferWriterWithCapacity:kCapacity
                                                     writer:countingWriter_];
  [logger_ setWriter:writer];

  for (NSUInteger i = 0; i < kThreadCount; i++) {
    [NSThread detachNewThreadSelector:@selector(bangMe:)
                             toTarget:self
                           withObject:logger_];
  }

  // The threads are running, so wait for them all to finish.
  while (1) {
    NSDate *quick = [NSDate dateWithTimeIntervalSinceNow:0.2];
    [[NSRunLoop currentRunLoop] runUntilDate:quick];
    @synchronized ([self class]) {
      if (gStoppedThreads == kThreadCount) break;
    }
  }

  // Now make sure we get back what's expected.
  STAssertEquals([writer count], kThreadCount, nil);
  STAssertEquals([countingWriter_ count], (NSUInteger)0, nil);  // Nothing should be logged
  STAssertEquals([writer totalLogged], (NSUInteger)420, nil);

  [logger_ logError:@"bork"];
  STAssertEquals([countingWriter_ count], kCapacity, nil);
  
  NSArray *expected = [NSArray arrayWithObjects:
                       @"ack", @"ack", @"ack", @"ack", @"ack", 
                       @"ack", @"ack", @"ack", @"ack", @"bork",
                       nil];
  [self compareWriter:countingWriter_
  withExpectedLogging:expected
                 line:__LINE__];

}  // testThreading

@end  // GTMLoggerRingBufferWriterTest
