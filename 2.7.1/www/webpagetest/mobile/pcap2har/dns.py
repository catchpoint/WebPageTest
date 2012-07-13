"""
Copyright 2010 Google Inc. All Rights Reserved.

Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.


Parse UDP packet for DNS queries and timings.

TODO(lsong): A detailed description of dns.
"""

__author__ = 'lsong@google.com (Libo Song)'

import sys
import dpkt
import logging
import math

class DNS:
  """
  Store and retrive DNS timings.

  The DNS object should passed around instead using a global variable to avoid
  the modules loaded can cached in different state (e.g. in Google AppEngine).
  """

  def __init__(self):
    """ Contructor."""
    self.__dns_timing__ = {}
    self.__hostname_start__ = {}

  def check_dns(self, timestamp, ip_packet):
    """Check is a packet is DNS packet, and record DNS timing.
    return True if it is DNS packet.
    """
    if isinstance(ip_packet.data, dpkt.udp.UDP):
      udp = ip_packet.data
      if udp.sport != 53 and udp.dport != 53:
        logging.debug("Unknow UDP port s:%d->d%d", udp.sport, udp.dport)
        return False
      dns = dpkt.dns.DNS(udp.data)
      if len(dns.qd) != 1:
        logging.error("DNS query size > 1: %d", len(dns.qd))
        raise
      qd = dns.qd[0]
      dns_an = getattr(dns, 'an')
      if len(dns_an) == 0:
        # DNS query
        if qd.name not in self.__hostname_start__:
          self.__hostname_start__[qd.name] = {}
          self.__hostname_start__[qd.name]['start'] = timestamp
          self.__hostname_start__[qd.name]['connected'] = 0

      # DNS response
      for an in dns_an:
        if qd.name not in self.__hostname_start__:
          # Response to query before the "capture" starts. Ignore it.
          logging.debug("unknown hostname in DNS answer: %s", qd.name)
          continue
        if hasattr(an, "ip"):
          hostname_timing = self.__hostname_start__[qd.name]
          self.__dns_timing__[an.ip] = {}
          self.__dns_timing__[an.ip]['start'] = hostname_timing['start']
          hostname_timing['end'] = timestamp
          self.__dns_timing__[an.ip]['end'] = timestamp
          self.__dns_timing__[an.ip]['connected'] = 0
          logging.debug("DNS %s: %.3f", qd.name,
                        timestamp - self.__dns_timing__[an.ip]['start'])
      return True
    return False


  def dns_time_of_connect_to_ip(self, dst_ip):
    """Get DNS qurey time for resoulting IP address.

    Note: If multiple DNS queries resulted the same IP address, the latest query
    time overrrides the pervious times.
    """
    dns_start_ts = -1
    if (dst_ip in self.__dns_timing__ and
        self.__dns_timing__[dst_ip]['connected'] == 0):
      self.__dns_timing__[dst_ip]['connected'] = 1
      dns_start_ts = self.__dns_timing__[dst_ip]['start']
    return dns_start_ts


  def dns_time_of_connect_to_host(self, host, connect_ts):
    """Get DNS qurey time for host.

    Note: If multiple DNS queries for the same hostname, the latest query
    time overrrides the pervious times.
    """
    dns_start_ts = -1
    logging.debug("check dns timing: %s (%d)", host,
                  len(self.__hostname_start__))
    if host in self.__hostname_start__:
      timing_connected =  self.__hostname_start__[host]['connected']
      if timing_connected == 0:
        self.__hostname_start__[host]['connected'] = connect_ts
      elif math.fabs(timing_connected - connect_ts) > 0.1:
        return -1
      dns_start_ts = self.__hostname_start__[host]['start']
      logging.debug("DNS timing: %s = %d", host, dns_start_ts)
    return dns_start_ts
