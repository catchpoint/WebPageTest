#!/usr/bin/python
# -*- coding: utf-8 -*-

# Copyright 2013 Google Inc. All Rights Reserved.
# Author: wrightt
# Modified to add "-u ${UDID}" support 

#
#	tcprelay.py - TCP connection relay for usbmuxd
#
# Copyright (C) 2009	Hector Martin "marcan" <hector@marcansoft.com>
#
# This program is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 2 or version 3.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA

import usbmux
import SocketServer
import select
from optparse import OptionParser
import sys
import threading

class SocketRelay(object):
	def __init__(self, a, b, maxbuf=65535):
		self.a = a
		self.b = b
		self.atob = ""
		self.btoa = ""
		self.maxbuf = maxbuf
	def handle(self):
		while True:
			rlist = []
			wlist = []
			xlist = [self.a, self.b]
			if self.atob:
				wlist.append(self.b)
			if self.btoa:
				wlist.append(self.a)
			if len(self.atob) < self.maxbuf:
				rlist.append(self.a)
			if len(self.btoa) < self.maxbuf:
				rlist.append(self.b)
			rlo, wlo, xlo = select.select(rlist, wlist, xlist)
			if xlo:
				return
			if self.a in wlo:
				n = self.a.send(self.btoa)
				self.btoa = self.btoa[n:]
			if self.b in wlo:
				n = self.b.send(self.atob)
				self.atob = self.atob[n:]
			if self.a in rlo:
				s = self.a.recv(self.maxbuf - len(self.atob))
				if not s:
					return
				self.atob += s
			if self.b in rlo:
				s = self.b.recv(self.maxbuf - len(self.btoa))
				if not s:
					return
				self.btoa += s
			#print "Relay iter: %8d atob, %8d btoa, lists: %r %r %r"%(len(self.atob), len(self.btoa), rlo, wlo, xlo)

class TCPRelay(SocketServer.BaseRequestHandler):
	def handle(self):
		print "Incoming connection to %d"%self.server.server_address[1]
		mux = usbmux.USBMux(options.sockpath)
        # WRIGHTT
		if not mux.devices:
			print "Waiting for devices..."
			mux.process(1.0)
		devs = (mux.devices if not self.server.rserial else
				[x for x in mux.devices if x.serial == self.server.rserial])
		if not devs:
			print "No device found" if not self.server.rserial else (
			        "Device %s not found" % self.server.rserial)
			self.request.close()
			return
		dev = devs[0]
        # /WRIGHTT
		print "Connecting to device %s"%str(dev)
		dsock = mux.connect(dev, self.server.rport)
		lsock = self.request
		print "Connection established, relaying data"
		try:
			fwd = SocketRelay(dsock, lsock, self.server.bufsize * 1024)
			fwd.handle()
		finally:
			dsock.close()
			lsock.close()
		print "Connection closed"

class TCPServer(SocketServer.TCPServer):
	allow_reuse_address = True

class ThreadedTCPServer(SocketServer.ThreadingMixIn, TCPServer):
	pass

HOST = "localhost"

parser = OptionParser(usage="usage: %prog [OPTIONS] RemotePort[[:RemoteSerial]:LocalPort]...")
parser.add_option("-t", "--threaded", dest='threaded', action='store_true', default=False, help="use threading to handle multiple connections at once")
parser.add_option("-b", "--bufsize", dest='bufsize', action='store', metavar='KILOBYTES', type='int', default=128, help="specify buffer size for socket forwarding")
parser.add_option("-s", "--socket", dest='sockpath', action='store', metavar='PATH', type='str', default=None, help="specify the path of the usbmuxd socket")
# WRIGHTT
parser.add_option("-u", "--udid", dest='serial', action='store', metavar='UDID', type='str', default=None, help="target specific device by its 40-digit serial UDID")
# /WRIGHTT 
options, args = parser.parse_args()

serverclass = TCPServer
if options.threaded:
	serverclass = ThreadedTCPServer

if len(args) == 0:
	parser.print_help()
	sys.exit(1)

ports = []

for arg in args:
	try:
		arr = arg.split(":")
		rport = int(arr[0])
		rserial = (arr[1] if len(arr) == 3 else options.serial)
		lport = int(arr[-1])
		ports.append((rport, rserial, lport))
	except:
		parser.print_help()
		sys.exit(1)

servers=[]

for rport, rserial, lport in ports:
	print "Forwarding local port %d to remote%s port %d"%(lport,
		 '' if not rserial else (" device %s" % rserial), rport)
	server = serverclass((HOST, lport), TCPRelay)
	server.rport = rport
	server.rserial = rserial
	server.bufsize = options.bufsize
	servers.append(server)

alive = True

while alive:
	try:
		rl, wl, xl = select.select(servers, [], [])
		for server in rl:
			server.handle_request()
	except:
		alive = False
