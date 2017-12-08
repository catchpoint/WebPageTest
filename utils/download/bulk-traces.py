#!/usr/bin/python
"""
Copyright (c) 2016, Google Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of the company nor the names of its contributors may be
      used to endorse or promote products derived from this software without
      specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE."""
import json
import os
import sys
import urllib
from urlparse import urlparse


def GetTestIDs(test_url):
    print 'Getting the test IDs for the bulk test ' + test_url + '...'
    if test_url.find('?') != -1:
        test_url += "&f=json"
    else:
        test_url += "?f=json"
    response = urllib.urlopen(test_url)
    data = json.load(response)
    return data['tests']


def GetTraces(test_url, test, out_dir):
    if not os.path.isdir(out_dir):
        os.mkdir(out_dir, 0755)
    response = urllib.urlopen(test_url)
    data = json.load(response)
    if data['statusCode'] == 200:
        for run in data['data']['runs']:
            for view in data['data']['runs'][run]:
                if data['data']['runs'][run][view]['rawData']['trace']:
                    trace_url = data['data']['runs'][run][view]['rawData']['trace']
                    local_file = os.path.join(os.path.realpath(out_dir), '{0}.{1}.{2}.trace.json.gz'.format(test, run, view))
                    urllib.urlretrieve(trace_url, local_file)

    return

########################################################################################################################
#   Main Entry Point
########################################################################################################################


def main(argv):
    if len(argv) != 2:
        print 'Downloads trace files for all of the runs in all of the tests in a WebPageTest bulk test'
        print 'Usage: python download-traces.py <WebPageTest test URL> <Output Directory>'
        print 'i.e.: python bulk-traces.py https://www.webpagetest.org/result/160229_8T_bf92565fcc52c58675c6c0688b1ce0fd/ traces'
        exit(1)

    bulk_url = argv[0]
    parsed = urlparse(bulk_url)
    json_url = parsed.scheme + '://' + parsed.netloc + '/jsonResult.php?basic=1&test='
    out_dir = argv[1]
    tests = GetTestIDs(bulk_url)
    index = 0
    count = len(tests)
    for test in tests:
        index += 1
        print "\r[{0:d}/{1:d}] - Downloading traces for test {2}".format(index, count, test),
        GetTraces(json_url + test, test, out_dir)
    print "\nDone."

if '__main__' == __name__:
    main(sys.argv[1:])
