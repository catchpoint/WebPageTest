// 
// GTMGoogleSearchTest.m
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
#import "GTMSenTestCase.h"
#import "GTMUnitTestDevLog.h"
#import <unistd.h>

@interface GTMGoogleSearchTest : GTMTestCase
@end

@implementation GTMGoogleSearchTest

- (void)testSearches {
  typedef struct {
    NSString *type;
    NSString *expectedPrefix;
  } TestSearchDesc;
  static TestSearchDesc testSearches[] = {
    { GTMGoogleSearchFroogle, @"http://www.google.xxx/products?" },
    { GTMGoogleSearchGroups, @"http://www.google.xxx/groups?" },
    { GTMGoogleSearchImages, @"http://www.google.xxx/images?"},
    { GTMGoogleSearchLocal, @"http://www.google.xxx/local?"},
    { GTMGoogleSearchNews, @"http://www.google.xxx/news?"},
    { GTMGoogleSearchFinance, @"http://www.google.xxx/finance?"},
    { GTMGoogleSearchBooks, @"http://www.google.xxx/books?"},
    { GTMGoogleSearchWeb, @"http://www.google.xxx/search?"},
  };
  
  GTMGoogleSearch *googleSearch = [GTMGoogleSearch sharedInstance];
  STAssertNotNil(googleSearch, nil);

  // force the current app values so we aren't at the mercy of the
  // global setting the users locale.
  [googleSearch updatePreferredDomain:@"xxx"
                             language:@"yyy"
               currentApplicationOnly:TRUE];
  
  size_t count = sizeof(testSearches) / sizeof(testSearches[0]);
  NSDictionary *globalArgs 
    = [NSDictionary dictionaryWithObject:@"f" forKey:@"foo"];
  [googleSearch setGlobalSearchArguments:globalArgs];
  NSDictionary *args = [NSDictionary dictionaryWithObject:@"Baba"
                                                  forKey:@"BaR"];
  NSString *expectedStrings[] = { 
    @"oe=UTF-8", @"hl=yyy", @"q=Foobar", 
    @"foo=f", @"ie=UTF-8", @"BaR=Baba" 
  };
  for (size_t i = 0; i < count; i++) {
    // test building the url
    NSString *urlString = [googleSearch searchURLFor:@"Foobar" 
                                              ofType:testSearches[i].type 
                                           arguments:args];
    STAssertTrue([urlString hasPrefix:testSearches[i].expectedPrefix], 
                 @"Bad URL? URL:%@ Expected Prefix:%@", 
                 urlString, testSearches[i].expectedPrefix);
    for (size_t j = 0; 
         j < sizeof(expectedStrings) / sizeof(expectedStrings[0]); 
         ++j) {
      STAssertGreaterThan([urlString rangeOfString:expectedStrings[j]].length,
                          (NSUInteger)0, @"URL: %@ expectedString: %@", 
                          urlString, expectedStrings[j]);
    }
  } 

  // clear what we just set for this test
  [googleSearch setGlobalSearchArguments:nil];
  [googleSearch clearPreferredDomainAndLanguageForCurrentApplication];
}

- (void)testBadInputs {
  GTMGoogleSearch *googleSearch = [GTMGoogleSearch sharedInstance];
  STAssertNotNil(googleSearch, nil);
  NSDictionary *args = [NSDictionary dictionaryWithObject:@"Ba!ba"
                                                   forKey:@"Ba=R"];
  [GTMUnitTestDevLogDebug expectString:
   @"Unescaped string Foo bar in argument pair {q,Foo bar } "
   @"in -[GTMGoogleSearch searchURLFor:ofType:arguments:]"];
  [GTMUnitTestDevLogDebug expectString:
   @"Unescaped string Ba=R in argument pair {Ba=R, Ba!ba} "
   @"in -[GTMGoogleSearch searchURLFor:ofType:arguments:]"];
  [GTMUnitTestDevLogDebug expectString:
   @"Unescaped string Ba!ba in argument pair {Ba=R,Ba!ba } "
   @"in -[GTMGoogleSearch searchURLFor:ofType:arguments:]"];
  NSString *urlString = [googleSearch searchURLFor:@"Foo bar" 
                                            ofType:GTMGoogleSearchFroogle
                                         arguments:args];
  STAssertNotNil(urlString, nil);
}
  
- (void)testPreferredDefaults {
  GTMGoogleSearch *googleSearch = [GTMGoogleSearch sharedInstance];
  STAssertNotNil(googleSearch, nil);
  
  // hey, we're a unit test, so start by blowing away what we have at the
  // app level.
  [googleSearch clearPreferredDomainAndLanguageForCurrentApplication];
  
  // in theory, we could fetch now and save off what we get to reset at the
  // end of this, but we can't tell if that was an "all apps" setting, or if
  // it was the default, so...hey, we're a unit test, we'll just stomp what's
  // there and clear it out when done...
  [googleSearch clearPreferredDomainAndLanguageForAllApps];
  
  // make sure the individual accessors work...
  
  // since they system level default can be set by any app, we just have to
  // check for non nil here (also the users locale could control what
  // we get if nothing is set).
  NSString *domain;
  NSString *lang;
  // now do a detailed check...
  BOOL areCurrentAppOnly = YES;
  [googleSearch preferredDomain:&domain
                       language:&lang
              areCurrentAppOnly:&areCurrentAppOnly];
  // should get something for defaults...
  STAssertNotNil(domain, nil);
  STAssertNotNil(lang, nil);
  STAssertFalse(areCurrentAppOnly, nil);

  // test it for "all apps"...
  [googleSearch updatePreferredDomain:@"domain"
                             language:@"lang"
               currentApplicationOnly:NO];
  [googleSearch preferredDomain:&domain
                       language:&lang
              areCurrentAppOnly:&areCurrentAppOnly];
  STAssertEqualObjects(domain, @"domain", nil);
  STAssertEqualObjects(lang, @"lang", nil);
  STAssertFalse(areCurrentAppOnly, nil);

  // test it for this app...
  [googleSearch updatePreferredDomain:@"domainThisApp"
                             language:@"langThisApp"
               currentApplicationOnly:YES];
  [googleSearch preferredDomain:&domain
                       language:&lang
              areCurrentAppOnly:&areCurrentAppOnly];
  STAssertEqualObjects(domain, @"domainThisApp", nil);
  STAssertEqualObjects(lang, @"langThisApp", nil);
  STAssertTrue(areCurrentAppOnly, nil);

  // clear what we just set for this app
  [googleSearch clearPreferredDomainAndLanguageForCurrentApplication];

  // should get back what we set for all apps
  [googleSearch preferredDomain:&domain
                       language:&lang
              areCurrentAppOnly:&areCurrentAppOnly];
  STAssertEqualObjects(domain, @"domain", nil);
  STAssertEqualObjects(lang, @"lang", nil);
  STAssertFalse(areCurrentAppOnly, nil);
#if GTM_GOOGLE_SEARCH_SUPPORTS_DISTRIBUTED_NOTIFICATIONS
  // We don't test launching other tasks on the phone since this isn't a valid
  // case until we can support real multiple tasks on the phone.
  
  // try changing the value directly in the plist file (as if another app had
  // done it) and sending our notification.
  [[NSTask launchedTaskWithLaunchPath:@"/usr/bin/defaults"
                            arguments:[NSArray arrayWithObjects:@"write",
                              @"com.google.GoogleSearchAllApps",
                              @"{ \"com.google.PreferredDomain\" = xxx;"
                                @"\"com.google.PreferredLanguage\" = yyy; }",
                              nil]] waitUntilExit];
  // Sleep for a moment to let things flush 
  // (seen rarely as a problem on aharper's machine).
  sleep(1);
  NSDistributedNotificationCenter *distCenter =
    [NSDistributedNotificationCenter defaultCenter];
  [distCenter postNotificationName:@"com.google.GoogleSearchAllApps.prefsWritten"
                            object:nil
                          userInfo:nil
                           options:NSNotificationDeliverImmediately];
  
  // Spin the runloop so the notifications fire.
  NSRunLoop *currentLoop = [NSRunLoop currentRunLoop];
  [currentLoop runUntilDate:[NSDate dateWithTimeIntervalSinceNow:1.0]];
  // did we get what we expected?
  [googleSearch preferredDomain:&domain
                       language:&lang
              areCurrentAppOnly:&areCurrentAppOnly];  
  STAssertEqualObjects(domain, @"xxx", nil);
  STAssertEqualObjects(lang, @"yyy", nil);
  STAssertFalse(areCurrentAppOnly, nil);
#endif  // GTM_GOOGLE_SEARCH_SUPPORTS_DISTRIBUTED_NOTIFICATIONS
  
  // lastly, clean up what we set for all apps to leave the system at the
  // default.
  [googleSearch clearPreferredDomainAndLanguageForAllApps];
}

@end
