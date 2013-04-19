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

 Created by Sam Kerner on 10/19/2011.

 ******************************************************************************/

#import "WebPageTestAgentViewControllerDelegate.h"

#import "Autobox.h"
#import "GTMDefines.h"
#import "WebPageTest.h"
#import "WebPageTestAgentInfo.h"
#import "WebPageTestMeasurement.h"
#import "WebPageTestMeasurementEnumerator.h"

@interface WebPageTestAgentViewControllerDelegate (private)

- (BOOL)uploadMeasurementWithTimingData:(NSDictionary *)timingData
                                harDict:(NSDictionary *)harDict
                             screenshot:(UIImage *)screenshot
                             deviceInfo:(VeloDeviceInfo *)deviceInfo
                            videoFrames:(NSArray *)videoFrames
                     isFinalMeasurement:(BOOL)isFinalMeasurement
                                  error:(NSError **)error;
@end

@implementation WebPageTestAgentViewControllerDelegate

@synthesize workUnit = workUnit_;
@synthesize serverURL = serverURL_;
@synthesize measurementEnumerator = measurementEnumerator_;
@synthesize currentMeasurement = currentMeasurement_;

- (void)dealloc {
  [workUnit_ release];
  [measurementEnumerator_ release];
  [currentMeasurement_ release];

  [super dealloc];
}

- (NSURL*)serverURL {
  NSString *serverString =
      [[NSUserDefaults standardUserDefaults] stringForKey:kWptSettingsServer];
  return [NSURL URLWithString: serverString];
}

- (NSURLRequest *)URLRequestForCheckin:(VeloCheckinSubmission *)checkin {
  NSUserDefaults *settings = [NSUserDefaults standardUserDefaults];

  return [WebPageTest URLRequestForCheckin:checkin
                                  onServer:self.serverURL
                              withSettings:settings];
}

- (void)parseCheckinResponse:(NSDictionary *)response {
  _GTMDevAssert(!self.currentMeasurement,
                @"Should not check in with measurements to be done.");

  // If there is no work to be done, response will be nil.
  self.workUnit = response;

  if (self.workUnit) {
    self.measurementEnumerator =
        [[[WebPageTestMeasurementEnumerator alloc]
            initWithWorkUnit:self.workUnit] autorelease];
    self.currentMeasurement = [self.measurementEnumerator nextMeasurement];
    NSLog(@"New current measurement: %@", self.currentMeasurement);
  } else {
    self.measurementEnumerator = nil;
    self.currentMeasurement = nil;
  }
}

- (BOOL)haveMeasurementToDo {
  // When results are received, |currentMeasurement| is updated to the
  // next measurement to be done.
  return (self.currentMeasurement != nil);
}

- (NSURL*)urlToMeasure {
  if (self.currentMeasurement == nil)
    return nil;

  return self.currentMeasurement.url;
}

- (int)imageQuality {
  NSDecimalNumber *result = [self.workUnit valueForKey:kWptWorkKeyImageQuality];
  return (result != nil ? [result intValue] : kWptWorkDefaultImageQuality);
}

- (NSString*)taskId {
  return [self.workUnit valueForKey:kWptWorkKeyTestId];
}

- (NSString*)proxy {
  // WebPageTest has no notion of a proxy.  Consider adding one.
  return nil;
}

- (BOOL)shouldClearCookies {
  // If the current measurement is the first view of a page, clear cookies.
  return self.currentMeasurement.isFirstView;
}

- (BOOL)shouldClearCache {
  // If the current measurement is the first view of a page, clear the cache.
  return self.currentMeasurement.isFirstView;
}

- (BOOL)shouldTakeScreenshot {
  // Always take a screenshot of the loaded page.
  return YES;
}

- (BOOL)shouldCaptureVideo {
  return self.currentMeasurement.captureVideo;
}

- (NSTimeInterval)videoCaptureSecondsPerFrame {
  return kWptVideosSecondsPerFrame;
}

- (NSURLRequest*)buildRequestForPageUnderTest {
  NSURL *requestURL =
      [NSURL URLWithString:[self.workUnit valueForKey:kWptWorkKeyUrl]];

  NSURLCacheStoragePolicy policy =
      ([self shouldClearCache] ? NSURLRequestReloadIgnoringCacheData
                               : NSURLRequestUseProtocolCachePolicy);
  return [WebPageTest buildRequestToMeasureUrl:requestURL
                               withCachePolicy:policy];
}

- (BOOL)uploadMeasurementWithTimingData:(NSDictionary *)timingData
                                harDict:(NSDictionary *)harDict
                             screenshot:(UIImage *)screenshot
                             deviceInfo:(VeloDeviceInfo *)deviceInfo
                            videoFrames:(NSArray *)videoFrames
                     isFinalMeasurement:(BOOL)isFinalMeasurement
                                  error:(NSError **)error {
  NSUserDefaults *prefs = [NSUserDefaults standardUserDefaults];
  NSString *location = [prefs stringForKey:kWptSettingsLocation];
  NSString *key = [prefs stringForKey:kWptSettingsKey];
  NSString *taskId = [self taskId];

  NSURL *serverBaseUrl =
      [NSURL URLWithString:[prefs stringForKey:kWptSettingsServer]];

  WebPageTestAgentInfo *agentInfo =
      [[[WebPageTestAgentInfo alloc] initWithServerBaseURL:serverBaseUrl
                                                 location:location
                                                      key:key] autorelease];

  // TODO(skerner): WebPageTest always expects a JPEG screenshot.
  // The windows version supports PNG screenshots using key 'pngScreenShot'.
  // If we wish to support PNG screenshots, the following lines will detect
  // the desired property:
  // #define kWptSettingsPngScreenShot @"pngScreenShot"
  // return [self.workUnit valueForKey:kWptSettingsPngScreenShot] != nil;

  if (screenshot != nil &&
      ![WebPageTest uploadScreenshot:screenshot
                       withAgentInfo:agentInfo
                              taskId:taskId
                     measurementInfo:self.currentMeasurement
                        imageQuality:self.imageQuality
                               error:error]) {
    return NO;
  }

  if (videoFrames != nil &&
      ![WebPageTest uploadVideoFrames:videoFrames
                        withAgentInfo:agentInfo
                               taskId:taskId
                      measurementInfo:self.currentMeasurement
                         imageQuality:self.imageQuality
                                error:error]) {
    return NO;
  }

  if (![WebPageTest uploadHar:harDict
                withAgentInfo:agentInfo
                       taskId:taskId
                         done:isFinalMeasurement
                        error:error]) {
    return NO;
  }

  return YES;
}

- (BOOL)measurementCompleteWithTimingData:(NSDictionary *)timingData
                                  harDict:(NSDictionary *)harDict
                               screenshot:(UIImage *)screenshot
                               deviceInfo:(VeloDeviceInfo *)deviceInfo
                              videoFrames:(NSArray *)videoFrames
                                    error:(NSError **)error {
  // The HAR upload to WebPageTest has a flag which tells the server if the
  // current upload is the final measurement for the task being run.  To find
  // out if the current measurement is the final one, get the next measurement
  // now and see if it is nil.
  WebPageTestMeasurement *nextMeasurement =
      [self.measurementEnumerator nextMeasurement];
  BOOL isFinalMeasurement = (nextMeasurement == nil);

  BOOL uploadSuccess = [self uploadMeasurementWithTimingData:timingData
                                                     harDict:harDict
                                                  screenshot:screenshot
                                                  deviceInfo:deviceInfo
                                                 videoFrames:videoFrames
                                          isFinalMeasurement:isFinalMeasurement
                                                       error:error];

  // The current measurement is complete.  Set |currentMeasurement| to the next
  // measurement that must be done.  |currentMeasurement| will be nil if there
  // are no more measurements to do.  We wait until the upload is complete to
  // change the current measurement, because methods that get facts about the
  // current measurement (cache status, run number, etc.) call methods that
  // ultimately read |self.currentMeasurement| .
  self.currentMeasurement = nextMeasurement;

  return uploadSuccess;
}

- (NSDictionary*)extraPageProperties {
  // WebPageTest's server can ask an agent to score a page many times.
  // The response needs to include a run number.  Until we support multiple
  // runs, the run number for a single test is always 1.  The HAR spec allows
  // programs to add their own private properties as long as they start with
  // an underscore.

  int runNumber = self.currentMeasurement.runNumber;

  // Cache is warm if and only if this is not the first view.
  BOOL cacheWarmed = !self.currentMeasurement.isFirstView;

  return [NSDictionary dictionaryWithObjectsAndKeys:
               IBOX(runNumber), kWptHARPageRunNumber,
             BBOX(cacheWarmed), kWptHARPageCacheWarmed,
                           nil];
}

@end
