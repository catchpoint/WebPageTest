//
//  GTMNSFileManager+CarbonTest.m
//
//  Copyright 2006-2008 Google Inc.
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
#import "GTMNSFileManager+Carbon.h"
#import "GTMUnitTestDevLog.h"
#import <CoreServices/CoreServices.h>

@interface GTMNSFileManager_CarbonTest : GTMTestCase
@end
  
@implementation GTMNSFileManager_CarbonTest

- (void)testAliasPathFSRefConversion {
  NSString *path = NSHomeDirectory();
  STAssertNotNil(path, nil);
  NSFileManager *fileManager = [NSFileManager defaultManager];
  FSRef *fsRef = [fileManager gtm_FSRefForPath:path];
  STAssertNotNULL(fsRef, nil);
  AliasHandle alias;
  STAssertNoErr(FSNewAlias(nil, fsRef, &alias), nil);
  STAssertNotNULL(alias, nil);
  NSData *aliasData = [NSData dataWithBytes:*alias 
                                     length:GetAliasSize(alias)];
  STAssertNotNil(aliasData, nil);
  NSString *path2 = [fileManager gtm_pathFromAliasData:aliasData];
  STAssertEqualObjects(path, path2, nil);

  path2 = [fileManager gtm_pathFromAliasData:aliasData
                                     resolve:YES
                                      withUI:NO];
  STAssertEqualObjects(path, path2, nil);
  
  path2 = [fileManager gtm_pathFromAliasData:aliasData
                                     resolve:NO
                                      withUI:NO];
  STAssertEqualObjects(path, path2, nil);

  NSData *aliasData2 = [fileManager gtm_aliasDataForPath:path2];
  STAssertNotNil(aliasData2, nil);
  NSString *path3 = [fileManager gtm_pathFromAliasData:aliasData2];
  STAssertEqualObjects(path2, path3, nil);
  NSString *path4 = [fileManager gtm_pathFromFSRef:fsRef];
  STAssertEqualObjects(path, path4, nil);
  
  // Failure cases
  [GTMUnitTestDevLogDebug expectPattern:@"DebugAssert: "
    @"GoogleToolboxForMac: FSPathMakeRef.*"];
  STAssertNULL([fileManager gtm_FSRefForPath:@"/ptah/taht/dosent/esixt/"], 
               nil);

  STAssertNULL([fileManager gtm_FSRefForPath:@""], nil);
  STAssertNULL([fileManager gtm_FSRefForPath:nil], nil);
  STAssertNil([fileManager gtm_pathFromFSRef:nil], nil);
  STAssertNil([fileManager gtm_pathFromAliasData:nil], nil);
  STAssertNil([fileManager gtm_pathFromAliasData:[NSData data]], nil);
  
  [GTMUnitTestDevLogDebug expectPattern:@"DebugAssert: "
   @"GoogleToolboxForMac: FSPathMakeRef.*"];
  STAssertNil([fileManager gtm_aliasDataForPath:@"/ptah/taht/dosent/esixt/"], nil);
  STAssertNil([fileManager gtm_aliasDataForPath:@""], nil);
  STAssertNil([fileManager gtm_aliasDataForPath:nil], nil);
}
@end
