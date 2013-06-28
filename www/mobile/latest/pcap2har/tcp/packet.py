import dpkt
from ..pcaputil import friendly_socket
from ..pcaputil import friendly_tcp_flags
from ..pcaputil import friendly_data

class Packet(object):
    '''
    Represents a TCP packet. Copied from pyper, with additions. contains
    socket, timestamp, and data
    
    Members:
    ts = dpkt timestamp
    buf = original data from which eth was constructed
    eth = dpkt.ethernet.Ethernet. Original ethernet frame.
    ip = dpkt.ip.IP. Original IP packet.
    tcp = dpkt.tcp.TCP.
    socket = standard socket tuple: ((srcip, sport), (dstip, dport))
    data = data from TCP segment
    seq, seq_start = sequence number
    seq_end = first sequence number past this packets data (past the end slice
        index style)
    '''
    def __init__(self, ts, buf, eth, ip, tcp):
        '''
        Args:
        ts = timestamp
        buf = original packet data
        eth = dpkt.ethernet.Ethernet that the packet came from
        ip  = dpkt.ip.IP that the packet came from
        tcp = dpkt.tcp.TCP that the packet came from
        '''
        self.ts = ts
        self.buf = buf
        self.eth = eth
        self.ip = ip
        self.tcp = tcp
        self.socket = ((self.ip.src, self.tcp.sport),(self.ip.dst, self.tcp.dport))
        self.data = tcp.data
        self.seq = tcp.seq
        self.ack = tcp.ack
        self.flags = tcp.flags
        self.seq_start = self.tcp.seq
        self.seq_end = self.tcp.seq + len(self.tcp.data) # - 1
        self.rtt = None

    def __cmp__(self, other):
        return cmp(self.ts, other.ts)
    def __eq__(self, other):
        return not self.__ne__(other)
    def __ne__(self, other):
        if isinstance(other, Packet):
            return cmp(self, other) != 0
        else:
            return True
    def __repr__(self):
        return 'TCPPacket(%s, %s, seq=%x , ack=%x, data="%s")' % (
            friendly_socket(self.socket),
            friendly_tcp_flags(self.tcp.flags),
            self.tcp.seq,
            self.tcp.ack,
            friendly_data(self.tcp.data)[:60]
        )


class PadPacket(Packet):
  '''
  Represents a fake TCP packet used for padding missing data.
  '''
  def __init__(self, seq, size, ts):
    self.ts = ts
    self.buf = None
    self.eth = None
    self.ip = None
    self.tcp = None
    self.socket = None
    self.data = '\0' * size
    self.seq = seq
    self.ack = None
    self.flags = None
    self.seq_start = seq
    self.seq_end = self.seq_start + size
    self.rtt = None

  def __repr__(self):
    return 'PadPacket(seq=%d, size=%d)' % (self.seq, len(self.data))
