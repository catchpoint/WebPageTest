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

#import <Foundation/Foundation.h>

@class WebPageTestMeasurement;

// WebPageTest gives work in a JSON dictionary.  A work unit can contain
// several measurements.  For example, a work unit can ask that a page be
// loaded with a cold and warm cache.  This class takes a work unit from the
// WebPageTest server, decoded into a dictionary, and enumerates the
// measurements the agent should do.  Measurements should be done in the
// order they are returned by this class.
@interface WebPageTestMeasurementEnumerator : NSObject {
 @private
  NSDictionary *workUnit_;

  BOOL started_;  // Have we returned at least one state?
  BOOL done_;  // Have we returned all possible states?

  NSURL *url_;  // URL to measure.

  // The following members hold the last enumerated state.
  int runNumber_;
  BOOL isFirstView_;

  // How many runs did the server request?
  int maxRunNumber_;

  // In WebPageTest parlance, the "first view" of a page is the view a user
  // who has never loaded the page sees.  The cache is empty, all cookies
  // are cleared, local storage has no records for the origin of the page,
  // etc.  The "second view" of a page is what a user sees the second time
  // they load the page, a short time after the first view, without clearing
  // any broser state.  Every WebPageTest task measures the first view.
  // If a user requested only the first view, the key 'fvonly' is set in
  // the work unit.  If that property is not set, measure both the first and
  // second view.
  BOOL measureFirstViewOnly_;

  // If true, take periodic screenshots of the page as it loads.  The server
  // will assemble them into a video of the page loading.
  BOOL captureVideo_;
}

- (id)initWithWorkUnit:(NSDictionary *)workUnit;
- (WebPageTestMeasurement*)nextMeasurement;

@property (retain) NSDictionary* workUnit;

@end
