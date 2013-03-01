//
//  GTMHotKeyTextField.h
//
//  Copyright 2006-2010 Google Inc.
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

// Text field for capturing hot key entry. This is intended to be similar to the
// Apple key editor in their Keyboard pref pane.

// NOTE: There are strings that need to be localized to use this field.  See the
// code in stringForKeycode the the keys.  The keys are all the English versions
// so you'll get reasonable things if you don't have a strings file.

#import <Cocoa/Cocoa.h>
#import "GTMDefines.h"

@interface GTMHotKey : NSObject <NSCopying> {
 @private
  NSUInteger modifiers_;
  NSUInteger keyCode_;
  BOOL doubledModifier_;
}

+ (id)hotKeyWithKeyCode:(NSUInteger)keyCode
              modifiers:(NSUInteger)modifiers
        useDoubledModifier:(BOOL)doubledModifier;

- (id)initWithKeyCode:(NSUInteger)keyCode
            modifiers:(NSUInteger)modifiers
   useDoubledModifier:(BOOL)doubledModifier;

// Custom accessors (readonly, nonatomic)
- (NSUInteger)modifiers;
- (NSUInteger)keyCode;
- (BOOL)doubledModifier;

@end

//  Notes:
//  - Though you are free to implement control:textShouldEndEditing: in your
//    delegate its return is always ignored. The field always accepts only
//    one hotkey keystroke before editing ends.
//  - The "value" binding of this control is to the dictionary describing the
//    hotkey.
//  - The field does not attempt to consume all hotkeys. Hotkeys which are
//    already bound in Apple prefs or other applications will have their
//    normal effect.
//

@interface GTMHotKeyTextField : NSTextField
@end

@interface GTMHotKeyTextFieldCell : NSTextFieldCell {
 @private
  GTMHotKey *hotKey_;
}

// Convert Cocoa modifier flags (-[NSEvent modifierFlags]) into a string for
// display. Modifiers are represented in the string in the same order they would
// appear in the Menu Manager.
//
//  Args:
//    flags: -[NSEvent modifierFlags]
//
//  Returns:
//    Autoreleased NSString
//
+ (NSString *)stringForModifierFlags:(NSUInteger)flags;

// Convert a keycode into a string that would result from typing the keycode in
// the current keyboard layout. This may be one or more characters.
//
// Args:
//   keycode: Virtual keycode such as one obtained from NSEvent
//   useGlyph: In many cases the glyphs are confusing, and a string is clearer.
//             However, if you want to display in a menu item, use must
//             have a glyph. Set useGlyph to FALSE to get localized strings
//             which are better for UI display in places other than menus.
//     bundle: Localization bundle to use for localizable key names
//
// Returns:
//   Autoreleased NSString
//
+ (NSString *)stringForKeycode:(UInt16)keycode
                          useGlyph:(BOOL)useGlyph
                    resourceBundle:(NSBundle *)bundle;

@end

// Custom field editor for use with hotkey entry fields (GTMHotKeyTextField).
// See the GTMHotKeyTextField for instructions on using from the window
// delegate.
@interface GTMHotKeyFieldEditor : NSTextView {
 @private
  GTMHotKeyTextFieldCell *cell_;
}

// Get the shared field editor for all hot key fields
+ (GTMHotKeyFieldEditor *)sharedHotKeyFieldEditor;

// Custom accessors (retain, nonatomic)
- (GTMHotKeyTextFieldCell *)cell;

@end
