//
//  GTMFourCharCodeTest.m
//
//  Copyright 2008 Google Inc.
//
//  Licensed under the Apache License, Version 2.0 (the "License"); you may not
//  use this file except in compliance with the License.  You may obtain a copy
//  of the License at
//
//  http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
//  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
//  License for the specific language governing permissions and limitations under
//  the License.
//

#import "GTMSenTestCase.h"
#import "GTMFourCharCode.h"

@interface GTMFourCharCodeTest : GTMTestCase {
 @private
  NSString *lowAsciiString_;
  NSString *highMacOSRomanString_;
}

@end

@implementation GTMFourCharCodeTest

static const FourCharCode kGTMHighMacOSRomanCode = 0xA5A8A9AA; // '•®©™'

- (void)setUp {
  // There appears to be a bug in the gcc 4.0 that is included with Xcode
  // 3.2.5 where in release mode it doesn't like some string constants
  // that include high or low ascii using the @"blah" string style.
  // So we build them by hand.
  // Use 8 bytes instead of 4, because stack protection gives us a warning
  // if we have a buffer smaller than 8 bytes.
  char string[8] = { 0, 0, 0, 1, 0, 0, 0, 0 };
  lowAsciiString_ = [[NSString alloc] initWithBytes:string
                                             length:4
                                           encoding:NSASCIIStringEncoding];

  // Must make sure our bytes are in the right order for building strings with,
  // otherwise the string comes out in the wrong order on low-endian systems.
  FourCharCode orderedString = htonl(kGTMHighMacOSRomanCode);
  highMacOSRomanString_
    = [[NSString alloc] initWithBytes:&orderedString
                               length:sizeof(orderedString)
                             encoding:NSMacOSRomanStringEncoding];
}

- (void)tearDown {
  [lowAsciiString_ release];
  [highMacOSRomanString_ release];
}

- (void)testFourCharCode {
  GTMFourCharCode *fcc = [GTMFourCharCode fourCharCodeWithString:@"APPL"];
  STAssertNotNil(fcc, nil);
  STAssertEqualObjects([fcc stringValue], @"APPL", nil);
  STAssertEqualObjects([fcc numberValue],
                       [NSNumber numberWithUnsignedInt:'APPL'], nil);
  STAssertEquals([fcc fourCharCode], (FourCharCode)'APPL', nil);

  STAssertEqualObjects([fcc description],
                       @"GTMFourCharCode - APPL (0x4150504C)", nil);
  STAssertEquals([fcc hash], (NSUInteger)'APPL', nil);

  NSData *data = [NSKeyedArchiver archivedDataWithRootObject:fcc];
  STAssertNotNil(data, nil);
  GTMFourCharCode *fcc2
    = (GTMFourCharCode*)[NSKeyedUnarchiver unarchiveObjectWithData:data];
  STAssertNotNil(fcc2, nil);
  STAssertEqualObjects(fcc, fcc2, nil);

  fcc = [[[GTMFourCharCode alloc] initWithFourCharCode:'\?\?\?\?'] autorelease];
  STAssertNotNil(fcc, nil);
  STAssertEqualObjects([fcc stringValue], @"????", nil);
  STAssertEqualObjects([fcc numberValue],
                       [NSNumber numberWithUnsignedInt:'\?\?\?\?'], nil);
  STAssertEquals([fcc fourCharCode], (FourCharCode)'\?\?\?\?', nil);

  fcc = [[[GTMFourCharCode alloc] initWithString:@"????"] autorelease];
  STAssertNotNil(fcc, nil);
  STAssertEqualObjects([fcc stringValue], @"????", nil);
  STAssertEqualObjects([fcc numberValue],
                       [NSNumber numberWithUnsignedInt:'\?\?\?\?'], nil);
  STAssertEquals([fcc fourCharCode], (FourCharCode)'\?\?\?\?', nil);

  fcc = [GTMFourCharCode fourCharCodeWithFourCharCode:1];
  STAssertNotNil(fcc, nil);
  STAssertTrue([[fcc stringValue] isEqualToString:lowAsciiString_], nil);
  STAssertEqualObjects([fcc numberValue],
                       [NSNumber numberWithUnsignedInt:1], nil);
  STAssertEquals([fcc fourCharCode], (FourCharCode)1, nil);

  fcc = [GTMFourCharCode fourCharCodeWithString:@"BADDSTRING"];
  STAssertNil(fcc, nil);

  fcc2 = [GTMFourCharCode fourCharCodeWithFourCharCode:kGTMHighMacOSRomanCode];
  STAssertNotNil(fcc2, nil);
  STAssertEqualObjects([fcc2 stringValue], highMacOSRomanString_, nil);
  STAssertEqualObjects([fcc2 numberValue],
                       [NSNumber numberWithUnsignedInt:kGTMHighMacOSRomanCode],
                       nil);
  STAssertEquals([fcc2 fourCharCode],
                 (FourCharCode)kGTMHighMacOSRomanCode, nil);
}

- (void)testStringWithCode {
  STAssertEqualObjects([GTMFourCharCode stringWithFourCharCode:'APPL'],
                       @"APPL", nil);
  STAssertEqualObjects([GTMFourCharCode stringWithFourCharCode:1],
                       lowAsciiString_, nil);
  STAssertEqualObjects([GTMFourCharCode stringWithFourCharCode:kGTMHighMacOSRomanCode],
                       highMacOSRomanString_, nil);
}

@end
