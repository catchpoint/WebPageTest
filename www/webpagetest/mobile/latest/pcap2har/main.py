#!/usr/bin/python

'''
Main program that converts pcaps to HAR's.
'''

import os
import optparse
import logging
import sys
import json

from pcap2har import pcap
from pcap2har import http
from pcap2har import httpsession
from pcap2har import har
from pcap2har import tcp
from pcap2har import settings
from pcap2har.packetdispatcher import PacketDispatcher

# get cmdline args/options
parser = optparse.OptionParser(
    usage='usage: %prog inputfile outputfile'
)
parser.add_option('--allow_trailing_semicolon', action="store_true",
                  dest="allow_trailing_semicolon", default=False)
parser.add_option('--allow_empty_mediatype', action="store_true",
                  dest="allow_empty_mediatype", default=False)
parser.add_option('--no-pages', action="store_false", dest="pages", default=True)
parser.add_option('--pad_missing_tcp_data', action="store_true",
                  dest="pad_missing_tcp_data", default=False)
options, args = parser.parse_args()

# copy options to settings module
settings.process_pages = options.pages
settings.pad_missing_tcp_data = options.pad_missing_tcp_data
settings.allow_trailing_semicolon = options.allow_trailing_semicolon
settings.allow_empty_mediatype = options.allow_empty_mediatype

# setup logs
logging.basicConfig(filename='pcap2har.log', level=logging.INFO)

# get filenames, or bail out with usage error
if len(args) == 2:
    inputfile, outputfile = args[0:2]
elif len(args) == 1:
    inputfile = args[0]
    outputfile = inputfile+'.har'
else:
    parser.print_help()
    sys.exit()

logging.info("Processing %s", inputfile)

# parse pcap file
dispatcher = PacketDispatcher()
pcap.ParsePcap(dispatcher, filename=inputfile)
dispatcher.finish()

# parse HAR stuff
session = httpsession.HttpSession(dispatcher)

logging.info("Flows=%d. HTTP pairs=%d" % (len(session.flows),len(session.entries)))

#write the HAR file
with open(outputfile, 'w') as f:
    json.dump(session, f, cls=har.JsonReprEncoder, indent=2, encoding='utf8', sort_keys=True)
