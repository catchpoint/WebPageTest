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

#import <Foundation/Foundation.h>

#import "Velodrome.h"

// URL paths.
#define kWptURLPathGetWork @"work/getwork.php"
#define kWptURLPathImage @"work/resultimage.php"
#define kWptURLPathWorkDone @"work/workdone.php"

// Parameters to GET requests.
#define kWptParamJson @"json"
#define kWptParamFormat @"f"
#define kWptParamLocation @"location"
#define kWptParamIos @"ios"
#define kWptParamSoftware @"software"
#define kWptParamKey @"key"
#define kWptParamPc @"pc"

// Properties of the work unit json dictionary.
#define kWptWorkKeyCaptureVideo @"Capture Video"
#define kWptWorkKeyFirstViewOnly @"fvonly"
#define kWptWorkKeyImageQuality @"iq"
#define kWptWorkKeyRuns @"runs"
#define kWptWorkKeyTestId @"Test ID"
#define kWptWorkKeyUrl @"url"

// Default values to be used if a property in a work unit is not specified.
#define kWptWorkDefaultImageQuality 90

// Default values that can not be changed by the work unit.
#define kWptVideosSecondsPerFrame 1.0
#define kWptPageLoadTimeLimit (NSTimeInterval)300

// Paths to settings.
#define kWptSettingsKey @"wpt.key"
#define kWptSettingsLocation @"wpt.location"
#define kWptSettingsPc @"wpt.pc"
#define kWptSettingsServer @"wpt.server"

// Mime types.
#define kWptMimeTypeJpeg @"image/jpeg"
#define kWptMimeTypeJson @"text/json"

// POST field names.
#define kWptPostDone @"done"
#define kWptPostFile @"file"
#define kWptPostHar @"har"
#define kWptPostId @"id"
#define kWptPostKey @"key"
#define kWptPostLocation @"location"

// POST file names.
#define kWptPostCached @"_Cached"
#define kWptPostHarFile @"results.har"
#define kWptPostScreenshotFileNameFormat @"%d%@_screen.jpg"
#define kWptPostUncached @""
#define kWptPostVideoFrameFileNameFormat @"%d%@_progress_%04d.jpg"

// POST field values.
#define kWptPostTrueValue @"1"

// HAR page record properties that are private to WebPageTest.  The HAR spec
// allows extra properties if they start with an underscore.
#define kWptHARPageRunNumber @"_runNumber"
#define kWptHARPageCacheWarmed @"_cacheWarmed"

// Conversion factors

// Times in image file names are in tenths of seconds.  Intervals in this
// program are NSTimeIntervals, which represent time as a number of seconds.
// Convert an interval to a time in an image file name by multiplying by the
// following conversion factor.
#define kWptSecToImageTimeFileName 10.0

// Screenshots are not  scaled down for upload.
#define kWptScreenshotScaleFactor 1.0

// Video frames are scaled so that they are half their original width and
// height.
#define kWptVideoFrameScaleFactor 0.5

@class WebPageTestAgentInfo;
@class WebPageTestMeasurement;

// Utility class methods for WebPageTest interaction.
@interface WebPageTest : NSObject
+ (NSURLRequest *)URLRequestForCheckin:(VeloCheckinSubmission *)checkin
                              onServer:(NSURL *)serverURL
                          withSettings:(NSUserDefaults *)settings;

+ (NSURLRequest *)buildRequestToMeasureUrl:(NSURL *)url
                           withCachePolicy:(NSURLRequestCachePolicy)cachePolicy;

+ (BOOL)uploadScreenshot:(UIImage *)screenshot
           withAgentInfo:(WebPageTestAgentInfo *)agentInfo
                  taskId:(NSString *)taskId
         measurementInfo:(WebPageTestMeasurement *)measurementInfo
            imageQuality:(int)imageQuality
                   error:(NSError **)error;

+ (BOOL)uploadHar:(NSDictionary *)harDict
    withAgentInfo:(WebPageTestAgentInfo *)agentInfo
           taskId:(NSString *)taskId
             done:(BOOL)done
            error:(NSError **)error;

+ (BOOL)uploadVideoFrames:(NSArray *)videoFrames
            withAgentInfo:(WebPageTestAgentInfo *)agentInfo
                   taskId:(NSString *)taskId
          measurementInfo:(WebPageTestMeasurement *)measurementInfo
             imageQuality:(int)imageQuality
                    error:(NSError **)error;

@end
