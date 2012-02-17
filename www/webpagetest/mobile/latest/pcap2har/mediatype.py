import re

class MediaType(object):
    '''
    This class parses a media-type string as is found in HTTP headers (possibly
    with params), and exposes the important information in an intuitive interface

    Members:
    * type: string, the main mime type
    * subtype: string, the mime subtype
    * params: {string: string}. Maybe should be {string: [string]}?
    '''
    # RE for parsing media types. type and subtype are alpha-numeric strings
    # possibly with '-'s. Then the optional parameter list: names are same type
    # of string as the types above, values are pretty much anything but another
    # semicolon
    mediatype_re = re.compile(
        r'^([\w\-+.]+)/([\w\-+.]+)((?:\s*;\s*[\w\-]+=[^;]+)*)\s*$'
    )
    # RE for parsing name-value pairs
    nvpair_re = re.compile(r'^\s*([\w\-]+)=([^;\s]+)\s*$')
    # constructor
    def __init__(self, data):
        '''
        Args:
        data = string, the media type string
        '''
        match = self.mediatype_re.match(data)
        if match:
            # get type/subtype
            self.type = match.group(1).lower()
            self.subtype= match.group(2).lower()
            # params
            self.params = {}
            param_str = match.group(3) # we know this is well-formed, except for extra whitespace
            for pair in param_str.split(';'):
                pair = pair.strip()
                if pair:
                    pairmatch = self.nvpair_re.match(pair)
                    if not pairmatch: raise Exception('MediaType.__init__: invalid pair: "' + pair + '"')
                    self.params[pairmatch.group(1)] = pairmatch.group(2)
            pass
        else:
            raise ValueError('invalid media type string: ' + data)
    def mimeType(self):
        return '%s/%s' % (self.type, self.subtype)
    def __str__(self):
        result = self.mimeType()
        for n,v in self.params.iteritems():
            result += '; %s=%s' % (n, v)
        return result
    def __repr__(self):
        return 'MediaType(%s)' % self.__str__()


# test mimetype parsing
if __name__ == '__main__':
    m = MediaType('application/rdf+xml ;charset=ISO-5591-1   ;foo=bar ')
    print m.mimeType()
    print m.params['charset']
    print m.params['foo']
    m = MediaType('image/vnd.microsoft.icon')
    print m.mimeType()
