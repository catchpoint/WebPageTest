//
//  WAKResponder.h
//
//  Created by Mark Cogan on 4/19/11
//  Derived from code by by Kenneth Leftin (iShots)
//  Copyright 2011 Google Inc. All rights reserved.
//
//  Original source comment:
//    Downloaded verbatim from: http://winxblog.com/?p=6

// Added to avoid warnings:
struct __GSEvent;

@interface WAKResponder : NSObject {
 }

 - (void)handleEvent:(struct __GSEvent *)fp8;
 - (void)_forwardEvent:(struct __GSEvent *)fp8;
 - (void)scrollWheel:(struct __GSEvent *)fp8;
 - (void)mouseEntered:(struct __GSEvent *)fp8;
 - (void)mouseExited:(struct __GSEvent *)fp8;
 - (void)mouseMoved:(struct __GSEvent *)fp8;
 - (void)keyDown:(struct __GSEvent *)fp8;
 - (void)keyUp:(struct __GSEvent *)fp8;
 - (void)touch:(struct __GSEvent *)fp8;
 - (id)nextResponder;
 - (void)insertText:(id)fp8;
 - (void)deleteBackward:(id)fp8;
 - (void)deleteForward:(id)fp8;
 - (void)insertParagraphSeparator:(id)fp8;
 - (void)moveDown:(id)fp8;
 - (void)moveDownAndModifySelection:(id)fp8;
 - (void)moveLeft:(id)fp8;
 - (void)moveLeftAndModifySelection:(id)fp8;
 - (void)moveRight:(id)fp8;
 - (void)moveRightAndModifySelection:(id)fp8;
 - (void)moveUp:(id)fp8;
 - (void)moveUpAndModifySelection:(id)fp8;
 - (void)mouseDragged:(struct __GSEvent *)fp8;
 - (void)mouseUp:(struct __GSEvent *)fp8;
 - (void)mouseDown:(struct __GSEvent *)fp8;
 - (BOOL)acceptsFirstResponder;
 - (BOOL)becomeFirstResponder;
 - (BOOL)resignFirstResponder;
 - (BOOL)tryToPerform:(SEL)fp8 with:(id)fp12;

 @end
