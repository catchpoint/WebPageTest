//  GTMGetURLHandlerTest.m
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
#import "GTMUnitTestDevLog.h"

static BOOL sURLHandlerWasHit;

@interface GTMGetURLHandlerBadClassWarning : NSObject
@end

@implementation GTMGetURLHandlerBadClassWarning : NSObject
@end

@interface GTMGetURLHandlerTest : GTMTestCase
@end

@implementation GTMGetURLHandlerTest
- (BOOL)openURLString:(NSString *)url {
  ProcessSerialNumber psn = { 0, kCurrentProcess };
  NSAppleEventDescriptor *currentProcess 
    = [NSAppleEventDescriptor descriptorWithDescriptorType:typeProcessSerialNumber
                                                     bytes:&psn
                                                    length:sizeof(ProcessSerialNumber)];
  NSAppleEventDescriptor *event 
    = [NSAppleEventDescriptor appleEventWithEventClass:kInternetEventClass
                                               eventID:kAEGetURL
                                      targetDescriptor:currentProcess
                                              returnID:kAutoGenerateReturnID
                                         transactionID:kAnyTransactionID];
  NSAppleEventDescriptor *keyDesc 
    = [NSAppleEventDescriptor descriptorWithString:url];
  [event setParamDescriptor:keyDesc forKeyword:keyDirectObject];
  OSStatus err = AESendMessage([event aeDesc], NULL, kAEWaitReply, 60);
  return err == noErr ? YES : NO;
}

+ (BOOL)gtm_openURL:(NSURL*)url {
  sURLHandlerWasHit = !sURLHandlerWasHit;
  return YES;
}

- (void)testURLCall {
  sURLHandlerWasHit = NO;
  
  [GTMUnitTestDevLogDebug expectPattern:@"Class GTMGetURLHandlerBadClassWarning "
   @"for URL handler GTMGetURLHandlerBadClassURL .*"];
  [GTMUnitTestDevLogDebug expectPattern:@"Unable to get class "
   @"GTMGetURLHandlerMissingClassWarning for URL handler "
   @"GTMGetURLHandlerMissingClassURL .*"];
  [GTMUnitTestDevLogDebug expectPattern:@"Missing GTMBundleURLClass for URL handler "
   @"GTMGetURLHandlerMissingHandlerURL .*"];
  STAssertTrue([self openURLString:@"gtmgeturlhandlertest://test.foo"], nil);
  STAssertTrue(sURLHandlerWasHit, @"URL handler not called");
  
  STAssertTrue([self openURLString:@"gtmgeturlhandlertest://test.foo"], nil);
  STAssertFalse(sURLHandlerWasHit, @"URL handler not called 2");
  
  // test the two URL schemes with bad entries
  STAssertTrue([self openURLString:@"gtmgeturlhandlerbadclasstest://test.foo"], 
               nil);
  
  STAssertTrue([self openURLString:@"gtmgeturlhandlermissingclasstest://test.foo"], 
               nil);

  STAssertTrue([self openURLString:@"gtmgeturlhandlermissinghandlerurl://test.foo"], 
               nil);
}
@end
