//
//  WebView.h
//
//  Created by Mark Cogan on 4/19/11
//  Derived from code by by Kenneth Leftin (iShots)
//  Copyright 2011 Google Inc. All rights reserved.
//
//  Original source comment:
//   Downloaded verbatim from: http://winxblog.com/?p=6

#import "WAKView.h"
#import "WebPreferences.h"

@class WebViewPrivate;

@interface WebView : WAKView {
  WebViewPrivate *_private;
}

+ (void)initialize;
+ (BOOL)canShowMIMEType:(id)fp8;
+ (BOOL)canShowMIMETypeAsHTML:(id)fp8;
+ (id)MIMETypesShownAsHTML;
+ (void)setMIMETypesShownAsHTML:(id)fp8;
+ (void)registerURLSchemeAsLocal:(id)fp8;
+ (void)registerViewClass:(Class)fp8
      representationClass:(Class)fp12 forMIMEType:(id)fp16;
- (id)_pluginForMIMEType:(id)fp8;
- (id)_pluginForExtension:(id)fp8;
- (BOOL)_isMIMETypeRegisteredAsPlugin:(id)fp8;
- (void)_commonInitializationWithFrameName:(id)fp8 groupName:(id)fp12;
- (id)initWithFrame:(struct CGRect)fp8;
- (id)initWithFrame:(struct CGRect)fp8 frameName:(id)fp24 groupName:(id)fp28;
- (void)dealloc;
- (void)finalize;
- (void)close;
- (void)setShouldCloseWithWindow:(BOOL)fp8;
- (BOOL)shouldCloseWithWindow;
- (void)viewWillMoveToWindow:(id)fp8;
- (void)_windowWillClose:(id)fp8;
- (void)setPreferences:(WebPreferences *)preferences;
- (WebPreferences *)preferences;
- (void)setPreferencesIdentifier:(id)fp8;
- (id)preferencesIdentifier;
- (void)setUIDelegate:(id)fp8;
- (id)UIDelegate;
- (void)setResourceLoadDelegate:(id)fp8;
- (id)resourceLoadDelegate;
- (void)setDownloadDelegate:(id)fp8;
- (id)downloadDelegate;
- (void)setPolicyDelegate:(id)fp8;
- (id)policyDelegate;
- (void)setFrameLoadDelegate:(id)fp8;
- (id)frameLoadDelegate;
- (id)mainFrame;
- (id)selectedFrame;
- (id)backForwardList;
- (void)setMaintainsBackForwardList:(BOOL)fp8;
- (BOOL)goBack;
- (BOOL)goForward;
- (BOOL)goToBackForwardItem:(id)fp8;
- (void)setTextSizeMultiplier:(float)fp8;
- (float)textSizeMultiplier;
- (void)setApplicationNameForUserAgent:(NSString *)applicationName;
- (NSString *)applicationNameForUserAgent;
- (void)setCustomUserAgent:(NSString *)customUserAgent;
- (NSString *)customUserAgent;
- (void)setMediaStyle:(id)fp8;
- (id)mediaStyle;
- (BOOL)supportsTextEncoding;
- (void)setCustomTextEncodingName:(id)fp8;
- (id)_mainFrameOverrideEncoding;
- (id)customTextEncodingName;
- (id)stringByEvaluatingJavaScriptFromString:(id)fp8;
- (id)windowScriptObject;
- (id)userAgentForURL:(id)fp8;
- (void)setHostWindow:(id)fp8;
- (id)hostWindow;
- (id)documentViewAtWindowPoint:(struct CGPoint)fp8;
- (id)_elementAtWindowPoint:(struct CGPoint)fp8;
- (id)elementAtPoint:(struct CGPoint)fp8;
- (id)_hitTest:(struct CGPoint *)fp8 dragTypes:(id)fp12;
- (BOOL)acceptsFirstResponder;
- (BOOL)becomeFirstResponder;
- (id)_webcore_effectiveFirstResponder;
- (void)setNextKeyView:(id)fp8;
- (BOOL)searchFor:(id)fp8 direction:(BOOL)fp12
    caseSensitive:(BOOL)fp16 wrap:(BOOL)fp20;
- (void)setGroupName:(id)fp8;
- (id)groupName;
- (double)estimatedProgress;
- (void)setMainFrameURL:(id)fp8;
- (id)mainFrameURL;
- (BOOL)isLoading;
- (id)mainFrameTitle;
- (id)mainFrameDocument;
- (void)setDrawsBackground:(BOOL)fp8;
- (BOOL)drawsBackground;

@end
