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

 Created by Mark Cogan on 5/18/2011.

 ******************************************************************************/

#import <UIKit/UIKit.h>

#import "Velodrome.h"

@class AgentViewController;
@class VideoFrameGrabber;

// An AgentViewController has several behaviors that differ based on
// what system (velodrome, webpagetest, ...) it is doing measurments for.
// System specific behavior is implemented by a delegate, which conforms
// to protocol |AgentViewControllerDelegate|.
@protocol AgentViewControllerDelegate <NSObject>

// Create a request to the server to ask it what to do.
- (NSURLRequest*) URLRequestForCheckin:(VeloCheckinSubmission *)checkinSubmission;

// Given a server response (parsed into a dictionary), read it and store
// state for measurements (such as the url to measure).  |response|==nil
// means an empty string was returned by the server.
- (void)parseCheckinResponse:(NSDictionary *)response;

// Return a string that uniquely identifies the task within the system
// sending scores.
- (NSString*)taskId;

- (NSString*)proxy;

// What URL will be measured?
- (NSURL*)urlToMeasure;

- (BOOL)shouldClearCookies;
- (BOOL)shouldClearCache;
// TODO(skerner): Add shouldClearLocalStorage;

- (BOOL)shouldTakeScreenshot;

// Should video frames of the page loading be captured?
- (BOOL)shouldCaptureVideo;

// How long should the delay be between frames of the captured video?
- (NSTimeInterval)videoCaptureSecondsPerFrame;

// Create a request that will load the page we wish to measure.
- (NSURLRequest*)buildRequestForPageUnderTest;

// Upload results.  Return YES on success.  Return NO, and set
// |*error| if error is not nil, on error.
// TODO(skerner): |screenshot| is essentially the final video frame.
// Consider always passing the frames captured in |videoFrames|,
// including what is now |screenshot|, and getting rid of |screenshot|.
// We might not be able to do this if video frames end up being lower
// quality images because of memory limitations.
- (BOOL)measurementCompleteWithTimingData:(NSDictionary *)timingData
                                  harDict:(NSDictionary *)harDict
                               screenshot:(UIImage *)screenshot
                               deviceInfo:(VeloDeviceInfo *)deviceInfo
                              videoFrames:(NSArray *)videoFrames
                                    error:(NSError **)error;

// Returns a dictionary of key value pairs to include in the HAR
// of the page being measured.  This is used by the WebPageTest
// delegate to give the server the run number and cache status of
// the page being measured.
- (NSDictionary*)extraPageProperties;

// Is there a measurement in progress?  This will become true when
// |parseCheckinResponse| is called with a work unit that requests
// that a URL gets measured.  It will become false after a call to
// |measurementCompleteWithTimingData|, when there are no more
// measurements to be done.
- (BOOL)haveMeasurementToDo;

// The base URL of the server we talk to.
@property (readonly) NSURL *serverURL;

@end

@interface AgentViewController : UIViewController {
 @private
  id<AgentViewControllerDelegate> delegate_;
  BOOL runUninstrumentedControl_;
  NSUInteger uninstrumentedLoadTime_; // in ms

  NSDate *nextCheckTime_; // time for next checkin
  NSTimer *checkinTimer_;

  veloDeviceStatus status_;

  UILabel *deviceNameLabel_;
  UILabel *agentVersionLabel_;
  UILabel *statusLabel_;
  UILabel *urlCaptionLabel_;
  UILabel *urlLabel_;
  UILabel *pageTimeLabel_;
  UIProgressView *checkinProgressView_;
  UIImageView *pageImageView_;
  UIActivityIndicatorView *activityIndicator_;
  UILabel *errorMessage_;
  NSDictionary *currentTaskResults_;
  UIImage *screenshot_;
  VideoFrameGrabber *videoFrameGrabber_;
}

- (id)initWithNibName:(NSString *)nibNameOrNil
               bundle:(NSBundle *)nibBundleOrNil
             delegate:(id<AgentViewControllerDelegate>)delegate;

- (void)submitTaskResults;
- (void)startMeasurement;
- (UIImage*)captureInstrumentedWebViewImage;

@property (assign) id<AgentViewControllerDelegate> delegate;
@property (assign) BOOL runUninstrumentedControl;
@property (retain) NSDate *nextCheckTime;
@property (retain) NSDictionary *currentTaskResults;
@property (retain) UIImage *screenshot;
@property (retain) VideoFrameGrabber *videoFrameGrabber;

@property (nonatomic, retain) IBOutlet UILabel *deviceNameLabel;
@property (nonatomic, retain) IBOutlet UILabel *agentVersionLabel;
@property (nonatomic, retain) IBOutlet UILabel *statusLabel;
@property (nonatomic, retain) IBOutlet UILabel *urlCaptionLabel;
@property (nonatomic, retain) IBOutlet UILabel *urlLabel;
@property (nonatomic, retain) IBOutlet UILabel *pageTimeLabel;
@property (nonatomic, retain) IBOutlet UIProgressView *checkinProgressView;
@property (nonatomic, retain) IBOutlet UIActivityIndicatorView *activityIndicator;
@property (nonatomic, retain) IBOutlet UIImageView *pageImageView;
@property (nonatomic, retain) IBOutlet UILabel *errorMessage;

@end
