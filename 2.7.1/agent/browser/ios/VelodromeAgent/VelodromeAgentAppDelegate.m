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

#import "VelodromeAgentAppDelegate.h"
#import "VelodromeAgentViewControllerDelegate.h"
#import "WebPageTestAgentViewControllerDelegate.h"
#import "Velodrome.h"
#import "AgentViewController.h"
#import "SimpleWebViewController.h"
#import "Autobox.h"
#import "GTMDefines.h"

#define kAuthCookieName @"ACSID"

@interface LoggingURLCache : NSURLCache
@end

@interface VelodromeAgentAppDelegate (Private)

- (BOOL)authCookieInCookieStore;
- (void)authenticate;

@end

@implementation VelodromeAgentAppDelegate

@synthesize checkinInterval = checkinInterval_;
@synthesize pageTimeout = pageTimeout_;
@synthesize resourceTimeout =resourceTimeout_;
@synthesize authState = authState_;
@synthesize agentType = agentType_;
@synthesize window     = window_;
@synthesize deviceInfo = deviceInfo_;
@synthesize authCookies = authCookies_;

# pragma mark NSObject Overrides

- (id)init {
  if (nil == (self = [super init]))
    return nil;

  if ([CLLocationManager locationServicesEnabled]) {
    locationManager_ = [[CLLocationManager alloc] init];
    [locationManager_ startUpdatingLocation];
  }

  return self;
}

- (void)dealloc {
  [window_ release];
  [deviceInfo_ release];

  [viewController_ release];
  [viewControllerDelegate_ release];
  [locationManager_ release];

  [authCookies_  release];

  [super dealloc];
}

#pragma mark -
#pragma mark Annoyingly necessary utility method
#pragma mark -

// Given the name of a plist that defines a settings page, read and apply
// its defaults. If a settings page has an element that references a subpage,
// recursively apply defaults for that subpage.
- (void)setDefaultsForSettingsPane: (NSString *)settingsPlist {
  NSString *settingsPListPath
    = [[[[NSBundle mainBundle] bundlePath]
        stringByAppendingPathComponent:@"Settings.bundle"]
       stringByAppendingPathComponent:settingsPlist];

  NSArray *settingsFromPlist
    = [[NSDictionary dictionaryWithContentsOfFile:settingsPListPath]
        objectForKey:@"PreferenceSpecifiers"];

  NSUserDefaults *settings = [NSUserDefaults standardUserDefaults];

  for (NSDictionary *setting in settingsFromPlist) {
    NSString *typeKey = [setting objectForKey:@"Type"];
    if ([typeKey isEqualToString:@"PSChildPaneSpecifier"]) {
      NSString *filename = [setting objectForKey:@"File"];
      NSString *plistname = [NSString stringWithFormat:@"%@.plist", filename];
      [self setDefaultsForSettingsPane:plistname];
      continue;
    }

    NSString *settingKey = [setting objectForKey:@"Key"];
    id settingDefault = [setting objectForKey:@"DefaultValue"];

    if (nil != settingKey && nil != settingDefault) {
      [settings setObject:settingDefault forKey:settingKey];
    }
  }
}

// All of the default settings for the app are defined in the Settings.bundle
// info,plist. However these don't get applied until the user runs the
// Settings app. This method reads from the bundle and sets all of the defaults.
- (void)setDefaults {
  [self setDefaultsForSettingsPane:@"Root.plist"];
  NSUserDefaults *settings = [NSUserDefaults standardUserDefaults];
  [settings synchronize];
}

#pragma mark -
#pragma mark UIApplicationDelegate methods
#pragma mark -

// Note: This app has the info.plist setting 'Application does not run in
// background' set to YES, so none of the app lifecycle callbacks are needed.

// |launchOptions| is always ignored
- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {

  [application setIdleTimerDisabled:YES];

  self.deviceInfo = [VeloDeviceInfo deviceInfoForCurrentDevice];

  // update device info and get server URL from app settings
  NSUserDefaults *settings = [NSUserDefaults standardUserDefaults];

  // To see if we need to set defaults, read a key that can never be
  // empty if settings have been applied
  NSString *agentTypeSetting = [settings stringForKey:@"agenttype"];
  if (nil == agentTypeSetting) {
    // Read the default settings from the configuration plist
    [self setDefaults];
    agentTypeSetting = [settings stringForKey:@"agenttype"];
  }

  // Init settings that are specific to velodrone or webpagetest,
  // depending on our agent type.
  if ([agentTypeSetting isEqualToString:@"Velodrome"]) {
    agentType_ = agentVelodrome;
  } else if ([agentTypeSetting isEqualToString:@"WebPageTest"]) {
    agentType_ = agentWebPageTest;

    // WebPageTest does not require any authentication.
    authState_ = authNotNeeded;

  } else {
    NSLog(@"FATAL: Invalid agent type \"%@\" should not be possible.",
          agentTypeSetting);
    return NO;
  }

  self.deviceInfo.carrier = [settings stringForKey:@"carrier"];
  runUninstrumentedControl_ = NO;
  checkinInterval_  = (NSTimeInterval)[settings floatForKey:@"checkinInterval"];
  pageTimeout_  = (NSTimeInterval)[settings floatForKey:@"pageTimeout"];
  resourceTimeout_  = (NSTimeInterval)[settings floatForKey:@"resourceTimeout"];

  if ([self.deviceInfo.networkType isEqualToString:kVeloNetworkCell])
    [self.deviceInfo addNetworkSubtype:[settings stringForKey:@"cellType"]];

  if (locationManager_) { // this is nil if the device can't do location
    // if necessary, wait until we have a location.
    // NOTE: this doesn't support the device moving between tests
    NSUInteger counter = 0;
    while (nil == locationManager_.location) {
      if (++counter > 15)
        break; // never wait more than 15 seconds for this.

      NSDate *delay = [NSDate dateWithTimeIntervalSinceNow:1.00];
      NSLog(@"Sleeping until %@", delay);
      // TODO(skerner): Consider making self a delegate of locationManager_
      // and acting on locationManager:didUpdateToLoaction:fromLocation:
      // instead of spinning the run loop.
      // See http://developer.apple.com/library/ios/#DOCUMENTATION/CoreLocation/Reference/CLLocationManager_Class/CLLocationManager/CLLocationManager.html
      [[NSRunLoop currentRunLoop] runUntilDate:delay];
    }
    [locationManager_ stopUpdatingLocation];

    if (nil != locationManager_.location) {
      CLLocationCoordinate2D coord = [locationManager_.location coordinate];
      [self.deviceInfo setLocationLatitude:coord.latitude
                                 longitude:coord.longitude];
    }
  }

  self.window = [[[UIWindow alloc] initWithFrame:[[UIScreen mainScreen] bounds]]
                 autorelease];

  // figure out what view controller and nib to display
  BOOL showiPadUI =
      UIUserInterfaceIdiomPad == [[UIDevice currentDevice] userInterfaceIdiom];

  if ([self.deviceInfo.networkType isEqualToString:kVeloNetworkNone]) {
    NSString *nibName
        = showiPadUI ? @"NoNetworkViewiPad" : @"NoNetworkViewiPhone";
    viewController_ = [[UIViewController alloc] initWithNibName:nibName
                                                         bundle:nil];
    // skip auth since we can't actually do anything
    authState_ = authUnavailable;
  } else {
    NSString *nibName = showiPadUI ? @"AgentViewiPad" : @"AgentViewiPhone";

    Class agentSpecificDelegateClass = nil;
    switch (agentType_) {
      case agentVelodrome:
        agentSpecificDelegateClass =
            [VelodromeAgentViewControllerDelegate class];
        break;
      case agentWebPageTest:
        agentSpecificDelegateClass =
            [WebPageTestAgentViewControllerDelegate class];
        break;
      default:
        _GTMDevAssert(NO, @"Must create a delegate for each agent type.");
    }

    viewControllerDelegate_ = [[agentSpecificDelegateClass alloc] init];
    viewController_ =
        [[AgentViewController alloc] initWithNibName:nibName
                                              bundle:nil
                                            delegate:viewControllerDelegate_];

    ((AgentViewController *)viewController_).runUninstrumentedControl
        = runUninstrumentedControl_;
  }

  [window_ addSubview:[viewController_ view]];
  [window_ makeKeyAndVisible];

  return YES;
}

#pragma mark -
#pragma mark Authentication methods
#pragma mark -

- (void)authenticateIfNeeded {
  // see if we need to authenticate
  if (authNotNeeded == authState_)
    return;

  // See if we are already authenticated.
  if (authUnavailable != authState_) {
    if ([self authCookieInCookieStore]) {
      authState_ = authGood;
      if (nil == authCookies_) {
        self.authCookies =
            [[NSHTTPCookieStorage sharedHTTPCookieStorage] cookiesForURL:[viewControllerDelegate_ serverURL]];
        NSLog(@"set %d auth cookies",[self.authCookies count]);
      }
    } else {
      authState_ = authNone;
      [self authenticate];
    }
  }
}

// Return true if user should wait for authentication before continuing test.
- (BOOL)waitingOnAuthentication {
  // If authentication is not needed, never wait for it.
  if (authNotNeeded == authState_)
    return NO;

  // If we are already authenticated, no need to wait.
  if (authGood == authState_)
    return NO;

  // To get here, we must be set to need authentication, and not have it yet.
  return YES;
}

- (BOOL)authCookieInCookieStore {
  NSHTTPCookieStorage *sharedCookies
    = [NSHTTPCookieStorage sharedHTTPCookieStorage];
  for (NSHTTPCookie *cookie in [sharedCookies cookiesForURL:[viewControllerDelegate_ serverURL]]) {
    if ([cookie.name isEqualToString:kAuthCookieName]) {
      return YES;
    }
  }
  return NO;
}

// Autheticate by presenting a webView for the operator to manuall sign in on,
// using their Google account and their OTP. Fun stuff!
- (void)authenticate {
  SimpleWebViewController *authViewController =
      [[SimpleWebViewController alloc]
          initWithURL:[viewControllerDelegate_ serverURL]];
  authViewController.delegate = self;

  [viewController_ presentModalViewController:authViewController animated:YES];
}

#pragma mark -
#pragma mark UIWebViewDelegate
#pragma mark -

- (BOOL)webView:(UIWebView *)webView
    shouldStartLoadWithRequest:(NSURLRequest *)request
                navigationType:(UIWebViewNavigationType)navigationType {

  // We know we're done when we get redirected back to the domain we originally
  // requested. Test for that here.
  BOOL isServerURL = [[[request URL] host] isEqualToString:[[viewControllerDelegate_ serverURL] host]];

  if (authNone == authState_) {
    authState_ = authPresenting;
  } else if (isServerURL) {
    authState_ = authVerifying;
  } else {
    authState_ = authRedirecting;
  }

  return YES;
}

- (void)webViewDidFinishLoad:(UIWebView *)webView {
  // if we are at the URL we wanted, and the cookie we need has been set,
  // we're done and can dismiss the authentication modal.
  if (authVerifying == authState_ && [self authCookieInCookieStore]) {
    authState_ = authGood;
    [viewController_ dismissModalViewControllerAnimated:YES];
    self.authCookies =
    [[NSHTTPCookieStorage sharedHTTPCookieStorage]
        cookiesForURL:[viewControllerDelegate_ serverURL]];
  }
}

- (void)webView:(UIWebView *)webView didFailLoadWithError:(NSError *)error {
  NSLog(@"Auth web view failed with error: %@", [error localizedDescription]);
}


@end
