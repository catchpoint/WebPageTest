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

 Created by Sam Kerner on 11/12/2011.

 ******************************************************************************/

#import "WebPageTestMeasurementEnumerator.h"

#import "GTMDefines.h"
#import "WebPageTest.h"
#import "WebPageTestMeasurement.h"

// WebPageTest numbers runs starting from 1.  Because the server code treats
// zero as a flag for errors, a valid run should never be zero.
const int kMinRunNumber = 1;

@implementation WebPageTestMeasurementEnumerator

@synthesize workUnit = workUnit_;

- (id)initWithWorkUnit:(NSDictionary *)workUnit {
  self = [super init];
  if (self) {
    self.workUnit = workUnit;
    started_ = NO;
    done_ = NO;
    NSString *urlString = [self.workUnit valueForKey:kWptWorkKeyUrl];
    if (!urlString) {
      NSLog(@"Work unit does not set key '%@', which tells us what URL to "
            "score.  Server error?", kWptWorkKeyUrl);
    } else {
      url_ = [[NSURL alloc] initWithString:urlString];
    }

    // A WebPageTest task can request multiple measurements.  This object will
    // enumerate them, returning each state from method |nextMeasurement|.  This
    // method parses out the parameters of the tasks to be done, as the min
    // and max values of the ranges of options to be measured.

    // The number of measurements we should do is encoded in key "runs".
    // The server expects runs to be numbered 1..#RUNS.
    NSNumber *runs = [self.workUnit valueForKey:kWptWorkKeyRuns];
    maxRunNumber_ = (runs ? [runs intValue] : 1);

    // Measure the second view (warm cache, cookies already set, ...) if and
    // only if the server doesn't ask for the first view only.
    measureFirstViewOnly_ =
        [self.workUnit valueForKey:kWptWorkKeyFirstViewOnly] != nil;

    captureVideo_ =
        [self.workUnit valueForKey:kWptWorkKeyCaptureVideo] != nil;
  }

  return self;
}

- (void)dealloc {
  [workUnit_ release];
  [url_ release];
  [super dealloc];
}

// Move the state of the enumerator forward.  Return YES if the new state is
// valid, NO if there is no valid next state.
- (BOOL)advanceState {
  // If |measureFirstViewOnly_| is YES, never set |isFirstView_| to NO.  If not,
  // and the current state has |isFirstView_| == YES, then the next state should
  // be |isFirstView_| == NO.  The current state should have warmed the caches
  // for the next state.
  if (!measureFirstViewOnly_ && isFirstView_) {
    // We want to return a measurement that clears the cache, then return a
    // measurement that does not.  This way the second measurement has a warm
    // cache.  It is important that this is the first property we change,
    // so that the warm cache case is exactly the same measurement as the
    // previous measurement.
    isFirstView_ = NO;
    return YES;
  }
  isFirstView_ = YES;

  if (runNumber_ < maxRunNumber_) {
    runNumber_++;
    return YES;
  }

  // When more states are added, it will be nessisary to reset the run number:
  //runNumber_ = minRunNumber_;

  // At this point, we can not advance the state because there are no
  // more states.
  return NO;
}

- (WebPageTestMeasurement *)nextMeasurement {
  if (!self.workUnit || done_)
    return nil;

  if (!started_) {
    started_ = YES;

    // The initial value has all properties at their minimum value.
    runNumber_ = kMinRunNumber;
    isFirstView_ = YES;

  } else if (![self advanceState]) {
    // If there are no more valid states, set |done_| so that
    // future calls to |nextMeasurement| will return nil.
    done_ = YES;
    return nil;  // No more valid states.
  }

  WebPageTestMeasurement *result =
      [[WebPageTestMeasurement alloc] initWithUrl:url_
                                      isFirstView:isFirstView_
                                        runNumber:runNumber_
                                     captureVideo:captureVideo_];
  return [result autorelease];
}

@end
