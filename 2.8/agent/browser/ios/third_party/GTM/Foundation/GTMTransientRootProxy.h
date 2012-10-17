//
//  GTMTransientRootProxy.h
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

#import <Foundation/Foundation.h>

// Handle (re-)connecting to a transient root proxy object via DO.
//
// This class is designed to handle connecting and reconnecting to a Distributed
// Objects root proxy (NSDistantObject* instance). It is a replacement for using
// the NSDistantObject returned from NSConnection, directly. When the DO
// connection is up, messages sent to this class are forwarded to the real
// object (the NSDistantObject); when the DO connection is down, messages sent
// to this class are silently swallowed. You can use the -isConnected method on
// this class to see if the DO connection is up or down.
//
// This class may be useful when you need a DO connection, but the
// server you're connected to may be going up and down.  For example, the 
// web browser plugins in Google Desktop may need to connect to the Google
// Desktop local webserver, but we'd want the browser plugins to be able to
// gracefully handle the local Google Desktop webserver starting and stopping.
//
// === Example Usage ===
//
// Old code:
//
// NSDistantObject<MyProto> *o =
//   [NSConnection rootProxyForConnectionWithRegisteredName:@"server"
//                                                     host:nil];
// [o setProtocolForProxy:@protocol(MyProto)];
// [o someMethodInMyProto];
// // ... write a bunch of code to handle error conditions
//
// New code:
//
// GTMTransientRootProxy<MyProto> *o =
//   [GTMTransientRootProxy rootProxyWithRegisteredName:@"server"
//                                                 host:nil
//                                             protocol:@protocol(MyProto)
//                                       requestTimeout:5.0
//                                         replyTimeout:5.0];
// [o someMethodInMyProto];
//
// The 'Old code' requires you to handle all the error conditions that may
// arise when using DO (such as the server crashing, or network going down),
// handle properly tearing down the broken connection, and trying to reconnect
// when the server finally comes back online.  The 'New code' handles all of
// those details for you.
//
// Also, when creating a GMTransientRootProxy object, you must tell it the
// @protocol that will be used for communication - this is not optional.  And
// in order to quiet compiler warnings, you'll also want to staticly type
// the pointer with the protocol as well.
//
@interface GTMTransientRootProxy : NSProxy {
 @protected
  __weak Protocol *protocol_;
  NSDistantObject *realProxy_;

  NSString *registeredName_;
  NSString *host_;

  NSTimeInterval requestTimeout_;
  NSTimeInterval replyTimeout_;
}

// Returns an autoreleased instance
+ (id)rootProxyWithRegisteredName:(NSString *)name
                             host:(NSString *)host
                         protocol:(Protocol *)protocol
                   requestTimeout:(NSTimeInterval)requestTimeout
                     replyTimeout:(NSTimeInterval)replyTimeout;

// This function will return a GTMTransientRootProxy that is using Mach ports
// for the connection.  The |name| and |host| arguments will be used to lookup
// the correct information to create the Mach port connection.
//
- (id)initWithRegisteredName:(NSString *)name
                        host:(NSString *)host
                    protocol:(Protocol *)protocol
              requestTimeout:(NSTimeInterval)requestTimeout
                replyTimeout:(NSTimeInterval)replyTimeout;

// Returns YES if the DO connection is up and working, NO otherwise.
//
- (BOOL)isConnected;

@end

// Subclass of GTMTransientRootProxy that catches and ignores ALL exceptions.
// This class overrides GTMTransientRootProxy's -forwardInvocation:
// method, and wraps it in a try/catch block, and ignores all exceptions.
//
@interface GTMRootProxyCatchAll : GTMTransientRootProxy

// Overridden, and ignores all thrown exceptions.
- (void)forwardInvocation:(NSInvocation *)invocation;

@end
