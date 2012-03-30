//
//  GTMShading.h
//
//  A protocol for an object that can be used as a shader.
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

/// \cond Protocols

@protocol GTMShading
//  Returns the shadefunction for using in a shader.
//  This shadefunction shoud never be released. It is owned by the implementor
//  of the GTMShading protocol.
//
//  Returns:
//    a shading function.
- (CGFunctionRef)shadeFunction;

//  Returns the colorSpace for using in a shader.
//  This colorSpace shoud never be released. It is owned by the implementor
//  of the GTMShading protocol.
//
//  Returns:
//    a color space.
- (CGColorSpaceRef)colorSpace;
@end

/// \endcond
