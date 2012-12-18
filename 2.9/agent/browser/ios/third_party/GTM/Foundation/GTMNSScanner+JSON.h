//
//  GTMNSScanner+JSON.h
//
//  Copyright 2009 Google Inc.
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

// Utilities for NSScanner containing JSON
@interface NSScanner (GTMNSScannerJSONAdditions)

// Grabs the first JSON Object (dictionary) that it finds and returns it
// in jsonString. We don't parse the json, we just return the first valid JSON
// dictionary we find. There are several other JSON parser packages that
// will actually parse the json for you. We recommend json-framework
// http://code.google.com/p/json-framework/
- (BOOL)gtm_scanJSONObjectString:(NSString **)jsonString;

// Grabs the first JSON Array (array) that it finds and returns it
// in jsonString. We don't parse the json, we just return the first valid JSON
// array we find. There are several other JSON parser packages that
// will actually parse the json for you. We recommend json-framework
// http://code.google.com/p/json-framework/
- (BOOL)gtm_scanJSONArrayString:(NSString**)jsonString;

@end
