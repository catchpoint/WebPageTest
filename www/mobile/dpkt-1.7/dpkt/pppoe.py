# $Id: pppoe.py 23 2006-11-08 15:45:33Z dugsong $

"""PPP-over-Ethernet."""

import dpkt, ppp

# RFC 2516 codes
PPPoE_PADI	= 0x09
PPPoE_PADO	= 0x07
PPPoE_PADR	= 0x19
PPPoE_PADS	= 0x65
PPPoE_PADT	= 0xA7
PPPoE_SESSION	= 0x00

class PPPoE(dpkt.Packet):
    __hdr__ = (
        ('v_type', 'B', 0x11),
        ('code', 'B', 0),
        ('session', 'H', 0),
        ('len', 'H', 0)		# payload length
        )
    def _get_v(self): return self.v_type >> 4
    def _set_v(self, v): self.v_type = (v << 4) | (self.v_type & 0xf)
    v = property(_get_v, _set_v)

    def _get_type(self): return self.v_type & 0xf
    def _set_type(self, t): self.v_type = (self.v_type & 0xf0) | t
    type = property(_get_type, _set_type)

    def unpack(self, buf):
        dpkt.Packet.unpack(self, buf)
        try:
            if self.code == 0:
                self.data = self.ppp = ppp.PPP(self.data)
        except dpkt.UnpackError:
            pass
        
# XXX - TODO TLVs, etc.
