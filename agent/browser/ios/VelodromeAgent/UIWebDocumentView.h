//
//  UIWebDocumentView.h
//
//  Created by Mark Cogan on 4/19/11
//  Derived from code by by Kenneth Leftin (iShots)
//  Copyright 2011 Google Inc. All rights reserved.
//
//  Original soutrce comment:
//   Downloaded verbatim from: http://winxblog.com/?p=6

@interface UIWebDocumentView : NSObject {
  WebView *_webView;
}

- (WebView *)webView;

@end

@interface UIWebView (DocumentView)

- (UIWebDocumentView *)_documentView;

@end
