//
//  GTMDebugThreadValidation.h
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

#if DEBUG
#import "GTMDefines.h"
#import <Foundation/Foundation.h>

// GTMAssertRunningOnMainThread will allow you to verify that you are
// currently running on the main thread. This can be useful for checking
// under DEBUG to make sure that code that requires being run on the main thread
// is doing so. Use the GTMAssertRunningOnMainThread macro, don't use
// the _GTMAssertRunningOnMainThread or _GTMIsRunningOnMainThread
// helper functions.

// On Leopard and above we can just use NSThread functionality.
#if MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4
BOOL _GTMIsRunningOnMainThread(void);
#else  // MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4
#import <Foundation/Foundation.h>
GTM_INLINE BOOL _GTMIsRunningOnMainThread(void) { 
  return [NSThread isMainThread]; 
}
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4

GTM_INLINE void _GTMAssertRunningOnMainThread(const char *func,
                                              const char *file, 
                                              int lineNum) { 
  _GTMDevAssert(_GTMIsRunningOnMainThread(), 
                @"%s not being run on main thread (%s - %d)",
                func, file, lineNum);
}

#define GTMAssertRunningOnMainThread() \
  (_GTMAssertRunningOnMainThread(__func__, __FILE__, __LINE__))

#else // DEBUG

#define GTMAssertRunningOnMainThread() do { } while (0)

#endif // DEBUG
