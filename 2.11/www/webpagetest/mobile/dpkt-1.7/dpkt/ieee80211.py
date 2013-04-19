# $Id: 80211.py 53 2008-12-18 01:22:57Z jon.oberheide $

"""IEEE 802.11."""

import dpkt

# Frame Types
MANAGEMENT          = 0
CONTROL             = 1
DATA                = 2

# Frame Sub-Types
M_ASSOC_REQ         = 0
M_ASSOC_RESP        = 1
M_REASSOC_REQ       = 2
M_REASSOC_RESP      = 3
M_PROBE_REQ         = 4
M_PROBE_RESP        = 5
C_PS_POLL           = 10
C_RTS               = 11
C_CTS               = 12
C_ACK               = 13
C_CF_END            = 14
C_CF_END_ACK        = 15
D_DATA              = 0
D_DATA_CF_ACK       = 1
D_DATA_CF_POLL      = 2
D_DATA_CF_ACK_POLL  = 3
D_NULL              = 4
D_CF_ACK            = 5
D_CF_POLL           = 6
D_CF_ACK_POLL       = 7

# Bitshifts for Frame Control
_VERSION_MASK       = 0x0300
_TYPE_MASK          = 0x0c00
_SUBTYPE_MASK       = 0xf000
_TO_DS_MASK         = 0x0001
_FROM_DS_MASK       = 0x0002
_MORE_FRAG_MASK     = 0x0004
_RETRY_MASK         = 0x0008
_PWR_MGT_MASK       = 0x0010
_MORE_DATA_MASK     = 0x0020
_WEP_MASK           = 0x0040
_ORDER_MASK         = 0x0080
_VERSION_SHIFT      = 8
_TYPE_SHIFT         = 10
_SUBTYPE_SHIFT      = 12
_TO_DS_SHIFT        = 0
_FROM_DS_SHIFT      = 1
_MORE_FRAG_SHIFT    = 2
_RETRY_SHIFT        = 3
_PWR_MGT_SHIFT      = 4
_MORE_DATA_SHIFT    = 5
_WEP_SHIFT          = 6
_ORDER_SHIFT        = 7

class IEEE80211(dpkt.Packet):
    __hdr__ = (
        ('framectl', 'H', 0),
        ('duration', 'H', 0)
        )

    def _get_version(self): return (self.framectl & _VERSION_MASK) >> _VERSION_SHIFT
    def _set_version(self, val): self.framectl = (val << _VERSION_SHIFT) | (self.framectl & ~_VERSION_MASK)
    def _get_type(self): return (self.framectl & _TYPE_MASK) >> _TYPE_SHIFT
    def _set_type(self, val): self.framectl = (val << _TYPE_SHIFT) | (self.framectl & ~_TYPE_MASK)
    def _get_subtype(self): return (self.framectl & _SUBTYPE_MASK) >> _SUBTYPE_SHIFT
    def _set_subtype(self, val): self.framectl = (val << _SUBTYPE_SHIFT) | (self.framectl & ~_SUBTYPE_MASK)
    def _get_to_ds(self): return (self.framectl & _TO_DS_MASK) >> _TO_DS_SHIFT
    def _set_to_ds(self, val): self.framectl = (val << _TO_DS_SHIFT) | (self.framectl & ~_TO_DS_MASK)
    def _get_from_ds(self): return (self.framectl & _FROM_DS_MASK) >> _FROM_DS_SHIFT
    def _set_from_ds(self, val): self.framectl = (val << _FROM_DS_SHIFT) | (self.framectl & ~_FROM_DS_MASK)
    def _get_more_frag(self): return (self.framectl & _MORE_FRAG_MASK) >> _MORE_FRAG_SHIFT
    def _set_more_frag(self, val): self.framectl = (val << _MORE_FRAG_SHIFT) | (self.framectl & ~_MORE_FRAG_MASK)
    def _get_retry(self): return (self.framectl & _RETRY_MASK) >> _RETRY_SHIFT
    def _set_retry(self, val): self.framectl = (val << _RETRY_SHIFT) | (self.framectl & ~_RETRY_MASK)
    def _get_pwr_mgt(self): return (self.framectl & _PWR_MGT_MASK) >> _PWR_MGT_SHIFT
    def _set_pwr_mgt(self, val): self.framectl = (val << _PWR_MGT_SHIFT) | (self.framectl & ~_PWR_MGT_MASK)
    def _get_more_data(self): return (self.framectl & _MORE_DATA_MASK) >> _MORE_DATA_SHIFT
    def _set_more_data(self, val): self.framectl = (val << _MORE_DATA_SHIFT) | (self.framectl & ~_MORE_DATA_MASK)
    def _get_wep(self): return (self.framectl & _WEP_MASK) >> _WEP_SHIFT
    def _set_wep(self, val): self.framectl = (val << _WEP_SHIFT) | (self.framectl & ~_WEP_MASK)
    def _get_order(self): return (self.framectl & _ORDER_MASK) >> _ORDER_SHIFT
    def _set_order(self, val): self.framectl = (val << _ORDER_SHIFT) | (self.framectl & ~_ORDER_MASK)

    version = property(_get_version, _set_version)
    type = property(_get_type, _set_type)
    subtype = property(_get_subtype, _set_subtype)
    to_ds = property(_get_to_ds, _set_to_ds)
    from_ds = property(_get_from_ds, _set_from_ds)
    more_frag = property(_get_more_frag, _set_more_frag)
    retry = property(_get_retry, _set_retry)
    pwr_mgt = property(_get_pwr_mgt, _set_pwr_mgt)
    more_data = property(_get_more_data, _set_more_data)
    wep = property(_get_wep, _set_wep)
    order = property(_get_order, _set_order)

    def unpack(self, buf):
        dpkt.Packet.unpack(self, buf)
        self.data = buf[self.__hdr_len__:]

        if self.type == CONTROL:
            if self.subtype == C_RTS:
                self.data = self.rts = self.RTS(self.data)
            if self.subtype == C_CTS:
                self.data = self.cts = self.CTS(self.data)
            if self.subtype == C_ACK:
                self.data = self.ack = self.ACK(self.data)

    class RTS(dpkt.Packet):
        __hdr__ = (
            ('dst', '6s', '\x00' * 6),
            ('src', '6s', '\x00' * 6)
            )

    class CTS(dpkt.Packet):
        __hdr__ = (
            ('dst', '6s', '\x00' * 6),
            )

    class ACK(dpkt.Packet):
        __hdr__ = (
            ('dst', '6s', '\x00' * 6),
            )

if __name__ == '__main__':
    import unittest
    
    class IEEE80211TestCase(unittest.TestCase):
        def test_802211(self):
            s = '\xd4\x00\x00\x00\x00\x12\xf0\xb6\x1c\xa4'
            ieee = IEEE80211(s)
            self.failUnless(str(ieee) == s)
            self.failUnless(ieee.version == 0)
            self.failUnless(ieee.type == CONTROL)
            self.failUnless(ieee.subtype == C_ACK)
            self.failUnless(ieee.to_ds == 0)
            self.failUnless(ieee.from_ds == 0)
            self.failUnless(ieee.pwr_mgt == 0)
            self.failUnless(ieee.more_data == 0)
            self.failUnless(ieee.wep == 0)
            self.failUnless(ieee.order == 0)
            self.failUnless(ieee.ack.dst == '\x00\x12\xf0\xb6\x1c\xa4')

    unittest.main()
