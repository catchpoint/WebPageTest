//
//  GTMNSAppleScript+HandlerTest.m
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
#import <Carbon/Carbon.h>
#import "GTMNSAppleScript+Handler.h"
#import "GTMNSAppleEventDescriptor+Foundation.h"
#import "GTMUnitTestDevLog.h"
#import "GTMGarbageCollection.h"
#import "GTMSystemVersion.h"
#import "GTMFourCharCode.h"

@interface GTMNSAppleScript_HandlerTest : GTMTestCase {
  NSAppleScript *script_; 
}
@end

@implementation GTMNSAppleScript_HandlerTest
- (void)invokeTest {
  // NOTE: These tests are disabled in GC is on.  See the comment/warning in the
  // GTMNSAppleScript+Handler.h for more details, but we disable them to avoid
  // the tests failing (crashing) when it's Apple's bug. Please bump the system
  // check as appropriate when new systems are tested. Currently broken on
  // 10.5.8 and below. Radar 6126682.
  SInt32 major, minor, bugfix;
  [GTMSystemVersion getMajor:&major minor:&minor bugFix:&bugfix];
  BOOL gcEnabled = GTMIsGarbageCollectionEnabled();
  if (gcEnabled && major <= 10 && minor <= 5 && bugfix <= 8) {
    NSLog(@"--- %@ NOT run because of GC incompatibilites ---", [self name]);
  } else {
    [super invokeTest];
  }
}

- (void)setUp {
  NSBundle *bundle
    = [NSBundle bundleForClass:[GTMNSAppleScript_HandlerTest class]];
  STAssertNotNil(bundle, nil);
  NSString *path = [bundle pathForResource:@"GTMNSAppleEvent+HandlerTest" 
                                    ofType:@"scpt"
                               inDirectory:@"Scripts"];
  STAssertNotNil(path, [bundle description]);
  NSDictionary *error = nil;
  script_ 
    = [[NSAppleScript alloc] initWithContentsOfURL:[NSURL fileURLWithPath:path]
                                             error:&error];
  STAssertNotNil(script_, [error description]);
  STAssertNil(error, @"Error should be nil. Error = %@", [error description]);
}

- (void)tearDown {
  [script_ release];
  script_ = nil;
}

- (void)testExecuteAppleEvent {
  NSString *source = @"on test()\nreturn 1\nend test";
  NSAppleScript *script 
    = [[[NSAppleScript alloc] initWithSource:source] autorelease];
  STAssertNotNil(script, nil);
  NSDictionary *error = nil;
  NSAppleEventDescriptor *desc = [script gtm_executePositionalHandler:@"test" 
                                                           parameters:nil 
                                                                error:&error];
  STAssertNotNil(desc, [error description]);
  STAssertNil(error, @"Error should be nil. Error = %@", [error description]);
  STAssertEquals([desc gtm_objectValue], [NSNumber numberWithInt:1], nil);
  
  // bogus script
  source = @"adf872345ba asdf asdf gr";
  script = [[[NSAppleScript alloc] initWithSource:source] autorelease];
  STAssertNotNil(script, nil);
  desc = [script gtm_executePositionalHandler:@"test" 
                                   parameters:nil 
                                        error:&error];
  STAssertNil(desc, nil);
  STAssertNotNil(error, @"Error should not be nil");
}

- (void)testHandlerNoParamsNoReturn {
  NSDictionary *error = nil;
  NSAppleEventDescriptor *desc = [script_ gtm_executePositionalHandler:@"test" 
                                                            parameters:nil 
                                                                 error:&error];
  STAssertNotNil(desc, [error description]);
  STAssertNil(error, @"Error should be nil. Error = %@", [error description]);
  STAssertEquals([desc descriptorType], (DescType)typeNull, nil);
  desc = [script_ gtm_executePositionalHandler:@"test" 
                                    parameters:[NSArray array] 
                                         error:&error];
  STAssertNotNil(desc, [error description]);
  STAssertNil(error, @"Error should be nil. Error = %@", [error description]);
  STAssertEquals([desc descriptorType], (DescType)typeNull, nil);
  
  //Applescript doesn't appear to get upset about extra params
  desc = [script_ gtm_executePositionalHandler:@"test" 
                                    parameters:[NSArray arrayWithObject:@"foo"] 
                                         error:&error];
  STAssertNotNil(desc, [error description]);
  STAssertNil(error, @"Error should be nil. Error = %@", [error description]);
  STAssertEquals([desc descriptorType], (DescType)typeNull, nil);
}
  
- (void)testHandlerNoParamsWithReturn {
  NSDictionary *error = nil;
  NSAppleEventDescriptor *desc 
    = [script_ gtm_executePositionalHandler:@"testReturnOne" 
                                 parameters:nil 
                                      error:&error];
  STAssertNotNil(desc, [error description]);
  STAssertNil(error, @"Error should be nil. Error = %@", [error description]);
  STAssertEquals([desc descriptorType], (DescType)typeSInt32, nil);
  STAssertEquals([desc int32Value], (SInt32)1, nil);
  desc = [script_ gtm_executePositionalHandler:@"testReturnOne" 
                                    parameters:[NSArray array] 
                                         error:&error];
  STAssertNotNil(desc, [error description]);
  STAssertNil(error, @"Error should be nil. Error = %@", [error description]);
  STAssertEquals([desc descriptorType], (DescType)typeSInt32, nil);
  STAssertEquals([desc int32Value], (SInt32)1, nil);
  
  //Applescript doesn't appear to get upset about extra params
  desc = [script_ gtm_executePositionalHandler:@"testReturnOne" 
                                    parameters:[NSArray arrayWithObject:@"foo"] 
                                         error:&error];
  STAssertNotNil(desc, [error description]);
  STAssertNil(error, @"Error should be nil. Error = %@", [error description]);
  STAssertEquals([desc descriptorType], (DescType)typeSInt32, nil);
  STAssertEquals([desc int32Value], (SInt32)1, nil);
}

- (void)testHandlerOneParamWithReturn {
  NSDictionary *error = nil;
  // Note case change in executeHandler call
  NSAppleEventDescriptor *desc 
    = [script_ gtm_executePositionalHandler:@"testreturnParam" 
                                 parameters:nil 
                                      error:&error];
  STAssertNil(desc, @"Desc should by nil %@", desc);
  STAssertNotNil(error, nil);
  error = nil;
  
  desc = [script_ gtm_executePositionalHandler:@"testReturnParam" 
                                    parameters:[NSArray array] 
                                         error:&error];
  STAssertNil(desc, @"Desc should by nil %@", desc);
  
  // Verify that our error handling is working correctly.
  STAssertEquals([[error allKeys] count], (NSUInteger)6, @"%@", error);
  STAssertNotNil([error objectForKey:GTMNSAppleScriptErrorOffendingObject], 
                 @"%@", error);
  STAssertNotNil([error objectForKey:GTMNSAppleScriptErrorPartialResult], 
                 @"%@", error);
  
  error = nil;
  
  desc = [script_ gtm_executePositionalHandler:@"testReturnParam" 
                                    parameters:[NSArray arrayWithObject:@"foo"]
                                         error:&error];
  STAssertNotNil(desc, [error description]);
  STAssertNil(error, @"Error should be nil. Error = %@", [error description]);
  STAssertEquals([desc descriptorType], (DescType)typeUnicodeText, nil);
  STAssertEqualObjects([desc gtm_objectValue], @"foo", nil);
}

- (void)testHandlerTwoParamsWithReturn {
  NSDictionary *error = nil;
  // Note case change in executeHandler call
  // Test case and empty params
  NSAppleEventDescriptor *desc 
    = [script_ gtm_executePositionalHandler:@"testADDPArams" 
                                 parameters:nil 
                                      error:&error];
  STAssertNil(desc, @"Desc should by nil %@", desc);
  STAssertNotNil(error, nil);
  
  // Test empty params
  error = nil;
  desc = [script_ gtm_executePositionalHandler:@"testAddParams" 
                                    parameters:[NSArray array] 
                                         error:&error];
  STAssertNil(desc, @"Desc should by nil %@", desc);
  STAssertNotNil(error, nil);
  
  error = nil;
  NSArray *args = [NSArray arrayWithObjects:
    [NSNumber numberWithInt:1],
    [NSNumber numberWithInt:2],
    nil];
  desc = [script_ gtm_executePositionalHandler:@"testAddParams" 
                                    parameters:args 
                                         error:&error];
  STAssertNotNil(desc, [error description]);
  STAssertNil(error, @"Error should be nil. Error = %@", [error description]);
  STAssertEquals([desc descriptorType], (DescType)typeSInt32, nil);
  STAssertEquals([desc int32Value], (SInt32)3, nil);

  // Test bad params
  error = nil;
  args = [NSArray arrayWithObjects:
    @"foo",
    @"bar",
    nil];
  desc = [script_ gtm_executePositionalHandler:@"testAddParams" 
                                    parameters:args 
                                         error:&error];
  STAssertNil(desc, @"Desc should by nil %@", desc);
  STAssertNotNil(error, nil);

  // Test too many params. Currently Applescript allows this so it should pass
  error = nil;
  args = [NSArray arrayWithObjects:
    [NSNumber numberWithInt:1],
    [NSNumber numberWithInt:2],
    [NSNumber numberWithInt:3],
    nil];
  desc = [script_ gtm_executePositionalHandler:@"testAddParams" 
                                    parameters:args 
                                         error:&error];
  STAssertNotNil(desc, [error description]);
  STAssertNil(error, @"Error should be nil. Error = %@", [error description]);
  STAssertEquals([desc descriptorType], (DescType)typeSInt32, nil);
  STAssertEquals([desc int32Value], (SInt32)3, nil);}

- (void)testLabeledHandler {
  NSDictionary *error = nil;
  AEKeyword labels[] = { keyDirectObject, 
                         keyASPrepositionOnto, 
                         keyASPrepositionGiven };
  id params[3];
  params[0] = [NSNumber numberWithInt:1];
  params[1] = [NSNumber numberWithInt:3];
  params[2] = [NSDictionary dictionaryWithObject:[NSNumber numberWithInt:4] 
                                          forKey:@"othervalue"];
  
  NSAppleEventDescriptor *desc 
    = [script_ gtm_executeLabeledHandler:@"testAdd" 
                                  labels:labels
                              parameters:params
                                   count:sizeof(params) / sizeof(id)
                                                              error:&error];
  STAssertNotNil(desc, [error description]);
  STAssertNil(error, @"Error should be nil. Error = %@", [error description]);
  STAssertEquals([desc descriptorType], (DescType)typeSInt32, nil);
  STAssertEquals([desc int32Value], (SInt32)8, nil);
  
  // Test too many params. Currently Applescript allows this so it should pass
  AEKeyword labels2[] = { keyDirectObject, 
                         keyASPrepositionOnto, 
                         keyASPrepositionBetween,
                         keyASPrepositionGiven };
  id params2[4];
  params2[0] = [NSNumber numberWithInt:1];
  params2[1] = [NSNumber numberWithInt:3];
  params2[2] = [NSNumber numberWithInt:5];
  params2[3] = [NSDictionary dictionaryWithObject:[NSNumber numberWithInt:4] 
                                            forKey:@"othervalue"];

  error = nil;
  desc = [script_ gtm_executeLabeledHandler:@"testAdd" 
                                     labels:labels2
                                 parameters:params2
                                      count:sizeof(params2) / sizeof(id)
                                      error:&error];
  STAssertNotNil(desc, [error description]);
  STAssertNil(error, @"Error should be nil. Error = %@", [error description]);
  STAssertEquals([desc descriptorType], (DescType)typeSInt32, nil);
  STAssertEquals([desc int32Value], (SInt32)8, nil);}

- (void)testHandlers {
  NSSet *handlers = [script_ gtm_handlers];
  NSSet *expected = [NSSet setWithObjects:
                     @"aevtpdoc",
                     @"test",
                     @"testreturnone",
                     @"testreturnparam",
                     @"testaddparams",
                     @"testadd",
                     @"testgetscript",
                     nil];
  if ([GTMSystemVersion isSnowLeopardOrGreater]) {
    // Workaround for bug in SnowLeopard
    // rdar://66688601 OSAGetHandlersNames returns names in camelcase instead
    // of smallcaps.
    handlers = [handlers valueForKey:@"lowercaseString"];
  }
  STAssertEqualObjects(handlers, expected, @"Unexpected handlers?");
}

- (void)testInheritedHandlers {
  NSDictionary *error = nil;
  NSAppleEventDescriptor *desc 
    = [script_ gtm_executePositionalHandler:@"testGetScript" 
                                 parameters:nil 
                                      error:&error];
  STAssertNil(error, nil);
  STAssertNotNil(desc, nil);
  NSAppleScript *script = [desc gtm_objectValue];
  STAssertTrue([script isKindOfClass:[NSAppleScript class]], nil);
  error = nil;
  desc = [script gtm_executePositionalHandler:@"parentTestScriptFunc"
                                   parameters:nil error:&error];
  STAssertNil(error, nil);
  STAssertNotNil(desc, nil);
  NSString *value = [desc gtm_objectValue];
  STAssertEqualObjects(value, @"parent", nil);
}

- (void)testProperties {
  NSDictionary *error = nil;
  NSAppleEventDescriptor *desc 
    = [script_ gtm_executePositionalHandler:@"testGetScript" 
                                 parameters:nil 
                                      error:&error];
  STAssertNil(error, nil);
  STAssertNotNil(desc, nil);
  NSAppleScript *script = [desc gtm_objectValue];
  STAssertTrue([script isKindOfClass:[NSAppleScript class]], nil);
  
  NSSet *properties = [script gtm_properties];
  NSSet *expected 
    = [NSSet setWithObjects:
       @"testscriptproperty",
       @"parenttestscriptproperty",
       @"foo",
       @"testscript",
       @"parenttestscript",
       @"asdscriptuniqueidentifier",
       [GTMFourCharCode fourCharCodeWithFourCharCode:pVersion],
       [GTMFourCharCode fourCharCodeWithFourCharCode:pASPrintDepth],
       [GTMFourCharCode fourCharCodeWithFourCharCode:pASTopLevelScript],
       [GTMFourCharCode fourCharCodeWithFourCharCode:pASResult],
       [GTMFourCharCode fourCharCodeWithFourCharCode:pASMinutes],
       [GTMFourCharCode fourCharCodeWithFourCharCode:pASDays],
       // No constant for linefeed in the 10.5 sdk
       // Radar 6132775 Need a constant for the Applescript Property 'lnfd'
       [GTMFourCharCode fourCharCodeWithFourCharCode:'lnfd'],
       [GTMFourCharCode fourCharCodeWithFourCharCode:pASPi],
       [GTMFourCharCode fourCharCodeWithFourCharCode:pASReturn],
       [GTMFourCharCode fourCharCodeWithFourCharCode:pASSpace],
       [GTMFourCharCode fourCharCodeWithFourCharCode:pASPrintLength],
       [GTMFourCharCode fourCharCodeWithFourCharCode:pASQuote],
       [GTMFourCharCode fourCharCodeWithFourCharCode:pASWeeks],
       [GTMFourCharCode fourCharCodeWithFourCharCode:pTextItemDelimiters],
       // Applescript properties should be pASSeconds, but
       // on 10.5.4/10.5.5 it is actually using cSeconds.
       // Radar 6132696 Applescript root level property is cSeconds 
       // instead of pASSeconds
       [GTMFourCharCode fourCharCodeWithFourCharCode:cSeconds],
       [GTMFourCharCode fourCharCodeWithFourCharCode:pASHours],
       [GTMFourCharCode fourCharCodeWithFourCharCode:pASTab],
       nil];
  if ([GTMSystemVersion isSnowLeopardOrGreater]) {
    // Workaround for bug in SnowLeopard
    // rdar://6289077 OSAGetPropertyNames returns names in camelcase instead
    // of lowercase.
    id obj;
    NSMutableSet *properties2 = [NSMutableSet set];
    GTM_FOREACH_OBJECT(obj, properties) {
      if ([obj isKindOfClass:[NSString class]]) {
        obj = [obj lowercaseString];
      }
      [properties2 addObject:obj];
    }
    properties = properties2;
  }
  STAssertEqualObjects(properties, expected, @"Unexpected properties?");
  id value = [script gtm_valueForProperty:@"testScriptProperty"];
  STAssertEqualObjects(value, [NSNumber numberWithInt:5], @"bad property?");
  BOOL goodSet = [script gtm_setValue:@"bar" 
                          forProperty:@"foo" 
                      addingDefinition:NO];
  STAssertTrue(goodSet, @"Couldn't set property");
  
  // Test local set
  value = [script gtm_valueForProperty:@"foo"];
  STAssertEqualObjects(value, @"bar", @"bad property?");

  // Test inherited set
  value = [script_ gtm_valueForProperty:@"foo"];
  STAssertEqualObjects(value, @"bar", @"bad property?");

  [GTMUnitTestDevLog expectPattern:@"Unable to setValue:bar forProperty:"
   "\\(null\\) from <NSAppleScript: 0x[0-9a-f]+> \\(-50\\)"];
  goodSet = [script gtm_setValue:@"bar" 
                     forProperty:nil
                 addingDefinition:NO];
  STAssertFalse(goodSet, @"Set property?");

  [GTMUnitTestDevLog expectPattern:@"Unable to setValue:bar forProperty:3"
   " from <NSAppleScript: 0x[0-9a-f]+> \\(-50\\)"];
  goodSet = [script gtm_setValue:@"bar"
                     forProperty:[NSNumber numberWithInt:3]
                 addingDefinition:YES];
  STAssertFalse(goodSet, @"Set property?");
  
  
  [GTMUnitTestDevLog expectPattern:@"Unable to get valueForProperty:gargle "
   "from <NSAppleScript: 0x[0-9a-f]+> \\(-1753\\)"];
  value = [script gtm_valueForProperty:@"gargle"];
  STAssertNil(value, @"Property named gargle?");
  
  goodSet = [script_ gtm_setValue:@"wow"
                      forProperty:@"addedProperty" 
                  addingDefinition:YES];
  STAssertTrue(goodSet, @"Unable to addProperty");
  
  value = [script gtm_valueForProperty:@"addedProperty"];
  STAssertNotNil(value, nil);
  STAssertEqualObjects(value, @"wow", nil);
  
  // http://www.straightdope.com/classics/a3_341.html
  NSNumber *newPI = [NSNumber numberWithInt:3];
  goodSet = [script gtm_setValue:newPI
                  forPropertyEnum:pASPi
                 addingDefinition:NO];
  STAssertTrue(goodSet, @"Unable to set property");
  value = [script_ gtm_valueForPropertyEnum:pASPi];
  STAssertNotNil(value, nil);
  STAssertEqualObjects(value, newPI, @"bad property");
}

- (void)testFailures {
  NSDictionary *error = nil;
  NSAppleEventDescriptor *desc 
    = [script_ gtm_executePositionalHandler:@"noSuchTest" 
                                 parameters:nil 
                                      error:&error];
  STAssertNil(desc, nil);
  STAssertNotNil(error, nil);

  // Test with empty handler name
  error = nil;
  desc = [script_ gtm_executePositionalHandler:@"" 
                                    parameters:[NSArray array] 
                                         error:&error];
  STAssertNil(desc, nil);
  STAssertNotNil(error, nil);
  
  // Test with nil handler
  error = nil;
  desc = [script_ gtm_executePositionalHandler:nil
                                    parameters:[NSArray array] 
                                         error:&error];
  STAssertNil(desc, nil);
  STAssertNotNil(error, nil);
  
  // Test with nil handler and nil error
  desc = [script_ gtm_executePositionalHandler:nil
                                    parameters:nil 
                                         error:nil];
  STAssertNil(desc, nil);
  
  // Test with a bad script
  NSAppleScript *script 
    = [[[NSAppleScript alloc] initWithSource:@"david hasselhoff"] autorelease];
  [GTMUnitTestDevLog expectPattern:@"Unable to compile script: .*"];
  [GTMUnitTestDevLog expectString:@"Unable to coerce script -2147450879"];
  NSSet *handlers = [script gtm_handlers];
  STAssertEquals([handlers count], (NSUInteger)0, @"Should have no handlers");
  [GTMUnitTestDevLog expectPattern:@"Unable to compile script: .*"];
  [GTMUnitTestDevLog expectString:@"Unable to coerce script -2147450879"];
  NSSet *properties = [script gtm_properties];
  STAssertEquals([properties count], 
                 (NSUInteger)0, 
                 @"Should have no properties");
  [GTMUnitTestDevLog expectPattern:@"Unable to compile script: .*"];
  [GTMUnitTestDevLog expectString:@"Unable to get script info about "
   @"open handler -2147450879"];
  STAssertFalse([script gtm_hasOpenDocumentsHandler],
                @"Has an opendoc handler?");
}

- (void)testScriptDescriptors {
  NSAppleEventDescriptor *desc = [script_ gtm_appleEventDescriptor];
  STAssertNotNil(desc, @"Couldn't make a script desc");
  NSAppleScript *script = [desc gtm_objectValue];
  STAssertNotNil(script, @"Couldn't get a script back");
  NSSet *handlers = [script gtm_handlers];
  STAssertNotNil(handlers, @"Couldn't get handlers");
}

- (void)testOpenHandler {
  STAssertFalse([script_ gtm_hasOpenDocumentsHandler], nil);
  id script = [script_ gtm_valueForProperty:@"testscript"];
  STAssertNotNil(script, nil);
  STAssertTrue([script gtm_hasOpenDocumentsHandler], nil);
}


@protocol ScriptInterface
- (id)test;
- (id)testReturnParam:(id)param;
- (id)testAddParams:(id)param1 :(id)param2;
@end

- (void)testForwarding {
  id<ScriptInterface> foo = (id<ScriptInterface>)script_;
  [foo test];
  NSNumber *val = [foo testReturnParam:[NSNumber numberWithInt:2]];
  STAssertEquals([val intValue], 2, @"should be 2");
  val = [foo testAddParams:[NSNumber numberWithInt:2] 
                          :[NSNumber numberWithInt:3]];
  STAssertEquals([val intValue], 5, @"should be 5");
}
@end
