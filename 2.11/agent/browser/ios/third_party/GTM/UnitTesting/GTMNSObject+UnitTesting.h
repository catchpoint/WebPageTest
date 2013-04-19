//
//  GTMNSObject+UnitTesting.h
//
//  Utilities for doing advanced unittesting with objects.
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

#import "GTMDefines.h"
#import <Foundation/Foundation.h>

#if GTM_MACOS_SDK
#import <ApplicationServices/ApplicationServices.h>
#elif GTM_IPHONE_SDK
#import <CoreGraphics/CoreGraphics.h>
#endif

#import "GTMSenTestCase.h"

// Utility functions for GTMAssert* Macros. Don't use them directly
// but use the macros below instead
BOOL GTMIsObjectImageEqualToImageNamed(id object, 
                                       NSString *filename, 
                                       NSString **error);
BOOL GTMIsObjectStateEqualToStateNamed(id object, 
                                       NSString *filename, 
                                       NSString **error);

// Fails when image of |a1| does not equal image in image file named |a2|
//
//  Generates a failure when the unittest image of |a1| is not equal to the 
//  image stored in the image file named |a2|, or |a2| does not exist in the 
//  executable code's bundle.
//  If |a2| does not exist in the executable code's bundle, we save a image
//  representation of |a1| in the save directory with name |a2|. This can then
//  be included in the bundle as the master to test against.
//  If |a2| != |a1|, we save a image representation of |a1| in the save 
//  directory named |a2|_Failed and a file named |a2|_Failed_Diff showing the 
//  diff in red so that we can see what has changed.
//  See pathForImageNamed to see how name is searched for.
//  The save directory is specified by +gtm_setUnitTestSaveToDirectory, and is
//  the desktop by default.
//  Implemented as a macro to match the rest of the SenTest macros.
//
//  Args:
//    a1: The object to be checked. Must implement the -createUnitTestImage method.
//    a2: The name of the image file to check against.
//        Do not include the extension
//    description: A format string as in the printf() function. 
//        Can be nil or an empty string but must be present. 
//    ...: A variable number of arguments to the format string. Can be absent.
//
#define GTMAssertObjectImageEqualToImageNamed(a1, a2, description, ...) \
do { \
  id a1Object = (a1); \
  NSString* a2String = (a2); \
  NSString *failString = nil; \
  BOOL isGood = GTMIsObjectImageEqualToImageNamed(a1Object, a2String, &failString); \
  if (!isGood) { \
    if (description != nil) { \
      STFail(@"%@: %@", failString, STComposeString(description, ##__VA_ARGS__)); \
    } else { \
      STFail(@"%@", failString); \
    } \
  } \
} while(0)

// Fails when state of |a1| does not equal state in file |a2|
//
//  Generates a failure when the unittest state of |a1| is not equal to the 
//  state stored in the state file named |a2|, or |a2| does not exist in the 
//  executable code's bundle.
//  If |a2| does not exist in the executable code's bundle, we save a state
//  representation of |a1| in the save directiry with name |a2|. This can then 
//  be included in the bundle as the master to test against.
//  If |a2| != |a1|, we save a state representation of |a1| in the save 
//  directory with name |a2|_Failed so that we can compare the two files to see 
//  what has changed.
//  The save directory is specified by +gtm_setUnitTestSaveToDirectory, and is
//  the desktop by default.
//  Implemented as a macro to match the rest of the SenTest macros.
//
//  Args:
//    a1: The object to be checked. Must implement the -createUnitTestImage method.
//    a2: The name of the state file to check against.
//        Do not include the extension
//    description: A format string as in the printf() function. 
//        Can be nil or an empty string but must be present. 
//    ...: A variable number of arguments to the format string. Can be absent.
//
#define GTMAssertObjectStateEqualToStateNamed(a1, a2, description, ...) \
do { \
  id a1Object = (a1); \
  NSString* a2String = (a2); \
  NSString *failString = nil; \
  BOOL isGood = GTMIsObjectStateEqualToStateNamed(a1Object, a2String, &failString); \
  if (!isGood) { \
    if (description != nil) { \
      STFail(@"%@: %@", failString, STComposeString(description, ##__VA_ARGS__)); \
    } else { \
      STFail(@"%@", failString); \
    } \
  } \
} while(0);

// test both GTMAssertObjectImageEqualToImageNamed and GTMAssertObjectStateEqualToStateNamed
//
// Combines the above two macros into a single ubermacro for comparing
// both state and image. When only the best will do...
#define GTMAssertObjectEqualToStateAndImageNamed(a1, a2, description, ...) \
do { \
  GTMAssertObjectImageEqualToImageNamed(a1, a2, description, ##__VA_ARGS__); \
  GTMAssertObjectStateEqualToStateNamed(a1, a2, description, ##__VA_ARGS__); \
} while (0)

// Create a CGBitmapContextRef appropriate for using in creating a unit test 
// image. If data is non-NULL, returns the buffer that the bitmap is
// using for it's underlying storage. You must free this buffer using
// free. If data is NULL, uses it's own internal storage.
// Defined as a C function instead of an obj-c method because you have to
// release the CGContextRef that is returned.
//
//  Returns:
//    an CGContextRef of the object. Caller must release

CGContextRef GTMCreateUnitTestBitmapContextOfSizeWithData(CGSize size,
                                                          unsigned char **data);

// GTMUnitTestingImaging protocol is for objects which need to save their
// image for using with the unit testing categories
@protocol GTMUnitTestingImaging
// Create a CGImageRef containing a representation suitable for use in 
// comparing against a master image. 
//
//  Returns:
//    an CGImageRef of the object.
- (CGImageRef)gtm_unitTestImage;
@end

// GTMUnitTestingEncoding protocol is for objects which need to save their
// "state" for using with the unit testing categories
@protocol GTMUnitTestingEncoding
//  Encodes the state of an object in a manner suitable for comparing
//  against a master state file so we can determine whether the
//  object is in a suitable state. Encode data in the coder in the same
//  manner that you would encode data in any other Keyed NSCoder subclass.
//
//  Arguments:
//    inCoder - the coder to encode our state into
- (void)gtm_unitTestEncodeState:(NSCoder*)inCoder;
@end

// Category for saving and comparing object state and image for unit tests
//
//  The GTMUnitTestAdditions category gives object the ability to store their
//  state for use in unittesting in two different manners.
// 1) Objects can elect to save their "image" that we can compare at
// runtime to an image file to make sure that the representation hasn't
// changed. All views and Windows can save their image. In the case of Windows,
// they are "bluescreened" so that any transparent areas can be compared between
// machines.
// 2) Objects can elect to save their "state". State is the attributes that we
// want to verify when running unit tests. Applications, Windows, Views,
// Controls and Cells currently return a variety of state information. If you
// want to customize the state information that a particular object returns, you
// can do it via the GTMUnitTestingEncodedObjectNotification. Items that have
// delegates (Applications/Windows) can also have their delegates return state
// information if appropriate via the unitTestEncoderDidEncode:inCoder: delegate
// method.
// To compare state/image in your unit tests, you can use the three macros above
// GTMAssertObjectStateEqualToStateNamed, GTMAssertObjectImageEqualToImageNamed and
// GTMAssertObjectEqualToStateAndImageNamed.
@interface NSObject (GTMUnitTestingAdditions) <GTMUnitTestingEncoding>
// Allows you to control where the unit test utilities save any files
// (image or state) that they create on your behalf. By default they
// will save to the desktop.
+ (void)gtm_setUnitTestSaveToDirectory:(NSString*)path;
+ (NSString *)gtm_getUnitTestSaveToDirectory;

// Checks to see that system settings are valid for doing an image comparison.
// Most of these are set by our unit test app. See the unit test app main.m
// for details.
//
// Returns:
//  YES if we can do image comparisons for this object type.
- (BOOL)gtm_areSystemSettingsValidForDoingImage;

// Return the type of image to work with. Only valid types on the iPhone
// are kUTTypeJPEG and kUTTypePNG. MacOS supports several more.
- (CFStringRef)gtm_imageUTI;

// Return the extension to be used for saving unittest images
//
// Returns
//  An extension (e.g. "png")
- (NSString*)gtm_imageExtension;

// Return image data in the format expected for gtm_imageExtension
// So for a "png" extension I would expect "png" data
//
// Returns
//  NSData for image
- (NSData*)gtm_imageDataForImage:(CGImageRef)image;

// Save the unitTestImage to a image file with name 
// |name|.arch.OSVersionMajor.OSVersionMinor.OSVersionBugfix.extension
// in the save folder (desktop by default)
//
//  Args:
//    name: The name for the image file you would like saved.
//
//  Returns:
//    YES if the file was successfully saved.
//
- (BOOL)gtm_saveToImageNamed:(NSString*)name;

// Save unitTestImage of |self| to an image file at path |path|. 
// All non-drawn areas will be transparent.
//
//  Args:
//    name: The name for the image file you would like saved.
//
//  Returns:
//    YES if the file was successfully saved.
//
- (BOOL)gtm_saveToImageAt:(NSString*)path;

//  Compares unitTestImage of |self| to the image located at |path|
//
//  Args:
//    path: the path to the image file you want to compare against.
//    If diff is non-nil, it will contain an auto-released diff of the images.
//
//  Returns:
//    YES if they are equal, NO is they are not
//    If diff is non-nil, it will contain a diff of the images. Must
//    be released by caller.
//
- (BOOL)gtm_compareWithImageAt:(NSString*)path diffImage:(CGImageRef*)diff;

//  Find the path for a image by name in your bundle.
//  Searches for the following:
//  "name.CompilerSDK.OSVersionMajor.OSVersionMinor.OSVersionBugFix.arch.extension"
//  "name.CompilerSDK.OSVersionMajor.OSVersionMinor.arch.extension"
//  "name.CompilerSDK.OSVersionMajor.arch.extension"
//  "name.CompilerSDK.arch.extension"
//  "name.CompilerSDK.OSVersionMajor.OSVersionMinor.OSVersionBugFix.extension"
//  "name.CompilerSDK.OSVersionMajor.OSVersionMinor.extension"
//  "name.CompilerSDK.OSVersionMajor.extension"
//  "name.CompilerSDK.extension"
//  "name.OSVersionMajor.OSVersionMinor.OSVersionBugFix.arch.extension"
//  "name.OSVersionMajor.OSVersionMinor.arch.extension"
//  "name.OSVersionMajor.arch.extension"
//  "name.arch.extension"
//  "name.OSVersionMajor.OSVersionMinor.OSVersionBugFix.extension"
//  "name.OSVersionMajor.OSVersionMinor.extension"
//  "name.OSVersionMajor.extension"
//  "name.extension"
//  Do not include the extension on your name.
//
//  Args:
//    name: The name for the image file you would like to find.
//
//  Returns:
//    the path if the image exists in your bundle
//    or nil if no image to be found
//
- (NSString *)gtm_pathForImageNamed:(NSString*)name;

// Generates a CGImageRef from the image at |path|
// Args:
//  path: The path to the image.
//
// Returns:
//  An autoreleased CGImageRef own, or nil if no image at path
- (CGImageRef)gtm_imageWithContentsOfFile:(NSString*)path;

//  Generates a path for a image in the save directory, which is desktop
//  by default.
//  Path will be:
//  SaveDir/|name|.arch.OSVersionMajor.OSVersionMinor.OSVersionBugfix.extension
//
//  Args:
//    name: The name for the image file you would like to generate a path for.
//
//  Returns:
//    the path
//
- (NSString *)gtm_saveToPathForImageNamed:(NSString*)name;

//  Gives us a representation of unitTestImage of |self|.
//
//  Returns:
//    a representation if successful
//    nil if failed
//
- (NSData *)gtm_imageRepresentation;

// Return the extension to be used for saving unittest states
//
// Returns
//  An extension (e.g. "gtmUTState")
- (NSString*)gtm_stateExtension;

// Save the encoded unit test state to a state file with name 
// |name|.arch.OSVersionMajor.OSVersionMinor.OSVersionBugfix.extension
// in the save folder (desktop by default)
//
//  Args:
//    name: The name for the state file you would like saved.
//
//  Returns:
//    YES if the file was successfully saved.
//
- (BOOL)gtm_saveToStateNamed:(NSString*)name;

//  Save encoded unit test state of |self| to a state file at path |path|.
//
//  Args:
//    name: The name for the state file you would like saved.
//
//  Returns:
//    YES if the file was successfully saved.
//
- (BOOL)gtm_saveToStateAt:(NSString*)path;

// Compares encoded unit test state of |self| to the state file located at |path|
//
//  Args:
//    path: the path to the state file you want to compare against.
//
//  Returns:
//    YES if they are equal, NO is they are not
//
- (BOOL)gtm_compareWithStateAt:(NSString*)path;


// Find the path for a state by name in your bundle.
//  Searches for:
//  "name.CompilerSDK.OSVersionMajor.OSVersionMinor.OSVersionBugFix.arch.extension"
//  "name.CompilerSDK.OSVersionMajor.OSVersionMinor.arch.extension"
//  "name.CompilerSDK.OSVersionMajor.arch.extension"
//  "name.CompilerSDK.arch.extension"
//  "name.CompilerSDK.OSVersionMajor.OSVersionMinor.OSVersionBugFix.extension"
//  "name.CompilerSDK.OSVersionMajor.OSVersionMinor.extension"
//  "name.CompilerSDK.OSVersionMajor.extension"
//  "name.CompilerSDK.extension"
//  "name.OSVersionMajor.OSVersionMinor.OSVersionBugFix.arch.extension"
//  "name.OSVersionMajor.OSVersionMinor.arch.extension"
//  "name.OSVersionMajor.arch.extension"
//  "name.arch.extension"
//  "name.OSVersionMajor.OSVersionMinor.OSVersionBugFix.extension"
//  "name.OSVersionMajor.OSVersionMinor.extension"
//  "name.OSVersionMajor.extension"
//  "name.extension"
//  Do not include the extension on your name.
//
//  Args:
//    name: The name for the state file you would like to find.
//
//  Returns:
//    the path if the state exists in your bundle
//    or nil if no state to be found
//
- (NSString *)gtm_pathForStateNamed:(NSString*)name;

//  Generates a path for a state in the save directory, which is desktop
//  by default.
//  Path will be:
//  SaveDir/|name|.arch.OSVersionMajor.OSVersionMinor.OSVersionBugfix.extension
//
//  Args:
//    name: The name for the state file you would like to generate a path for.
//
//  Returns:
//    the path
//
- (NSString *)gtm_saveToPathForStateNamed:(NSString*)name;

//  Gives us the encoded unit test state for |self|
//
//  Returns:
//    the encoded state if successful
//    nil if failed
//
- (NSDictionary *)gtm_stateRepresentation;

//  Encodes the state of an object in a manner suitable for comparing
//  against a master state file so we can determine whether the
//  object is in a suitable state. Encode data in the coder in the same
//  manner that you would encode data in any other Keyed NSCoder subclass.
//
//  Arguments:
//    inCoder - the coder to encode our state into
- (void)gtm_unitTestEncodeState:(NSCoder*)inCoder;  
@end

// Informal protocol for delegates that wanst to be able to add state info
// when state info is collected for their "owned" objects
@interface NSObject (GTMUnitTestingEncodingAdditions)
// Delegate function for unit test objects that have delegates. Delegates have
// the option of encoding more data into the coder to store their state for
// unittest usage.
- (void)gtm_unitTestEncoderWillEncode:(id)sender inCoder:(NSCoder*)inCoder;
@end

// Whenever an object is encoded by the unit test encoder, it send out a
// notification so that objects who want to add data to the encoded objects unit
// test state can do so. The Coder will be in the userInfo dictionary for the
// notification under the GTMUnitTestingEncoderKey key.
GTM_EXTERN NSString *const GTMUnitTestingEncodedObjectNotification;

// Key for finding the encoder in the userInfo dictionary for
// GTMUnitTestingEncodedObjectNotification notifications.
GTM_EXTERN NSString *const GTMUnitTestingEncoderKey;
