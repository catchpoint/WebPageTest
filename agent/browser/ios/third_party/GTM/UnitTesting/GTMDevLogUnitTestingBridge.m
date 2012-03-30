//
//  GTMDevLogUnitTestingBridge.m
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

#include "GTMUnitTestDevLog.h"

//
// NOTE: Odds are this file should not be included in your project.  It is
// only needed for some enhanced unit testing.
//
// By adding:
//    #define _GTMDevLog _GTMUnitTestDevLog
// to your prefix header (like the GTM Framework does), this function then
// works to forward logging messages to the GTMUnitTestDevLog class to
// allow logging validation during unittest, otherwise the messages go to
// NSLog like normal.
//
// See GTMUnitTestDevLog.h for more information on checking logs in unittests.
//
void _GTMUnitTestDevLog(NSString *format, ...) {
  Class devLogClass = NSClassFromString(@"GTMUnitTestDevLog");
  va_list argList;
  va_start(argList, format);
  if (devLogClass) {
    [devLogClass log:format args:argList];
  } else {
    NSLogv(format, argList); // COV_NF_LINE the class is in all our unittest setups
  }
  va_end(argList);
}
