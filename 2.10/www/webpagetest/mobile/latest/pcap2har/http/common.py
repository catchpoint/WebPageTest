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
