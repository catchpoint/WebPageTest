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

 Created by Mark Cogan on 5/3/2011.

 ******************************************************************************/

#import <Foundation/Foundation.h>
#import "HAR.h"

// enums corresponding to Veldrome statuses
typedef enum {
  veloDeviceStatusReady = 0,
  veloDeviceStatusScheduled,
  veloDeviceStatusMeasuring,
} veloDeviceStatus;

typedef enum {
  veloResultStatusOK = 0,
  veloResultStatusCancelled,
} veloResultStatus;

#define kVeloNetworkWiFi @"WiFi"
#define kVeloNetworkCell @"Cellular"
#define kVeloNetworkNone @"none"

// generic wrapper class for Velodrome JSON objects in their native
// Objective-C forms. Each VelodromeObject includes the JSON
// NSDictionary and manages operations on it via properties.
//
// The typical pattern for subclasses is that there is a class method
// creator that sets as many properties as can be set at create time;
// these are readonly properties. Other properties are readwrite.
//
// Velodrome data structures that are not created client-side (such as
// a MeasureTask) don't have explicit constructors; they are created by
// initializing with initWithDictionary:, passing the expanded dictionary
// from the recived JSON in.
@interface VelodromeObject : NSObject {
 @protected
  NSMutableDictionary *dict_;
}

- (id)initWithDictionary:(NSDictionary *)dictionary;

// debugging convenience method
- (NSString *)description;

@property (retain) NSMutableDictionary* dict;

@end

// Wrapper for a Velodrome DeviceInfo record.
@interface VeloDeviceInfo : VelodromeObject

// Creates a VeloDeviceInfo populated with current device information,
// collecting device ID, OS name, etc from the device.
+ (VeloDeviceInfo *)deviceInfoForCurrentDevice;

// these three properties aren't set by deviceInfoForCurrentDevice
@property (retain) NSString *carrier;

@property (readonly) float latitude;
@property (readonly) float longitude;
@property (readonly) NSString *deviceId;
@property (readonly) NSString *model;
@property (readonly) NSString *os;
@property (readonly) NSString *osVersion;
@property (readonly) NSString *networkType;
@property (readonly) NSString *agentVersion;
@property (readonly) BOOL isLandscape;

// appends a qualifying subtype to a network type.
//   eg 'cellular' -> 'cellular (3G)'
- (void)addNetworkSubtype:(NSString *)subtype;

// sets location
- (void)setLocationLatitude:(float)latitude longitude:(float)longitude;

@end

// Wrapper class for the Velodrome checkin record
@interface VeloCheckinSubmission : VelodromeObject

// Creates a checkin record using |device| and the string representation of
// |status|, using the current time.
+ (VeloCheckinSubmission *)checkinSubmissionForDevice:(VeloDeviceInfo *)device
                                           withStatus:(veloDeviceStatus)status;

// Setting this is optional if the device is currently running a task
@property (retain) NSString *activeTaskId;

@property (readonly) NSInteger time;
@property (readonly) VeloDeviceInfo* deviceInfo;
@property (readonly) NSString *deviceStatusCode;
@property (readonly) veloDeviceStatus deviceStatus;

@end

// Wrapper class for a Velodrome measure task.
@interface VeloMeasureTask : VelodromeObject

@property (readonly) NSString *taskId;
@property (readonly) NSString *url;
@property (readonly) NSString *proxy;
@property (readonly) BOOL clearCache;
@property (readonly) BOOL clearCookies;
@property (readonly) BOOL capturePCAP;
@property (readonly) BOOL captureScreenshot;
@property (readonly) NSString *method;
@property (readonly) NSArray *httpHeaders;
@property (readonly) NSInteger timeLimit;

// returns the URLRequest that the measureTask defines.
- (NSMutableURLRequest *)request;

@end

// Wrapper class for a Velodrome checkin response
@interface VeloCheckinResponse : VelodromeObject

@property (readonly) NSInteger time;
@property (readonly) NSString *status;
@property (readonly) NSInteger nextCheckTime;
@property (readonly) VeloMeasureTask *measureTask;
@property (readonly) NSString *cancelTask;

@end

// key names for timing properties for the Velodrome timing structure
// standard page nav events:
#define kVeloNavStartTimeTimingLabel  @"navigationStartTime"
#define kVeloOnContentLoadTimingLabel kHAROnContentLoad
#define kVeloOnLoadTimingLabel        kHAROnLoad

// These three are for recording tests of instrumented versus uninstrumented
// requests to the same site.
#define kVeloUninstrumentedLoadTimeTimingLabel   @"uninstrumentedLoadTime"
#define kVeloInstrumentedLoadTimeTimingLabel     @"instrumentedLoadTime"
#define kVeloInstrumentedPostLoadTimeTimingLabel @"instrumentedPostLoadTime"

// Wrapper class for a Velodrome measurement result
@interface VeloMeasureResult : VelodromeObject

// Creates a measureResult record with |status|, and with a task ID if
// |taskIdOrNil| is non-nil (it's nil if we're submitting a user-originated
// task).
+ (VeloMeasureResult *)resultForTask:(NSString *)taskIdOrNil
                          withStatus:(veloResultStatus)status;

// All of these typically need to be set before submitting the measureResult
@property (retain) id HAR;
@property (retain) NSString *url;
@property (retain) NSDictionary *timings;

@property (readonly) NSString *taskId;
@property (readonly) NSString *resultCode;
@property (readonly) veloResultStatus resultStatus;

@end

// Wrapper class for a result submission (which includes a MeasureResult)
@interface VeloMeasureResultSubmission : VeloCheckinSubmission

// Creates a resultSubmission. |device|, |result| and |status| are all required.
+ (VeloMeasureResultSubmission *)resultSubmissionForDevice:(VeloDeviceInfo *)device
                                                    result:(VeloMeasureResult *)result
                                                    status:(veloDeviceStatus)status;

@property (readonly) VeloMeasureResult *measureResult;

@end

// Wrapper class for the response to a measureResult submission.
@interface VeloMeasureResultResponse : VelodromeObject

@property (readonly) NSString *statusCode; // TODO map this to an enum
@property (readonly) NSString *taskId;

@end

// Utility class methods. The Velodrome class itself is never instantiated.
@interface Velodrome : NSObject

// URLRequest utility methods return a complete usable URLRequest for
// Velodrome requests.
+ (NSURLRequest *)URLRequestForCheckin:(VeloCheckinSubmission *)checkin
                              onServer:(NSURL *)server;

+ (NSURLRequest *)URLRequestForMeasureResult:(VeloMeasureResultSubmission *)result
                                    onServer:(NSURL *)server;

+ (NSURLRequest *)URLRequestForScreenshot:(UIImage *)image
                                  forTask:(NSString *)taskId
                                 onServer:(NSURL *)server;

+ (NSURLRequest *)URLRequestForTCPDump:(NSData *)TCPDump
                               forTask:(NSString *)taskId
                              onServer:(NSURL *)server;


@end
