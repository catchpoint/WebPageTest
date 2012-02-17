import dns
import dpkt
import logging as log

class Processor:
    '''
    Processes and interprets UDP packets.

    Call its add(pkt) method with each dpkt.udp.UDP packet from the pcap or
    whatever. It will expose information from the packets, at this point mostly
    DNS information. It will automatically create a dns processor and expose it
    as its `dns` member variable.

    This class is basically a nonce, if I may borrow the term, for the sake of
    architectural elegance. But I think it's begging for trouble to combine it
    with DNS handling.
    '''
    def __init__(self):
        self.dns = dns.Processor()
    def add(self, ts, pkt):
        '''
        pkt = dpkt.udp.UDP
        '''
        #check for DNS
        if pkt.sport == 53 or pkt.dport == 53:
            try:
                dnspkt = dpkt.dns.DNS(pkt.data)
                self.dns.add(dns.Packet(ts, dnspkt))
            except dpkt.Error:
                log.warning('UDP packet on port 53 was not DNS')
        else:
            log.warning('unkown UDP ports: %d->%d' % (pkt.sport, pkt.dport))
