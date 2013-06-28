# Copyright 2010 Google Inc. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


"""
Command line tool to convert PCAP file to HAR format.

This is command line to for pcaphar app engine. A user can convert a PCAP file
to HAR format file.
"""

__author__ = 'lsong@google.com (Libo Song)'

import os
import sys

# add third_party directory to sys.path for global import
path = os.path.join(os.path.dirname(__file__), "third_party")
sys.path.append(os.path.abspath(path))
dpkt_path = os.path.join(path, "dpkt")
sys.path.append(os.path.abspath(dpkt_path))
simplejson_path = os.path.join(path, "simplejson")
sys.path.append(os.path.abspath(simplejson_path))



import heapq
import logging
import StringIO
import time
#from pcap2har import convert
# BLAZE: The import fails, probably a google app engine thing
import convert

def PrintUsage():
  print __file__, "[options] <pcap file> [<har file>]"
  print "options: -l[diwe] log level"
  print "         --port filter out port"

def main(argv=None):
  logging_level = logging.WARNING
  filter_port = -1
  if argv is None:
    argv = sys.argv
  filenames = []
  idx = 1
  while idx < len(argv):
    if argv[idx] == '-h' or argv[idx] == '--help':
      PrintUsage()
      return 0
    elif argv[idx] == '--port':
      idx += 1
      if idx >= len(argv):
        PrintUsage()
        return 1
      filter_port = int(argv[idx])
    elif argv[idx] == '-ld':
      logging_level = logging.DEBUG
    elif argv[idx] == '-li':
      logging_level = logging.INFO
    elif argv[idx] == '-lw':
      logging_level = logging.WARN
    elif argv[idx] == '-le':
      logging_level = logging.ERROR
    elif argv[idx][0:1] == '-':
      print "Unknow option:", argv[idx]
      PrintUsage()
      return 1
    else:
      filenames.append(argv[idx])
    idx += 1

  # set the logging level
  logging.basicConfig(level=logging_level)

  if len(filenames) == 1:
    pcap_file = filenames[0]
    har_file = pcap_file + ".har"
  elif len(filenames) == 2:
    pcap_file = filenames[0]
    har_file = filenames[1]
  else:
    PrintUsage()
    return 1

  # If excpetion raises, do not catch it to terminate the program.
  inf = open(pcap_file, 'r')
  pcap_in = inf.read()
  inf.close
  har_out = StringIO.StringIO()
  options = convert.Options()
  options.remove_cookie = False
  convert.convert(pcap_in, har_out, options)
  har_out_str = har_out.getvalue()
  outf = open(har_file, 'w')
  outf.write(har_out_str)
  outf.close()


if __name__ == "__main__":
  sys.exit(main())
