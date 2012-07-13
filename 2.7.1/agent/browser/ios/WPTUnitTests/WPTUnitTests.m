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

 Created by Sam Kerner on 1/20/2012.

 ******************************************************************************/

#import "WPTUnitTests.h"

#import "WebPageTest.h"
#import "WebPageTestMeasurement.h"
#import "WebPageTestMeasurementEnumerator.h"

@implementation WPTUnitTests

// Test that an empty work unit has the expected default values.
- (void)testWptMeasurementEnumeratorDefaultValues {
  NSDictionary *workUnit = [NSDictionary dictionaryWithObjectsAndKeys:nil];

  WebPageTestMeasurementEnumerator *measurementEnumerator
      = [[WebPageTestMeasurementEnumerator alloc] initWithWorkUnit:workUnit];

  WebPageTestMeasurement *measurement;

  // Expect two measurements: first view and then non first view.
  measurement = [measurementEnumerator nextMeasurement];
  STAssertNotNil(measurement, @"expect a measurement");
  STAssertNil(measurement.url, @"Should not set URL.");
  STAssertTrue(measurement.isFirstView, @"First measurement will clear cache.");
  STAssertEquals(1, measurement.runNumber, @"Should have default run number.");
  STAssertFalse(measurement.captureVideo, @"Only grab video with key.");

  measurement = [measurementEnumerator nextMeasurement];
  STAssertNotNil(measurement, @"expect a measurement");
  STAssertNil(measurement.url, @"Should not set URL.");
  STAssertFalse(measurement.isFirstView,
                @"Second measurement will not clear cache.");
  STAssertEquals(1, measurement.runNumber, @"Should have default run number.");
  STAssertFalse(measurement.captureVideo, @"Only grab video with key.");

  measurement = [measurementEnumerator nextMeasurement];
  STAssertNil(measurement, @"Expect only two measurements.");

  measurement = [measurementEnumerator nextMeasurement];
  STAssertNil(measurement, @"Once enumertor returns nil, it keeps doing so.");

  measurement = [measurementEnumerator nextMeasurement];
  STAssertNil(measurement, @"Once enumertor returns nil, it keeps doing so.");
}

// Test a work unit with first view only.
- (void)testWptMeasurementEnumeratorFirstViewOnly {
  NSURL *url = [NSURL URLWithString:@"http://www.example.com"];
  NSDictionary *workUnit = [NSDictionary dictionaryWithObjectsAndKeys:
                                [url absoluteString], kWptWorkKeyUrl,
                                                @"1", kWptWorkKeyFirstViewOnly,
                                                @"1", kWptWorkKeyCaptureVideo,
                                                 nil];
  WebPageTestMeasurementEnumerator *measurementEnumerator
      = [[WebPageTestMeasurementEnumerator alloc] initWithWorkUnit:workUnit];

  WebPageTestMeasurement *measurement;

  measurement = [measurementEnumerator nextMeasurement];
  STAssertNotNil(measurement, @"expect a measurement");
  STAssertEqualObjects(url, measurement.url, @"Should save URL.");
  STAssertTrue(measurement.isFirstView, @"First measurement will clear cache.");
  STAssertEquals(1, measurement.runNumber, @"Should have default run number.");
  STAssertTrue(measurement.captureVideo, @"Should grab video.");

  measurement = [measurementEnumerator nextMeasurement];
  STAssertNil(measurement, @"Expected enumertion to be complete.");
}

// Test a work unit with several runs, with the first view key.
- (void)testWptMeasurementEnumeratorMultipleRunsFirstView {
  NSURL *url = [NSURL URLWithString:@"http://www.example.com"];
  NSDictionary *workUnit = [NSDictionary dictionaryWithObjectsAndKeys:
                                [url absoluteString], kWptWorkKeyUrl,
                                                @"1", kWptWorkKeyFirstViewOnly,
                                                @"3", kWptWorkKeyRuns,
                                                 nil];
  WebPageTestMeasurementEnumerator *measurementEnumerator
      = [[WebPageTestMeasurementEnumerator alloc] initWithWorkUnit:workUnit];

  WebPageTestMeasurement *measurement;

  measurement = [measurementEnumerator nextMeasurement];
  STAssertNotNil(measurement, @"Expect a measurement.");
  STAssertEqualObjects(url, measurement.url, @"Should save URL.");
  STAssertTrue(measurement.isFirstView, @"First measurement will clear cache.");
  STAssertEquals(1, measurement.runNumber, @"Wrong run number.");

  measurement = [measurementEnumerator nextMeasurement];
  STAssertNotNil(measurement, @"Expect a measurement.");
  STAssertEqualObjects(url, measurement.url, @"Should save URL.");
  STAssertTrue(measurement.isFirstView, @"First measurement will clear cache.");
  STAssertEquals(2, measurement.runNumber, @"Wrong have run number.");

  measurement = [measurementEnumerator nextMeasurement];
  STAssertNotNil(measurement, @"Expect a measurement.");
  STAssertEqualObjects(url, measurement.url, @"Should save URL.");
  STAssertTrue(measurement.isFirstView, @"First measurement will clear cache.");
  STAssertEquals(3, measurement.runNumber, @"Wrong run number.");

  measurement = [measurementEnumerator nextMeasurement];
  STAssertNil(measurement, @"Expected enumertion to be complete.");
}

// Test a work unit with several runs, without the first view key.
- (void)testWptMeasurementEnumeratorMultipleRunsNoFirstView {
  NSURL *url = [NSURL URLWithString:@"http://www.example.com"];
  NSDictionary *workUnit = [NSDictionary dictionaryWithObjectsAndKeys:
                                [url absoluteString], kWptWorkKeyUrl,
                                                @"3", kWptWorkKeyRuns,
                                                 nil];
  WebPageTestMeasurementEnumerator *measurementEnumerator
      = [[WebPageTestMeasurementEnumerator alloc] initWithWorkUnit:workUnit];

  WebPageTestMeasurement *measurement;

  measurement = [measurementEnumerator nextMeasurement];
  STAssertNotNil(measurement, @"Expect a measurement.");
  STAssertEqualObjects(url, measurement.url, @"Should save URL.");
  STAssertTrue(measurement.isFirstView, @"First measurement will clear cache.");
  STAssertEquals(1, measurement.runNumber, @"Should have run number.");

  measurement = [measurementEnumerator nextMeasurement];
  STAssertNotNil(measurement, @"Expect a measurement.");
  STAssertEqualObjects(url, measurement.url, @"Should save URL.");
  STAssertFalse(measurement.isFirstView, @"Don't clear cache.");
  STAssertEquals(1, measurement.runNumber, @"Should have run number.");

  measurement = [measurementEnumerator nextMeasurement];
  STAssertNotNil(measurement, @"Expect a measurement.");
  STAssertEqualObjects(url, measurement.url, @"Should save URL.");
  STAssertTrue(measurement.isFirstView, @"First measurement will clear cache.");
  STAssertEquals(2, measurement.runNumber, @"Should have run number.");

  measurement = [measurementEnumerator nextMeasurement];
  STAssertNotNil(measurement, @"Expect a measurement.");
  STAssertEqualObjects(url, measurement.url, @"Should save URL.");
  STAssertFalse(measurement.isFirstView, @"Don't clear cache.");
  STAssertEquals(2, measurement.runNumber, @"Should have run number.");

  measurement = [measurementEnumerator nextMeasurement];
  STAssertNotNil(measurement, @"Expect a measurement.");
  STAssertEqualObjects(url, measurement.url, @"Should save URL.");
  STAssertTrue(measurement.isFirstView, @"First measurement will clear cache.");
  STAssertEquals(3, measurement.runNumber, @"Should have run number.");

  measurement = [measurementEnumerator nextMeasurement];
  STAssertNotNil(measurement, @"Expect a measurement.");
  STAssertEqualObjects(url, measurement.url, @"Should save URL.");
  STAssertFalse(measurement.isFirstView, @"Don't clear cache.");
  STAssertEquals(3, measurement.runNumber, @"Should have run number.");

  measurement = [measurementEnumerator nextMeasurement];
  STAssertNil(measurement, @"Expected enumertion to be complete.");
}

@end
