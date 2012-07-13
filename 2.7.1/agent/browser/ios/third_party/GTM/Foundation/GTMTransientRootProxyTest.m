//
//  GMTransientRootProxyTest.m
//
//  Copyright 2006-2009 Google Inc.
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
#import "GTMTransientRootProxy.h"
#import "GTMUnitTestDevLog.h"

#define kDefaultTimeout 5.0

// === Start off declaring some auxillary data structures ===
static NSString *const kTestServerName = @"gtm_test_server";
static NSString *const kGTMTransientRootNameKey = @"GTMTransientRootNameKey";
static NSString *const kGTMTransientRootLockKey = @"GTMTransientRootLockKey";

enum {
  kGTMTransientThreadConditionStarting = 777,
  kGTMTransientThreadConditionStarted,
  kGTMTransientThreadConditionQuitting,
  kGTMTransientThreadConditionQuitted
};

// The @protocol that we'll use for testing with.
@protocol DOTestProtocol
- (oneway void)doOneWayVoid;
- (bycopy NSString *)doReturnStringBycopy;
- (void)throwException;
@end

// The "server" we'll use to test the DO connection.  This server will implement
// our test protocol, and it will run in a separate thread from the main
// unit testing thread, so the DO requests can be serviced.
@interface DOTestServer : NSObject <DOTestProtocol>
- (void)runThread:(NSDictionary *)args;
@end

@implementation DOTestServer

- (void)runThread:(NSDictionary *)args {
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  NSConditionLock *lock = [args objectForKey:kGTMTransientRootLockKey];
  NSString *serverName = [args objectForKey:kGTMTransientRootNameKey];
  NSDate *future = [NSDate dateWithTimeIntervalSinceNow:kDefaultTimeout];
  if(![lock lockWhenCondition:kGTMTransientThreadConditionStarting
                   beforeDate:future]) {
    _GTMDevLog(@"Unable to acquire lock in runThread! This is BAD!");
    [pool drain];
    [NSThread exit];
  }

  NSConnection *conn = [[[NSConnection alloc] init] autorelease];
  [conn setRootObject:self];
  if (![conn registerName:serverName]) {
    _GTMDevLog(@"Failed to register DO root object with name '%@'",
               serverName);
    [pool drain];
    [NSThread exit];
  }
  [lock unlockWithCondition:kGTMTransientThreadConditionStarted];
  while (![lock tryLockWhenCondition:kGTMTransientThreadConditionQuitting]) {
    NSDate* runUntil = [NSDate dateWithTimeIntervalSinceNow:0.1];
    [[NSRunLoop currentRunLoop] runUntilDate:runUntil];
  }
  [conn setRootObject:nil];
  [conn registerName:nil];
  [pool drain];
  [lock unlockWithCondition:kGTMTransientThreadConditionQuitted];
}

- (oneway void)doOneWayVoid {
  // Do nothing
}
- (bycopy NSString *)doReturnStringBycopy {
  return @"TestString";
}

- (void)throwException {
  [NSException raise:@"testingException" format:@"for the unittest"];
}

@end

// === Done with auxillary data structures, now for the main test class ===

@interface GTMTransientRootProxy (GTMTransientRootProxyTest)
- (id)init;
@end

@interface GTMTransientRootProxyTest : GTMTestCase {
 @private
  DOTestServer *server_;
  NSConditionLock *syncLock_;
}
@end

@implementation GTMTransientRootProxyTest

- (void)testTransientRootProxy {
  // Setup our server and create a unqiue server name every time we run
  NSTimeInterval timeStamp = [[NSDate date] timeIntervalSinceReferenceDate];
  NSString *serverName =
    [NSString stringWithFormat:@"%@_%f", kTestServerName, timeStamp];
  server_ = [[[DOTestServer alloc] init] autorelease];
  syncLock_ = [[[NSConditionLock alloc]
                initWithCondition:kGTMTransientThreadConditionStarting]
               autorelease];
  NSDictionary *args = [NSDictionary dictionaryWithObjectsAndKeys:
                        syncLock_, kGTMTransientRootLockKey,
                        serverName, kGTMTransientRootNameKey,
                        nil];
  [NSThread detachNewThreadSelector:@selector(runThread:)
                           toTarget:server_
                         withObject:args];
  NSDate *future = [NSDate dateWithTimeIntervalSinceNow:kDefaultTimeout];
  STAssertTrue([syncLock_ lockWhenCondition:kGTMTransientThreadConditionStarted
                                 beforeDate:future],
               @"Unable to start thread");
  [syncLock_ unlockWithCondition:kGTMTransientThreadConditionStarted];

  GTMTransientRootProxy *failProxy =
    [GTMTransientRootProxy rootProxyWithRegisteredName:nil
                                                  host:nil
                                              protocol:@protocol(DOTestProtocol)
                                        requestTimeout:kDefaultTimeout
                                          replyTimeout:kDefaultTimeout];
  STAssertNil(failProxy, @"should have failed w/o a name");
  failProxy =
    [GTMTransientRootProxy rootProxyWithRegisteredName:serverName
                                                  host:nil
                                              protocol:nil
                                        requestTimeout:kDefaultTimeout
                                          replyTimeout:kDefaultTimeout];
  STAssertNil(failProxy, @"should have failed w/o a protocol");
  failProxy = [[[GTMTransientRootProxy alloc] init] autorelease];
  STAssertNil(failProxy, @"should have failed just calling init");

  GTMTransientRootProxy<DOTestProtocol> *proxy =
    [GTMTransientRootProxy rootProxyWithRegisteredName:serverName
                                                  host:nil
                                              protocol:@protocol(DOTestProtocol)
                                        requestTimeout:kDefaultTimeout
                                          replyTimeout:kDefaultTimeout];

    STAssertEqualObjects([proxy doReturnStringBycopy], @"TestString",
                         @"proxy should have returned 'TestString'");

  // Redo the *exact* same test to make sure we can have multiple instances
  // in the same app.
  proxy =
    [GTMTransientRootProxy rootProxyWithRegisteredName:serverName
                                                  host:nil
                                              protocol:@protocol(DOTestProtocol)
                                        requestTimeout:kDefaultTimeout
                                          replyTimeout:kDefaultTimeout];
  STAssertEqualObjects([proxy doReturnStringBycopy],
                       @"TestString", @"proxy should have returned "
                       @"'TestString'");

  // Test the GTMRootProxyCatchAll within this test so we don't have to rebuild
  // the server again.

  GTMRootProxyCatchAll<DOTestProtocol> *catchProxy =
    [GTMRootProxyCatchAll rootProxyWithRegisteredName:serverName
                                                 host:nil
                                             protocol:@protocol(DOTestProtocol)
                                       requestTimeout:kDefaultTimeout
                                         replyTimeout:kDefaultTimeout];

  [GTMUnitTestDevLog expectString:@"Proxy for invoking throwException has "
     @"caught and is ignoring exception: [NOTE: this exception originated in "
     @"the server.]\nfor the unittest"];
  id e = nil;
  @try {
    // Has the server throw an exception
    [catchProxy throwException];
  } @catch (id ex) {
    e = ex;
  }
  STAssertNil(e, @"The GTMRootProxyCatchAll did not catch the exception: %@.",
              e);

  proxy =
    [GTMTransientRootProxy rootProxyWithRegisteredName:@"FAKE_SERVER"
                                                  host:nil
                                              protocol:@protocol(DOTestProtocol)
                                        requestTimeout:kDefaultTimeout
                                          replyTimeout:kDefaultTimeout];
  STAssertNotNil(proxy, @"proxy shouldn't be nil, even when registered w/ a "
                 @"fake server");
  STAssertFalse([proxy isConnected], @"the proxy shouldn't be connected due to "
                @"the fake server");

  // Now set up a proxy, and then kill our server. We put a super short time
  // out on it, because we are expecting it to fail.
  proxy =
    [GTMTransientRootProxy rootProxyWithRegisteredName:serverName
                                                  host:nil
                                              protocol:@protocol(DOTestProtocol)
                                        requestTimeout:0.01
                                          replyTimeout:0.01];
  [syncLock_ tryLockWhenCondition:kGTMTransientThreadConditionStarted];
  [syncLock_ unlockWithCondition:kGTMTransientThreadConditionQuitting];

  // Wait for the server to shutdown so we clean up nicely.
  // The max amount of time we will wait until we abort this test.
  NSDate *timeout = [NSDate dateWithTimeIntervalSinceNow:kDefaultTimeout];
  // The server did not shutdown and we want to capture this as an error
  STAssertTrue([syncLock_ lockWhenCondition:kGTMTransientThreadConditionQuitted
                                   beforeDate:timeout],
                 @"The server did not shutdown gracefully before the timeout.");
  [syncLock_ unlockWithCondition:kGTMTransientThreadConditionQuitted];

  // This should fail gracefully because the server is dead.
  STAssertNil([proxy doReturnStringBycopy], @"proxy should have returned nil");
}

@end
