//
//  GTMUIImage+ResizeTest.m
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
//  License for the specific language governing permissions and limitations under
//  the License.
//

#import "GTMNSObject+UnitTesting.h"
#import "GTMSenTestCase.h"
#import "GTMUIImage+Resize.h"

#define GTMUIImageResizeAssertImageEqual(imageObject, imageSuffix) \
    GTMAssertObjectImageEqualToImageNamed(imageObject, \
                                          @"GTMUIImage+Resize_" imageSuffix,\
                                          @"Resized image mismatched.")

@interface GTMUIImage_ResizeTest : SenTestCase
@end

@implementation GTMUIImage_ResizeTest

- (void)testNilImage {
  UIImage *image = [[UIImage alloc] init];
  UIImage *actual = [image gtm_imageByResizingToSize:CGSizeMake(100, 100)
                                 preserveAspectRatio:YES
                                           trimToFit:NO];
  STAssertNil(actual, @"Invalid inputs should return nil");
}

- (void)testInvalidInput {
  UIImage *actual;
  UIImage *image
      = [UIImage imageNamed:@"GTMUIImage+Resize_100x50.png"];
  actual = [image gtm_imageByResizingToSize:CGSizeZero
                        preserveAspectRatio:YES
                                  trimToFit:NO];
  STAssertNil(actual, @"CGSizeZero resize should be ignored.");

  actual = [image gtm_imageByResizingToSize:CGSizeMake(0.1, 0.1)
                        preserveAspectRatio:YES
                                  trimToFit:NO];
  STAssertNil(actual, @"Invalid size should be ignored.");

  actual = [image gtm_imageByResizingToSize:CGSizeMake(-100, -100)
                        preserveAspectRatio:YES
                                  trimToFit:NO];
  STAssertNil(actual, @"Invalid size should be ignored.");
}

- (void)testImageByResizingWithoutPreservingAspectRatio {
  UIImage *actual = nil;
  // Square image.
  UIImage *originalImage
      = [UIImage imageNamed:@"GTMUIImage+Resize_100x100.png"];
  STAssertNotNil(originalImage, @"Unable to read image.");

  // Resize with same aspect ratio.
  CGSize size50x50 = CGSizeMake(50, 50);
  actual = [originalImage gtm_imageByResizingToSize:size50x50
                                preserveAspectRatio:NO
                                          trimToFit:NO];
  STAssertTrue(CGSizeEqualToSize([actual size], size50x50),
               @"Resized image should equal size: %@ actual: %@",
               NSStringFromCGSize(size50x50),
               NSStringFromCGSize([actual size]));
  GTMUIImageResizeAssertImageEqual(actual, @"100x100_to_50x50");

  // Resize with different aspect ratio
  CGSize size60x40 = CGSizeMake(60, 40);
  actual = [originalImage gtm_imageByResizingToSize:size60x40
                                preserveAspectRatio:NO
                                          trimToFit:NO];
  STAssertTrue(CGSizeEqualToSize([actual size], size60x40),
               @"Resized image should equal size: %@ actual: %@",
               NSStringFromCGSize(size60x40),
               NSStringFromCGSize([actual size]));
  GTMUIImageResizeAssertImageEqual(actual, @"100x100_to_60x40");

  CGSize size40x60 = CGSizeMake(40, 60);
  actual = [originalImage gtm_imageByResizingToSize:size40x60
                                preserveAspectRatio:NO
                                          trimToFit:NO];
  STAssertTrue(CGSizeEqualToSize([actual size], size40x60),
               @"Resized image should equal size: %@ actual: %@",
               NSStringFromCGSize(size40x60),
               NSStringFromCGSize([actual size]));
  GTMUIImageResizeAssertImageEqual(actual, @"100x100_to_40x60");
}

- (void)testImageByResizingPreservingAspectRatioWithoutClip {
  UIImage *actual = nil;
  UIImage *landscapeImage =
      [UIImage imageNamed:@"GTMUIImage+Resize_100x50.png"];
  STAssertNotNil(landscapeImage, @"Unable to read image.");

  // Landscape resize to 50x50, but clipped to 50x25.
  CGSize size50x50 = CGSizeMake(50, 50);
  CGSize expected50x25 = CGSizeMake(50, 25);
  actual = [landscapeImage gtm_imageByResizingToSize:size50x50
                                 preserveAspectRatio:YES
                                           trimToFit:NO];
  STAssertTrue(CGSizeEqualToSize([actual size], expected50x25),
               @"Resized image should equal size: %@ actual: %@",
               NSStringFromCGSize(expected50x25),
               NSStringFromCGSize([actual size]));
  GTMUIImageResizeAssertImageEqual(actual, @"100x50_to_50x50_noclip");

  // Landscape resize to 60x40, but clipped to 60x30.
  CGSize size60x40 = CGSizeMake(60, 40);
  CGSize expected60x30 = CGSizeMake(60, 30);

  actual = [landscapeImage gtm_imageByResizingToSize:size60x40
                                 preserveAspectRatio:YES
                                           trimToFit:NO];
  STAssertTrue(CGSizeEqualToSize([actual size], expected60x30),
               @"Resized image should equal size: %@ actual: %@",
               NSStringFromCGSize(expected60x30),
               NSStringFromCGSize([actual size]));
  GTMUIImageResizeAssertImageEqual(actual, @"100x50_to_60x40_noclip");

  // Landscape resize to 40x60, but clipped to 40x20.
  CGSize expected40x20 = CGSizeMake(40, 20);
  CGSize size40x60 = CGSizeMake(40, 60);
  actual = [landscapeImage gtm_imageByResizingToSize:size40x60
                                 preserveAspectRatio:YES
                                           trimToFit:NO];
  STAssertTrue(CGSizeEqualToSize([actual size], expected40x20),
               @"Resized image should equal size: %@ actual: %@",
               NSStringFromCGSize(expected40x20),
               NSStringFromCGSize([actual size]));
  GTMUIImageResizeAssertImageEqual(actual, @"100x50_to_40x60_noclip");

  // Portrait Image
  UIImage *portraitImage =
      [UIImage imageNamed:@"GTMUIImage+Resize_50x100.png"];

  // Portrait resize to 50x50, but clipped to 25x50.
  CGSize expected25x50 = CGSizeMake(25, 50);
  actual = [portraitImage gtm_imageByResizingToSize:size50x50
                                preserveAspectRatio:YES
                                          trimToFit:NO];
  STAssertTrue(CGSizeEqualToSize([actual size], expected25x50),
               @"Resized image should equal size: %@ actual: %@",
               NSStringFromCGSize(expected25x50),
               NSStringFromCGSize([actual size]));
  GTMUIImageResizeAssertImageEqual(actual, @"50x100_to_50x50_noclip");

  // Portrait resize to 60x40, but clipped to 20x40.
  CGSize expected20x40 = CGSizeMake(20, 40);
  actual = [portraitImage gtm_imageByResizingToSize:size60x40
                                preserveAspectRatio:YES
                                          trimToFit:NO];
  STAssertTrue(CGSizeEqualToSize([actual size], expected20x40),
               @"Resized image should equal size: %@ actual: %@",
               NSStringFromCGSize(expected20x40),
               NSStringFromCGSize([actual size]));
  GTMUIImageResizeAssertImageEqual(actual, @"50x100_to_60x40_noclip");

  // Portrait resize to 40x60, but clipped to 30x60.
  CGSize expected30x60 = CGSizeMake(30, 60);
  actual = [portraitImage gtm_imageByResizingToSize:size40x60
                                preserveAspectRatio:YES
                                          trimToFit:NO];
  STAssertTrue(CGSizeEqualToSize([actual size], expected30x60),
               @"Resized image should equal size: %@ actual: %@",
               NSStringFromCGSize(expected30x60),
               NSStringFromCGSize([actual size]));
  GTMUIImageResizeAssertImageEqual(actual, @"50x100_to_40x60_noclip");
}

- (void)testImageByResizingPreservingAspectRatioWithClip {
  UIImage *actual = nil;
  UIImage *landscapeImage =
      [UIImage imageNamed:@"GTMUIImage+Resize_100x50.png"];
  STAssertNotNil(landscapeImage, @"Unable to read image.");

  // Landscape resize to 50x50
  CGSize size50x50 = CGSizeMake(50, 50);
  actual = [landscapeImage gtm_imageByResizingToSize:size50x50
                                 preserveAspectRatio:YES
                                           trimToFit:YES];
  STAssertTrue(CGSizeEqualToSize([actual size], size50x50),
               @"Resized image should equal size: %@ actual: %@",
               NSStringFromCGSize(size50x50),
               NSStringFromCGSize([actual size]));
  GTMUIImageResizeAssertImageEqual(actual, @"100x50_to_50x50_clip");

  // Landscape resize to 60x40
  CGSize size60x40 = CGSizeMake(60, 40);
  actual = [landscapeImage gtm_imageByResizingToSize:size60x40
                                 preserveAspectRatio:YES
                                           trimToFit:YES];
  STAssertTrue(CGSizeEqualToSize([actual size], size60x40),
               @"Resized image should equal size: %@ actual: %@",
               NSStringFromCGSize(size60x40),
               NSStringFromCGSize([actual size]));
  GTMUIImageResizeAssertImageEqual(actual, @"100x50_to_60x40_clip");

  // Landscape resize to 40x60
  CGSize size40x60 = CGSizeMake(40, 60);
  actual = [landscapeImage gtm_imageByResizingToSize:size40x60
                                 preserveAspectRatio:YES
                                           trimToFit:YES];
  STAssertTrue(CGSizeEqualToSize([actual size], size40x60),
               @"Resized image should equal size: %@ actual: %@",
               NSStringFromCGSize(size40x60),
               NSStringFromCGSize([actual size]));
  GTMUIImageResizeAssertImageEqual(actual, @"100x50_to_40x60_clip");

  // Portrait Image.
  UIImage *portraitImage =
      [UIImage imageNamed:@"GTMUIImage+Resize_50x100.png"];

  // Portrait resize to 50x50
  actual = [portraitImage gtm_imageByResizingToSize:size50x50
                                  preserveAspectRatio:YES
                                             trimToFit:YES];
  STAssertTrue(CGSizeEqualToSize([actual size], size50x50),
               @"Resized image should equal size: %@ actual: %@",
               NSStringFromCGSize(size50x50),
               NSStringFromCGSize([actual size]));
  GTMUIImageResizeAssertImageEqual(actual, @"50x100_to_50x50_clip");

  // Portrait resize to 60x40
  actual = [portraitImage gtm_imageByResizingToSize:size60x40
                                preserveAspectRatio:YES
                                          trimToFit:YES];
  STAssertTrue(CGSizeEqualToSize([actual size], size60x40),
               @"Resized image should equal size: %@ actual: %@",
               NSStringFromCGSize(size60x40),
               NSStringFromCGSize([actual size]));
  GTMUIImageResizeAssertImageEqual(actual, @"50x100_to_60x40_clip");

  // Portrait resize to 40x60.
  actual = [portraitImage gtm_imageByResizingToSize:size40x60
                                preserveAspectRatio:YES
                                          trimToFit:YES];
  STAssertTrue(CGSizeEqualToSize([actual size], size40x60),
               @"Resized image should equal size: %@ actual: %@",
               NSStringFromCGSize(size40x60),
               NSStringFromCGSize([actual size]));
  GTMUIImageResizeAssertImageEqual(actual, @"50x100_to_40x60_clip");
}

- (void)testImageByRotating {
  UIImage *actual = nil;
  UIImage *landscapeImage =
      [UIImage imageNamed:@"GTMUIImage+Resize_100x50.png"];
  STAssertNotNil(landscapeImage, @"Unable to read image.");

  // Rotate 90 degrees.
  actual = [landscapeImage gtm_imageByRotating:UIImageOrientationRight];
  GTMUIImageResizeAssertImageEqual(actual, @"50x100");

  // Rotate 180 degrees.
  actual = [landscapeImage gtm_imageByRotating:UIImageOrientationDown];
  GTMUIImageResizeAssertImageEqual(actual,
                                   @"100x50_flipped");


  // Rotate 270 degrees.
  actual = [landscapeImage gtm_imageByRotating:UIImageOrientationLeft];
  GTMUIImageResizeAssertImageEqual(actual,
                                   @"50x100_flipped");

  // Rotate 360 degrees.
  actual = [landscapeImage gtm_imageByRotating:UIImageOrientationUp];
  GTMUIImageResizeAssertImageEqual(actual, @"100x50");
}

@end
