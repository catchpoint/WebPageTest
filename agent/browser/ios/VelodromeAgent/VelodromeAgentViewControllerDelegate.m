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

#import "VelodromeAgentViewControllerDelegate.h"

#import "GTMDefines.h"

@implementation VelodromeAgentViewControllerDelegate

@synthesize checkinResponse = checkinResponse_;

- (id)init {
  if (nil == (self = [super init]))
    return nil;

  haveMeasurementToDo_ = NO;

  return self;
}

- (void)dealloc {
  [checkinResponse_ release];
  [super dealloc];
}

- (NSURL*)serverURL {
  return [NSURL URLWithString:
      [[NSUserDefaults standardUserDefaults] stringForKey:@"server"]];
}

- (NSURLRequest*) URLRequestForCheckin:checkinSubmission {
  return [Velodrome URLRequestForCheckin:checkinSubmission
                                onServer:self.serverURL];
}

- (void)parseCheckinResponse:(NSDictionary *)response {
  self.checkinResponse =
      [[[VeloCheckinResponse alloc] initWithDictionary:response] autorelease];

  _GTMDevAssert(!haveMeasurementToDo_,
                @"Should not check in when work is pending.");

  // A checkin may give a work unit, or may say there is nothing to do.
  haveMeasurementToDo_ = (self.checkinResponse.measureTask.taskId != nil);
}

- (BOOL)haveMeasurementToDo {
  return haveMeasurementToDo_;
}

- (NSString*)taskId {
  return self.checkinResponse.measureTask.taskId;
}

- (NSString*)proxy {
  return self.checkinResponse.measureTask.proxy;
}

- (NSURL*)urlToMeasure {
  return [NSURL URLWithString:self.checkinResponse.measureTask.url];
}

- (BOOL)shouldClearCookies {
  return self.checkinResponse.measureTask.clearCookies;
}

- (BOOL)shouldClearCache {
  return self.checkinResponse.measureTask.clearCache;
}

- (BOOL)shouldTakeScreenshot {
  return self.checkinResponse.measureTask.captureScreenshot;
}

- (BOOL)shouldCaptureVideo {
  return NO;
}

- (NSTimeInterval)videoCaptureSecondsPerFrame {
  _GTMDevAssert(NO, @"Velodrome agent does not support video capture.");
  return (NSTimeInterval)0.0;
}

- (NSURLRequest*)buildRequestForPageUnderTest {
  return self.checkinResponse.measureTask.request;
}

- (BOOL)measurementCompleteWithTimingData:(NSDictionary *)timingData
                                  harDict:(NSDictionary *)harDict
                               screenshot:(UIImage *)screenshot
                               deviceInfo:(VeloDeviceInfo *)deviceInfo
                              videoFrames:(NSArray *)videoFrames
                                    error:(NSError **)error {
  // This method shold not be called unless we have results from a measurement.
  _GTMDevAssert(haveMeasurementToDo_, @"Upload without measuring?");

  // Velodrome only gives one measurement at a time.  Once we upload we
  // are not doing a measurement until the next checkin.
  haveMeasurementToDo_ = NO;

  VeloMeasureResult *veloMeasureResult
      = [VeloMeasureResult resultForTask:[self taskId]
                              withStatus:veloResultStatusOK];
  veloMeasureResult.timings = timingData;
  veloMeasureResult.HAR = harDict;

  VeloMeasureResultSubmission *submission =
      [VeloMeasureResultSubmission
          resultSubmissionForDevice:deviceInfo
                             result:veloMeasureResult
                             status:veloDeviceStatusReady];

  _GTMDevAssert(!videoFrames, @"Velodrome does not support video upload.");

  NSURLRequest *request = [Velodrome URLRequestForMeasureResult:submission
                                                       onServer:self.serverURL];
  NSURLResponse *response = nil;
  [NSURLConnection sendSynchronousRequest:request
                        returningResponse:&response
                                    error:error];
  if (*error != nil)
    return NO;

  if (screenshot) {
    request = [Velodrome URLRequestForScreenshot:screenshot
                                         forTask:[self taskId]
                                        onServer:self.serverURL];
    [NSURLConnection sendSynchronousRequest:request
                          returningResponse:&response
                                      error:error];
    if (*error != nil)
      return NO;
  }
  return YES;
}

- (NSDictionary*)extraPageProperties {
  // Velodrome does not require any extra properties on page records.
  return nil;
}

@end
