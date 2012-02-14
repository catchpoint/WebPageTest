import dpkt
from pcaputil import *
from socket import inet_ntoa

import logging as log
import os
import shutil
import tcp
from packetdispatcher import PacketDispatcher


def ParsePcap(dispatcher, filename=None, reader=None):
    '''
    Parses the passed pcap file or pcap reader.

    Adds the packets to the PacketDispatcher. Keeps a list

    Args:
    dispatcher = PacketDispatcher
    reader = pcaputil.ModifiedReader or None
    filename = filename of pcap file or None

    check for filename first; if there is one, load the reader from that. if
    not, look for reader.
    '''
    if filename:
        f = open(filename, 'rb')
        try:
            pcap = ModifiedReader(f)
        except dpkt.dpkt.Error as e:
            log.warning('failed to parse pcap file %s' % filename)
            return
    elif reader:
        pcap = reader
    else:
        raise 'function ParsePcap needs either a filename or pcap reader'
    #now we have the reader; read from it
    packet_count = 1 # start from 1 like Wireshark
    errors = [] # store errors for later inspection
    try:
        for packet in pcap:
            ts = packet[0]  # timestamp
            buf = packet[1] # frame data
            hdr = packet[2] # libpcap header
            # discard incomplete packets
            if hdr.caplen != hdr.len:
                # log packet number so user can diagnose issue in wireshark
                log.warning('ParsePcap: discarding incomplete packet, # %d' % packet_count)
                continue
            # parse packet
            try:
                # handle SLL packets, thanks Libo
                dltoff = dpkt.pcap.dltoff
                if pcap.dloff == dltoff[dpkt.pcap.DLT_LINUX_SLL]:
                    eth = dpkt.sll.SLL(buf)
                # otherwise, for now, assume Ethernet
                else:
                    eth = dpkt.ethernet.Ethernet(buf)
                dispatcher.add(ts, buf, eth)
            # catch errors from this packet
            except dpkt.Error as e:
                errors.append((packet, e, packet_count))
                log.warning('Error parsing packet: %s. On packet #%s' %
                            (e, packet_count))
            packet_count += 1
    except dpkt.dpkt.NeedData as error:
        log.warning(error)
        log.warning('A packet in the pcap file was too short, '
                    'debug_pkt_count=%d' % debug_pkt_count)
        errors.append((None, error))
    
