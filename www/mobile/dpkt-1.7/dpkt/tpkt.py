# $Id: tpkt.py 23 2006-11-08 15:45:33Z dugsong $

"""ISO Transport Service on top of the TCP (TPKT)."""

import dpkt

# TPKT - RFC 1006 Section 6
# http://www.faqs.org/rfcs/rfc1006.html

class TPKT(dpkt.Packet):
    __hdr__ = (
        ('v', 'B', 3),
        ('rsvd', 'B', 0),
        ('len', 'H', 0)
        )
