# $Id: stun.py 47 2008-05-27 02:10:00Z jon.oberheide $

"""Simple Traversal of UDP through NAT."""

import struct
import dpkt

# STUN - RFC 3489
# http://tools.ietf.org/html/rfc3489
# Each packet has a 20 byte header followed by 0 or more attribute TLVs.

# Message Types
BINDING_REQUEST			= 0x0001
BINDING_RESPONSE		= 0x0101
BINDING_ERROR_RESPONSE		= 0x0111
SHARED_SECRET_REQUEST		= 0x0002
SHARED_SECRET_RESPONSE		= 0x0102
SHARED_SECRET_ERROR_RESPONSE	= 0x0112

# Message Attributes
MAPPED_ADDRESS			= 0x0001
RESPONSE_ADDRESS		= 0x0002
CHANGE_REQUEST			= 0x0003
SOURCE_ADDRESS			= 0x0004
CHANGED_ADDRESS			= 0x0005
USERNAME			= 0x0006
PASSWORD			= 0x0007
MESSAGE_INTEGRITY		= 0x0008
ERROR_CODE			= 0x0009
UNKNOWN_ATTRIBUTES		= 0x000a
REFLECTED_FROM			= 0x000b

class STUN(dpkt.Packet):
    __hdr__ = (
        ('type', 'H', 0),
        ('len', 'H', 0),
        ('xid', '16s', 0)
        )

def tlv(buf):
    n = 4
    t, l = struct.unpack('>HH', buf[:n])
    v = buf[n:n+l]
    buf = buf[n+l:]
    return (t,l,v, buf)
