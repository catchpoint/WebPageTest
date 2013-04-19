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

 Created by Mark Cogan on 5/31/2011.

 ******************************************************************************/

#import <UIKit/UIKit.h>

// simple view controller for a web view that times how long it takes
// its own content to load.
//
// Generally speaking this controller should be created on the main thread
// as it is a UI component. However, the loadRequest: and waitForLoad methods
// may be called in other threads (and waitForLoad will probably not work
// correctly otherwise)
@interface TimedWebViewController : UIViewController<UIWebViewDelegate> {
 @private
  NSDate *startTime_;
  NSTimeInterval loadTime_;
  BOOL done_;
}

// absolute tiem the page load started
@property (retain) NSDate *startTime;
// time interval since |startTime| for the page to finish loading, defined here
// as the time for the webViewDidFinishLoad callback to be made.
@property (assign) NSTimeInterval loadTime;

// loads |request| into the web view, setting |startTime| and |loadTime|.
// Starts the load on the main thread, regardless of where it was called.
- (void)loadRequest:(NSURLRequest *)request;

// waits until the webView is done loading.
- (void)waitForLoad;

@end
