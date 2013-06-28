from message import Message
from request import Request
from response import Response
from flow import Flow

class Error(Exception):
    '''
    Raised when HTTP cannot be parsed from the given data.
    '''
    pass

class DecodingError(Error):
    '''
    Raised when encoded HTTP data cannot be decompressed/decoded/whatever.
    '''
    pass

def header_json_repr(headers):
  """json_repr for HTTP header dicts"""
  return [
    {
      'name': k,
      'value':v if not type(v) is list else reduce(lambda x, y:x+y, v)
    } for k, v in headers.iteritems()
  ]

def query_json_repr(query):
  """json_repr for query dicts"""
  output = []
  for k, l in query.iteritems():
    for v in l:
      output.append({
        'name': k,
        'value': v
      })
  return output
