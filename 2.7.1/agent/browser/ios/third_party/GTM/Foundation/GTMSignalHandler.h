//
//  GTMSignalHandler.h
//
//  Copyright 2008 Google Inc.
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

// GTMSignalHandler.
//
// This is a very simple, easy-to-use class for registering handlers that get
// called when a specific signal is delivered.  Also handy for ignoring
// inconvenient signals.  Ignoring SIGKILL is not support for what should be
// obvious reasons.  You can pass nil for target & action to ignore the signal.
//
// Example of how to catch SIGABRT and SIGTERM while ignring SIGWINCH:
//   GTMSignalHandler *abrt, *term, *winch;
//   abrt = [[GTMSignalHandler alloc]
//               initWithSignal:SIGABRT
//                       target:self
//                       action:@selector(handleAbort:)];
//
//   term = [[GTMSignalHandler alloc]
//               initWithSignal:SIGTERM
//                       target:self
//                       action:@selector(handleTerm:)];
//
//   winch = [[GTMSignalHandler alloc] initWithSignal:SIGWINCH
//                initWithSignal:SIGWINCH
//                        target:nil
//                        action:NULL
//
//  -(void)handleTerm:(int)signo {
//    .. do stuff ..
//  }
//
// Release the handler when you're no longer interested in handling that signal.
// Note that signal(SIG_IGN, signo) is performed on each signal handled by
// objects of this class, and those do not get un-done.
//
// Multiple handlers for the same signal is NOT supported.
//
// kqueue() is used to handle the signals, and the default runloop for the first
// signal handler is used for signal delivery, so keep that in mind when you're
// using this class.  This class explicitly does not handle arbitrary runloops
// and threading.
//
@interface GTMSignalHandler : NSObject {
 @private
  int signo_;
  __weak id target_;
  SEL action_;
}

// Returns a retained signal handler object that will invoke |handler| on the
// |target| whenever a signal of number |signo| is delivered to the process.
-(id)initWithSignal:(int)signo
             target:(id)target
             action:(SEL)action;

// Invalidates the handler so that it isn't listening anymore.
- (void)invalidate;

@end
