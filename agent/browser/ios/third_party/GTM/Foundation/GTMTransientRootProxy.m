//
//  GTMTransientRootProxy.m
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

#import "GTMTransientRootProxy.h"
#import "GTMObjC2Runtime.h"

// Private methods on NSMethodSignature that we need to call.  This method has
// been available since 10.0, but Apple didn't add it to the headers until 10.5
#if MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4
@interface NSMethodSignature (UndeclaredMethods)
+ (NSMethodSignature *)signatureWithObjCTypes:(const char *)types;
@end
#endif // MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4

@interface GTMTransientRootProxy (PrivateMethods)
// Returns an NSConnection for NSMacPorts.  This method is broken out to allow
// subclasses to override it to generate different types of NSConnections.
- (NSConnection *)makeConnection;

// Returns the "real" proxy (stored in the realProxy_ ivar) associated with this
// instance.  If realProxy_ is nil, then an attempt is made to make a connection
// to create the realProxy_.
//
- (NSDistantObject *)realProxy;

// "Releases" the realProxy_ ivar, and removes |self| as an observer from
// the NSNotificationCenter.
//
- (void)releaseRealProxy;

// Notification that a connection has died.
- (void)connectionDidDie:(NSNotification *)notification;
@end

@implementation GTMTransientRootProxy

+ (id)rootProxyWithRegisteredName:(NSString *)name
                             host:(NSString *)host
                         protocol:(Protocol *)protocol
                   requestTimeout:(NSTimeInterval)requestTimeout
                     replyTimeout:(NSTimeInterval)replyTimeout {
  return [[[self alloc] initWithRegisteredName:name
                                          host:host
                                      protocol:protocol
                                requestTimeout:requestTimeout
                                  replyTimeout:replyTimeout] autorelease];
}

- (id)initWithRegisteredName:(NSString *)name
                        host:(NSString *)host
                    protocol:(Protocol *)protocol
              requestTimeout:(NSTimeInterval)requestTimeout
                replyTimeout:(NSTimeInterval)replyTimeout {
  if (!name || !protocol) {
    [self release];
    return nil;
  }

  requestTimeout_ = requestTimeout;
  replyTimeout_ = replyTimeout;

  registeredName_ = [name copy];
  host_ = [host copy];

  protocol_ = protocol;  // Protocols can't be retained

  return self;
}

- (id)init {
  return [self initWithRegisteredName:nil
                                 host:nil
                             protocol:nil
                       requestTimeout:0.0
                         replyTimeout:0.0];
}

- (void)dealloc {
  [self releaseRealProxy];
  [registeredName_ release];
  [host_ release];
  [super dealloc];
}

- (BOOL)isConnected {
  BOOL result = NO;
  @synchronized (self) {
    result = [[[self realProxy] connectionForProxy] isValid];
  }
  return result;
}

- (NSMethodSignature *)methodSignatureForSelector:(SEL)selector {
  struct objc_method_description mdesc;
  mdesc = protocol_getMethodDescription(protocol_, selector, YES, YES);
  NSMethodSignature *returnValue = nil;
  if (mdesc.types == NULL) {
    // COV_NF_START
    _GTMDevLog(@"Unable to get the protocol method description.  Returning "
               @"nil.");
    // COV_NF_END
  } else {
    returnValue = [NSMethodSignature signatureWithObjCTypes:mdesc.types];
  }
  return returnValue;
}

- (void)forwardInvocation:(NSInvocation *)invocation {
  @try {
    NSDistantObject *target = [self realProxy];
    [invocation invokeWithTarget:target];

    // We need to catch NSException* here rather than "id" because we need to
    // treat |ex| as an NSException when using the -name method.  Also, we're
    // only looking to catch a few types of exception here, all of which are
    // NSException types; the rest we just rethrow.
  } @catch (NSException *ex) {
    NSString *exName = [ex name];
    // If we catch an exception who's name matches any of the following types,
    // it's because the DO connection probably went down.  So, we'll just
    // release our realProxy_, and attempt to reconnect on the next call.
    if ([exName isEqualToString:NSPortTimeoutException]
        || [exName isEqualToString:NSInvalidSendPortException]
        || [exName isEqualToString:NSInvalidReceivePortException]
        || [exName isEqualToString:NSFailedAuthenticationException]
        || [exName isEqualToString:NSPortSendException]
        || [exName isEqualToString:NSPortReceiveException]) {
      [self releaseRealProxy];  // COV_NF_LINE
    } else {
      // If the exception was any other type (commonly
      // NSInvalidArgumentException) then we'll just re-throw it to the caller.
      @throw;
    }
  }  // COV_NF_LINE
}

@end

@implementation GTMTransientRootProxy (PrivateMethods)

- (NSConnection *)makeConnection {
  return [NSConnection connectionWithRegisteredName:registeredName_ host:host_];
}

- (NSDistantObject *)realProxy {
  NSDistantObject *returnProxy = nil;

  @synchronized (self) {
    // No change so no notification
    if (realProxy_) return realProxy_;

    NSConnection *conn = [self makeConnection];
    [conn setRequestTimeout:requestTimeout_];
    [conn setReplyTimeout:replyTimeout_];
    @try {
      // Try to get the root proxy for this connection's vended object.
      realProxy_ = [conn rootProxy];
    } @catch (id ex) {
      // We may fail here if we can't get the root proxy in the amount of time
      // specified by the timeout above.  This may happen, for example, if the
      // server process is stopped (via SIGSTOP).  We'll just ignore this, and
      // try again at the next message.
      [conn invalidate];
      return nil;
    }
    if (!realProxy_) {
      [conn invalidate];
      // Again, no change in connection status
      return nil;
    }
    [realProxy_ retain];
    [realProxy_ setProtocolForProxy:protocol_];
    NSNotificationCenter *nc = [NSNotificationCenter defaultCenter];
    [nc addObserver:self
           selector:@selector(connectionDidDie:)
               name:NSConnectionDidDieNotification
             object:conn];
    // Retain/autorelease so it lives at least the duration of this synchronize
    returnProxy = [[realProxy_ retain] autorelease];
  }  // @synchronized (self)

  return returnProxy;
}

- (void)connectionDidDie:(NSNotification *)notification {
  [self releaseRealProxy];
}

- (void)releaseRealProxy {
  @synchronized (self) {
    [[NSNotificationCenter defaultCenter] removeObserver:self];
    // Only trigger if we had a proxy before
    if (realProxy_) {
      [realProxy_ release];
      realProxy_ = nil;
    }
  }
}

@end

@implementation GTMRootProxyCatchAll

- (void)forwardInvocation:(NSInvocation *)invocation {
  @try {
    [super forwardInvocation:invocation];
  }
  @catch (id ex) {
    // Log for developers, but basically ignore it.
    _GTMDevLog(@"Proxy for invoking %@ has caught and is ignoring exception: %@",
               NSStringFromSelector([invocation selector]), ex);
  }
}

@end
