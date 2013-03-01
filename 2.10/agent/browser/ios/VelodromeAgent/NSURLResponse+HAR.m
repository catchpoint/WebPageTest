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

#import "NSURLResponse+HAR.h"
#import "HAR.h"
#import "NSDate+ISO8601.h"
#import "Autobox.h"

@implementation NSURLResponse (NSURLResponseHARAdditions)

// You might set this to NO in some debugging situations
#define INCLUDE_RESPONSE_BODY YES

- (NSMutableDictionary *)HARRepresentation {
  NSMutableDictionary *responseHAR  = [NSMutableDictionary dictionary];

  NSMutableArray *HARCookies = [NSMutableArray array];

  // Sometimes (for example from a data: URL) we just get an NSURLResponse, not
  // a full NSHTTPURLResponse. Only the latter has status codes and headers.
  if (!DEBUG_TIMING && [self isKindOfClass:[NSHTTPURLResponse class]]) {
    NSInteger statusCode = [(NSHTTPURLResponse *)self statusCode];
    [responseHAR setObject:IBOX(statusCode) forKey:kHARStatus];
    NSString *statusText =
      [NSHTTPURLResponse localizedStringForStatusCode:statusCode];
    [responseHAR setObject:statusText forKey:kHARStatusText];

    [HAR addHARHeadersFromDictionary:[(NSHTTPURLResponse *)self allHeaderFields]
                               toHAR:responseHAR];

    // derive cookies from headers
    NSArray *responseCookies = [NSHTTPCookie
      cookiesWithResponseHeaderFields:[(NSHTTPURLResponse *)self allHeaderFields]
                                forURL:[self URL]];

    HARCookies = [HAR HARCookiesFromCookieArray:responseCookies];
  } else {
    // Status code is mandatory in HAR, so we'll assume any non-HTTP responses
    // were sucessful
    [responseHAR setObject:IBOX(200) forKey:kHARStatus];
    [responseHAR setObject:@"OK" forKey:kHARStatusText];
    // set an empty array for the headers
    [responseHAR setObject:[NSArray array] forKey:kHARHeaders];
    // and we say the headers were zero bytes
    [responseHAR setObject:UBOX(0) forKey:kHARHeadersSize];
  }

  // TODO(marq) find a way to determine this authoritatively
  [responseHAR setObject:@"HTTP/1.1" forKey:kHARHTTPVersion];

  [responseHAR setObject:HARCookies forKey:kHARCookies];

  // TODO(marq) correctly populate this
  [responseHAR setObject:@"" forKey:kHARRedirectURL];

  return responseHAR;
}

- (NSMutableDictionary *)HARRepresentationWithData:(NSData *)data {
  NSMutableDictionary *HAR = [self HARRepresentation];

  NSUInteger contentLength = [data length];

  if (0 == contentLength && [self isKindOfClass:[NSHTTPURLResponse class]]) {
    NSString *contentLengthValue
      = (NSString *)[[(NSHTTPURLResponse *)self allHeaderFields]
                     objectForKey:@"Content-Length"];
    contentLength = [contentLengthValue integerValue];
  }

  [HAR setObject:UBOX(contentLength) forKey:kHARBodySize];

  NSString *contentText;
  if (INCLUDE_RESPONSE_BODY) {
    // TODO(marq) I'm guessing we can't assume UTF8 encoding
    contentText = [[NSString alloc] initWithBytes:[data bytes]
                                           length:[data length]
                                         encoding:NSUTF8StringEncoding];
  } else {
    contentText = @"(body suppressed)";
  }

  NSDictionary *HARContent = [NSDictionary dictionaryWithObjectsAndKeys:
                              UBOX(contentLength), kHARSize,
                                  [self MIMEType], kHARMIMEType,
                                      contentText, kHARText,
                              nil];

  if (INCLUDE_RESPONSE_BODY)
    [contentText release];

  [HAR setObject:HARContent forKey:kHARContent];

  return HAR;
}

@end
