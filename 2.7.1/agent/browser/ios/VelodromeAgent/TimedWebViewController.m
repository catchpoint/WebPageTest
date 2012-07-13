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

#import "TimedWebViewController.h"


@implementation TimedWebViewController

@synthesize startTime = startTime_;
@synthesize loadTime = loadTime_;

// Just uses the standard inherited UIViewController initializer

- (void)dealloc {
  ((UIWebView *)self.view).delegate = nil;

  [startTime_ release];
  [super dealloc];
}

#pragma mark - View lifecycle

// create the web view, make it non-interactive, set |self| as the delegate,
// then set it as the view for this controller.
- (void)loadView {
  UIWebView *webView = [[UIWebView alloc]
                        initWithFrame:[UIScreen mainScreen].applicationFrame];
  [webView setScalesPageToFit:YES];
  webView.delegate = self;
  [webView setUserInteractionEnabled:NO];

  self.view = webView;
  [webView release];
}

- (BOOL)shouldAutorotateToInterfaceOrientation:(UIInterfaceOrientation)interfaceOrientation {
    return (interfaceOrientation == UIInterfaceOrientationPortrait);
}

// loads |request| into the web view, and delegate callbacks will set |startTime|
// and |loadTime|
// Starts the load on the main thread, regardless of where it was called.
- (void)loadRequest:(NSURLRequest *)request {
  done_ = NO;
  [(UIWebView *)self.view performSelectorOnMainThread:@selector(loadRequest:)
                                           withObject:request
                                        waitUntilDone:YES];
}

// waits until the webView is done loading.
//
// TODO verfy this is called from a non-main thread
- (void)waitForLoad {
  // check every five seconds to see if the web view thinks its done
  while (1) {
    if (done_)
      break;
    [NSThread sleepForTimeInterval:5.0];
  }
}

#pragma mark UIWebViewDelegate methods

// the web view started to load, so populate |startTime|
- (void)webViewDidStartLoad:(UIWebView *)webView {
  self.startTime = [NSDate date];
}

// the web view finished loading, so populate |loadTime|
- (void)webViewDidFinishLoad:(UIWebView *)webView {
  loadTime_ = -[startTime_ timeIntervalSinceNow];
  done_ = YES;
}

// treat errors as the load finishing
- (void)webView:(UIWebView *)webView didFailLoadWithError:(NSError *)error {
  [self webViewDidFinishLoad:webView];
}

@end
