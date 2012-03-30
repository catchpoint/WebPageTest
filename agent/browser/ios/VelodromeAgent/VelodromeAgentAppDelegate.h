/******************************************************************************
 Copyright (c) 2012, Google Inc.
 All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 * Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice,
 this list of conditions and the following disclaimer in the documentation
 and/or other materials provided with the distribution.
 * Neither the name of Google Inc. nor the names of its contributors
 may be used to endorse or promote products derived from this software
 without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

 Created by Mark Cogan on 4/19/2011.

 ******************************************************************************/

#import <UIKit/UIKit.h>
#import <CoreLocation/CoreLocation.h>

#import "AgentViewController.h"

@class VeloDeviceInfo;


// states in the authentication process. "authGood" means we have provided
// credentials and now have a cookie we can use. "authUnavailable" means we
// won't ever try to offer credentials (for example, if we know we don't have
// any network, we want to just display an error and not also prompt for auth)

typedef enum {
  authNone = 0,
  authPresenting,
  authRedirecting,
  authVerifying,
  authGood,
  authUnavailable,
  authNotNeeded,  // Do not try to authenticate.
} VeloAuthStatus;

// What system are we acting as an agent for?
typedef enum {
  agentVelodrome = 0,
  agentWebPageTest
} AgentType;

// App delegate for VelodromeAgent. The app delegate collects some basic
// configuration information about the device and settings and exposes that
// through properties. All meaningful app functionality happens through the
// delegate's view controller
@interface VelodromeAgentAppDelegate : NSObject
  <UIApplicationDelegate,UIWebViewDelegate> {
 @private
  BOOL runUninstrumentedControl_;
  NSTimeInterval checkinInterval_;
  NSTimeInterval pageTimeout_;
  NSTimeInterval resourceTimeout_;

  UIWindow *window_;
  VeloDeviceInfo *deviceInfo_;

  UIViewController *viewController_;
  id<AgentViewControllerDelegate> viewControllerDelegate_;
  CLLocationManager *locationManager_;

  VeloAuthStatus authState_;
  AgentType agentType_;
  NSArray *authCookies_;
}

@property (readonly) NSTimeInterval checkinInterval;
@property (readonly) NSTimeInterval pageTimeout;
@property (readonly) NSTimeInterval resourceTimeout;
@property (readonly) VeloAuthStatus authState;
@property (readonly) AgentType agentType;
@property (retain, nonatomic) UIWindow *window;
@property (retain) VeloDeviceInfo *deviceInfo;
@property (retain) NSArray *authCookies;

- (void)authenticateIfNeeded;
- (BOOL)waitingOnAuthentication;

@end
