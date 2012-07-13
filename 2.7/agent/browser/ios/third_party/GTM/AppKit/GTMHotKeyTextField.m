//  GTMHotKeyTextField.m
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

#import "GTMHotKeyTextField.h"

#import <Carbon/Carbon.h>
#import "GTMObjectSingleton.h"

#if MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4
#import "GTMSystemVersion.h"
typedef struct __TISInputSource* TISInputSourceRef;

static TISInputSourceRef(*GTM_TISCopyCurrentKeyboardLayoutInputSource)(void) = NULL;
static void * (*GTM_TISGetInputSourceProperty)(TISInputSourceRef inputSource,
                                               CFStringRef propertyKey) = NULL;
static CFStringRef kGTM_TISPropertyUnicodeKeyLayoutData = NULL;
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4

@interface GTMHotKeyTextFieldCell (PrivateMethods)
- (void)setupBinding:(id)bound withPath:(NSString *)path;
- (void)updateDisplayedPrettyString;
+ (NSString *)displayStringForHotKey:(GTMHotKey *)hotKey;
+ (BOOL)doesKeyCodeRequireModifier:(UInt16)keycode;
@end

@interface GTMHotKeyFieldEditor (PrivateMethods)
- (GTMHotKeyTextFieldCell *)cell;
- (void)setCell:(GTMHotKeyTextFieldCell *)cell;
- (BOOL)shouldBypassEvent:(NSEvent *)theEvent;
- (void)processEventToHotKeyAndString:(NSEvent *)theEvent;
- (void)windowResigned:(NSNotification *)notification;
- (GTMHotKey *)hotKeyForEvent:(NSEvent *)event;
@end

@implementation GTMHotKey

+ (id)hotKeyWithKeyCode:(NSUInteger)keyCode
              modifiers:(NSUInteger)modifiers
     useDoubledModifier:(BOOL)doubledModifier {
  return [[[[self class] alloc] initWithKeyCode:keyCode
                                      modifiers:modifiers
                             useDoubledModifier:doubledModifier] autorelease];
}

- (id)initWithKeyCode:(NSUInteger)keyCode
            modifiers:(NSUInteger)modifiers
   useDoubledModifier:(BOOL)doubledModifier {
  if ((self = [super init])) {
    modifiers_ = modifiers;
    keyCode_ = keyCode;
    doubledModifier_ = doubledModifier;
  }
  return self;
}

- (NSUInteger)modifiers {
  return modifiers_;
}

- (NSUInteger)keyCode {
  return keyCode_;
}

- (BOOL)doubledModifier {
  return doubledModifier_;
}

- (BOOL)isEqual:(id)object {
  return [object isKindOfClass:[GTMHotKey class]]
    && [object modifiers] == [self modifiers]
    && [(GTMHotKey *)object keyCode] == [self keyCode]
    && [object doubledModifier] == [self doubledModifier];
}

- (NSUInteger)hash {
  return [self modifiers] + [self keyCode] + [self doubledModifier];
}

- (id)copyWithZone:(NSZone *)zone {
  return NSCopyObject(self, 0, zone);
}

- (NSString *)description {
  return [NSString stringWithFormat:@"<%@ %p> - %@",
          [self class], self,
          [GTMHotKeyTextFieldCell displayStringForHotKey:self]];
}

@end

@implementation GTMHotKeyTextField

+ (Class)cellClass {
  return [GTMHotKeyTextFieldCell class];
}

@end

@implementation GTMHotKeyTextFieldCell
- (void)dealloc {
  [hotKey_ release];
  [super dealloc];
}

- (id)copyWithZone:(NSZone *)zone {
  GTMHotKeyTextFieldCell *copy = [super copyWithZone:zone];
  copy->hotKey_ = nil;
  [copy setObjectValue:[self objectValue]];
  return copy;
}

#pragma mark Defeating NSCell

- (void)logBadValueAccess {
  _GTMDevLog(@"Hot key fields want hot key dictionaries as object values.");
}

- (id)objectValue {
  return hotKey_;
}

- (void)setObjectValue:(id)object {
  // Sanity only if set, nil is OK
  if (object && ![object isKindOfClass:[GTMHotKey class]]) {
    [self logBadValueAccess];
    return;
  }
  if (![hotKey_ isEqual:object]) {
    // Otherwise we directly update ourself
    [hotKey_ autorelease];
    hotKey_ = [object copy];
    [self updateDisplayedPrettyString];
  }
}

- (NSString *)stringValue {
  NSString *value = [[self class] displayStringForHotKey:hotKey_];
  if (!value) {
    value = @"";
  }
  return value;
}

- (void)setStringValue:(NSString *)string {
  // Since we are a text cell, lots of AppKit objects will attempt to
  // set out string value. Our Field editor should already have done
  // that for us, so check to make sure what AppKit is setting us to is
  // what we expect.
  if (![string isEqual:[self stringValue]]) {
    [self logBadValueAccess];
  }
}

- (NSAttributedString *)attributedStringValue {
  NSAttributedString *attrString = nil;
  NSString *prettyString = [self stringValue];
  if (prettyString) {
    attrString = [[[NSAttributedString alloc]
                   initWithString:prettyString] autorelease];
  }
  return attrString;
}

- (void)setAttributedStringValue:(NSAttributedString *)string {
  [self logBadValueAccess];
}

- (id)formatter {
  return nil;
}

- (void)setFormatter:(NSFormatter *)newFormatter {
  if (newFormatter) {
    // Defeating NSCell
    _GTMDevLog(@"Hot key fields don't accept formatters.");
  }
}

- (id)_fieldEditor {
  GTMHotKeyFieldEditor *editor = [GTMHotKeyFieldEditor sharedHotKeyFieldEditor];
  [editor setCell:self];
  return editor;
}

#pragma mark Hot Key Support

// Private method to update the displayed text of the field with the
// user-readable representation.
- (void)updateDisplayedPrettyString {
  // Pretty string
  NSString *prettyString = [[self class] displayStringForHotKey:hotKey_];
  if (!prettyString) {
    prettyString = @"";
  }
  [super setObjectValue:prettyString];

}

+ (NSString *)displayStringForHotKey:(GTMHotKey *)hotKey {
  if (!hotKey) return nil;

  NSBundle *bundle = [NSBundle bundleForClass:[self class]];

  // Modifiers
  NSUInteger modifiers = [hotKey modifiers];
  NSString *mods = [[self class] stringForModifierFlags:modifiers];
  if (modifiers && ![mods length]) return nil;
  // Handle double modifier case
  if ([hotKey doubledModifier]) {
    return [NSString stringWithFormat:@"%@ + %@", mods, mods];
  }
  // Keycode
  NSUInteger keycode = [hotKey keyCode];
  NSString *keystroke = [[self class] stringForKeycode:keycode
                                              useGlyph:NO
                                        resourceBundle:bundle];
  if (!keystroke || ![keystroke length]) return nil;
  if ([[self class] doesKeyCodeRequireModifier:keycode]
      && ![mods length]) {
    return nil;
  }

  return [NSString stringWithFormat:@"%@%@", mods, keystroke];
}

#pragma mark Class methods building strings for use w/in the UI.

#if MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4
+ (void)initialize {
  if (!GTM_TISCopyCurrentKeyboardLayoutInputSource
      && [GTMSystemVersion isLeopardOrGreater]) {
    CFBundleRef hiToolbox
      = CFBundleGetBundleWithIdentifier(CFSTR("com.apple.HIToolbox"));
    if (hiToolbox) {
      kGTM_TISPropertyUnicodeKeyLayoutData
        = *(CFStringRef*)CFBundleGetDataPointerForName(hiToolbox,
                                    CFSTR("kTISPropertyUnicodeKeyLayoutData"));
      GTM_TISCopyCurrentKeyboardLayoutInputSource
        = CFBundleGetFunctionPointerForName(hiToolbox,
                             CFSTR("TISCopyCurrentKeyboardLayoutInputSource"));
      GTM_TISGetInputSourceProperty
        = CFBundleGetFunctionPointerForName(hiToolbox,
                                           CFSTR("TISGetInputSourceProperty"));
    }
  }
}
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4

#pragma mark Useful String Class Methods

+ (BOOL)doesKeyCodeRequireModifier:(UInt16)keycode {
  BOOL doesRequire = YES;
  switch(keycode) {
    // These are the keycodes that map to the
    //unichars in the associated comment.
    case 122:  //  NSF1FunctionKey
    case 120:  //  NSF2FunctionKey
    case 99:   //  NSF3FunctionKey
    case 118:  //  NSF4FunctionKey
    case 96:   //  NSF5FunctionKey
    case 97:   //  NSF6FunctionKey
    case 98:   //  NSF7FunctionKey
    case 100:  //  NSF8FunctionKey
    case 101:  //  NSF9FunctionKey
    case 109:  //  NSF10FunctionKey
    case 103:  //  NSF11FunctionKey
    case 111:  //  NSF12FunctionKey
    case 105:  //  NSF13FunctionKey
    case 107:  //  NSF14FunctionKey
    case 113:  //  NSF15FunctionKey
    case 106:  //  NSF16FunctionKey
      doesRequire = NO;
      break;
    default:
      doesRequire = YES;
      break;
  }
  return doesRequire;
}

// These are not in a category on NSString because this class could be used
// within multiple preference panes at the same time. If we put it in a category
// it would require setting up some magic so that the categories didn't conflict
// between the multiple pref panes. By putting it in the class, you can just
// #define the class name to something else, and then you won't have any
// conflicts.

+ (NSString *)stringForModifierFlags:(NSUInteger)flags {
  UniChar modChars[4];  // We only look for 4 flags
  unsigned int charCount = 0;
  // These are in the same order as the menu manager shows them
  if (flags & NSControlKeyMask) modChars[charCount++] = kControlUnicode;
  if (flags & NSAlternateKeyMask) modChars[charCount++] = kOptionUnicode;
  if (flags & NSShiftKeyMask) modChars[charCount++] = kShiftUnicode;
  if (flags & NSCommandKeyMask) modChars[charCount++] = kCommandUnicode;
  if (charCount == 0) return @"";
  return [NSString stringWithCharacters:modChars length:charCount];
}

+ (NSString *)stringForKeycode:(UInt16)keycode
                      useGlyph:(BOOL)useGlyph
                resourceBundle:(NSBundle *)bundle {
  // Some keys never move in any layout (to the best of our knowledge at least)
  // so we can hard map them.
  UniChar key = 0;
  NSString *localizedKey = nil;

  switch (keycode) {

      // Of the hard mapped keys some can be represented with pretty and obvioous
      // Unicode or simple strings without localization.

      // Arrow keys
    case 123: key = NSLeftArrowFunctionKey; break;
    case 124: key = NSRightArrowFunctionKey; break;
    case 125: key = NSDownArrowFunctionKey; break;
    case 126: key = NSUpArrowFunctionKey; break;
    case 122: key = NSF1FunctionKey; localizedKey = @"F1"; break;
    case 120: key = NSF2FunctionKey; localizedKey = @"F2"; break;
    case 99:  key = NSF3FunctionKey; localizedKey = @"F3"; break;
    case 118: key = NSF4FunctionKey; localizedKey = @"F4"; break;
    case 96:  key = NSF5FunctionKey; localizedKey = @"F5"; break;
    case 97:  key = NSF6FunctionKey; localizedKey = @"F6"; break;
    case 98:  key = NSF7FunctionKey; localizedKey = @"F7"; break;
    case 100: key = NSF8FunctionKey; localizedKey = @"F8"; break;
    case 101: key = NSF9FunctionKey; localizedKey = @"F9"; break;
    case 109: key = NSF10FunctionKey; localizedKey = @"F10"; break;
    case 103: key = NSF11FunctionKey; localizedKey = @"F11"; break;
    case 111: key = NSF12FunctionKey; localizedKey = @"F12"; break;
    case 105: key = NSF13FunctionKey; localizedKey = @"F13"; break;
    case 107: key = NSF14FunctionKey; localizedKey = @"F14"; break;
    case 113: key = NSF15FunctionKey; localizedKey = @"F15"; break;
    case 106: key = NSF16FunctionKey; localizedKey = @"F16"; break;
      // Forward delete is a terrible name so we'll use the glyph Apple puts on
      // their current keyboards
    case 117: key = 0x2326; break;

      // Now we have keys that can be hard coded but don't have good glyph
      // representations. Sure, the Apple menu manager has glyphs for them, but
      // an informal poll of Google developers shows no one really knows what
      // they mean, so its probably a good idea to use strings. Unfortunately
      // this also means localization (*sigh*). We'll use the real English
      // strings here as keys so that even if localization is missed we'll do OK
      // in output.

      // Whitespace
    case 36: key = '\r'; localizedKey = @"Return"; break;
    case 76: key = 0x3; localizedKey = @"Enter"; break;
    case 48: key = 0x9; localizedKey = @"Tab"; break;
      // 0x2423 is the Open Box
    case 49: key = 0x2423; localizedKey = @"Space"; break;
      // Control keys
    case 51: key = 0x8; localizedKey = @"Delete"; break;
    case 71: key = NSClearDisplayFunctionKey; localizedKey = @"Clear"; break;
    case 53: key = 0x1B; localizedKey = @"Esc"; break;
    case 115: key = NSHomeFunctionKey; localizedKey = @"Home"; break;
    case 116: key = NSPageUpFunctionKey; localizedKey = @"Page Up"; break;
    case 119: key = NSEndFunctionKey; localizedKey = @"End"; break;
    case 121: key = NSPageDownFunctionKey; localizedKey = @"Page Down"; break;
    case 114: key = NSHelpFunctionKey; localizedKey = @"Help"; break;
      // Keypad keys
      // There is no good way we could find to glyph these. We tried a variety
      // of Unicode glyphs, and the menu manager wouldn't take them. We tried
      // subscript numbers, circled numbers and superscript numbers with no
      // luck.  It may be a bit confusing to the user, but we're happy to hear
      // any suggestions.
    case 65: key = '.'; localizedKey = @"Keypad ."; break;
    case 67: key = '*'; localizedKey = @"Keypad *"; break;
    case 69: key = '+'; localizedKey = @"Keypad +"; break;
    case 75: key = '/'; localizedKey = @"Keypad /"; break;
    case 78: key = '-'; localizedKey = @"Keypad -"; break;
    case 81: key = '='; localizedKey = @"Keypad ="; break;
    case 82: key = '0'; localizedKey = @"Keypad 0"; break;
    case 83: key = '1'; localizedKey = @"Keypad 1"; break;
    case 84: key = '2'; localizedKey = @"Keypad 2"; break;
    case 85: key = '3'; localizedKey = @"Keypad 3"; break;
    case 86: key = '4'; localizedKey = @"Keypad 4"; break;
    case 87: key = '5'; localizedKey = @"Keypad 5"; break;
    case 88: key = '6'; localizedKey = @"Keypad 6"; break;
    case 89: key = '7'; localizedKey = @"Keypad 7"; break;
    case 91: key = '8'; localizedKey = @"Keypad 8"; break;
    case 92: key = '9'; localizedKey = @"Keypad 9"; break;

  }

  // If they asked for strings, and we have one return it.  Otherwise, return
  // any key we've picked.
  if (!useGlyph && localizedKey) {
    return NSLocalizedStringFromTableInBundle(localizedKey,
                                              @"GTMHotKeyTextField",
                                              bundle,
                                              @"");
  } else if (key != 0) {
    return [NSString stringWithFormat:@"%C", key];
  }

  // Everything else should be printable so look it up in the current keyboard
  UCKeyboardLayout *uchrData = NULL;

  OSStatus err = noErr;
#if MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4
  // layout
  KeyboardLayoutRef  currentLayout = NULL;
  // Get the layout kind
  SInt32 currentLayoutKind = -1;
  if ([GTMSystemVersion isLeopardOrGreater]
      && kGTM_TISPropertyUnicodeKeyLayoutData
      && GTM_TISGetInputSourceProperty
      && GTM_TISCopyCurrentKeyboardLayoutInputSource) {
    // On Leopard we use the new improved TIS interfaces which work for input
    // sources as well as keyboard layouts.
    TISInputSourceRef inputSource
      = GTM_TISCopyCurrentKeyboardLayoutInputSource();
    if (inputSource) {
      CFDataRef uchrDataRef
        = GTM_TISGetInputSourceProperty(inputSource,
                                        kGTM_TISPropertyUnicodeKeyLayoutData);
      if(uchrDataRef) {
        uchrData = (UCKeyboardLayout*)CFDataGetBytePtr(uchrDataRef);
      }
      CFRelease(inputSource);
    }
  } else {
    // Tiger we use keyboard layouts as it's the best we can officially do.
    err = KLGetCurrentKeyboardLayout(&currentLayout);
    if (err != noErr) { // COV_NF_START
      _GTMDevLog(@"failed to fetch the keyboard layout, err=%d", err);
      return nil;
    }  // COV_NF_END

    err = KLGetKeyboardLayoutProperty(currentLayout,
                                      kKLKind,
                                      (const void **)&currentLayoutKind);
    if (err != noErr) { // COV_NF_START
      _GTMDevLog(@"failed to fetch the keyboard layout kind property, err=%d",
                 err);
      return nil;
    }  // COV_NF_END

    if (currentLayoutKind != kKLKCHRKind) {
      err = KLGetKeyboardLayoutProperty(currentLayout,
                                        kKLuchrData,
                                        (const void **)&uchrData);
      if (err != noErr) { // COV_NF_START
        _GTMDevLog(@"failed to fetch the keyboard layout uchar data, err=%d",
                   err);
        return nil;
      }  // COV_NF_END
    }
  }
#else
  TISInputSourceRef inputSource = TISCopyCurrentKeyboardLayoutInputSource();
  if (inputSource) {
    CFDataRef uchrDataRef
      = TISGetInputSourceProperty(inputSource, kTISPropertyUnicodeKeyLayoutData);
    if(uchrDataRef) {
      uchrData = (UCKeyboardLayout*)CFDataGetBytePtr(uchrDataRef);
    }
    CFRelease(inputSource);
  }
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4

  NSString *keystrokeString = nil;
  if (uchrData) {
    // uchr layout data is available, this is our preference
    UniCharCount uchrCharLength = 0;
    UniChar  uchrChars[256] = { 0 };
    UInt32 uchrDeadKeyState = 0;
    err = UCKeyTranslate(uchrData,
                         keycode,
                         kUCKeyActionDisplay,
                         0,  // No modifiers
                         LMGetKbdType(),
                         kUCKeyTranslateNoDeadKeysMask,
                         &uchrDeadKeyState,
                         sizeof(uchrChars) / sizeof(UniChar),
                         &uchrCharLength,
                         uchrChars);
    if (err != noErr) {
      // COV_NF_START
      _GTMDevLog(@"failed to translate the keycode, err=%d", err);
      return nil;
      // COV_NF_END
    }
    if (uchrCharLength < 1) return nil;
    keystrokeString = [NSString stringWithCharacters:uchrChars
                                              length:uchrCharLength];
  }
#if MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4
  else if (currentLayoutKind == kKLKCHRKind) {
    // Only KCHR layout data is available, go old school
    void *KCHRData = NULL;
    err = KLGetKeyboardLayoutProperty(currentLayout, kKLKCHRData,
                                      (const void **)&KCHRData);
    if (err != noErr) { // COV_NF_START
      _GTMDevLog(@"failed to fetch the keyboard layout uchar data, err=%d",
                 err);
      return nil;
    }  // COV_NF_END
    // Turn into character code
    UInt32 keyTranslateState = 0;
    UInt32 twoKCHRChars = KeyTranslate(KCHRData, keycode, &keyTranslateState);
    if (!twoKCHRChars) return nil;
    // Unpack the fields
    char firstChar = (char)((twoKCHRChars & 0x00FF0000) >> 16);
    char secondChar = (char)(twoKCHRChars & 0x000000FF);
    // May have one or two characters
    if (firstChar && secondChar) {
      NSString *str1
        = [[[NSString alloc] initWithBytes:&firstChar
                                    length:1
                                  encoding:NSMacOSRomanStringEncoding] autorelease];
      NSString *str2
        = [[[NSString alloc] initWithBytes:&secondChar
                                    length:1
                                  encoding:NSMacOSRomanStringEncoding] autorelease];
      keystrokeString = [NSString stringWithFormat:@"%@%@",
                         [str1 uppercaseString],
                         [str2 uppercaseString]];
    } else {
      keystrokeString
        = [[[NSString alloc] initWithBytes:&secondChar
                                    length:1
                                  encoding:NSMacOSRomanStringEncoding] autorelease];
      [keystrokeString uppercaseString];
    }
  }
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4

  // Sanity we got a stroke
  if (!keystrokeString || ![keystrokeString length]) return nil;

  // Sanity check the keystroke string for unprintable characters
  NSMutableCharacterSet *validChars =
    [[[NSMutableCharacterSet alloc] init] autorelease];

  [validChars formUnionWithCharacterSet:[NSCharacterSet alphanumericCharacterSet]];
  [validChars formUnionWithCharacterSet:[NSCharacterSet punctuationCharacterSet]];
  [validChars formUnionWithCharacterSet:[NSCharacterSet symbolCharacterSet]];
  for (unsigned int i = 0; i < [keystrokeString length]; i++) {
    if (![validChars characterIsMember:[keystrokeString characterAtIndex:i]]) {
      return nil;
    }
  }

  if (!useGlyph) {
    // menus want glyphs in the original lowercase forms, so we only upper this
    // if we aren't using it as a glyph.
    keystrokeString = [keystrokeString uppercaseString];
  }

  return keystrokeString;
}

@end

@implementation GTMHotKeyFieldEditor

GTMOBJECT_SINGLETON_BOILERPLATE(GTMHotKeyFieldEditor, sharedHotKeyFieldEditor)

- (id)init {
  if ((self = [super init])) {
    [self setFieldEditor:YES];  // We are a field editor
  }
  return self;
}

// COV_NF_START
// Singleton so never called.
- (void)dealloc {
  [cell_ release];
  [super dealloc];
}
// COV_NF_END

- (GTMHotKeyTextFieldCell *)cell {
  return cell_;
}

- (void)setCell:(GTMHotKeyTextFieldCell *)cell {
  [cell_ autorelease];
  cell_ = [cell retain];
}

- (NSArray *)acceptableDragTypes {
  // Don't take drags
  return [NSArray array];
}

- (NSArray *)readablePasteboardTypes {
  // No pasting
  return [NSArray array];
}

- (NSArray *)writablePasteboardTypes {
  // No copying
  return [NSArray array];
}

- (BOOL)becomeFirstResponder {
  // We need to lose focus any time the window is not key
  NSNotificationCenter *dc = [NSNotificationCenter defaultCenter];
  [dc addObserver:self
         selector:@selector(windowResigned:)
             name:NSWindowDidResignKeyNotification
           object:[self window]];
  return [super becomeFirstResponder];
}

- (BOOL)resignFirstResponder {
  // No longer interested in window resign
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  return [super resignFirstResponder];
}

// Private method we use to get out of global hotkey capture when the window
// is no longer front
- (void)windowResigned:(NSNotification *)notification {
  // Lose our focus
  NSWindow *window = [self window];
  [window makeFirstResponder:window];

}

- (BOOL)shouldDrawInsertionPoint {
  // Show an insertion point, because we'll kill our own focus after
  // each entry
  return YES;
}

- (NSRange)selectionRangeForProposedRange:(NSRange)proposedSelRange
                              granularity:(NSSelectionGranularity)granularity {
  // Always select everything
  return NSMakeRange(0, [[self textStorage] length]);
}

- (void)keyDown:(NSEvent *)theEvent {
  if ([self shouldBypassEvent:theEvent]) {
    [super keyDown:theEvent];
  } else {
    // Try to eat the event
    [self processEventToHotKeyAndString:theEvent];
  }
}

- (BOOL)performKeyEquivalent:(NSEvent *)theEvent {
  if ([self shouldBypassEvent:theEvent]) {
    return [super performKeyEquivalent:theEvent];
  } else {
    // We always eat these key strokes while we have focus
    [self processEventToHotKeyAndString:theEvent];
    return YES;
  }
}

// Private do method that tell us to ignore certain events
- (BOOL)shouldBypassEvent:(NSEvent *)theEvent {
  BOOL bypass = NO;
  UInt16 keyCode = [theEvent keyCode];
  NSUInteger modifierFlags
    = [theEvent modifierFlags] & NSDeviceIndependentModifierFlagsMask;

  if (keyCode == 48) {  // Tab
    // Ignore all events that the dock cares about
    // Just to be extra clear if the user is trying to use Dock hotkeys beep
    // at them
    if ((modifierFlags == NSCommandKeyMask) ||
        (modifierFlags == (NSCommandKeyMask | NSShiftKeyMask))) {
      NSBeep();
      bypass = YES;
    } else if (modifierFlags == 0 || modifierFlags == NSShiftKeyMask) {
      // Probably attempting to tab around the dialog.
      bypass = YES;
    }

  } else if ((keyCode == 12) && (modifierFlags == NSCommandKeyMask)) {
    // Don't eat Cmd-Q. Users could have it as a hotkey, but its more likely
    // they're trying to quit
    bypass = YES;
  } else if ((keyCode == 13) && (modifierFlags == NSCommandKeyMask)) {
    // Same for Cmd-W, user is probably trying to close the window
    bypass = YES;
  }
  return bypass;
}

// Private method that turns events into strings and dictionaries for our
// hotkey plumbing.
- (void)processEventToHotKeyAndString:(NSEvent *)theEvent {
  // Construct a dictionary of the event as a hotkey pref
  GTMHotKey *newHotKey = nil;
  NSString *prettyString = @"";
  // 51 is "the delete key"
  const NSUInteger allModifiers = (NSCommandKeyMask | NSAlternateKeyMask |
                                   NSControlKeyMask | NSShiftKeyMask);
  if (!(([theEvent keyCode] == 51 )
        && (([theEvent modifierFlags] & allModifiers)== 0))) {
    newHotKey = [self hotKeyForEvent:theEvent];
    if (!newHotKey) {
      NSBeep();
      return;  // No action, but don't give up focus
    }
    prettyString = [GTMHotKeyTextFieldCell displayStringForHotKey:newHotKey];
    if (!prettyString) {
      NSBeep();
      return;
    }
  }

  // Replacement range
  NSRange replaceRange = NSMakeRange(0, [[self textStorage] length]);

  // Ask for permission to replace
  if (![self shouldChangeTextInRange:replaceRange
                   replacementString:prettyString]) {
    // If replacement was disallowed, change nothing, including hotKeyDict_
    NSBeep();
    return;
  }

  [[self cell] setObjectValue:newHotKey];

  // Finish the change
  [self didChangeText];

  // Force editing to end. This sends focus off into space slightly, but
  // its better than constantly capturing user events. This is exactly
  // like the Apple editor in their Keyboard pref pane.
  [[self window] makeFirstResponder:nil];
}

- (GTMHotKey *)hotKeyForEvent:(NSEvent *)event {
  if (!event) return nil;

  // Check event
  NSUInteger flags = [event modifierFlags];
  UInt16 keycode = [event keyCode];
  // If the event has no modifiers do nothing
  NSUInteger allModifiers = (NSCommandKeyMask | NSAlternateKeyMask |
                             NSControlKeyMask | NSShiftKeyMask);

  BOOL requiresModifiers
    = [GTMHotKeyTextFieldCell doesKeyCodeRequireModifier:keycode];
  if (requiresModifiers) {
    // If we aren't a function key, and have no modifiers do nothing.
    if (!(flags & allModifiers)) return nil;
    // If the event has high bits in keycode do nothing
    if (keycode & 0xFF00) return nil;
  }

  // Clean the flags to only contain things we care about
  UInt32 cleanFlags = 0;
  if (flags & NSCommandKeyMask) cleanFlags |= NSCommandKeyMask;
  if (flags & NSAlternateKeyMask) cleanFlags |= NSAlternateKeyMask;
  if (flags & NSControlKeyMask) cleanFlags |= NSControlKeyMask;
  if (flags & NSShiftKeyMask) cleanFlags |= NSShiftKeyMask;
  return [GTMHotKey hotKeyWithKeyCode:keycode
                            modifiers:cleanFlags
                   useDoubledModifier:NO];
}

@end
