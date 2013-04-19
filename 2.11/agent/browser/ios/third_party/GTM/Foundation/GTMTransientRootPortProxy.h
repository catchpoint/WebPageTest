//
//  GTMTransientRootPortProxy.h
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
#import "GTMTransientRootProxy.h"

@interface GTMTransientRootPortProxy : GTMTransientRootProxy {
 @private
  NSPort *receivePort_;
  NSPort *sendPort_;
}

// Returns an autoreleased instance. See below for details on args.
+ (id)rootProxyWithReceivePort:(NSPort *)receivePort
                      sendPort:(NSPort *)sendPort
                      protocol:(Protocol *)protocol
                requestTimeout:(NSTimeInterval)requestTimeout
                  replyTimeout:(NSTimeInterval)replyTimeout;

// This function will return a GTMTransientRootProxy that is using NSPorts
// for the connection. The |receivePort| and |sendPort| conventions
// follow the same conventions as -[NSConnection initWithReceivePort:sendPort:].
// Note that due to Radar 6676818 "NSConnection leaks when initialized with nil
// sendPort" that you will leak a connection if you pass in "nil" for your
// sendPort if you are using NSPorts (mach or socket) to communicate between
// threads. The leak occurs on 10.5.6, and SL 10A286. This simple answer
// is just to always use two ports to communicate. Check out the test to see
// how we do cross thread communication.
- (id)initWithReceivePort:(NSPort *)receivePort
                 sendPort:(NSPort *)sendPort
                 protocol:(Protocol *)protocol
           requestTimeout:(NSTimeInterval)requestTimeout
             replyTimeout:(NSTimeInterval)replyTimeout;

@end
