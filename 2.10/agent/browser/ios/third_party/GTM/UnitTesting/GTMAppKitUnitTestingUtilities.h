//
//  GTMAppKitUnitTestingUtilities.h
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

#import <AppKit/AppKit.h>

#import "GTMFoundationUnitTestingUtilities.h"

// Collection of utilities for unit testing
@interface GTMAppKitUnitTestingUtilities : NSObject

// Sets up the user interface so that we can run consistent UI unittests on
// it. This includes setting scroll bar types, setting selection colors
// setting color spaces etc so that everything is consistent across machines.
// This should be called in main, before NSApplicationMain is called.
+ (void)setUpForUIUnitTests;

// Syntactic sugar combining that checks to see if we are running unittests
// and then calls setUpForUIUnitTests wrapped up in a NSAutoreleasePool so that
// your main can look like this:
// int main(int argc, const char *argv[]) {
//   [UnitTestingUtilities setUpForUIUnitTestsIfBeingTested];
//   return NSApplicationMain(argc, argv);
// }
+ (void)setUpForUIUnitTestsIfBeingTested;

// Check if the screen saver is running. Some unit tests don't work when
// the screen saver is active.
+ (BOOL)isScreenSaverActive;

// Allows for posting either a keydown or a keyup with all the modifiers being
// applied. Passing a 'g' with NSKeyDown and NSShiftKeyMask
// generates two events (a shift key key down and a 'g' key keydown). Make sure
// to balance this with a keyup, or things could get confused. Events get posted
// using the CGRemoteOperation events which means that it gets posted in the
// system event queue. Thus you can affect other applications if your app isn't
// the active app (or in some cases, such as hotkeys, even if it is).
//  Arguments:
//    type - Event type. Currently accepts NSKeyDown and NSKeyUp
//    keyChar - character on the keyboard to type. Make sure it is lower case.
//              If you need upper case, pass in the NSShiftKeyMask in the
//              modifiers. i.e. to generate "G" pass in 'g' and NSShiftKeyMask.
//              to generate "+" pass in '=' and NSShiftKeyMask.
//    cocoaModifiers - an int made up of bit masks. Handles NSAlphaShiftKeyMask,
//                    NSShiftKeyMask, NSControlKeyMask, NSAlternateKeyMask, and
//                    NSCommandKeyMask
+ (void)postKeyEvent:(NSEventType)type
           character:(CGCharCode)keyChar
           modifiers:(UInt32)cocoaModifiers;

// Syntactic sugar for posting a keydown immediately followed by a key up event
// which is often what you really want.
//  Arguments:
//    keyChar - character on the keyboard to type. Make sure it is lower case.
//              If you need upper case, pass in the NSShiftKeyMask in the
//              modifiers. i.e. to generate "G" pass in 'g' and NSShiftKeyMask.
//              to generate "+" pass in '=' and NSShiftKeyMask.
//    cocoaModifiers - an int made up of bit masks. Handles NSAlphaShiftKeyMask,
//                    NSShiftKeyMask, NSControlKeyMask, NSAlternateKeyMask, and
//                    NSCommandKeyMask
+ (void)postTypeCharacterEvent:(CGCharCode)keyChar
                     modifiers:(UInt32)cocoaModifiers;

@end

// Some category methods to simplify spinning the runloops in such a way as
// to make tests less flaky, but have them complete as fast as possible.
@interface NSApplication (GTMUnitTestingRunAdditions)
// Has NSApplication call nextEventMatchingMask repeatedly until
// [context shouldStop] returns YES or it returns nil because the current date
// is greater than |date|.
// Return YES if the runloop was stopped because [context shouldStop] returned
// YES.
- (BOOL)gtm_runUntilDate:(NSDate *)date
                 context:(id<GTMUnitTestingRunLoopContext>)context;

// Calls -gtm_runUntilDate:context: with the timeout date set to 60 seconds.
- (BOOL)gtm_runUpToSixtySecondsWithContext:(id<GTMUnitTestingRunLoopContext>)context;
@end
