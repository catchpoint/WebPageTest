//
//  GTMNSAnimatablePropertyContainer.h
//
//  Copyright (c) 2010 Google Inc. All rights reserved.
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

#import <Cocoa/Cocoa.h>
#import "GTMDefines.h"

#if MAC_OS_X_VERSION_MAX_ALLOWED >= MAC_OS_X_VERSION_10_5

// There is a bug in 10.5 where you cannot stop an animation on a 
// NSAnimatablePropertyContainer by just setting it's duration to 0.0.
// The work around is rather complex requiring you to NULL out animation 
// dictionary entries temporarily (see the code for details).
// These categories are to make stopping animations simpler.
// When you want to stop an animation, you just call it like you would
// an animator.
//
// [[myWindow gtm_animatorStopper] setAlphaValue:0.0];
//
// This will stop any current animations that are going on, and will immediately
// set the alpha value of the window to 0.
// If there is no animation, it will still set the alpha value to 0.0 for you.
@interface NSView (GTMNSAnimatablePropertyContainer)

- (id)gtm_animatorStopper;

@end

@interface NSWindow (GTMNSAnimatablePropertyContainer)

- (id)gtm_animatorStopper;

@end

#endif  // MAC_OS_X_VERSION_MAX_ALLOWED >= MAC_OS_X_VERSION_10_5
