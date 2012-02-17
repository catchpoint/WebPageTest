import dpkt
import tcp
import udp

class PacketDispatcher:
    '''
    takes a series of dpkt.Packet's and calls callbacks based on their type

    For each packet added, picks it apart into its transport-layer packet type
    and adds it to an appropriate handler object. Automatically creates handler
    objects for now.

    Members:
    * flowbuilder = tcp.FlowBuilder
    * udp = udp.Processor
    '''
    def __init__(self):
        self.tcp = tcp.FlowBuilder()
        self.udp = udp.Processor()
    def add(self, ts, buf, eth):
        '''
        ts = dpkt timestamp
        buf = original packet data
        eth = dpkt.ethernet.Ethernet, whether its real Ethernet or from SLL
        '''
        #decide based on pkt.data
        # if it's IP...
        if (isinstance(eth.data, dpkt.ip.IP) or
                    isinstance(eth.data, dpkt.ip6.IP6)):
            ip = eth.data
            # if it's TCP
            if isinstance(ip.data, dpkt.tcp.TCP):
                tcppkt = tcp.Packet(ts, buf, eth, ip, ip.data)
                self.tcp.add(tcppkt)
            # if it's UDP...
            elif isinstance(ip.data, dpkt.udp.UDP):
                self.udp.add(ts, ip.data)
    def finish(self):
        #This is a hack, until tcp.Flow no longer has to be `finish()`ed
        self.tcp.finish()
