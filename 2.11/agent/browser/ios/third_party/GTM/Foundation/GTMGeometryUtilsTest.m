//
//  GTMGeometryUtilsTest.m
//
//  Copyright 2006-2008 Google Inc.
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
#import "GTMGeometryUtils.h"

@interface GTMGeometryUtilsTest : GTMTestCase
@end

@implementation GTMGeometryUtilsTest

#if !GTM_IPHONE_SDK
- (void)testGTMCGPointToNSPoint {
  CGPoint cgPoint = CGPointMake(15.1,6.2);
  NSPoint nsPoint = GTMCGPointToNSPoint(cgPoint);
  STAssertTrue(CGPointEqualToPoint(*(CGPoint*)&nsPoint, cgPoint), nil);
}

- (void)testGTMNSPointToCGPoint {
  NSPoint nsPoint = NSMakePoint(10.2,1.5);
  CGPoint cgPoint = GTMNSPointToCGPoint(nsPoint);
  STAssertTrue(CGPointEqualToPoint(cgPoint, *(CGPoint*)&nsPoint), nil);
}

- (void)testGTMCGRectToNSRect {
  CGRect cgRect = CGRectMake(1.5,2.4,10.6,11.7);
  NSRect nsRect = GTMCGRectToNSRect(cgRect);
  STAssertTrue(CGRectEqualToRect(cgRect, *(CGRect*)&nsRect), nil);
}

- (void)testGTMNSRectToCGRect {
  NSRect nsRect = NSMakeRect(4.6,3.2,22.1,45.0);
  CGRect cgRect = GTMNSRectToCGRect(nsRect);
  STAssertTrue(CGRectEqualToRect(cgRect, *(CGRect*)&nsRect), nil);
}

- (void)testGTMCGSizeToNSSize {
  CGSize cgSize = {5,6};
  NSSize nsSize = GTMCGSizeToNSSize(cgSize);
  STAssertTrue(CGSizeEqualToSize(cgSize, *(CGSize*)&nsSize), nil);
}

- (void)testGTMNSSizeToCGSize {
  NSSize nsSize = {22,15};
  CGSize cgSize = GTMNSSizeToCGSize(nsSize);
  STAssertTrue(CGSizeEqualToSize(cgSize, *(CGSize*)&nsSize), nil);
}

- (void)testGTMNSPointsOnRect {
  NSRect rect = NSMakeRect(0, 0, 2, 2);
  
  NSPoint point = GTMNSMidMinX(rect);
  STAssertEqualsWithAccuracy(point.y, (CGFloat)1.0, (CGFloat)0.01, nil);
  STAssertEqualsWithAccuracy(point.x, (CGFloat)0.0, (CGFloat)0.01, nil);
  
  point = GTMNSMidMaxX(rect);
  STAssertEqualsWithAccuracy(point.y, (CGFloat)1.0, (CGFloat)0.01, nil);
  STAssertEqualsWithAccuracy(point.x, (CGFloat)2.0, (CGFloat)0.01, nil);
  
  point = GTMNSMidMaxY(rect);
  STAssertEqualsWithAccuracy(point.y, (CGFloat)2.0, (CGFloat)0.01, nil);
  STAssertEqualsWithAccuracy(point.x, (CGFloat)1.0, (CGFloat)0.01, nil);
  
  point = GTMNSMidMinY(rect);
  STAssertEqualsWithAccuracy(point.y, (CGFloat)0.0, (CGFloat)0.01, nil);
  STAssertEqualsWithAccuracy(point.x, (CGFloat)1.0, (CGFloat)0.01, nil);

  point = GTMNSCenter(rect);
  STAssertEqualsWithAccuracy(point.y, (CGFloat)1.0, (CGFloat)0.01, nil);
  STAssertEqualsWithAccuracy(point.x, (CGFloat)1.0, (CGFloat)0.01, nil);
}

- (void)testGTMNSRectSize {
  NSSize nsSize = GTMNSRectSize(NSMakeRect(1, 1, 10, 5));
  STAssertEqualsWithAccuracy(nsSize.width, (CGFloat)10.0, (CGFloat)0.01, nil);
  STAssertEqualsWithAccuracy(nsSize.height, (CGFloat)5.0, (CGFloat)0.01, nil);
}

- (void)testGTMNSRectOfSize {
  NSRect outRect = GTMNSRectOfSize(NSMakeSize(10, 5));
  NSRect expectedRect = NSMakeRect(0, 0, 10, 5);
  STAssertEquals(outRect, expectedRect, nil);
}

- (void)testGTMNSAlignRectangles {
  typedef struct  {
    NSPoint expectedOrigin;
    GTMRectAlignment alignment;
  } TestData;
  
  TestData data[] = {
    { {1,2}, GTMRectAlignTop },
    { {0,2}, GTMRectAlignTopLeft },
    { {2,2}, GTMRectAlignTopRight },
    { {0,1}, GTMRectAlignLeft },
    { {1,0}, GTMRectAlignBottom },
    { {0,0}, GTMRectAlignBottomLeft },
    { {2,0}, GTMRectAlignBottomRight },
    { {2,1}, GTMRectAlignRight },
    { {1,1}, GTMRectAlignCenter },
  };
  
  NSRect rect1 = NSMakeRect(0, 0, 4, 4);
  NSRect rect2 = NSMakeRect(0, 0, 2, 2);
  
  NSRect expectedRect;
  expectedRect.size = NSMakeSize(2, 2);
  
  for (size_t i = 0; i < sizeof(data) / sizeof(TestData); i++) {
    expectedRect.origin = data[i].expectedOrigin;
    NSRect outRect = GTMNSAlignRectangles(rect2, rect1, data[i].alignment);
    STAssertEquals(outRect, expectedRect, nil);
  }
}

- (void)testGTMNSScaleRectangleToSize {
  NSRect rect = NSMakeRect(0.0f, 0.0f, 10.0f, 10.0f);
  typedef struct {
    NSSize size_;
    NSSize newSize_;
  } Test;
  Test tests[] = {
    { { 5.0, 10.0 }, { 5.0, 5.0 } },
    { { 10.0, 5.0 }, { 5.0, 5.0 } },
    { { 10.0, 10.0 }, { 10.0, 10.0 } },
    { { 11.0, 11.0, }, { 10.0, 10.0 } },
    { { 5.0, 2.0 }, { 2.0, 2.0 } },
    { { 2.0, 5.0 }, { 2.0, 2.0 } },
    { { 2.0, 2.0 }, { 2.0, 2.0 } },
    { { 0.0, 10.0 }, { 0.0, 0.0 } }
  };
  
  for (size_t i = 0; i < sizeof(tests) / sizeof(Test); ++i) {
    NSRect result = GTMNSScaleRectangleToSize(rect, tests[i].size_,
                                              GTMScaleProportionally);
    STAssertEquals(result, GTMNSRectOfSize(tests[i].newSize_), @"failed on test %zd", i);
  }
  
  NSRect result = GTMNSScaleRectangleToSize(NSZeroRect, tests[0].size_,
                                            GTMScaleProportionally);
  STAssertEquals(result, NSZeroRect, nil);
  
  result = GTMNSScaleRectangleToSize(rect, tests[0].size_,
                                     GTMScaleToFit);
  STAssertEquals(result, GTMNSRectOfSize(tests[0].size_), nil);
  
  result = GTMNSScaleRectangleToSize(rect, tests[0].size_,
                                     GTMScaleNone);
  STAssertEquals(result, rect, nil);
}


- (void)testGTMNSScaleRectToRect {
  typedef struct  {
    NSRect expectedRect;
    GTMScaling scaling;
    GTMRectAlignment alignment;
  } TestData;
  
  NSRect rect1 = NSMakeRect(0, 0, 4, 4);
  NSRect rect2 = NSMakeRect(0, 0, 2, 1);
  
  TestData data[] = {
    { NSMakeRect(2, 3, 2, 1), GTMScaleToFillProportionally, GTMRectAlignTopRight },
    { NSMakeRect(0, 0, 4, 4), GTMScaleToFit, GTMRectAlignCenter },
    { NSMakeRect(1, 1.5, 2, 1), GTMScaleNone, GTMRectAlignCenter },
    { NSMakeRect(1, 0, 2, 1), GTMScaleProportionally, GTMRectAlignBottom },
  };
  
  for (size_t i = 0; i < sizeof(data) / sizeof(TestData); i++) {
    NSRect outRect = GTMNSScaleRectToRect(rect2, rect1, data[i].scaling, data[i].alignment);
    STAssertEquals(outRect, data[i].expectedRect, nil);
  }
}


- (void)testGTMNSDistanceBetweenPoints {
  NSPoint pt1 = NSMakePoint(0, 0);
  NSPoint pt2 = NSMakePoint(3, 4);
  STAssertEquals(GTMNSDistanceBetweenPoints(pt1, pt2), (CGFloat)5.0, nil);
  STAssertEquals(GTMNSDistanceBetweenPoints(pt2, pt1), (CGFloat)5.0, nil);
  pt1 = NSMakePoint(1, 1);
  pt2 = NSMakePoint(1, 1);
  STAssertEquals(GTMNSDistanceBetweenPoints(pt1, pt2), (CGFloat)0.0, nil);
}

- (void)testGTMNSRectScaling {
  NSRect rect = NSMakeRect(1.0f, 2.0f, 5.0f, 10.0f);
  NSRect rect2 = NSMakeRect((CGFloat)1.0, (CGFloat)2.0, (CGFloat)1.0, (CGFloat)12.0);
  STAssertEquals(GTMNSRectScale(rect, (CGFloat)0.2, (CGFloat)1.2), 
                 rect2, nil);
}

#endif //  !GTM_IPHONE_SDK

- (void)testGTMCGDistanceBetweenPoints {
  CGPoint pt1 = CGPointMake(0, 0);
  CGPoint pt2 = CGPointMake(3, 4);
  STAssertEquals(GTMCGDistanceBetweenPoints(pt1, pt2), (CGFloat)5.0, nil);
  STAssertEquals(GTMCGDistanceBetweenPoints(pt2, pt1), (CGFloat)5.0, nil);
  pt1 = CGPointMake(1, 1);
  pt2 = CGPointMake(1, 1);
  STAssertEquals(GTMCGDistanceBetweenPoints(pt1, pt2), (CGFloat)0.0, nil);
}

- (void)testGTMCGAlignRectangles {
  typedef struct  {
    CGPoint expectedOrigin;
    GTMRectAlignment alignment;
  } TestData;
  
  TestData data[] = {
    { {1,2}, GTMRectAlignTop },
    { {0,2}, GTMRectAlignTopLeft },
    { {2,2}, GTMRectAlignTopRight },
    { {0,1}, GTMRectAlignLeft },
    { {1,0}, GTMRectAlignBottom },
    { {0,0}, GTMRectAlignBottomLeft },
    { {2,0}, GTMRectAlignBottomRight },
    { {2,1}, GTMRectAlignRight },
    { {1,1}, GTMRectAlignCenter },
  };
    
  CGRect rect1 = CGRectMake(0, 0, 4, 4);
  CGRect rect2 = CGRectMake(0, 0, 2, 2);
  
  CGRect expectedRect;
  expectedRect.size = CGSizeMake(2, 2);
  
  for (size_t i = 0; i < sizeof(data) / sizeof(TestData); i++) {
    expectedRect.origin = data[i].expectedOrigin;
    CGRect outRect = GTMCGAlignRectangles(rect2, rect1, data[i].alignment);
    STAssertEquals(outRect, expectedRect, nil);
  }
}

- (void)testGTMCGPointsOnRect {
  CGRect rect = CGRectMake(0, 0, 2, 2);
  
  CGPoint point = GTMCGMidMinX(rect);
  STAssertEqualsWithAccuracy(point.y, (CGFloat)1.0, (CGFloat)0.01, nil);
  STAssertEqualsWithAccuracy(point.x, (CGFloat)0.0, (CGFloat)0.01, nil);
  
  point = GTMCGMidMaxX(rect);
  STAssertEqualsWithAccuracy(point.y, (CGFloat)1.0, (CGFloat)0.01, nil);
  STAssertEqualsWithAccuracy(point.x, (CGFloat)2.0, (CGFloat)0.01, nil);
  
  point = GTMCGMidMaxY(rect);
  STAssertEqualsWithAccuracy(point.y, (CGFloat)2.0, (CGFloat)0.01, nil);
  STAssertEqualsWithAccuracy(point.x, (CGFloat)1.0, (CGFloat)0.01, nil);
  
  point = GTMCGMidMinY(rect);
  STAssertEqualsWithAccuracy(point.y, (CGFloat)0.0, (CGFloat)0.01, nil);
  STAssertEqualsWithAccuracy(point.x, (CGFloat)1.0, (CGFloat)0.01, nil);
  
  point = GTMCGCenter(rect);
  STAssertEqualsWithAccuracy(point.y, (CGFloat)1.0, (CGFloat)0.01, nil);
  STAssertEqualsWithAccuracy(point.x, (CGFloat)1.0, (CGFloat)0.01, nil);
}

- (void)testGTMCGRectSize {
  CGSize cgSize = GTMCGRectSize(CGRectMake(1, 1, 10, 5));
  STAssertEqualsWithAccuracy(cgSize.width, (CGFloat)10.0, (CGFloat)0.01, nil);
  STAssertEqualsWithAccuracy(cgSize.height, (CGFloat)5.0, (CGFloat)0.01, nil);
}

- (void)testGTMCGRectOfSize {
  CGRect outRect = GTMCGRectOfSize(CGSizeMake(10, 5));
  CGRect expectedRect = CGRectMake(0, 0, 10, 5);
  STAssertEquals(outRect, expectedRect, nil);
}

- (void)testGTMCGRectScaling {
  CGRect rect = CGRectMake(1.0f, 2.0f, 5.0f, 10.0f);
  CGRect rect2 = CGRectMake((CGFloat)1.0, (CGFloat)2.0, (CGFloat)1.0, (CGFloat)12.0);
  STAssertEquals(GTMCGRectScale(rect, (CGFloat)0.2, (CGFloat)1.2), 
                 rect2, nil);
}

- (void)testGTMCGScaleRectangleToSize {
  CGRect rect = CGRectMake(0.0f, 0.0f, 10.0f, 10.0f);
  typedef struct {
    CGSize size_;
    CGSize newSize_;
  } Test;
  Test tests[] = {
    { { 5.0, 10.0 }, { 5.0, 5.0 } },
    { { 10.0, 5.0 }, { 5.0, 5.0 } },
    { { 10.0, 10.0 }, { 10.0, 10.0 } },
    { { 11.0, 11.0, }, { 10.0, 10.0 } },
    { { 5.0, 2.0 }, { 2.0, 2.0 } },
    { { 2.0, 5.0 }, { 2.0, 2.0 } },
    { { 2.0, 2.0 }, { 2.0, 2.0 } },
    { { 0.0, 10.0 }, { 0.0, 0.0 } }
  };
  
  for (size_t i = 0; i < sizeof(tests) / sizeof(Test); ++i) {
    CGRect result = GTMCGScaleRectangleToSize(rect, tests[i].size_,
                                              GTMScaleProportionally);
    STAssertEquals(result, GTMCGRectOfSize(tests[i].newSize_), @"failed on test %zd", i);
  }
  
  CGRect result = GTMCGScaleRectangleToSize(CGRectZero, tests[0].size_,
                                            GTMScaleProportionally);
  STAssertEquals(result, CGRectZero, nil);
  
  result = GTMCGScaleRectangleToSize(rect, tests[0].size_,
                                     GTMScaleToFit);
  STAssertEquals(result, GTMCGRectOfSize(tests[0].size_), nil);
  
  result = GTMCGScaleRectangleToSize(rect, tests[0].size_,
                                     GTMScaleNone);
  STAssertEquals(result, rect, nil);
}

@end
