//
//  GTMLoggerTest.m
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

#import "GTMLogger.h"
#import "GTMRegex.h"
#import "GTMSenTestCase.h"
#import "GTMSystemVersion.h"


// A test writer that stores log messages in an array for easy retrieval.
@interface ArrayWriter : NSObject <GTMLogWriter> {
 @private
  NSMutableArray *messages_;
}
- (NSArray *)messages;
- (void)clear;
@end
@implementation ArrayWriter
- (id)init {
  if ((self = [super init])) {
    messages_ = [[NSMutableArray alloc] init];
  }
  return self;
}
- (void)dealloc {
  [messages_ release];
  [super dealloc];
}
- (NSArray *)messages {
  return messages_;
}
- (void)logMessage:(NSString *)msg level:(GTMLoggerLevel)level {
  [messages_ addObject:msg];
}
- (void)clear {
  [messages_ removeAllObjects];
}
@end  // ArrayWriter


// A formatter for testing that prepends the word DUMB to log messages, along
// with the log level number.
@interface DumbFormatter : GTMLogBasicFormatter
@end
@implementation DumbFormatter
- (NSString *)stringForFunc:(NSString *)func
                 withFormat:(NSString *)fmt
                     valist:(va_list)args
                      level:(GTMLoggerLevel)level {
  return [NSString stringWithFormat:@"DUMB [%d] %@", level,
          [super stringForFunc:nil withFormat:fmt valist:args level:level]];
}
@end  // DumbFormatter


// A test filter that ignores messages with the string "ignore".
@interface IgnoreFilter : NSObject <GTMLogFilter>
@end
@implementation IgnoreFilter
- (BOOL)filterAllowsMessage:(NSString *)msg level:(GTMLoggerLevel)level {
  NSRange range = [msg rangeOfString:@"ignore"];
  return (range.location == NSNotFound);
}
@end  // IgnoreFilter

//
// Begin test harness
//

@interface GTMLoggerTest : GTMTestCase {
 @private
  NSString *path_;
}
@end

@implementation GTMLoggerTest

- (void)setUp {
  path_ = [[NSTemporaryDirectory() stringByAppendingPathComponent:
            @"GTMLoggerUnitTest.log"] retain];
  STAssertNotNil(path_, nil);
  // Make sure we're cleaned up from the last run
#if MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5
  [[NSFileManager defaultManager] removeFileAtPath:path_ handler:nil];
#else
  [[NSFileManager defaultManager] removeItemAtPath:path_ error:NULL];
#endif
}

- (void)tearDown {
  STAssertNotNil(path_, nil);
#if MAC_OS_X_VERSION_MIN_REQUIRED < MAC_OS_X_VERSION_10_5
  [[NSFileManager defaultManager] removeFileAtPath:path_ handler:nil];
#else
  [[NSFileManager defaultManager] removeItemAtPath:path_ error:NULL];
#endif
  [path_ release];
  path_ = nil;
}

- (void)testCreation {
  GTMLogger *logger1 = nil, *logger2 = nil;

  logger1 = [GTMLogger sharedLogger];
  logger2 = [GTMLogger sharedLogger];

  STAssertTrue(logger1 == logger2, nil);

  STAssertNotNil([logger1 writer], nil);
  STAssertNotNil([logger1 formatter], nil);
  STAssertNotNil([logger1 filter], nil);

  // Get a new instance; not the shared instance
  logger2 = [GTMLogger standardLogger];

  STAssertTrue(logger1 != logger2, nil);
  STAssertNotNil([logger2 writer], nil);
  STAssertNotNil([logger2 formatter], nil);
  STAssertNotNil([logger2 filter], nil);

  // Set the new instance to be the shared logger.
  [GTMLogger setSharedLogger:logger2];
  STAssertTrue(logger2 == [GTMLogger sharedLogger], nil);
  STAssertTrue(logger1 != [GTMLogger sharedLogger], nil);

  // Set the shared logger to nil, which should reset it to a new "standard"
  // logger.
  [GTMLogger setSharedLogger:nil];
  STAssertNotNil([GTMLogger sharedLogger], nil);
  STAssertTrue(logger2 != [GTMLogger sharedLogger], nil);
  STAssertTrue(logger1 != [GTMLogger sharedLogger], nil);

  GTMLogger *logger = [GTMLogger logger];
  STAssertNotNil(logger, nil);

  logger = [GTMLogger standardLoggerWithStderr];
  STAssertNotNil(logger, nil);

  logger = [GTMLogger standardLoggerWithPath:path_];
  STAssertNotNil(logger, nil);
}

- (void)testAccessors {
  GTMLogger *logger = [GTMLogger standardLogger];
  STAssertNotNil(logger, nil);

  STAssertNotNil([logger writer], nil);
  STAssertNotNil([logger formatter], nil);
  STAssertNotNil([logger filter], nil);

  [logger setWriter:nil];
  [logger setFormatter:nil];
  [logger setFilter:nil];

  // These attributes should NOT be nil. They should be set to their defaults.
  STAssertNotNil([logger writer], nil);
  STAssertNotNil([logger formatter], nil);
  STAssertNotNil([logger filter], nil);
}

- (void)testLogger {
  ArrayWriter *writer = [[[ArrayWriter alloc] init] autorelease];
  IgnoreFilter *filter = [[[IgnoreFilter alloc] init] autorelease];

  // We actually only need the array writer instance for this unit test to pass,
  // but we combine that writer with a stdout writer for two reasons:
  //
  //   1. To test the NSArray composite writer object
  //   2. To make debugging easier by sending output to stdout
  //
  // We also include in the array an object that is not a GTMLogWriter to make
  // sure that we don't crash when presented with an array of non-GTMLogWriters.
  NSArray *writers = [NSArray arrayWithObjects:writer,
                      [NSFileHandle fileHandleWithStandardOutput],
                      @"blah", nil];

  GTMLogger *logger = [GTMLogger loggerWithWriter:writers
                                        formatter:nil  // basic formatter
                                           filter:filter];

  STAssertNotNil(logger, nil);

  // Log a few messages to test with
  [logger logInfo:@"hi"];
  [logger logDebug:@"foo"];
  [logger logError:@"blah"];
  [logger logAssert:@"baz"];

  // Makes sure the messages got logged
  NSArray *messages = [writer messages];
  STAssertNotNil(messages, nil);
  STAssertEquals([messages count], (NSUInteger)4, nil);
  STAssertEqualObjects([messages objectAtIndex:0], @"hi", nil);
  STAssertEqualObjects([messages objectAtIndex:1], @"foo", nil);
  STAssertEqualObjects([messages objectAtIndex:2], @"blah", nil);
  STAssertEqualObjects([messages objectAtIndex:3], @"baz", nil);

  // Log a message that should be ignored, and make sure it did NOT get logged
  [logger logInfo:@"please ignore this"];
  messages = [writer messages];
  STAssertNotNil(messages, nil);
  STAssertEquals([messages count], (NSUInteger)4, nil);
  STAssertEqualObjects([messages objectAtIndex:0], @"hi", nil);
  STAssertEqualObjects([messages objectAtIndex:1], @"foo", nil);
  STAssertEqualObjects([messages objectAtIndex:2], @"blah", nil);
  STAssertEqualObjects([messages objectAtIndex:3], @"baz", nil);

  // Change the formatter to our "dumb formatter"
  id<GTMLogFormatter> formatter = [[[DumbFormatter alloc] init] autorelease];
  [logger setFormatter:formatter];

  [logger logInfo:@"bleh"];
  messages = [writer messages];
  STAssertNotNil(messages, nil);
  STAssertEquals([messages count], (NSUInteger)5, nil);  // Message count should increase
  // The previously logged messages should not change
  STAssertEqualObjects([messages objectAtIndex:0], @"hi", nil);
  STAssertEqualObjects([messages objectAtIndex:1], @"foo", nil);
  STAssertEqualObjects([messages objectAtIndex:2], @"blah", nil);
  STAssertEqualObjects([messages objectAtIndex:3], @"baz", nil);
  STAssertEqualObjects([messages objectAtIndex:4], @"DUMB [2] bleh", nil);
}

- (void)testConvenienceMacros {
  ArrayWriter *writer = [[[ArrayWriter alloc] init] autorelease];
  NSArray *writers = [NSArray arrayWithObjects:writer,
                      [NSFileHandle fileHandleWithStandardOutput], nil];

  [[GTMLogger sharedLogger] setWriter:writers];

  // Here we log a message using a convenience macro, which should log the
  // message along with the name of the function it was called from. Here we
  // test to make sure the logged message does indeed contain the name of the
  // current function "testConvenienceMacros".
  GTMLoggerError(@"test ========================");
  STAssertEquals([[writer messages] count], (NSUInteger)1, nil);
  NSRange rangeOfFuncName =
    [[[writer messages] objectAtIndex:0] rangeOfString:@"testConvenienceMacros"];
  STAssertTrue(rangeOfFuncName.location != NSNotFound, nil);
  [writer clear];

  [[GTMLogger sharedLogger] setFormatter:nil];

  GTMLoggerInfo(@"test %d", 1);
  GTMLoggerDebug(@"test %d", 2);
  GTMLoggerError(@"test %d", 3);
  GTMLoggerAssert(@"test %d", 4);

  NSArray *messages = [writer messages];
  STAssertNotNil(messages, nil);

#ifdef DEBUG
  STAssertEquals([messages count], (NSUInteger)4, nil);
  STAssertEqualObjects([messages objectAtIndex:0], @"test 1", nil);
  STAssertEqualObjects([messages objectAtIndex:1], @"test 2", nil);
  STAssertEqualObjects([messages objectAtIndex:2], @"test 3", nil);
  STAssertEqualObjects([messages objectAtIndex:3], @"test 4", nil);
#else
  // In Release builds, only the Error and Assert messages will be logged
  STAssertEquals([messages count], (NSUInteger)2, nil);
  STAssertEqualObjects([messages objectAtIndex:0], @"test 3", nil);
  STAssertEqualObjects([messages objectAtIndex:1], @"test 4", nil);
#endif

}

- (void)testFileHandleWriter {
  NSFileHandle *fh = nil;

  fh = [NSFileHandle fileHandleForWritingAtPath:path_];
  STAssertNil(fh, nil);

  fh = [NSFileHandle fileHandleForLoggingAtPath:path_ mode:0644];
  STAssertNotNil(fh, nil);

  [fh logMessage:@"test 0" level:kGTMLoggerLevelUnknown];
  [fh logMessage:@"test 1" level:kGTMLoggerLevelDebug];
  [fh logMessage:@"test 2" level:kGTMLoggerLevelInfo];
  [fh logMessage:@"test 3" level:kGTMLoggerLevelError];
  [fh logMessage:@"test 4" level:kGTMLoggerLevelAssert];
  [fh closeFile];

  NSError *err = nil;
  NSString *contents = [NSString stringWithContentsOfFile:path_
                                                 encoding:NSUTF8StringEncoding
                                                    error:&err];
  STAssertNotNil(contents, @"Error loading log file: %@", err);
  STAssertEqualObjects(@"test 0\ntest 1\ntest 2\ntest 3\ntest 4\n", contents, nil);
}

- (void)testLoggerAdapterWriter {
  ArrayWriter *writer = [[[ArrayWriter alloc] init] autorelease];
  STAssertNotNil(writer, nil);

  GTMLogger *sublogger = [GTMLogger loggerWithWriter:writer
                                         formatter:nil
                                            filter:nil];
  STAssertNotNil(sublogger, nil);

  GTMLogger *logger = [GTMLogger loggerWithWriter:sublogger
                                      formatter:nil
                                         filter:nil];

  STAssertNotNil(logger, nil);

  // Log a few messages to test with
  [logger logInfo:@"hi"];
  [logger logDebug:@"foo"];
  [logger logError:@"blah"];
  [logger logAssert:@"assert"];

  // Makes sure the messages got logged
  NSArray *messages = [writer messages];
  STAssertNotNil(messages, nil);
  STAssertEquals([messages count], (NSUInteger)4, nil);
  STAssertEqualObjects([messages objectAtIndex:0], @"hi", nil);
  STAssertEqualObjects([messages objectAtIndex:1], @"foo", nil);
  STAssertEqualObjects([messages objectAtIndex:2], @"blah", nil);
  STAssertEqualObjects([messages objectAtIndex:3], @"assert", nil);
}

// Helper method to help testing GTMLogFormatters
- (NSString *)stringFromFormatter:(id<GTMLogFormatter>)formatter
                            level:(GTMLoggerLevel)level
                           format:(NSString *)fmt, ... {
  va_list args;
  va_start(args, fmt);
  NSString *msg = [formatter stringForFunc:nil
                                withFormat:fmt
                                    valist:args
                                     level:level];
  va_end(args);
  return msg;
}

- (void)testFunctionPrettifier {
  GTMLogBasicFormatter *fmtr = [[[GTMLogBasicFormatter alloc] init]
                                 autorelease];
  STAssertNotNil(fmtr, nil);

  // Nil, empty and whitespace
  STAssertEqualObjects([fmtr prettyNameForFunc:nil], @"(unknown)", nil);
  STAssertEqualObjects([fmtr prettyNameForFunc:@""], @"(unknown)", nil);
  STAssertEqualObjects([fmtr prettyNameForFunc:@"   \n\t"], @"(unknown)", nil);

  // C99 __func__
  STAssertEqualObjects([fmtr prettyNameForFunc:@"main"], @"main()", nil);
  STAssertEqualObjects([fmtr prettyNameForFunc:@"main"], @"main()", nil);
  STAssertEqualObjects([fmtr prettyNameForFunc:@" main "], @"main()", nil);

  // GCC Obj-C __func__ and __PRETTY_FUNCTION__
  STAssertEqualObjects([fmtr prettyNameForFunc:@"+[Foo bar]"], @"+[Foo bar]",
                        nil);
  STAssertEqualObjects([fmtr prettyNameForFunc:@" +[Foo bar] "], @"+[Foo bar]",
                        nil);
  STAssertEqualObjects([fmtr prettyNameForFunc:@"-[Foo baz]"], @"-[Foo baz]",
                        nil);
  STAssertEqualObjects([fmtr prettyNameForFunc:@" -[Foo baz] "], @"-[Foo baz]",
                        nil);

  // GCC C++ __PRETTY_FUNCTION__
  STAssertEqualObjects([fmtr prettyNameForFunc:@"void a::sub(int)"],
                        @"void a::sub(int)", nil);
  STAssertEqualObjects([fmtr prettyNameForFunc:@" void a::sub(int) "],
                        @"void a::sub(int)", nil);
}

- (void)testBasicFormatter {
  id<GTMLogFormatter> fmtr = [[[GTMLogBasicFormatter alloc] init] autorelease];
  STAssertNotNil(fmtr, nil);
  NSString *msg = nil;

  msg = [self stringFromFormatter:fmtr
                            level:kGTMLoggerLevelDebug
                           format:@"test"];
  STAssertEqualObjects(msg, @"test", nil);

  msg = [self stringFromFormatter:fmtr
                            level:kGTMLoggerLevelDebug
                           format:@"test %d", 1];
  STAssertEqualObjects(msg, @"test 1", nil);

  msg = [self stringFromFormatter:fmtr
                            level:kGTMLoggerLevelDebug
                           format:@"test %@", @"foo"];
  STAssertEqualObjects(msg, @"test foo", nil);

  msg = [self stringFromFormatter:fmtr
                            level:kGTMLoggerLevelDebug
                           format:@""];
  STAssertEqualObjects(msg, @"", nil);

  msg = [self stringFromFormatter:fmtr
                            level:kGTMLoggerLevelDebug
                           format:@"     ", 1];
  STAssertEqualObjects(msg, @"     ", nil);
}

- (void)testStandardFormatter {
  id<GTMLogFormatter> fmtr = [[[GTMLogStandardFormatter alloc] init] autorelease];
  STAssertNotNil(fmtr, nil);

  NSString * kFormatBasePattern;
#if GTM_MACOS_SDK
  // E.g. 2008-01-04 09:16:26.906 otest[5567/0xa07d0f60] [lvl=1] (no func) test
  // E.g. 2009-10-26 22:26:25.086 otest-i386[53200/0xa0438500] [lvl=1] (no func) test
  kFormatBasePattern =
  @"[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3} ((otest)|(otest-i386)|(otest-x86_64)|(otest-ppc))\\[[0-9]+/0x[0-9a-f]+\\] \\[lvl=[0-3]\\] \\(unknown\\) ";
#else  // GTM_MACOS_SDK
  // E.g. 2008-01-04 09:16:26.906 otest[5567/0xa07d0f60] [lvl=1] (no func) test
  kFormatBasePattern =
  @"[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3} (GTMiPhoneTest)\\[[0-9]+/0x[0-9a-f]+\\] \\[lvl=[0-3]\\] \\(unknown\\) ";
#endif   // GTM_MACOS_SDK

  NSString *msg = nil;

  msg = [self stringFromFormatter:fmtr
                            level:kGTMLoggerLevelDebug
                           format:@"test"];
  STAssertTrue([msg gtm_matchesPattern:[kFormatBasePattern stringByAppendingString:@"test"]],
               @"msg: %@", msg);

  msg = [self stringFromFormatter:fmtr
                            level:kGTMLoggerLevelError
                           format:@"test %d", 1];
  STAssertTrue([msg gtm_matchesPattern:[kFormatBasePattern stringByAppendingString:@"test 1"]],
               @"msg: %@", msg);


  msg = [self stringFromFormatter:fmtr
                            level:kGTMLoggerLevelInfo
                           format:@"test %@", @"hi"];
  STAssertTrue([msg gtm_matchesPattern:[kFormatBasePattern stringByAppendingString:@"test hi"]],
               @"msg: %@", msg);


  msg = [self stringFromFormatter:fmtr
                            level:kGTMLoggerLevelUnknown
                           format:@"test"];
  STAssertTrue([msg gtm_matchesPattern:[kFormatBasePattern stringByAppendingString:@"test"]],
               @"msg: %@", msg);
}

- (void)testNoFilter {
  id<GTMLogFilter> filter = [[[GTMLogNoFilter alloc] init] autorelease];
  STAssertNotNil(filter, nil);

  STAssertTrue([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelUnknown], nil);
  STAssertTrue([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelDebug], nil);
  STAssertTrue([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelInfo], nil);
  STAssertTrue([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelError], nil);
  STAssertTrue([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelAssert], nil);
  STAssertTrue([filter filterAllowsMessage:@"" level:kGTMLoggerLevelDebug], nil);
  STAssertTrue([filter filterAllowsMessage:nil level:kGTMLoggerLevelDebug], nil);
}

- (void)testMinimumFilter {
  id<GTMLogFilter> filter = [[[GTMLogMininumLevelFilter alloc]
                                initWithMinimumLevel:kGTMLoggerLevelInfo]
                                    autorelease];
  STAssertNotNil(filter, nil);
  STAssertFalse([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelUnknown],
                nil);
  STAssertFalse([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelDebug],
                nil);
  STAssertTrue([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelInfo],
               nil);
  STAssertTrue([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelError],
               nil);
  STAssertTrue([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelAssert],
               nil);

  filter = [[[GTMLogMininumLevelFilter alloc]
               initWithMinimumLevel:kGTMLoggerLevelDebug] autorelease];
  STAssertNotNil(filter, nil);
  STAssertFalse([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelUnknown],
                nil);
  STAssertTrue([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelDebug],
               nil);
  STAssertTrue([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelInfo],
               nil);
  STAssertTrue([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelError],
               nil);
  STAssertTrue([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelAssert],
               nil);

  // Cannot exceed min/max levels filter
  filter = [[[GTMLogMininumLevelFilter alloc]
               initWithMinimumLevel:kGTMLoggerLevelAssert + 1] autorelease];
  STAssertNil(filter, nil);
  filter = [[[GTMLogMininumLevelFilter alloc]
               initWithMinimumLevel:kGTMLoggerLevelUnknown - 1] autorelease];
  STAssertNil(filter, nil);
}

- (void)testMaximumFilter {
  id<GTMLogFilter> filter = [[[GTMLogMaximumLevelFilter alloc]
                                initWithMaximumLevel:kGTMLoggerLevelInfo]
                                    autorelease];
  STAssertNotNil(filter, nil);
  STAssertTrue([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelUnknown],
                nil);
  STAssertTrue([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelDebug],
                nil);
  STAssertTrue([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelInfo],
               nil);
  STAssertFalse([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelError],
               nil);
  STAssertFalse([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelAssert],
               nil);

  filter = [[[GTMLogMaximumLevelFilter alloc]
               initWithMaximumLevel:kGTMLoggerLevelDebug] autorelease];
  STAssertNotNil(filter, nil);
  STAssertTrue([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelUnknown],
                nil);
  STAssertTrue([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelDebug],
               nil);
  STAssertFalse([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelInfo],
               nil);
  STAssertFalse([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelError],
               nil);
  STAssertFalse([filter filterAllowsMessage:@"hi" level:kGTMLoggerLevelAssert],
               nil);

  // Cannot exceed min/max levels filter
  filter = [[[GTMLogMaximumLevelFilter alloc]
               initWithMaximumLevel:kGTMLoggerLevelAssert + 1] autorelease];
  STAssertNil(filter, nil);
  filter = [[[GTMLogMaximumLevelFilter alloc]
               initWithMaximumLevel:kGTMLoggerLevelUnknown - 1] autorelease];
  STAssertNil(filter, nil);
}

- (void)testFileHandleCreation {
  NSFileHandle *fh = nil;

  fh = [NSFileHandle fileHandleForLoggingAtPath:nil mode:0644];
  STAssertNil(fh, nil);

  fh = [NSFileHandle fileHandleForLoggingAtPath:path_ mode:0644];
  STAssertNotNil(fh, nil);

  [fh logMessage:@"test 1" level:kGTMLoggerLevelInfo];
  [fh logMessage:@"test 2" level:kGTMLoggerLevelInfo];
  [fh logMessage:@"test 3" level:kGTMLoggerLevelInfo];
  [fh closeFile];

  // Re-open file and make sure our log messages get appended
  fh = [NSFileHandle fileHandleForLoggingAtPath:path_ mode:0644];
  STAssertNotNil(fh, nil);

  [fh logMessage:@"test 4" level:kGTMLoggerLevelInfo];
  [fh logMessage:@"test 5" level:kGTMLoggerLevelInfo];
  [fh logMessage:@"test 6" level:kGTMLoggerLevelInfo];
  [fh closeFile];

  NSError *err = nil;
  NSString *contents = [NSString stringWithContentsOfFile:path_
                                                 encoding:NSUTF8StringEncoding
                                                    error:&err];
  STAssertNotNil(contents, @"Error loading log file: %@", err);
  STAssertEqualObjects(@"test 1\ntest 2\ntest 3\ntest 4\ntest 5\ntest 6\n", contents, nil);
}

@end
