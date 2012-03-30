//
//  GTMUIView+SubtreeDescription.h
//
//  Copyright 2009 Google Inc.
//
//  Licensed under the Apache License, Version 2.0 (the "License"); you may not
//  use this file except in compliance with the License.  You may obtain a copy
//  of the License at
//
//  http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
//  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
//  License for the specific language governing permissions and limitations
//  under the License.
//
#import <UIKit/UIKit.h>

// This entire file, and the corresponding .m is DEBUG only.
// But you can define INCLUDE_UIVIEW_SUBTREE_DESCRIPTION to no-zero to override.
#if DEBUG || INCLUDE_UIVIEW_SUBTREE_DESCRIPTION

// Example, in debugger, pause the program, then type:
// po [[[UIApplication sharedApplication] keyWindow] subtreeDescription]

@interface UIView (SubtreeDescription)

// Returns one line, without leading indent, but with a trailing newline,
// describing the view.
// If you define a |myViewDescriptionLine| method in your own UIView classes,
// this will append that result to its description.
- (NSString *)gtm_subtreeDescriptionLine;

// For debugging. Returns a nicely indented representation of this view's
// subview hierarchy, each with frame and isHidden.
- (NSString *)subtreeDescription;

// For debugging. Returns a nicely indented representation of this view's
// layer hierarchy, with frames and isHidden.
// Requires QuartzCore to be useful, but your app will still link without it.
// TODO: should there be an analog of myViewDescriptionLine for layers?
- (NSString *)sublayersDescription;

@end

@protocol GTMUIViewSubtreeDescription
// A UIView can implement this and it can add it's own custom description
// in gtm_subtreeDescriptionLine.
- (NSString *)myViewDescriptionLine;
@end

#endif  // DEBUG
