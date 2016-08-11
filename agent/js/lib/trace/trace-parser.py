#!/usr/bin/python
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
import gzip
import json
import logging
import math
import os
import time

########################################################################################################################
#   Trace processing
########################################################################################################################
class Trace():
  def __init__(self):
    self.thread_stack = {}
    self.ignore_threads = {}
    self.threads = {}
    self.user_timing = []
    self.event_names = {}
    self.event_name_lookup = {}
    self.timeline_events = []
    self.start_time = None
    self.end_time = None
    self.cpu = {'main_thread': None}
    return

  def Process(self, trace):
    f = None
    line_mode = False
    self.__init__()
    try:
      file_name, ext = os.path.splitext(trace)
      if ext.lower() == '.gz':
        f = gzip.open(trace, 'rb')
      else:
        f = open(trace, 'r')
      for line in f:
        try:
          trace_event = json.loads(line.strip("\r\n\t ,"))
          if not line_mode and 'traceEvents' in trace_event:
            for sub_event in trace_event['traceEvents']:
              self.ProcessEvent(sub_event)
          else:
            line_mode = True
            self.ProcessEvent(trace_event)
        except:
          pass
    except:
      logging.critical("Error processing trace " + trace)

    if f is not None:
      f.close()
    self.ProcessTimelineEvents()

  def WriteUserTiming(self, file):
    try:
      file_name, ext = os.path.splitext(file)
      if ext.lower() == '.gz':
        with gzip.open(file, 'wb') as f:
          json.dump(self.user_timing, f)
      else:
        with open(file, 'w') as f:
          json.dump(self.user_timing, f)
    except:
      logging.critical("Error writing user timing to " + file)

  def WriteCPUSlices(self, file):
    try:
      file_name, ext = os.path.splitext(file)
      if ext.lower() == '.gz':
        with gzip.open(file, 'wb') as f:
          json.dump(self.cpu, f)
      else:
        with open(file, 'w') as f:
          json.dump(self.cpu, f)
    except:
      logging.critical("Error writing user timing to " + file)

  def ProcessEvent(self, trace_event):
    cat = trace_event['cat']
    if cat.find('blink.user_timing') >= 0:
      self.user_timing.append(trace_event)
    if cat.find('devtools.timeline') >= 0:
      thread = '{0}:{1}'.format(trace_event['pid'], trace_event['tid'])

      # Keep track of the main thread
      if self.cpu['main_thread'] is None and trace_event['name'] == 'ResourceSendRequest' and 'args' in trace_event and\
              'data' in trace_event['args'] and 'url' in trace_event['args']['data']:
        if trace_event['args']['data']['url'][:21] == 'http://127.0.0.1:8888':
          self.ignore_threads[thread] = True
        else:
          if thread not in self.threads:
            self.threads[thread] = {}
          if self.start_time is None or trace_event['ts'] < self.start_time:
            self.start_time = trace_event['ts']
          self.cpu['main_thread'] = thread
          if 'dur' not in trace_event:
            trace_event['dur'] = 1

      # Make sure each thread has a numerical ID
      if self.cpu['main_thread'] is not None and thread not in self.threads and thread not in self.ignore_threads and\
              trace_event['name'] != 'Program':
        self.threads[thread] = {}

      # Build timeline events on a stack. 'B' begins an event, 'E' ends an event
      if (thread in self.threads and ('dur' in trace_event or trace_event['ph'] == 'B' or trace_event['ph'] == 'E')):
        trace_event['thread'] = self.threads[thread]
        if thread not in self.thread_stack:
          self.thread_stack[thread] = []
        if trace_event['name'] not in self.event_names:
          self.event_names[trace_event['name']] = len(self.event_names)
          self.event_name_lookup[self.event_names[trace_event['name']]] = trace_event['name']
        if trace_event['name'] not in self.threads[thread]:
          self.threads[thread][trace_event['name']] = self.event_names[trace_event['name']]
        e = None
        if trace_event['ph'] == 'E':
          if len(self.thread_stack[thread]) > 0:
            e = self.thread_stack[thread].pop()
            if e['n'] == self.event_names[trace_event['name']]:
              e['e'] = trace_event['ts']
        else:
          e = {'t': thread, 'n': self.event_names[trace_event['name']], 's': trace_event['ts']}
          if trace_event['ph'] == 'B':
            self.thread_stack[thread].append(e)
            e = None
          elif 'dur' in trace_event:
            e['e'] = e['s'] + trace_event['dur']

        if e is not None and 'e' in e and e['s'] >= self.start_time and e['e'] >= e['s']:
          if self.end_time is None or e['e'] > self.end_time:
            self.end_time = e['e']
          # attach it to a parent event if there is one
          if len(self.thread_stack[thread]) > 0:
            parent = self.thread_stack[thread].pop()
            if 'c' not in parent:
              parent['c'] = []
            parent['c'].append(e)
            self.thread_stack[thread].append(parent)
          else:
            self.timeline_events.append(e)

  def ProcessTimelineEvents(self):
    if len(self.timeline_events) and self.end_time > self.start_time:
      # Figure out how big each slice should be in usecs. Size it to a power of 10 where we have at least 2000 slices
      exp = 0
      last_exp = 0
      slice_count = self.end_time - self.start_time
      while slice_count > 2000:
        last_exp = exp
        exp += 1
        slice_count = int(math.ceil(float(self.end_time - self.start_time) / float(pow(10, exp))))
      self.cpu['total_usecs'] = self.end_time - self.start_time
      self.cpu['slice_usecs'] = int(pow(10, last_exp))
      slice_count = int(math.ceil(float(self.end_time - self.start_time) / float(self.cpu['slice_usecs'])))

      # Create the empty time slices for all of the threads
      self.cpu['slices'] = {}
      for thread in self.threads.keys():
        self.cpu['slices'][thread] = {}
        for name in self.threads[thread].keys():
          self.cpu['slices'][thread][name] = [0.0] * slice_count

      # Go through all of the timeline events recursively and account for the time they consumed
      for timeline_event in self.timeline_events:
        self.ProcessTimelineEvent(timeline_event, None)

      # Go through all of the fractional times and convert the float fractional times to integer usecs
      for thread in self.cpu['slices'].keys():
        for name in self.cpu['slices'][thread].keys():
          for slice in range(len(self.cpu['slices'][thread][name])):
            self.cpu['slices'][thread][name][slice] =\
              int(self.cpu['slices'][thread][name][slice] * self.cpu['slice_usecs'])

  def ProcessTimelineEvent(self, timeline_event, parent):
    start = timeline_event['s'] - self.start_time
    end = timeline_event['e'] - self.start_time
    if end > start:
      thread = timeline_event['t']
      name = self.event_name_lookup[timeline_event['n']]
      slice_usecs = self.cpu['slice_usecs']
      first_slice = int(float(start) / float(slice_usecs))
      last_slice = int(float(end) / float(slice_usecs))
      for slice_number in range(first_slice, last_slice + 1):
        slice_start = slice_number * slice_usecs;
        slice_end = slice_start + slice_usecs;
        used_start = max(slice_start, start)
        used_end = min(slice_end, end)
        slice_elapsed = used_end - used_start
        self.AdjustTimelineSlice(thread, slice_number, name, parent, slice_elapsed)

      # Recursively process any child events
      if 'c' in timeline_event:
        for child in timeline_event['c']:
          self.ProcessTimelineEvent(child, name)

  # Add the time to the given slice and subtract the time from a parent event
  def AdjustTimelineSlice(self, thread, slice_number, name, parent, elapsed):
    try:
      fraction = min(1.0, float(elapsed) / float(self.cpu['slice_usecs']))
      self.cpu['slices'][thread][name][slice_number] =\
        min(1.0, self.cpu['slices'][thread][name][slice_number] + fraction)
      if parent is not None:
        self.cpu['slices'][thread][parent][slice_number] =\
          max(0.0, self.cpu['slices'][thread][parent][slice_number] - fraction)
      # make sure we don't exceed 100% for any slot
      available = 1.0 - fraction
      for slice_name in self.cpu['slices'][thread].keys():
        if slice_name != name:
          self.cpu['slices'][thread][slice_name][slice_number] =\
            min(self.cpu['slices'][thread][slice_name][slice_number], available)
          available -= self.cpu['slices'][thread][slice_name][slice_number]
    except:
      pass


########################################################################################################################
#   Main Entry Point
########################################################################################################################
def main():
  import argparse
  parser = argparse.ArgumentParser(description='Chrome trace parser.',
                                   prog='trace-parser')
  parser.add_argument('-v', '--verbose', action='count',
                      help="Increase verbosity (specify multiple times for more). -vvvv for full debug output.")
  parser.add_argument('-t', '--trace', help="Input trace file.")
  parser.add_argument('-c', '--cpu', help="Output CPU time slices file.")
  parser.add_argument('-u', '--user', help="Output user timing file.")
  options = parser.parse_args()

  # Set up logging
  log_level = logging.CRITICAL
  if options.verbose == 1:
    log_level = logging.ERROR
  elif options.verbose == 2:
    log_level = logging.WARNING
  elif options.verbose == 3:
    log_level = logging.INFO
  elif options.verbose >= 4:
    log_level = logging.DEBUG
  logging.basicConfig(level=log_level, format="%(asctime)s.%(msecs)03d - %(message)s", datefmt="%H:%M:%S")

  if not options.trace:
    parser.error("Input trace file is not specified.")

  start = time.time()
  trace = Trace()
  trace.Process(options.trace)

  if options.user:
    trace.WriteUserTiming(options.user)

  if options.cpu:
    trace.WriteCPUSlices(options.cpu)

  end = time.time()
  elapsed = end - start
  logging.debug("Elapsed Time: {0:0.4f}".format(elapsed))

if '__main__' == __name__:
  main()
