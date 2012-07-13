# $Id: aim.py 23 2006-11-08 15:45:33Z dugsong $

"""AOL Instant Messenger."""

import dpkt
import struct

# OSCAR: http://iserverd1.khstu.ru/oscar/

class FLAP(dpkt.Packet):
    __hdr__ = (
        ('ast', 'B', 0x2a),	# '*'
        ('type', 'B', 0),
        ('seq', 'H', 0),
        ('len', 'H', 0)
    )
    def unpack(self, buf):
        dpkt.Packet.unpack(self, buf)
        if self.ast != 0x2a:
            raise dpkt.UnpackError('invalid FLAP header')
        if len(self.data) < self.len:
            raise dpkt.NeedData, '%d left, %d needed' % (len(self.data), self.len)

class SNAC(dpkt.Packet):
    __hdr__ = (
        ('family', 'H', 0),
        ('subtype', 'H', 0),
        ('flags', 'H', 0),
        ('reqid', 'I', 0)
        )

def tlv(buf):
    n = 4
    try:
        t, l = struct.unpack('>HH', buf[:n])
    except struct.error:
        raise dpkt.UnpackError
    v = buf[n:n+l]
    if len(v) < l:
        raise dpkt.NeedData
    buf = buf[n+l:]
    return (t,l,v, buf)

# TOC 1.0: http://jamwt.com/Py-TOC/PROTOCOL

# TOC 2.0: http://www.firestuff.org/projects/firetalk/doc/toc2.txt

