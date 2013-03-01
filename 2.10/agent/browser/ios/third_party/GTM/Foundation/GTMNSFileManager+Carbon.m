//
//  GTMNSFileManager+Carbon.m
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

#import "GTMNSFileManager+Carbon.h"
#import <CoreServices/CoreServices.h>
#import <sys/param.h>
#import "GTMDefines.h"
#import "GTMGarbageCollection.h"

@implementation NSFileManager (GTMFileManagerCarbonAdditions)

- (NSData *)gtm_aliasDataForPath:(NSString *)path { 
  NSData *data = nil;
  FSRef ref;
  AliasHandle alias = NULL;

  require_quiet([path length], CantUseParams);
  require_noerr(FSPathMakeRef((UInt8 *)[path fileSystemRepresentation], 
                              &ref, NULL), CantMakeRef); 
  require_noerr(FSNewAlias(NULL, &ref, &alias), CantMakeAlias);

  Size length = GetAliasSize(alias);
  data = [NSData dataWithBytes:*alias length:length];
  
  DisposeHandle((Handle)alias);

CantMakeAlias:  
CantMakeRef:
CantUseParams:
  return data; 
} 

- (NSString *)gtm_pathFromAliasData:(NSData *)data {
  return [self gtm_pathFromAliasData:data resolve:YES withUI:YES];
} 

- (NSString *)gtm_pathFromAliasData:(NSData *)data 
                            resolve:(BOOL)resolve 
                             withUI:(BOOL)withUI {
  NSString *path = nil;
  require_quiet(data, CantUseParams);
  
  AliasHandle alias;
  const void *bytes = [data bytes];
  NSUInteger length = [data length];
  require_noerr(PtrToHand(bytes, (Handle *)&alias, length), CantMakeHandle);
  
  FSRef ref;
  Boolean wasChanged;
  // we don't use a require here because it is quite legitimate for an alias
  // resolve to fail.

  if (resolve) { 
    OSStatus err
      = FSResolveAliasWithMountFlags(NULL, alias, &ref, &wasChanged,
                                     withUI ? kResolveAliasFileNoUI : 0);
    if (err == noErr) {
      path = [self gtm_pathFromFSRef:&ref];
    }
  } else {
    OSStatus err
      = FSCopyAliasInfo(alias, NULL, NULL, (CFStringRef *)(&path), NULL, NULL);
    if (err != noErr) path = nil;
    GTMCFAutorelease(path);
  }
  DisposeHandle((Handle)alias);
CantMakeHandle:
CantUseParams:
  return path;
}

- (FSRef *)gtm_FSRefForPath:(NSString *)path {
  FSRef* fsRef = NULL;
  require_quiet([path length], CantUseParams);
  NSMutableData *fsRefData = [NSMutableData dataWithLength:sizeof(FSRef)];
  require(fsRefData, CantAllocateFSRef);
  fsRef = (FSRef*)[fsRefData mutableBytes];
  Boolean isDir = FALSE;
  const UInt8 *filePath = (const UInt8 *)[path fileSystemRepresentation];
  require_noerr_action(FSPathMakeRef(filePath, fsRef, &isDir), 
                       CantMakeRef, fsRef = NULL);
CantMakeRef:
CantAllocateFSRef:
CantUseParams:
  return fsRef;
}

- (NSString *)gtm_pathFromFSRef:(FSRef *)fsRef {
  NSString *nsPath = nil;
  require_quiet(fsRef, CantUseParams);
  
  char path[MAXPATHLEN];
  require_noerr(FSRefMakePath(fsRef, (UInt8 *)path, MAXPATHLEN), CantMakePath);
  nsPath = [self stringWithFileSystemRepresentation:path length:strlen(path)];
  nsPath = [nsPath stringByStandardizingPath];
  
CantMakePath:
CantUseParams:
  return nsPath;
}  

@end
