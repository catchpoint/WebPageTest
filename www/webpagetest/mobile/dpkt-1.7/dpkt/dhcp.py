# $Id: dhcp.py 23 2006-11-08 15:45:33Z dugsong $

"""Dynamic Host Configuration Protocol."""

import arp, dpkt

DHCP_OP_REQUEST = 1
DHCP_OP_REPLY = 2

DHCP_MAGIC = 0x63825363

# DHCP option codes
DHCP_OPT_NETMASK =         1 # I: subnet mask
DHCP_OPT_TIMEOFFSET =      2
DHCP_OPT_ROUTER =          3 # s: list of router ips
DHCP_OPT_TIMESERVER =      4
DHCP_OPT_NAMESERVER =      5
DHCP_OPT_DNS_SVRS =        6 # s: list of DNS servers
DHCP_OPT_LOGSERV =         7
DHCP_OPT_COOKIESERV =      8
DHCP_OPT_LPRSERV =         9
DHCP_OPT_IMPSERV =         10
DHCP_OPT_RESSERV =         11
DHCP_OPT_HOSTNAME =        12 # s: client hostname
DHCP_OPT_BOOTFILESIZE =    13
DHCP_OPT_DUMPFILE =        14
DHCP_OPT_DOMAIN =          15 # s: domain name
DHCP_OPT_SWAPSERV =        16
DHCP_OPT_ROOTPATH =        17
DHCP_OPT_EXTENPATH =       18
DHCP_OPT_IPFORWARD =       19
DHCP_OPT_SRCROUTE =        20
DHCP_OPT_POLICYFILTER =    21
DHCP_OPT_MAXASMSIZE =      22
DHCP_OPT_IPTTL =           23
DHCP_OPT_MTUTIMEOUT =      24
DHCP_OPT_MTUTABLE =        25
DHCP_OPT_MTUSIZE =         26
DHCP_OPT_LOCALSUBNETS =    27
DHCP_OPT_BROADCASTADDR =   28
DHCP_OPT_DOMASKDISCOV =    29
DHCP_OPT_MASKSUPPLY =      30
DHCP_OPT_DOROUTEDISC =     31
DHCP_OPT_ROUTERSOLICIT =   32
DHCP_OPT_STATICROUTE =     33
DHCP_OPT_TRAILERENCAP =    34
DHCP_OPT_ARPTIMEOUT =      35
DHCP_OPT_ETHERENCAP =      36
DHCP_OPT_TCPTTL =          37
DHCP_OPT_TCPKEEPALIVE =    38
DHCP_OPT_TCPALIVEGARBAGE = 39
DHCP_OPT_NISDOMAIN =       40
DHCP_OPT_NISSERVERS =      41
DHCP_OPT_NISTIMESERV =     42
DHCP_OPT_VENDSPECIFIC =    43
DHCP_OPT_NBNS =            44
DHCP_OPT_NBDD =            45
DHCP_OPT_NBTCPIP =         46
DHCP_OPT_NBTCPSCOPE =      47
DHCP_OPT_XFONT =           48
DHCP_OPT_XDISPLAYMGR =     49
DHCP_OPT_REQ_IP =          50 # I: IP address
DHCP_OPT_LEASE_SEC =       51 # I: lease seconds
DHCP_OPT_OPTIONOVERLOAD =  52
DHCP_OPT_MSGTYPE =         53 # B: message type
DHCP_OPT_SERVER_ID =       54 # I: server IP address
DHCP_OPT_PARAM_REQ =       55 # s: list of option codes
DHCP_OPT_MESSAGE =         56
DHCP_OPT_MAXMSGSIZE =      57
DHCP_OPT_RENEWTIME =       58
DHCP_OPT_REBINDTIME =      59
DHCP_OPT_VENDOR_ID =       60 # s: vendor class id
DHCP_OPT_CLIENT_ID =       61 # Bs: idtype, id (idtype 0: FQDN, idtype 1: MAC)
DHCP_OPT_NISPLUSDOMAIN =   64
DHCP_OPT_NISPLUSSERVERS =  65
DHCP_OPT_MOBILEIPAGENT =   68
DHCP_OPT_SMTPSERVER =      69
DHCP_OPT_POP3SERVER =      70
DHCP_OPT_NNTPSERVER =      71
DHCP_OPT_WWWSERVER =       72
DHCP_OPT_FINGERSERVER =    73
DHCP_OPT_IRCSERVER =       74
DHCP_OPT_STSERVER =        75
DHCP_OPT_STDASERVER =      76

# DHCP message type values
DHCPDISCOVER = 1
DHCPOFFER = 2
DHCPREQUEST = 3
DHCPDECLINE = 4
DHCPACK = 5
DHCPNAK = 6
DHCPRELEASE = 7
DHCPINFORM = 8

class DHCP(dpkt.Packet):
    __hdr__ = (
        ('op', 'B', DHCP_OP_REQUEST),
        ('hrd', 'B', arp.ARP_HRD_ETH),  # just like ARP.hrd
        ('hln', 'B', 6),		# and ARP.hln
        ('hops', 'B', 0),
        ('xid', 'I', 0xdeadbeefL),
        ('secs', 'H', 0),
        ('flags', 'H', 0),
        ('ciaddr', 'I', 0),
        ('yiaddr', 'I', 0),
        ('siaddr', 'I', 0),
        ('giaddr', 'I', 0),
        ('chaddr', '16s', 16 * '\x00'),
        ('sname', '64s', 64 * '\x00'),
        ('file', '128s', 128 * '\x00'),
        ('magic', 'I', DHCP_MAGIC),
        )
    opts = (
        (DHCP_OPT_MSGTYPE, chr(DHCPDISCOVER)),
        (DHCP_OPT_PARAM_REQ, ''.join(map(chr, (DHCP_OPT_REQ_IP,
                                               DHCP_OPT_ROUTER,
                                               DHCP_OPT_NETMASK,
                                               DHCP_OPT_DNS_SVRS))))
        )				# list of (type, data) tuples

    def __len__(self):
        return self.__hdr_len__ + \
               sum([ 2 + len(o[1]) for o in self.opts ]) + 1 + len(self.data)
    
    def __str__(self):
        return self.pack_hdr() + self.pack_opts() + str(self.data)
    
    def pack_opts(self):
        """Return packed options string."""
        if not self.opts:
            return ''
        l = []
        for t, data in self.opts:
            l.append('%s%s%s' % (chr(t), chr(len(data)), data))
        l.append('\xff')
        return ''.join(l)
    
    def unpack(self, buf):
        dpkt.Packet.unpack(self, buf)
        self.chaddr = self.chaddr[:self.hln]
        buf = self.data
        l = []
        while buf:
            t = ord(buf[0])
            if t == 0xff:
                buf = buf[1:]
                break
            elif t == 0:
                buf = buf[1:]
            else:
                n = ord(buf[1])
                l.append((t, buf[2:2+n]))
                buf = buf[2+n:]
        self.opts = l
        self.data = buf

if __name__ == '__main__':
    import unittest

    class DHCPTestCast(unittest.TestCase):
        def test_DHCP(self):
            s = '\x01\x01\x06\x00\xadS\xc8c\xb8\x87\x80\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x02U\x82\xf3\xa6\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00c\x82Sc5\x01\x01\xfb\x01\x01=\x07\x01\x00\x02U\x82\xf3\xa62\x04\n\x00\x01e\x0c\tGuinevere<\x08MSFT 5.07\n\x01\x0f\x03\x06,./\x1f!+\xff\x00\x00\x00\x00\x00'
            dhcp = DHCP(s)
            self.failUnless(s == str(dhcp))

    unittest.main()

