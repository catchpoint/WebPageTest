//
//  NSTask+Script.m
//
//  Copyright 2007-2009 Google Inc.
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

#import "NSTask+Script.h"
#import <stdarg.h>
#import "GTMXcodePlugin.h"

@implementation NSTask (GTMXcodePluginScript)
+ (NSTask *)gtm_runScript:(NSString *)name withArguments:(id)firstObject, ... {
  NSTask *task = nil;
  NSBundle *bundle = [GTMXcodePlugin pluginBundle];
  NSString *scriptPath = [bundle pathForResource:name 
                                          ofType:@"scpt" 
                                     inDirectory:@"Scripts"];
  if (scriptPath) {
    va_list args;
    va_start(args, firstObject);
    NSMutableArray *argArray = [NSMutableArray arrayWithObject:scriptPath];
    for (id object = firstObject; object != nil; object = va_arg(args, id)) {
      [argArray addObject:object];
    }
    va_end(args);
    task = [NSTask launchedTaskWithLaunchPath:@"/usr/bin/osascript"
                                    arguments:argArray];
  } else {
    NSLog(@"failed to find script \"%@\"", name);
  }
  return task;
}
@end
