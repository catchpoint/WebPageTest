//
//  GTMDebugThreadValidation.m
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

#import "GTMDebugThreadValidation.h"

#if DEBUG && MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4

static NSThread *gGTMMainThread = nil;

static __attribute__((constructor)) void _GTMInitThread(void) {
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  gGTMMainThread = [NSThread currentThread];
  [gGTMMainThread retain];
  [pool release];
}


BOOL _GTMIsRunningOnMainThread(void) {
  return [[NSThread currentThread] isEqual:gGTMMainThread];
}

#endif  // DEBUG && MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4
