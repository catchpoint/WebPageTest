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
import os
import subprocess
from selenium import webdriver
from wpt_test_info import WptTest
from etw import ETW
from recorder import WptRecord

PAGE_DATA_SCRIPT = """
  var pageData = {};
  var domCount = document.documentElement.getElementsByTagName("*").length;
  if (domCount === undefined)
    domCount = 0;
  pageData["domElements"] = domCount;
  function addTime(name, field) {
    if (field == undefined)
      field = name;
    try {
      if (window.performance.timing[field] > 0) {
        pageData[name] = Math.max(0, Math.round(window.performance.timing[field] - window.performance.timing["navigationStart"]));
      }
    } catch(e) {}
  };
  addTime("domInteractive");
  addTime("domContentLoadedEventStart");
  addTime("domContentLoadedEventEnd");
  addTime("loadEventStart");
  addTime("loadEventEnd");
  addTime("firstPaint", "msFirstPaint");
  return pageData;
"""

USER_TIMING_SCRIPT = """
  var m = [];
  try {
    var marks = window.performance.getEntriesByType("mark");
    if (marks.length) {
      for (var i = 0; i < marks.length; i++)
        m.push({"type": "mark",
                "entryType": marks[i].entryType,
                "name": marks[i].name,
                "startTime": marks[i].startTime});
    }
  } catch(e) {};
  try {
    var measures = window.performance.getEntriesByType("measure");
    if (measures.length) {
      for (var i = 0; i < measures.length; i++)
        m.push({"type": "measure",
                "entryType": measures[i].entryType,
                "name": measures[i].name,
                "startTime": measures[i].startTime,
                "duration": measures[i].duration});
    }
  } catch(e) {};
  return m;
"""

def RunTest(driver, test):
  global PAGE_DATA_SCRIPT
  global USER_TIMING_SCRIPT

  # Set up the timeouts and other options
  driver.set_page_load_timeout(test.GetTimeout())
  driver.set_window_position(0, 0, driver.current_window_handle)
  driver.set_window_size(test.BrowserWidth(), test.BrowserHeight(), driver.current_window_handle)

  # Prepare the recorder
  recorder = WptRecord()
  recorder.Prepare(test)

  #start ETW logging
  etw = ETW()
  etw_file = test.GetFileETW()
  try:
    etw.Start(etw_file)
  except:
    pass

  # Start Recording
  recorder.Start()

  # Run through all of the script commands (just navigate for now but placeholder)
  while not test.Done():
    action = test.GetNextCommand()
    try:
      if action['command'] == 'navigate':
        driver.get(action['target'])
    except:
      pass

  # Wait for idle if it is not an onload-ending test
  if not test.EndAtOnLoad():
    recorder.WaitForIdle(30)

  # Stop Recording
  recorder.Stop()

  try:
    etw.Stop()
  except:
    pass

  # Pull metrics from the DOM
  dom_data = None
  try:
    dom_data = driver.execute_script(PAGE_DATA_SCRIPT)
    logging.debug('Navigation Timing: {0}'.format(json.dumps(dom_data)))
  except:
    pass

  # check for any user timing marks or measures
  try:
    user_timing_file = test.GetFileUserTiming()
    if user_timing_file is not None:
      if os.path.exists(user_timing_file):
        os.unlink(user_timing_file)
      if os.path.exists(user_timing_file + '.gz'):
        os.unlink(user_timing_file + '.gz')
      user_timing = driver.execute_script(USER_TIMING_SCRIPT)
      if user_timing is not None:
        with gzip.open(user_timing_file + '.gz', 'wb') as f:
          json.dump(user_timing, f)
  except:
    pass

  # collect custom metrics
  try:
    custom_metric_scripts = test.GetCustomMetrics()
    custom_metrics_file = test.GetFileCustomMetrics()
    if custom_metric_scripts is not None and custom_metrics_file is not None:
      if os.path.exists(custom_metrics_file):
        os.unlink(custom_metrics_file)
      if os.path.exists(custom_metrics_file + '.gz'):
        os.unlink(custom_metrics_file + '.gz')
      custom_metrics = None
      for metric in custom_metric_scripts:
        script = custom_metric_scripts[metric]
        result = driver.execute_script(script)
        if result is not None:
          if custom_metrics is None:
            custom_metrics = {}
          custom_metrics[metric] = result
      if custom_metrics is not None:
        with gzip.open(custom_metrics_file + '.gz', 'wb') as f:
          json.dump(custom_metrics, f)
  except:
    pass

  # grab a screen shot
  try:
    png = test.GetScreenshotPNG()
    if png is not None:
      if os.path.exists(png):
        os.unlink(png)
      driver.get_screenshot_as_file(png)
      jpeg = test.GetScreenshotJPEG()
      quality = test.GetImageQuality()
      if jpeg is not None and os.path.exists(png):
        command = 'magick "{0}" -set colorspace sRGB -quality {1:d} "{2}"'.format(png, quality, jpeg)
        subprocess.call(command, shell=True)
        if os.path.exists(jpeg) and not test.KeepPNG():
          os.unlink(png)
  except:
    pass

  # process the etw trace
  start_offset = 0
  try:
    start_offset = etw.Write(test, dom_data)
  except:
    pass
  if os.path.exists(etw_file):
    os.unlink(etw_file)

  # Process the recording
  print('Processing video capture')
  recorder.Process(start_offset)
  recorder.Done()

def main():
  import argparse
  parser = argparse.ArgumentParser(description='Chrome trace parser.',
                                   prog='trace-parser')
  parser.add_argument('-v', '--verbose', action='count',
                      help="Increase verbosity (specify multiple times for more). -vvvv for full debug output.")
  parser.add_argument('-t', '--test', help="Input test json file.")
  parser.add_argument('-r', '--recorder', help="Path to wptrecord.exe for recording video, tcpdump, etc.")
  options, unknown = parser.parse_known_args()

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

  if not options.test:
    parser.error("Input test file is not specified.")
  test = WptTest(options.test)

  if options.recorder:
    test.SetRecorder(options.recorder)

  #Start the browser
  exe = os.path.join(os.path.dirname(os.path.abspath(__file__)), "edge/MicrosoftWebDriver.exe")
  driver = webdriver.Edge(executable_path=exe)
  driver.get("about:blank")

  RunTest(driver, test)

  #quit the browser
  driver.quit()

if '__main__' == __name__:
#  import cProfile
#  cProfile.run('main()', None, 2)
  main()
