/******************************************************************************
 Copyright (c) 2012, Google Inc.
 All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 * Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice,
 this list of conditions and the following disclaimer in the documentation
 and/or other materials provided with the distribution.
 * Neither the name of Google Inc. nor the names of its contributors
 may be used to endorse or promote products derived from this software
 without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

 Created by Sam Kerner on 10/12/2011.

 ******************************************************************************/

#import "WebPageTest.h"

#import "VideoFrameGrabber.h"
#import "WebPageTestAgentInfo.h"
#import "WebPageTestMeasurement.h"

#import "ASIFormDataRequest.h"
#import "GTMDefines.h"
#import "GTMNSDictionary+URLArguments.h"
#import "NSObject+SBJSON.h"

// Clamp |value| into the range [min..max].
static int clampToRange(int minValue, int maxValue, int value) {
  return MIN(maxValue, MAX(minValue, value));
}

@interface WebPageTest (Private)
// Every request that posts results to the webpagetest server sends
// common data to identify itself.  Build a POST request with this
// common information set.
+ (ASIFormDataRequest*)buildRequestWithURLPath:(NSString *)URLPath
                                     agentInfo:(WebPageTestAgentInfo *)agentInfo
                                        taskId:(NSString *)taskId;

// Upload an image.  Screenshots and video frames are uploaded
// using this method.
+ (BOOL)uploadImageData:(NSData *)imageData
           withFileName:(NSString *)fileName
              agentInfo:(WebPageTestAgentInfo *)agentInfo
                 taskId:(NSString *)taskId
                  error:(NSError **)error;

// Encode an image for upload.  |imageQuality| should be in [0..100].
// A warning will be logged if it is outside that range.  The image is
// resized by |scaleFactor|.  For example, to make an image half as
// wide and half as tall, set |scaleFactor| to 0.5 .
+ (NSData*)encodeUIImage:(UIImage *)image
             withQuality:(int)imageQuality
             scaleFactor:(float)scaleFactor;

@end

@implementation WebPageTest

+ (ASIFormDataRequest*)buildRequestWithURLPath:(NSString *)URLPath
                                     agentInfo:(WebPageTestAgentInfo *)agentInfo
                                        taskId:(NSString *)taskId {
  NSURL *fullURL = [NSURL URLWithString:URLPath
                          relativeToURL:agentInfo.serverBaseURL];

  ASIFormDataRequest *request = [ASIFormDataRequest requestWithURL:fullURL];

  [request setPostValue:agentInfo.location forKey:kWptPostLocation];
  [request setPostValue:agentInfo.key forKey:kWptPostKey];
  [request setPostValue:taskId forKey:kWptPostId];

  return request;
}

// Upload an image.  Screenshots and video frames are uploaded
// using this method.
+ (BOOL)uploadImageData:(NSData *)imageData
           withFileName:(NSString *)fileName
              agentInfo:(WebPageTestAgentInfo *)agentInfo
                 taskId:(NSString *)taskId
                  error:(NSError **)error {
  ASIFormDataRequest *request =
      [WebPageTest buildRequestWithURLPath:kWptURLPathImage
                                 agentInfo:agentInfo
                                    taskId:taskId];
  [request setData:imageData
      withFileName:fileName
    andContentType:kWptMimeTypeJpeg
            forKey:kWptPostFile];

  [request startSynchronous];

  NSError *imageUploadError = [request error];
  if (imageUploadError != nil) {
    if (error)
      *error = imageUploadError;

    return NO;
  }
  NSString *response = [request responseString];
  NSLog(@"Got response for image upload: \"%@\"", response);

  return YES;
}

+ (NSData*)encodeUIImage:(UIImage *)image
             withQuality:(int)imageQuality
             scaleFactor:(float)scaleFactor {
  CGImageRef initialImageRef = image.CGImage;
  CGImageRef scaledImageRef = nil;

  if (scaleFactor == 1.0) {
    // No need to scale.
    scaledImageRef = CGImageRetain(initialImageRef);

  } else {
    // Create a bitmap context with the desired size.
    CGContextRef context = CGBitmapContextCreate(
        NULL,
        CGImageGetWidth(initialImageRef) * scaleFactor,
        CGImageGetHeight(initialImageRef) * scaleFactor,
        CGImageGetBitsPerComponent(initialImageRef),
        ceil(CGImageGetBytesPerRow(initialImageRef) * scaleFactor),
        CGImageGetColorSpace(initialImageRef),
        CGImageGetAlphaInfo(initialImageRef));

    if (!context) {
      NSLog(@"Failed to create drawing context for image scaling.");
      return nil;
    }

    // Draw the image into the context.  Image will be scaled to fit.
    CGContextDrawImage(context,
                       CGContextGetClipBoundingBox(context),
                       initialImageRef);

    scaledImageRef = CGBitmapContextCreateImage(context);
    CGContextRelease(context);
  }

  int clampedImageQuality = clampToRange(0, 100, imageQuality);
  if (clampedImageQuality != imageQuality) {
    NSLog(@"Warning: Image quality should be in the range [0..100].  "
           "Clamping value %d to %d.", imageQuality, clampedImageQuality);
  }

  // UIImageJPEGRepresentation expects a quality parameter in [0.0..1.0] .
  float uiImageQuailyParam = clampedImageQuality / 100.0;
  UIImage *scaledImage = [UIImage imageWithCGImage:scaledImageRef];
  NSData *imageEncodedAsJpeg =
      [NSData dataWithData:UIImageJPEGRepresentation(scaledImage,
                                                     uiImageQuailyParam)];
  CGImageRelease(scaledImageRef);
  return imageEncodedAsJpeg;
}

+ (NSURLRequest *)URLRequestForCheckin:(VeloCheckinSubmission *)checkin
                              onServer:(NSURL *)serverURL
                          withSettings:(NSUserDefaults *)settings {
  // To fetch work from the WebPageTest server, we fetch a URL with params
  // that tell the server what kind of agent we are.

  // TODO(skerner): |checkin| has lots of interesting information about the
  // device.  Extend the WebPageTest server to take it into account.  Send
  // it to the server here.  The server's current notion of "Location" may
  // need to be extended to do this.

  NSString *location = [settings stringForKey:kWptSettingsLocation];
  NSMutableDictionary *requestParams =
      [NSMutableDictionary dictionaryWithObjectsAndKeys:
          kWptParamJson, kWptParamFormat,
               location, kWptParamLocation,
           kWptParamIos, kWptParamSoftware,
                    nil];

  NSString* key = [settings stringForKey:kWptSettingsKey];
  if ([key length] > 0)
    [requestParams setValue:key forKey:kWptParamKey];

  NSString* pc = [settings stringForKey:kWptSettingsPc];
  if ([pc length] > 0)
    [requestParams setValue:pc forKey:kWptParamPc];

  NSString *baseURLString =
      [[serverURL URLByAppendingPathComponent:kWptURLPathGetWork]
          absoluteString];

  // Add params to the base URL by appending the key value pairs in
  //|requestParams|.  gtm_httpArgumentsString takes care of escaping.
  NSString *URLStringWithParams =
     [NSString stringWithFormat:@"%@?%@",
         baseURLString, [requestParams gtm_httpArgumentsString]];

  NSURL *requestURL = [NSURL URLWithString:URLStringWithParams];
  NSLog(@"WebPageTest server URL with params is: %@", requestURL);

  NSMutableURLRequest *request =
      [NSMutableURLRequest requestWithURL:requestURL];

  [request setHTTPMethod:@"GET"];

  return request;
}

+ (NSURLRequest*)buildRequestToMeasureUrl:(NSURL *)url
                          withCachePolicy:(NSURLRequestCachePolicy)cachePolicy {
  NSMutableURLRequest *request =
      [NSMutableURLRequest requestWithURL:url
                              cachePolicy:cachePolicy
                          timeoutInterval:kWptPageLoadTimeLimit];

  [request setHTTPMethod:@"GET"];
  return request;
}

+ (BOOL)uploadScreenshot:(UIImage *)screenshot
           withAgentInfo:(WebPageTestAgentInfo *)agentInfo
                  taskId:(NSString *)taskId
         measurementInfo:(WebPageTestMeasurement *)measurementInfo
            imageQuality:(int)imageQuality
                   error:(NSError **)error {
  NSData *imageData = [WebPageTest encodeUIImage:screenshot
                                     withQuality:imageQuality
                                     scaleFactor:kWptScreenshotScaleFactor];

  NSString *cacheString =
      (measurementInfo.isFirstView ? kWptPostUncached : kWptPostCached);

  NSString *fileName =
      [NSString stringWithFormat:kWptPostScreenshotFileNameFormat,
          measurementInfo.runNumber, cacheString];

  return [WebPageTest uploadImageData:imageData
                         withFileName:fileName
                            agentInfo:agentInfo
                               taskId:taskId
                                error:error];
}

+ (BOOL)uploadHar:(NSDictionary *)harDict
    withAgentInfo:(WebPageTestAgentInfo *)agentInfo
           taskId:(NSString *)taskId
             done:(BOOL)done
            error:(NSError **)error {

  ASIFormDataRequest *request =
      [WebPageTest buildRequestWithURLPath:kWptURLPathWorkDone
                                 agentInfo:agentInfo
                                    taskId:taskId];

  NSString *harAsString = [harDict JSONRepresentation];
  NSData *harAsData = [harAsString dataUsingEncoding:NSUTF8StringEncoding];

  [request setData:harAsData
      withFileName:kWptPostHarFile
    andContentType:kWptMimeTypeJson
            forKey:kWptPostFile];
  [request setPostValue:kWptPostTrueValue forKey:kWptPostHar];

  if (done)
    [request setPostValue:kWptPostTrueValue forKey:kWptPostDone];

  [request startSynchronous];

  NSError *harUploadError = [request error];
  if (harUploadError != nil) {
    if (error)
      *error = harUploadError;

    return NO;
  }
  NSString *response = [request responseString];
  NSLog(@"Got response for HAR upload: \"%@\"", response);

  return YES;
}

+ (BOOL)uploadVideoFrames:(NSArray *)videoFrames
            withAgentInfo:(WebPageTestAgentInfo *)agentInfo
                   taskId:(NSString *)taskId
          measurementInfo:(WebPageTestMeasurement *)measurementInfo
             imageQuality:(int)imageQuality
                    error:(NSError **)error {
  NSString *cacheString =
      (measurementInfo.isFirstView ? kWptPostUncached : kWptPostCached);

  for (VideoFrameRecord *frameRecord in videoFrames) {
    // |frameRecord.timestamp| is an NSTimeInterval, which represents time as
    // a number of seconds.  The WebPageTest server expects the file name to
    // include the time as the integer number of tenths of seconds.
    int timestamp = (int)(frameRecord.timestamp * kWptSecToImageTimeFileName);

    NSString *fileName =
        [NSString stringWithFormat:kWptPostVideoFrameFileNameFormat,
            measurementInfo.runNumber, cacheString, timestamp];

    NSData *frameAsEncodedJpeg =
        [WebPageTest encodeUIImage:frameRecord.frame
                       withQuality:imageQuality
                       scaleFactor:kWptVideoFrameScaleFactor];

    NSLog(@"Uploading video frame with file name \"%@\"", fileName);
    if (![WebPageTest uploadImageData:frameAsEncodedJpeg
                         withFileName:fileName
                            agentInfo:agentInfo
                               taskId:taskId
                                error:error])
      return NO;
  }

  return YES;
}

@end
