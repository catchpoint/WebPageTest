# $Id: sip.py 48 2008-05-27 17:31:15Z yardley $

"""Session Initiation Protocol."""

import http

class Request(http.Request):
    """SIP request."""
    __hdr_defaults__ = {
        'method':'INVITE',
        'uri':'sip:user@example.com',
        'version':'2.0',
        'headers':{ 'To':'', 'From':'', 'Call-ID':'', 'CSeq':'', 'Contact':'' }
        }
    __methods = dict.fromkeys((
        'ACK', 'BYE', 'CANCEL', 'INFO', 'INVITE', 'MESSAGE', 'NOTIFY',
        'OPTIONS', 'PRACK', 'PUBLISH', 'REFER', 'REGISTER', 'SUBSCRIBE',
        'UPDATE'
        ))
    __proto = 'SIP'

class Response(http.Response):
    """SIP response."""
    __hdr_defaults__ = {
        'version':'2.0',
        'status':'200',
        'reason':'OK',
        'headers':{ 'To':'', 'From':'', 'Call-ID':'', 'CSeq':'', 'Contact':'' }
        }
    __proto = 'SIP'

        
