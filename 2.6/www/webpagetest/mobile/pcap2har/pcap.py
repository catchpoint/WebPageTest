import dns
import dpkt
import logging as log
import StringIO
import tcp
from pcaputil import ModifiedReader

class TCPFlowAccumulator:
  '''
  Takes a list of TCP packets and organizes them into distinct
  connections, or flows. It does this by organizing packets into a
  dictionary indexed by their socket (the tuple
  ((srcip, sport), (dstip,dport)), possibly the other way around).

  Members:
  flowdict = {socket: tcp.Flow}, the list of tcp.Flow's organized by socket
  '''
  def __init__(self, pcap_reader, options):
    '''
    scans the pcap_reader for TCP packets, and adds them to the tcp.Flow
    they belong to, based on their socket

    Args:
    pcap_reader = pcaputil.ModifiedReader
    '''
    self.flowdict = {}
    self.options = options
    self.options.dns = dns.DNS()
    debug_pkt_count = 0
    try:
      for pkt in pcap_reader:
        debug_pkt_count += 1
        log.debug("Processing packet %d", debug_pkt_count)
        # discard incomplete packets
        header = pkt[2]
        if header.caplen != header.len:
          # packet is too short
          log.warning('discarding incomplete packet')
        # parse packet
        try:
          dltoff = dpkt.pcap.dltoff
          if pcap_reader.dloff == dltoff[dpkt.pcap.DLT_LINUX_SLL]:
            eth = dpkt.sll.SLL(pkt[1])
          else:
            # TODO(lsong): Check other packet type. Default is ethernet.
            eth = dpkt.ethernet.Ethernet(pkt[1])
          if isinstance(eth.data, dpkt.ip.IP):
            ip = eth.data
            if self.options.dns.check_dns(pkt[0], ip):
              continue
            if isinstance(ip.data, dpkt.tcp.TCP):
              # then it's a TCP packet process it
              tcppkt = tcp.Packet(pkt[0], pkt[1], eth, ip, ip.data)
              self.process_packet(tcppkt) # organize by socket
        except dpkt.Error, error:
          log.warning(error)
    except dpkt.dpkt.NeedData, error:
      log.warning(error)
      log.warning('A packet in the pcap file was too short, '
                  'debug_pkt_count=%d', debug_pkt_count)
    # finish all tcp flows
    map(tcp.Flow.finish, self.flowdict.itervalues())

  def process_packet(self, pkt):
    '''
    adds the tcp packet to flowdict. pkt is a TCPPacket
    '''
    #try both orderings of src/dst socket components
    #otherwise, start a new list for that socket
    src, dst = pkt.socket
    srcip, srcport = src
    dstip, dstport = dst
    if (srcport == 5223 or dstport == 5223):
      log.debug("hpvirtgrp packets are ignored.")
      return
    if (srcport == 5228 or dstport == 5228):
      log.debug("hpvroom packets are ignored.")
      return
    if (srcport == 443 or dstport == 443):
      log.debug("HTTPS packets are ignored.")
      return
    if (srcport == 53 or dstport == 53):
      log.debug("DNS TCP packets are ignored.")
      return

    if (src, dst) in self.flowdict:
      #print '  adding as ', (src, dst)
      self.flowdict[(src, dst)].add(pkt)
    elif (dst, src) in self.flowdict:
      #print '  adding as ', (dst, src)
      self.flowdict[(dst, src)].add(pkt)
    else:
      #print '  making new dict entry as ', (src, dst)
      log.debug("New flow: s:%d -> d:%d", srcport, dstport)
      newflow = tcp.Flow(self.options)
      newflow.add(pkt)
      self.flowdict[(src, dst)] = newflow

def TCPFlowsFromString(buf, options):
  '''
  helper function for getting a TCPFlowAccumulator from a pcap buf.
  buffer in, flows out.
  '''
  f = StringIO.StringIO(buf)
  reader = ModifiedReader(f)
  return TCPFlowAccumulator(reader, options)
