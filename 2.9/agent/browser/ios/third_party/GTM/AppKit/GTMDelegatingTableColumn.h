//
//  GTMDelegatingTableColumn.h
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

#import <Cocoa/Cocoa.h>
#import "GTMDefines.h"

// NOTE: If you're using the 10.5 SDK, just use the new delegate method:
//  tableView:dataCellForTableColumn:row:

@interface GTMDelegatingTableColumn : NSTableColumn
// no instance state or new method, it will just invoke the tableview's delegate
// w/ the method below.
@end

// the method delegated to
@interface NSObject (GTMDelegatingTableColumnDelegate)
- (id)gtm_tableView:(NSTableView *)tableView
 dataCellForTableColumn:(NSTableColumn *)tableColumn
                row:(NSInteger)row;
@end
