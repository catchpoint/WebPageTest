//
//  GTMExceptionalInlines.m
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

#import "GTMExceptionalInlines.h"

NSRange GTMNSMakeRange(NSUInteger loc, NSUInteger len) {
  return NSMakeRange(loc, len);
}

CFRange GTMCFRangeMake(NSUInteger loc, NSUInteger len) {
  return CFRangeMake(loc, len);
}

CGPoint GTMCGPointMake(CGFloat x, CGFloat y) {
  return CGPointMake(x, y);
}

CGSize GTMCGSizeMake(CGFloat width, CGFloat height) {
  return CGSizeMake(width, height);
}

CGRect GTMCGRectMake(CGFloat x, CGFloat y, CGFloat width, CGFloat height) {
  return CGRectMake(x, y, width, height);
}

#if !GTM_IPHONE_SDK
// iPhone does not have NSTypes defined, only CGTypes. So no NSRect, NSPoint etc.

NSPoint GTMNSMakePoint(CGFloat x, CGFloat y) {
  return NSMakePoint(x, y);
}

NSSize GTMNSMakeSize(CGFloat w, CGFloat h) {
  return NSMakeSize(w, h);
}

NSRect GTMNSMakeRect(CGFloat x, CGFloat y, CGFloat w, CGFloat h) {
  return NSMakeRect(x, y, w, h);
}

#endif
