//
//  GTMFadeTruncatingLabel.m
//
//  Copyright 2011 Google Inc.
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
#import "GTMFadeTruncatingLabel.h"

@interface GTMFadeTruncatingLabel ()
- (void)setup;
- (UIImage*)getLinearGradient:(CGRect)rect;
@end

@implementation GTMFadeTruncatingLabel

@synthesize truncateMode = truncateMode_;

- (void)setup {
  self.backgroundColor = [UIColor clearColor];
  truncateMode_ = GTMFadeTruncatingTail;
}

- (id)initWithFrame:(CGRect)frame {
  self = [super initWithFrame:frame];
  if (self) {
    [self setup];
  }
  return self;
}

- (void)awakeFromNib {
  [self setup];
}

// Draw fade gradient mask if text is wider than rect.
- (void)drawTextInRect:(CGRect)requestedRect {
  CGContextRef context = UIGraphicsGetCurrentContext();
  CGContextSaveGState(context);

  CGSize size = [self.text sizeWithFont:self.font];
  if (size.width > requestedRect.size.width) {
    UIImage* image = [self getLinearGradient:requestedRect];
    CGContextClipToMask(context, self.bounds, image.CGImage);
  }

  if (self.shadowColor) {
    CGContextSetFillColorWithColor(context, self.shadowColor.CGColor);
    CGRect shadowRect = CGRectOffset(requestedRect, self.shadowOffset.width,
                                     self.shadowOffset.height);
    [self.text drawInRect:shadowRect
                 withFont:self.font
            lineBreakMode:UILineBreakModeClip
                alignment:self.textAlignment];
  }

  CGContextSetFillColorWithColor(context, self.textColor.CGColor);
  [self.text drawInRect:requestedRect
               withFont:self.font
          lineBreakMode:UILineBreakModeClip
              alignment:self.textAlignment];

  CGContextRestoreGState(context);
}

// Create gradient opacity mask based on direction.
- (UIImage*)getLinearGradient:(CGRect)rect {
  // Create an opaque context.
  CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceGray();
  CGContextRef context = CGBitmapContextCreate (NULL,
                                                rect.size.width,
                                                rect.size.height,
                                                8,
                                                4*rect.size.width,
                                                colorSpace,
                                                kCGImageAlphaNone);

  // White background will mask opaque, black gradient will mask transparent.
  CGContextSetFillColorWithColor(context, [UIColor whiteColor].CGColor);
  CGContextFillRect(context, rect);

  // Create gradient from white to black.
  CGFloat locs[2] = { 0.0f, 1.0f };
  CGFloat components[4] = { 1.0f, 1.0f, 0.0f, 1.0f };
  CGGradientRef gradient =
      CGGradientCreateWithColorComponents(colorSpace, components, locs, 2);
  CGColorSpaceRelease(colorSpace);

  // Draw head and/or tail gradient.
  CGFloat fadeWidth = MIN(rect.size.height * 2, floor(rect.size.width / 4));
  CGFloat minX = CGRectGetMinX(rect);
  CGFloat maxX = CGRectGetMaxX(rect);
  if (self.truncateMode & GTMFadeTruncatingTail) {
    CGFloat startX = maxX - fadeWidth;
    CGPoint startPoint = CGPointMake(startX, CGRectGetMidY(rect));
    CGPoint endPoint = CGPointMake(maxX, CGRectGetMidY(rect));
    CGContextDrawLinearGradient(context, gradient, startPoint, endPoint, 0);
  }
  if (self.truncateMode & GTMFadeTruncatingHead) {
    CGFloat startX = minX + fadeWidth;
    CGPoint startPoint = CGPointMake(startX, CGRectGetMidY(rect));
    CGPoint endPoint = CGPointMake(minX, CGRectGetMidY(rect));
    CGContextDrawLinearGradient(context, gradient, startPoint, endPoint, 0);
  }
  CGGradientRelease(gradient);

  // Clean up, return image.
  CGImageRef ref = CGBitmapContextCreateImage(context);
  UIImage* image = [UIImage imageWithCGImage:ref];
  CGImageRelease(ref);
  CGContextRelease(context);
  return image;
}

@end
