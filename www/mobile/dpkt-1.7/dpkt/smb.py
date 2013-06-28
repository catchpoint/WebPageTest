# $Id: smb.py 23 2006-11-08 15:45:33Z dugsong $

"""Server Message Block."""

import dpkt

class SMB(dpkt.Packet):
    __hdr__ = [
    ('proto', '4s', ''),
    ('cmd', 'B', 0),
    ('err', 'I', 0),
    ('flags1', 'B', 0),
    ('flags2', 'B', 0),
    ('pad', '6s', ''),
    ('tid', 'H', 0),
    ('pid', 'H', 0),
    ('uid', 'H', 0),
    ('mid', 'H', 0)
    ]
