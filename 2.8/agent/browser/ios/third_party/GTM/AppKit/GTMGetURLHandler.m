//
//  GTMGetURLHandler.m
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

// Add this class to your app to have get URL handled almost automatically for
// you. For each entry in your CFBundleURLTypes dictionaries, add a new
// key/object pair of GTMBundleURLClass/the name of the class you want
// to have handle the scheme(s).
// Then have that class respond to the class method:
//   + (BOOL)gtm_openURL:(NSURL*)url
// and voila, it will just work.
// Note that in Debug mode we will do extensive testing to make sure that this
// is all hooked up correctly, and will spew out to the console if we 
// find anything amiss.
//
// Example plist entry
// ...
// 
// <key>CFBundleURLTypes</key>
// <array>
//   <dict>
// 	   <key>CFBundleURLName</key>
// 	   <string>Google Suggestion URL</string>
//	   <key>GTMBundleURLClass</key>
//	   <string>GoogleSuggestURLHandler</string>
//	   <key>CFBundleURLSchemes</key>
//	   <array>
//	     <string>googlesuggest</string>
//       <string>googlesuggestextreme</string>
//	   </array>
//	 </dict>
// </array>
//
//
// Example implementation
// @interface GoogleSuggestURLHandler
// @end
// @implementation GoogleSuggestURLHandler
// + (BOOL)gtm_openURL:(NSURL*)url {
//   NSLog(@"%@", url);
// }
// @end

#import <AppKit/AppKit.h>
#import "GTMGarbageCollection.h"
#import "GTMNSAppleEventDescriptor+Foundation.h"
#import "GTMMethodCheck.h"

static NSString *const kGTMBundleURLClassKey = @"GTMBundleURLClass";
// A variety of constants Apple really should have defined somewhere to
// allow the compiler to find your typos.
static NSString *const kGTMCFBundleURLSchemesKey = @"CFBundleURLSchemes";
static NSString *const kGTMCFBundleURLNameKey = @"CFBundleURLName";
static NSString *const kGTMCFBundleTypeRoleKey = @"CFBundleTypeRole";
static NSString *const kGTMCFBundleURLTypesKey = @"CFBundleURLTypes";
static NSString *const kGTMCFBundleViewerRole = @"Viewer";
static NSString *const kGTMCFBundleEditorRole = @"Editor";

// Set this macro elsewhere is you want to force the
// bundle checks on/off. They are nice for debugging
// problems, but shouldn't be required in a release version
// unless you are paranoid about your users messing with your
// Info.plist
#ifndef GTM_CHECK_BUNDLE_URL_CLASSES
#define GTM_CHECK_BUNDLE_URL_CLASSES DEBUG
#endif  // GTM_CHECK_BUNDLE_URL_CLASSES

@protocol GTMGetURLHandlerProtocol
+ (BOOL)gtm_openURL:(NSURL*)url;
@end

@interface GTMGetURLHandler : NSObject {
  NSArray *urlTypes_;
}
- (id)initWithTypes:(NSArray*)urlTypes;
- (void)getUrl:(NSAppleEventDescriptor *)event 
withReplyEvent:(NSAppleEventDescriptor *)replyEvent;
- (void)addError:(OSStatus)error 
 withDescription:(NSString*)string 
    toDescriptor:(NSAppleEventDescriptor *)desc;
+ (id)handlerForBundle:(NSBundle *)bundle;
+ (void)getUrl:(NSAppleEventDescriptor *)event 
withReplyEvent:(NSAppleEventDescriptor *)replyEvent;
@end

@implementation GTMGetURLHandler
GTM_METHOD_CHECK(NSNumber, gtm_appleEventDescriptor);
GTM_METHOD_CHECK(NSString, gtm_appleEventDescriptor);

+ (void)load {
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  NSAppleEventManager *man = [NSAppleEventManager sharedAppleEventManager];
  [man setEventHandler:self 
           andSelector:@selector(getUrl:withReplyEvent:) 
         forEventClass:kInternetEventClass 
            andEventID:kAEGetURL]; 
  [pool drain];
}

+ (void)getUrl:(NSAppleEventDescriptor *)event 
withReplyEvent:(NSAppleEventDescriptor *)replyEvent {
  static GTMGetURLHandler *sHandler = nil;
  if (!sHandler) {
    NSBundle *bundle = [NSBundle mainBundle];
    sHandler = [GTMGetURLHandler handlerForBundle:bundle];
    if (sHandler) {
      [sHandler retain];
      GTMNSMakeUncollectable(sHandler);
    }
  }
  [sHandler getUrl:event withReplyEvent:replyEvent];
}
  
+ (id)handlerForBundle:(NSBundle *)bundle {
  GTMGetURLHandler *handler = nil;
  NSArray *urlTypes 
    = [bundle objectForInfoDictionaryKey:kGTMCFBundleURLTypesKey];
  if (urlTypes) {
    handler = [[[GTMGetURLHandler alloc] initWithTypes:urlTypes] autorelease];
  } else {
    // COV_NF_START
    // Hard to test it if we don't have it.
    _GTMDevLog(@"If you don't have CFBundleURLTypes in your plist, you may want"
               @" to remove GTMGetURLHandler.m from your project");
    // COV_NF_END
  }
  return handler;
}

- (id)initWithTypes:(NSArray*)urlTypes {
  if ((self = [super init])) {
    urlTypes_ = [urlTypes retain];
#if GTM_CHECK_BUNDLE_URL_CLASSES
    // Some debug handling to check to make sure we can handle the
    // classes properly. We check here instead of at init in case some of the
    // handlers are being handled by plugins or other imported code that are 
    // loaded after we have been initialized.
    NSDictionary *urlType;
    GTM_FOREACH_OBJECT(urlType, urlTypes_) {
      NSString *className = [urlType objectForKey:kGTMBundleURLClassKey];
      if ([className length]) {
        Class cls = NSClassFromString(className);
        if (cls) {
          if (![cls respondsToSelector:@selector(gtm_openURL:)]) {
            _GTMDevLog(@"Class %@ for URL handler %@ "
                       @"(URL schemes: %@) doesn't respond to openURL:",
                       className,
                       [urlType objectForKey:kGTMCFBundleURLNameKey],
                       [urlType objectForKey:kGTMCFBundleURLSchemesKey]);
          }
        } else {
          _GTMDevLog(@"Unable to get class %@ for URL handler %@ "
                     @"(URL schemes: %@)",
                     className,
                     [urlType objectForKey:kGTMCFBundleURLNameKey],
                     [urlType objectForKey:kGTMCFBundleURLSchemesKey]);
        }
      } else {
        NSString *role = [urlType objectForKey:kGTMCFBundleTypeRoleKey];
        if ([role caseInsensitiveCompare:kGTMCFBundleViewerRole] == NSOrderedSame ||
            [role caseInsensitiveCompare:kGTMCFBundleEditorRole] == NSOrderedSame) {
          _GTMDevLog(@"Missing %@ for URL handler %@ "
                     @"(URL schemes: %@)",
                     kGTMBundleURLClassKey,
                     [urlType objectForKey:kGTMCFBundleURLNameKey],
                     [urlType objectForKey:kGTMCFBundleURLSchemesKey]);
        }
      }
    }
#endif  // GTM_CHECK_BUNDLE_URL_CLASSES
  }
  return self;
}

// COV_NF_START
// Singleton is never dealloc'd
- (void)dealloc {
  [urlTypes_ release];
  [super dealloc];
}
// COV_NF_END


- (NSURL*)extractURLFromEvent:(NSAppleEventDescriptor*)event
               withReplyEvent:(NSAppleEventDescriptor *)replyEvent {
  NSAppleEventDescriptor *desc 
    = [event paramDescriptorForKeyword:keyDirectObject];
  NSString *urlstring = [desc stringValue];
  NSURL *url = [NSURL URLWithString:urlstring];
  if (!url) {
    // COV_NF_START
    // Can't convince the OS to give me a bad URL
    [self addError:errAECoercionFail 
   withDescription:@"Unable to extract url from key direct object." 
      toDescriptor:replyEvent];
    // COV_NF_END
  }
  return url;
}

- (Class)getClassForScheme:(NSString *)scheme 
            withReplyEvent:(NSAppleEventDescriptor*)replyEvent {
  NSDictionary *urlType;
  Class cls = nil;
  NSString *typeScheme = nil;
  GTM_FOREACH_OBJECT(urlType, urlTypes_) {
    NSArray *schemes = [urlType objectForKey:kGTMCFBundleURLSchemesKey];
    NSString *aScheme;
    GTM_FOREACH_OBJECT(aScheme, schemes) {
      if ([aScheme caseInsensitiveCompare:scheme] == NSOrderedSame) {
        typeScheme = aScheme;
        break;
      }
    }
    if (typeScheme) {
      break;
    }
  }
  if (typeScheme) {
    NSString *class = [urlType objectForKey:kGTMBundleURLClassKey];
    if (class) {
      cls = NSClassFromString(class);
    }
    if (!cls) {
      NSString *errorString 
        = [NSString stringWithFormat:@"Unable to instantiate class for "
           @"%@:%@ for scheme:%@.", 
           kGTMBundleURLClassKey, class, typeScheme];
      [self addError:errAECorruptData 
     withDescription:errorString
        toDescriptor:replyEvent];
    } else {
      if (![cls respondsToSelector:@selector(gtm_openURL:)]) {
        NSString *errorString 
          = [NSString stringWithFormat:@"Class %@:%@ for scheme:%@ does not"
             @"respond to gtm_openURL:",
             kGTMBundleURLClassKey, class, typeScheme];
        [self addError:errAECorruptData 
       withDescription:errorString
          toDescriptor:replyEvent];
        cls = Nil;
      }
    }
  } else {
    // COV_NF_START
    // Don't know how to force an URL that we don't respond to upon ourselves.
    NSString *errorString 
      = [NSString stringWithFormat:@"Unable to find handler for scheme %@.", 
         scheme];
    [self addError:errAECorruptData 
   withDescription:errorString
      toDescriptor:replyEvent];
    // COV_NF_END

  }
  return cls;
}

- (void)getUrl:(NSAppleEventDescriptor *)event 
withReplyEvent:(NSAppleEventDescriptor *)replyEvent {  
  NSURL *url = [self extractURLFromEvent:event withReplyEvent:replyEvent];
  if (!url) {
    return;
  }
  NSString *scheme = [url scheme];
  Class cls = [self getClassForScheme:scheme withReplyEvent:replyEvent];
  if (!cls) {
    return;
  }
  BOOL wasGood = [cls gtm_openURL:url];
  if (!wasGood) {
    NSString *errorString 
    = [NSString stringWithFormat:@"[%@ gtm_openURL:] failed to handle %@", 
       NSStringFromClass(cls), url];
    [self addError:errAEEventNotHandled 
   withDescription:errorString
      toDescriptor:replyEvent];
  }
}

- (void)addError:(OSStatus)error 
 withDescription:(NSString*)string 
    toDescriptor:(NSAppleEventDescriptor *)desc {
  NSAppleEventDescriptor *errorDesc = nil;
  if (error != noErr) {
    NSNumber *errNum = [NSNumber numberWithLong:error];
    errorDesc = [errNum gtm_appleEventDescriptor];
    [desc setParamDescriptor:errorDesc forKeyword:keyErrorNumber];
  }
  if (string) {
    errorDesc = [string gtm_appleEventDescriptor];
    [desc setParamDescriptor:errorDesc forKeyword:keyErrorString];
  }
}
@end

