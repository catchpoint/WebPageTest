# $Id: vrrp.py 23 2006-11-08 15:45:33Z dugsong $

"""Virtual Router Redundancy Protocol."""

import dpkt

class VRRP(dpkt.Packet):
    __hdr__ = (
        ('vtype', 'B', 0x21),
        ('vrid', 'B', 0),
        ('priority', 'B', 0),
        ('count', 'B', 0),
        ('atype', 'B', 0),
        ('advtime', 'B', 0),
        ('sum', 'H', 0),
        )
    addrs = ()
    auth = ''
    def _get_v(self):
        return self.vtype >> 4
    def _set_v(self, v):
        self.vtype = (self.vtype & ~0xf) | (v << 4)
    v = property(_get_v, _set_v)

    def _get_type(self):
        return self.vtype & 0xf
    def _set_type(self, v):
        self.vtype = (self.vtype & ~0xf0) | (v & 0xf)
    type = property(_get_v, _set_v)
    
    def unpack(self, buf):
        dpkt.Packet.unpack(self, buf)
        l = []
        for off in range(0, 4 * self.count, 4):
            l.append(self.data[off:off+4])
        self.addrs = l
        self.auth = self.data[off+4:]
        self.data = ''

    def __len__(self):
        return self.__hdr_len__ + (4 * self.count) + len(self.auth)

    def __str__(self):
        data = ''.join(self.addrs) + self.auth
        if not self.sum:
            self.sum = dpkt.in_cksum(self.pack_hdr() + data)
        return self.pack_hdr() + data
