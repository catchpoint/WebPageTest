# $Id: stp.py 23 2006-11-08 15:45:33Z dugsong $

"""Spanning Tree Protocol."""

import dpkt

class STP(dpkt.Packet):
    __hdr__ = (
        ('proto_id', 'H', 0),
        ('v', 'B', 0),
        ('type', 'B', 0),
        ('flags', 'B', 0),
        ('root_id', '8s', ''),
        ('root_path', 'I', 0),
        ('bridge_id', '8s', ''),
        ('port_id', 'H', 0),
        ('age', 'H', 0),
        ('max_age', 'H', 0),
        ('hello', 'H', 0),
        ('fd', 'H', 0)
        )
