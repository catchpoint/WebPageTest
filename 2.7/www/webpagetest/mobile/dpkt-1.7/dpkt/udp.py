# $Id: udp.py 23 2006-11-08 15:45:33Z dugsong $

"""User Datagram Protocol."""

import dpkt

UDP_PORT_MAX	= 65535

class UDP(dpkt.Packet):
    __hdr__ = (
        ('sport', 'H', 0xdead),
        ('dport', 'H', 0),
        ('ulen', 'H', 8),
        ('sum', 'H', 0)
        )
