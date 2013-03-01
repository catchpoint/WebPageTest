# $Id: asn1.py 23 2006-11-08 15:45:33Z dugsong $

"""Abstract Syntax Notation #1."""

import struct, time
import dpkt

# Type class
CLASSMASK    = 0xc0
UNIVERSAL    = 0x00
APPLICATION  = 0x40
CONTEXT      = 0x80
PRIVATE      = 0xc0

# Constructed (vs. primitive)
CONSTRUCTED  = 0x20

# Universal-class tags
TAGMASK      = 0x1f
INTEGER      = 2
BIT_STRING   = 3	# arbitrary bit string
OCTET_STRING = 4	# arbitrary octet string
NULL         = 5
OID          = 6	# object identifier
SEQUENCE     = 16	# ordered collection of types
SET          = 17	# unordered collection of types
PRINT_STRING = 19	# printable string
T61_STRING   = 20	# T.61 (8-bit) character string
IA5_STRING   = 22	# ASCII
UTC_TIME     = 23

def utctime(buf):
    """Convert ASN.1 UTCTime string to UTC float."""
    yy = int(buf[:2])
    mm = int(buf[2:4])
    dd = int(buf[4:6])
    hh = int(buf[6:8])
    mm = int(buf[8:10])
    try:
        ss = int(buf[10:12])
        buf = buf[12:]
    except TypeError:
        ss = 0
        buf = buf[10:]
    if buf[0] == '+':
        hh -= int(buf[1:3])
        mm -= int(buf[3:5])
    elif buf[0] == '-':
        hh += int(buf[1:3])
        mm += int(buf[3:5])
    return time.mktime((2000 + yy, mm, dd, hh, mm, ss, 0, 0, 0))

def decode(buf):
    """Sleazy ASN.1 decoder.
    Return list of (id, value) tuples from ASN.1 BER/DER encoded buffer.
    """
    msg = []
    while buf:
        t = ord(buf[0])
        constructed = t & CONSTRUCTED
        tag = t & TAGMASK
        l = ord(buf[1])
        c = 0
        if constructed and l == 128:
            # XXX - constructed, indefinite length
            msg.append(t, decode(buf[2:]))
        elif l >= 128:
            c = l & 127
            if c == 1:
                l = ord(buf[2])
            elif c == 2:
                l = struct.unpack('>H', buf[2:4])[0]
            elif c == 3:
                l = struct.unpack('>I', buf[1:5])[0] & 0xfff
                c = 2
            elif c == 4:
                l = struct.unpack('>I', buf[2:6])[0]
            else:
                # XXX - can be up to 127 bytes, but...
                raise dpkt.UnpackError('excessive long-form ASN.1 length %d' % l)

        # Skip type, length
        buf = buf[2+c:]

        # Parse content
        if constructed:
            msg.append((t, decode(buf)))
        elif tag == INTEGER:
            if l == 0:
                n = 0
            elif l == 1:
                n = ord(buf[0])
            elif l == 2:
                n = struct.unpack('>H', buf[:2])[0]
            elif l == 3:
                n = struct.unpack('>I', buf[:4])[0] >> 8
            elif l == 4:
                n = struct.unpack('>I', buf[:4])[0]
            else:
                raise dpkt.UnpackError('excessive integer length > %d bytes' % l)
            msg.append((t, n))
        elif tag == UTC_TIME:
            msg.append((t, utctime(buf[:l])))
        else:
            msg.append((t, buf[:l]))
        
        # Skip content
        buf = buf[l:]
    return msg

if __name__ == '__main__':
    import unittest
    
    class ASN1TestCase(unittest.TestCase):
        def test_asn1(self):
            s = '0\x82\x02Q\x02\x01\x0bc\x82\x02J\x04xcn=Douglas J Song 1, ou=Information Technology Division, ou=Faculty and Staff, ou=People, o=University of Michigan, c=US\n\x01\x00\n\x01\x03\x02\x01\x00\x02\x01\x00\x01\x01\x00\x87\x0bobjectclass0\x82\x01\xb0\x04\rmemberOfGroup\x04\x03acl\x04\x02cn\x04\x05title\x04\rpostalAddress\x04\x0ftelephoneNumber\x04\x04mail\x04\x06member\x04\thomePhone\x04\x11homePostalAddress\x04\x0bobjectClass\x04\x0bdescription\x04\x18facsimileTelephoneNumber\x04\x05pager\x04\x03uid\x04\x0cuserPassword\x04\x08joinable\x04\x10associatedDomain\x04\x05owner\x04\x0erfc822ErrorsTo\x04\x08ErrorsTo\x04\x10rfc822RequestsTo\x04\nRequestsTo\x04\tmoderator\x04\nlabeledURL\x04\nonVacation\x04\x0fvacationMessage\x04\x05drink\x04\x0elastModifiedBy\x04\x10lastModifiedTime\x04\rmodifiersname\x04\x0fmodifytimestamp\x04\x0ccreatorsname\x04\x0fcreatetimestamp'
            self.failUnless(decode(s) == [(48, [(2, 11), (99, [(4, 'cn=Douglas J Song 1, ou=Information Technology Division, ou=Faculty and Staff, ou=People, o=University of Michigan, c=US'), (10, '\x00'), (10, '\x03'), (2, 0), (2, 0), (1, '\x00'), (135, 'objectclass'), (48, [(4, 'memberOfGroup'), (4, 'acl'), (4, 'cn'), (4, 'title'), (4, 'postalAddress'), (4, 'telephoneNumber'), (4, 'mail'), (4, 'member'), (4, 'homePhone'), (4, 'homePostalAddress'), (4, 'objectClass'), (4, 'description'), (4, 'facsimileTelephoneNumber'), (4, 'pager'), (4, 'uid'), (4, 'userPassword'), (4, 'joinable'), (4, 'associatedDomain'), (4, 'owner'), (4, 'rfc822ErrorsTo'), (4, 'ErrorsTo'), (4, 'rfc822RequestsTo'), (4, 'RequestsTo'), (4, 'moderator'), (4, 'labeledURL'), (4, 'onVacation'), (4, 'vacationMessage'), (4, 'drink'), (4, 'lastModifiedBy'), (4, 'lastModifiedTime'), (4, 'modifiersname'), (4, 'modifytimestamp'), (4, 'creatorsname'), (4, 'createtimestamp')])])])])

    unittest.main()
