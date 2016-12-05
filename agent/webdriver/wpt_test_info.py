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
import base64
import json

class WptTest:
  def __init__(self, config_file):
    self.recorder = None
    self.test = None
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

  def GetFileBase(self):
    file_path = None
    if 'file_base' in self.test and len(self.test['file_base']):
      file_path = self.test['file_base']
    return file_path

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

  def GetFileUserTiming(self):
    file_path = None
    if 'file_base' in self.test and len(self.test['file_base']):
      file_path = self.test['file_base'] + '_timed_events.json'
    return file_path

  def GetFileCustomMetrics(self):
    file_path = None
    if 'file_base' in self.test and len(self.test['file_base']):
      file_path = self.test['file_base'] + '_metrics.json'
    return file_path

  def GetScreenshotPNG(self):
    file_path = None
    if 'file_base' in self.test and len(self.test['file_base']):
      file_path = self.test['file_base'] + '_screen.png'
    return file_path

  def KeepPNG(self):
    keep = False
    if 'png_screen_shot' in self.test and self.test['png_screen_shot']:
      keep = True
    return keep

  def GetScreenshotJPEG(self):
    file_path = None
    if 'file_base' in self.test and len(self.test['file_base']):
      file_path = self.test['file_base'] + '_screen.jpg'
    return file_path

  def GetImageQuality(self):
    quality = 30
    if 'image_quality' in self.test and self.test['image_quality'] > 0 and self.test['image_quality'] <= 100:
      quality = self.test['image_quality']
    return quality

  def BrowserWidth(self):
    width = 1024
    if 'browser_width' in self.test and self.test['browser_width'] > 0:
      width = int(self.test['browser_width'])
    return width

  def BrowserHeight(self):
    height = 1024
    if 'browser_height' in self.test and self.test['browser_height'] > 0:
      height = int(self.test['browser_height'])
    return height

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

  def GetCustomMetrics(self):
    metrics = None
    if 'custom_metrics' in self.test and len(self.test['custom_metrics']):
      lines = self.test['custom_metrics'].split("\n")
      if lines is not None and len(lines):
        for line in lines:
          if line.find(':') > 0:
            metric, str = line.split(":", 1)
            script = base64.b64decode(str)
            if metric is not None and script is not None and len(metric) and len(script):
              if metrics is None:
                metrics = {}
              metrics[metric] = script
    return metrics

  def SetRecorder(self, path):
    self.recorder = path

  def GetRecorder(self):
    return self.recorder

  def TcpDump(self):
    enabled = False
    if self.test is not None and 'tcpdump' in self.test and self.test['tcpdump']:
      enabled = True
    return enabled

  def Video(self):
    enabled = False
    if self.test is not None and 'video' in self.test and self.test['video']:
      enabled = True
    return enabled

  def FullSizeVideo(self):
    enabled = False
    if self.test is not None and 'full_size_video' in self.test and self.test['full_size_video']:
      enabled = True
    return enabled

  def EndAtOnLoad(self):
    doc_complete = False
    if self.test is not None and 'doc_complete' in self.test and self.test['doc_complete']:
      doc_complete = True
    return doc_complete