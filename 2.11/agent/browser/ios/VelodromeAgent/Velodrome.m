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

#import "Velodrome.h"
#import "Autobox.h"

#import <CoreFoundation/CoreFoundation.h>
#import <SystemConfiguration/SystemConfiguration.h>
#import <netinet/in.h>
#import <sys/socket.h>
#import <sys/sysctl.h>
#import <sys/types.h>

#import "NSObject+SBJSON.h"

// key names for all Velodrome objects
#define kVeloId @"id"
#define kVeloManufacturer @"manufacturer"
#define kVeloModel @"model"
#define kVeloOS @"os"
#define kVeloOSVersion @"os_version"
#define kVeloAgent @"agent"
#define kVeloAgentVersion @"agent_version"
#define kVeloCarrier @"carrier"
#define kVeloNetworkType @"network_type"
#define kVeloLocation @"location"
#define kVeloLatitude @"latitude"
#define kVeloLongitude @"longitude"
#define kVeloIsLandscape @"is_landscape"

#define kVeloTime @"time"
#define kVeloDeviceInfo @"device_info"
#define kVeloStatus @"status"
#define kVeloActiveTaskId @"active_task_id"

#define kVeloCancelTask @"cancel_task"
#define kVeloMeasureTask @"measure_task"
#define kVeloURL @"url"
#define kVeloClearCache @"clear_cache"
#define kVeloClearCookies @"clear_cookie"
#define kVeloCapturePCAP @"capture_pcap"
#define kVeloCaptureScreenshot @"capture_screenshot"

#define kVeloProxy @"proxy"
#define kVeloMethod @"method"
#define kVeloHTTPHeaders @"http_headers"
#define kVeloName @"name"
#define kVeloValue @"value"
#define kVeloTimeLimit @"time_limit"
#define kVeloNextCheckTime @"next_check_time"

#define kVeloMeasureResult @"result"
#define kVeloTaskId @"task_id"
#define kVeloResultCode @"result_code"
#define kVeloHAR @"har"
#define kVeloTimings @"timings"

// do we set cachePolicy to emulate clearing a cache?
#define SET_CACHE_POLICY 1

// generic wrapper class for Velodrome JSON objects in their native
// Objective-C forms. Each VelodromeObject includes the JSON
// NSDictionary and manages operations on it via properties.
//
// VelodromeObject subclasses which include other VeldromeObject subclasses
// (for example, several classes contain a DeviceInfo record) will directly
// include the wrapper object in their internal dictionaries, but will
// override dictForEncoding to return nested dictionaries without the wrapper
// objects.
@interface VelodromeObject (Private)

- (void)setTimeToNow;

- (NSString *)deviceStatusCodeForStatus:(veloDeviceStatus)status;
- (veloDeviceStatus)deviceStatusForStatusCode:(NSString *)statusCode;

- (NSString *)resultStatusCodeForStatus:(veloResultStatus)status;
- (veloResultStatus)resultStatusForStatusCode:(NSString *)statusCode;

- (NSString *)JSONRepresentation;
- (void)setObject:(id)object forKey:(id)key;
- (id)objectForKey:(id)key;

@end

@implementation VelodromeObject

// string versions of various Velodrome statuses. These classes use enums
// for manipulation, then convert to string to send to Velodrome
const NSString *kReadyDeviceStatusCode     = @"READY";
const NSString *kScheduledDeviceStatusCode = @"SCHEDULED";
const NSString *kMeasuringDeviceStatusCode = @"MEASURING";

const NSString *kOKResultStatusCode        = @"OK";
const NSString *kCancelledResultStatusCode = @"CANCELLED";

static NSArray *deviceStatusCodes;
static NSArray *resultStatusCodes;

@synthesize dict=dict_;

// build arrays of status strings for conversion to/from enums.
+ (void)initialize {
  if (nil == deviceStatusCodes) {
    deviceStatusCodes = [[NSArray arrayWithObjects:
                          kReadyDeviceStatusCode,
                          kScheduledDeviceStatusCode,
                          kMeasuringDeviceStatusCode,
                          nil] retain];
  }

  if (nil == resultStatusCodes) {
    resultStatusCodes = [[NSArray arrayWithObjects:
                          kOKResultStatusCode,
                          kCancelledResultStatusCode,
                          nil] retain];
  }

}

// designated initializer for all subclasses. |dictionary| should be a
// dict representation of the appropriate Velodrome record type.
- (id)initWithDictionary:(NSDictionary *)dictionary {
  if (nil == (self = [super init]))
    return nil;

  self.dict = [NSMutableDictionary dictionaryWithDictionary:dictionary];

  return self;
}

- (void)dealloc {
  [dict_ release];
  [super dealloc];
}

// conveninece wrappers for subclasses to set and get on the wrapped
// dictionary
- (void)setObject:(id)object forKey:(id)key {
  if (nil != object) {
    [dict_ setObject:object forKey:key];
  } // else log something?
}

- (id)objectForKey:(id)key {
  return [dict_ objectForKey:key];
}

// overridden by subtypes which need to return nested dictionaries to be encoded
- (NSDictionary *)dictForEncoding {
  return dict_;
}

- (NSString *)JSONRepresentation {
  return [[self dictForEncoding] JSONRepresentation];
}

- (NSString *)description {
  return [dict_ description];
}

// almost all subclasses have a "time" field; this is a utility method
// to set it to the current UTC time.
- (void)setTimeToNow {
  NSInteger time = (NSInteger)[[NSDate date] timeIntervalSince1970];
  [self setObject:IBOX(time) forKey:kVeloTime];
}

// Utility methods to map to and from status codes and enums
- (NSString *)deviceStatusCodeForStatus:(veloDeviceStatus)status {
  return [deviceStatusCodes objectAtIndex:status];
}

- (veloDeviceStatus)deviceStatusForStatusCode:(NSString *)statusCode {
  return [deviceStatusCodes indexOfObject:statusCode];
}

- (NSString *)resultStatusCodeForStatus:(veloResultStatus)status {
  return [resultStatusCodes objectAtIndex:status];
}

- (veloResultStatus)resultStatusForStatusCode:(NSString *)statusCode {
  return [resultStatusCodes indexOfObject:statusCode];
}

@end

@implementation VeloDeviceInfo

// concievably at some point this might not be a given, but it's OK to
// hardcode for now
#define kDeviceManufacturer @"Apple"

#if TARGET_IPHONE_SIMULATOR
#define kOnSimulator YES
#else
#define kOnSimulator NO
#endif

// Creates a VeloDeviceInfo populated with current device information,
// collecting device ID, OS name, etc from the device.
//
// Specifically:
//   DeviceID is the device's assigned name plus its unique ID.
//   Model is what the system reports, typically of the form "iPhone3,1"
//   Network is one of "Ethernet", "WiFi", "cellular", or "none", determined
//           by the Reachability framework (among other things)
//   OS is the device's reported SystemName (typically "iPhone OS")
//   OSVersion is the device's reported systemVersion (4.3.3, etc)
//   Landscape is as reported by the device.
//
+ (VeloDeviceInfo *)deviceInfoForCurrentDevice {

  UIDevice *device = [UIDevice currentDevice];

  // make a friendly device ID by taking the first eight ascii alphanumeric characters
  // of the device name and adding the first eight charcaters of the UDID
  NSString *baseName = [[[NSString alloc]
                        initWithData:[[device name] dataUsingEncoding:NSASCIIStringEncoding
                                        allowLossyConversion:YES]
                         encoding:NSASCIIStringEncoding]
                        autorelease];
  NSMutableString *shortDeviceName = [NSMutableString string];
  NSRange range = NSMakeRange(0, [baseName length]);
  NSCharacterSet *illegalCharacters = [[NSCharacterSet alphanumericCharacterSet] invertedSet];

  [baseName
      enumerateSubstringsInRange:range
      options:NSStringEnumerationByComposedCharacterSequences
      usingBlock:^(NSString *substring,
                   NSRange substringRange,
                   NSRange enclosingRange,
                   BOOL *stop){
        [shortDeviceName appendString:
            [substring stringByTrimmingCharactersInSet:illegalCharacters]];
        if ([shortDeviceName length] >= 8) {
          *stop = YES;
          NSRange deleteRange = NSMakeRange(8, [shortDeviceName length] - 8);
          [shortDeviceName deleteCharactersInRange:deleteRange];
        }
    }];

  NSString *deviceID = [[NSString stringWithFormat:@"%@%@",
                        shortDeviceName,
                        [device uniqueIdentifier]] substringToIndex:16];

  size_t size;
  sysctlbyname("hw.machine", NULL, &size, NULL, 0);
  char *name = malloc(size);
  sysctlbyname("hw.machine", name, &size, NULL, 0);
  NSString *model = [NSString stringWithCString:name
                                       encoding:NSUTF8StringEncoding];
  free(name);

  NSString *networkType;
  if (kOnSimulator) {
    networkType =  @"Ethernet";
  } else {
    // see if we have wifi by testing if the internal wifi address is reachable
    // lifted from Apple's Reachability example
    struct sockaddr_in localWifiAddress;
    bzero(&localWifiAddress, sizeof(localWifiAddress));
    localWifiAddress.sin_len = sizeof(localWifiAddress);
    localWifiAddress.sin_family = AF_INET;
    // IN_LINKLOCALNETNUM is defined in <netinet/in.h> as 169.254.0.0
    localWifiAddress.sin_addr.s_addr = htonl(IN_LINKLOCALNETNUM);
    SCNetworkReachabilityRef wifiReachability
        = SCNetworkReachabilityCreateWithAddress(NULL,
          (const struct sockaddr*)&localWifiAddress);
    SCNetworkReachabilityFlags flags;
    SCNetworkReachabilityGetFlags(wifiReachability, &flags);
    CFRelease(wifiReachability);

    if (flags & kSCNetworkReachabilityFlagsIsDirect) {
      networkType = kVeloNetworkWiFi;
    } else if (flags & kSCNetworkReachabilityFlagsIsWWAN) {
      networkType = kVeloNetworkCell;
    } else {
      networkType = kVeloNetworkNone;
    }
  }

  UIDeviceOrientation orientation = [device orientation];
  NSNumber *landscape = BBOX(
                         (orientation == UIDeviceOrientationLandscapeLeft) ||
                         (orientation == UIDeviceOrientationLandscapeRight)
                         );

  NSString *agentName
      = [[[NSBundle mainBundle] infoDictionary] objectForKey:@"CFBundleName"];

  NSString *version
      = [[[NSBundle mainBundle] infoDictionary] objectForKey:@"CFBundleVersion"];

  VeloDeviceInfo *this = [[[super alloc] initWithDictionary:
                          [NSDictionary dictionaryWithObjectsAndKeys:
                           deviceID               ,kVeloId,
                           kDeviceManufacturer    ,kVeloManufacturer,
                           model                  ,kVeloModel,
                           networkType            ,kVeloNetworkType,
                           [device systemName]    ,kVeloOS,
                           [device systemVersion] ,kVeloOSVersion,
                           agentName              ,kVeloAgent,
                           version                ,kVeloAgentVersion,
                           landscape              ,kVeloIsLandscape,
                           nil]
                          ] autorelease];

  return this;
}

// appends a qualifying subtype to a network type.
//   eg 'cellular' -> 'cellular (3G)'
- (void)addNetworkSubtype:(NSString *)subtype {
  [self setObject:[self.networkType stringByAppendingFormat:@" (%@)",subtype]
           forKey:kVeloNetworkType];
}

// getters/setters for writeable properties
- (NSString *)carrier {
  return [self objectForKey:kVeloCarrier];
}

- (void)setCarrier:(NSString *)carrier {
  [self setObject:[[carrier copy] autorelease] forKey:kVeloCarrier];
}

// sets location
- (void)setLocationLatitude:(float)latitude longitude:(float)longitude {
  NSDictionary *location = [NSDictionary dictionaryWithObjectsAndKeys:
                            FBOX(latitude), kVeloLatitude,
                            FBOX(longitude),kVeloLongitude,
                            nil];
  [self setObject:location forKey:kVeloLocation];
}

// getters for readable properties

- (float) latitude {
  NSDictionary *location = [self objectForKey:kVeloLocation];
  if (nil != location) {
    return [(NSNumber *)[location objectForKey:kVeloLatitude] floatValue];
  } else {
    return NSNotFound;
  }
}

- (float) longitude {
  NSDictionary *location = [self objectForKey:kVeloLocation];
  if (nil != location) {
    return [(NSNumber *)[location objectForKey:kVeloLongitude] floatValue];
  } else {
    return NSNotFound;
  }
}

- (NSString *)deviceId {
  return [self objectForKey:kVeloId];
}

- (NSString *)model {
  return [self objectForKey:kVeloModel];
}

- (NSString *)os {
  return [self objectForKey:kVeloOS];
}

- (NSString *)osVersion {
  return [self objectForKey:kVeloOSVersion];
}

- (NSString *)networkType {
  return [self objectForKey:kVeloNetworkType];
}

- (NSString *)agentVersion {
  return [self objectForKey:kVeloAgentVersion];
}

- (BOOL)isLandscape {
  return [(NSNumber *)[self objectForKey:kVeloIsLandscape] boolValue];
}

@end

// Wrapper class for the Velodrome checkin record
@implementation VeloCheckinSubmission

// private initializer; public creator is +checkinSubmissionForDevice:withStatus:
- (id) initWithDevice:(VeloDeviceInfo *)device
               status:(veloDeviceStatus)status {

  if (nil == (self = [super initWithDictionary:nil]))
    return nil;

  [dict_ setObject:device forKey:kVeloDeviceInfo];
  [dict_ setObject:[self deviceStatusCodeForStatus:status] forKey:kVeloStatus];

  [self setTimeToNow];

  return self;
}

+ (VeloCheckinSubmission *)checkinSubmissionForDevice:(VeloDeviceInfo *)device
                                           withStatus:(veloDeviceStatus)status {
  return [[[VeloCheckinSubmission alloc] initWithDevice:device
                                                 status:status] autorelease];
}

- (NSDictionary *)dictForEncoding {
  NSMutableDictionary *dictionary
    = [NSMutableDictionary dictionaryWithDictionary:[super dictForEncoding]];
  [dictionary setValue:[self.deviceInfo dictForEncoding] forKey:kVeloDeviceInfo];

  return dictionary;
}

// readwrite property getter/setter
- (NSString *)activeTaskId {
  return (NSString *)[self objectForKey:kVeloActiveTaskId];
}

- (void)setActiveTaskId:(NSString *)activeTaskId {
  [self setObject:[[activeTaskId copy] autorelease] forKey:kVeloActiveTaskId];
}

// readonly property getters
- (NSInteger)time {
  return [(NSNumber *)[self objectForKey:kVeloTime] intValue];
}

- (VeloDeviceInfo *)deviceInfo {
  return (VeloDeviceInfo *)[self objectForKey:kVeloDeviceInfo];
}

- (NSString *)deviceStatusCode {
  return [self objectForKey:kVeloStatus];
}

- (veloDeviceStatus)deviceStatus {
  return [self deviceStatusForStatusCode:self.deviceStatusCode];
}

@end

// Wrapper class for a Velodrome measure task.
//
// This will be created via initWithDoictionary:, using the JSON dictionary
// recieved from the Velodrome server
@implementation VeloMeasureTask

// getters for readonly properties
- (NSString *)taskId {
  return [self objectForKey:kVeloId];
}

- (NSString *)url {
  return [self objectForKey:kVeloURL];
}

- (NSString *)proxy {
  return [self objectForKey:kVeloProxy];
}

- (BOOL)clearCache {
  return [(NSNumber *)[self objectForKey:kVeloClearCache] boolValue];
}

- (BOOL)clearCookies {
  return [(NSNumber *)[self objectForKey:kVeloClearCookies] boolValue];
}

- (BOOL)capturePCAP {
  return [(NSNumber *)[self objectForKey:kVeloCapturePCAP] boolValue];
}

- (BOOL)captureScreenshot {
  return [(NSNumber *)[self objectForKey:kVeloCaptureScreenshot] boolValue];
}

- (NSString *)method {
  return [self objectForKey:kVeloMethod];
}

- (NSArray *)httpHeaders {
  return [self objectForKey:kVeloHTTPHeaders];
}

- (NSInteger)timeLimit {
  return [(NSNumber *)[self objectForKey:kVeloTimeLimit] integerValue];
}

// Construct a mutable URL request suitable for executing the task.
// Use the default cache policy, and add any headers defined in the
// measure task.
- (NSMutableURLRequest *) request {
  NSURL *requestURL = [NSURL URLWithString:self.url];

  if (nil == [requestURL scheme]) {
    NSString *fixed_url = [NSString stringWithFormat:@"http://%@",self.url];
    NSLog(@"Task url (%@) had no scheme, assuming %@ ... ",
        self.url, fixed_url);
    requestURL = [NSURL URLWithString:fixed_url];
  }

#if SET_CACHE_POLICY
    NSURLRequestCachePolicy policy = self.clearCache ? NSURLRequestReloadIgnoringLocalAndRemoteCacheData : NSURLRequestUseProtocolCachePolicy;
#else
    NSURLRequestCachePolicy policy = NSURLRequestUseProtocolCachePolicy;
#endif

  NSTimeInterval timeLimit = (self.timeLimit ? self.timeLimit/1000.0 : 300.0 );
  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:requestURL cachePolicy:policy timeoutInterval:timeLimit];

  NSString *method = nil == self.method ? @"GET" : self.method;
  [request setHTTPMethod:method];
  if (nil != self.httpHeaders) {
    // Technically we can't assume these will be dicts here.
    for (NSDictionary *header in self.httpHeaders) {
      [request addValue:[header objectForKey:@"value"]
         forHTTPHeaderField:[header objectForKey:@"name"]];
    }
  }

  // it's up to the calling code to handle clearing cookies
  return request;
}

@end

// Wrapper class for a Velodrome checkin response
@implementation VeloCheckinResponse

- (VeloCheckinResponse *) initWithDictionary:(NSDictionary *)dictionary {
  if (nil == (self = [super initWithDictionary:dictionary]))
    return nil;

  // we can't use self.measureTask yet, because it's still just a dict, not
  // wrapped in a VelodromeObject

  id task = [self objectForKey:kVeloMeasureTask];

  if (nil != task && [task isKindOfClass:[NSDictionary class]]) {
    VeloMeasureTask *measureTask =
        [[[VeloMeasureTask alloc] initWithDictionary:task] autorelease];
    [self setObject:measureTask forKey:kVeloMeasureTask];
  }

  return self;
}

// only included for the sake of completeness, as the client never creates these
// to encode.
- (NSDictionary *)dictForEncoding {
  NSMutableDictionary *dictionary
      = [NSMutableDictionary dictionaryWithDictionary:[super dictForEncoding]];
  [dictionary setValue:[self.measureTask dictForEncoding]
                forKey:kVeloMeasureTask];

  return dictionary;
}

// getters for readonly properties
- (NSInteger)time {
  return [(NSNumber *)[self objectForKey:kVeloTime] intValue];
}

- (NSString *)status {
  return [self objectForKey:kVeloStatus];
}

- (NSInteger)nextCheckTime {
  return [(NSNumber *)[self objectForKey:kVeloNextCheckTime] intValue];
}

- (NSString *)cancelTask {
  return [self objectForKey:kVeloCancelTask];
}

- (VeloMeasureTask *)measureTask {
  return [self objectForKey:kVeloMeasureTask];
}

@end

// Wrapper class for a Velodrome measurement result
@implementation VeloMeasureResult

+ (VeloMeasureResult *)resultForTask:(NSString *)taskIdOrNil
                          withStatus:(veloResultStatus)status {

  NSDictionary *initDict;
  if (nil == taskIdOrNil) {
    initDict = [NSDictionary dictionary];
  } else {
    initDict = [NSDictionary dictionaryWithObject:taskIdOrNil
                                           forKey:kVeloTaskId];
  }

  VeloMeasureResult *this
      = [[[super alloc] initWithDictionary:initDict] autorelease];

  [this setObject:[this resultStatusCodeForStatus:status]
           forKey:kVeloResultCode];

  return this;
}

// getters and setters for readwrite properties
- (id) HAR {
  return [self objectForKey:kVeloHAR];
}

- (void) setHAR:(id)HAR {
  [self setObject:HAR forKey:kVeloHAR];
}

- (NSString *)url {
  return [self objectForKey:kVeloURL];
}

- (void)setUrl:(NSString *)url {
  [self setObject:[[url copy] autorelease] forKey:kVeloURL];
}

- (NSDictionary *)timings {
  return [self objectForKey:kVeloTimings];
}

- (void)setTimings:(NSDictionary *)timings {
  [self setObject:timings forKey:kVeloTimings];
}

// getters for readonly properties
- (NSString *)taskId {
  return [self objectForKey:kVeloTaskId];
}

- (NSString *)resultCode {
  return [self objectForKey:kVeloStatus];
}

- (veloResultStatus)resultStatus {
  return [self resultStatusForStatusCode:self.resultCode];
}

@end

// Wrapper class for a result submission (which includes a MeasureResult)
// Note that this class inherits from VeloCheckinSubmission
@implementation VeloMeasureResultSubmission

- (id)initWithDevice:(VeloDeviceInfo *)device
              result:(VeloMeasureResult *)result
              status:(veloDeviceStatus)status {
  if (nil == (self = [super initWithDevice:device status:status]))
    return nil;

  [dict_ setObject:result forKey:kVeloMeasureResult];

  return self;
}

- (NSDictionary *)dictForEncoding {
  NSMutableDictionary *dictionary
      = [NSMutableDictionary dictionaryWithDictionary:[super dictForEncoding]];
  [dictionary setValue:[self.measureResult dictForEncoding]
                forKey:kVeloMeasureResult];

  return dictionary;
}


+ (VeloMeasureResultSubmission *) resultSubmissionForDevice:(VeloDeviceInfo *)device
                                                     result:(VeloMeasureResult *)result
                                                     status:(veloDeviceStatus)status {
  return [[[self alloc] initWithDevice:device result:result status:status]
      autorelease];
}

- (VeloMeasureResult *)measureResult {
  return [self objectForKey:kVeloMeasureResult];
}

@end

// Wrapper class for the response to a measureResult submission.
@implementation VeloMeasureResultResponse

- (NSString *)statusCode {
  return [self objectForKey:kVeloStatus];
}

- (NSString *)taskId {
  return [self objectForKey:kVeloTaskId];
}

@end

// Velodrome is just a repository for some utility methods. The Velodrome class
// itself is never instatiated
@implementation Velodrome

// constants defining endpoints for Velodrome requests.
#define kCheckinEndpoint @"devicecheckin"
#define kResultEndpoint @"submitresult"
#define kScreenshotEndpoint @"submitscreenshot"
#define kTcpdumpEndpoint @"submittcpdump"

// Utility method used to add whatever cookies are set in the global store for
// for |server|'s URL to |request|. Used to add the authentication cookie.
void addCookiesForServerToRequest(NSURL *server, NSMutableURLRequest *request) {
  NSHTTPCookieStorage *sharedCookieStore
      = [NSHTTPCookieStorage sharedHTTPCookieStorage];
  NSArray *cookies = [sharedCookieStore cookiesForURL:server];
  if ([cookies count] > 0) {
    NSDictionary *cookieHeaders
        = [NSHTTPCookie requestHeaderFieldsWithCookies:cookies];
    if ([[request allHTTPHeaderFields] count] == 0) {
      [request setAllHTTPHeaderFields:cookieHeaders];
    } else {
      NSMutableDictionary *mergedHeaders
          = [NSMutableDictionary dictionaryWithDictionary:
              [request allHTTPHeaderFields]];
      [mergedHeaders addEntriesFromDictionary:cookieHeaders];
      [request setAllHTTPHeaderFields:mergedHeaders];
    }
  }
}

// URLRequest utility methods return a complete usable URLRequest for
// Velodrome requests.
//
// Each method sets the appropriate path (based on Velodrome's defined REST
// endpoints), cookies, and the correct HTTP body.
+ (NSURLRequest *)URLRequestForCheckin:(VeloCheckinSubmission *)checkin
                              onServer:(NSURL *)server {
  NSMutableURLRequest *request
    = [NSMutableURLRequest requestWithURL:
        [server URLByAppendingPathComponent:kCheckinEndpoint]];

  NSString *encodedCheckin = [checkin JSONRepresentation];

  addCookiesForServerToRequest(server, request);

  [request setHTTPMethod:@"POST"];
  [request setHTTPBody:[encodedCheckin dataUsingEncoding:NSUTF8StringEncoding]];

  return request;
}

+ (NSURLRequest *)URLRequestForMeasureResult:(VeloMeasureResultSubmission *)measureResult
                                    onServer:(NSURL *)server {

  NSMutableURLRequest *request
      = [NSMutableURLRequest requestWithURL:
          [server URLByAppendingPathComponent:kResultEndpoint]];

  NSString *encodedMeasureResult = [measureResult JSONRepresentation];

  addCookiesForServerToRequest(server, request);

  [request setHTTPMethod:@"POST"];
  [request setHTTPBody:
      [encodedMeasureResult dataUsingEncoding:NSUTF8StringEncoding]];

  return request;
}

+ (NSURLRequest *)URLRequestForScreenshot:(UIImage *)image
                                  forTask:(NSString *)taskId
                                 onServer:(NSURL *)server {
  NSString *path = [NSString stringWithFormat:@"%@/%@",kScreenshotEndpoint,taskId];
  NSMutableURLRequest *request
      = [NSMutableURLRequest requestWithURL:
          [server URLByAppendingPathComponent:path]];

  addCookiesForServerToRequest(server, request);

  [request setHTTPMethod:@"POST"];
  [request setHTTPBody:UIImagePNGRepresentation(image)];

  return request;
}

+ (NSURLRequest *)URLRequestForTCPDump:(NSData *)TCPDump
                               forTask:(NSString *)taskId
                              onServer:(NSURL *)server {

  NSString *path = [NSString stringWithFormat:@"%@/%@",kScreenshotEndpoint,taskId];
  NSMutableURLRequest *request
      = [NSMutableURLRequest requestWithURL:
          [server URLByAppendingPathComponent:path]];

  addCookiesForServerToRequest(server, request);

  [request setHTTPMethod:@"POST"];
  [request setHTTPBody:TCPDump];

  return request;
}


@end
