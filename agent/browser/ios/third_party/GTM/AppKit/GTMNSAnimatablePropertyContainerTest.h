//
//  GTMNSAnimatablePropertyContainerTest.h
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

#import "GTMSenTestCase.h"
#import <AppKit/AppKit.h>

#if MAC_OS_X_VERSION_MAX_ALLOWED >= MAC_OS_X_VERSION_10_5

@class GTMUnitTestingBooleanRunLoopContext;

@interface GTMNSAnimatablePropertyContainerWindow : NSWindow
@end

@interface GTMNSAnimatablePropertyContainerWindowBox : NSBox

- (void)set:(NSInteger)value;

@end

@interface GTMNSAnimatablePropertyContainerWindowController : NSWindowController {
 @private
  IBOutlet NSBox *nonLayerBox_;
  IBOutlet NSBox *layerBox_;
}

@property (readonly, retain, nonatomic) NSBox *nonLayerBox;
@property (readonly, retain, nonatomic) NSBox *layerBox;

@end

@interface GTMNSAnimatablePropertyContainerTest : GTMTestCase {
 @private
  GTMNSAnimatablePropertyContainerWindowController *windowController_;
  GTMUnitTestingBooleanRunLoopContext *timerCalled_;
}
@end

#endif  // MAC_OS_X_VERSION_MAX_ALLOWED >= MAC_OS_X_VERSION_10_5
