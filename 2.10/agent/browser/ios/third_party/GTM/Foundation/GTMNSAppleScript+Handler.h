//
//  GTMNSAppleScript+Handler.h
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

// :::WARNING::: NSAppleScript and Garbage Collect (GC)
//
// As of 10.5.6 (and below) Apple has bugs in NSAppleScript when running with
// GC; ie-things crash that have nothing to do w/ this or your code.  See
// http://rails.wincent.com/issues/640 for a good amount of detail about the
// problems and simple cases that show it.

// A category for calling handlers in NSAppleScript

enum {
  // Data type is OSAID. These will generally be representing
  // scripts.
  typeGTMOSAID = 'GTMO' 
};

@interface NSAppleScript(GTMAppleScriptHandlerAdditions)
// Allows us to call a specific handler in an AppleScript.
// parameters are passed in left-right order 0-n.
//
// Args:
//   handler - name of the handler to call in the Applescript
//   params - the parameters to pass to the handler
//   error - in non-nil returns any error that may have occurred.
//
// Returns:
//   The result of the handler being called. nil on failure.
- (NSAppleEventDescriptor*)gtm_executePositionalHandler:(NSString*)handler 
                                             parameters:(NSArray*)params 
                                                  error:(NSDictionary**)error;


// Allows us to call a specific labeled handler in an AppleScript.
// Parameters for a labeled handler can be in any order, as long as the
// order of the params array corresponds to the order of the labels array
// such that labels are associated with their correct parameter values.
//
// Args:
//   handler - name of the handler to call in the Applescript
//   labels - the labels to associate with the parameters
//   params - the parameters to pass to the handler
//   count - number of labels/parameters
//   error - in non-nil returns any error that may have occurred.
//
// Returns:
//   The result of the handler being called. nil on failure.
- (NSAppleEventDescriptor*)gtm_executeLabeledHandler:(NSString*)handler
                                              labels:(AEKeyword*)labels
                                          parameters:(id*)params
                                               count:(NSUInteger)count
                                               error:(NSDictionary **)error;

// Same as executeAppleEvent:error: except that it handles return values of
// script correctly. Return values containing scripts will have the
// typeGTMOSAID. Calling gtm_objectValue on a NSAppleEventDescriptor of
// typeGTMOSAID will resolve correctly to a script value. We don't use
// typeScript because that actually copies the script instead of returning the
// actual value. Therefore if you called executeAppleEvent:error: (instead of
// the GTM version) to execute an event that returns a script, you will
// get a completely new Applescript, instead of the actual script you wanted. If
// you are working with script information, use gtm_executeAppleEvent:error
// instead of executeAppleEvent:error: to avoid the problem.
- (NSAppleEventDescriptor *)gtm_executeAppleEvent:(NSAppleEventDescriptor *)event 
                                            error:(NSDictionary **)error;

// The set of all handlers that are defined in this script and its parents.
// Remember that handlers that are defined in an sdef will have their
// eventclass/eventid as their handler instead of the name seen in the script.
// So:
// on open(a)
//   blah
// end open
// won't be "open" it will be "aevtodoc".
- (NSSet*)gtm_handlers;

// The set of all properties that are defined in this script and its parents.
// Note that properties can be strings or GTMNSFourCharCodes, so expect both
// coming back in the set.
- (NSSet*)gtm_properties;

// Return a value for a property. Will look up the inheritence tree.
// Property must be an NSString or a GTMFourCharCode.
- (id)gtm_valueForProperty:(id)property;

// Return a value for a property by type (eg pASParent). Will look up the
// inheritence tree
- (id)gtm_valueForPropertyEnum:(DescType)property;

// Set a script property value. Returns YES/NO on success/failure.
// Property must be of kind NSString or GTMFourCharCode.
// If addingDefinition is YES, it will add a definition to the script
// if the value doesn't exist in the script or one of it's parents.
- (BOOL)gtm_setValue:(id)value 
         forProperty:(id)property 
    addingDefinition:(BOOL)adding;

// Set a value for a property by type (eg pASParent). See note above
// for gtm_setValue:forProperty.
- (BOOL)gtm_setValue:(id)value 
     forPropertyEnum:(DescType)property
    addingDefinition:(BOOL)adding;

// Return YES if the script has an open documents (odoc) handler
// Does not require script compilation, so it's a fast check.
- (BOOL)gtm_hasOpenDocumentsHandler;

@end

// Error keys that we may return in the error dictionary on top of the standard
// NSAppleScriptError* keys.
extern NSString const* GTMNSAppleScriptErrorPartialResult;  // id
extern NSString const* GTMNSAppleScriptErrorOffendingObject;  // id
extern NSString const* GTMNSAppleScriptErrorExpectedType;  // GTMFourCharCode

@interface NSAppleEventDescriptor (GTMAppleEventDescriptorOSAAdditions)
// Returns an NSValue containing an NSRange of script source when an error
// occurs while compiling and/or executing a script.
- (id)gtm_OSAErrorRangeValue;
@end
