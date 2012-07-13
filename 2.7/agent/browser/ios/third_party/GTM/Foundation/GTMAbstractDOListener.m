//
//  GTMAbstractDOListener.m
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

#import "GTMAbstractDOListener.h"
#import "GTMSystemVersion.h"
#import <mach/mach_init.h>

// Hack workaround suggested by DTS for the DO deadlock bug.  Basically, this
// class intercepts the delegate role for DO's receive port (which is an
// NSMachPort).  When -handlePortMessage: is called, it verifies that the send
// and receive ports are not nil, then forwards the message on to the original
// delegate.  If the ports are nil, then the resulting NSConnection would
// eventually cause us to deadlock.  In this case, it simply ignores the
// message.  This is only need on Tiger.
#if MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4
@interface GTMReceivePortDelegate : NSObject {
  __weak id delegate_;
}
- (id)initWithDelegate:(id)delegate;
- (void)handlePortMessage:(NSPortMessage *)message;
@end
#endif // MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4

@interface GTMAbstractDOListener (PrivateMethods)
- (BOOL)startListening;
- (void)stopListening;

// Returns a description of the port based on the type of port.
- (NSString *)portDescription;

#if MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4
// Uses the GTMReceivePortDelegate hack (see comments above) if we're on Tiger.
- (void)hackaroundTigerDOWedgeBug:(NSConnection *)conn;
#endif // MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4
@end

// Static global set that holds a pointer to all instances of
// GTMAbstractDOListener subclasses.
//
static NSMutableSet *gAllListeners = nil;

@implementation GTMAbstractDOListener

+ (void)initialize {
  if (self == [GTMAbstractDOListener class]) {
    // We create the set using CFSetCreateMutable because we don't
    // want to retain things in this set. If we retained things in the
    // set we would never be able to dealloc ourselves because we
    // add "self" to this set in it's init routine would cause an
    // extra retain to be added to it.
    gAllListeners = (NSMutableSet*)CFSetCreateMutable(NULL, 0, NULL);
  }
}

+ (NSArray *)allListeners {
  // We return an NSArray instead of an NSSet here because NSArrays look nicer
  // when displayed as %@
  NSArray *allListeners = nil;

  @synchronized (gAllListeners) {
    allListeners = [gAllListeners allObjects];
  }
  return allListeners;
}

- (id)init {
  return [self initWithRegisteredName:nil protocol:NULL];
}

- (id)initWithRegisteredName:(NSString *)name protocol:(Protocol *)proto {
  return [self initWithRegisteredName:name
                             protocol:proto
                                 port:[NSMachPort port]];
}

- (id)initWithRegisteredName:(NSString *)name
                    protocol:(Protocol *)proto
                        port:(NSPort *)port {
  self = [super init];
  if (!self) {
    return nil;
  }

  if ((!proto) || (!port) || (!name)) {
    if (!proto) {
      _GTMDevLog(@"Failed to create a listener, a protocol must be specified");
    }

    if (!port) {
      _GTMDevLog(@"Failed to create a listener, a port must be specified");
    }

    if (!name) {
      _GTMDevLog(@"Failed to create a listener, a name must be specified");
    }

    [self release];
    return nil;
  }

  registeredName_ = [name copy];
  protocol_ = proto;  // Can't retain protocols
  port_ = [port retain];

  requestTimeout_ = -1;
  replyTimeout_ = -1;

  heartRate_ = (NSTimeInterval)10.0;

  _GTMDevAssert(gAllListeners, @"gAllListeners is not nil");
  @synchronized (gAllListeners) {
    [gAllListeners addObject:self];
  }

  return self;
}

- (void)dealloc {
  _GTMDevAssert(gAllListeners, @"gAllListeners is not nil");
  @synchronized (gAllListeners) {
    [gAllListeners removeObject:self];
  }

#if MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4
  [receivePortDelegate_ release];
#endif // MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4
  
  [self shutdown];
  [port_ release];
  [registeredName_ release];
  [super dealloc];
}


#pragma mark Getters and Setters

- (NSString *)registeredName {
  return registeredName_;
}

- (void)setRegisteredName:(NSString *)name {
  if (!name) {
    return;
  }
  [registeredName_ autorelease];
  registeredName_ = [name copy];
}

- (NSTimeInterval)requestTimeout {
  return requestTimeout_;
}

- (void)setRequestTimeout:(NSTimeInterval)timeout {
  requestTimeout_ = timeout;
}

- (NSTimeInterval)replyTimeout {
  return replyTimeout_;
}

- (void)setReplyTimeout:(NSTimeInterval)timeout {
  replyTimeout_ = timeout;
}

- (void)setThreadHeartRate:(NSTimeInterval)heartRate {
  heartRate_ = heartRate;
}

- (NSTimeInterval)ThreadHeartRate {
  return heartRate_;
}

- (NSConnection *)connection {
  return connection_;
}

- (NSString *)description {
  return [NSString stringWithFormat:@"%@<%p> { name=\"%@\", %@ }",
            [self class], self, registeredName_, [self portDescription]];
}

#pragma mark "Run" methods

- (BOOL)runInCurrentThread {
  return [self startListening];
}

- (void)runInNewThreadWithErrorTarget:(id)errObject
                             selector:(SEL)selector
                   withObjectArgument:(id)argument {
  NSInvocation *invocation = nil;
  
  _GTMDevAssert(((errObject != nil && selector != NULL) ||
                 (!errObject && !selector)), @"errObject and selector must "
                @"both be nil or not nil");

  // create an invocation we can use if things fail
  if (errObject) {
    NSMethodSignature *signature =
    [errObject methodSignatureForSelector:selector];
    invocation = [NSInvocation invocationWithMethodSignature:signature];
    [invocation setSelector:selector];
    [invocation setTarget:errObject];

    // If the selector they passed in takes an arg (i.e., it has at least one 
    // colon in the selector name), then set the first user-specified arg to be
    // the |argument| they specified.  The first two args are self and _cmd.
    if ([signature numberOfArguments] > 2) {
      [invocation setArgument:&argument atIndex:2];
    }

    [invocation retainArguments];
  }

  shouldShutdown_ = NO;
  [NSThread detachNewThreadSelector:@selector(threadMain:)
                           toTarget:self
                         withObject:invocation];
}

- (void)shutdown {
  // If we're not running in a new thread (then we're running in the "current"
  // thread), tear down the NSConnection here.  If we are running in a new
  // thread we just set the shouldShutdown_ flag, and the thread will teardown
  // the NSConnection itself.
  if (!isRunningInNewThread_) {
    [self stopListening];
  } else {
    shouldShutdown_ = YES;
  }
}

@end

@implementation GTMAbstractDOListener (PrivateMethods)

- (BOOL)startListening {
  BOOL result = NO;

  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  
  _GTMDevAssert(!connection_, @"Connection_ should not be set. Was this "
                @"listener already started? %@");
  connection_ = [[NSConnection alloc] initWithReceivePort:port_ sendPort:nil];

  NSProtocolChecker *checker =
  [NSProtocolChecker protocolCheckerWithTarget:self
                                      protocol:protocol_];

  if (requestTimeout_ >= 0) {
    [connection_ setRequestTimeout:requestTimeout_];
  }

  if (replyTimeout_ >= 0) {
    [connection_ setReplyTimeout:replyTimeout_];
  }

  // Set the connection's root object to be the protocol checker so that only
  // methods listed in the protocol_ are available via DO.
  [connection_ setRootObject:checker];

  // Allow subclasses to be the connection delegate
  [connection_ setDelegate:self];

  // Because of radar 5493309 we need to do this. [NSConnection registeredName:]
  // returns NO when the connection is created using an NSSocketPort under
  // Leopard.
  //
  // The recommendation from Apple was to use the command:
  // [NSConnection registerName:withNameServer:].
  NSPortNameServer *server;
  if ([port_ isKindOfClass:[NSSocketPort class]]) {
    server = [NSSocketPortNameServer sharedInstance];
  } else {
    server = [NSPortNameServer systemDefaultPortNameServer];
  }

  BOOL registered = [connection_ registerName:registeredName_
                               withNameServer:server];

  if (registeredName_ && registered) {
#if MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4
    [self hackaroundTigerDOWedgeBug:connection_];
#endif // MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4

    result = YES;

    _GTMDevLog(@"listening on %@ with name '%@'", [self portDescription],
               registeredName_);
  } else {
    _GTMDevLog(@"failed to register %@ with %@", connection_, registeredName_);
  }

  // we're good, so call the overrideable initializer
  if (result) {
    // Call the virtual "runIn*" initializer
    result = [self doRunInitialization];
  } else {
    [connection_ invalidate];
    [connection_ release];
    connection_ = nil;
  }

  [pool drain];

  return result;
}

- (void)stopListening {
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  [connection_ invalidate];
  [connection_ release];
  connection_ = nil;
  [pool drain];
}

- (NSString *)portDescription {
  NSString *portDescription;
  if ([port_ isKindOfClass:[NSMachPort class]]) {
    portDescription = [NSString stringWithFormat:@"mach_port=%#x",
                       [(NSMachPort *)port_ machPort]];
  } else {
    portDescription = [NSString stringWithFormat:@"port=%@",
                       [port_ description]];
  }
  return portDescription;
}

#if MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4
- (void)hackaroundTigerDOWedgeBug:(NSConnection *)conn {
  if ([GTMSystemVersion isTiger]) {
    NSPort *receivePort = [conn receivePort];
    if ([receivePort isKindOfClass:[NSMachPort class]]) {
      id portDelegate = [receivePort delegate];
      receivePortDelegate_ =
        [[GTMReceivePortDelegate alloc] initWithDelegate:portDelegate];
      [receivePort setDelegate:receivePortDelegate_];
    }
  }
}
#endif // MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4

@end

@implementation GTMAbstractDOListener (GTMAbstractDOListenerSubclassMethods)

- (BOOL)doRunInitialization {
  return YES;
}

//
// -threadMain:
//

//
- (void)threadMain:(NSInvocation *)failureCallback {
  isRunningInNewThread_ = YES;

  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];

  // register
  if ([self startListening]) {
    // spin
    for (;;) {  // Run forever

      // check if we were asked to shutdown
      if (shouldShutdown_) {
        break;
      }

      NSAutoreleasePool *localPool = [[NSAutoreleasePool alloc] init];
      // Wrap our runloop in case we get an exception from DO
      @try {
        NSDate *waitDate = [NSDate dateWithTimeIntervalSinceNow:heartRate_];
        [[NSRunLoop currentRunLoop] runUntilDate:waitDate];
      } @catch (id e) {
        _GTMDevLog(@"Listener '%@' caught exception: %@", registeredName_, e);
      }
      [localPool drain];
    }
  } else {
    // failed, if we had something to invoke, call it on the main thread
    if (failureCallback) {
      [failureCallback performSelectorOnMainThread:@selector(invoke)
                                        withObject:nil
                                     waitUntilDone:NO];
    }
  }

  [self stopListening];
  [pool drain];

  isRunningInNewThread_ = NO;
}

@end

#if MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4
@implementation GTMReceivePortDelegate

- (id)initWithDelegate:(id)delegate {
  if ((self = [super init])) {
    delegate_ = delegate;  // delegates aren't retained
  }
  return self;
}

- (void)handlePortMessage:(NSPortMessage *)message {
  NSPort *receivePort = [message receivePort];
  NSPort *sendPort    = [message sendPort];

  // If we don't have a sensible send or receive port, just act like 
  // the message never arrived.  Otherwise, hand it off to the original 
  // delegate (which is the NSMachPort itself).
  if (receivePort == nil || sendPort == nil || [receivePort isEqual:sendPort]) {
    _GTMDevLog(@"Dropping port message destined for itself to avoid DO wedge.");
  } else {
    // Uncomment for super-duper verbose DO message forward logging
    // _GTMDevLog(@"--> Forwarding message %@ to delegate %@",
    //            message, delegate_);
    [delegate_ handlePortMessage:message];
  }

  // If processing the message caused us to drop no longer being the delegate, 
  // set us back.  Due to interactions between NSConnection and NSMachPort, 
  // it's possible for the NSMachPort's delegate to get set back to its 
  // original value.  If that happens, we set it back to the value we want.
  if ([delegate_ delegate] != self) {
    if ([delegate_ delegate] == delegate_) {
      _GTMDevLog(@"Restoring DO delegate to %@", self);
      [delegate_ setDelegate:self];
    } else {
      _GTMDevLog(@"GMReceivePortDelegate replaced with %@",
                 [delegate_ delegate]);
    }
  }
}
@end
#endif // MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4
