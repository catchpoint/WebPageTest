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

 Created by Mark Cogan on 4/29/2011.

 ******************************************************************************/

#import <Foundation/Foundation.h>


#import "NSURLResponse+HAR.h"
#import "NSURLRequest+HAR.h"

// if YES, don't send a bunch of stuff that makes the raw HAR harder to read
#define DEBUG_TIMING NO

// Utility methods for creating basic components of dictionaries and arrays
// destined to be converted into HAR (JSON) files.
// The HAR format:
//   https://groups.google.com/group/http-archive-specification/web/har-1-2-spec
//
// This class is never instatiated.
@interface HAR : NSObject

// returns a new HAR dictionary populated with Creator and Browser entries
// and including an empty mutable Entries array
+ (NSMutableDictionary *)HAR;

// Creates a HAR page dictionary with an id of |pageId| and a title of |title|,
// and a boilerplate pageTimings value with -1s for both OnLoad and
// OnContentLoad
+ (NSDictionary *)HARPageWithId:(NSString *)pageId
                          title:(NSString *)title
                 pageProperties:(NSDictionary *)pageProperties;

// For debugging: walks through the entries in |HAR| and validates that they
// contain responses and send and wait timings. Exceptions are logged to the
// console.
+ (void)HARAudit:(NSDictionary *)HAR;

// Returns an array of HAR HTTP cookie structures corresponding to the
// contents of |cookies|. |cookies| is expected to be an array containing only
// NSHTTPCookie objects.
+ (NSMutableArray *)HARCookiesFromCookieArray:(NSArray *)cookies;

// Given a dictionary of name-value pairs (|headers|) which correspond to
// HTTP request or response headers, update the HAR request or response structure
// |HAR| by adding a Headers array of HAR headers structures, and adding a
// headersSize value corresponding to the totaly bytes of header data implied
// by |headers|
//
// Note that if |DEBUG_TIMING| is true, the header array that's added to |HAR|
// is always empty
+ (void)addHARHeadersFromDictionary:(NSDictionary *)headers
                              toHAR:(NSMutableDictionary *)HAR;

@end

// common HAR key names
#define kHARLog @"log"
#define kHARVersion @"version"
#define kHARCreator @"creator"
#define kHARBrowser @"browser"
#define kHARPages   @"pages"
#define kHAREntries @"entries"
#define kHARComment @"comment"
#define kHARName    @"name"
#define kHARStarted @"startedDateTime"
#define kHARId      @"id"
#define kHARTitle   @"title"
#define kHARPageTimings @"pageTimings"
#define kHAROnContentLoad @"onContentLoad"
#define kHAROnLoad   @"onLoad"
#define kHARPageRef  @"pageref"
#define kHARTime     @"time"
#define kHARRequest  @"request"
#define kHARResponse @"response"
#define kHARCache    @"cache"
#define kHARTimings  @"timings"
#define kHARServerIPAddress @"serverIPAddress"
#define kHARConnection @"connection"
#define kHARMethod   @"method"
#define kHARURL      @"url"
#define kHARHTTPVersion @"httpVersion"
#define kHARCookies  @"cookies"
#define kHARHeaders  @"headers"
#define kHARQueryString @"queryString"
#define kHARPostData @"postData"
#define kHARHeadersSize @"headersSize"
#define kHARBodySize @"bodySize"
#define kHARStatus   @"status"
#define kHARStatusText @"statusText"
#define kHARContent  @"content"
#define kHARRedirectURL @"redirectURL"

// cookies
#define kHARValue @"value"
#define kHARPath  @"path"
#define kHARDomain @"domain"
#define kHARExpires @"expires"
#define kHARHTTPOnly @"httpOnly"
#define kHARSecure @"secure"

// post data
#define kHARMIMEType @"mimeType"
#define kHARParams   @"params"
#define kHARText     @"text"
#define kHARFileName @"fileName"
#define kHARContentType @"contentType"

// content
#define kHARSize @"size"
#define kHARCompression @"compression"
#define kHAREncoding @"encoding"

// cache
#define kHARBeforeRequest @"beforeRequest"
#define kHARAfterRequest @"afterRequest"
#define kHARLastAccess @"lastAccess"
#define kHARExpires @"expires"
#define kHAReTag @"eTag"
#define kHARHitCount @"hitCount"

// timings
#define kHARBlocked @"blocked"
#define kHARDNS @"dns"
#define kHARConnect @"connect"
#define kHARSend @"send"
#define kHARWait @"wait"
#define kHARReceive @"receive"
#define kHARSSL @"ssl"

// Any unknown time interval is represented by -1.
#define kHARUnknownTimeInterval -1

// The HAR spec allows extensions so long as the extra data starts with an
// underscore.  The following keys are used to add data outside the HAR spec.

// We add an object _onloadByMethod to each page object, which holds the onload
// time found using different methods.
#define kHAROnloadByMethod @"_onloadByMethod"
#define kHarOnloadUIWebViewCallback @"_UIWebviewCallback"
#define kHarOnloadInjectedJS @"_injectedJS"
