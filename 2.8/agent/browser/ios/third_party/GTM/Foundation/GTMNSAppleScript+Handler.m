//
//  GTMNSAppleScript+Handler.m
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
#import "GTMNSAppleScript+Handler.h"
#import "GTMNSAppleEventDescriptor+Foundation.h"
#import "GTMNSAppleEventDescriptor+Handler.h"
#import "GTMFourCharCode.h"
#import "GTMMethodCheck.h"
#import "GTMDebugThreadValidation.h"

// Keys for passing AppleScript calls from other threads to the main thread
// and back through gtm_internalExecuteAppleEvent:
static NSString *const GTMNSAppleScriptEventKey = @"GTMNSAppleScriptEvent";
static NSString *const GTMNSAppleScriptResultKey = @"GTMNSAppleScriptResult";
static NSString *const GTMNSAppleScriptErrorKey = @"GTMNSAppleScriptError";

// Error keys that we may return in the error dictionary on top of the standard
// NSAppleScriptError* keys.
NSString const* GTMNSAppleScriptErrorPartialResult
  = @"GTMNSAppleScriptErrorPartialResult";
NSString const* GTMNSAppleScriptErrorOffendingObject
  = @"GTMNSAppleScriptErrorOffendingObject";
NSString const* GTMNSAppleScriptErrorExpectedType
  = @"GTMNSAppleScriptErrorExpectedType";

// Some private methods that we need to call
@interface NSAppleScript (NSPrivate)
+ (ComponentInstance)_defaultScriptingComponent;
- (OSAID) _compiledScriptID;
- (id)_initWithData:(NSData*)data error:(NSDictionary**)error;
- (id)_initWithScriptIDNoCopy:(OSAID)osaID;
@end

@interface NSMethodSignature (NSPrivate)
+ (id)signatureWithObjCTypes:(const char *)fp8;
@end

// Our own private interfaces.
@interface NSAppleScript (GTMAppleScriptHandlerAdditionsPrivate)

// Return an descriptor for a property. Properties are only supposed to be
// of type NSString or GTMFourCharCode. GTMFourCharCode's need special handling
// as they must be turned into NSAppleEventDescriptors of typeProperty.
- (NSAppleEventDescriptor*)gtm_descriptorForPropertyValue:(id)property;

// Return an NSAppleEventDescriptor for a given property.
// |property| must be kind of class GTMFourCharCode
- (NSAppleEventDescriptor*)gtm_valueDescriptorForProperty:(id)property;

// Utility routine for extracting multiple values in scripts and their
// parents.
- (NSSet*)gtm_allValuesUsingSelector:(SEL)selector;

// Utility routine for extracting the handlers for a specific script without
// referring to parent scripts.
- (NSSet*)gtm_scriptHandlers;

// Utility routine for extracting the properties for a specific script without
// referring to parent scripts.
- (NSSet*)gtm_scriptProperties;

// Handles creating an NSAppleEventDescriptor from an OSAID
- (NSAppleEventDescriptor*)descForScriptID:(OSAID)scriptID
                                 component:(ComponentInstance)component;

// Utility methods for converting between real and generic OSAIDs.
- (OSAID)gtm_genericID:(OSAID)osaID forComponent:(ComponentInstance)component;
- (OSAID)gtm_realIDAndComponent:(ComponentInstance*)component;

- (void)gtm_internalExecuteAppleEvent:(NSMutableDictionary *)data;

- (NSDictionary *)gtm_errorDictionaryFromOSStatus:(OSStatus)status
                                        component:(ComponentInstance)component;
@end

// Private methods for dealing with Scripts/Events and NSAppleEventDescriptors
@interface NSAppleEventDescriptor (GTMAppleEventDescriptorScriptAdditions)

// Return an NSAppleScript for a desc of typeScript. This will create a new
// Applescript that is a copy of the script that you want.
// Returns nil on failure.
- (NSAppleScript*)gtm_scriptValue;

// Return an NSAppleScript for a desc of typeGTMOSAID. This will not copy the
// script, but will create an NSAppleScript wrapping the script represented
// by the OSAID.
// Returns nil on failure.
- (NSAppleScript*)gtm_osaIDValue;

// Return a NSString with [eventClass][eventID] for typeEvent 'evnt'
- (NSString*)gtm_eventValue;
@end

@implementation NSAppleScript(GTMAppleScriptHandlerAdditions)
GTM_METHOD_CHECK(NSAppleEventDescriptor, gtm_descriptorWithPositionalHandler:parametersArray:);
GTM_METHOD_CHECK(NSAppleEventDescriptor, gtm_descriptorWithLabeledHandler:labels:parameters:count:);
GTM_METHOD_CHECK(NSAppleEventDescriptor, gtm_registerSelector:forTypes:count:);

+ (void)load {
  DescType types[] = {
    typeScript
  };

  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  [NSAppleEventDescriptor gtm_registerSelector:@selector(gtm_scriptValue)
                                      forTypes:types
                                         count:sizeof(types)/sizeof(DescType)];

  DescType types2[] = {
    'evnt'  // No type code for this one
  };

  [NSAppleEventDescriptor gtm_registerSelector:@selector(gtm_eventValue)
                                      forTypes:types2
                                         count:sizeof(types2)/sizeof(DescType)];

  DescType types3[] = {
    typeGTMOSAID
  };

  [NSAppleEventDescriptor gtm_registerSelector:@selector(gtm_osaIDValue)
                                      forTypes:types3
                                         count:sizeof(types3)/sizeof(DescType)];
  [pool drain];
}

- (NSAppleEventDescriptor *)gtm_executeAppleEvent:(NSAppleEventDescriptor *)event
                                            error:(NSDictionary **)error {
  NSMutableDictionary *data = [NSMutableDictionary dictionaryWithObjectsAndKeys:
                               event, GTMNSAppleScriptEventKey, nil];
  [self performSelectorOnMainThread:@selector(gtm_internalExecuteAppleEvent:)
                         withObject:data
                      waitUntilDone:YES];
  if (error) {
    *error = [data objectForKey:GTMNSAppleScriptErrorKey];
  }
  return [data objectForKey:GTMNSAppleScriptResultKey];
}

- (NSAppleEventDescriptor*)gtm_executePositionalHandler:(NSString*)handler
                                             parameters:(NSArray*)params
                                                  error:(NSDictionary**)error {
  NSAppleEventDescriptor *event
    = [NSAppleEventDescriptor gtm_descriptorWithPositionalHandler:handler
                                                  parametersArray:params];
  return [self gtm_executeAppleEvent:event error:error];
}

- (NSAppleEventDescriptor*)gtm_executeLabeledHandler:(NSString*)handler
                                              labels:(AEKeyword*)labels
                                          parameters:(id*)params
                                               count:(NSUInteger)count
                                               error:(NSDictionary **)error {
  NSAppleEventDescriptor *event
    = [NSAppleEventDescriptor gtm_descriptorWithLabeledHandler:handler
                                                        labels:labels
                                                    parameters:params
                                                         count:count];
  return [self gtm_executeAppleEvent:event error:error];
}

- (NSSet*)gtm_handlers {
  return [self gtm_allValuesUsingSelector:@selector(gtm_scriptHandlers)];
}

- (NSSet*)gtm_properties {
  return [self gtm_allValuesUsingSelector:@selector(gtm_scriptProperties)];
}

// Set a value for a property by type (eg pASTopLevelScript)
- (BOOL)gtm_setValue:(id)value
     forPropertyEnum:(DescType)property
    addingDefinition:(BOOL)adding {
  GTMFourCharCode *fcc
    = [GTMFourCharCode fourCharCodeWithFourCharCode:property];
  return [self gtm_setValue:value forProperty:fcc addingDefinition:adding];
}

- (BOOL)gtm_setValue:(id)value
         forProperty:(id)property
    addingDefinition:(BOOL)adding{
  OSAError error = paramErr;
  BOOL wasGood = NO;
  NSAppleEventDescriptor *propertyName
    = [self gtm_descriptorForPropertyValue:property];
  NSAppleEventDescriptor *desc = [value gtm_appleEventDescriptor];
  if (propertyName && desc) {
    NSAppleScript *script = self;
    OSAID valueID = kOSANullScript;
    ComponentInstance component;
    OSAID scriptID = [script gtm_realIDAndComponent:&component];
    error = OSACoerceFromDesc(component,
                              [desc aeDesc],
                              kOSAModeNull,
                              &valueID);
    if (error == noErr) {
      error = OSASetProperty(component,
                             adding ? kOSAModeNull : kOSAModeDontDefine,
                             scriptID,
                             [propertyName aeDesc],
                             valueID);
      if (error == noErr) {
        wasGood = YES;
      }
    }
  }
  if (!wasGood) {
    _GTMDevLog(@"Unable to setValue:%@ forProperty:%@ from %@ (%d)",
               value, property, self, error);
  }
  return wasGood;
}

- (id)gtm_valueForProperty:(id)property {
  return [[self gtm_valueDescriptorForProperty:property] gtm_objectValue];
}

- (id)gtm_valueForPropertyEnum:(DescType)property {
  GTMFourCharCode *fcc = [GTMFourCharCode fourCharCodeWithFourCharCode:property];
  return [self gtm_valueForProperty:fcc];
}

- (NSAppleEventDescriptor*)gtm_appleEventDescriptor {
  ComponentInstance component;
  OSAID osaID = [self gtm_realIDAndComponent:&component];
  AEDesc result = { typeNull, NULL };
  NSAppleEventDescriptor *desc = nil;
  OSAError error = OSACoerceToDesc(component,
                                   osaID,
                                   typeScript,
                                   kOSAModeNull,
                                   &result);
  if (error == noErr) {
    desc = [[[NSAppleEventDescriptor alloc] initWithAEDescNoCopy:&result]
            autorelease];
  } else {
    _GTMDevLog(@"Unable to coerce script %d", error);
  }
  return desc;
}

- (BOOL)gtm_hasOpenDocumentsHandler {
  ComponentInstance component;
  OSAID osaID = [self gtm_realIDAndComponent:&component];
  long value = 0;
  OSAError error = OSAGetScriptInfo(component,
                                    osaID,
                                    kASHasOpenHandler,
                                    &value);
  if (error) {
    _GTMDevLog(@"Unable to get script info about open handler %d", error);
    value = 0;
  }
  return value != 0;
}

- (NSMethodSignature *)methodSignatureForSelector:(SEL)aSelector {
  NSMethodSignature *signature = [super methodSignatureForSelector:aSelector];
  if (!signature) {
    NSMutableString *types = [NSMutableString stringWithString:@"@@:"];
    NSString *selName = NSStringFromSelector(aSelector);
    NSArray *selArray = [selName componentsSeparatedByString:@":"];
    NSUInteger count = [selArray count];
    for (NSUInteger i = 1; i < count; i++) {
      [types appendString:@"@"];
    }
    signature = [NSMethodSignature signatureWithObjCTypes:[types UTF8String]];
  }
  return signature;
}

- (void)forwardInvocation:(NSInvocation *)invocation {
  SEL sel = [invocation selector];
  NSMutableString *handlerName
    = [NSMutableString stringWithString:NSStringFromSelector(sel)];
  NSUInteger handlerOrigLength = [handlerName length];
  [handlerName replaceOccurrencesOfString:@":"
                               withString:@""
                                  options:0
                                    range:NSMakeRange(0,handlerOrigLength)];
  NSUInteger argCount = handlerOrigLength - [handlerName length];
  NSMutableArray *args = [NSMutableArray arrayWithCapacity:argCount];
  for (NSUInteger i = 0; i < argCount; ++i) {
    id arg;
    // +2 to ignore _sel and _cmd
    [invocation getArgument:&arg atIndex:i + 2];
    [args addObject:arg];
  }
  NSDictionary *error = nil;
  NSAppleEventDescriptor *desc = [self gtm_executePositionalHandler:handlerName
                                                         parameters:args
                                                              error:&error];
  if ([[invocation methodSignature] methodReturnLength] > 0) {
    id returnValue = [desc gtm_objectValue];
    [invocation setReturnValue:&returnValue];
  }
}
@end

@implementation NSAppleScript (GTMAppleScriptHandlerAdditionsPrivate)

- (NSAppleEventDescriptor*)gtm_descriptorForPropertyValue:(id)property {
  NSAppleEventDescriptor *propDesc = nil;
  if ([property isKindOfClass:[GTMFourCharCode class]]) {
    propDesc = [property gtm_appleEventDescriptorOfType:typeProperty];
  } else if ([property isKindOfClass:[NSString class]]) {
    propDesc = [property gtm_appleEventDescriptor];
  }
  return propDesc;
}

- (NSAppleEventDescriptor*)gtm_valueDescriptorForProperty:(id)property {
  GTMAssertRunningOnMainThread();
  OSAError error = paramErr;
  NSAppleEventDescriptor *desc = nil;
  NSAppleEventDescriptor *propertyName
    = [self gtm_descriptorForPropertyValue:property];
  if (propertyName) {
    ComponentInstance component;
    OSAID scriptID = [self gtm_realIDAndComponent:&component];
    OSAID valueID = kOSANullScript;
    error = OSAGetProperty(component,
                           kOSAModeNull,
                           scriptID,
                           [propertyName aeDesc],
                           &valueID);
    if (error == noErr) {
      desc = [self descForScriptID:valueID component:component];
    }
  }
  if (error) {
    _GTMDevLog(@"Unable to get valueForProperty:%@ from %@ (%d)",
               property, self, error);
  }
  return desc;
}

- (NSSet*)gtm_allValuesUsingSelector:(SEL)selector {
  NSMutableSet *resultSet = [NSMutableSet set];
  NSAppleEventDescriptor *scriptDesc = [self gtm_appleEventDescriptor];
  NSMutableSet *scriptDescsWeveSeen = [NSMutableSet set];
  GTMFourCharCode *fcc = [GTMFourCharCode fourCharCodeWithFourCharCode:pASParent];
  Class appleScriptClass = [NSAppleScript class];
  while (scriptDesc) {
    NSAppleScript *script = [scriptDesc gtm_objectValue];
    if ([script isKindOfClass:appleScriptClass]) {
      NSData *data = [scriptDesc data];
      if (!data || [scriptDescsWeveSeen containsObject:data]) {
        break;
      } else {
        [scriptDescsWeveSeen addObject:data];
      }
      NSSet *newSet = [script performSelector:selector];
      [resultSet unionSet:newSet];
      scriptDesc = [script gtm_valueDescriptorForProperty:fcc];
    } else {
      break;
    }
  }
  return resultSet;
}

- (NSSet*)gtm_scriptHandlers {
  GTMAssertRunningOnMainThread();
  AEDescList names = { typeNull, NULL };
  NSArray *array = nil;
  ComponentInstance component;
  OSAID osaID = [self gtm_realIDAndComponent:&component];
  OSAError error = OSAGetHandlerNames(component, kOSAModeNull, osaID, &names);
  if (error == noErr) {
    NSAppleEventDescriptor *desc
      = [[[NSAppleEventDescriptor alloc] initWithAEDescNoCopy:&names]
         autorelease];
    array = [desc gtm_objectValue];
  }
  if (error != noErr) {
    _GTMDevLog(@"Error getting handlers: %d", error); // COV_NF_LINE
  }
  return [NSSet setWithArray:array];
}

- (NSSet*)gtm_scriptProperties {
  GTMAssertRunningOnMainThread();
  AEDescList names = { typeNull, NULL };
  NSArray *array = nil;
  ComponentInstance component;
  OSAID osaID = [self gtm_realIDAndComponent:&component];
  OSAError error = OSAGetPropertyNames(component, kOSAModeNull, osaID, &names);
  if (error == noErr) {
    NSAppleEventDescriptor *desc
      = [[[NSAppleEventDescriptor alloc] initWithAEDescNoCopy:&names]
         autorelease];
    array = [desc gtm_objectValue];
  }
  if (error != noErr) {
    _GTMDevLog(@"Error getting properties: %d", error); // COV_NF_LINE
  }
  return [NSSet setWithArray:array];
}

- (OSAID)gtm_genericID:(OSAID)osaID forComponent:(ComponentInstance)component {
  GTMAssertRunningOnMainThread();
  ComponentInstance genericComponent = [NSAppleScript _defaultScriptingComponent];
  OSAID exactID = osaID;
  OSAError error = OSARealToGenericID(genericComponent, &exactID, component);
  if (error != noErr) {
    _GTMDevLog(@"Unable to get real id script: %@ %d", self, error); // COV_NF_LINE
    exactID = kOSANullScript; // COV_NF_LINE
  }
  return exactID;
}

- (NSAppleEventDescriptor*)descForScriptID:(OSAID)osaID
                                 component:(ComponentInstance)component {
  GTMAssertRunningOnMainThread();
  NSAppleEventDescriptor *desc = nil;
  // If we have a script, return a typeGTMOSAID, otherwise convert it to
  // it's default AEDesc using OSACoerceToDesc with typeWildCard.
  long value = 0;
  OSAError err = noErr;
  if (osaID == 0) {
    desc = [NSAppleEventDescriptor nullDescriptor];
  } else {
    err = OSAGetScriptInfo(component,
                           osaID,
                           kOSAScriptBestType,
                           &value);
    if (err == noErr) {
      if (value == typeScript) {
        osaID = [self gtm_genericID:osaID forComponent:component];
        desc = [NSAppleEventDescriptor descriptorWithDescriptorType:typeGTMOSAID
                                                              bytes:&osaID
                                                             length:sizeof(osaID)];
      } else {
        AEDesc aeDesc;
        err = OSACoerceToDesc(component,
                                   osaID,
                                   typeWildCard,
                                   kOSAModeNull,
                                   &aeDesc);
        if (err == noErr) {
          desc = [[[NSAppleEventDescriptor alloc]
                   initWithAEDescNoCopy:&aeDesc] autorelease];
        }
      }
    }
  }
  if (err != noErr) {
    _GTMDevLog(@"Unable to create desc for id:%d (%d)", osaID, err); // COV_NF_LINE
  }
  return desc;
}

- (OSAID)gtm_realIDAndComponent:(ComponentInstance*)component {
  GTMAssertRunningOnMainThread();
  if (![self isCompiled]) {
    NSDictionary *error;
    if (![self compileAndReturnError:&error]) {
      _GTMDevLog(@"Unable to compile script: %@ %@", self, error);
      return kOSANullScript;
    }
  }
  OSAID genericID = [self _compiledScriptID];
  ComponentInstance genericComponent = [NSAppleScript _defaultScriptingComponent];
  OSAError error = OSAGenericToRealID(genericComponent, &genericID, component);
  if (error != noErr) {
    _GTMDevLog(@"Unable to get real id script: %@ %d", self, error); // COV_NF_LINE
    genericID = kOSANullScript; // COV_NF_LINE
  }
  return genericID;
}

- (void)gtm_internalExecuteAppleEvent:(NSMutableDictionary *)data {
  GTMAssertRunningOnMainThread();
  NSDictionary *error = nil;
  if (![self isCompiled]) {
    [self compileAndReturnError:&error];
  }
  if (!error) {
    NSAppleEventDescriptor *desc = nil;
    NSAppleEventDescriptor *event = [data objectForKey:GTMNSAppleScriptEventKey];
    ComponentInstance component;
    OSAID scriptID = [self gtm_realIDAndComponent:&component];
    OSAID valueID;
    OSAError err = OSAExecuteEvent(component, [event aeDesc], scriptID,
                                   kOSAModeNull, &valueID);
    if (err == noErr) {
      // descForScriptID:component: is what sets this apart from the
      // standard executeAppleEvent:error: in that it handles
      // taking script results and turning them into AEDescs of typeGTMOSAID
      // instead of typeScript.
      desc = [self descForScriptID:valueID component:component];
      if (desc) {
        [data setObject:desc forKey:GTMNSAppleScriptResultKey];
      }
    } else {
      error = [self gtm_errorDictionaryFromOSStatus:err component:component];
    }
  }
  if (error) {
    [data setObject:error forKey:GTMNSAppleScriptErrorKey];
  }
}

- (NSDictionary *)gtm_errorDictionaryFromOSStatus:(OSStatus)status
                                        component:(ComponentInstance)component {
  NSMutableDictionary *error = nil;
  if (status == errOSAScriptError) {
    error = [NSMutableDictionary dictionary];
    struct {
      OSType selector;
      DescType desiredType;
      SEL extractor;
      id key;
    } errMap[] = {
      {
        kOSAErrorNumber,
        typeSInt16,
        @selector(gtm_numberValue),
        NSAppleScriptErrorNumber
      },
      {
        kOSAErrorMessage,
        typeText,
        @selector(stringValue),
        NSAppleScriptErrorMessage
      },
      {
        kOSAErrorBriefMessage,
        typeText,
        @selector(stringValue),
        NSAppleScriptErrorBriefMessage
      },
      { kOSAErrorApp,
        typeText,
        @selector(stringValue),
        NSAppleScriptErrorAppName
      },
      { kOSAErrorRange,
        typeOSAErrorRange,
        @selector(gtm_OSAErrorRangeValue),
        NSAppleScriptErrorRange
      },
      {
        kOSAErrorPartialResult,
        typeBest,
        @selector(gtm_objectValue),
        GTMNSAppleScriptErrorPartialResult
      },
      {
        kOSAErrorOffendingObject,
        typeBest,
        @selector(gtm_objectValue),
        GTMNSAppleScriptErrorOffendingObject
      },
      {
        kOSAErrorExpectedType,
        typeType,
        @selector(gtm_fourCharCodeValue),
        GTMNSAppleScriptErrorExpectedType
      },
    };
    for (size_t i = 0; i < sizeof(errMap) / sizeof(errMap[0]); ++i) {
      AEDesc errorResult = { typeNull, NULL };
      OSStatus err = OSAScriptError(component,
                                    errMap[i].selector,
                                    errMap[i].desiredType,
                                    &errorResult);
      if (err == noErr) {
        NSAppleEventDescriptor *desc = [[[NSAppleEventDescriptor alloc]
                 initWithAEDescNoCopy:&errorResult] autorelease];
        id value = [desc performSelector:errMap[i].extractor];
        if (value) {
          [error setObject:value forKey:errMap[i].key];
        }
      }
    }
  } else if (status != noErr) {
    // Unknown error. Do our best to give the user something good.
    NSNumber *errNum = [NSNumber numberWithInt:status];
    error
      = [NSMutableDictionary dictionaryWithObject:errNum
                                           forKey:NSAppleScriptErrorNumber];
    NSString *briefMessage
      = [NSString stringWithUTF8String:GetMacOSStatusErrorString(status)];
    if (briefMessage) {
      [error setValue:briefMessage forKey:NSAppleScriptErrorBriefMessage];
    }
    NSString *message
      = [NSString stringWithUTF8String:GetMacOSStatusCommentString(status)];
    if (message) {
      [error setValue:message forKey:NSAppleScriptErrorMessage];
    }
  }
  return error;
}
@end

@implementation NSAppleEventDescriptor (GMAppleEventDescriptorScriptAdditions)

- (NSAppleScript*)gtm_scriptValue {
  NSDictionary *error;
  NSAppleScript *script = [[[NSAppleScript alloc] _initWithData:[self data]
                                                          error:&error] autorelease];
  if (!script) {
    _GTMDevLog(@"Unable to create script: %@", error);  // COV_NF_LINE
  }
  return script;
}

- (NSAppleScript*)gtm_osaIDValue {
  _GTMDevAssert([[self data] length] == sizeof(OSAID), nil);
  OSAID osaID = *(const OSAID*)[[self data] bytes];
  return [[[NSAppleScript alloc] _initWithScriptIDNoCopy:osaID] autorelease];
}

- (NSString*)gtm_eventValue {
  struct AEEventRecordStruct {
    AEEventClass eventClass;
    AEEventID eventID;
  };
  NSData *data = [self data];
  const struct AEEventRecordStruct *record
    = (const struct AEEventRecordStruct*)[data bytes];
  NSString *eClass = [GTMFourCharCode stringWithFourCharCode:record->eventClass];
  NSString *eID = [GTMFourCharCode stringWithFourCharCode:record->eventID];
  return [eClass stringByAppendingString:eID];
}
@end

@implementation NSAppleEventDescriptor (GTMAppleEventDescriptorOSAAdditions)

- (id)gtm_OSAErrorRangeValue {
  id value = nil;
  NSAppleEventDescriptor *start = [self descriptorForKeyword:keyOSASourceStart];
  if (start) {
    NSAppleEventDescriptor *end = [self descriptorForKeyword:keyOSASourceEnd];
    if (end) {
      NSRange range = NSMakeRange([start int32Value], [end int32Value]);
      value = [NSValue valueWithRange:range];
    }
  }
  return value;
}

@end

