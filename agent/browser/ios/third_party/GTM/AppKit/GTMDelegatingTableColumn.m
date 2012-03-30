//
//  GTMDelegatingTableColumn.m
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

#import "GTMDelegatingTableColumn.h"

@implementation GTMDelegatingTableColumn
- (id)dataCellForRow:(NSInteger)row {
  id dataCell = nil;
  id delegate = [[self tableView] delegate];
  BOOL sendSuper = YES;
  if (delegate) {
    if ([delegate respondsToSelector:@selector(gtm_tableView:dataCellForTableColumn:row:)]) {

      dataCell = [delegate gtm_tableView:[self tableView]
                    dataCellForTableColumn:self
                                        row:row];
      sendSuper = NO;
    } else {
      _GTMDevLog(@"tableView delegate didn't implement gtm_tableView:dataCellForTableColumn:row:");
    }
  }
  if (sendSuper) {
    dataCell = [super dataCellForRow:row];
  }
  return dataCell;
}
@end
