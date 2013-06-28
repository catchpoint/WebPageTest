import cgi
import http
import urlparse
from dpkt import http as dpkt_http

class Request(http.Message):
  '''
  HTTP request. Parses higher-level info out of dpkt.http.Request
  Members:
  * query: Query string name-value pairs. {string: [string]}
  * host: hostname of server.
  * fullurl: Full URL, with all components.
  * url: Full URL, but without fragments. (that's what HAR wants)
  '''
  def __init__(self, tcpdir, pointer):
    http.Message.__init__(self, tcpdir, pointer, dpkt_http.Request)
    # get query string. its the URL after the first '?'
    uri = urlparse.urlparse(self.msg.uri)
    self.host = self.msg.headers['host'] if 'host' in self.msg.headers else ''
    fullurl = urlparse.ParseResult('http', self.host, uri.path, uri.params,
                                   uri.query, uri.fragment)
    self.fullurl = fullurl.geturl()
    self.url, frag = urlparse.urldefrag(self.fullurl)
    self.query = cgi.parse_qs(uri.query)

  def json_repr(self):
    '''
    self = http.Request
    '''
    return {
      'method': self.msg.method,
      'url': self.url,
      'httpVersion': self.msg.version,
      'cookies': [],
      'queryString': http.query_json_repr(self.query),
      'headersSize': -1,
      'headers': http.header_json_repr(self.msg.headers),
      'bodySize': len(self.msg.body),
    }
