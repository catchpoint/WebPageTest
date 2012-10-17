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

#import "NSDate+ISO8601.h"

@implementation NSDate (NSDateISO8601Additions)

#define ISO_TIMEZONE_UTC_FORMAT @"Z"
#define ISO_TIMEZONE_OFFSET_FORMAT @"%+03d:%02d"

static NSDateFormatter* ISO8601Formatter = nil;

- (NSString *)ISO8601Representation {
  // Set up static object ISO8601Formatter on the first call.
  if (ISO8601Formatter == nil) {
    ISO8601Formatter = [[NSDateFormatter alloc] init];

    NSTimeZone *timeZone = [NSTimeZone localTimeZone];
    int offset = [timeZone secondsFromGMT];

    NSMutableString *strFormat =
        [NSMutableString stringWithString:@"yyyy-MM-dd'T'HH:mm:ss.SSS"];

    offset /= 60;  // bring down to minutes
    if (0 == offset)
      [strFormat appendString:ISO_TIMEZONE_UTC_FORMAT];
    else
      [strFormat appendFormat:ISO_TIMEZONE_OFFSET_FORMAT, offset / 60,
                                                          offset % 60];

    [ISO8601Formatter setTimeStyle:NSDateFormatterFullStyle];
    [ISO8601Formatter setDateFormat:strFormat];
  }

  return [ISO8601Formatter stringFromDate:self];
}

@end
