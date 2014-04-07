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
    * Neither the name of Google, Inc. nor the names of its contributors
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
******************************************************************************/

#import "OpenURLAppDelegate.h"

@implementation OpenURLAppDelegate

/*! Handles the app launch.
 \param launchOptions An array with an optional URL string element, which
    defaults to "http://".
 \returns True if successful, else exit(1).
 */
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
    // To pass args in Xcode, see:
    //   Product > Scheme > Edit Scheme > Arguments > + URL
    // For idevice-app-runner use:
    //   --args URL
    NSArray * args = [[NSProcessInfo processInfo] arguments];

    // RFE(wrightt) Add a background HTTP listener that listens for "openURL" requests?
    // In iOS6 it's tricky to keep a background app alive, but this enhancement would
    // avoid the repeat idevice-app-runner calls.

    // We want the default to be "about:blank" but that's not a supported app scheme.
    // Instead we'll use "http://", which is invalid but blank.
    NSString* url =
    ([args count] > 1 ? [args objectAtIndex: 1] : @"http://");//@"about:blank");

    NSLog(@"opening %@", url);
    bool ret = [[UIApplication sharedApplication] openURL:[NSURL URLWithString: url]];
    if (!ret) {
        // This only happens if the scheme is malformed, e.g. "htp://foo".
        // It doesn't check the browser's status (e.g. no WiFi).
        NSLog(@"Unable to open %@", url);
        exit(1);
    }

    // Don't exit yet, otherwise our request never makes it to Safari!
    NSLog(@"opened %@", url);
    return ret;
}

/*! Handles the post-launch exit(0).
 \param application
 */
- (void)applicationDidEnterBackground:(UIApplication *)application
{
    // This is the normal exit case.  As noted above, we don't want to exit right away.
    NSLog(@"sleep 2");
    sleep(2);
    NSLog(@"exit %d", 0);
    exit(0);
}

/*! Handles an "openURL://" callback to re-launch this app.

 The "openURL" scheme constant must be specified in the openURL-Info.plist:
   <key>CFBundleURLTypes</key>
   <array>
       <dict>
           <key>CFBundleURLName</key>
           <string>com.google.openURL</string>
           <key>CFBundleURLSchemes</key>
           <array>
               <string>openURL</string>
           </array>
       </dict>
   </array>

 This callback is optional but may be useful someday, e.g. to let the browser
 easily re-launch this app.

 \param url
 \param sourceApplication
 */
-(BOOL)application:(UIApplication *)application openURL:(NSURL *)url sourceApplication:(NSString *)sourceApplication
        annotation:(id)annotation{
    NSLog(@"callback %@ %@ %@", url, sourceApplication, annotation);
    return true;
}

// The rest is boilerplate

- (void)dealloc
{
    [_window release];
    [super dealloc];
}

- (void)applicationWillResignActive:(UIApplication *)application
{
}

- (void)applicationWillEnterForeground:(UIApplication *)application
{
}

- (void)applicationDidBecomeActive:(UIApplication *)application
{
}

- (void)applicationWillTerminate:(UIApplication *)application
{
}

@end
