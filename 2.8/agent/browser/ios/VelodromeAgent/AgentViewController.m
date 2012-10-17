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

#import "AgentViewController.h"

#import "Autobox.h"
#import "GTMDefines.h"
#import "InstrumentedWebViewController.h"
#import "NSObject+SBJSON.h"
#import "NSString+SBJSON.h"
#import "HAR.h"
#import "TimedWebViewController.h"
#import "VelodromeAgentAppDelegate.h"
#import "VideoFrameGrabber.h"

// for screenshots
#import <QuartzCore/QuartzCore.h>

@interface AgentViewController (Private)
- (void) startCheckinTimer;
- (void) doUninstrumentedControl;

// If the current modal view is an InstrumentedWebViewController,
// return a pointer to it.  Otherwise, return nil.
- (InstrumentedWebViewController *)GetModalAsInstrumentedWebView;
@end

@implementation AgentViewController

@synthesize delegate = delegate_;
@synthesize deviceNameLabel = deviceNameLabel_;
@synthesize agentVersionLabel = agentVersionLabel_;
@synthesize statusLabel = statusLabel_;
@synthesize urlCaptionLabel = urlCaptionLabel_;
@synthesize urlLabel = urlLabel_;
@synthesize pageTimeLabel = pageTimeLabel_;
@synthesize checkinProgressView = checkinProgressView_;
@synthesize activityIndicator = activityIndicator_;
@synthesize pageImageView = pageImageView_;
@synthesize errorMessage = errorMessage_;

@synthesize runUninstrumentedControl = runUninstrumentedControl_;
@synthesize nextCheckTime = nextCheckTime_;
@synthesize currentTaskResults = currentTaskResults_;
@synthesize screenshot = screenshot_;
@synthesize videoFrameGrabber = videoFrameGrabber_;

// economy macros
#define APP_DELEGATE (VelodromeAgentAppDelegate*)[[UIApplication sharedApplication] delegate]
#define DEVICE_INFO [APP_DELEGATE deviceInfo]
#define CHECKIN_INTERVAL [APP_DELEGATE checkinInterval]

- (id)initWithNibName:(NSString *)nibNameOrNil
               bundle:(NSBundle *)nibBundleOrNil
             delegate:(id<AgentViewControllerDelegate>)delegate {
  if (nil == (self = [super initWithNibName:nibNameOrNil
                                     bundle:nibBundleOrNil]))
    return nil;

  status_ = veloDeviceStatusReady;
  self.delegate = delegate;
  [self startCheckinTimer];
  return self;
}

- (void)dealloc {
  [nextCheckTime_ release];
  [checkinTimer_ invalidate];
  [deviceNameLabel_ release];
  [agentVersionLabel_ release];
  [statusLabel_ release];
  [urlCaptionLabel_ release];
  [urlLabel_ release];
  [pageTimeLabel_ release];
  [checkinProgressView_ release];
  [pageImageView_ release];
  [activityIndicator_ release];
  [errorMessage_ release];
  [currentTaskResults_ release];
  [screenshot_ release];
  [videoFrameGrabber_ release];

  [super dealloc];
}

#pragma mark UIViewController overrides

- (void)viewDidLoad {
  [super viewDidLoad];
  statusLabel_.text = @"Idle";
  deviceNameLabel_.text = DEVICE_INFO.deviceId;
  agentVersionLabel_.text = DEVICE_INFO.agentVersion;
  agentVersionLabel_.backgroundColor = [UIColor purpleColor];
  checkinProgressView_.progress = 0.0;
}

- (void)viewDidUnload {
  [self setDeviceNameLabel:nil];
  [self setStatusLabel:nil];
  [self setUrlCaptionLabel:nil];
  [self setUrlLabel:nil];
  [self setPageTimeLabel:nil];
  [self setCheckinProgressView:nil];
  [self setPageImageView:nil];
  [self setActivityIndicator:nil];
  [self setAgentVersionLabel:nil];
  [self setErrorMessage:nil];
  [super viewDidUnload];
}

- (BOOL)shouldAutorotateToInterfaceOrientation:
    (UIInterfaceOrientation)interfaceOrientation {
  return (interfaceOrientation == UIInterfaceOrientationPortrait);
}

#pragma mark -
#pragma mark update
#pragma mark -

- (void)showActivityIndicator {
  checkinProgressView_.hidden = YES;
  activityIndicator_.hidden = NO;
  [activityIndicator_ startAnimating];
}

- (void)showProgressView {
  [activityIndicator_ stopAnimating];
  activityIndicator_.hidden = YES;
  checkinProgressView_.progress = 0.0;
  checkinProgressView_.hidden = NO;
}



#pragma mark -
#pragma mark checkin
#pragma mark -

- (void)startCheckinTimer {
  self.nextCheckTime = [[NSDate date] dateByAddingTimeInterval:CHECKIN_INTERVAL];

  // update progress bar every 30th of a second.
  checkinTimer_ = [NSTimer scheduledTimerWithTimeInterval:(1.0 / 30.0)
                                                     target:self
                                                   selector:@selector(update)
                                                   userInfo:nil
                                                    repeats:YES];

}

- (BOOL)checkinForCurrentStateWasSuccessful {
  // check if we're still authenticated
  VelodromeAgentAppDelegate* delegate = APP_DELEGATE;

  [delegate authenticateIfNeeded];
  if ([delegate waitingOnAuthentication]) {
    // If we need authentication and do not have it, return NO.
    // Caller will arrange to have this method called again until
    // we do not return NO.
    return NO;
  }

  statusLabel_.text = @"checkin";

  VeloCheckinSubmission *checkinSubmission
      = [VeloCheckinSubmission checkinSubmissionForDevice:DEVICE_INFO
                                               withStatus:status_];
  checkinSubmission.activeTaskId = [delegate_ taskId];

  NSURLRequest *request = [delegate_ URLRequestForCheckin:checkinSubmission];

  // TODO properly handle errors
  [self showActivityIndicator];

  NSData *checkinResponseData = [NSURLConnection sendSynchronousRequest:request
                                                      returningResponse:nil
                                                                  error:nil];

  NSString *responseBody = [[[NSString alloc]
                              initWithBytes:[checkinResponseData bytes]
                                     length:[checkinResponseData length]
                                   encoding:NSUTF8StringEncoding]
                            autorelease];

  NSLog(@"responseBody = \"%@\"", responseBody);

  if (nil == responseBody) {
    NSLog(@"Got nil response.");
    return NO;
  }

  // If a server returns the empty string, pass nil as the dictionary to the
  // delegate.  The WebPageTest server sends an empty string to indicate that
  // there is no work to do.
  NSDictionary *responseJSON = nil;
  if ([responseBody length] > 0) {
    responseJSON = (NSDictionary *)[responseBody JSONValue];
    if (nil == responseJSON) {
      NSLog(@"Unable to parse response: %@", responseBody);
      return NO;
    }
  }

  // Because the information in the response differs between systems, use the
  // agent-specific delegate to parse it.
  [delegate_ parseCheckinResponse:responseJSON];

  return YES;
}

- (void)presentInstrumentedWebViewController {
  // get rid of any existing modal. This may mean we're not authenticated,
  // but we'd rather have that error than the wrong modal.
  if (self.modalViewController) {
    [self dismissModalViewControllerAnimated:NO];
  }

  InstrumentedWebViewController *webView
      = [[[InstrumentedWebViewController alloc] initWithNibName:nil bundle:nil]
            autorelease];
  [self presentModalViewController:webView animated:YES];

  if ([delegate_ shouldCaptureVideo]) {
    _GTMDevAssert(!videoFrameGrabber_,
                  @"Old video frame grabber still present.");
    NSTimeInterval frameDelay = [delegate_ videoCaptureSecondsPerFrame];
    SEL getFrame = @selector(captureInstrumentedWebViewImage);
    self.videoFrameGrabber =
        [[[VideoFrameGrabber alloc] initWithFrameDelay:frameDelay
                                    imageCaptureTarget:self
                                              selector:getFrame] autorelease];
    [videoFrameGrabber_ startFrameCapture];
  }
}

- (UIImage*)captureInstrumentedWebViewImage {
  InstrumentedWebViewController *webView = [self GetModalAsInstrumentedWebView];
  if (!webView) {
    NSLog(@"Video capture should not be done unless an instrumented "
          "view is displayed.  Not capturing a video frame, because "
          "the current view is of type %@.",
          NSStringFromClass([self.modalViewController class]));
    return nil;
  }

  return [webView takeScreenshot];
}

- (void)presentTimedWebViewController {
  TimedWebViewController *webView =
      [[[TimedWebViewController alloc] initWithNibName:nil bundle:nil]
          autorelease];
  [self presentModalViewController:webView animated:YES];
}

- (void)restartCheckinTimer {
  [self showProgressView];
  self.nextCheckTime = [[NSDate date] dateByAddingTimeInterval:CHECKIN_INTERVAL];
  NSLog(@"next beat in %02f seconds (%02f)",
        [nextCheckTime_ timeIntervalSinceNow], CHECKIN_INTERVAL);
}

- (void)setOKStatus:(NSString *)status {
  statusLabel_.text = status;
  statusLabel_.textColor = [UIColor blackColor];

  errorMessage_.text = @"";
  errorMessage_.hidden = YES;
}

- (void)setErrorStatus:(NSError *)error {
  NSString *message;
  VeloAuthStatus authState = [APP_DELEGATE authState];
  if (authGood != authState && authNotNeeded != authState) {
    message = @"Unauthenticated";
  } else {
    message = @"Error!";
  }

  statusLabel_.text = message;
  statusLabel_.textColor = [UIColor redColor];

  if (error) {
    errorMessage_.text = [error localizedDescription];
    errorMessage_.hidden = NO;
  } else {
    errorMessage_.text = @"";
    errorMessage_.hidden = YES;
  }
}

- (void)doNextMeasurement {
  if (nil != self.modalViewController) {
    NSLog(@"(skipping checkin because modal is present)");
    [self restartCheckinTimer];
    return;
  }

  // We may already have work to do.  A task may request more than one
  // measurement.  If there are more measurements to do from the last task
  // fetched, start the next one.
  if ([delegate_ haveMeasurementToDo]) {
    [self startMeasurement];
    return;
  }

  // If we don't have work to do, ask the server for more work.
  if (![self checkinForCurrentStateWasSuccessful]) {
    [self setErrorStatus:nil];
    [self restartCheckinTimer];
    return;
  }

  // TODO accept server-driven update schedule

  // TODO ignore new task if we have not completed an existing one?

  // Now do we have a measurement to do?
  if ([delegate_ haveMeasurementToDo]) {
    [self startMeasurement];
    return;
  }

  [self setOKStatus:@"Idle"];
  [self restartCheckinTimer];
}

- (void)startMeasurement {
  _GTMDevAssert([delegate_ haveMeasurementToDo],
                @"Should not already have work when starting a measurement.");

  [checkinTimer_ invalidate];
  [self setOKStatus:@"Measuring"];

  self.currentTaskResults = nil;
  self.screenshot = nil;
  self.videoFrameGrabber = nil;

  [NSThread detachNewThreadSelector:@selector(executeCurrentTask)
                           toTarget:self
                         withObject:nil];
}

- (void)update {
  NSDate *now = [NSDate date];
  if (NSOrderedDescending == [now compare:nextCheckTime_]) {
    checkinProgressView_.progress = 1.0;
    [self doNextMeasurement];
  } else {
    NSTimeInterval delta = [self.nextCheckTime timeIntervalSinceNow];
    float progress = 1 - (delta / CHECKIN_INTERVAL);
    checkinProgressView_.progress = progress;
  }
}

- (InstrumentedWebViewController *)GetModalAsInstrumentedWebView {
  UIViewController *modal = self.modalViewController;
  if (![modal isKindOfClass:[InstrumentedWebViewController class]])
    return nil;

  return (InstrumentedWebViewController *)modal;
}

- (NSDictionary *)collectFinalTimingData {
  // get the HAR and the top page record
  NSMutableDictionary *HARLog = [currentTaskResults_ objectForKey:kHARLog];
  NSDictionary *HARPage =
      [(NSArray *)[HARLog objectForKey:kHARPages] objectAtIndex:0];
  NSDictionary *pageTimings = [HARPage objectForKey:kHARPageTimings];

  // add a HAR comment warning if a proxy was requested
  NSString* proxy = [delegate_ proxy];
  if (nil != proxy) {
    NSString *unusedProxyComment =
        [NSString stringWithFormat: @"Ignored task proxy setting (%@)", proxy];
    [HARLog setObject:unusedProxyComment forKey:kHARComment];
  }

  InstrumentedWebViewController *webView = [self GetModalAsInstrumentedWebView];
  _GTMDevAssert(webView,
                @"Instrumented web view should be displayed as final timing "
                "data is collected.");

  long long navStartTime = [[webView startDate] timeIntervalSince1970] * 1000.0;
  NSNumber *onContentLoad = [pageTimings objectForKey:kHAROnContentLoad];
  NSNumber *onLoad = [pageTimings objectForKey:kHAROnLoad];

  NSDictionary *timings =
      [NSMutableDictionary dictionaryWithObjectsAndKeys:
          LBOX(navStartTime), kVeloNavStartTimeTimingLabel,
               onContentLoad, kVeloOnContentLoadTimingLabel,
                      onLoad, kVeloOnLoadTimingLabel,
                         nil];
  return timings;
}

- (void)onMeasurementComplete {
  InstrumentedWebViewController *webView = [self GetModalAsInstrumentedWebView];

  [self.videoFrameGrabber stopFrameCapture];

  // Take a screenshot of the final state of the page.
  self.screenshot = nil;
  if ([delegate_ shouldTakeScreenshot]) {
    self.screenshot = [webView takeScreenshot];
  }

  [self submitTaskResults];

  // Make sure we don't start another checkin until after we're done sending
  // results.
  // TODO(skerner): Use a shorter time interval when doing a series of
  // measurements as part of one task.
  [self startCheckinTimer];
}

- (void)submitTaskResults {
  // finish gathering timing data to send
  NSDictionary *timingData = [self collectFinalTimingData];

  // show the results
  pageImageView_.hidden = NO;
  pageImageView_.image = screenshot_;
  urlCaptionLabel_.hidden = NO;
  urlLabel_.hidden = NO;
  urlLabel_.text = [[delegate_ urlToMeasure] absoluteString];

  // show page load time in the ui
  int onloadTime = [[timingData valueForKey:kVeloOnLoadTimingLabel] intValue];
  if (onloadTime > 0) {
    pageTimeLabel_.hidden = NO;
    pageTimeLabel_.text = [NSString stringWithFormat:@"%d ms", onloadTime];
  } else {
    pageTimeLabel_.hidden = YES;
    pageTimeLabel_.text = @"";
  }
  [self dismissModalViewControllerAnimated:YES];

  // send results
  [self setOKStatus:@"Sending results"];

  NSError *error = nil;
  [delegate_ measurementCompleteWithTimingData:timingData
                                       harDict:currentTaskResults_
                                    screenshot:screenshot_
                                    deviceInfo:DEVICE_INFO
                                   videoFrames:videoFrameGrabber_.videoFrames
                                         error:&error];

  status_ = veloDeviceStatusReady;
  [self showProgressView];
  if (error != nil) {
    NSLog(@"Error uploading results: %@", error);
    [self setErrorStatus:error];
  } else if ([delegate_ haveMeasurementToDo]) {
    [self setOKStatus:@"More measurements to do..."];
  } else {
    [self setOKStatus:@"Idle"];
  }
}

- (void)clearCookiesAndCacheIfNeeded {
  if ([delegate_ shouldClearCookies]) {
    NSHTTPCookieStorage *sharedCookies
        = [NSHTTPCookieStorage sharedHTTPCookieStorage];
    // delete every cookie
    for (NSHTTPCookie *cookie in [sharedCookies cookies]) {
      [sharedCookies deleteCookie:cookie];
    }

    //FIXME FIXME
    // then set the auth cookies for Velodrome again
    [sharedCookies setCookies:[APP_DELEGATE authCookies]
                       forURL:[delegate_ serverURL]
              mainDocumentURL:nil];
  }

  if ([delegate_ shouldClearCache]) {
    NSURLCache *cache = [NSURLCache sharedURLCache];
    [cache removeAllCachedResponses];
  }
}

- (void)executeCurrentTask {
  // This method is the entry point to a new thread, which was created in
  // method |startMeasurement|.  Thus we need an autorelease pool.

  NSAutoreleasePool *pool = nil;

  if (!runUninstrumentedControl_) {
    pool = [[NSAutoreleasePool alloc] init];
  }

  if (runUninstrumentedControl_) {
    NSLog(@"running uninstrumented control");
    [self clearCookiesAndCacheIfNeeded];
    [self performSelectorOnMainThread:@selector(presentTimedWebViewController)
                           withObject:nil
                        waitUntilDone:YES];
    TimedWebViewController *timedWebView
        = (TimedWebViewController *)self.modalViewController;

    [timedWebView loadRequest:[delegate_ buildRequestForPageUnderTest]];
    [timedWebView waitForLoad];

    uninstrumentedLoadTime_ = 1000.0 * timedWebView.loadTime;

    [self performSelectorOnMainThread:@selector(dismissModalViewControllerAnimated:)
                           withObject:BBOX(YES)
                        waitUntilDone:YES];

    // clear cache
    NSURLCache *cache = [NSURLCache sharedURLCache];
    [cache removeAllCachedResponses];  // FIXME

    // wait for the modal to actually be gone
    while (nil != self.modalViewController) {
      [NSThread sleepForTimeInterval:0.1];
    }
  }

  [self clearCookiesAndCacheIfNeeded];

  [self performSelectorOnMainThread:@selector(presentInstrumentedWebViewController)
                         withObject:nil
                      waitUntilDone:YES];

  InstrumentedWebViewController *webView = [self GetModalAsInstrumentedWebView];
  if (webView) {
    NSLog(@"Preparing to execute task: %@", [delegate_ taskId]);

    status_ = veloDeviceStatusMeasuring;
    // now we actually execute
    [webView loadRequest:[delegate_ buildRequestForPageUnderTest]
      withPageProperties:[delegate_ extraPageProperties]];

    // TODO support task-defined timeout (task_.timeLimit)
    [webView waitForLoad];

    self.currentTaskResults = [NSDictionary dictionaryWithObject:webView.HARLog
                                                          forKey:kHARLog];

    [self performSelectorOnMainThread:@selector(onMeasurementComplete)
                           withObject:nil
                        waitUntilDone:NO];
  } else {
    // there was either no modal or the modal wasn't the one we wanted
    NSLog(@"Bad modal (%@), skipping task", self.modalViewController);
  }

  if (pool != nil) {
    [pool drain];
  }
}

@end
