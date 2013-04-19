//
//  GTMUIKit+UnitTestingTest.m
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

#import <CoreGraphics/CoreGraphics.h>
#import "GTMUIKit+UnitTesting.h"
#import "GTMSenTestCase.h"

@interface GTMUIView_UnitTestingTest : SenTestCase <GTMUnitTestViewDrawer>
@end

@implementation GTMUIView_UnitTestingTest

- (void)testDrawing {
  GTMAssertDrawingEqualToFile(self, 
                              CGSizeMake(200,200), 
                              @"GTMUIViewUnitTestingTest",
                              [UIApplication sharedApplication],
                              nil);
}

- (void)testState {
  UIView *view = [[[UIView alloc] initWithFrame:CGRectMake(0, 0, 50, 50)] autorelease];
  UIView *subview = [[[UIView alloc] initWithFrame:CGRectMake(0, 0, 50, 50)] autorelease];
  [view addSubview:subview];
  GTMAssertObjectStateEqualToStateNamed(view, @"GTMUIViewUnitTestingTest", nil);
}

- (void)testUIImage {
  NSString* name = @"GTMUIViewUnitTestingTest";
  UIImage* image =
      [UIImage imageNamed:[name stringByAppendingPathExtension:@"png"]];
  GTMAssertObjectImageEqualToImageNamed(image, name, nil);
}

- (void)gtm_unitTestViewDrawRect:(CGRect)rect contextInfo:(void*)contextInfo {
  UIApplication *app = [UIApplication sharedApplication];
  STAssertEqualObjects(app,
                       contextInfo,
                       @"Should be a UIApplication");
  CGPoint center = CGPointMake(CGRectGetMidX(rect),
                               CGRectGetMidY(rect));
  rect = CGRectMake(center.x - 50, center.y - 50, 100, 100);
  CGContextRef context = UIGraphicsGetCurrentContext();
  CGContextAddEllipseInRect(context, rect);
  CGContextSetLineWidth(context, 5);
  [[UIColor redColor] set];
  CGContextStrokePath(context);
}

@end
