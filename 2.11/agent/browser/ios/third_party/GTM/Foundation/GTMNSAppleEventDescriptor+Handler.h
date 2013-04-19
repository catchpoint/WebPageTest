//
//  GTMNSAppleEventDescriptor+Handler.h
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

#import <Foundation/Foundation.h>
#import "GTMDefines.h"

@interface NSAppleEventDescriptor (GTMAppleEventDescriptorHandlerAdditions)
+ (id)gtm_descriptorWithPositionalHandler:(NSString*)handler 
                          parametersArray:(NSArray*)params;
+ (id)gtm_descriptorWithPositionalHandler:(NSString*)handler 
                     parametersDescriptor:(NSAppleEventDescriptor*)params;
+ (id)gtm_descriptorWithLabeledHandler:(NSString*)handler
                                labels:(AEKeyword*)labels
                            parameters:(id*)params
                                 count:(NSUInteger)count;

- (id)gtm_initWithPositionalHandler:(NSString*)handler 
                    parametersArray:(NSArray*)params 
    NS_RETURNS_RETAINED NS_CONSUMES_SELF;

- (id)gtm_initWithPositionalHandler:(NSString*)handler 
               parametersDescriptor:(NSAppleEventDescriptor*)params
    NS_RETURNS_RETAINED NS_CONSUMES_SELF;

- (id)gtm_initWithLabeledHandler:(NSString*)handler 
                          labels:(AEKeyword*)labels
                      parameters:(id*)params
                           count:(NSUInteger)count
    NS_RETURNS_RETAINED NS_CONSUMES_SELF;
@end
