import dpkt
import http
import logging
from http import Request, Response

class Flow:
  '''
  Parses a TCPFlow into HTTP request/response pairs. Or not, depending on the
  integrity of the flow. After __init__, self.pairs contains a list of
  MessagePair's. Requests are paired up with the first response that occured
  after them which has not already been paired with a previous request.
  Responses that don't match up with a request are ignored. Requests with no
  response are paired with None.

  Members:
  pairs = [MessagePair], where ei
  '''
  def __init__(self, tcpflow):
    '''
    tcpflow = tcp.Flow
    '''
    dns = tcpflow.options.dns
    remove_cookies = tcpflow.options.remove_cookies
    # try parsing it with forward as request dir
    success, requests, responses = parse_streams(tcpflow.fwd, tcpflow.rev)
    if not success:
      success, requests, responses = parse_streams(tcpflow.rev, tcpflow.fwd)
      if not success:
        # flow is not HTTP
        raise Exception('TCP Flow does not contain HTTP')
    # match up requests with nearest response that occured after them, first
    # request is the benchmark; responses before that are irrelevant for now
    self.pairs = []
    try:
      # find the first response to a request we know about, that is, the first
      # response after the first request
      first_response_index = find_index(
          lambda response: response.ts_start > requests[0].ts_start, responses)
      # these are responses that match up with our requests
      pairable_responses = responses[first_response_index:]
      if len(requests) > len(pairable_responses):
        # pad responses with None
        pairable_responses.extend(
            [None for dummy in range(len(requests) - len(pairable_responses))])
      # if there are more responses, we would just ignore them anyway, which
      # zip does for us create MessagePair's
      connected = False
      for req, resp in zip(requests, responses):
        if not req:
          logging.warning("Request is missing.")
          continue
        if not connected:
          if tcpflow.packets[0].flags != dpkt.tcp.TH_SYN:
            logging.warning("First packet is not SYN.")
          connect_ts = tcpflow.packets[0].ts
          req.ts_connect = connect_ts
          req.dns_start_ts = dns.dns_time_of_connect_to_host(req.host,
                                                             connect_ts)
          connected = True
        else:
          req.ts_connect = req.ts_start
          req.dns_start_ts = -1
        if remove_cookies:
          for cookie_str in ('cookie', 'set-cookie'):
            for msg in (req.msg, resp.msg):
              if cookie_str in msg.headers:
                cookie = msg.headers[cookie_str]
                if type(cookie) is list:
                  for idx in range(len(cookie)):
                    size = len(msg.headers[cookie_str][idx])
                    msg.headers[cookie_str][idx] = '*'.center(size, '*')
                else:
                  size = len(msg.headers[cookie_str])
                  msg.headers[cookie_str] = '*'.center(size, '*')
        self.pairs.append(MessagePair(req, resp))
    except LookupError:
      # there were no responses after the first request
      # there's nothing we can do
      logging.warning("Request has no reponse.")

class MessagePair:
  '''
  An HTTP Request/Response pair/transaction/whatever. Loosely corresponds to
  a HAR entry.
  '''
  def __init__(self, request, response):
    self.request = request
    self.response = response

def gather_messages(MessageClass, tcpdir):
  '''
  Attempts to construct a series of MessageClass objects from the data. The
  basic idea comes from pyper's function, HTTPFlow.analyze.gather_messages.
  Args:
  MessageClass = class, Request or Response
  tcpdir = TCPDirection, from which will be extracted the data
  Returns:
  [MessageClass]

  If the first message fails to construct, the flow is considered to be
  invalid. After that, all messages are stored and returned. The end of the
  data or an invalid message. This is designed to handle partially valid HTTP
  flows semi-gracefully: if the flow is bad, the application probably bailed
  on it after that anyway.
  '''
  messages = [] # [MessageClass]
  pointer = 0 # starting index of data that MessageClass should look at
  # while there's data left
  while pointer < len(tcpdir.data):
    try:
      msg = MessageClass(tcpdir, pointer)
    except dpkt.Error, error: # if the message failed
      if pointer == 0: # if this is the first message
        logging.warning("Invalid http -- raise exception")
        raise http.Error('Invalid http: %s' % error)
      else: # we're done parsing messages
        logging.warning("We got a dpkt.Error %s, but we are done." % error)
        break # out of the loop
    except:
      logging.error("Unkown error.")
      raise
    # ok, all good
    messages.append(msg)
    pointer += msg.data_consumed
  return messages

def parse_streams(request_stream, response_stream):
  '''
  attempts to construct http.Request/Response's from the corresponding
  passed streams. Failure may either mean that the streams are malformed or
  they are simply switched
  Args:
  request_stream, response_stream = TCPDirection
  Returns:
  True or False, whether parsing succeeded
  request list or None
  response list or None
  '''
  try:
    requests = gather_messages(Request, request_stream)
    responses = gather_messages(Response, response_stream)
  except dpkt.UnpackError, error:
    logging.warning(error)
    return False, None, None
  except:
    logging.warning("Unkown error")
    return False, None, None
  else:
    return True, requests, responses

def find_index(predicate, seq):
  '''
  returns the index of the first item in seq for which predicate f returns
  True. If no matching item is found, LookupError is raised.
  '''
  for i, item in enumerate(seq):
    if predicate(item):
      return i
  raise LookupError('no item found that matched the predicate')
