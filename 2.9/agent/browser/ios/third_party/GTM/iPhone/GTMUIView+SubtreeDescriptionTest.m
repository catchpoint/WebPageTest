//
//  GTMUIView+SubtreeDescriptionTest.m
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

#import "GTMNSObject+UnitTesting.h"
#import "GTMSenTestCase.h"
#import "GTMUIView+SubtreeDescription.h"

#if !NDEBUG

@interface GTMUIView_SubtreeDescriptionTest : SenTestCase
@end

@implementation GTMUIView_SubtreeDescriptionTest

- (void)testSubtreeDescription {
  // Test a single, simple view.
  CGRect frame1 = CGRectMake(0, 0, 100, 200);
  UIView *view1 = [[[UIView alloc] initWithFrame:frame1] autorelease];
  NSString *actual = [view1 subtreeDescription];
  NSString *format1 = @"UIView %p {x:0 y:0 w:100 h:200}\n";
  NSString *expected = [NSString stringWithFormat:format1, view1];
  STAssertEqualObjects(actual, expected, @"a single, simple view failed");

  // Test a view with one child.
  CGRect frame2 = CGRectMake(2, 2, 102, 202);
  UIView *view2 = [[[UIView alloc] initWithFrame:frame2] autorelease];
  [view1 addSubview:view2];
  NSString *actual2 = [view1 subtreeDescription];
  NSString *format2 = @"UIView %p {x:0 y:0 w:100 h:200}\n"
      "  UIView %p {x:2 y:2 w:102 h:202}\n";
  NSString *expected2 = [NSString stringWithFormat:format2, view1, view2];
  STAssertEqualObjects(actual2, expected2, @"a view with one child");

  // Test a view with two children.
  CGRect frame3 = CGRectMake(3, 3, 103, 203);
  UIView *view3 = [[[UIView alloc] initWithFrame:frame3] autorelease];
  [view1 addSubview:view3];
  NSString *actual3 = [view1 subtreeDescription];
  NSString *format3 = @"UIView %p {x:0 y:0 w:100 h:200}\n"
      "  UIView %p {x:2 y:2 w:102 h:202}\n"
      "  UIView %p {x:3 y:3 w:103 h:203}\n";
  NSString *expected3 = [NSString stringWithFormat:format3,
    view1, view2, view3];
  STAssertEqualObjects(actual3, expected3, @"a view with two children");

  // Test a view with two children, one hidden.
  [view3 setHidden:YES];
  NSString *format4 = @"UIView %p {x:0 y:0 w:100 h:200}\n"
      "  UIView %p {x:2 y:2 w:102 h:202}\n"
      "  UIView %p {x:3 y:3 w:103 h:203} hid\n";
  NSString *actual4 = [view1 subtreeDescription];
  NSString *expected4 = [NSString stringWithFormat:format4,
    view1, view2, view3];
  STAssertEqualObjects(actual4, expected4, @"with two children, one hidden");
}

- (void)testSublayersDescription {
  // Test a single, simple layer.
  CGRect frame1 = CGRectMake(0, 0, 100, 200);
  UIView *view1 = [[[UIView alloc] initWithFrame:frame1] autorelease];
  NSString *actual = [view1 sublayersDescription];
  NSString *format1 = @"CALayer %p {x:0 y:0 w:100 h:200}\n";
  NSString *expected = [NSString stringWithFormat:format1, [view1 layer]];
  STAssertEqualObjects(actual, expected, @"a single, simple layer failed");

  // Test a layer with one child.
  CGRect frame2 = CGRectMake(2, 2, 102, 202);
  UIView *view2 = [[[UIView alloc] initWithFrame:frame2] autorelease];
  [view1 addSubview:view2];
  NSString *actual2 = [view1 sublayersDescription];
  NSString *format2 = @"CALayer %p {x:0 y:0 w:100 h:200}\n"
      "  CALayer %p {x:2 y:2 w:102 h:202}\n";
  NSString *expected2 = [NSString stringWithFormat:format2,
    [view1 layer], [view2 layer]];
  STAssertEqualObjects(actual2, expected2, @"a layer with one child");

  // Test a layer with two children.
  CGRect frame3 = CGRectMake(3, 3, 103, 203);
  UIView *view3 = [[[UIView alloc] initWithFrame:frame3] autorelease];
  [view1 addSubview:view3];
  NSString *actual3 = [view1 sublayersDescription];
  NSString *format3 = @"CALayer %p {x:0 y:0 w:100 h:200}\n"
      "  CALayer %p {x:2 y:2 w:102 h:202}\n"
      "  CALayer %p {x:3 y:3 w:103 h:203}\n";
  NSString *expected3 = [NSString stringWithFormat:format3,
    [view1 layer], [view2 layer], [view3 layer]];
  STAssertEqualObjects(actual3, expected3, @"a layer with two children");

  // Test a layer with two children, one hidden.
  [view3 setHidden:YES];
  NSString *format4 = @"CALayer %p {x:0 y:0 w:100 h:200}\n"
      "  CALayer %p {x:2 y:2 w:102 h:202}\n"
      "  CALayer %p {x:3 y:3 w:103 h:203} hid\n";
  NSString *actual4 = [view1 sublayersDescription];
  NSString *expected4 = [NSString stringWithFormat:format4,
    [view1 layer], [view2 layer], [view3 layer]];
  STAssertEqualObjects(actual4, expected4, @"with two children, one hidden");
}

@end

@interface UIMyTestView : UIView
- (NSString *)myViewDescriptionLine;
@end

@implementation UIMyTestView
- (NSString *)myViewDescriptionLine {
  NSString *result = [NSString stringWithFormat:@"alpha: %3.1f", [self alpha]];
  return result;
}
@end

@interface GTMUIView_SubtreeSubClassDescriptionTest : SenTestCase
@end

@implementation GTMUIView_SubtreeSubClassDescriptionTest
- (void)testSubtreeDescription {
  CGRect frame1 = CGRectMake(0, 0, 100, 200);
  UIView *view1 = [[[UIView alloc] initWithFrame:frame1] autorelease];

  // Test a view with one child.
  CGRect frame2 = CGRectMake(2, 2, 102, 202);
  UIView *view2 = [[[UIMyTestView alloc] initWithFrame:frame2] autorelease];
  [view1 addSubview:view2];
  NSString *actual2 = [view1 subtreeDescription];
  NSString *format2 = @"UIView %p {x:0 y:0 w:100 h:200}\n"
      "  UIMyTestView %p {x:2 y:2 w:102 h:202} alpha: 1.0\n";
  NSString *expected2 = [NSString stringWithFormat:format2, view1, view2];
  STAssertEqualObjects(actual2, expected2, @"a view with one subclassed child");
}
@end


#endif
