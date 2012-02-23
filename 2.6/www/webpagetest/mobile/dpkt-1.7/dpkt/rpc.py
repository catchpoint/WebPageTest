# $Id: rpc.py 23 2006-11-08 15:45:33Z dugsong $

"""Remote Procedure Call."""

import struct
import dpkt

# RPC.dir
CALL = 0
REPLY = 1

# RPC.Auth.flavor
AUTH_NONE = AUTH_NULL = 0
AUTH_UNIX = 1
AUTH_SHORT = 2
AUTH_DES = 3

# RPC.Reply.stat
MSG_ACCEPTED = 0
MSG_DENIED = 1

# RPC.Reply.Accept.stat
SUCCESS = 0
PROG_UNAVAIL = 1
PROG_MISMATCH = 2
PROC_UNAVAIL = 3
GARBAGE_ARGS = 4
SYSTEM_ERR = 5

# RPC.Reply.Reject.stat
RPC_MISMATCH = 0
AUTH_ERROR = 1

class RPC(dpkt.Packet):
    __hdr__ = (
        ('xid', 'I', 0),
        ('dir', 'I', CALL)
        )
    class Auth(dpkt.Packet):
        __hdr__ = (('flavor', 'I', AUTH_NONE), )
        def unpack(self, buf):
            dpkt.Packet.unpack(self, buf)
            n = struct.unpack('>I', self.data[:4])[0]
            self.data = self.data[4:4+n]
        def __len__(self):
            return 8 + len(self.data)
        def __str__(self):
            return self.pack_hdr() + struct.pack('>I', len(self.data)) + \
                   str(self.data)
    
    class Call(dpkt.Packet):
        __hdr__ = (
            ('rpcvers', 'I', 2),
            ('prog', 'I', 0),
            ('vers', 'I', 0),
            ('proc', 'I', 0)
            )
        def unpack(self, buf):
            dpkt.Packet.unpack(self, buf)
            self.cred = RPC.Auth(self.data)
            self.verf = RPC.Auth(self.data[len(self.cred):])
            self.data = self.data[len(self.cred) + len(self.verf):]
        def __len__(self):
            return len(str(self)) # XXX
        def __str__(self):
            return dpkt.Packet.__str__(self) + \
                   str(getattr(self, 'cred', RPC.Auth())) + \
                   str(getattr(self, 'verf', RPC.Auth())) + \
                   str(self.data)
    
    class Reply(dpkt.Packet):
        __hdr__ = (('stat', 'I', MSG_ACCEPTED), )

        class Accept(dpkt.Packet):
            __hdr__ = (('stat', 'I', SUCCESS), )
            def unpack(self, buf):
                self.verf = RPC.Auth(buf)
                buf = buf[len(self.verf):]
                self.stat = struct.unpack('>I', buf[:4])[0]
                if self.stat == SUCCESS:
                    self.data = buf[4:]
                elif self.stat == PROG_MISMATCH:
                    self.low, self.high = struct.unpack('>II', buf[4:12])
                    self.data = buf[12:]
            def __len__(self):
                if self.stat == PROG_MISMATCH: n = 8
                else: n = 0
                return len(self.verf) + 4 + n + len(self.data)
            def __str__(self):
                if self.stat == PROG_MISMATCH:
                    return str(self.verf) + struct.pack('>III', self.stat,
                        self.low, self.high) + self.data
                return str(self.verf) + dpkt.Packet.__str__(self)
        
        class Reject(dpkt.Packet):
            __hdr__ = (('stat', 'I', AUTH_ERROR), )
            def unpack(self, buf):
                dpkt.Packet.unpack(self, buf)
                if self.stat == RPC_MISMATCH:
                    self.low, self.high = struct.unpack('>II', self.data[:8])
                    self.data = self.data[8:]
                elif self.stat == AUTH_ERROR:
                    self.why = struct.unpack('>I', self.data[:4])[0]
                    self.data = self.data[4:]
            def __len__(self):
                if self.stat == RPC_MISMATCH: n = 8
                elif self.stat == AUTH_ERROR: n =4
                else: n = 0
                return 4 + n + len(self.data)
            def __str__(self):
                if self.stat == RPC_MISMATCH:
                    return struct.pack('>III', self.stat, self.low,
                                       self.high) + self.data
                elif self.stat == AUTH_ERROR:
                    return struct.pack('>II', self.stat, self.why) + self.data
                return dpkt.Packet.__str__(self)
        
        def unpack(self, buf):
            dpkt.Packet.unpack(self, buf)
            if self.stat == MSG_ACCEPTED:
                self.data = self.accept = self.Accept(self.data)
            elif self.status == MSG_DENIED:
                self.data = self.reject = self.Reject(self.data)
        
    def unpack(self, buf):
        dpkt.Packet.unpack(self, buf)
        if self.dir == CALL:
            self.data = self.call = self.Call(self.data)
        elif self.dir == REPLY:
            self.data = self.reply = self.Reply(self.data)

def unpack_xdrlist(cls, buf):
    l = []
    while buf:
        if buf.startswith('\x00\x00\x00\x01'):
            p = cls(buf[4:])
            l.append(p)
            buf = p.data
        elif buf.startswith('\x00\x00\x00\x00'):
            break
        else:
            raise dpkt.UnpackError, 'invalid XDR list'
    return l

def pack_xdrlist(*args):
    return '\x00\x00\x00\x01'.join(map(str, args)) + '\x00\x00\x00\x00'
