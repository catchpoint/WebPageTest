#!/usr/bin/env python
# Copyright 2017 Google Inc. All rights reserved.
# Use of this source code is governed by the Apache 2.0 license that can be
# found in the LICENSE file.
"""Chrome PDB fetch and parser"""
import os
import platform
import re
import subprocess
import urllib
import pdbparse

def get_pdb(signature):
    """Retrieve the pdb for the given signature"""
    pdb = None

    root_dir = os.path.abspath(os.path.dirname(__file__))
    dest = os.path.join(root_dir, 'chrome.dll.{0}.pdb'.format(signature))
    if os.path.isfile(dest):
        pdb = dest
    else:
        tmp = os.path.join(root_dir, 'chrome.dll.pd_')
        if os.path.isfile(tmp):
            try:
                os.remove(tmp)
            except Exception:
                pass
        url = 'https://chromium-browser-symsrv.commondatastorage.googleapis.com/'\
              'chrome.dll.pdb/{0}/chrome.dll.pd_'.format(signature)
        try:
            urllib.urlretrieve(url, tmp)
            tmp2 = os.path.join(root_dir, 'chrome.dll.pdb')
            if os.path.isfile(tmp2):
                try:
                    os.remove(tmp2)
                except Exception:
                    pass
            subprocess.check_output(['cabextract', '-d', root_dir, '-F', 'chrome.dll.pdb', tmp])
            if os.path.isfile(tmp2):
                os.rename(tmp2, dest)
                pdb = dest
            if os.path.isfile(tmp):
                try:
                    os.remove(tmp)
                except Exception:
                    pass
        except Exception:
            pass
    return pdb

class DummyOmap(object):
    """Dummy helper for malformed pdb's"""
    def remap(self, addr):
        """ dummy remap """
        return addr

def get_functions(pdb_file):
    """Get the offset for the functions we are interested in"""
    methods = {'ssl3_new': 0,
               'ssl3_free': 0,
               'ssl3_connect': 0,
               'ssl3_read_app_data': 0,
               'ssl3_write_app_data': 0}
    try:
        # Do this the hard way to avoid having to load
        # the types stream in mammoth PDB files
        pdb = pdbparse.parse(pdb_file, fast_load=True)
        pdb.STREAM_DBI.load()
        pdb._update_names()
        pdb.STREAM_GSYM = pdb.STREAM_GSYM.reload()
        if pdb.STREAM_GSYM.size:
            pdb.STREAM_GSYM.load()
        pdb.STREAM_SECT_HDR = pdb.STREAM_SECT_HDR.reload()
        pdb.STREAM_SECT_HDR.load()
        # These are the dicey ones
        pdb.STREAM_OMAP_FROM_SRC = pdb.STREAM_OMAP_FROM_SRC.reload()
        pdb.STREAM_OMAP_FROM_SRC.load()
        pdb.STREAM_SECT_HDR_ORIG = pdb.STREAM_SECT_HDR_ORIG.reload()
        pdb.STREAM_SECT_HDR_ORIG.load()
    except AttributeError:
        pass

    try:
        sects = pdb.STREAM_SECT_HDR_ORIG.sections
        omap = pdb.STREAM_OMAP_FROM_SRC
    except AttributeError:
        sects = pdb.STREAM_SECT_HDR.sections
        omap = DummyOmap()

    gsyms = pdb.STREAM_GSYM
    if not hasattr(gsyms, 'globals'):
        gsyms.globals = []
    #names = []
    for sym in gsyms.globals:
        try:
            name = sym.name.lstrip('_').strip()
            if name.startswith('?'):
                end = name.find('@')
                if end >= 0:
                    name = name[1:end]
            #names.append(name)
            if name in methods:
                off = sym.offset
                virt_base = sects[sym.segment-1].VirtualAddress
                addr = omap.remap(off+virt_base)
                if methods[name] == 0:
                    methods[name] = addr
                else:
                    methods[name] = -1
        except IndexError:
            pass
        except AttributeError:
            pass
    #with open('names.txt', 'wb') as f_out:
    #    for name in names:
    #        f_out.write(name + "\n")
    return methods

def main():
    """Startup and initialization"""
    import argparse
    parser = argparse.ArgumentParser(description='Chrome SSL Symbol Finder', prog='chromehooks')
    parser.add_argument('-s', '--signature', help="chrome.dll signature (<timestamp><size>).")
    parser.add_argument('-o', '--out', help="Write function offsets to file.")
    options, _ = parser.parse_known_args()

    if options.signature is None:
        parser.error("Missing signature")
    if not re.match(r'^[A-F0-9]{33,41}$', options.signature):
        parser.error("Invalid signature")
    if platform.system() == "Linux":
        import fcntl
        pid_file = '/tmp/chromehooks.pid'
        lock_file = open(pid_file, 'w')
        try:
            fcntl.lockf(lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except IOError:
            # another instance is running
            parser.error("Already running")

        pdb = get_pdb(options.signature)
        if pdb is not None and os.path.isfile(pdb):
            methods = get_functions(pdb)
            if methods is not None and methods['ssl3_new'] != 0:
                if options.out:
                    with open(options.out, 'wb') as f_out:
                        for method in methods:
                            f_out.write('{0} {1:d}\n'.format(method, methods[method]))
                else:
                    for method in methods:
                        print '{0} {1:d}'.format(method, methods[method])
            try:
                os.remove(pdb)
            except Exception:
                pass

if __name__ == '__main__':
    #main()
    pass
