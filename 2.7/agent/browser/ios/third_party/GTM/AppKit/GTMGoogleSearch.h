// 
// GTMGoogleSearch.h
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

#import <Foundation/Foundation.h>

// Key for Info.plist for default global search args
#define GTMGoogleSearchClientAppArgsKey @"GTMGoogleSearchClientAppArgs"

// Types to pass in to searchForURL:ofType:arguments 
// and performQuery:ofType:arguments
#define GTMGoogleSearchFroogle @"products"
#define GTMGoogleSearchGroups @"groups"
#define GTMGoogleSearchImages @"images"
#define GTMGoogleSearchLocal @"local"
#define GTMGoogleSearchNews @"news"
#define GTMGoogleSearchFinance @"finance"
#define GTMGoogleSearchBooks @"books"
#define GTMGoogleSearchWeb @"search"

// iPhone doesn't support distributed notifications, so this controls whether
// or not we enable them in this class.
#define GTM_GOOGLE_SEARCH_SUPPORTS_DISTRIBUTED_NOTIFICATIONS GTM_MACOS_SDK

// Composes URLs and searches for google properties in the correct language 
// and domain.
@interface GTMGoogleSearch : NSObject {
  // the cached values
  NSString *allAppsCachedDomain_;
  NSString *allAppsCachedLanguage_;
  NSString *curAppCachedDomain_;
  NSString *curAppCachedLanguage_;
  NSDictionary *globalSearchArguments_;
}

//
// +sharedInstance
//
// fetches the common shared object for accessing this users preference
//
+ (GTMGoogleSearch*)sharedInstance;

//
// searchURLFor:ofType:arguments:
//
// creates a search url of type |type| for |queryText| using the user's
// preferred domain and language settings. |args| is a set of arguments
// that will be added into your query, and you can use it to complement
// or override settings stored in globalSearchArguments.
// example dictionary to do an I'm feeling lucky search would be:
// [NSDictionary dictionaryWithObject:@"1" key:@"btnI"];
// If queryText is nil, no query will be put in. 
// Arguments passed in in args must be properly URL escaped.
// If you want to remove one of the arguments that will be included in the
// global search arguments, set the object for the key you want to remove to
// [NSNull null].
- (NSString*)searchURLFor:(NSString *)queryText 
                   ofType:(NSString *)type
                arguments:(NSDictionary *)args;

//
// performQuery:ofType:arguments:
//
// Asks NSWorkspace to open up a query for an url created by passing
// the args to searchURLFor:ofType:arguments: above.
//
- (BOOL)performQuery:(NSString *)queryText
              ofType:(NSString *)type
           arguments:(NSDictionary *)localArgs;

// Global search arguments are initially picked up from your main bundle
// info.plist if there is a dictionary entry at the top level with the key
// "GTMGoogleSearchClientAppArgs". This dictionary should be a map of strings
// to strings where they are the args you want passed to all Google searches.
// You can override these with your localArgs when you actually perform the
// search if you wish.
// This arguments will affect all searches. Arguments must be properly URL
// escaped.
- (void)setGlobalSearchArguments:(NSDictionary *)args;

// Returns the global search arguments.
- (NSDictionary *)globalSearchArguments;

//
// -preferredDomainAndLanguage:areCurrentAppOnly
//
// fetches the user's preferred domain and language, and whether the values
// that were grabbed were from the anyapplication domain, or from the current
// application domain. You may pass in nil for |language| if you don't want
// a language back, and you may pass in NULL for |currentAppOnly| if you don't
// care about where it came from.
//
- (void)preferredDomain:(NSString **)domain
               language:(NSString **)language 
      areCurrentAppOnly:(BOOL*)currentAppOnly;

//
// -updatePreferredDomain:language:currentApplicationOnly:
//
// updated the users preferred domain and language to copies of |domain| and
// |language| respectively.  |domain| can't be nil or an empty string, but
// |language| can't be nil, but can be an empty string to signify no language
// pref. If |currentAppOnly| is YES, only updates the preferred settings for the
// current app, otherwise updates them for all apps. 
//
- (void)updatePreferredDomain:(NSString *)domain 
                     language:(NSString *)language
       currentApplicationOnly:(BOOL)currentAppOnly;

//
// -clearPreferredDomainAndLanguageForCurrentApplication
//
// clears the setting for the current applications preferred domain and
// language so future fetches will get the system level ones.
//
- (void)clearPreferredDomainAndLanguageForCurrentApplication;

//
// -clearPreferredDomainAndLanguageForAllApps
//
// clears the "AllApps" setting for preferred domain and language so future
// fetches end up having to use the default.  Odds are this is only
// used by the unittests.
// NOTE: this doesn't do anything to any setting that's set in an individual
// apps preferences, so those settings will still override inplace of the
// "all apps" value (or default).
//
- (void)clearPreferredDomainAndLanguageForAllApps;

@end
