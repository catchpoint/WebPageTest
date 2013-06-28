# $Id: gzip.py 23 2006-11-08 15:45:33Z dugsong $

"""GNU zip."""

import struct, zlib
import dpkt

# RFC 1952
GZIP_MAGIC	= '\x1f\x8b'

# Compression methods
GZIP_MSTORED	= 0
GZIP_MCOMPRESS	= 1
GZIP_MPACKED	= 2
GZIP_MLZHED	= 3
GZIP_MDEFLATE	= 8

# Flags
GZIP_FTEXT	= 0x01
GZIP_FHCRC	= 0x02
GZIP_FEXTRA	= 0x04
GZIP_FNAME	= 0x08
GZIP_FCOMMENT	= 0x10
GZIP_FENCRYPT	= 0x20
GZIP_FRESERVED	= 0xC0

# OS
GZIP_OS_MSDOS	= 0
GZIP_OS_AMIGA	= 1
GZIP_OS_VMS	= 2
GZIP_OS_UNIX	= 3
GZIP_OS_VMCMS	= 4
GZIP_OS_ATARI	= 5
GZIP_OS_OS2	= 6
GZIP_OS_MACOS	= 7
GZIP_OS_ZSYSTEM	= 8
GZIP_OS_CPM	= 9
GZIP_OS_TOPS20	= 10
GZIP_OS_WIN32	= 11
GZIP_OS_QDOS	= 12
GZIP_OS_RISCOS	= 13
GZIP_OS_UNKNOWN	= 255

GZIP_FENCRYPT_LEN	= 12

class GzipExtra(dpkt.Packet):
    __hdr__ = (
        ('id', '2s', ''),
        ('len', 'H', 0)
        )

class Gzip(dpkt.Packet):
    __hdr__ = (
        ('magic', '2s', GZIP_MAGIC),
        ('method', 'B', GZIP_MDEFLATE),
        ('flags', 'B', 0),
        ('mtime', 'I', 0),
        ('xflags', 'B', 0),
        ('os', 'B', GZIP_OS_UNIX),
        
        ('extra', '0s', ''),	# XXX - GZIP_FEXTRA
        ('filename', '0s', ''),	# XXX - GZIP_FNAME
        ('comment', '0s', '')	# XXX - GZIP_FCOMMENT
        )
    
    def unpack(self, buf):
        super(Gzip, self).unpack(buf)
        if self.flags & GZIP_FEXTRA:
            n = struct.unpack(self.data[:2], '>H')[0]
            self.extra = GzipExtra(self.data[2:2+n])
            self.data = self.data[2+n:]
        if self.flags & GZIP_FNAME:
            n = self.data.find('\x00')
            self.filename = self.data[:n]
            self.data = self.data[n + 1:]
        if self.flags & GZIP_FCOMMENT:
            n = self.data.find('\x00')
            self.comment = self.data[:n]
            self.data = self.data[n + 1:]
        if self.flags & GZIP_FENCRYPT:
            self.data = self.data[GZIP_FENCRYPT_LEN:]	# XXX - skip
        if self.flags & GZIP_FHCRC:
            self.data = self.data[2:]	# XXX - skip

    def pack_hdr(self):
        l = []
        if self.extra:
            self.flags |= GZIP_FEXTRA
            s = str(self.extra)
            l.append(struct.pack('>H', len(s)))
            l.append(s)
        if self.filename:
            self.flags |= GZIP_FNAME
            l.append(self.filename)
            l.append('\x00')
        if self.comment:
            self.flags |= GZIP_FCOMMENT
            l.append(self.comment)
            l.append('\x00')
        l.insert(0, super(Gzip, self).pack_hdr())
        return ''.join(l)

    def compress(self):
        """Compress self.data."""
        c = zlib.compressobj(9, zlib.DEFLATED, -zlib.MAX_WBITS,
                             zlib.DEF_MEM_LEVEL, 0)
        self.data = c.compress(self.data)
    
    def decompress(self):
        """Return decompressed payload."""
        d = zlib.decompressobj(-zlib.MAX_WBITS)
        return d.decompress(self.data)

if __name__ == '__main__':
    import sys
    gz = Gzip(open(sys.argv[1]).read())
    print `gz`, `gz.decompress()`
