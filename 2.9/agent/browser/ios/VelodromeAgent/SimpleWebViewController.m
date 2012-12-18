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

 Created by Mark Cogan on 5/23/2011.

 ******************************************************************************/

#import "SimpleWebViewController.h"

// Very simple view controller that hosts a UIWebView displaying |URL|
@implementation SimpleWebViewController

@synthesize URL=URL_;
@dynamic delegate;

// designated initializer. Calls UIViewController's
// initWithNibName:bundle:, which will end up defaulting to use
// SimpleWebViewController.xib (default behavior for a nibName of nil).
- (id) initWithURL:(NSURL *)URL {
  if (nil == (self = [super initWithNibName:nil bundle:nil]))
    return nil;

  self.URL = URL;

  return self;
}

- (void)dealloc {
  [URL_ release];
  [super dealloc];
}

// When the view has loaded from the nib, start create a request for |URL|
// and start it.
- (void)viewDidLoad {
  [super viewDidLoad];
  NSURLRequest *request = [NSURLRequest requestWithURL:URL_];
  [(UIWebView *)self.view loadRequest:request];
}

- (BOOL)shouldAutorotateToInterfaceOrientation:
    (UIInterfaceOrientation)interfaceOrientation {
  return (interfaceOrientation == UIInterfaceOrientationPortrait);
}

// proxy setter for the web view's delegate
- (void)setDelegate:(NSObject<UIWebViewDelegate> *)delegate {
  [(UIWebView *)self.view setDelegate:delegate];
}

// proxy getter for the web view's delegate
- (NSObject<UIWebViewDelegate> *)delegate {
  return [(UIWebView *)self.view delegate];
}

@end
