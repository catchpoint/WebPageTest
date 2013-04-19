//
//  GTMTransientRootPortProxyTest.m
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
#import "GTMTransientRootPortProxy.h"

#define kDefaultTimeout 5.0

enum {
  kGTMTransientThreadConditionStarting = 777,
  kGTMTransientThreadConditionStarted,
  kGTMTransientThreadConditionQuitting,
  kGTMTransientThreadConditionQuitted
};

// === Start off declaring some auxillary data structures ===

// The @protocol that we'll use for testing with.
@protocol DOPortTestProtocol
- (oneway void)doOneWayVoid;
- (bycopy NSString *)doReturnStringBycopy;
@end

// The "server" we'll use to test the DO connection.  This server will implement
// our test protocol, and it will run in a separate thread from the main
// unit testing thread, so the DO requests can be serviced.
@interface DOPortTestServer : NSObject <DOPortTestProtocol> {
 @private
  NSPort *clientSendPort_;
  NSPort *clientReceivePort_;
}
- (void)runThread:(NSConditionLock *)lock;
- (NSPort *)clientSendPort;
- (NSPort *)clientReceivePort;
@end

@implementation DOPortTestServer

- (void)runThread:(NSConditionLock *)lock {
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  NSDate *future = [NSDate dateWithTimeIntervalSinceNow:kDefaultTimeout];
  if(![lock lockWhenCondition:kGTMTransientThreadConditionStarting
                   beforeDate:future]) {
    _GTMDevLog(@"Unable to acquire lock in runThread! This is BAD!");
    [pool drain];
    [NSThread exit];
  }

  clientSendPort_ = [NSPort port];
  clientReceivePort_ = [NSPort port];

  NSConnection *conn
    = [[NSConnection alloc] initWithReceivePort:clientSendPort_
                                       sendPort:clientReceivePort_];
  [conn setRootObject:self];
  [lock unlockWithCondition:kGTMTransientThreadConditionStarted];
  while (![lock tryLockWhenCondition:kGTMTransientThreadConditionQuitting]) {
    NSDate *runUntil = [NSDate dateWithTimeIntervalSinceNow:0.1];
    [[NSRunLoop currentRunLoop] runUntilDate:runUntil];
  }
  [conn setRootObject:nil];
  [clientSendPort_ invalidate];
  [clientReceivePort_ invalidate];
  [conn release];
  [pool drain];
  [lock unlockWithCondition:kGTMTransientThreadConditionQuitted];
}

- (NSPort *)clientSendPort {
  return clientSendPort_;
}

- (NSPort *)clientReceivePort {
  return clientReceivePort_;
}

- (oneway void)doOneWayVoid {
  // Do nothing
}
- (bycopy NSString *)doReturnStringBycopy {
  return @"TestString";
}

@end

// === Done with auxillary data structures, now for the main test class ===

@interface GTMTransientRootPortProxyTest : GTMTestCase {
  DOPortTestServer *server_;
  NSConditionLock *syncLock_;
}

@end

@implementation GTMTransientRootPortProxyTest

- (void)testTransientRootPortProxy {
  syncLock_ = [[[NSConditionLock alloc]
                initWithCondition:kGTMTransientThreadConditionStarting]
               autorelease];

  // Setup our server.
  server_ = [[[DOPortTestServer alloc] init] autorelease];
  [NSThread detachNewThreadSelector:@selector(runThread:)
                           toTarget:server_
                         withObject:syncLock_];
  NSDate *future = [NSDate dateWithTimeIntervalSinceNow:kDefaultTimeout];
  STAssertTrue([syncLock_ lockWhenCondition:kGTMTransientThreadConditionStarted
                                 beforeDate:future],
               @"Unable to start thread");
  [syncLock_ unlockWithCondition:kGTMTransientThreadConditionStarted];

  NSPort *receivePort = [server_ clientReceivePort];
  NSPort *sendPort = [server_ clientSendPort];

  GTMTransientRootPortProxy<DOPortTestProtocol> *failProxy =
    [GTMTransientRootPortProxy rootProxyWithReceivePort:nil
                                               sendPort:nil
                                               protocol:@protocol(DOPortTestProtocol)
                                         requestTimeout:kDefaultTimeout
                                           replyTimeout:kDefaultTimeout];
  STAssertNil(failProxy, @"should have failed w/o a port");
  failProxy =
    [GTMTransientRootPortProxy rootProxyWithReceivePort:receivePort
                                               sendPort:sendPort
                                               protocol:nil
                                         requestTimeout:kDefaultTimeout
                                           replyTimeout:kDefaultTimeout];
  STAssertNil(failProxy, @"should have failed w/o a protocol");

  GTMTransientRootPortProxy<DOPortTestProtocol> *proxy =
    [GTMTransientRootPortProxy rootProxyWithReceivePort:receivePort
                                               sendPort:sendPort
                                               protocol:@protocol(DOPortTestProtocol)
                                         requestTimeout:kDefaultTimeout
                                           replyTimeout:kDefaultTimeout];

  STAssertEqualObjects([proxy doReturnStringBycopy],
                       @"TestString", @"proxy should have returned "
                       @"'TestString'");

  // Redo the *exact* same test to make sure we can have multiple instances
  // in the same app.
  proxy =
    [GTMTransientRootPortProxy rootProxyWithReceivePort:receivePort
                                               sendPort:sendPort
                                               protocol:@protocol(DOPortTestProtocol)
                                         requestTimeout:kDefaultTimeout
                                           replyTimeout:kDefaultTimeout];

  STAssertEqualObjects([proxy doReturnStringBycopy],
                       @"TestString", @"proxy should have returned "
                       @"'TestString'");
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
}

@end
