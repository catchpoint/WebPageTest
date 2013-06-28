# $Id: ntp.py 48 2008-05-27 17:31:15Z yardley $

"""Network Time Protocol."""

import dpkt

# NTP v4

# Leap Indicator (LI) Codes
NO_WARNING		= 0
LAST_MINUTE_61_SECONDS	= 1
LAST_MINUTE_59_SECONDS	= 2
ALARM_CONDITION		= 3

# Mode Codes
RESERVED		= 0
SYMMETRIC_ACTIVE	= 1
SYMMETRIC_PASSIVE	= 2
CLIENT			= 3
SERVER			= 4
BROADCAST		= 5
CONTROL_MESSAGE		= 6
PRIVATE			= 7

class NTP(dpkt.Packet):
    __hdr__ = (
        ('flags', 'B', 0),
        ('stratum', 'B', 0),
        ('interval', 'B', 0),
        ('precision', 'B', 0),
        ('delay', 'I', 0),
        ('dispersion', 'I', 0),
        ('id', '4s', 0),
        ('update_time', '8s', 0),
        ('originate_time', '8s', 0),
        ('receive_time', '8s', 0),
        ('transmit_time', '8s', 0)
        )

    def _get_v(self):
        return (self.flags >> 3) & 0x7
    def _set_v(self, v):
        self.flags = (self.flags & ~0x38) | ((v & 0x7) << 3)
    v = property(_get_v, _set_v)

    def _get_li(self):
        return (self.flags >> 6) & 0x3
    def _set_li(self, li):
        self.flags = (self.flags & ~0xc0) | ((li & 0x3) << 6)
    li = property(_get_li, _set_li)
    
    def _get_mode(self):
        return (self.flags & 0x7)
    def _set_mode(self, mode):
        self.flags = (self.flags & ~0x7) | (mode & 0x7)
    mode = property(_get_mode, _set_mode)

if __name__ == '__main__':
    import unittest

    class NTPTestCase(unittest.TestCase):
        def testPack(self):
            n = NTP(self.s)
            self.failUnless(self.s == str(n))

        def testUnpack(self):
            n = NTP(self.s)
            self.failUnless(n.li == NO_WARNING)
            self.failUnless(n.v == 4)
            self.failUnless(n.mode == SERVER)
            self.failUnless(n.stratum == 2)
            self.failUnless(n.id == '\xc1\x02\x04\x02')

            # test get/set functions
            n.li = ALARM_CONDITION
            n.v = 3
            n.mode = CLIENT
            self.failUnless(n.li == ALARM_CONDITION)
            self.failUnless(n.v == 3)
            self.failUnless(n.mode == CLIENT)

        s = '\x24\x02\x04\xef\x00\x00\x00\x84\x00\x00\x33\x27\xc1\x02\x04\x02\xc8\x90\xec\x11\x22\xae\x07\xe5\xc8\x90\xf9\xd9\xc0\x7e\x8c\xcd\xc8\x90\xf9\xd9\xda\xc5\xb0\x78\xc8\x90\xf9\xd9\xda\xc6\x8a\x93'
    unittest.main()
