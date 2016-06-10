#!/usr/bin/env python
"""
Copyright (c) 2016, Google Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of the company nor the names of its contributors may be
      used to endorse or promote products derived from this software without
      specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE."""
import subprocess
import time

def SetPipe(options, pipe, bw, delay, plr, is_inbound):
    ok = True
    ipfw = 'ipfw pipe {0} config'.format(pipe)
    if bw > 0:
        ipfw = ipfw + ' bw {0:d}Kbit/s'.format(int(int(bw)/1000))
    if delay > 0:
        ipfw = ipfw + ' delay {0}ms'.format(delay)
    if not RunCommand(options, ipfw):
        ok = False

    ipfw = 'ipfw queue {0} config pipe {0} queue 100'.format(pipe)
    if plr > 0 and plr <= 1.0:
        ipfw = ipfw + ' plr {0}'.format(plr)
    port = 'dst'
    if is_inbound:
        port = 'src'
    ipfw = ipfw + ' mask {0}-port 0xffff'.format(port)
    if not RunCommand(options, ipfw):
        ok = False

    return ok

def RunCommand(options, command):
    ok = False
    ssh = ['ssh', '-o', 'StrictHostKeyChecking=no', options.user + '@' + options.server, command]
    print ' '.join(ssh)
    count = 0
    while not ok and count < 30:
        count += 1
        try:
            subprocess.check_call(ssh)
            ok = True
        except:
            time.sleep(1)
    return ok

def main():
    import argparse
    ok = True
    parser = argparse.ArgumentParser(description='Configure ipfw on a remote system.',
                                     prog='ipfw_config')
    parser.add_argument('--action', help="Action (set/clear).")
    parser.add_argument('--server', help="Remote server name/ip.")
    parser.add_argument('--user', help="Login user name.")
    parser.add_argument('--down_pipe', help="Pipe number for the down pipe.")
    parser.add_argument('--down_bw', help="Down bandwidth in bps.")
    parser.add_argument('--down_delay', help="Down delay in ms.")
    parser.add_argument('--down_plr', help="Down packet loss rate.")
    parser.add_argument('--up_pipe', help="Pipe number for the up pipe.")
    parser.add_argument('--up_bw', help="Up bandwidth in bps.")
    parser.add_argument('--up_delay', help="Up delay in ms.")
    parser.add_argument('--up_plr', help="Up packet loss rate.")
    parser.add_argument('--device', help="Device ID.")

    options = parser.parse_args()
    if not options.action or not options.server or not options.down_pipe or not options.up_pipe:
        parser.error("Invalid options.\n\n"
                     "Use -h to see available options")

    if not options.user:
        options.user = 'root'

    if options.action == 'clear':
        if not SetPipe(options, options.down_pipe, 0, 0, 0, True):
            ok = False
        if not SetPipe(options, options.up_pipe, 0, 0, 0, False):
            ok = False

    if options.action == 'set':
        if not SetPipe(options, options.down_pipe, options.down_bw, options.down_delay, options.down_plr, True):
            ok = False
        if not SetPipe(options, options.up_pipe, options.up_bw, options.up_delay, options.up_plr, False):
            ok = False

    if not ok:
        exit(1)

if '__main__' == __name__:
    main()
