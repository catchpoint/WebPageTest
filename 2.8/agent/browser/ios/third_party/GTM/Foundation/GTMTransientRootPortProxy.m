//
//  GTMTransientRootPortProxy.m
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

#import "GTMTransientRootPortProxy.h"
#import "GTMObjC2Runtime.h"

@interface GTMTransientRootPortProxy (ProtectedMethods)
// Returns an NSConnection for NSPorts.  This method overrides the one in
// the GTMTransientRootProxy which allows us to create a connection with a
// NSPort.
//
- (NSConnection *)makeConnection;
@end


@implementation GTMTransientRootPortProxy

+ (id)rootProxyWithReceivePort:(NSPort *)receivePort
                      sendPort:(NSPort *)sendPort
                      protocol:(Protocol *)protocol
                requestTimeout:(NSTimeInterval)requestTimeout
                  replyTimeout:(NSTimeInterval)replyTimeout {
  return [[[self alloc] initWithReceivePort:receivePort
                                   sendPort:sendPort
                                   protocol:protocol
                             requestTimeout:requestTimeout
                               replyTimeout:replyTimeout] autorelease];
}

- (id)initWithReceivePort:(NSPort *)receivePort
                 sendPort:(NSPort *)sendPort
                 protocol:(Protocol *)protocol
           requestTimeout:(NSTimeInterval)requestTimeout
             replyTimeout:(NSTimeInterval)replyTimeout {
  if ((!sendPort && !receivePort) || !protocol) {
    [self release];
    return nil;
  }

  requestTimeout_ = requestTimeout;
  replyTimeout_ = replyTimeout;

  receivePort_ = [receivePort retain];
  sendPort_ = [sendPort retain];
  
  protocol_ = protocol;  // Protocols can't be retained
  return self;
}

- (void)dealloc {
  [receivePort_ release];
  [sendPort_ release];
  [super dealloc];
}

@end

@implementation GTMTransientRootPortProxy (ProtectedMethods)

- (NSConnection *)makeConnection {
  return [NSConnection connectionWithReceivePort:receivePort_
                                        sendPort:sendPort_];
}

@end
