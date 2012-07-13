// 
// GTMGoogleSearch.m
//
//  Copyright 2006-2009 Google Inc.
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

#import "GTMGoogleSearch.h"
#import "GTMObjectSingleton.h"
#import "GTMGarbageCollection.h"

#if GTM_IPHONE_SDK
#import <UIKit/UIKit.h>
#else
#import <AppKit/AppKit.h>
#endif  // GTM_IPHONE_SDK

typedef struct {
  NSString *language;
  NSString *country;
  // we don't include a language, we'll use what we get from the OS
  NSString *defaultDomain;
} LanguageDefaultInfo;

//
// this is a seed mapping from languages to domains for google search.
// this doesn't have to be complete, as it is just a seed.
//
//
static LanguageDefaultInfo kLanguageListDefaultMappingTable[] = {
  // order is important, first match is taken
  // if country is |nil|, then only language has to match
  { @"en", @"US", @"com" },    // english - united states
  { @"en", @"GB", @"co.uk" },  // english - united kingdom
  { @"en", @"CA", @"ca" },     // english - canada
  { @"en", @"AU", @"com.au" }, // english - australia
  { @"en", @"NZ", @"com" },    // english - new zealand
  { @"en", @"IE", @"ie" },     // english - ireland
  { @"en", @"IN", @"co.in" },  // english - india
  { @"en", @"PH", @"com.ph" }, // english - philippines
  { @"en", @"SG", @"com.sg" }, // english - singapore
  { @"en", @"ZA", @"co.za" },  // english - south africa
  { @"en", @"IL", @"co.il" },  // english - israel
  { @"en", nil  , @"com" },    // english (catch all)
  { @"fr", @"CA", @"ca" },     // french - canada
  { @"fr", @"CH", @"ch" },   // french - switzerland
  { @"fr", nil  , @"fr" },     // france
  { @"it", nil  , @"it" },     // italy
  { @"de", @"AT", @"at" },     // german - austria
  { @"de", nil  , @"de" },     // germany
  { @"es", @"MX", @"com.mx" }, // spanish - mexico
  { @"es", @"AR", @"com.ar" }, // spanish - argentina
  { @"es", @"CL", @"cl" },     // spanish - chile
  { @"es", @"CO", @"com.co" }, // spanish - colombia
  { @"es", @"PE", @"com.pe" }, // spanish - peru
  { @"es", @"VE", @"co.ve" },  // venezuela
  { @"es", nil  , @"es" },     // spain
  { @"zh", @"TW", @"com.tw" }, // taiwan
  { @"zh", @"HK", @"com.hk" }, // hong kong
  { @"zh", nil  , @"cn" },    // chinese (catch all)
  { @"ja", nil  , @"co.jp" },  // japan
  { @"ko", nil  , @"co.kr" },  // korea
  { @"nl", @"BE", @"be" },     // dutch - belgium
  { @"nl", nil  , @"nl" },     // (dutch) netherlands
  { @"ru", nil  , @"ru" },     // russia
  { @"pt", @"BZ", @"com.br"},  // portuguese - brazil
  { @"pt", nil  , @"pt" },     // portugal
  { @"sv", nil  , @"se" },     // sweden
  { @"nn", nil  , @"no" },     // norway (two variants)
  { @"nb", nil  , @"no" },     // norway (two variants)
  { @"da", nil  , @"dk" },     // denmark
  { @"fi", nil  , @"fi" },     // finland
  { @"bg", nil  , @"bg" },     // bulgaria
  { @"hr", nil  , @"hr" },     // croatia
  { @"cx", nil  , @"cz" },    // czech republic
  { @"el", nil  , @"gr" },     // greece
  { @"hu", nil  , @"co.hu" },  // hungary
  { @"ro", nil  , @"ro" },     // romania
  { @"sk", nil  , @"sk" },     // slovakia
  { @"sl", nil  , @"si" },    // slovenia
  { @"tr", nil  , @"com.tr" }, // turkey
  { @"my", nil  , @"com.my" }, // malaysia
  { @"th", nil  , @"co.th" },  // thailand
  { @"uk", nil  , @"com.ua" }, // ukraine
  { @"vi", nil  , @"com.vn" }, // vietnam
  { @"af", nil  , @"com.za" }, // south africa (afrikaans)
  { @"hi", nil  , @"co.in" },  // india (hindi)
  { @"id", nil  , @"co.id" },  // indonesia 
  { @"pl", nil  , @"pl" },     // poland 
};

// the notification we use for syncing up instances in different processes
static NSString *const kNotificationName 
  = @"com.google.GoogleSearchAllApps.prefsWritten";

// this is the bundle id we use for the pref file used for all apps
static CFStringRef const kAllAppsBuildIdentifier 
  = CFSTR("com.google.GoogleSearchAllApps");

static CFStringRef const kPreferredDomainPrefKey 
  = CFSTR("com.google.PreferredDomain");
static CFStringRef const kPreferredLanguagePrefKey 
  = CFSTR("com.google.PreferredLanguage");

static NSString *const kDefaultDomain = @"com";
static NSString *const kDefaultLanguage = @"en";

#define SEARCH_URL_TEMPLATE @"http://www.google.%@/%@?%@"

@interface GTMGoogleSearch (PrivateMethods)
- (void)defaultDomain:(NSString**)preferedDomain 
             language:(NSString**)preferredLanguage;
- (void)reloadAllAppCachedValues:(NSNotification*)notification;
- (void)updateAllAppsDomain:(NSString*)domain language:(NSString*)language;
@end


@implementation GTMGoogleSearch

GTMOBJECT_SINGLETON_BOILERPLATE(GTMGoogleSearch, sharedInstance);

- (id)init {
  self = [super init];
  if (self != nil) {
#if GTM_GOOGLE_SEARCH_SUPPORTS_DISTRIBUTED_NOTIFICATIONS
    // register for the notification
    NSDistributedNotificationCenter *distCenter =
      [NSDistributedNotificationCenter defaultCenter];
    [distCenter addObserver:self
                   selector:@selector(reloadAllAppCachedValues:)
                       name:kNotificationName
                     object:nil];
#endif  // GTM_GOOGLE_SEARCH_SUPPORTS_DISTRIBUTED_NOTIFICATIONS
    // load the allApps value
    [self reloadAllAppCachedValues:nil];

    // load the cur app value
    CFStringRef domain 
      = CFPreferencesCopyValue(kPreferredDomainPrefKey,
                               kCFPreferencesCurrentApplication,
                               kCFPreferencesCurrentUser,
                               kCFPreferencesAnyHost);
    CFStringRef lang = CFPreferencesCopyValue(kPreferredLanguagePrefKey,
                                              kCFPreferencesCurrentApplication,
                                              kCFPreferencesCurrentUser,
                                              kCFPreferencesAnyHost);

    // make sure we got values for both and domain is not empty
    if (domain && CFStringGetLength(domain) == 0) {
      CFRelease(domain);
      domain = nil;
      if (lang) {
        CFRelease(lang);
        lang = nil;
      }
    }
    
    curAppCachedDomain_ = GTMNSMakeCollectable(domain);
    curAppCachedLanguage_ = GTMNSMakeCollectable(lang);
    
    NSBundle *bundle = [NSBundle mainBundle];
    
    NSDictionary *appArgs 
      = [bundle objectForInfoDictionaryKey:GTMGoogleSearchClientAppArgsKey];
    globalSearchArguments_ = [appArgs retain];
  }
  return self;
}

#if GTM_GOOGLE_SEARCH_SUPPORTS_DISTRIBUTED_NOTIFICATIONS
- (void)finalize {
  [[NSDistributedNotificationCenter defaultCenter] removeObject:self];
  [super finalize];
}
#endif  // GTM_GOOGLE_SEARCH_SUPPORTS_DISTRIBUTED_NOTIFICATIONS

- (void)dealloc {
#if GTM_GOOGLE_SEARCH_SUPPORTS_DISTRIBUTED_NOTIFICATIONS
  [[NSDistributedNotificationCenter defaultCenter] removeObject:self];
#endif  // GTM_GOOGLE_SEARCH_SUPPORTS_DISTRIBUTED_NOTIFICATIONS
  [allAppsCachedDomain_ release];
  [allAppsCachedLanguage_ release];
  [curAppCachedDomain_ release];
  [curAppCachedLanguage_ release];
  [globalSearchArguments_ release];
  [super dealloc];
}

- (void)preferredDomain:(NSString **)domain
               language:(NSString**)language 
      areCurrentAppOnly:(BOOL*)currentAppOnly {
  BOOL localCurrentAppOnly = YES;
  NSString *localDomain = curAppCachedDomain_;
  NSString *localLanguage = curAppCachedLanguage_;

  // if either one wasn't there, drop both, and use any app if we can
  if (!localDomain || !localLanguage) {
    localCurrentAppOnly = NO;
    localDomain = allAppsCachedDomain_;
    localLanguage = allAppsCachedLanguage_;

    // if we didn't get anything from the prefs, go with the defaults
    if (!localDomain || !localLanguage) {
      // if either one wasn't there, drop both, and use defaults
      [self defaultDomain:&localDomain language:&localLanguage];
    }
  }
  if (!localDomain || !localLanguage) {
    _GTMDevLog(@"GTMGoogleSearch: Failed to get the preferred domain/language "
               @"from prefs or defaults");
  }
  if (language) {
    *language = [[localLanguage retain] autorelease];
  }
  if (domain) {
    *domain = [[localDomain retain] autorelease];
  }
  if (currentAppOnly) {
    *currentAppOnly = localCurrentAppOnly;
  }
}

- (void)updatePreferredDomain:(NSString*)domain
                     language:(NSString*)language
       currentApplicationOnly:(BOOL)currentAppOnly {
  // valid inputs?
  if (!domain || ![domain length] || !language) {
    return;
  }

  if (currentAppOnly) {
    // if they are the same, don't do anything
    if ((domain == nil && curAppCachedDomain_ == nil &&
         language == nil && curAppCachedLanguage_ == nil) ||
        ([domain isEqualToString:curAppCachedDomain_] &&
         [language isEqualToString:curAppCachedLanguage_])) {
      return;
    }

    // save them out
    CFPreferencesSetValue(kPreferredDomainPrefKey,
                          (CFStringRef)domain,
                           kCFPreferencesCurrentApplication,
                           kCFPreferencesCurrentUser,
                           kCFPreferencesAnyHost);
    CFPreferencesSetValue(kPreferredLanguagePrefKey,
                           (CFStringRef)language,
                           kCFPreferencesCurrentApplication,
                           kCFPreferencesCurrentUser,
                           kCFPreferencesAnyHost);
    CFPreferencesSynchronize(kCFPreferencesCurrentApplication,
                             kCFPreferencesCurrentUser,
                             kCFPreferencesAnyHost);
    // update our locals
    [curAppCachedDomain_ release];
    [curAppCachedLanguage_ release];
    curAppCachedDomain_ = [domain copy];
    curAppCachedLanguage_ = [language copy];
  } else {
    // Set the "any application" values
    [self updateAllAppsDomain:domain language:language];

    // Clear the current application values (if there were any)
    [self clearPreferredDomainAndLanguageForCurrentApplication];
  }
}

- (void)clearPreferredDomainAndLanguageForCurrentApplication {
  // flush what's in the file
  CFPreferencesSetValue(kPreferredDomainPrefKey,
                        NULL,
                        kCFPreferencesCurrentApplication,
                        kCFPreferencesCurrentUser,
                        kCFPreferencesAnyHost);
  CFPreferencesSetValue(kPreferredLanguagePrefKey,
                        NULL,
                        kCFPreferencesCurrentApplication,
                        kCFPreferencesCurrentUser,
                        kCFPreferencesAnyHost);
  CFPreferencesSynchronize(kCFPreferencesCurrentApplication,
                           kCFPreferencesCurrentUser,
                           kCFPreferencesAnyHost);
  // clear our locals
  [curAppCachedDomain_ release];
  [curAppCachedLanguage_ release];
  curAppCachedDomain_ = nil;
  curAppCachedLanguage_ = nil;
}

- (void)clearPreferredDomainAndLanguageForAllApps {
  // nil/nil to clear things out, this will also update our cached values.
  [self updateAllAppsDomain:nil language:nil];
}

- (NSDictionary *)globalSearchArguments {
  return globalSearchArguments_;
}

- (void)setGlobalSearchArguments:(NSDictionary *)args {
  [globalSearchArguments_ autorelease];
  globalSearchArguments_ = [args copy];
}

- (NSString*)searchURLFor:(NSString*)queryText
                   ofType:(NSString*)type 
                arguments:(NSDictionary *)localArgs {
  if (!type) {
    return nil;
  }
  
  NSString *language;
  NSString *domain;
  [self preferredDomain:&domain
               language:&language
      areCurrentAppOnly:NULL];

  NSMutableDictionary *args 
    = [NSMutableDictionary dictionaryWithObjectsAndKeys:
       @"UTF-8", @"ie",
       @"UTF-8", @"oe",
       language, @"hl", 
       nil];
  if (queryText) {
    [args setObject:queryText forKey:@"q"];
  }
  
  NSDictionary *globalSearchArgs = [self globalSearchArguments];
  if (globalSearchArgs) {
    [args addEntriesFromDictionary:globalSearchArgs];
  }
  if (localArgs) {
    [args addEntriesFromDictionary:localArgs];
  }
  
  NSMutableArray *clientArgs = [NSMutableArray array];
  NSString *key;
  NSNull *nsNull = [NSNull null];
  GTM_FOREACH_KEY(key, args) {
    NSString *object = [args objectForKey:key];
    if (![object isEqual:nsNull]) {
#if DEBUG
      // In debug we check key and object for things that should be escaped.
      // Note that percent is not in there because escaped strings will have
      // percents in them
      NSCharacterSet *cs = [NSCharacterSet characterSetWithCharactersInString:
                            @"!*'();:@&=+$,/?#[] "];
      NSRange range = [key rangeOfCharacterFromSet:cs];
      if (range.location != NSNotFound) {
        _GTMDevLog(@"Unescaped string %@ in argument pair {%@, %@} in -[%@ %@]", 
                   key, key, object, [self class], NSStringFromSelector(_cmd));
      }
      range = [object rangeOfCharacterFromSet:cs];
      if (range.location != NSNotFound) {
        _GTMDevLog(@"Unescaped string %@ in argument pair {%@,%@ } in -[%@ %@]",
                   object, key, object, [self class], 
                   NSStringFromSelector(_cmd));
      }
#endif  // DEBUG
      NSString *arg = [NSString stringWithFormat:@"%@=%@", key, object];
      [clientArgs addObject:arg];
    }
  }
  NSString *clientArg = [clientArgs componentsJoinedByString:@"&"];
  NSString *url = [NSString stringWithFormat:SEARCH_URL_TEMPLATE,
                   domain, type, clientArg];
  return url;
}

- (BOOL)performQuery:(NSString*)queryText
              ofType:(NSString *)type
           arguments:(NSDictionary *)localArgs {
  BOOL success = NO;
  NSString *urlString = [self searchURLFor:queryText 
                                    ofType:type 
                                 arguments:localArgs];
  if (urlString) {
    NSURL *url = [NSURL URLWithString:urlString];
    if (url) {
#if GTM_IPHONE_SDK
      success = [[UIApplication sharedApplication] openURL:url];
#else  // GTM_IPHONE_SDK
      success = [[NSWorkspace sharedWorkspace] openURL:url];
#endif  // GTM_IPHONE_SDK
    }
  }
  return success;
}

@end


@implementation GTMGoogleSearch (PrivateMethods)

- (void)defaultDomain:(NSString**)preferredDomain 
             language:(NSString**)preferredLanguage {
  // must have both
  if (!preferredDomain || !preferredLanguage) {
    return;
  }

  // make sure they are clear to start
  *preferredDomain = nil;
  *preferredLanguage = nil;

  // loop over their language list trying to find something we have in
  // out default table.

  NSUserDefaults* defs = [NSUserDefaults standardUserDefaults];
  NSArray* languages = [defs objectForKey:@"AppleLanguages"];
  // the current locale is only based on what languages the running apps is
  // localized to, so we stick that at the end in case we weren't able to
  // find anything else as a match, we'll match that.
  languages =
    [languages arrayByAddingObject:[[NSLocale currentLocale] localeIdentifier]];

  NSEnumerator *enumerator = [languages objectEnumerator];
  NSString *localeIdentifier;
  while ((localeIdentifier = [enumerator nextObject])) {
    NSDictionary *localeParts 
      = [NSLocale componentsFromLocaleIdentifier:localeIdentifier];
    NSString *localeLanguage = [localeParts objectForKey:NSLocaleLanguageCode];
    // we don't use NSLocaleScriptCode for now
    NSString *localeCountry = [localeParts objectForKey:NSLocaleCountryCode];

    LanguageDefaultInfo *scan = kLanguageListDefaultMappingTable;
    LanguageDefaultInfo *end = (scan + (sizeof(kLanguageListDefaultMappingTable) 
                                        / sizeof(LanguageDefaultInfo)));
    // find a match
    // check language, and if country is not nil, check that
    for ( ; scan < end ; ++scan) {
      if ([localeLanguage isEqualToString:scan->language] &&
          (!(scan->country) || [localeCountry isEqualToString:scan->country])) {
        *preferredDomain = scan->defaultDomain;
        *preferredLanguage = localeLanguage;
        return; // out of here
      }
    }
  }

  *preferredDomain = kDefaultDomain;
  *preferredLanguage = kDefaultLanguage;
}

// -reloadAllAppCachedValues:
//
- (void)reloadAllAppCachedValues:(NSNotification*)notification {
  // drop the old...
  [allAppsCachedDomain_ release];
  [allAppsCachedLanguage_ release];
  allAppsCachedDomain_ = nil;
  allAppsCachedLanguage_ = nil;

  // load the new
  CFPreferencesSynchronize(kAllAppsBuildIdentifier,
                           kCFPreferencesCurrentUser,
                           kCFPreferencesAnyHost);
  CFStringRef domain = CFPreferencesCopyValue(kPreferredDomainPrefKey,
                                              kAllAppsBuildIdentifier,
                                              kCFPreferencesCurrentUser,
                                              kCFPreferencesAnyHost);
  CFStringRef lang = CFPreferencesCopyValue(kPreferredLanguagePrefKey,
                                            kAllAppsBuildIdentifier,
                                            kCFPreferencesCurrentUser,
                                            kCFPreferencesAnyHost);

  // make sure we got values for both and domain is not empty
  if (domain && CFStringGetLength(domain) == 0) {
    CFRelease(domain);
    domain = nil;
    if (lang) {
      CFRelease(lang);
      lang = nil;
    }
  }

  allAppsCachedDomain_ = GTMNSMakeCollectable(domain);
  allAppsCachedLanguage_ = GTMNSMakeCollectable(lang);
}

// -updateAllAppsDomain:language:
//
- (void)updateAllAppsDomain:(NSString*)domain language:(NSString*)language {
  // domain and language can be nil to clear the values

  // if they are the same, don't do anything
  if ((domain == nil && allAppsCachedDomain_ == nil &&
       language == nil && allAppsCachedLanguage_ == nil) ||
      ([domain isEqualToString:allAppsCachedDomain_] &&
       [language isEqualToString:allAppsCachedLanguage_])) {
    return;
  }

  // write it to the file
  CFPreferencesSetValue(kPreferredDomainPrefKey,
                        (CFStringRef)domain,
                        kAllAppsBuildIdentifier,
                        kCFPreferencesCurrentUser,
                        kCFPreferencesAnyHost);
  CFPreferencesSetValue(kPreferredLanguagePrefKey,
                        (CFStringRef)language,
                        kAllAppsBuildIdentifier,
                        kCFPreferencesCurrentUser,
                        kCFPreferencesAnyHost);
  CFPreferencesSynchronize(kAllAppsBuildIdentifier,
                           kCFPreferencesCurrentUser,
                           kCFPreferencesAnyHost);

  // update our values
  [allAppsCachedDomain_ release];
  [allAppsCachedLanguage_ release];
  allAppsCachedDomain_ = [domain copy];
  allAppsCachedLanguage_ = [language copy];

#if GTM_GOOGLE_SEARCH_SUPPORTS_DISTRIBUTED_NOTIFICATIONS
  // NOTE: we'll go ahead and reload when this comes back to ourselves since
  // there is a race here if two folks wrote at about the same time.
  NSDistributedNotificationCenter *distCenter =
    [NSDistributedNotificationCenter defaultCenter];
  [distCenter postNotificationName:kNotificationName
                            object:nil
                          userInfo:nil];
#endif  // GTM_GOOGLE_SEARCH_SUPPORTS_DISTRIBUTED_NOTIFICATIONS
}

@end
