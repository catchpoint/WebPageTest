import gzip
import zlib
import cStringIO
import dpkt_http_replacement as dpkt_http
import http
from mediatype import MediaType
import logging as log
#from http import DecodingError # exception class from parent module
from base64 import encodestring as b64encode

# try to import UnicodeDammit from BeautifulSoup
# otherwise, set the name to None
try:
    from BeautifulSoup import UnicodeDammit
except ImportError:
    UnicodeDammit = None

class Response(http.Message):
    '''
    HTTP response.
    Members:
    * mediaType: mediatype.MediaType, constructed from content-type
    * mimeType: string mime type of returned data
    * body: http decoded body data, otherwise unmodified
    * text: body text, unicoded if possible, otherwise base64 encoded
    * encoding: 'base64' if self.text is base64 encoded binary data, else None
    * compression: string, compression type
    * original_encoding: string, original text encoding/charset/whatever
    '''
    def __init__(self, tcpdir, pointer):
        http.Message.__init__(self, tcpdir, pointer, dpkt_http.Response)
        # uncompress body if necessary
        self.handle_compression()
        # get mime type
        if 'content-type' in self.msg.headers:
            self.mediaType = MediaType(self.msg.headers['content-type'])
        else:
            self.mediaType = MediaType('application/x-unknown-content-type')
        self.mimeType = self.mediaType.mimeType()
        # try to get out unicode
        self.handle_text()
    def handle_compression(self):
        '''
        Sets self.body to the http decoded response data. Sets compression to
        the name of the compresson type.
        '''
        # if content-encoding is found
        if 'content-encoding' in self.msg.headers:
            encoding = self.msg.headers['content-encoding'].lower()
            self.compression = encoding
            # handle gzip
            if encoding == 'gzip' or encoding == 'x-gzip':
                try:
                    gzipfile = gzip.GzipFile(
                        fileobj = cStringIO.StringIO(self.raw_body)
                    )
                    self.body = gzipfile.read()
                except zlib.error:
                    raise http.DecodingError('zlib failed to gunzip HTTP data')
                except:
                    # who knows what else it might raise
                    raise http.DecodingError("failed to gunzip HTTP data, don't know why")
            # handle deflate
            elif encoding == 'deflate':
                try:
                    # NOTE: wbits = -15 is a undocumented feature in python (it's
                    # documented in zlib) that gets rid of the header so we can
                    # do raw deflate. See: http://bugs.python.org/issue5784
                    self.body = zlib.decompress(self.raw_body, -15)
                except zlib.error:
                    raise http.DecodingError('zlib failed to undeflate HTTP data')
            elif encoding == 'compress' or encoding == 'x-compress':
                # apparently nobody uses this, so basically just ignore it
                self.body = self.raw_body
            elif encoding == 'identity':
                # no compression
                self.body = self.raw_body
            else:
                # I'm pretty sure the above are the only allowed encoding types
                # see RFC 2616 sec 3.5 (http://www.w3.org/Protocols/rfc2616/rfc2616-sec3.html#sec3.5)
                raise http.DecodingError('unknown content-encoding token: ' + encoding)
        else:
            # no compression
            self.compression = 'identity'
            self.body = self.raw_body

    def handle_text(self):
        '''
        Takes care of converting body text to unicode, if its text at all.
        Sets self.original_encoding to original char encoding, and converts body
        to unicode if possible. Must come after handle_compression, and after
        self.mediaType is valid.
        '''
        self.text = None
        self.encoding = None
        # if the body is text
        if (self.mediaType and
            (self.mediaType.type == 'text' or
                (self.mediaType.type == 'application' and
                 'xml' in self.mediaType.subtype))):
            # if there was a charset parameter in HTTP header, store it
            if 'charset' in self.mediaType.params:
                override_encodings = [self.mediaType.params['charset']]
            else:
                override_encodings = []
            # if there even is data (otherwise, dammit.originalEncoding might be None)
            if self.body != '':
                if UnicodeDammit:
                    # honestly, I don't mind not abiding by RFC 2023. UnicodeDammit just
                    # does what makes sense, and if the content is remotely standards-
                    # compliant, it will do the right thing.
                    dammit = UnicodeDammit(self.body, override_encodings)
                    # if unicode was found
                    if dammit.unicode:
                        self.text = dammit.unicode
                        self.originalEncoding = dammit.originalEncoding
                    else:
                        # unicode could not be decoded, at all
                        # HAR can't write data, but body might still be useful as-is
                        pass
                else:
                    # try the braindead version, just guess content-type or utf-8
                    u = None
                    # try our list of encodings + utf8 with strict errors
                    for e in override_encodings + ['utf8', 'iso-8859-1']:
                        try:
                            u = self.body.decode(e, 'strict')
                            self.originalEncoding = e
                            break # if ^^ didn't throw, we're done
                        except UnicodeError:
                            pass
                    # if none of those worked, try utf8 with 'replace' error mode
                    if not u:
                        # unicode has failed
                        u = self.body.decode('utf8', 'replace')
                        self.originalEncoding = None # ???
                    self.text = u or None
        else:
            # body is not text
            # base64 encode it and set self.encoding
            # TODO: check with list that this is right
            self.text = b64encode(self.body)
            self.encoding = 'base64'
