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

 Created by Mark Cogan on 4/27/2011.

 ******************************************************************************/

#import "NSURLRequest+HAR.h"
#import "HAR.h"

#import "NSDate+ISO8601.h"
#import "GTMNSDictionary+URLArguments.h"
#import "Autobox.h"

@implementation NSURLRequest (NSURLRequestHARAdditions)

- (NSMutableDictionary *)HARRepresentation {
  NSMutableDictionary *requestHAR = [NSMutableDictionary dictionary];

  [requestHAR setObject:[self HTTPMethod] forKey:kHARMethod];
  [requestHAR setObject:[[[self URL] absoluteURL] description] forKey:kHARURL];

  // TODO is this always true?
  [requestHAR setObject:@"HTTP/1.1" forKey:kHARHTTPVersion];

  NSArray *requestCookies = [[NSHTTPCookieStorage sharedHTTPCookieStorage]
                             cookiesForURL:[self URL]];
  NSMutableArray *HARCookies = DEBUG_TIMING ?
                               [NSArray array] :
                               [HAR HARCookiesFromCookieArray:requestCookies];
  [requestHAR setObject:HARCookies forKey:kHARCookies];

  [HAR addHARHeadersFromDictionary:[self allHTTPHeaderFields] toHAR:requestHAR];

  // query string
  NSMutableArray *HARQueryParameters = [NSMutableArray array];
  NSDictionary *requestQueryArguments =
    [NSDictionary gtm_dictionaryWithHttpArgumentsString:[[self URL] query]];

  [requestQueryArguments enumerateKeysAndObjectsUsingBlock:
   ^(id paramName, id paramValue, BOOL *stop) {
     [HARQueryParameters addObject:[NSDictionary dictionaryWithObjectsAndKeys:
                                    paramName, kHARName,
                                    paramValue, kHARValue,
                                    nil]
      ];
   }
  ];

  [requestHAR setObject:HARQueryParameters forKey:kHARQueryString];

  // post data
  NSData *requestPostData = [self HTTPBody];
  if (0 < [requestPostData length]) {
    // assume the POST was encoded with UTF-8 (TODO don't assume this)
    NSString *postDataText =
      [[[NSString alloc] initWithBytes:[requestPostData bytes]
                                length:[requestPostData length]
                              encoding:NSUTF8StringEncoding]
       autorelease];
    NSDictionary *postData = [NSDictionary dictionaryWithObjectsAndKeys:
                              postDataText, kHARText,
                              @"application/octet-stream", kHARMIMEType,
                              nil];
    [requestHAR setObject:postData forKey:kHARPostData];
  }

  // body size
  [requestHAR setObject:UBOX([[self HTTPBody] length]) forKey:kHARBodySize];

  return requestHAR;
}

@end
