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
import logging
import os
from selenium import webdriver
import time
from wpt_test_info import WptTest
from etw import ETW

def RunTest(driver, test):
  # Set up the timeouts and other options
  driver.set_page_load_timeout(test.GetTimeout())
  driver.set_window_position(0, 0, driver.current_window_handle)
  driver.set_window_size(1024, 768, driver.current_window_handle)

  #start ETW logging
  etw = ETW()
  etw_file = test.GetFileETW()
  if os.path.exists(etw_file):
    os.unlink(etw_file)
  etw.Start(etw_file)

  # Run through all of the script commands (just navigate for now but placeholder)
  while not test.Done():
    action = test.GetNextCommand()
    if action['command'] == 'navigate':
      driver.get(action['target'])

  etw.Stop()
  etw_csv = etw_file + '.csv'
  etw.ExtractCsv(etw_csv)
  events = etw.Parse(etw_csv)
  result = etw.ProcessEvents(events)

def main():
  import argparse
  parser = argparse.ArgumentParser(description='Chrome trace parser.',
                                   prog='trace-parser')
  parser.add_argument('-v', '--verbose', action='count',
                      help="Increase verbosity (specify multiple times for more). -vvvv for full debug output.")
  parser.add_argument('-t', '--test', help="Input test json file.")
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
