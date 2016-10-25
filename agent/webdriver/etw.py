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
import subprocess

class ETW:
  def __init__(self):
    self.trace_name = None
    self.kernel_categories = ['latency']
    self.user_categories = ['Microsoft-IE',
                            'Microsoft-IEFRAME',
                            'Microsoft-JScript',
                            'Microsoft-PerfTrack-IEFRAME',
                            'Microsoft-PerfTrack-MSHTML',
                            'Microsoft-Windows-DNS-Client',
                            'Microsoft-Windows-Schannel-Events',
                            'Microsoft-Windows-URLMon',
                            'Microsoft-Windows-WebIO',
                            'Microsoft-Windows-WinHttp',
                            'Microsoft-Windows-WinINet',
                            'Microsoft-Windows-WinINet-Capture',
                            'Microsoft-Windows-Winsock-NameResolution',
                            '37D2C3CD-C5D4-4587-8531-4696C44244C8' #Security: SChannel
                            ]

  def start(self, log_file):
    ret = 0
    if len(self.kernel_categories) or len(self.user_categories):
      command = ['xperf']
      if len(self.kernel_categories):
        command.extend(['-on', '+'.join(self.kernel_categories)])
      command.append('-start')
      self.trace_name = 'WebPageTest'
      command.append(self.trace_name)
      if len(self.user_categories):
        command.extend(['-on', '+'.join(self.user_categories)])
      command.extend(['-BufferSize', '1024'])
      command.extend(['-f', log_file])
      print('Capturing ETW trace {0} to "{1}"'.format(self.trace_name,log_file))
      ret = subprocess.call(command, shell=True)
      self.started = True
    return ret

  def stop(self):
    ret = 0
    if self.trace_name is not None:
      print('Stopping ETW trace')
      command = ['xperf', '-stop', self.trace_name]
      ret = subprocess.call(command, shell=True)
    return ret
