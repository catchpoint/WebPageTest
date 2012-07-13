//
//  GTMAppKitUnitTestingUtilities.m
//
//  Copyright 2006-2008 Google Inc.
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

#import "GTMAppKitUnitTestingUtilities.h"
#import <AppKit/AppKit.h>
#include <signal.h>
#include <unistd.h>
#import "GTMDefines.h"
#import "GTMGarbageCollection.h"

// The Users profile before we change it on them
static CMProfileRef gGTMCurrentColorProfile = NULL;

// Compares two color profiles
static BOOL GTMAreCMProfilesEqual(CMProfileRef a, CMProfileRef b);
// Stores the user's color profile away, and changes over to generic.
static void GTMSetColorProfileToGenericRGB();
// Restores the users profile.
static void GTMRestoreColorProfile(void);
// Signal handler to try and restore users profile.
static void GTMHandleCrashSignal(int signalNumber);

static CGKeyCode GTMKeyCodeForCharCode(CGCharCode charCode);

@implementation GTMAppKitUnitTestingUtilities

// Sets up the user interface so that we can run consistent UI unittests on it.
+ (void)setUpForUIUnitTests {
  // Give some names to undocumented defaults values
  const NSInteger MediumFontSmoothing = 2;
  const NSInteger BlueTintedAppearance = 1;

  // This sets up some basic values that we want as our defaults for doing pixel
  // based user interface tests. These defaults only apply to the unit test app,
  // except or the color profile which will be set system wide, and then
  // restored when the tests complete.
  NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
  // Scroll arrows together bottom
  [defaults setObject:@"DoubleMax" forKey:@"AppleScrollBarVariant"];
  // Smallest font size to CG should perform antialiasing on
  [defaults setInteger:4 forKey:@"AppleAntiAliasingThreshold"];
  // Type of smoothing
  [defaults setInteger:MediumFontSmoothing forKey:@"AppleFontSmoothing"];
  // Blue aqua
  [defaults setInteger:BlueTintedAppearance forKey:@"AppleAquaColorVariant"];
  // Standard highlight colors
  [defaults setObject:@"0.709800 0.835300 1.000000"
               forKey:@"AppleHighlightColor"];
  [defaults setObject:@"0.500000 0.500000 0.500000"
               forKey:@"AppleOtherHighlightColor"];
  // Use english plz
  [defaults setObject:[NSArray arrayWithObject:@"en"] forKey:@"AppleLanguages"];
  // How fast should we draw sheets. This speeds up the sheet tests considerably
  [defaults setFloat:.001f forKey:@"NSWindowResizeTime"];
  // Switch over the screen profile to "generic rgb". This installs an
  // atexit handler to return our profile back when we are done.
  GTMSetColorProfileToGenericRGB();
}

+ (void)setUpForUIUnitTestsIfBeingTested {
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  if ([GTMFoundationUnitTestingUtilities areWeBeingUnitTested]) {
    [self setUpForUIUnitTests];
  }
  [pool drain];
}

+ (BOOL)isScreenSaverActive {
  BOOL answer = NO;
  ProcessSerialNumber psn;
  if (GetFrontProcess(&psn) == noErr) {
    CFDictionaryRef cfProcessInfo
      = ProcessInformationCopyDictionary(&psn,
                                         kProcessDictionaryIncludeAllInformationMask);
    NSDictionary *processInfo = GTMCFAutorelease(cfProcessInfo);

    NSString *bundlePath = [processInfo objectForKey:@"BundlePath"];
    // ScreenSaverEngine is the frontmost app if the screen saver is actually
    // running Security Agent is the frontmost app if the "enter password"
    // dialog is showing
    NSString *bundleName = [bundlePath lastPathComponent];
    answer = ([bundleName isEqualToString:@"ScreenSaverEngine.app"]
              || [bundleName isEqualToString:@"SecurityAgent.app"]);
  }
  return answer;
}

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
           modifiers:(UInt32)cocoaModifiers {
  require(![self isScreenSaverActive], CantWorkWithScreenSaver);
  require(type == NSKeyDown || type == NSKeyUp, CantDoEvent);
  CGKeyCode code = GTMKeyCodeForCharCode(keyChar);
  verify(code != 256);
  CGEventRef event = CGEventCreateKeyboardEvent(NULL, code, type == NSKeyDown);
  require(event, CantCreateEvent);
  CGEventSetFlags(event, cocoaModifiers);
  CGEventPost(kCGSessionEventTap, event);
  CFRelease(event);
CantCreateEvent:
CantDoEvent:
CantWorkWithScreenSaver:
  return;
}

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
+ (void)postTypeCharacterEvent:(CGCharCode)keyChar modifiers:(UInt32)cocoaModifiers {
  [self postKeyEvent:NSKeyDown character:keyChar modifiers:cocoaModifiers];
  [self postKeyEvent:NSKeyUp character:keyChar modifiers:cocoaModifiers];
}

@end

BOOL GTMAreCMProfilesEqual(CMProfileRef a, CMProfileRef b) {
  BOOL equal = YES;
  if (a != b) {
    CMProfileMD5 aMD5;
    CMProfileMD5 bMD5;
    CMError aMD5Err = CMGetProfileMD5(a, aMD5);
    CMError bMD5Err = CMGetProfileMD5(b, bMD5);
    equal = (!aMD5Err &&
             !bMD5Err &&
             !memcmp(aMD5, bMD5, sizeof(CMProfileMD5))) ? YES : NO;
  }
  return equal;
}

void GTMRestoreColorProfile(void) {
  if (gGTMCurrentColorProfile) {
    CGDirectDisplayID displayID = CGMainDisplayID();
    CMError error = CMSetProfileByAVID((UInt32)displayID,
                                       gGTMCurrentColorProfile);
    CMCloseProfile(gGTMCurrentColorProfile);
    if (error) {
      // COV_NF_START
      // No way to force this case in a unittest.
      _GTMDevLog(@"Failed to restore previous color profile! "
            "You may need to open System Preferences : Displays : Color "
            "and manually restore your color settings. (Error: %i)", error);
      // COV_NF_END
    } else {
      _GTMDevLog(@"Color profile restored");
    }
    gGTMCurrentColorProfile = NULL;
  }
}

void GTMHandleCrashSignal(int signalNumber) {
  // Going down in flames, might as well try to restore the color profile
  // anyways.
  GTMRestoreColorProfile();
  // Go ahead and exit with the signal value relayed just incase.
  _exit(signalNumber + 128);
}

void GTMSetColorProfileToGenericRGB(void) {
  NSColorSpace *genericSpace = [NSColorSpace genericRGBColorSpace];
  CMProfileRef genericProfile = (CMProfileRef)[genericSpace colorSyncProfile];
  CMProfileRef previousProfile;
  CGDirectDisplayID displayID = CGMainDisplayID();
  CMError error = CMGetProfileByAVID((UInt32)displayID, &previousProfile);
  if (error) {
    // COV_NF_START
    // No way to force this case in a unittest.
    _GTMDevLog(@"Failed to get current color profile. "
               "I will not be able to restore your current profile, thus I'm "
               "not changing it. Many unit tests may fail as a result. (Error: %i)",
          error);
    return;
    // COV_NF_END
  }
  if (GTMAreCMProfilesEqual(genericProfile, previousProfile)) {
    CMCloseProfile(previousProfile);
    return;
  }
  CFStringRef previousProfileName;
  CFStringRef genericProfileName;
  CMCopyProfileDescriptionString(previousProfile, &previousProfileName);
  CMCopyProfileDescriptionString(genericProfile, &genericProfileName);

  _GTMDevLog(@"Temporarily changing your system color profile from \"%@\" to \"%@\".",
             previousProfileName, genericProfileName);
  _GTMDevLog(@"This allows the pixel-based unit-tests to have consistent color "
             "values across all machines.");
  _GTMDevLog(@"The colors on your screen will change for the duration of the testing.");


  if ((error = CMSetProfileByAVID((UInt32)displayID, genericProfile))) {
    // COV_NF_START
    // No way to force this case in a unittest.
    _GTMDevLog(@"Failed to set color profile to \"%@\"! Many unit tests will fail as "
               "a result.  (Error: %i)", genericProfileName, error);
    // COV_NF_END
  } else {
    gGTMCurrentColorProfile = previousProfile;
    atexit(GTMRestoreColorProfile);
    // WebKit DRT and Chrome TestShell both use this trick. If the test is
    // already crashing, might as well try restoring the color profile, and if
    // it fails, it is no worse than crashing without having tried.
    signal(SIGILL, GTMHandleCrashSignal);
    signal(SIGTRAP, GTMHandleCrashSignal);
    signal(SIGEMT, GTMHandleCrashSignal);
    signal(SIGFPE, GTMHandleCrashSignal);
    signal(SIGBUS, GTMHandleCrashSignal);
    signal(SIGSEGV, GTMHandleCrashSignal);
    signal(SIGSYS, GTMHandleCrashSignal);
    signal(SIGPIPE, GTMHandleCrashSignal);
    signal(SIGXCPU, GTMHandleCrashSignal);
    signal(SIGXFSZ, GTMHandleCrashSignal);
  }
  CFRelease(previousProfileName);
  CFRelease(genericProfileName);
}

// Returns a virtual key code for a given charCode. Handles all of the
// NS*FunctionKeys as well.
static CGKeyCode GTMKeyCodeForCharCode(CGCharCode charCode) {
  // character map taken from http://classicteck.com/rbarticles/mackeyboard.php
  int characters[] = {
    'a', 's', 'd', 'f', 'h', 'g', 'z', 'x', 'c', 'v', 256, 'b', 'q', 'w',
    'e', 'r', 'y', 't', '1', '2', '3', '4', '6', '5', '=', '9', '7', '-',
    '8', '0', ']', 'o', 'u', '[', 'i', 'p', '\n', 'l', 'j', '\'', 'k', ';',
    '\\', ',', '/', 'n', 'm', '.', '\t', ' ', '`', '\b', 256, '\e'
  };

  // function key map taken from
  // file:///Developer/ADC%20Reference%20Library/documentation/Cocoa/Reference/ApplicationKit/ObjC_classic/Classes/NSEvent.html
  int functionKeys[] = {
    // NSUpArrowFunctionKey - NSF12FunctionKey
    126, 125, 123, 124, 122, 120, 99, 118, 96, 97, 98, 100, 101, 109, 103, 111,
    // NSF13FunctionKey - NSF28FunctionKey
    105, 107, 113, 256, 256, 256, 256, 256, 256, 256, 256, 256, 256, 256, 256, 256,
    // NSF29FunctionKey - NSScrollLockFunctionKey
    256, 256, 256, 256, 256, 256, 256, 256, 117, 115, 256, 119, 116, 121, 256, 256,
    // NSPauseFunctionKey - NSPrevFunctionKey
    256, 256, 256, 256, 256, 256, 256, 256, 256, 256, 256, 256, 256, 256, 256, 256,
    // NSNextFunctionKey - NSModeSwitchFunctionKey
    256, 256, 256, 256, 256, 256, 114, 1
  };

  CGKeyCode outCode = 0;

  // Look in the function keys
  if (charCode >= NSUpArrowFunctionKey && charCode <= NSModeSwitchFunctionKey) {
    outCode = functionKeys[charCode - NSUpArrowFunctionKey];
  } else {
    // Look in our character map
    for (size_t i = 0; i < (sizeof(characters) / sizeof (int)); i++) {
      if (characters[i] == charCode) {
        outCode = i;
        break;
      }
    }
  }
  return outCode;
}

@implementation NSApplication (GTMUnitTestingRunAdditions)

- (BOOL)gtm_runUntilDate:(NSDate *)date
                 context:(id<GTMUnitTestingRunLoopContext>)context {
  BOOL contextShouldStop = NO;
  while (1) {
    contextShouldStop = [context shouldStop];
    if (contextShouldStop) break;
    NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
    NSEvent *event = [NSApp nextEventMatchingMask:NSAnyEventMask
                                         untilDate:date
                                            inMode:NSDefaultRunLoopMode
                                           dequeue:YES];
    if (!event) {
      [pool drain];
      break;
    }
    [NSApp sendEvent:event];
    [pool drain];
  }
  return contextShouldStop;
}

- (BOOL)gtm_runUpToSixtySecondsWithContext:(id<GTMUnitTestingRunLoopContext>)context {
  return [self gtm_runUntilDate:[NSDate dateWithTimeIntervalSinceNow:60]
                        context:context];
}

@end
