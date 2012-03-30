//
//  GTMAbstractDOListener.h
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
#import "GTMDefines.h"

#if MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4
@class GTMReceivePortDelegate;
#endif // MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4

// Abstract base class for DO "listeners".
// A class that needs to vend itself over DO should subclass this abstract 
// class.  This class takes care of certain things like creating a new thread 
// to handle requests, setting request/reply timeouts, and ensuring the vended
// object only gets requests that comply with the specified protocol.
//
// Subclassers will want to use the
// GTM_ABSTRACTDOLISTENER_SUBCLASS_THREADMAIN_IMPL macro for easier debugging
// of stack traces. Please read it's description below.
//
@interface GTMAbstractDOListener : NSObject <NSConnectionDelegate> {
 @protected
  NSString *registeredName_;
  __weak Protocol *protocol_;
  NSConnection *connection_;
  BOOL isRunningInNewThread_;
  BOOL shouldShutdown_;
  NSTimeInterval requestTimeout_;
  NSTimeInterval replyTimeout_;
  NSPort *port_;
  NSTimeInterval heartRate_;

#if MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4
  GTMReceivePortDelegate *receivePortDelegate_;  // Strong (only used on Tiger)
#endif // MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4
}

// Returns a set of all live instances of GTMAbstractDOListener subclasses.
// If no listeners have been created, this will return an empty array--not nil.
//
// TODO: Remove this method
//
+ (NSArray *)allListeners;

// Initializer.  This actually calls
// initWithRegisteredName:protocol:port with [NSMachPort port] as the port.
//
// Args:
//   name - the name that the object will register under
//   proto - the protocol that this object (self) should conform to
//
- (id)initWithRegisteredName:(NSString *)name protocol:(Protocol *)proto;

// The designated initializer.
//
// Args:
//   name - the name used to register the port.  While not necessarily required
//          for an NSSocketPort this class still requires it.
//   proto - the protocol that this object (self) should conform to
//   port - the port to be used when creating the NSConnection.  If a NSMachPort
//          is being used then initWithRegisteredName:protocol is recommended.
//          Otherwise the port must be allocted by the caller.
//
- (id)initWithRegisteredName:(NSString *)name
                    protocol:(Protocol *)proto
                        port:(NSPort *)port;

// Returns the name that this server will register with the 
// mach port name sever.  This is the name of the port that this class
// will "listen" on when -runInNewThread is called.
//
// Returns:
//   The registered name as a string
//
- (NSString *)registeredName;

// Sets the registered name to use when listening over DO.  This only makes
// sense to be called before -runInNewThread has been called, because
// -runInNewThread will listen on this "registered name", so setting it
// afterwards would do nothing.
//
// Args:
//   name - the name to register under.  May not be nil.
//
- (void)setRegisteredName:(NSString *)name;

// Get/set the request timeout interval.  If set to a value less than 0,
// the default DO connection timeout will be used (maximum possible value).
//
- (NSTimeInterval)requestTimeout;
- (void)setRequestTimeout:(NSTimeInterval)timeout;

// Get/set the reply timeout interval.  If set to a value less than 0,
// the default DO connection timeout will be used (maximum possible value).
//
- (NSTimeInterval)replyTimeout;
- (void)setReplyTimeout:(NSTimeInterval)timeout;

// Get/set how long the thread will spin the run loop.  This only takes affect
// if runInNewThreadWithErrorTarget:selector:withObjectArgument: is used.  The
// default heart rate is 10.0 seconds.
//
- (void)setThreadHeartRate:(NSTimeInterval)heartRate;
- (NSTimeInterval)ThreadHeartRate;

// Returns the listeners associated NSConnection.  May be nil if no connection
// has been setup yet.
//
- (NSConnection *)connection;

// Starts the DO system listening using the current thread and current runloop.
// It only makes sense to call this method -OR- -runInNewThread, but not both.
// Returns YES if it was able to startup the DO listener, NO otherwise.
//
- (BOOL)runInCurrentThread;

// Starts the DO system listening, and creates a new thread to handle the DO
// connections.  It only makes sense to call this method -OR-
// -runInCurrentThread, but not both.
// if |errObject| is non nil, it will be used along with |selector| and
// |argument| to signal that the startup of the listener in the new thread
// failed.  The actual selector will be invoked back on the main thread so
// it does not have to be thread safe.
// The most basic way to call this method is as follows:
//    [listener runInNewThreadWithErrorTarget:nil
//                                   selector:NULL
//                         withObjectArgument:nil];
//
// Note: Using the example above you will not know if the listener failed to
// startup due to some error.
//
- (void)runInNewThreadWithErrorTarget:(id)errObject
                             selector:(SEL)selector
                   withObjectArgument:(id)argument;

// Shuts down the connection.  If it was running in a new thread, that thread
// should exit (within about 10 seconds).  This call does not block.
//
// NOTE: This method is called in -dealloc, so if -runInNewThread had previously
// been called, -dealloc will return *before* the thread actually exits.  This
// can be a problem as "self" may be gone before the thread exits.  This is a
// bug and needs to be fixed.  Currently, to be safe, only call -shutdown if
// -runInCurrentThread had previously been called.
//
- (void)shutdown;

@end


// Methods that subclasses may implement to vary the behavior of this abstract
// class.
//
@interface GTMAbstractDOListener (GTMAbstractDOListenerSubclassMethods)

// Called by the -runIn* methods.  In the case where a new thread is being used,
// this method is called on the new thread.  The default implementation of this
// method just returns YES, but subclasses can override it to do subclass
// specific initialization.  If this method returns NO, the -runIn* method that
// called it will fail with an error.
//
// Returns:
//   YES if the -runIn* method should continue successfully, NO if the it should
//   fail.
//
- (BOOL)doRunInitialization;

// Called as the "main" for the thread spun off by GTMAbstractDOListener.
// Not really for use by subclassers, except to use the 
// GTMABSTRACTDOLISTENER_SUBCLASS_THREADMAIN_IMPL macro defined below.
//
// This method runs forever in a new thread.  This method actually starts the
// DO connection listening.
//
- (void)threadMain:(NSInvocation *)failureCallback;

@end

// GTMAbstractDOListeners used to be hard to debug because crashes in their
// stacks looked like this:
//
// #0  0x90009cd7 in mach_msg_trap ()
// #1  0x90009c38 in mach_msg ()
// #2  0x9082d2b3 in CFRunLoopRunSpecific ()
// #3  0x9082cace in CFRunLoopRunInMode ()
// #4  0x9282ad3a in -[NSRunLoop runMode:beforeDate:] ()
// #5  0x928788e4 in -[NSRunLoop runUntilDate:] ()
// #6  0x00052696 in -[GTMAbstractDOListener(GTMAbstractDOListenerSubclassMethods) threadMain:] ...
// #7  0x927f52e0 in forkThreadForFunction ()
// #8  0x90024227 in _pthread_body ()
//
// and there was no good way to figure out what thread had the problem because
// they all originated from
// -[GTMAbstractDOListener(GTMAbstractDOListenerSubclassMethods) threadMain:]
//
// If you add GTMABSTRACTDOLISTENER_SUBCLASS_THREADMAIN_IMPL to the impl of your
// subclass you will get a stack that looks like this:
// #0  0x90009cd7 in mach_msg_trap ()
// #1  0x90009c38 in mach_msg ()
// #2  0x9082d2b3 in CFRunLoopRunSpecific ()
// #3  0x9082cace in CFRunLoopRunInMode ()
// #4  0x9282ad3a in -[NSRunLoop runMode:beforeDate:] ()
// #5  0x928788e4 in -[NSRunLoop runUntilDate:] ()
// #6  0x00052696 in -[GTMAbstractDOListener(GTMAbstractDOListenerSubclassMethods) threadMain:] ...
// #7  0x0004b35c in -[GDStatsListener threadMain:]
// #8  0x927f52e0 in forkThreadForFunction () #9  0x90024227 in _pthread_body ()
//
// so we can see that this was the GDStatsListener thread that failed.
// It will look something like this
// @implemetation MySubclassOfGTMAbstractDOListenerSubclassMethods
// GTM_ABSTRACTDOLISTENER_SUBCLASS_THREADMAIN_IMPL
// ....
// @end

#define GTM_ABSTRACTDOLISTENER_SUBCLASS_THREADMAIN_IMPL \
  - (void)threadMain:(NSInvocation *)failureCallback { \
    [super threadMain:failureCallback]; \
  }
