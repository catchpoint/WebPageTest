//
//  GTMExceptionalInlines.h
//
//  Copyright 2008 Google Inc.
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
//  License for the specific language governing permissions and limitations under
//  the License.
//

#import <Foundation/Foundation.h>
#import "GTMDefines.h"
#if GTM_IPHONE_SDK
#import <CoreGraphics/CoreGraphics.h>
#endif //  GTM_IPHONE_SDK

// This file exists because when you have full warnings on you can run into
// troubles with functions that Apple has inlined that have structures or
// local variables defined in them.
// You only see this warning if you have -Wuninitialized turned on,
// and you will only see them in release mode. -Wno-unitialized turns them
// off, but you also lose all the good warnings that come with -Wuninitialized.
// If you have the inline versions of any of the functions below in a
// @syncronized, or @try block, you will get
// warning: variable 'r' might be clobbered by 'longjmp' or 'vfork'
// By moving this local vars "out of line" you fix the problem.
// These functions do nothing more than act as "out of line" calls to the
// functions they are masking to avoid the warning.
// If you run into others, feel free to add them.

// Please only use these to avoid the warning above. Use the Apple defined
// functions where possible.

FOUNDATION_EXPORT NSRange GTMNSMakeRange(NSUInteger loc, NSUInteger len);
FOUNDATION_EXPORT CFRange GTMCFRangeMake(NSUInteger loc, NSUInteger len);

FOUNDATION_EXPORT CGPoint GTMCGPointMake(CGFloat x, CGFloat y);
FOUNDATION_EXPORT CGSize GTMCGSizeMake(CGFloat width, CGFloat height);
FOUNDATION_EXPORT CGRect GTMCGRectMake(CGFloat x, CGFloat y,
                                       CGFloat width, CGFloat height);

#if !GTM_IPHONE_SDK
// iPhone does not have NSTypes defined, only CGTypes. So no NSRect, NSPoint etc.
FOUNDATION_EXPORT NSPoint GTMNSMakePoint(CGFloat x, CGFloat y);
FOUNDATION_EXPORT NSSize GTMNSMakeSize(CGFloat w, CGFloat h);
FOUNDATION_EXPORT NSRect GTMNSMakeRect(CGFloat x, CGFloat y,
                                       CGFloat w, CGFloat h);
#endif
