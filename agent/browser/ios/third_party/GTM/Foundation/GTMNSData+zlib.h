//
//  GTMNSData+zlib.h
//
//  Copyright 2007-2008 Google Inc.
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

/// Helpers for dealing w/ zlib inflate/deflate calls.
@interface NSData (GTMZLibAdditions)

/// Return an autoreleased NSData w/ the result of gzipping the bytes.
//
//  Uses the default compression level.
+ (NSData *)gtm_dataByGzippingBytes:(const void *)bytes
                             length:(NSUInteger)length;

/// Return an autoreleased NSData w/ the result of gzipping the payload of |data|.
//
//  Uses the default compression level.
+ (NSData *)gtm_dataByGzippingData:(NSData *)data;

/// Return an autoreleased NSData w/ the result of gzipping the bytes using |level| compression level.
//
// |level| can be 1-9, any other values will be clipped to that range.
+ (NSData *)gtm_dataByGzippingBytes:(const void *)bytes
                             length:(NSUInteger)length
                   compressionLevel:(int)level;

/// Return an autoreleased NSData w/ the result of gzipping the payload of |data| using |level| compression level.
+ (NSData *)gtm_dataByGzippingData:(NSData *)data
                  compressionLevel:(int)level;

// NOTE: deflate is *NOT* gzip.  deflate is a "zlib" stream.  pick which one
// you really want to create.  (the inflate api will handle either)

/// Return an autoreleased NSData w/ the result of deflating the bytes.
//
//  Uses the default compression level.
+ (NSData *)gtm_dataByDeflatingBytes:(const void *)bytes
                              length:(NSUInteger)length;

/// Return an autoreleased NSData w/ the result of deflating the payload of |data|.
//
//  Uses the default compression level.
+ (NSData *)gtm_dataByDeflatingData:(NSData *)data;

/// Return an autoreleased NSData w/ the result of deflating the bytes using |level| compression level.
//
// |level| can be 1-9, any other values will be clipped to that range.
+ (NSData *)gtm_dataByDeflatingBytes:(const void *)bytes
                              length:(NSUInteger)length
                    compressionLevel:(int)level;

/// Return an autoreleased NSData w/ the result of deflating the payload of |data| using |level| compression level.
+ (NSData *)gtm_dataByDeflatingData:(NSData *)data
                   compressionLevel:(int)level;


/// Return an autoreleased NSData w/ the result of decompressing the bytes.
//
// The bytes to decompress can be zlib or gzip payloads.
+ (NSData *)gtm_dataByInflatingBytes:(const void *)bytes
                              length:(NSUInteger)length;

/// Return an autoreleased NSData w/ the result of decompressing the payload of |data|.
//
// The data to decompress can be zlib or gzip payloads.
+ (NSData *)gtm_dataByInflatingData:(NSData *)data;

@end
