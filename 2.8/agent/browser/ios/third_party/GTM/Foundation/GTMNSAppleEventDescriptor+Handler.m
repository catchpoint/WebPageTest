//
//  GTMNSAppleEventDescriptor+Handler.m
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

#import "GTMNSAppleEventDescriptor+Handler.h"
#import "GTMNSAppleEventDescriptor+Foundation.h"
#import "GTMMethodCheck.h"
#import <Carbon/Carbon.h>

@implementation NSAppleEventDescriptor (GTMAppleEventDescriptorHandlerAdditions)
GTM_METHOD_CHECK(NSProcessInfo, gtm_appleEventDescriptor);

+ (id)gtm_descriptorWithPositionalHandler:(NSString*)handler 
                          parametersArray:(NSArray*)params {
  return [[[self alloc] gtm_initWithPositionalHandler:handler 
                                      parametersArray:params] autorelease];
}

+ (id)gtm_descriptorWithPositionalHandler:(NSString*)handler 
                     parametersDescriptor:(NSAppleEventDescriptor*)params {
  return [[[self alloc] gtm_initWithPositionalHandler:handler 
                                 parametersDescriptor:params] autorelease];
}

+ (id)gtm_descriptorWithLabeledHandler:(NSString*)handler
                                labels:(AEKeyword*)labels
                            parameters:(id*)params
                                 count:(NSUInteger)count {
  return [[[self alloc] gtm_initWithLabeledHandler:handler
                                            labels:labels
                                        parameters:params
                                             count:count] autorelease];
}

- (id)gtm_initWithPositionalHandler:(NSString*)handler 
                    parametersArray:(NSArray*)params {
  return [self gtm_initWithPositionalHandler:handler 
                        parametersDescriptor:[params gtm_appleEventDescriptor]];
}

- (id)gtm_initWithPositionalHandler:(NSString*)handler 
               parametersDescriptor:(NSAppleEventDescriptor*)params {
  if ((self = [self initWithEventClass:kASAppleScriptSuite
                               eventID:kASSubroutineEvent
                      targetDescriptor:[[NSProcessInfo processInfo] gtm_appleEventDescriptor]
                              returnID:kAutoGenerateReturnID
                         transactionID:kAnyTransactionID])) {
    // Create an NSAppleEventDescriptor with the method handler. Note that the 
    // name must be lowercase (even if it is uppercase in AppleScript).
    // http://developer.apple.com/qa/qa2001/qa1111.html
    // has details.
    handler = [handler lowercaseString];
    if (!handler) {
      [self release];
      return nil;
    }
    NSAppleEventDescriptor *handlerDesc 
      = [NSAppleEventDescriptor descriptorWithString:handler];
    [self setParamDescriptor:handlerDesc forKeyword:keyASSubroutineName];
    if (params) {
      [self setParamDescriptor:params forKeyword:keyDirectObject];
    }
  }
  return self;
}


- (id)gtm_initWithLabeledHandler:(NSString*)handler
                          labels:(AEKeyword*)labels
                      parameters:(id*)params
                           count:(NSUInteger)count {
  if ((self = [self initWithEventClass:kASAppleScriptSuite
                               eventID:kASSubroutineEvent
                      targetDescriptor:[[NSProcessInfo processInfo] gtm_appleEventDescriptor]
                              returnID:kAutoGenerateReturnID
                         transactionID:kAnyTransactionID])) {
    if (!handler) {
      [self release];
      return nil;
    }
    // Create an NSAppleEventDescriptor with the method handler. Note that the 
    // name must be lowercase (even if it is uppercase in AppleScript).
    NSAppleEventDescriptor *handlerDesc 
      = [NSAppleEventDescriptor descriptorWithString:[handler lowercaseString]];
    [self setParamDescriptor:handlerDesc forKeyword:keyASSubroutineName];
    for (NSUInteger i = 0; i < count; i++) {
      NSAppleEventDescriptor *paramDesc = [params[i] gtm_appleEventDescriptor];
      if(labels[i] == keyASPrepositionGiven) {
        if (![params[i] isKindOfClass:[NSDictionary class]]) {
          _GTMDevLog(@"Must pass in dictionary for keyASPrepositionGiven "
                      "(got %@)", params[i]);
          [self release];
          self = nil;
          break;
        }
        NSAppleEventDescriptor *userDesc 
          = [paramDesc descriptorForKeyword:keyASUserRecordFields];
        if (!userDesc) {
          _GTMDevLog(@"Dictionary for keyASPrepositionGiven must be a user "
                      "record field dictionary (got %@)", params[i]);
          [self release];
          self = nil;
          break;
        }
        [self setParamDescriptor:userDesc
                      forKeyword:keyASUserRecordFields];
      } else {
        [self setParamDescriptor:paramDesc
                      forKeyword:labels[i]];
      }
    }
  }
  return self;
}

@end
