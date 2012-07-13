# $Id: tns.py 23 2006-11-08 15:45:33Z dugsong $

"""Transparent Network Substrate."""

import dpkt

class TNS(dpkt.Packet):
    __hdr__ = (
    ('length', 'H', 0),
    ('pktsum', 'H', 0),
    ('type', 'B', 0),
    ('rsvd', 'B', 0),
    ('hdrsum', 'H', 0),
    ('msg', '0s', ''),
    )
    def unpack(self, buf):
        dpkt.Packet.unpack(self, buf)
        n = self.length - self.__hdr_len__
        if n > len(self.data):
            raise dpkt.NeedData('short message (missing %d bytes)' %
                                (n - len(self.data)))
        self.msg = self.data[:n]
        self.data = self.data[n:]

