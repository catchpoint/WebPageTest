//
//  WAKView.h
//
//  Created by Mark Cogan on 4/19/11
//  Derived from code by by Kenneth Leftin (iShots)
//  Copyright 2011 Google Inc. All rights reserved.
//
//  Original source comment:
//    Downloaded verbatim from: http://winxblog.com/?p=6

#import "WAKResponder.h"

 @class NSMutableSet;

 @interface WAKView : WAKResponder {
   struct WKView *viewRef;
   NSMutableSet *subviewReferences;
 }

 + (struct __CFDictionary *)_viewWrappers;
 + (void)_addViewWrapper:(id)fp8;
 + (void)_removeViewWrapper:(id)fp8;
 + (id)_wrapperForViewRef:(struct WKView *)fp8;
 + (id)focusView;
 - (void)_handleEvent:(struct __GSEvent *)fp8;
 - (id)nextResponder;
 - (BOOL)_handleResponderCall:(int)fp8;
 - (id)_initWithViewRef:(struct WKView *)fp8;
 - (id)init;
 - (id)initWithFrame:(struct CGRect)fp8;
 - (void)dealloc;
 - (id)window;
 - (struct WKView *)_viewRef;
 - (id)_subviewReferences;
 - (id)subviews;
 - (id)superview;
 - (id)lastScrollableAncestor;
 - (void)addSubview:(id)fp8;
 - (void)willRemoveSubview:(id)fp8;
 - (void)removeFromSuperview;
 - (void)viewDidMoveToWindow;
 - (void)frameSizeChanged;
 - (void)setNeedsDisplay:(BOOL)fp8;
 - (void)setNeedsDisplayInRect:(struct CGRect)fp8;
 - (BOOL)needsDisplay;
 - (void)display;
 - (void)displayIfNeeded;
 - (void)drawRect:(struct CGRect)fp8;
 - (struct CGRect)bounds;
 - (struct CGRect)frame;
 - (void)setFrame:(struct CGRect)fp8;
 - (void)setFrameOrigin:(struct CGPoint)fp8;
 - (void)setFrameSize:(struct CGSize)fp8;
 - (void)setBoundsSize:(struct CGSize)fp8;
 - (void)displayRect:(struct CGRect)fp8;
 - (void)displayRectIgnoringOpacity:(struct CGRect)fp8;
 - (struct CGRect)visibleRect;
 - (struct CGPoint)convertPoint:(struct CGPoint)fp8 toView:(id)fp16;
 - (struct CGPoint)convertPoint:(struct CGPoint)fp8 fromView:(id)fp16;
 - (struct CGSize)convertSize:(struct CGSize)fp8 toView:(id)fp16;
 - (struct CGRect)convertRect:(struct CGRect)fp8 fromView:(id)fp24;
 - (struct CGRect)convertRect:(struct CGRect)fp8 toView:(id)fp24;
 - (void)lockFocus;
 - (void)unlockFocus;
 - (id)hitTest:(struct CGPoint)fp8;
 - (void)setHidden:(BOOL)fp8;
 - (BOOL)isDescendantOf:(id)fp8;
 - (BOOL)mouse:(struct CGPoint)fp8 inRect:(struct CGRect)fp16;
 - (BOOL)needsPanelToBecomeKey;
 - (void)setNextKeyView:(id)fp8;
 - (id)previousValidKeyView;
 - (id)nextKeyView;
 - (id)nextValidKeyView;
 - (id)previousKeyView;
 - (void)invalidateGState;
 - (void)releaseGState;
 - (BOOL)inLiveResize;
 - (void)setAutoresizingMask:(unsigned int)fp8;
 - (unsigned int)autoresizingMask;
 - (void)scrollPoint:(struct CGPoint)fp8;
 - (BOOL)scrollRectToVisible:(struct CGRect)fp8;
 - (void)setNeedsLayout:(BOOL)fp8;
 - (void)layout;
 - (void)layoutIfNeeded;
 - (void)setScale:(float)fp8;
 - (float)scale;

 @end


