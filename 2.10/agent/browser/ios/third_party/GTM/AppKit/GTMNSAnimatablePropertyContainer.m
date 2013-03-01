//
//  GTMNSAnimatablePropertyContainer.m
//
//  Copyright (c) 2010 Google Inc. All rights reserved.
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

#import "GTMNSAnimatablePropertyContainer.h"

#if MAC_OS_X_VERSION_MAX_ALLOWED >= MAC_OS_X_VERSION_10_5

@interface GTMAnimatorStopper : NSObject {
 @private
  NSObject<NSAnimatablePropertyContainer> *container_;
}
@end

@implementation GTMAnimatorStopper
- (id)initWithAnimatablePropertyContainer:(NSObject<NSAnimatablePropertyContainer>*) container {
  if ((self = [super init])) {
    container_ = [container retain];
  }
  return self;
}

- (void)dealloc {
  [container_ release];
  [super dealloc];
}

- (NSMethodSignature *)methodSignatureForSelector:(SEL)aSelector {
  return [container_ methodSignatureForSelector:aSelector];
}

- (void)forwardInvocation:(NSInvocation *)anInvocation {
  SEL selector = [anInvocation selector];
  NSString *selectorName = NSStringFromSelector(selector);

  // NSWindow animator handles setFrame:display: which is an odd case
  // for animator. All other methods take just a key value, so we convert
  // this to it's equivalent key value.
  if ([selectorName isEqual:@"setFrame:display:"]) {
    selectorName = @"setFrame:";
  }

  // Check to make sure our selector is valid (starts with set and has a
  // single : at the end.
  NSRange colonRange = [selectorName rangeOfString:@":"];
  NSUInteger selectorLength = [selectorName length];
  if ([selectorName hasPrefix:@"set"]
      && colonRange.location == selectorLength - 1
      && selectorLength > 4) {
    // transform our selector into a keyValue by removing the set
    // and the colon and converting the first char down to lowercase.
    NSString *keyValue = [selectorName substringFromIndex:3];
    NSString *firstChar = [[keyValue substringToIndex:1] lowercaseString];
    NSRange rest = NSMakeRange(1, [keyValue length] - 2);
    NSString *restOfKey = [keyValue substringWithRange:rest];
    keyValue = [firstChar stringByAppendingString:restOfKey];

    // Save a copy of our old animations.
    NSDictionary *oldAnimations
      = [[[container_ animations] copy] autorelease];

    // For frame the animator doesn't actually animate the rect but gets
    // animators for the size and the origin independently. In case this changes
    // in the future (similar to bounds), we will stop the animations for the
    // frame as well as the frameSize and frameOrigin.
    NSDictionary *animations = nil;
    NSNull *null = [NSNull null];
    if ([keyValue isEqual:@"frame"]) {
      animations = [NSDictionary dictionaryWithObjectsAndKeys:
                    null, @"frame",
                    null, @"frameSize",
                    null, @"frameOrigin", nil];
    } else {
      animations = [NSDictionary dictionaryWithObject:null forKey:keyValue];
    }

    // Set our animations to NULL which will force them to stop.
    [container_ setAnimations:animations];
    // Call our original invocation on our animator.
    [anInvocation setTarget:[container_ animator]];
    [anInvocation invoke];

    // Reset the animations.
    [container_ setAnimations:oldAnimations];
  } else {
    [self doesNotRecognizeSelector:selector];
  }
}

@end

@implementation NSView(GTMNSAnimatablePropertyContainer)

- (id)gtm_animatorStopper {
  return [[[GTMAnimatorStopper alloc] initWithAnimatablePropertyContainer:self]
          autorelease];
}

@end

@implementation NSWindow(GTMNSAnimatablePropertyContainer)

- (id)gtm_animatorStopper {
  return [[[GTMAnimatorStopper alloc] initWithAnimatablePropertyContainer:self]
          autorelease];
}

@end

#endif  // MAC_OS_X_VERSION_MAX_ALLOWED >= MAC_OS_X_VERSION_10_5
