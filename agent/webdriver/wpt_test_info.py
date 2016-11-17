"""
Copyright 2016 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""
from collections import deque
import json

class WptTest:
  def __init__(self, config_file):
    with open(config_file, 'rb') as file:
      self.test = json.load(file)
      self.script = deque([])
      if 'url' in self.test:
        self.script.append({'command': 'navigate', 'target': self.test['url'], 'wait': True})

  def Done(self):
    return len(self.script) == 0

  def GetNextCommand(self):
    command = None
    if len(self.script):
      command = self.script.popleft()
    return command

  def GetTimeout(self):
    timeout = 120
    if self.test is not None and 'max_test_time' in self.test and self.test['max_test_time'] > 0:
      timeout = self.test['max_test_time']
    return timeout

  def GetFileETW(self):
    file_path = None
    if 'file_base' in self.test and len(self.test['file_base']):
      file_path = self.test['file_base'] + '_trace.etl'
    return file_path

  def GetFilePageData(self):
    file_path = None
    if 'file_base' in self.test and len(self.test['file_base']):
      file_path = self.test['file_base'] + '_page_data.json'
    return file_path

  def GetFileRequests(self):
    file_path = None
    if 'file_base' in self.test and len(self.test['file_base']):
      file_path = self.test['file_base'] + '_requests.json'
    return file_path

  def GetUrl(self):
    url = None
    if 'url' in self.test:
      url = self.test['url']
    return url

  def IsCached(self):
    cached = 0
    if self.test is not None and 'clear_cache' in self.test and not self.test['clear_cache']:
      cached = 1
    return cached
