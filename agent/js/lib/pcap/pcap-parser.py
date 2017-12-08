#!/usr/bin/python
"""
Copyright 2016 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""
import gzip
import json
import logging
import math
import os
import struct
import time

#Globals
options = None


########################################################################################################################
#   Pcap processing
########################################################################################################################
class Pcap():
  def __init__(self):
    self.start_seconds = None
    self.start_time = None
    self.local_ethernet_mac = None
    self.slices = {'in': [], 'out': [], 'in_dup': []}
    self.bytes = {'in': 0, 'out': 0, 'in_dup': 0}
    self.streams = {}
    return


  def SaveStats(self, out):
    file_name, ext = os.path.splitext(out)
    if ext.lower() == '.gz':
      f = gzip.open(out, 'wb')
    else:
      f = open(out, 'wb')
    try:
      result = {"bytes": self.bytes}
      json.dump(result, f)
      logging.info('Result stats written to {0}'.format(out))
    except:
      logging.critical('Error writing result stats to {0}'.format(out))
    f.close()


  def SaveDetails(self, out):
    file_name, ext = os.path.splitext(out)
    if ext.lower() == '.gz':
      f = gzip.open(out, 'wb')
    else:
      f = open(out, 'wb')
    try:
      json.dump(self.slices, f)
      logging.info('Result details written to {0}'.format(out))
    except:
      logging.critical('Error writing result details to {0}'.format(out))
    f.close()


  def Print(self):
    global options
    if options.json:
      print(json.dumps(self.bytes, indent=2))
    else:
      print "Bytes Out: {0:d}".format(self.bytes['out'])
      print "Bytes In:  {0:d}".format(self.bytes['in'])
      print "Duplicate Bytes In:  {0:d}".format(self.bytes['in_dup'])


  def Process(self, pcap):
    f = None
    self.__init__() #Reset state if called multiple times
    try:
      file_name, ext = os.path.splitext(pcap)
      if ext.lower() == '.gz':
        f = gzip.open(pcap, 'rb')
      else:
        f = open(pcap, 'rb')
      bytes = f.read(24)
      # File header:
      # Magic Number - 4 bytes - 0xa1b2c3d4
      # Major Version - 2 bytes
      # Minor version - 2 bytes
      # Tz offset - 4 bytes (always 0)
      # Timestamp accuracy - 4 bytes (always 0)
      # Snapshot length - 4 bytes
      # Link layer header type - 4 bytes
      #
      # unpack constants:
      # L - unsigned long (4 byte)
      # H - unsigned short (2 byte)
      # B - unsigned char (1 byte int)
      file_header = struct.unpack("=LHHLLLL", bytes)

      # ignore byte order reversals for now
      if file_header[0] == 0xa1b2c3d4:
        ok = True
        self.linktype = file_header[6]
        if self.linktype == 1:
          self.linklen = 12
        elif self.linktype == 113:
          self.linklen = 14
        else:
          logging.critical("Unknown link layer header type: {0:d}".format(self.linktype))
          ok = False

        # Packet header:
        # Time stamp (seconds) - 4 bytes
        # Time stamp (microseconds value) - 4 bytes
        # Captured data length - 4 bytes
        # Original length - 4 bytes
        while ok:
          bytes = f.read(16)
          if not bytes or len(bytes) < 16:
            break
          (seconds, useconds, captured_length, packet_length) = struct.unpack("=LLLL", bytes)
          if self.start_seconds is None:
            self.start_seconds = seconds
          seconds -= self.start_seconds
          if packet_length and captured_length <= packet_length:
            packet_time = float(seconds) + float(useconds) / 1000000.0
            packet_info = {}
            packet_info['time'] = packet_time
            packet_info['length'] = packet_length
            packet_info['captured_length'] = captured_length
            packet_info['valid'] = False
            if captured_length:
              packet_data = f.read(captured_length)
            else:
              packet_data = None
            if len(packet_data) >= self.linklen:
              try:
                self.ProcessPacket(packet_data, packet_info)
              except Exception as e:
                print(e)
      else:
        logging.critical("Invalid pcap file " + pcap)
    except:
      logging.critical("Error processing pcap " + pcap)

    if f is not None:
      f.close()

    return


  def ProcessPacket(self, packet_data, packet_info):
    if self.linktype == 1:
      # Ethernet:
      # dst1: 2 bytes
      # dst2: 2 bytes
      # dst3: 2 bytes
      # src1: 2 bytes
      # src2: 2 bytes
      # src3: 2 bytes
      ethernet_header = struct.unpack("!HHHHHH", packet_data[0:self.linklen])
      # Ignore broadcast traffic
      packet_info['ethernet_dst'] = [ethernet_header[0], ethernet_header[1], ethernet_header[2]]
      packet_info['ethernet_src'] = [ethernet_header[3], ethernet_header[4], ethernet_header[5]]
      dst = packet_info['ethernet_dst']
      if dst[0] != 0xFFFF or dst[1] != 0xFFFF or  dst[2] != 0xFFFF:
        packet_info['valid'] = True

    elif self.linktype == 113:
      # Linux cooked capture
      # Packet Type: 2 bytes
      # aprhrd type: 2 bytes
      # Address length: 2 bytes
      # Address part 1: 4 bytes
      # Address part 2: 4 bytes
      cooked_header = struct.unpack("!HHHLL", packet_data[0:self.linklen])
      if cooked_header[0] == 0:
        packet_info['valid'] = True
        packet_info['direction'] = 'in'
      if cooked_header[0] == 4:
        packet_info['valid'] = True
        packet_info['direction'] = 'out'

    protocol = struct.unpack("!H", packet_data[self.linklen:self.linklen + 2])[0]
    if packet_info['valid'] and protocol == 0x800: # Only handle IPv4 for now
      self.ProcessIPv4Packet(packet_data[self.linklen + 2:], packet_info)

    if packet_info['valid'] and self.start_time:
      if self.local_ethernet_mac is not None:
        local = self.local_ethernet_mac
        src = packet_info['ethernet_src']
        if src[0] == local[0] and src[1] == local[1] and src[2] == local[2]:
          packet_info['direction'] = 'out'
        else:
          packet_info['direction'] = 'in'
      if 'direction' in packet_info:
        self.ProcessPacketInfo(packet_info)

    return


  def ProcessIPv4Packet(self, ip_packet, packet_info):
    # IP Header:
    # Version/len: 1 Byte (4 bits each)
    # dscp/ecn: 1 Byte
    # Total Length: 2 Bytes
    # Identification: 2 Bytes
    # Flags/Fragment: 2 Bytes
    # TTL: 1 Byte
    # Protocol: 1 Byte
    # Header Checksum: 2 Bytes
    # Source Address: 4 Bytes
    # Dest Address: 4 Bytes
    if len(ip_packet) > 20:
      ip_header = struct.unpack("!BBHHHBBHLL", ip_packet[0:20])
      header_length = (ip_header[0] & 0x0F) * 4
      total_length = ip_header[2]
      payload_length = total_length - header_length
      packet_info['ip_payload_length'] = payload_length
      packet_info['ip_protocol'] = ip_header[6]
      packet_info['ip_src'] = ip_header[8]
      addr = struct.unpack("BBBB", ip_packet[12:16])
      packet_info['ip_src_str'] = '{0:d}.{1:d}.{2:d}.{3:d}'.format(addr[0], addr[1], addr[2], addr[3])
      packet_info['ip_dst'] = ip_header[9]
      addr = struct.unpack("BBBB", ip_packet[16:20])
      packet_info['ip_dst_str'] = '{0:d}.{1:d}.{2:d}.{3:d}'.format(addr[0], addr[1], addr[2], addr[3])
      if payload_length > 0:
        payload = ip_packet[header_length:]
        if packet_info['ip_protocol'] == 6:
          self.ProcessTCPPacket(payload, packet_info)
        elif packet_info['ip_protocol'] == 17:
          self.ProcessUDPPacket(payload, packet_info)
        else:
          packet_info['valid'] = False
    else:
      packet_info['valid'] = False


  def ProcessTCPPacket(self, payload, packet_info):
    # TCP Packet Header
    # Source Port: 2 bytes
    # Dest Port: 2 bytes
    # Sequence number: 4 bytes
    # Ack number: 4 bytes
    # Header len: 1 byte (masked)
    if len(payload) > 8:
      tcp_header = struct.unpack("!HHLLB", payload[0:13])
      header_length = (tcp_header[4] >> 4 & 0x0F) * 4
      packet_info['tcp_payload_length'] = packet_info['ip_payload_length'] - header_length
      packet_info['src_port'] = tcp_header[0]
      packet_info['dst_port'] = tcp_header[1]
      packet_info['tcp_sequence'] = tcp_header[2]
      packet_info['stream_id'] = '{0}:{1:d}->{2}:{3:d}'.format(packet_info['ip_src_str'], packet_info['src_port'],
                                                               packet_info['ip_dst_str'], packet_info['dst_port'])
      # If DNS didn't trigger a start yet and we see outbound TCP traffic, use that to identify the starting point.
      # Outbound can be explicit (if we have a cooked capture like android) or implicit if dest port is 80, 443, 1080.
      if self.start_time is None:
        is_outbound = False
        if 'direction' in packet_info and packet_info['direction'] == 'out':
          is_outbound = True
        elif packet_info['dst_port'] == 80 or packet_info['dst_port'] == 443 or packet_info['dst_port'] == 1080:
          is_outbound = True
        if is_outbound:
          self.start_time = packet_info['time']
          if 'ethernet_src' in packet_info and self.local_ethernet_mac is None:
            self.local_ethernet_mac = packet_info['ethernet_src']
    else:
      packet_info['valid'] = False


  def ProcessUDPPacket(self, payload, packet_info):
    # UDP Packet header:
    # Source Port: 2 bytes
    # Dest Port: 2 bytes
    # Length (including header): 2 bytes
    # Checksum: 2 bytes
    if len(payload) > 8:
      udp_header = struct.unpack("!HHHH", payload[0:8])
      packet_info['src_port'] = udp_header[0]
      packet_info['dst_port'] = udp_header[1]
      if packet_info['dst_port'] == 53:
        self.ProcessDNSRequest(payload[8:], packet_info)
    else:
      packet_info['valid'] = False


  def ProcessDNSRequest(self, payload, packet_info):
    if 'ethernet_src' in packet_info and self.local_ethernet_mac is None:
      self.local_ethernet_mac = packet_info['ethernet_src']
    if self.start_time is None:
      self.start_time = packet_info['time']


  def ProcessPacketInfo(self, packet_info):
    elapsed = packet_info['time'] - self.start_time
    bucket = int(math.floor(elapsed * 10))

    # Make sure the time slice lists in both directions are the same size and big enough to include the current bucket
    for direction in ['in', 'out', 'in_dup']:
      length = len(self.slices[direction])
      if length <= bucket:
        need = bucket - length + 1
        self.slices[direction] += [0] * need

    # Update the actual accounting
    bytes = packet_info['length']
    direction = packet_info['direction']
    self.bytes[direction] += bytes
    self.slices[direction][bucket] += bytes

    # If it is a tcp stream, keep track of the sequence numbers and see if any of the data overlaps with previous
    # ranges on the same connection.
    if direction == 'in' and\
            'stream_id' in packet_info and\
            'tcp_sequence' in packet_info and\
            'tcp_payload_length' in packet_info and\
            packet_info['tcp_payload_length'] > 0:
      stream = packet_info['stream_id']
      data_len = packet_info['tcp_payload_length']
      stream_start = packet_info['tcp_sequence']
      stream_end = stream_start + data_len
      if stream not in self.streams:
        self.streams[stream] = []

      # Loop through all of the existing packets on the stream to see if the data is duplicate (a spurious retransmit)
      duplicate_bytes = 0
      for start, end in self.streams[stream]:
        overlap = max(0, min(end, stream_end) - max(start, stream_start))
        if overlap > duplicate_bytes:
          duplicate_bytes = overlap

      # If the entire payload is duplicate then the whole packet is duplicate
      if duplicate_bytes >= data_len:
        duplicate_bytes = packet_info['length']

      if duplicate_bytes > 0:
        self.bytes['in_dup'] += duplicate_bytes
        self.slices['in_dup'][bucket] += duplicate_bytes

      # Keep track of the current packet byte range
      self.streams[stream].append([stream_start, stream_end])


########################################################################################################################
#   Main Entry Point
########################################################################################################################
def main():
  global options
  import argparse
  parser = argparse.ArgumentParser(description='WebPageTest pcap parser.',
                                   prog='pcap-parser')
  parser.add_argument('-v', '--verbose', action='count',
                      help="Increase verbosity (specify multiple times for more). -vvvv for full debug output.")
  parser.add_argument('-i', '--input', help="Input pcap file.")
  parser.add_argument('-s', '--stats', help="Output bandwidth information file.")
  parser.add_argument('-d', '--details', help="Output bandwidth details file (time sliced bandwidth data).")
  parser.add_argument('-j', '--json', action='store_true', default=False, help="Set output format to JSON")
  options = parser.parse_args()

  # Set up logging
  log_level = logging.CRITICAL
  if options.verbose == 1:
    log_level = logging.ERROR
  elif options.verbose == 2:
    log_level = logging.WARNING
  elif options.verbose == 3:
    log_level = logging.INFO
  elif options.verbose >= 4:
    log_level = logging.DEBUG
  logging.basicConfig(level=log_level, format="%(asctime)s.%(msecs)03d - %(message)s", datefmt="%H:%M:%S")

  if not options.input:
    parser.error("Input trace file is not specified.")

  start = time.time()
  pcap = Pcap()
  pcap.Process(options.input)

  if options.stats:
    pcap.SaveStats(options.stats)
  if options.details:
    pcap.SaveDetails(options.details)
  pcap.Print()

  end = time.time()
  elapsed = end - start
  logging.debug("Elapsed Time: {0:0.4f}".format(elapsed))

if '__main__' == __name__:
  main()
