//
//  GTMExceptionalInlinesTest.m
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

#import "GTMSenTestCase.h"
#import "GTMExceptionalInlines.h"

@interface GTMExceptionalInlinesTest : GTMTestCase
@end

@implementation GTMExceptionalInlinesTest
- (void)testExceptionalInlines {
  // Numbers chosen basically at random.
  NSUInteger loc = 5;
  NSUInteger len = 10;
  CGFloat x = 22.5;
  CGFloat y = 40.2;
  CGFloat h = 21.6;
  CGFloat w = 54.2;
  
  NSRange range1 = GTMNSMakeRange(loc, len);
  NSRange range2 = NSMakeRange(loc, len);
  STAssertTrue(NSEqualRanges(range1, range2), nil);
 
  CFRange cfrange1 = GTMCFRangeMake(loc, len);
  CFRange cfrange2 = CFRangeMake(loc, len);
  STAssertEquals(cfrange1.length, cfrange2.length, nil);
  STAssertEquals(cfrange1.location, cfrange2.location, nil);
  
  
  CGPoint cgpoint1 = GTMCGPointMake(x, y);
  CGPoint cgpoint2 = CGPointMake(x, y);
  STAssertTrue(CGPointEqualToPoint(cgpoint1, cgpoint2), nil);
  
  CGSize cgsize1 = GTMCGSizeMake(x, y);
  CGSize cgsize2 = CGSizeMake(x, y);
  STAssertTrue(CGSizeEqualToSize(cgsize1, cgsize2), nil);
  
  CGRect cgrect1 = GTMCGRectMake(x, y, w, h);
  CGRect cgrect2 = CGRectMake(x, y, w, h);
  STAssertTrue(CGRectEqualToRect(cgrect1, cgrect2), nil);
  
#if !GTM_IPHONE_SDK
  NSPoint point1 = GTMNSMakePoint(x, y);
  NSPoint point2 = NSMakePoint(x, y);
  STAssertTrue(NSEqualPoints(point1, point2), nil);
  
  NSSize size1 = GTMNSMakeSize(w, h);
  NSSize size2 = NSMakeSize(w, h);
  STAssertTrue(NSEqualSizes(size1, size2), nil);
  
  NSRect rect1 = GTMNSMakeRect(x, y, w, h);
  NSRect rect2 = NSMakeRect(x, y, w, h);
  STAssertTrue(NSEqualRects(rect1, rect2), nil);
#endif
}
@end
