//
//  GTMUILocalizerTest.h
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

#import <Cocoa/Cocoa.h>
#import "GTMDefines.h"

@interface GTMUILocalizerTestWindowController : NSWindowController {
  IBOutlet NSWindow *otherWindow_;
  IBOutlet NSWindow *anotherWindow_;
  IBOutlet NSMenu *otherMenu_;
  IBOutlet NSTextField *bindingsTextField_;
  IBOutlet NSSearchField *bindingsSearchField_;
}
- (NSWindow *)otherWindow;
- (NSWindow *)anotherWindow;
- (NSMenu *)otherMenu;
- (NSTextField *)bindingsTextField;
- (NSSearchField *)bindingsSearchField;
@end

#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
@interface GTMUILocalizerTestViewController : NSViewController {
  IBOutlet NSView *otherView_;
}
- (NSView *)otherView;
@end
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
  
