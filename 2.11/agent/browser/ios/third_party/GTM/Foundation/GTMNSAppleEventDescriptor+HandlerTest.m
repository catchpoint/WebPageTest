//
//  GTNNSAppleEventDescriptor+HandlerTest.m
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

#import <Carbon/Carbon.h>
#import "GTMSenTestCase.h"
#import "GTMNSAppleEventDescriptor+Foundation.h"
#import "GTMNSAppleEventDescriptor+Handler.h"
#import "GTMUnitTestDevLog.h"

@interface GTMNSAppleEventDescriptor_HandlerTest : GTMTestCase
@end

@implementation GTMNSAppleEventDescriptor_HandlerTest
// Most of this gets tested by the NSAppleScript+Handler tests.
- (void)testPositionalHandlers {
  NSAppleEventDescriptor *desc 
    = [NSAppleEventDescriptor gtm_descriptorWithPositionalHandler:nil
                                                  parametersArray:[NSArray array]];
  STAssertNil(desc, @"got a desc?");
  
  desc = [NSAppleEventDescriptor gtm_descriptorWithPositionalHandler:@"happy"
                                                parametersDescriptor:nil];
  STAssertNotNil(desc, @"didn't get a desc?");

  desc = [NSAppleEventDescriptor gtm_descriptorWithLabeledHandler:nil
                                                           labels:nil
                                                       parameters:nil
                                                            count:0];
  STAssertNil(desc, @"got a desc?");
  
  AEKeyword keys[] = { keyASPrepositionGiven };
  NSString *string = @"foo";
  [GTMUnitTestDevLog expectString:@"Must pass in dictionary for "
   "keyASPrepositionGiven (got foo)"];
  desc = [NSAppleEventDescriptor gtm_descriptorWithLabeledHandler:@"happy"
                                                           labels:keys
                                                       parameters:&string
                                                            count:1];
  STAssertNil(desc, @"got a desc?");

  NSDictionary *dict = [NSDictionary dictionaryWithObject:@"bart" 
                                                   forKey:[NSNumber numberWithInt:4]];
  [GTMUnitTestDevLog expectString:@"Keys must be of type NSString or "
   "GTMFourCharCode: 4"];
  [GTMUnitTestDevLog expectPattern:@"Dictionary for keyASPrepositionGiven must "
   "be a user record field dictionary \\(got .*"];
  desc = [NSAppleEventDescriptor gtm_descriptorWithLabeledHandler:@"happy"
                                                           labels:keys
                                                       parameters:&dict
                                                            count:1];
  STAssertNil(desc, @"got a desc?");

}

@end
