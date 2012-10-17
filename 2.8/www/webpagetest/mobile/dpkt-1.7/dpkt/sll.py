# $Id: sll.py 23 2006-11-08 15:45:33Z dugsong $

"""Linux libpcap "cooked" capture encapsulation."""

import arp, dpkt, ethernet

class SLL(dpkt.Packet):
    __hdr__ = (
        ('type', 'H', 0), # 0: to us, 1: bcast, 2: mcast, 3: other, 4: from us
        ('hrd', 'H', arp.ARP_HRD_ETH),
        ('hlen', 'H', 6),	# hardware address length
        ('hdr', '8s', ''),	# first 8 bytes of link-layer header
        ('ethtype', 'H', ethernet.ETH_TYPE_IP),
        )
    _typesw = ethernet.Ethernet._typesw
    
    def unpack(self, buf):
        dpkt.Packet.unpack(self, buf)
        try:
            self.data = self._typesw[self.ethtype](self.data)
            setattr(self, self.data.__class__.__name__.lower(), self.data)
        except (KeyError, dpkt.UnpackError):
            pass
