#!/usr/bin/python2.6
#
# Copyright 2010 Google Inc. All Rights Reserved.

"""The script running one-off WebPageTest bulk testing.

This script makes use of the APIs in wpt_batch_lib.py to perform bulk
WebPageTest testing. Please vist http://code.google.com/p/webpagetest/source/browse/wiki/InstructionCommandlineTool.wiki for a detailed instrunction on how to use it.

Usage:
  wpt_batch.py -s the_url_of_your_wpt_server -i a/b/urls.txt -f c/d/result

  The script will perform WebPageTest for each URL in a/b/urls.txt on the
  given WebPageTest server and save the result in XML format into c/d/result
  directory. The resulting XML file is named as URL.test_id.xml. For more
  options to configure your tests, please type "wpt_batch.py -h".

Notice:
  The public instance of WebPageTest server (i.e., http://www.webpagetest.org/)
  is not allowed for the batch processing by default for security reason. This
  tool is intented for your own WebPageTest intance. If you really want to run
  it on public instance, please email to pmeenan@gmail.com to request an API
  key.
"""

__author__ = 'zhaoq@google.com (Qi Zhao)'

import logging
import optparse
import os
import time

import wpt_batch_lib


def BuildFileName(url):
  """Construct the file name from a given URL.

  Args:
    url: the given URL

  Returns:
    filename: the constructed file name
  """
  filename = url.strip('\r\n\t \\/')
  filename = filename.replace('http://', '')
  filename = filename.replace(':', '_')
  filename = filename.replace('/', '_')
  filename = filename.replace('\\', '_')
  filename = filename.replace('%', '_')
  return filename


def SaveTestResult(output_dir, url, test_id, content):
  """Save the result of a test into a file on disk.

  Args:
    output_dir: the directory to save the result
    url: the associated URL
    test_id: the ID of the test
    content: the string of test result

  Returns:
    None
  """
  filename = BuildFileName(url)
  filename = '%s/%s.%s.xml' % (output_dir.rstrip('/'), filename, test_id)
  output = open(filename, 'wb')
  output.write(content)
  output.close()


def RunBatch(options):
  """Run one-off batch processing of WebpageTest testing."""

  test_params = {'f': 'xml',
                 'private': 1,
                 'priority': 6,
                 'video': options.video,
                 'fvonly': options.fvonly,
                 'runs': options.runs,
                 'location': options.location,
                 'mv': options.mv
                }
  if options.connectivity == 'custom':
    test_params['bwOut'] = options.bwup
    test_params['bwIn'] = options.bwdown
    test_params['latency'] = options.latency
    test_params['plr'] = options.plr
    test_params['location'] = options.location + '.custom'
  else:
    test_params['location'] = options.location + '.' + options.connectivity

  if options.tcpdump:
    test_params['tcpdump'] = options.tcpdump
  if options.script:
    test_params['script'] = open(options.script, 'rb').read()
  if options.key:
    test_params['k'] = options.key

  requested_urls = wpt_batch_lib.ImportUrls(options.urlfile)
  id_url_dict = wpt_batch_lib.SubmitBatch(requested_urls, test_params,
                                          options.server)

  submitted_urls = set(id_url_dict.values())
  for url in requested_urls:
    if url not in submitted_urls:
      logging.warn('URL submission failed: %s', url)

  pending_test_ids = id_url_dict.keys()
  if not os.path.isdir(options.outputdir):
    os.mkdir(options.outputdir)
  while pending_test_ids:
    # TODO(zhaoq): add an expiring mechanism so that if some tests are stuck
    # too long they will reported as permanent errors and while loop will be
    # terminated.

    id_status_dict = wpt_batch_lib.CheckBatchStatus(pending_test_ids,
                                                    server_url=options.server)
    completed_test_ids = []
    for test_id, test_status in id_status_dict.iteritems():
      # We could get 4 different status codes with different meanings as
      # as follows:
      # 1XX: Test in progress
      # 200: Test complete
      # 4XX: Test request not found
      if int(test_status) >= 200:
        pending_test_ids.remove(test_id)
        if test_status == '200':
          completed_test_ids.append(test_id)
        else:
          logging.warn('Tests failed with status $s: %s', test_status, test_id)
    test_results = wpt_batch_lib.GetXMLResult(completed_test_ids,
                                              server_url=options.server)
    result_test_ids = set(test_results.keys())
    for test_id in completed_test_ids:
      if test_id not in result_test_ids:
        logging.warn('The XML failed to retrieve: %s', test_id)

    for test_id, dom in test_results.iteritems():
      SaveTestResult(options.outputdir, id_url_dict[test_id], test_id,
                     dom.toxml('utf-8'))
    if pending_test_ids:
      time.sleep(int(options.runs) * 10)


def main():
  class PlainHelpFormatter(optparse.IndentedHelpFormatter):
    def format_description(self, description):
      if description:
        return description + '\n'
      else:
        return ''

  option_parser = optparse.OptionParser(
      usage='%prog [options]',
      formatter=PlainHelpFormatter(),
      description='')

  # Environment settings
  option_parser.add_option('-s', '--server', action='store',
                           default='http://your_wpt_site/',
                           help='the wpt server URL')
  option_parser.add_option('-i', '--urlfile', action='store',
                           default='./urls.txt', help='input URL file')
  option_parser.add_option('-f', '--outputdir', action='store',
                           default='./result', help='output directory')

  # Test parameter settings
  help_txt = 'set the connectivity to pre-defined type: '
  help_txt += 'Cable, DSL, Dial, 3G, Fios and custom (case sensitive). '
  help_txt += 'When it is custom, you can set the customized connectivity '
  help_txt += 'using options -u/d/l/p.'
  option_parser.add_option('-k', '--key', action='store', default='',
                           help='API Key')
  option_parser.add_option('-y', '--connectivity', action='store',
                           default='Cable', help=help_txt)
  option_parser.add_option('-u', '--bwup', action='store', default=384,
                           help='upload bandwidth of the test')
  option_parser.add_option('-d', '--bwdown', action='store', default=1500,
                           help='download bandwidth of the test')
  option_parser.add_option('-l', '--latency', action='store', default=50,
                           help='rtt of the test')
  option_parser.add_option('-p', '--plr', action='store', default=0,
                           help='packet loss rate of the test')
  option_parser.add_option('-v', '--fvonly', action='store', default=1,
                           help='first view only')
  option_parser.add_option('-t', '--tcpdump', action='store_true',
                           help='enable tcpdump')
  option_parser.add_option('-c', '--script', action='store',
                           help='hosted script file')
  option_parser.add_option('-a', '--video', action='store', default=0,
                           help='capture video')
  option_parser.add_option('-r', '--runs', action='store', default=9,
                           help='the number of runs per test')
  option_parser.add_option('-o', '--location', action='store',
                           default='Test', help='test location')
  option_parser.add_option('-m', '--mv', action='store', default=1,
                           help='video only saved for the median run')

  options, args = option_parser.parse_args()

  RunBatch(options)

if __name__ == '__main__':
  main()
