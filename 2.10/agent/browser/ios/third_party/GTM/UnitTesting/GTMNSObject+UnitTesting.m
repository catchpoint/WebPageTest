//
//  GTMNSObject+UnitTesting.m
//  
//  An informal protocol for doing advanced unittesting with objects.
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

#import "GTMNSObject+UnitTesting.h"
#import "GTMSystemVersion.h"
#import "GTMGarbageCollection.h"
#import "GTMNSNumber+64Bit.h"

#if GTM_IPHONE_SDK
#import <UIKit/UIKit.h>
#else
#import <AppKit/AppKit.h>
#endif

NSString *const GTMUnitTestingEncodedObjectNotification 
  = @"GTMUnitTestingEncodedObjectNotification";
NSString *const GTMUnitTestingEncoderKey = @"GTMUnitTestingEncoderKey";

#if GTM_IPHONE_SDK
// No UTIs on iPhone. Only two we need.
const CFStringRef kUTTypePNG = CFSTR("public.png");
const CFStringRef kUTTypeJPEG = CFSTR("public.jpeg");
#endif

// This class exists so that we can locate our bundle using [NSBundle
// bundleForClass:]. We don't use [NSBundle mainBundle] because when we are
// being run as a unit test, we aren't the mainBundle
@interface GTMUnitTestingAdditionsBundleFinder : NSObject {
  // Nothing here
}
// or here
@end

@implementation GTMUnitTestingAdditionsBundleFinder 
// Nothing here. We're just interested in the name for finding our bundle.
@end

BOOL GTMIsObjectImageEqualToImageNamed(id object, 
                                       NSString* filename, 
                                       NSString **error) {
  NSString *failString = nil;
  if (error) {
    *error = nil;
  }
  BOOL isGood = [object respondsToSelector:@selector(gtm_unitTestImage)];
  if (isGood) {
    if ([object gtm_areSystemSettingsValidForDoingImage]) {
      NSString *aPath = [object gtm_pathForImageNamed:filename];
      CGImageRef diff = nil;
      isGood = aPath != nil;
      if (isGood) {
        isGood = [object gtm_compareWithImageAt:aPath diffImage:&diff];
      }
      if (!isGood) {
        if (aPath) {
          filename = [filename stringByAppendingString:@"_Failed"];
        }
        BOOL aSaved = [object gtm_saveToImageNamed:filename];
        NSString *fileNameWithExtension 
          = [NSString stringWithFormat:@"%@.%@",
             filename, [object gtm_imageExtension]];
        NSString *fullSavePath = [object gtm_saveToPathForImageNamed:filename];
        if (NO == aSaved) {
          if (!aPath) {
            failString = [NSString stringWithFormat:@"File %@ did not exist in "
                          @"bundle. Tried to save as %@ and failed.", 
                          fileNameWithExtension, fullSavePath];
          } else {
            failString = [NSString stringWithFormat:@"Object image different "
                          @"than file %@. Tried to save as %@ and failed.", 
                          aPath, fullSavePath];
          }
        } else {
          if (!aPath) {
            failString = [NSString stringWithFormat:@"File %@ did not exist in "
                          @" bundle. Saved to %@", fileNameWithExtension, 
                          fullSavePath];
          } else {
            NSString *diffPath = [filename stringByAppendingString:@"_Diff"];
            diffPath = [object gtm_saveToPathForImageNamed:diffPath];
            NSData *data = nil;
            if (diff) {
              data = [object gtm_imageDataForImage:diff];
            }
            if ([data writeToFile:diffPath atomically:YES]) {
              failString = [NSString stringWithFormat:@"Object image different "
                            @"than file %@. Saved image to %@. "
                            @"Saved diff to %@", 
                            aPath, fullSavePath, diffPath];
            } else {
              failString = [NSString stringWithFormat:@"Object image different "
                            @"than file %@. Saved image to %@. Unable to save "
                            @"diff. Most likely the image and diff are "
                            @"different sizes.", 
                            aPath, fullSavePath];
            }
          }
        }
      }
      CGImageRelease(diff);
    } else {
      failString = @"systemSettings not valid for taking image";  // COV_NF_LINE
    }
  } else {
    failString = @"Object does not conform to GTMUnitTestingImaging protocol";
  }
  if (error) {
    *error = failString;
  }
  return isGood;
}

BOOL GTMIsObjectStateEqualToStateNamed(id object, 
                                       NSString* filename, 
                                       NSString **error) {
  NSString *failString = nil;
  if (error) {
    *error = nil;
  }
  BOOL isGood = [object conformsToProtocol:@protocol(GTMUnitTestingEncoding)];
  if (isGood) {
    NSString *aPath = [object gtm_pathForStateNamed:filename];
    isGood = aPath != nil;
    if (isGood) {
      isGood = [object gtm_compareWithStateAt:aPath];
    }
    if (!isGood) {
      if (aPath) {
        filename = [filename stringByAppendingString:@"_Failed"];
      }
      BOOL aSaved = [object gtm_saveToStateNamed:filename];
      NSString *fileNameWithExtension = [NSString stringWithFormat:@"%@.%@",
                                         filename, [object gtm_stateExtension]];
      NSString *fullSavePath = [object gtm_saveToPathForStateNamed:filename];
      if (NO == aSaved) {
        if (!aPath) {
          failString = [NSString stringWithFormat:@"File %@ did not exist in "
                        @"bundle. Tried to save as %@ and failed.", 
                        fileNameWithExtension, fullSavePath];
        } else {
          failString = [NSString stringWithFormat:@"Object state different "
                        @"than file %@. Tried to save as %@ and failed.", 
                        aPath, fullSavePath];
        }
      } else {
        if (!aPath) {
          failString = [NSString stringWithFormat:@"File %@ did not exist in "
                       @ "bundle. Saved to %@", fileNameWithExtension, 
                        fullSavePath];
        } else {
          failString = [NSString stringWithFormat:@"Object state different "
                        @"than file %@. Saved to %@", aPath, fullSavePath];
        }
      }
    }
  } else {
    failString = @"Object does not conform to GTMUnitTestingEncoding protocol"; 
  }
  if (error) {
    *error = failString;
  }
  return isGood;
}

CGContextRef GTMCreateUnitTestBitmapContextOfSizeWithData(CGSize size,
                                                          unsigned char **data) {
  CGContextRef context = NULL;
  size_t height = size.height;
  size_t width = size.width;
  size_t bytesPerRow = width * 4;
  size_t bitsPerComponent = 8;
  CGColorSpaceRef cs = NULL;
#if GTM_IPHONE_SDK
  cs = CGColorSpaceCreateDeviceRGB();
#else
  cs = CGColorSpaceCreateWithName(kCGColorSpaceGenericRGB);
#endif
  _GTMDevAssert(cs, @"Couldn't create colorspace");
  CGBitmapInfo info 
    = kCGImageAlphaPremultipliedLast | kCGBitmapByteOrderDefault;
  if (data) {
    *data = (unsigned char*)calloc(bytesPerRow, height);
    _GTMDevAssert(*data, @"Couldn't create bitmap");
  }
  context = CGBitmapContextCreate(data ? *data : NULL, width, height, 
                                  bitsPerComponent, bytesPerRow, cs, info);
  _GTMDevAssert(context, @"Couldn't create an context");
  if (!data) {
    CGContextClearRect(context, CGRectMake(0, 0, size.width, size.height));
  }
  CGContextSetRenderingIntent(context, kCGRenderingIntentRelativeColorimetric);
  CGContextSetInterpolationQuality(context, kCGInterpolationNone);
  CGContextSetShouldAntialias(context, NO);
  CGContextSetAllowsAntialiasing(context, NO);
  CGContextSetShouldSmoothFonts(context, NO);
  CGColorSpaceRelease(cs);
  return context;  
}

@interface NSObject (GTMUnitTestingAdditionsPrivate)
///  Find the path for a file named name.extension in your bundle.
//  Searches for the following:
//  "name.extension", 
//  "name.arch.extension", 
//  "name.arch.OSVersionMajor.extension"
//  "name.arch.OSVersionMajor.OSVersionMinor.extension"
//  "name.arch.OSVersionMajor.OSVersionMinor.OSVersion.bugfix.extension"
//  "name.arch.OSVersionMajor.extension"
//  "name.OSVersionMajor.arch.extension"
//  "name.OSVersionMajor.OSVersionMinor.arch.extension"
//  "name.OSVersionMajor.OSVersionMinor.OSVersion.bugfix.arch.extension"
//  "name.OSVersionMajor.extension"
//  "name.OSVersionMajor.OSVersionMinor.extension"
//  "name.OSVersionMajor.OSVersionMinor.OSVersion.bugfix.extension"
//  Do not include the ".extension" extension on your name.
//
//  Args:
//    name: The name for the file you would like to find.
//    extension: the extension for the file you would like to find
//
//  Returns:
//    the path if the file exists in your bundle
//    or nil if no file is found
//
- (NSString *)gtm_pathForFileNamed:(NSString*)name 
                         extension:(NSString*)extension;
- (NSString *)gtm_saveToPathForFileNamed:(NSString*)name 
                               extension:(NSString*)extension;
- (CGImageRef)gtm_unitTestImage;
// Returns nil if there is no override
- (NSString *)gtm_getOverrideDefaultUnitTestSaveToDirectory;
@end

// This is a keyed coder for storing unit test state data. It is used only by
// the GTMUnitTestingAdditions category. Most of the work is done in
// encodeObject:forKey:.
@interface GTMUnitTestingKeyedCoder : NSCoder {
  NSMutableDictionary *dictionary_; // storage for data (STRONG)
}

//  get the data stored in coder.
//
//  Returns:
//    NSDictionary with currently stored data.
- (NSDictionary*)dictionary; 
@end

// Small utility function for checking to see if a is b +/- 1.
GTM_INLINE BOOL almostEqual(unsigned char a, unsigned char b) {
  unsigned char diff = a > b ? a - b : b - a;
  BOOL notEqual = diff < 2;
  return notEqual;
}

@implementation GTMUnitTestingKeyedCoder

//  Set up storage for coder. Stores type and version.
//  Version 1
// 
//  Returns:
//    self
- (id)init {
  self = [super init];
  if (self != nil) {
    dictionary_ = [[NSMutableDictionary alloc] initWithCapacity:2];
    [dictionary_ setObject:@"GTMUnitTestingArchive" forKey:@"$GTMArchive"];
    
    // Version number can be changed here.
    [dictionary_ setObject:[NSNumber numberWithInt:1] forKey:@"$GTMVersion"];
  }
  return self;
}

// Standard dealloc
- (void)dealloc {
  [dictionary_ release];
  [super dealloc];
}

// Utility function for checking for a key value. We don't want duplicate keys
// in any of our dictionaries as we may be writing over data stored by previous
// objects.
//
//  Arguments:
//    key - key to check for in dictionary
- (void)checkForKey:(NSString*)key {
  _GTMDevAssert(![dictionary_ objectForKey:key], 
                @"Key already exists for %@", key);
}

// Key routine for the encoder. We store objects in our dictionary based on
// their key. As we encode objects we send out notifications to let other
// classes doing tests add their specific data to the base types. If we can't
// encode the object (it doesn't support gtm_unitTestEncodeState) and we don't 
// get any info back from the notifier, we attempt to store it's description.
//
//  Arguments:
//    objv - object to be encoded
//    key - key to encode it with
//
- (void)encodeObject:(id)objv forKey:(NSString *)key {
  // Sanity checks
  if (!objv) return;
  [self checkForKey:key];
  
  // Set up a new dictionary for the current object
  NSMutableDictionary *curDictionary = dictionary_;
  dictionary_ = [[NSMutableDictionary alloc] initWithCapacity:0];
  
  // If objv responds to gtm_unitTestEncodeState get it to record
  // its data.
  if ([objv respondsToSelector:@selector(gtm_unitTestEncodeState:)]) {
    [objv gtm_unitTestEncodeState:self];
  }
  
  // We then send out a notification to let other folks
  // add data for this object
  NSDictionary *notificationDict 
    = [NSDictionary dictionaryWithObject:self forKey:GTMUnitTestingEncoderKey];
  NSNotificationCenter *nc = [NSNotificationCenter defaultCenter];
  [nc postNotificationName:GTMUnitTestingEncodedObjectNotification
                    object:objv
                  userInfo:notificationDict];
  
  // If we got anything from the object, or from the notification, store it in
  // our dictionary. Otherwise store the description.
  if ([dictionary_ count] > 0) {
    [curDictionary setObject:dictionary_ forKey:key];
  } else {
    NSString *description = [objv description];
    // If description has a pointer value in it, we don't want to store it
    // as the pointer value can change from run to run
    if (description && [description rangeOfString:@"0x"].length == 0) {
      [curDictionary setObject:description forKey:key];
    } else {
      _GTMDevAssert(NO, @"Unable to encode forKey: %@", key);  // COV_NF_LINE
    }
  }
  [dictionary_ release];
  dictionary_ = curDictionary;
}

//  Basic encoding methods for POD types.
//
//  Arguments:
//    *v - value to encode
//    key - key to encode it in

- (void)encodeBool:(BOOL)boolv forKey:(NSString *)key {
  [self checkForKey:key];
  [dictionary_ setObject:[NSNumber numberWithBool:boolv] forKey:key];
}

- (void)encodeInt:(int)intv forKey:(NSString *)key {
  [self checkForKey:key];
  [dictionary_ setObject:[NSNumber numberWithInt:intv] forKey:key];
}

- (void)encodeInt32:(int32_t)intv forKey:(NSString *)key {
  [self checkForKey:key];
  [dictionary_ setObject:[NSNumber numberWithLong:intv] forKey:key];
}

- (void)encodeInt64:(int64_t)intv forKey:(NSString *)key {
  [self checkForKey:key];
  [dictionary_ setObject:[NSNumber numberWithLongLong:intv] forKey:key];
}

- (void)encodeFloat:(float)realv forKey:(NSString *)key {
  [self checkForKey:key];
  [dictionary_ setObject:[NSNumber numberWithFloat:realv] forKey:key];
}

- (void)encodeDouble:(double)realv forKey:(NSString *)key {
  [self checkForKey:key];
  [dictionary_ setObject:[NSNumber numberWithDouble:realv] forKey:key];
}

- (void)encodeBytes:(const uint8_t *)bytesp 
             length:(NSUInteger)lenv 
             forKey:(NSString *)key {
  [self checkForKey:key];
  [dictionary_ setObject:[NSData dataWithBytes:bytesp 
                                        length:lenv] 
                  forKey:key];
}

//  Get our storage back as an NSDictionary
//  
//  Returns:
//    NSDictionary containing our encoded info
-(NSDictionary*)dictionary {
  return [[dictionary_ retain] autorelease];
}

@end

static NSString *gGTMUnitTestSaveToDirectory = nil;

@implementation NSObject (GTMUnitTestingAdditions)

+ (void)gtm_setUnitTestSaveToDirectory:(NSString*)path {
  @synchronized([self class]) {
    [gGTMUnitTestSaveToDirectory autorelease];
    gGTMUnitTestSaveToDirectory = [path copy];
  }
}

+ (NSString *)gtm_getUnitTestSaveToDirectory {
  NSString *result = nil;
  @synchronized([self class]) {
    if (!gGTMUnitTestSaveToDirectory) {
#if GTM_IPHONE_SDK
      // Developer build, use their home directory Desktop.
      gGTMUnitTestSaveToDirectory 
        = [[[[[NSHomeDirectory() stringByDeletingLastPathComponent] 
              stringByDeletingLastPathComponent] 
             stringByDeletingLastPathComponent] 
            stringByDeletingLastPathComponent] 
           stringByAppendingPathComponent:@"Desktop"];
#else
      NSArray *desktopDirs 
        = NSSearchPathForDirectoriesInDomains(NSDesktopDirectory, 
                                              NSUserDomainMask,
                                              YES);
      gGTMUnitTestSaveToDirectory = [desktopDirs objectAtIndex:0];
#endif    
      // Did we get overridden?
      NSString *override = [self gtm_getOverrideDefaultUnitTestSaveToDirectory];
      if (override) {
        gGTMUnitTestSaveToDirectory = override;
      }
      [gGTMUnitTestSaveToDirectory retain];
    }
    result = gGTMUnitTestSaveToDirectory;
  }
  
  return result;
}

// Return nil if there is no override
- (NSString *)gtm_getOverrideDefaultUnitTestSaveToDirectory {
  NSString *result = nil;

  // If we have an environment variable that ends in "BUILD_NUMBER" odds are
  // we're on an automated build system, so use the build products dir as an
  // override instead of writing on the desktop.
  NSDictionary *env = [[NSProcessInfo processInfo] environment];
  NSString *key;
  GTM_FOREACH_KEY(key, env) {
    if ([key hasSuffix:@"BUILD_NUMBER"]) {
      break;
    }
  }
  if (key) {
    result = [env objectForKey:@"BUILT_PRODUCTS_DIR"];
  }
  
  if (result && [result length] == 0) {
    result = nil;
  }
  return result;
}

///  Find the path for a file named name.extension in your bundle.
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
//  Do not include the ".extension" extension on your name.
//
//  Args:
//    name: The name for the file you would like to find.
//    extension: the extension for the file you would like to find
//
//  Returns:
//    the path if the file exists in your bundle
//    or nil if no file is found
//
- (NSString *)gtm_pathForFileNamed:(NSString*)name 
                         extension:(NSString*)extension {
  NSString *thePath = nil;
  Class bundleClass = [GTMUnitTestingAdditionsBundleFinder class];
  NSBundle *myBundle = [NSBundle bundleForClass:bundleClass];
  _GTMDevAssert(myBundle, 
                @"Couldn't find bundle for class: %@ searching for file:%@.%@", 
                NSStringFromClass(bundleClass), name, extension);
  // System Version
  SInt32 major, minor, bugFix;
  [GTMSystemVersion getMajor:&major minor:&minor bugFix:&bugFix];
  NSString *systemVersions[4];
  systemVersions[0] = [NSString stringWithFormat:@".%d.%d.%d", 
                       major, minor, bugFix];
  systemVersions[1] = [NSString stringWithFormat:@".%d.%d", major, minor];
  systemVersions[2] = [NSString stringWithFormat:@".%d", major];
  systemVersions[3] = @"";
  // Architecture
  NSString *architecture[2];
  architecture[0] 
    = [NSString stringWithFormat:@".%@", 
       [GTMSystemVersion runtimeArchitecture]];
  architecture[1] = @"";
  // Compiler SDK
#if GTM_MACOS_SDK
  // Some times Apple changes how things work based on the SDK built against.
  NSString *sdks[2];
# if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_6
  sdks[0] = @".10_6_SDK";
# elif MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
  sdks[0] = @".10_5_SDK";
# elif MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_4
  sdks[0] = @".10_4_SDK";
# elif MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_3
  sdks[0] = @".10_3_SDK";
# elif MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_2
  sdks[0] = @".10_2_SDK";
# elif MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_1
  sdks[0] = @".10_1_SDK";
# else
  sdks[0] = @".10_0_SDK";
# endif
  sdks[1] = @"";
#else  // !GTM_MACOS_SDK
  // iPhone doesn't current support SDK specific images (hopefully it won't
  // be needed.
  NSString *sdks[] = { @"" };
#endif  // GTM_MACOS_SDK
  
  // Note that we are searching for the most exact match first.
  for (size_t i = 0; 
       !thePath && i < sizeof(sdks) / sizeof(*sdks); 
       ++i) {
    for (size_t j = 0; 
         !thePath && j < sizeof(architecture) / sizeof(*architecture); 
         j++) {
      for (size_t k = 0;
           !thePath && k < sizeof(systemVersions) / sizeof(*systemVersions); 
           k++) {
        NSString *fullName = [NSString stringWithFormat:@"%@%@%@%@", 
                    name, sdks[i], systemVersions[k], architecture[j]];
        thePath = [myBundle pathForResource:fullName ofType:extension];
      }
    }
  }
  
  return thePath;
}  

- (NSString *)gtm_saveToPathForFileNamed:(NSString*)name 
                               extension:(NSString*)extension {  
  NSString *systemArchitecture = [GTMSystemVersion runtimeArchitecture];
  
  SInt32 major, minor, bugFix;
  [GTMSystemVersion getMajor:&major minor:&minor bugFix:&bugFix];
  
  // We don't include the CompilerSDK in here because it is not something that
  // that is commonly needed.
  NSString *fullName = [NSString stringWithFormat:@"%@.%d.%d.%d.%@", 
                        name, major, minor, bugFix, systemArchitecture];
  
  NSString *basePath = [[self class] gtm_getUnitTestSaveToDirectory];
  return [[basePath stringByAppendingPathComponent:fullName]
          stringByAppendingPathExtension:extension];
}

#pragma mark UnitTestImage

// Checks to see that system settings are valid for doing an image comparison.
// To be overridden by subclasses.
// Returns:
//  YES if we can do image comparisons for this object type.
- (BOOL)gtm_areSystemSettingsValidForDoingImage {
  return YES;
}

- (CFStringRef)gtm_imageUTI {
#if GTM_IPHONE_SDK
  return kUTTypePNG;
#else
  // Currently can't use PNG on Leopard. (10.5.2)
  // Radar:5844618 PNG importer/exporter in ImageIO is lossy
  return kUTTypeTIFF;
#endif
}

// Return the extension to be used for saving unittest images
//
// Returns
//  An extension (e.g. "png")
- (NSString*)gtm_imageExtension {
  CFStringRef uti = [self gtm_imageUTI];
#if GTM_IPHONE_SDK
  if (CFEqual(uti, kUTTypePNG)) {
    return @"png";
  } else if (CFEqual(uti, kUTTypeJPEG)) {
    return @"jpg";
  } else {
    _GTMDevAssert(NO, @"Illegal UTI for iPhone");
  }
  return nil;
#else
  CFStringRef extension 
    = UTTypeCopyPreferredTagWithClass(uti, kUTTagClassFilenameExtension);
  _GTMDevAssert(extension, @"No extension for uti: %@", uti);
  
  return GTMCFAutorelease(extension);
#endif
}

// Return image data in the format expected for gtm_imageExtension
// So for a "png" extension I would expect "png" data
//
// Returns
//  NSData for image
- (NSData*)gtm_imageDataForImage:(CGImageRef)image {
  NSData *data = nil;
#if GTM_IPHONE_SDK
  // iPhone support
  UIImage *uiImage = [UIImage imageWithCGImage:image];
  CFStringRef uti = [self gtm_imageUTI];
  if (CFEqual(uti, kUTTypePNG)) {
    data = UIImagePNGRepresentation(uiImage);
  } else if (CFEqual(uti, kUTTypeJPEG)) {
    data = UIImageJPEGRepresentation(uiImage, 1.0f);
  } else {
    _GTMDevAssert(NO, @"Illegal UTI for iPhone");
  }
#else
  data = [NSMutableData data];
  CGImageDestinationRef dest 
    = CGImageDestinationCreateWithData((CFMutableDataRef)data,
                                       [self gtm_imageUTI],
                                       1,
                                       NULL);
  // LZW Compression for TIFF
  NSDictionary *tiffDict 
    = [NSDictionary dictionaryWithObjectsAndKeys:
       [NSNumber gtm_numberWithUnsignedInteger:NSTIFFCompressionLZW],
       (const NSString*)kCGImagePropertyTIFFCompression,
       nil];
  NSDictionary *destProps 
    = [NSDictionary dictionaryWithObjectsAndKeys:
       [NSNumber numberWithFloat:1.0f], 
       (const NSString*)kCGImageDestinationLossyCompressionQuality,
       tiffDict,
       (const NSString*)kCGImagePropertyTIFFDictionary,
       nil];
  CGImageDestinationAddImage(dest, image, (CFDictionaryRef)destProps);
  CGImageDestinationFinalize(dest);
  CFRelease(dest);
#endif
  return data;
  
}

// Save the unitTestImage to an image file with name |name| at
// ~/Desktop/|name|.extension. 
//
//  Note: When running under Pulse automation output is redirected to the
//  Pulse base directory.
//
//  Args:
//    name: The name for the image file you would like saved.
//
//  Returns:
//    YES if the file was successfully saved.
//
- (BOOL)gtm_saveToImageNamed:(NSString*)name {
  NSString *newPath = [self gtm_saveToPathForImageNamed:name];
  return [self gtm_saveToImageAt:newPath];
}

//  Save unitTestImage of |self| to an image file at path |path|.
//
//  Args:
//    name: The name for the image file you would like saved.
//
//  Returns:
//    YES if the file was successfully saved.
//
- (BOOL)gtm_saveToImageAt:(NSString*)path {
  if (!path) return NO;
  NSData *data = [self gtm_imageRepresentation];
  return [data writeToFile:path atomically:YES];
}

// Generates a CGImageRef from the image at |path|
// Args:
//  path: The path to the image.
//
// Returns:
//  A CGImageRef that you own, or nil if no image at path
- (CGImageRef)gtm_imageWithContentsOfFile:(NSString*)path {
  CGImageRef imageRef = nil;
#if GTM_IPHONE_SDK
  UIImage *image = [UIImage imageWithContentsOfFile:path];
  if (image) {
    imageRef = CGImageRetain(image.CGImage);
  }
#else
  CFURLRef url = CFURLCreateWithFileSystemPath(NULL, (CFStringRef)path, 
                                               kCFURLPOSIXPathStyle, NO);
  if (url) {
    CGImageSourceRef imageSource = CGImageSourceCreateWithURL(url, NULL);
    CFRelease(url);
    if (imageSource) {
      imageRef = CGImageSourceCreateImageAtIndex(imageSource, 0, NULL);
      CFRelease(imageSource);
    }
  }
#endif
  return (CGImageRef)GTMCFAutorelease(imageRef);
}

///  Compares unitTestImage of |self| to the image located at |path|
//
//  Args:
//    path: the path to the image file you want to compare against.
//    If diff is non-nil, it will contain an auto-released diff of the images.
//
//  Returns:
//    YES if they are equal, NO is they are not
//    If diff is non-nil, it will contain an auto-released diff of the images.
//
- (BOOL)gtm_compareWithImageAt:(NSString*)path diffImage:(CGImageRef*)diff {
  BOOL answer = NO;
  if (diff) {
    *diff = nil;
  }
  CGImageRef fileRep = [self gtm_imageWithContentsOfFile:path];
  _GTMDevAssert(fileRep, @"Unable to create imagerep from %@", path);
  
  CGImageRef imageRep = [self gtm_unitTestImage];
  _GTMDevAssert(imageRep, @"Unable to create imagerep for %@", self);

  size_t fileHeight = CGImageGetHeight(fileRep);
  size_t fileWidth = CGImageGetWidth(fileRep);
  size_t imageHeight = CGImageGetHeight(imageRep);
  size_t imageWidth = CGImageGetWidth(imageRep);
  if (fileHeight == imageHeight && fileWidth == imageWidth) {
    // if all the sizes are equal, run through the bytes and compare
    // them for equality.
    // Do an initial fast check, if this fails and the caller wants a 
    // diff, we'll do the slow path and create the diff. The diff path
    // could be optimized, but probably not necessary at this point.
    answer = YES;
    
    CGSize imageSize = CGSizeMake(fileWidth, fileHeight);
    CGRect imageRect = CGRectMake(0, 0, fileWidth, fileHeight);
    unsigned char *fileData;
    unsigned char *imageData;
    CGContextRef fileContext 
      = GTMCreateUnitTestBitmapContextOfSizeWithData(imageSize, &fileData);
    _GTMDevAssert(fileContext, @"Unable to create filecontext");
    CGContextDrawImage(fileContext, imageRect, fileRep);
    CGContextRef imageContext
      = GTMCreateUnitTestBitmapContextOfSizeWithData(imageSize, &imageData);
    _GTMDevAssert(imageContext, @"Unable to create imageContext");
    CGContextDrawImage(imageContext, imageRect, imageRep);
    
    size_t fileBytesPerRow = CGBitmapContextGetBytesPerRow(fileContext);
    size_t imageBytesPerRow = CGBitmapContextGetBytesPerRow(imageContext);
    size_t row, col;
    
    _GTMDevAssert(imageWidth * 4 <= imageBytesPerRow, 
                  @"We expect image data to be 32bit RGBA");
    
    for (row = 0; row < fileHeight && answer; row++) {
      answer = memcmp(fileData + fileBytesPerRow * row,
                      imageData + imageBytesPerRow * row,
                      imageWidth * 4) == 0;
    }
    if (!answer && diff) {
      answer = YES;
      unsigned char *diffData;
      CGContextRef diffContext 
        = GTMCreateUnitTestBitmapContextOfSizeWithData(imageSize, &diffData);
      _GTMDevAssert(diffContext, @"Can't make diff context");
      size_t diffRowBytes = CGBitmapContextGetBytesPerRow(diffContext);
      for (row = 0; row < imageHeight; row++) {
        uint32_t *imageRow = (uint32_t*)(imageData + imageBytesPerRow * row);
        uint32_t *fileRow = (uint32_t*)(fileData + fileBytesPerRow * row);
        uint32_t* diffRow = (uint32_t*)(diffData + diffRowBytes * row);
        for (col = 0; col < imageWidth; col++) {
          uint32_t imageColor = imageRow[col];
          uint32_t fileColor = fileRow[col];
          
          unsigned char imageAlpha = imageColor & 0xF;
          unsigned char imageBlue = imageColor >> 8 & 0xF;
          unsigned char imageGreen = imageColor >> 16 & 0xF;
          unsigned char imageRed = imageColor >> 24 & 0xF;
          unsigned char fileAlpha = fileColor & 0xF;
          unsigned char fileBlue = fileColor >> 8 & 0xF;
          unsigned char fileGreen = fileColor >> 16 & 0xF;
          unsigned char fileRed = fileColor >> 24 & 0xF;
          
          // Check to see if color is almost right.
          // No matter how hard I've tried, I've still gotten occasionally
          // screwed over by colorspaces not mapping correctly, and small
          // sampling errors coming in. This appears to work for most cases.
          // Almost equal is defined to check within 1% on all components.
          BOOL equal = almostEqual(imageRed, fileRed) &&
          almostEqual(imageGreen, fileGreen) &&
          almostEqual(imageBlue, fileBlue) &&
          almostEqual(imageAlpha, fileAlpha);
          answer &= equal;
          if (diff) {
            uint32_t newColor;
            if (equal) {
              newColor = (((uint32_t)imageRed) << 24) + 
              (((uint32_t)imageGreen) << 16) + 
              (((uint32_t)imageBlue) << 8) + 
              (((uint32_t)imageAlpha) / 2);
            } else {
              newColor = 0xFF0000FF;
            }
            diffRow[col] = newColor;
          }
        }
      }
      *diff = CGBitmapContextCreateImage(diffContext);
      free(diffData);
      CFRelease(diffContext);
    }       
    free(fileData);
    CFRelease(fileContext);
    free(imageData);
    CFRelease(imageContext);
  }
  return answer;
}

//  Find the path for an image by name in your bundle.
//  Do not include the extension on your name.
//
//  Args:
//    name: The name for the image file you would like to find.
//
//  Returns:
//    the path if the image exists in your bundle
//    or nil if no image to be found
//
- (NSString *)gtm_pathForImageNamed:(NSString*)name {
  return [self gtm_pathForFileNamed:name 
                          extension:[self gtm_imageExtension]];
}

- (NSString *)gtm_saveToPathForImageNamed:(NSString*)name {
  return [self gtm_saveToPathForFileNamed:name 
                                extension:[self gtm_imageExtension]];
}

//  Gives us a representation of unitTestImage of |self|.
//
//  Returns:
//    a representation of image if successful
//    nil if failed
//
- (NSData *)gtm_imageRepresentation {
  CGImageRef imageRep = [self gtm_unitTestImage];
  NSData *data = [self gtm_imageDataForImage:imageRep];
  _GTMDevAssert(data, @"unable to create %@ from %@", 
                [self gtm_imageExtension], self);
  return data;
}

#pragma mark UnitTestState

// Return the extension to be used for saving unittest states
//
// Returns
//  An extension (e.g. "gtmUTState")
- (NSString*)gtm_stateExtension {
  return @"gtmUTState";
}

//  Save the encoded unit test state to a state file with name |name| at
//  ~/Desktop/|name|.extension.
//
//  Note: When running under Pulse automation output is redirected to the
//  Pulse base directory.
//
//  Args:
//    name: The name for the state file you would like saved.
//
//  Returns:
//    YES if the file was successfully saved.
//
- (BOOL)gtm_saveToStateNamed:(NSString*)name {
  NSString *newPath = [self gtm_saveToPathForStateNamed:name];
  return [self gtm_saveToStateAt:newPath];
}

//  Save encoded unit test state of |self| to a state file at path |path|.
//
//  Args:
//    name: The name for the state file you would like saved.
//
//  Returns:
//    YES if the file was successfully saved.
//
- (BOOL)gtm_saveToStateAt:(NSString*)path {
  if (!path) return NO;
  NSDictionary *dictionary = [self gtm_stateRepresentation];
  return [dictionary writeToFile:path atomically:YES];
}

//  Compares encoded unit test state of |self| to the state file located at
//  |path|
//
//  Args:
//    path: the path to the state file you want to compare against.
//
//  Returns:
//    YES if they are equal, NO is they are not
//
- (BOOL)gtm_compareWithStateAt:(NSString*)path {
  NSDictionary *masterDict = [NSDictionary dictionaryWithContentsOfFile:path];
  _GTMDevAssert(masterDict, @"Unable to create dictionary from %@", path);
  NSDictionary *selfDict = [self gtm_stateRepresentation];
  return [selfDict isEqual: masterDict];
}

//  Find the path for a state by name in your bundle.
//  Do not include the extension.
//
//  Args:
//    name: The name for the state file you would like to find.
//
//  Returns:
//    the path if the state exists in your bundle
//    or nil if no state to be found
//
- (NSString *)gtm_pathForStateNamed:(NSString*)name {
  return [self gtm_pathForFileNamed:name extension:[self gtm_stateExtension]];
}

- (NSString *)gtm_saveToPathForStateNamed:(NSString*)name {
  return [self gtm_saveToPathForFileNamed:name 
                                extension:[self gtm_stateExtension]];
}

//  Gives us the encoded unit test state |self|
//
//  Returns:
//    the encoded state if successful
//    nil if failed
//
- (NSDictionary *)gtm_stateRepresentation {
  NSDictionary *dictionary = nil;
  if ([self conformsToProtocol:@protocol(GTMUnitTestingEncoding)]) {
    id<GTMUnitTestingEncoding> encoder = (id<GTMUnitTestingEncoding>)self;
    GTMUnitTestingKeyedCoder *archiver;
    archiver = [[[GTMUnitTestingKeyedCoder alloc] init] autorelease];
    [encoder gtm_unitTestEncodeState:archiver];
    dictionary = [archiver dictionary];
  }
  return dictionary;
}

//  Encodes the state of an object in a manner suitable for comparing
//  against a master state file so we can determine whether the
//  object is in a suitable state. Encode data in the coder in the same
//  manner that you would encode data in any other Keyed NSCoder subclass.
//
//  Arguments:
//    inCoder - the coder to encode our state into
- (void)gtm_unitTestEncodeState:(NSCoder*)inCoder {
  // All impls of gtm_unitTestEncodeState
  // should be calling [super gtm_unitTestEncodeState] as their first action.
  _GTMDevAssert([inCoder isKindOfClass:[GTMUnitTestingKeyedCoder class]], 
                @"Coder must be of kind GTMUnitTestingKeyedCoder");
  
  // If the object has a delegate, give it a chance to respond
  if ([self respondsToSelector:@selector(delegate)]) {
    id delegate = [self performSelector:@selector(delegate)];
    if (delegate && 
        [delegate respondsToSelector:@selector(gtm_unitTestEncoderWillEncode:inCoder:)]) {
      [delegate gtm_unitTestEncoderWillEncode:self inCoder:inCoder];
    }
  }
}

@end
