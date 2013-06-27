#!/usr/bin/python
# -*- coding: utf-8 -*-

# Google BSD license http://code.google.com/google_bsd_license.html
# Copyright 2013 Google Inc. wrightt@google.com

#
# An SSH ProxyCommand for usbmuxd
#
# This proxy uses stdin/stdout for all I/O, which integrates well with ssh.
# In contrast, tcprelay.py binds a port for all I/O and requires manual
# start/stop.
#
# For example, if our device 40-digit serial UDID is:
#   4edeadbeefc4fbc1a2dbbf39f2123456789968c6
# then instead of using tcprelay:
#   tcprelay.py -u 4edeadbeefc4fbc1a2dbbf39f2123456789968c6 22:2222 &
#   pid=$!
#   ssh -p 2222 root@localhost
#   kill $pid
# use this proxy:
#   ssh -o "ProxyCommand sshproxy.py -u %h" root@4edeadbeefc4fbc1a2dbbf39f2123456789968c6
# which can be simplified to:
#   ssh foo
# by adding an ~/.ssh/config entry:
#   Host foo 4edeadbeefc4fbc1a2dbbf39f2123456789968c6
#      ProxyCommand /data/ios/sshproxy.py -u 4edeadbeefc4fbc1a2dbbf39f2123456789968c6
#      User root
#

import fcntl
from optparse import OptionParser
import os
import select
import sys
import time
import usbmux

# parse args
parser = OptionParser(usage="usage: %prog [-u UDID]")
parser.add_option("-u", "--udid", dest='serial', action='store',
    metavar='UDID', type='str', default=None,
    help="target specific device by its 40-digit serial UDID")
parser.add_option("-p", "--port", dest='port', action='store',
    type='int', default=22,
    help="ssh port on device, defaults to 22")
options, args = parser.parse_args()
serial = options.serial
port = options.port
if serial == '-':
  serial = None

# wait up to 1s for a matching device
mux = usbmux.USBMux(None)
dev = None
timeout = time.time() + 1.0
while True:
  devs = (mux.devices if not serial else
      [x for x in mux.devices if x.serial == serial])
  if devs:
    dev = devs[0]
    break
  rem = timeout - time.time()
  if rem <= 0:
    sys.stderr.write("No device found" if not serial else (
            "Device %s not found" % serial) + "\n")
    exit(1)
  mux.process(rem)

# connect
sys.stderr.write("Connecting to device %s\n" % str(dev))
sock = mux.connect(dev, port)
sys.stderr.write("Connection established, relaying data\n")

# relay stdin/stdout
try:
  maxbuf = 8 * 1024  # arbitrary buffer size
  recv_buf = ""  # bytes from sock.recv, pending stdout.write
  send_buf = ""  # bytes from stdin.read, pending sock.send

  # set non-blocking stdin
  fd = sys.stdin.fileno()
  fl = fcntl.fcntl(fd, fcntl.F_GETFL)
  fcntl.fcntl(fd, fcntl.F_SETFL, fl | os.O_NONBLOCK)

  # relay all I/O, similar to tcprelay.py's SocketRelay (GPLv2)
  while True:
    rlist = (([sock] if len(recv_buf) < maxbuf else []) +
        ([sys.stdin] if len(send_buf) < maxbuf else []))
    wlist = (([sys.stdout] if recv_buf else []) +
        ([sock] if send_buf else []))
    xlist = [sock, sys.stdin, sys.stdout]
    rlo, wlo, xlo = select.select(rlist, wlist, xlist)
    if xlo:
      raise RuntimeError("select error: %s\n" % (xlo,));
    if sock in wlo:
      n = sock.send(send_buf)
      send_buf = send_buf[n:]
    if sys.stdout in wlo:
      sys.stdout.write(recv_buf)
      sys.stdout.flush()
      recv_buf = ""
    if sock in rlo:
      s = sock.recv(maxbuf - len(recv_buf))
      if not s:
        raise RuntimeError("recv closed\n")
      recv_buf += s
    if sys.stdin in rlo:
      s = sys.stdin.read(maxbuf - len(send_buf))
      if not s:
        raise RuntimeError("stdin closed?\n")
      send_buf += s
finally:
  sock.close()

sys.stderr.write("Connection closed\n")
