//
//  GTMUIView+SubtreeDescription.m
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
#import "GTMUIView+SubtreeDescription.h"

#if DEBUG || INCLUDE_UIVIEW_SUBTREE_DESCRIPTION

static void AppendLabelFloat(NSMutableString *s, NSString *label, float f) {
  [s appendString:label];
  // Respects gcc warning about using == with floats.
  if (fabs(f - floor(f)) < 1.0e-8) { // Essentially integer.
    int d = f;
    // Respects gcc warning about casting floats to ints.
    [s appendFormat:@"%d", d];
  } else {
    [s appendFormat:@"%3.1f", f];
  }
}

static NSMutableString *SublayerDescriptionLine(CALayer *layer) {
  NSMutableString *result = [NSMutableString string];
  [result appendFormat:@"%@ %p {", [layer class], layer];
  CGRect frame = [layer frame];
  if (!CGRectIsEmpty(frame)) {
    AppendLabelFloat(result, @"x:", frame.origin.x);
    AppendLabelFloat(result, @" y:", frame.origin.y);
    AppendLabelFloat(result, @" w:", frame.size.width);
    AppendLabelFloat(result, @" h:", frame.size.height);
  }
  [result appendFormat:@"}"];
  if ([layer isHidden]) {
    [result appendString:@" hid"];
  }
  [result appendString:@"\n"];
  return result;
}

// |sublayersDescription| has a guard so we'll only call this if it is safe
// to call.
static NSMutableString *SublayerDescriptionAtLevel(CALayer *layer, int level) {
  NSMutableString *result = [NSMutableString string];
  for (int i = 0; i < level; ++i) {
    [result appendString:@"  "];
  }
  [result appendString:SublayerDescriptionLine(layer)];
  // |sublayers| is defined in the QuartzCore framework, which isn't guaranteed
  // to be linked to this program. (So we don't include the header.)
  NSArray *layers = [layer performSelector:NSSelectorFromString(@"sublayers")];
  for (CALayer *l in layers) {
    [result appendString:SublayerDescriptionAtLevel(l, level+1)];
  }
  return result;
}

@implementation UIView (SubtreeDescription)

// TODO: Consider flagging things which might help in debugging:
// - alpha < 10%
// - origin not zero
// - non-opaque
// - transform if not identity
// - view not entirely within ancestor views
// - (possibly) tag==0
- (NSString *)gtm_subtreeDescriptionLine {
  NSMutableString *result = [NSMutableString string];
  [result appendFormat:@"%@ %p {", [self class], self];
  CGRect frame = [self frame];
  if (!CGRectIsEmpty(frame)) {
    AppendLabelFloat(result, @"x:", frame.origin.x);
    AppendLabelFloat(result, @" y:", frame.origin.y);
    AppendLabelFloat(result, @" w:", frame.size.width);
    AppendLabelFloat(result, @" h:", frame.size.height);
  }
  [result appendString:@"}"];
  if ([self isHidden]) {
    [result appendString:@" hid"];
  }

  if ([self respondsToSelector:@selector(myViewDescriptionLine)]) {
    NSString *customDescription =
      [self performSelector:@selector(myViewDescriptionLine)];
    if (customDescription != nil) {
      [result appendFormat:@" %@", customDescription];
    }
  }

  [result appendString:@"\n"];
  return result;
}

- (NSString *)gtm_subtreeDescriptionAtLevel:(int)level {
  NSMutableString *result = [NSMutableString string];
  for (int i = 0; i < level; ++i) {
    [result appendString:@"  "];
  }
  [result appendString:[self gtm_subtreeDescriptionLine]];
  for (UIView *v in [self subviews]) {
    [result appendString:[v gtm_subtreeDescriptionAtLevel:level+1]];
  }
  return result;
}

- (NSString *)subtreeDescription {
  NSMutableString *result =
    [[[self gtm_subtreeDescriptionLine] mutableCopy] autorelease];
  for (UIView *v in [self subviews]) {
    [result appendString:[v gtm_subtreeDescriptionAtLevel:1]];
  }
  return result;
}

// for debugging dump the layer hierarchy, frames and isHidden.
- (NSString *)sublayersDescription {
  CALayer *layer = [self layer];
  SEL sublayers = NSSelectorFromString(@"sublayers");
  if (![layer respondsToSelector:sublayers]) {
    return @"*** Sorry: This app is not linked with the QuartzCore framework.";
  }
  NSMutableString *result = SublayerDescriptionLine(layer);
  NSArray *layers = [layer performSelector:sublayers];
  for (CALayer *l in layers) {
    [result appendString:SublayerDescriptionAtLevel(l, 1)];
  }
  return result;
}

@end

#endif  // DEBUG


