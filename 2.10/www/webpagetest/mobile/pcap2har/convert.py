#!/usr/bin/python

'''
Main program that converts pcaps to HAR's.
'''

import pcap
import logging
import http
import httpsession
import har
import simplejson as json

class Options:
  """'
  Convert options
  """
  def __init__(self):
    """
    Construct default convert options
    """
    self.dns = None #  Will be created when paring pcap.
    self.remove_cookies = True

def convert(pcap_in, har_out, options):
  flows = pcap.TCPFlowsFromString(pcap_in, options)

  # generate HTTP Flows
  httpflows = []
  flow_count = 0
  for flow in sorted(flows.flowdict.itervalues(),
                     cmp=lambda x,y: cmp(x.start(), y.start())):
    try:
      httpflows.append(http.Flow(flow))
      flow_count += 1
    except http.Error, error:
      logging.warning(error)
    except Exception, error:
      logging.warning(error)

  pairs = reduce(lambda x, y: x+y.pairs, httpflows, [])
  logging.info("Flow=%d HTTP=%d", flow_count, len(pairs))

  # parse HAR stuff
  session = httpsession.HTTPSession(pairs)

  json.dump(session, har_out, cls=har.JsonReprEncoder, indent=2,
            encoding='utf8')
