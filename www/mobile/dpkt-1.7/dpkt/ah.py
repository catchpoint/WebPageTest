# $Id: ah.py 34 2007-01-28 07:54:20Z dugsong $

"""Authentication Header."""

import dpkt

class AH(dpkt.Packet):
    __hdr__ = (
        ('nxt', 'B', 0),
        ('len', 'B', 0),	# payload length
        ('rsvd', 'H', 0),
        ('spi', 'I', 0),
        ('seq', 'I', 0)
        )
    auth = ''
    def unpack(self, buf):
        dpkt.Packet.unpack(self, buf)
        self.auth = self.data[:self.len]
        buf = self.data[self.len:]
        import ip
        try:
            self.data = ip.IP.get_proto(self.nxt)(buf)
            setattr(self, self.data.__class__.__name__.lower(), self.data)
        except (KeyError, dpkt.UnpackError):
            self.data = buf

    def __len__(self):
        return self.__hdr_len__ + len(self.auth) + len(self.data)

    def __str__(self):
        return self.pack_hdr() + str(self.auth) + str(self.data)
