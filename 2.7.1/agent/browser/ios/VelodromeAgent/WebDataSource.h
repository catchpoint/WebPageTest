//
//  WebDataSource.h
//
//  Created by Mark Cogan on 4/19/11
//  Derived from code by by Kenneth Leftin (iShots)
//  Copyright 2011 Google Inc. All rights reserved.
//

// Hidden header that exposes WebDataSource
@interface WebDataSource : NSObject {

}

- (NSURLResponse *) response;
- (NSData *) data;

@end
