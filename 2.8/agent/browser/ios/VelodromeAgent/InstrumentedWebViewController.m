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

 Created by Mark Cogan on 4/19/2011.

 ******************************************************************************/

#import "InstrumentedWebViewController.h"

#import "VelodromeAgentAppDelegate.h"
#import "GTMDefines.h"

// HAR stuff
#import "HAR.h"
#import "NSDate+ISO8601.h"
#import "Autobox.h"

// JSON stuff
#import "NSObject+SBJSON.h"
#import "NSString+SBJSON.h"

// Screenshot requires graphics methods.
#import <QuartzCore/CALayer.h>

// Javascript template for injecting event handlers into pages.
// This is a printf template which takes two parameters: the
// name of the JavaScript event to handle (eg, "load"), and
// an ID to store the timing information for that event under.
// The injected handler simply stores the timestamp (as integer
// millisecodns since the epoch) as a property of the window
// object (unless it has previously been stored).

#define kJSTemplate                                                 \
    @"window.addEventListener(                                      \
        \"%1$@\",                                                   \
        function(){                                                 \
          if(!window.%2$@){                                         \
            window.%2$@=+(new Date());                              \
          }                                                         \
        },                                                          \
        false)"

// Templates for hobbling disruptive JavaScript functions, by replacing
// them with functions that return simple values or do nothing.
// Typical targets would be alert() and confirm()
#define kJSSwizzleTemplateReturnTrue                                    \
    @"window.%1$@ = function(){return 1}"

#define kJSSwizzleTemplateReturnFalse                                   \
    @"window.%1$@ = function(){return 0}"

#define kJSSwizzleTemplateNoOp                                          \
    @"window.%1$@ = function(){}"

#define MS_PER_SECOND 1000.0

// Private class used to track the timing and status of each resource
@interface WebViewResource : NSObject {
@private
  NSString *url_;
  id identifier_;
  NSMutableArray *redirectEntries_;
  NSDate *recieveTime_;
  NSDate *startTime_;
  NSDate *finishTime_;
  BOOL isSent_;
  BOOL hasRecievedResponse_;
  BOOL isFinishedLoading_;
  NSError *error_;
}

@property (retain)   NSString *url;
// even though the webview owns the identifiers, we retain them so we can track
// (for debugging) after it's done with them
@property (retain)   id identifier;
@property (readonly) NSArray *redirectEntries;

// you can't set these directly; there are methods to set them to the current
// time
@property (readonly) NSDate *receiveTime;
@property (readonly) NSDate *startTime;

// This is only settable by also setting hasRecievedResponse
@property (readonly) NSDate *finishTime;

@property            BOOL isSent;              // default NO
@property            BOOL isFinishedLoading;   // default NO

// Setting this to YES also sets finishTime to the current time
@property            BOOL hasRecievedResponse; // default NO

@property (retain)   NSError *error;

// Designated initializer for this class. Creates a new resource record
// for |url| with identifier |identifier|. All times are nil, and
// |redirectEntries| is empty.
- (id) initWithIdentifier:(id)identifier URL:(NSString *)url;

// Creates a new resource record as above, and populates |redirectEntries|.
- (id) initWithIdentifier:(id)identifier
                      URL:(NSString *)url
          redirectEntries:(NSArray *)redirectEntries;

// set the start time of the receiver to the current time
- (void) setStartTime;

// set the recieve time of the receiver to the current time
- (void) setRecieveTime;

// returns seconds between the receiver's |startTime| and |recieveTime|
- (NSTimeInterval) waitTime;

// adds a redirect entry to the receiver's |redirectEntries| array.
// |entry| should be a HAR Entry record (although this method doesn't
// operate on the contents of |entry|).
- (void) addRedirectEntry:(NSDictionary *)entry;

@end

@interface InstrumentedWebViewController(private)

- (void)injectJavascriptForEvent:(NSString *)event;
- (NSInteger)timingForJavascriptEvent:(NSString *)event;

@end

@implementation InstrumentedWebViewController

@synthesize startDate = startDate_;
@synthesize finishDate = finishDate_;
@synthesize loadTime = loadTime_;
@synthesize postLoadTime = postLoadTime_;

@synthesize HARLog = HARLog_;

static NSArray* OKURLSchemes;

#pragma mark -
#pragma mark object lifecyle methods
#pragma mark -

+ (void)initialize {
  OKURLSchemes = [[NSArray alloc] initWithObjects:
                   @"about",
                   @"data",
                   @"http",
                   @"https",
                   nil];
}


// override of designated initializer for UIViewController
// |nibNameOrNil| and |nibBundleOrNil| will always be nil
- (id)initWithNibName:(NSString *)nibNameOrNil
               bundle:(NSBundle *)nibBundleOrNil {
  if (nil == (self = [super initWithNibName:nibNameOrNil
                                     bundle:nibBundleOrNil]))
    return nil;

  trackingJSInjected_ = NO;
  probabalyDone_ = NO;
  resourceTracker_ = [[NSMutableArray array] retain];
  resourceLock_ = [[NSLock alloc] init];
  JSTimings_ = [[NSMutableDictionary dictionary] retain];
  startDate_ = nil;
  return self;
}

- (void)dealloc {
  [startDate_ release];
  [finishDate_ release];
  [JSTimings_ release];

  [HARLog_ release];
  [uniqueID_ release];
  [resourceTracker_ release];
  [resourceLock_ release];

  ((UIWebView *)self.view).delegate = nil;
  [[[(UIWebView *)self.view _documentView] webView] setResourceLoadDelegate:nil];

  [super dealloc];
}

#pragma mark -
#pragma mark UIViewController overrides for view lifecycle
#pragma mark -

- (void)loadView {
  UIWebView *webView = [[UIWebView alloc]
                        initWithFrame:[UIScreen mainScreen].applicationFrame];
  [webView setScalesPageToFit:YES];
  WebView *internalWebView = [[webView _documentView] webView];
  [internalWebView setResourceLoadDelegate:self];

  webView.delegate = self;
  [webView setUserInteractionEnabled:NO];

  self.view = webView;
  [webView release];
}

- (BOOL)shouldAutorotateToInterfaceOrientation:
          (UIInterfaceOrientation)interfaceOrientation {
  return (interfaceOrientation == UIInterfaceOrientationPortrait);
}

#pragma mark -
#pragma mark utility methods
#pragma mark -

// utility for logging urls. Some sites (such as google.com) will make
// heavy use of data: URLS, which can be many hundreds of characters long and
// make reading logs problematic. This attenuates a data:[mime-type];... URL
// to the form data:[mime-type]<i>, where i is the number of characters in the
// data: URL after the mime-type
- (NSString *)printableURL:(NSURLRequest *)request {
  NSString *desc = [[[request URL] absoluteURL] description];
  if ([desc hasPrefix:@"data:"]) {
    NSArray *parts = [desc componentsSeparatedByString:@";"];
    desc = [NSString stringWithFormat:@"%@<%d>",
            [parts objectAtIndex:0],
            [(NSString *)[parts objectAtIndex:1] length]
            ];
  }
  return desc;
}

// shortcut property for getting to the entries array in the HAR log
- (NSMutableArray *) HAREntries {
    if (nil == HARLog_)
      return nil;

  return (NSMutableArray *)[HARLog_ objectForKey:kHAREntries];
}

// utility function to get around zany functional defect in
// stringByAddingPercentEscapesUsingEncoding
NSString *properlyEscapeString(NSString *string) {
  CFStringRef charsToEscape = CFSTR("!*'();:@&=+$,/?%#[]");
  CFStringRef escaped
    = CFURLCreateStringByAddingPercentEscapes(NULL,
                                              (CFStringRef)string,
                                              NULL,
                                              charsToEscape,
                                              kCFStringEncodingUTF8);
  return [(NSString *)escaped autorelease];
}

#pragma mark -
#pragma mark page actions
#pragma mark -

// Loads |request|, accumulating a log of page activity in |resourceLog_|.
// Page loading is handled asynchonously on a new thread. Callers should call
// waitForLoad to wait until the page load is (probabaly) done.
- (void)loadRequest:(NSURLRequest *)request
    withPageProperties:(NSDictionary *)pageProperties {
  HARLog_ = [[HAR HAR] retain];

  NSDictionary* pageRecord = [HAR HARPageWithId:@"page0"
                                          title:[self printableURL:request]
                                 pageProperties:pageProperties];

  NSArray *HARPages = [NSArray arrayWithObject:pageRecord];
  [HARLog_ setObject:HARPages forKey:kHARPages];  // retains HARPages

  [(UIWebView *)self.view performSelectorOnMainThread:@selector(loadRequest:)
                                           withObject:request
                                        waitUntilDone:YES];
}

// Loads |HTML|, otherwise behaving exactly as if loadRequest: was called.
// Mostly used in unit tests.
- (void)loadHTML:(NSString *)HTML {
  // percent-escape HTML and turn it into a data: URL which then
  // gets loaded via loadRequest:
  NSString *escapedHTML = properlyEscapeString(HTML);
  NSString *dataURL = [@"data:text/html;charset=utf-8,"
                       stringByAppendingString:escapedHTML];

  NSURL *URL = [NSURL URLWithString:dataURL];

  NSURLRequest *staticHTMLRequest = [NSURLRequest requestWithURL:URL];

  [self loadRequest:staticHTMLRequest withPageProperties:nil];
}

// Executes |javascript| on the page. This happens asynchronously, and there is
// no guarantee than |javascript| will have completed execution when this
// method returns.
- (void)executeJavascript:(NSString *)javascript {
  [(UIWebView *)self.view
   performSelectorOnMainThread:@selector(stringByEvaluatingJavaScriptFromString:)
                    withObject:javascript
                 waitUntilDone:YES];
}

// The webview has it's own notion of "loading" or not. It looks like even after
// UIWebView.loading becomes NO, a lot of resources may still be loading, so
// it looks like using this as a guide to when the page is "done" isn't so good.
// But we'll leave it in the code as an option for testing.
#define CHECK_WEBVIEW_LOADING 0

// Waits for whatever request was requested to finish loading, then does some
// cleanup on the resource log. When this method returns, it is safe to assume
// |resourceLog_| won't change any further, and that all requests generated by
// the initial request have been completed for serveral seconds.
//
// How it works: Since "done loading" is tricky to define, for this implementation
// the WebView is considered done when every resource load that has been started
// has either been done or failed to to an error for at least |WAIT_TIME|
// seconds. Pathological web pages (for example, one that loads a new image
// every |WAIT_TIME|-1 seconds) would result in this method never returning.
// To handle these cases, there is a hard timeout after which the page load is
// terminated regardless of how many requests are open
- (void)waitForLoad {
  VelodromeAgentAppDelegate *appDelegate
      = (VelodromeAgentAppDelegate *)[[UIApplication sharedApplication] delegate];

  while (1) {
    [NSThread sleepForTimeInterval:appDelegate.resourceTimeout];

    BOOL stillLoading = NO;

#if CHECK_WEBVIEW_LOADING
    if (((UIWebView *)self.view).loading) {
#endif
      [resourceLock_ lock];
      if ([resourceTracker_ count] > 0) {
        for (WebViewResource *resource in resourceTracker_) {
          NSTimeInterval delta = [resource.finishTime timeIntervalSinceNow];
          if (!resource.isFinishedLoading ||
              (-delta < appDelegate.resourceTimeout)) {
            stillLoading = YES;
            break;
          }
        }
      } else {
        // There are no resources yet, so the page is still loading.
        // note that the page itself counts as a resource, so there will
        // always be at least one resource.
        stillLoading = YES;
      }
      [resourceLock_ unlock];
#if CHECK_WEBVIEW_LOADING
    } else {
      stillLoading = NO;
    }
#endif
    if (!stillLoading)
      break;  // from the while(1)

    // still loading, but should we time it out anyway?
    if (-[startDate_ timeIntervalSinceNow] > appDelegate.pageTimeout)
      break;  // from the while(1)
  }

  // If we're timed out, a resource callback may try and modify
  // |resourceTracker_| or |HAREntries| while we're finishing. So we
  // lock here to prevent that.
  [resourceLock_ lock];

  probabalyDone_ = YES;
  BOOL added = NO;

  NSDate *latestResourceFinishTime = [NSDate distantPast];
  // Move any accumulated redirect entries from |resourceTracker_| onto
  // |HAREntries|
  for (WebViewResource *resource in resourceTracker_) {
    if ([resource.redirectEntries count] > 0) {
      added = YES;
      [self.HAREntries addObjectsFromArray:resource.redirectEntries];
    }
    if (NSOrderedAscending == [resource.finishTime compare:latestResourceFinishTime])
      latestResourceFinishTime = resource.finishTime;
  }

  // If we need to, sort |HAREntries| by start time
  if (added) {
    [self.HAREntries sortUsingComparator:
     ^NSComparisonResult(id obj1, id obj2) {
       // compare stringified start times; they should alpha sort correctly
       NSString *obj1Started = [(NSDictionary *)obj1 objectForKey:kHARStarted];
       NSString *obj2Started = [(NSDictionary *)obj2 objectForKey:kHARStarted];
       return [obj1Started compare:obj2Started];
     }];
  }

  // and record the delta (if any) between when the webview said it was done
  // and when the last resource finished loading
  postLoadTime_ = [latestResourceFinishTime timeIntervalSinceDate:finishDate_];

  [resourceLock_ unlock];
}

- (UIImage*)takeScreenshot {
  // UIGraphics calls have undefined results if not run on the main thread.
  // In practice, running on another thread occasionally crashes if the UI
  // is drawing while this method runs.
  _GTMDevAssert([NSThread isMainThread],
                @"takeScreenshot must be called on the main thread.");

  UIGraphicsBeginImageContextWithOptions(self.view.bounds.size, NO, 0.0);
  [self.view.layer renderInContext:UIGraphicsGetCurrentContext()];
  UIImage* result = UIGraphicsGetImageFromCurrentImageContext();
  UIGraphicsEndImageContext();

  if (result == nil) {
    // We have seen nil screenshots when memory allocation of the image fails.
    NSLog(@"nil screenshot:  Low memory is one possible cause.");
  }

  return result;
}

#pragma mark -
#pragma mark JavaScript function disabling
#pragma mark -

- (void)injectJavascriptReplacingFunction:(NSString *)function
                             withTemplate:(NSString *)template {
  NSString *javascript = [NSString stringWithFormat:template, function];
  [self executeJavascript:javascript];
}

#pragma mark -
#pragma mark JavaScript instrumentation injection and retrieval
#pragma mark -

- (NSString *)idForEvent:(NSString *)event {
  return [NSString stringWithFormat:@"__velodrome_%@_%@__", event, uniqueID_];
}

- (void)injectJavascriptForEvent:(NSString *)event {
  NSString *javascript = [NSString stringWithFormat:kJSTemplate,
                          event,[self idForEvent:event]];
  [self executeJavascript:javascript];
}

- (void)retrieveInjectedKey:(NSString *)key {
  NSString *javascript = [NSString stringWithFormat:@"window.%@",key];
  NSString *value = [(UIWebView *)self.view
                     stringByEvaluatingJavaScriptFromString:javascript];
  [JSTimings_ setValue:value forKey:key];
}

- (NSInteger)timingForJavascriptEvent:(NSString *)event {
  NSString *key = [self idForEvent:event];
  [self performSelectorOnMainThread:@selector(retrieveInjectedKey:)
                         withObject:key
                      waitUntilDone:YES];
  NSString *timingValue = [JSTimings_ valueForKey:key];
  long long eventTimeSinceEpoch = [timingValue longLongValue]; // in integer ms
  if (0 == eventTimeSinceEpoch) {
    NSLog(@"Couldn't capture time of event %@", event);
    return kHARUnknownTimeInterval;
  }

  long long pageStartTime = [startDate_ timeIntervalSince1970] * MS_PER_SECOND;
  return eventTimeSinceEpoch - pageStartTime;
}

#pragma mark -
#pragma mark UIWebViewDelegate methods
#pragma mark -

// UIWebView delegate methods

// webViewDidStartLoad will be called one *or more* times, and each time it
// potentially signals a replacement of the JS window object.
- (void)webViewDidStartLoad:(UIWebView *)webView  {
  // we only care about the first time this is called
  if (nil == startDate_) {
    self.startDate = [NSDate date];
    unsigned long long start_time = [startDate_ timeIntervalSince1970] * MS_PER_SECOND;
    uniqueID_ = [[NSString stringWithFormat:@"%qu", start_time] retain];
  }
}

// Each webViewDidStartLoad gets paired with a webViewDidFinishLoad:, so we want
// to harvest any JS timing information the first time this gets called.
- (void)webViewDidFinishLoad:(UIWebView *)webView {
  self.finishDate = [NSDate date];
  loadTime_ = [finishDate_ timeIntervalSinceDate:startDate_];

  if (!trackingJSExtracted_) {
    // Retrieve the JavaScript event timings.
    //
    // We have two ways to determine the onload time:
    // 1) Injected JS runs at onload, and records the time.
    // 2) The timing of the call to this method.
    //
    // The JS event should be more accurate, because extra work might be done
    // between onload and the call to this method.  However, the way we inject
    // the Javascript can not guarantee that it manages to be injected before
    // the onload event fires.  For example, www.google.com on wifi often
    // runs onload before the javascript can be injected.  So, we record both.
    // The HAR property "onload" is set using #1 if we got it, and #2 otherwise.
    // So that the server can tell which value was used, we add optional
    // parameters _onloadByMethod._injectedJS and
    // _onloadByMethod._UIWebviewCallback with both values.  The WebPageTest
    // server does checks to see that the values are close, and will alert if
    // they are not.
    //
    // TODO(???): Should have a config mapping JS events to HAR keys.
    NSInteger onloadTimeByInjectedJS = [self timingForJavascriptEvent:@"load"];
    NSInteger onloadTimeByWebViewCallback = (loadTime_ * MS_PER_SECOND);

    NSInteger onload;
    if (onloadTimeByInjectedJS == kHARUnknownTimeInterval) {
      NSLog(@"Unable to get onload time using JS onload event.  Using "
            "UIWebView delegate callback timing (%d ms) instead.",
            onloadTimeByWebViewCallback);
      onload = onloadTimeByWebViewCallback;
    } else {
      double difference = 1.0 - ((double)onloadTimeByWebViewCallback /
                                 (double)onloadTimeByInjectedJS);
      NSLog(@"Onload times from JS callback and UIWebView delegate callback "
            "vary by %f%% .", difference * 100.0);
      onload = onloadTimeByInjectedJS;
    }

    // The only way to get DOMContentLoaded is to use the injected JS.
    NSInteger DOMContentLoadedTime =
        [self timingForJavascriptEvent:@"DOMContentLoaded"];

    // Insert the times into the HAR.
    NSDictionary *HARPage =
        [(NSArray *)[HARLog_ objectForKey:kHARPages] objectAtIndex:0];
    NSMutableDictionary *pageTimings = [HARPage objectForKey:kHARPageTimings];

    NSDictionary *onloadByMethod = [NSDictionary dictionaryWithObjectsAndKeys:
             IBOX(onloadTimeByInjectedJS), kHarOnloadInjectedJS,
        IBOX(onloadTimeByWebViewCallback), kHarOnloadUIWebViewCallback,
                                     nil];

    [pageTimings setValue:onloadByMethod forKey:kHAROnloadByMethod];
    [pageTimings setValue:IBOX(onload) forKey:kHAROnLoad];
    [pageTimings setValue:IBOX(DOMContentLoadedTime) forKey:kHAROnContentLoad];

    trackingJSExtracted_ = YES;
  }
}

- (void)webView:(UIWebView *)webView didFailLoadWithError:(NSError *)error {
  [self webViewDidFinishLoad:webView];
}

#pragma mark -
#pragma mark resource/entry utility methods
#pragma mark -

// Given |entry|, a dictionary representing a HAR entry, update its send and
// wait timings based on |resource|, and add the HAR representation
// of |response|
- (void) updateEntry:(NSMutableDictionary *)entry
        withResponse:(NSURLResponse *)response
            resource:(WebViewResource *)resource {
  [resource setRecieveTime];

  NSMutableDictionary *timings = [entry objectForKey:kHARTimings];
  [timings setObject:IBOX(0) forKey:kHARSend];
  [timings setObject:IBOX(MS_PER_SECOND * [resource waitTime]) forKey:kHARWait];

  // We don't actually have the response content, so we just pass in an empty
  // NSData object to HARRepresentationWithData:
  [entry setObject:[response HARRepresentationWithData:[NSData data]]
            forKey:kHARResponse];
}

// Given |entry|, a dictionary representing a HAR entry, update its recieve
// timing based on |resource|. Additionally, if any mandatory timing information
// is missing (perhaps because the resource load failed with an error), create
// placeholder response data to guarantee a well-formed HAR. Finally, total all
// non-negative timings for the resource and store that as |entry|'s
// time value.
- (void) finalizeEntry:(NSMutableDictionary *)entry
          withResource:(WebViewResource *)resource {
  if (nil == resource.receiveTime) {
    [resource setRecieveTime];
    NSMutableDictionary *timings = [entry objectForKey:kHARTimings];
    [timings setObject:IBOX(0) forKey:kHARSend];
    [timings setObject:IBOX(MS_PER_SECOND * [resource waitTime])
                forKey:kHARWait];
  }

  if (nil == [entry objectForKey:kHARResponse]) {
    // fake up a response.
    NSURLResponse *response =
      [[[NSURLResponse alloc] initWithURL:[NSURL URLWithString:@""]
                                 MIMEType:@"text/html"
                    expectedContentLength:0
                         textEncodingName:@"unknown"] autorelease];
    NSMutableDictionary *HARResponse =
      [response HARRepresentationWithData:[NSData data]];

    NSString *emptyResponseComment;
    if (resource.error) {
      emptyResponseComment
        = [NSString stringWithFormat:@"Empty response for error: %@",
            [resource.error localizedDescription]
          ];
    } else {
      emptyResponseComment = @"Empty response";
    }

    [HARResponse setObject:emptyResponseComment forKey:kHARComment];
    [entry setObject:HARResponse forKey:kHARResponse];
  }

  NSDate *now = [NSDate date];
  NSTimeInterval recieveTime = [now timeIntervalSinceDate:resource.receiveTime];
  NSMutableDictionary *timings = [entry objectForKey:kHARTimings];

  [timings setObject:IBOX(1000 * recieveTime) forKey:kHARReceive];

  __block NSInteger totalTime = 0;
  [timings enumerateKeysAndObjectsUsingBlock:
   ^(id key, id object, BOOL *stop) {
     NSInteger timing = [(NSNumber *)object integerValue];
     if (timing > 0)
       totalTime += timing;
   }
   ];

  [entry setObject:IBOX(totalTime) forKey:@"time"];
}

#pragma mark -
#pragma mark ResourceLoadDelegate Methods
#pragma mark -

// ResourceLoadDelegate is not a documented protocol in iOS, but (as of iOS 4.3)
// is present and functional. The Apple documentation for the
// WebResourceLoadDelegate protocol in MacOS is at:
//
// http://developer.apple.com/library/mac/#documentation/Cocoa/Reference/WebKit/Protocols/WebResourceLoadDelegate_Protocol/Reference/Reference.html#//apple_ref/occ/cat/WebResourceLoadDelegate

// Called before the resource has started loading. Returns an identifier for the
// resource that is retained by the caller (that is, |sender| or its internal
// controller -- not our code).
//
// We use boxed ascending integers for identifiers, corresponding to the indices
// of the HAR Entry array. This usefully means we can, given a resource identifier,
// find the corresponding HAR entry.
//
// General note on |dataSource| -- this is always the thing (almost always the
// main HTML on a page) that's requesting the resource.
- (id)webView:(WebView *)sender
      identifierForInitialRequest:(NSURLRequest *)request
      fromDataSource:(WebDataSource *)dataSource {
  NSNumber *identifier = nil;

  [resourceLock_ lock];

  if (probabalyDone_) {
    NSLog(@"Resource load for %@ after we thought we were done! Ignoring!",
          [self printableURL:request]);
  } else {
    // count = 1 + index == index of object added next.
    identifier = IBOX([self.HAREntries count]);
    // create the new HAR entry -- at this stage just an empty dictionary
    [self.HAREntries addObject:[NSMutableDictionary dictionary]];

    // for every HAR entry we create a corresponding WebViewResource object
    // in |resourceTracker_|.
    WebViewResource *newResource
      = [[[WebViewResource alloc] initWithIdentifier:identifier
                                                 URL:[self printableURL:request]
         ]
       autorelease];
    [resourceTracker_ addObject:newResource];
  }

  [resourceLock_ unlock];

  return identifier;
}

// Called directly before a resource is requested. If |redirectResponse| is
// non-nil, there was a redirect involved, as follows:
//
// Suppose a request |R1| redirects to |R2|
// expected sequence of calls is
//  resource:|i| willSendRequest:|R1| redirectResponse:nil
//  resource:|i| willSendRequest:|R2| redirectResponse:<302 from R1>

- (NSURLRequest *)webView:(WebView *)sender
                 resource:(id)identifier
          willSendRequest:(NSURLRequest *)request
         redirectResponse:(NSURLResponse *)redirectResponse
           fromDataSource:(WebDataSource *)dataSource {
  if (probabalyDone_) {
    NSLog(@"Late resource load being killed ... ");
    return nil;
  }

  // Some pages redirect to things that aren't web pages, thus exiting our app.
  // Let's not do that.
  BOOL recordButDoNotContinue = NO;
  NSURL *requestURL = [request URL];
  if (![OKURLSchemes containsObject:[requestURL scheme]]) {
    NSLog(@"URL %@ would exit app, skipping!", requestURL);
    recordButDoNotContinue = YES;
  }

  NSInteger resourceIndex = [(NSNumber *)identifier integerValue];

  if (nil != redirectResponse && !recordButDoNotContinue) {
    // If this was called as part of a redirect, the situation is slightly complicated.
    // Each part of the redirect chain has the same |identifier| value from the
    // calling code. However we want to have separate HAR entries for each request
    // in the chain. Beacuse |identifier| maps to a specific value in the HAR
    // entry array, we need to keep the array of entries the same size as the
    // number of resource identifiers the calling code requests.
    //
    // Redirects are thus handled by replacing the old (redirecting) HAR entry
    // with a new one, and saving the old one in the WebViewResource for the
    // current resource.

    // Step 1: grab the current HAR entry and resource record.
    NSMutableDictionary *currentEntryHAR
        = (NSMutableDictionary *)[self.HAREntries objectAtIndex:resourceIndex];
    WebViewResource *currentResource
        = (WebViewResource *)[resourceTracker_ objectAtIndex:resourceIndex];

    // Step 2: update and finalize the current entry. It's done.
    [self updateEntry:currentEntryHAR
         withResponse:redirectResponse
             resource:currentResource];
    [self finalizeEntry:currentEntryHAR withResource:currentResource];

    // Step 3: create a new entry and resource record, acquiring any previous
    //         redirect entries from |currentResource|
    NSMutableDictionary *nextEntryHAR = [NSMutableDictionary dictionary];
    WebViewResource *nextResource
      = [[[WebViewResource alloc]
          initWithIdentifier:identifier
                         URL:[self printableURL:request]
             redirectEntries:currentResource.redirectEntries]
         autorelease];

    // Step 4: Add the finalized current entry to the new resource record as a
    //         redirect entry
    [nextResource addRedirectEntry:currentEntryHAR];

    // Lock so that we can modify |resourceTracker_| and |HAREntries|
    [resourceLock_ lock];

    // Step 5: replace currentEntryTracker with nextEntryTracker
    [resourceTracker_ replaceObjectAtIndex:resourceIndex withObject:nextResource];
    // Step 6: replace currentEntryHAR with nextEntryHAR in the main list of entities
    [self.HAREntries replaceObjectAtIndex:resourceIndex withObject:nextEntryHAR];

    [resourceLock_ unlock];

    // End state: the number of HAREntries and resource records is unchanged.
    // The the current entry and resource records for |identifier| are those
    // for |request|, which will be sent when this method returns. The HAR entry
    // for |redirectResponse| is attached to the current resource record's
    // |redirectEntries|.
  }

#define FIX_CACHE_HEADERS 1

#if FIX_CACHE_HEADERS
  NSURLRequest *finalRequest;

  if (NSURLRequestUseProtocolCachePolicy == [request cachePolicy]) {
    finalRequest = request;
  } else {
    // a CachePolicy of NSURLRequestReloadIgnoringLocalCaches still sends
    // all kinds of cache-happy headers. So we have to clone |request|
    // and clean it up
    NSMutableURLRequest *nonCachingRequest = [[request mutableCopy] autorelease];
    [nonCachingRequest setValue:nil forHTTPHeaderField:@"If-None-Match"];
    [nonCachingRequest setValue:nil forHTTPHeaderField:@"If-Modified-Since"];
    [nonCachingRequest setValue:nil forHTTPHeaderField:@"Cache-Control"];
    finalRequest = nonCachingRequest;
  }
#else
  NSURLRequest *finalRequest = request;
#endif

  // update the HAR entry for this resource, setting page reference,
  // start time, and the request record.
  //
  // If we were to support multple pages, we would need to use something other
  // than the hardcoded "page0" for the page regerence.
  NSMutableDictionary *HAR =
      (NSMutableDictionary *)[self.HAREntries objectAtIndex:resourceIndex];
  NSDate *now = [NSDate date];
  [HAR setObject:@"page0" forKey:kHARPageRef];
  [HAR setObject:[now ISO8601Representation] forKey:kHARStarted];
  [HAR setObject:[finalRequest HARRepresentation] forKey:kHARRequest];

  // we don't yet fully support cache information, so just set an empty
  // dictionary for the |HAR|'s cache record
  [HAR setObject:[NSDictionary dictionary] forKey:kHARCache];

  // create a HAR Entry timing record, initialized with -1s for all values
  NSMutableDictionary *timings
      = [NSMutableDictionary dictionaryWithObjectsAndKeys:
            IBOX(kHARUnknownTimeInterval), kHARBlocked,
            IBOX(kHARUnknownTimeInterval), kHARDNS,
            IBOX(kHARUnknownTimeInterval), kHARConnect,
            IBOX(kHARUnknownTimeInterval), kHARSend,
            IBOX(kHARUnknownTimeInterval), kHARWait,
            IBOX(kHARUnknownTimeInterval), kHARReceive,
                                      nil];
  [HAR setObject:timings forKey:kHARTimings];

  if (recordButDoNotContinue) {
    [HAR setObject:@"Unsupported URL scheme" forKey:kHARComment];
    finalRequest = nil;
  }

  // log the start time and mark the resource as being sent.
  // (the calling code does the actual sending, of course).
  WebViewResource *resource
      = (WebViewResource *)[resourceTracker_ objectAtIndex:resourceIndex];
  [resource setStartTime];
  [resource setIsSent:YES];

  return finalRequest;
}

// Called as soon as the first byte of a response is recieved, which means the
// resource has begun downloading.
- (void)webView:(WebView *)sender resource:(id)identifier
                        didReceiveResponse:(NSURLResponse *)response
                            fromDataSource:(WebDataSource *)dataSource {

  if (probabalyDone_)
    return;

  if (!trackingJSInjected_) {
    [self injectJavascriptReplacingFunction:@"alert"
                               withTemplate:kJSSwizzleTemplateNoOp];
    [self injectJavascriptReplacingFunction:@"confirm"
                               withTemplate:kJSSwizzleTemplateReturnTrue];
    [self injectJavascriptForEvent:@"load"];
    [self injectJavascriptForEvent:@"DOMContentLoaded"];
    trackingJSInjected_ = YES;
  }

  NSInteger resourceIndex = [(NSNumber *)identifier integerValue];

  // Grab the HAR entry and resource tracker for this resource
  NSMutableDictionary *HAR
      = (NSMutableDictionary *)[self.HAREntries objectAtIndex:resourceIndex];
  WebViewResource *resource
      = (WebViewResource *)[resourceTracker_ objectAtIndex:resourceIndex];

  [self updateEntry:HAR withResponse:response resource:resource];
  [resource setHasRecievedResponse:YES];
}

// Called if there was a failure loading the resource. Note that this isn't a
// 404 or a 500 -- this is a case where we don't get a HTTP response back at all,
// or where something else goes wrong.
- (void)webView:(WebView *)sender
      resource:(id)identifier
      didFailLoadingWithError:(NSError *)error
      fromDataSource:(WebDataSource *)dataSource {
  if (probabalyDone_)
    return;

  NSInteger resourceIndex = [(NSNumber *)identifier integerValue];

  // Grab the HAR entry and resource tracker for this resource
  NSMutableDictionary *HAR
      = (NSMutableDictionary *)[self.HAREntries objectAtIndex:resourceIndex];
  WebViewResource *resource
      = (WebViewResource *)[resourceTracker_ objectAtIndex:resourceIndex];
  resource.error = error;

  [self finalizeEntry:HAR withResource:resource];
  [resource setIsFinishedLoading:YES];
}


// Called as soon as a resource has finished loading. Note that we can expect
// the calling code to release |identifier| shortly after this, so if we care
// about it we need to retain it ourselves (which WebViewResource does).
- (void)webView:(WebView *)sender
       resource:(id)identifier
       didFinishLoadingFromDataSource:(WebDataSource *)dataSource {
  if (probabalyDone_)
    return;

  NSInteger resourceIndex = [(NSNumber *)identifier integerValue];
  NSMutableDictionary *HAR
      = (NSMutableDictionary *)[self.HAREntries objectAtIndex:resourceIndex];
  WebViewResource *resource
      = (WebViewResource *)[resourceTracker_ objectAtIndex:resourceIndex];

  [self finalizeEntry:HAR withResource:resource];
  [resource setIsFinishedLoading:YES];
}

// Called each time a resource recieves a content length
// No functionality in the current implementation; included for reference only
#if 0
- (void)webView:(WebView *)sender
      resource:(id)identifier
      didReceiveContentLength:(NSUInteger)length
      fromDataSource:(WebDataSource *)dataSource {

}
#endif

@end

@implementation WebViewResource

// Tracks the timing and status of each resource. A WebViewresource object is
// created for each
@synthesize url=url_;
@synthesize identifier=identifier_;
@synthesize redirectEntries=redirectEntries_;
@synthesize receiveTime=recieveTime_;
@synthesize startTime=startTime_;
@synthesize finishTime=finishTime_;
@synthesize isSent=isSent_;
@synthesize hasRecievedResponse=hasRecievedResponse_;
@synthesize error=error_;

// Designated initializer for this class. Creates a new resource record
// for |url| with identifier |identifier|. All times are nil, and
// |redirectEntries| is empty.
- (id)initWithIdentifier:(id)identifier URL:(NSString *)url {
  if (nil == (self = [super init]))
    return nil;

  redirectEntries_ = [[NSMutableArray array] retain];

  self.url = url;
  self.identifier = identifier;

  isSent_ = hasRecievedResponse_ = isFinishedLoading_ = NO;

  return self;
}

// Creates a new resource record as above, and populates |redirectEntries|.
- (id)initWithIdentifier:(id)identifier
                      URL:(NSString *)url
          redirectEntries:(NSArray *)redirectEntries {
  if (nil == (self = [self initWithIdentifier:identifier URL:url]))
    return nil;

  [redirectEntries_ addObjectsFromArray:redirectEntries];

  return self;
}

- (void)dealloc {
  [url_ release];
  [identifier_ release];
  [redirectEntries_ release];
  [recieveTime_ release];
  [startTime_ release];
  [finishTime_ release];
  [error_ release];
  [super dealloc];
}

// set the start time of the receiver to the current time
- (void)setStartTime {
  [startTime_ release];
  startTime_ = [[NSDate date] retain];
}

// sets the recieve time of the receiver to the current time
- (void)setRecieveTime {
  [recieveTime_ release];
  recieveTime_ = [[NSDate date] retain];
}

- (BOOL)isFinishedLoading {
  return isFinishedLoading_;
}

// setter for |isFinishedLoading_| which has the side effect of setting
// |finishTime_| to the current time.
- (void)setIsFinishedLoading:(BOOL)isFinishedLoading {
  isFinishedLoading_ = isFinishedLoading;
  if (isFinishedLoading_) {
    [finishTime_ release];
    finishTime_ = [[NSDate date] retain];
  }
}

// returns the difference between |recieveTime_| and |startTime_|
- (NSTimeInterval) waitTime {
  if (recieveTime_ && startTime_) {
    return [recieveTime_ timeIntervalSinceDate:startTime_];
  } else {
    return 0.0;
  }
}

// adds a redirect entry, presumably a dictionary corresponding to a
// HAR Entry.
- (void) addRedirectEntry:(NSDictionary *)entry {
  [redirectEntries_ addObject:entry];
}

@end


