# $Id: ssl.py 46 2008-05-27 02:08:12Z jon.oberheide $

"""Secure Sockets Layer / Transport Layer Security."""

import dpkt

class SSL2(dpkt.Packet):
    __hdr__ = (
        ('len', 'H', 0),
        ('msg', 's', ''),
        ('pad', 's', ''),
        )
    def unpack(self, buf):
        dpkt.Packet.unpack(self, buf)
        if self.len & 0x8000:
            n = self.len = self.len & 0x7FFF
            self.msg, self.data = self.data[:n], self.data[n:]
        else:
            n = self.len = self.len & 0x3FFF
            padlen = ord(self.data[0])
            self.msg = self.data[1:1+n]
            self.pad = self.data[1+n:1+n+padlen]
            self.data = self.data[1+n+padlen:]

# SSLv3/TLS version
SSL3_VERSION = 0x0300
TLS1_VERSION = 0x0301

# Record type
SSL3_RT_CHANGE_CIPHER_SPEC = 20
SSL3_RT_ALERT             = 21
SSL3_RT_HANDSHAKE         = 22
SSL3_RT_APPLICATION_DATA  = 23

# Handshake message type
SSL3_MT_HELLO_REQUEST           = 0
SSL3_MT_CLIENT_HELLO            = 1
SSL3_MT_SERVER_HELLO            = 2
SSL3_MT_CERTIFICATE             = 11
SSL3_MT_SERVER_KEY_EXCHANGE     = 12
SSL3_MT_CERTIFICATE_REQUEST     = 13
SSL3_MT_SERVER_DONE             = 14
SSL3_MT_CERTIFICATE_VERIFY      = 15
SSL3_MT_CLIENT_KEY_EXCHANGE     = 16
SSL3_MT_FINISHED                = 20

class SSL3(dpkt.Packet):
    __hdr__ = (
        ('type', 'B', 0),
        ('version', 'H', 0),
        ('len', 'H', 0),
        )
    def unpack(self, buf):
        dpkt.Packet.unpack(self, buf)
        if self.len <= len(self.data):
            self.msg, self.data = self.data[:self.len], self.data[self.len:]

"""
Byte   0       = SSL record type = 22 (SSL3_RT_HANDSHAKE)
Bytes 1-2      = SSL version (major/minor)
Bytes 3-4      = Length of data in the record (excluding the header itself).
Byte   5       = Handshake type
Bytes 6-8      = Length of data to follow in this record
Bytes 9-n      = Command-specific data
"""
        

class SSLFactory(object):
    def __new__(cls, buf):
        v = buf[1:3]
        if v == '\x03\x01' or v == '\x03\x00':
            return SSL3(buf)
        return SSL2(buf)
