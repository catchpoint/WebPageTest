# $Id: pcap.py 56 2009-11-06 22:28:26Z jon.oberheide $

"""Libpcap file format."""

import sys, time
import dpkt

TCPDUMP_MAGIC = 0xa1b2c3d4L
PMUDPCT_MAGIC = 0xd4c3b2a1L

PCAP_VERSION_MAJOR = 2
PCAP_VERSION_MINOR = 4

DLT_NULL               = 0
DLT_EN10MB             = 1
DLT_EN3MB              = 2
DLT_AX25               = 3
DLT_PRONET             = 4
DLT_CHAOS              = 5
DLT_IEEE802            = 6
DLT_ARCNET             = 7
DLT_SLIP               = 8
DLT_PPP                = 9
DLT_FDDI               = 10
DLT_PFSYNC             = 18
DLT_IEEE802_11         = 105
DLT_LINUX_SLL          = 113
DLT_PFLOG              = 117
DLT_IEEE802_11_RADIO   = 127

if sys.platform.find('openbsd') != -1:
    DLT_LOOP           = 12
    DLT_RAW            = 14
else:
    DLT_LOOP           = 108
    DLT_RAW            = 12

dltoff = { DLT_NULL:4, DLT_EN10MB:14, DLT_IEEE802:22, DLT_ARCNET:6,
           DLT_SLIP:16, DLT_PPP:4, DLT_FDDI:21, DLT_PFLOG:48, DLT_PFSYNC:4,
           DLT_LOOP:4, DLT_LINUX_SLL:16 }

class PktHdr(dpkt.Packet):
    """pcap packet header."""
    __hdr__ = (
        ('tv_sec', 'I', 0),
        ('tv_usec', 'I', 0),
        ('caplen', 'I', 0),
        ('len', 'I', 0),
        )

class LEPktHdr(PktHdr):
    __byte_order__ = '<'

class FileHdr(dpkt.Packet):
    """pcap file header."""
    __hdr__ = (
        ('magic', 'I', TCPDUMP_MAGIC),
        ('v_major', 'H', PCAP_VERSION_MAJOR),
        ('v_minor', 'H', PCAP_VERSION_MINOR),
        ('thiszone', 'I', 0),
        ('sigfigs', 'I', 0),
        ('snaplen', 'I', 1500),
        ('linktype', 'I', 1),
        )

class LEFileHdr(FileHdr):
    __byte_order__ = '<'

class Writer(object):
    """Simple pcap dumpfile writer."""
    def __init__(self, fileobj, snaplen=1500, linktype=DLT_EN10MB):
        self.__f = fileobj
        fh = FileHdr(snaplen=snaplen, linktype=linktype)
        self.__f.write(str(fh))

    def writepkt(self, pkt, ts=None):
        if ts is None:
            ts = time.time()
        s = str(pkt)
        n = len(s)
        ph = PktHdr(tv_sec=int(ts),
                    tv_usec=int((float(ts) - int(ts)) * 1000000.0),
                    caplen=n, len=n)
        self.__f.write(str(ph))
        self.__f.write(s)

    def close(self):
        self.__f.close()

class Reader(object):
    """Simple pypcap-compatible pcap file reader."""
    
    def __init__(self, fileobj):
        self.name = fileobj.name
        self.fd = fileobj.fileno()
        self.__f = fileobj
        buf = self.__f.read(FileHdr.__hdr_len__)
        self.__fh = FileHdr(buf)
        self.__ph = PktHdr
        if self.__fh.magic == PMUDPCT_MAGIC:
            self.__fh = LEFileHdr(buf)
            self.__ph = LEPktHdr
        elif self.__fh.magic != TCPDUMP_MAGIC:
            raise ValueError, 'invalid tcpdump header'
        if self.__fh.linktype in dltoff:
            self.dloff = dltoff[self.__fh.linktype]
        else:
            self.dloff = 0
        self.snaplen = self.__fh.snaplen
        self.filter = ''

    def fileno(self):
        return self.fd
    
    def datalink(self):
        return self.__fh.linktype
    
    def setfilter(self, value, optimize=1):
        return NotImplementedError

    def readpkts(self):
        return list(self)
    
    def dispatch(self, cnt, callback, *args):
        if cnt > 0:
            for i in range(cnt):
                ts, pkt = self.next()
                callback(ts, pkt, *args)
        else:
            for ts, pkt in self:
                callback(ts, pkt, *args)

    def loop(self, callback, *args):
        self.dispatch(0, callback, *args)
    
    def __iter__(self):
        self.__f.seek(FileHdr.__hdr_len__)
        while 1:
            buf = self.__f.read(PktHdr.__hdr_len__)
            if not buf: break
            hdr = self.__ph(buf)
            buf = self.__f.read(hdr.caplen)
            yield (hdr.tv_sec + (hdr.tv_usec / 1000000.0), buf)

if __name__ == '__main__':
    import unittest

    class PcapTestCase(unittest.TestCase):
        def test_endian(self):
            be = '\xa1\xb2\xc3\xd4\x00\x02\x00\x04\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x60\x00\x00\x00\x01'
            le = '\xd4\xc3\xb2\xa1\x02\x00\x04\x00\x00\x00\x00\x00\x00\x00\x00\x00\x60\x00\x00\x00\x01\x00\x00\x00'
            befh = FileHdr(be)
            lefh = LEFileHdr(le)
            self.failUnless(befh.linktype == lefh.linktype)

    unittest.main()
