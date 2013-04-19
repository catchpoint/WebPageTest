//
//  GTMUILocalizerTest.m
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


#import "GTMSenTestCase.h"
#import "GTMUILocalizerTest.h"
#import "GTMNSObject+UnitTesting.h"
#import "GTMUILocalizer.h"

@interface GTMUILocalizerTest : GTMTestCase
@end

@implementation GTMUILocalizerTest
// Utility method to verify that all the options for |binding| on |object| have
// been localized.
- (void)verifyBinding:(NSString *)binding forObject:(id)object {
  NSDictionary *bindingInfo 
    = [object infoForBinding:binding];
  STAssertNotNil(bindingInfo, 
                 @"Can't get binding info for %@ from %@.\nExposed bindings: %@",
                 binding, object, [object exposedBindings]);
  NSDictionary *bindingOptions = [bindingInfo objectForKey:NSOptionsKey];
  STAssertNotNil(bindingOptions, nil);
  NSString *key = nil;
  GTM_FOREACH_KEY(key, bindingOptions) {
    id value = [bindingOptions objectForKey:key];
    if ([value isKindOfClass:[NSString class]]) {
      STAssertFalse([value hasPrefix:@"^"], 
                    @"Binding option %@ not localized. Has value %@.", 
                    key, value);
    }
  }  
}

- (void)testWindowLocalization {
  GTMUILocalizerTestWindowController *controller 
    = [[GTMUILocalizerTestWindowController alloc] init];
  NSWindow *window = [controller window];
  STAssertNotNil(window, nil);
  GTMAssertObjectStateEqualToStateNamed(window,
                                        @"GTMUILocalizerWindow1State", nil);
  
  NSBundle *bundle = [NSBundle bundleForClass:[self class]];
  GTMUILocalizer *localizer = [[GTMUILocalizer alloc] initWithBundle:bundle];
  window = [controller otherWindow];
  STAssertNotNil(window, nil);
  [localizer localizeObject:window recursively:YES];
  GTMAssertObjectStateEqualToStateNamed(window, 
                                        @"GTMUILocalizerWindow2State", nil);
  window = [controller anotherWindow];
  STAssertNotNil(window, nil);
  [localizer localizeObject:window recursively:YES];
  GTMAssertObjectStateEqualToStateNamed(window, 
                                        @"GTMUILocalizerWindow3State", nil);
  NSMenu *menu = [controller otherMenu];
  STAssertNotNil(menu, nil);
  [localizer localizeObject:menu recursively:YES];
  GTMAssertObjectStateEqualToStateNamed(menu, 
                                        @"GTMUILocalizerMenuState", nil);
  
  // Test binding localization.
  NSTextField *textField = [controller bindingsTextField];
  STAssertNotNil(textField, nil);
  NSString *displayPatternValue1Binding 
    = [NSString stringWithFormat:@"%@1", NSDisplayPatternValueBinding];  
  [self verifyBinding:displayPatternValue1Binding forObject:textField];
  
  NSSearchField *searchField = [controller bindingsSearchField];
  STAssertNotNil(searchField, nil);
  [self verifyBinding:NSPredicateBinding forObject:searchField];
  
  [localizer release];
  [controller release];
}

#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
- (void)testViewLocalization {
  GTMUILocalizerTestViewController *controller 
    = [[GTMUILocalizerTestViewController alloc] init];
  NSView *view = [controller view];
  STAssertNotNil(view, nil);
  GTMAssertObjectStateEqualToStateNamed(view, 
                                        @"GTMUILocalizerView1State", nil);
  
  NSBundle *bundle = [NSBundle bundleForClass:[self class]];
  GTMUILocalizer *localizer = [[GTMUILocalizer alloc] initWithBundle:bundle];
  view = [controller otherView];
  STAssertNotNil(view, nil);
  [localizer localizeObject:view recursively:YES];
  GTMAssertObjectStateEqualToStateNamed(view, @"GTMUILocalizerView2State", nil);
  [localizer release];
  [controller release];
}
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
@end

@implementation GTMUILocalizerTestWindowController
- (id)init {
#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
  return [self initWithWindowNibName:@"GTMUILocalizerTestWindow"];
#else
  return [self initWithWindowNibName:@"GTMUILocalizerTestWindow_10_4"];
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
}

- (NSWindow *)otherWindow {
  return otherWindow_;
}

- (NSWindow *)anotherWindow {
  return anotherWindow_;
}

- (NSMenu *)otherMenu {
  return otherMenu_;
}

- (NSTextField *)bindingsTextField {
  return bindingsTextField_;
}

- (NSSearchField *)bindingsSearchField {
  return bindingsSearchField_;
}
@end

#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
@implementation GTMUILocalizerTestViewController
- (id)init {
  NSBundle *bundle = [NSBundle bundleForClass:[self class]];
  return [self initWithNibName:@"GTMUILocalizerTestView" bundle:bundle];
}

- (NSView *)otherView {
  return otherView_;
}
@end
#endif
