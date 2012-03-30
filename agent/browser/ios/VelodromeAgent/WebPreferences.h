//
//  WebPreferences.h
//
//  Created by Mark Cogan on 4/19/11
//  Derived from code by by Kenneth Leftin (iShots)
//  Copyright 2011 Google Inc. All rights reserved.

typedef NSUInteger WebCacheModel;

// Hidden header that exposes WebPreferences
@interface WebPreferences : NSObject {

}

- (void)setCacheModel:(WebCacheModel)cacheModel;
- (WebCacheModel)cacheModel;

- (void)setUsesPageCache:(BOOL)usesPageCache;
- (BOOL)usesPageCache;

@end

