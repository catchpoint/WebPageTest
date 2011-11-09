# $Id: telnet.py 23 2006-11-08 15:45:33Z dugsong $

"""Telnet."""

IAC    = 255	# interpret as command:
DONT   = 254	# you are not to use option
DO     = 253	# please, you use option
WONT   = 252	# I won't use option
WILL   = 251	# I will use option
SB     = 250	# interpret as subnegotiation
GA     = 249	# you may reverse the line
EL     = 248	# erase the current line
EC     = 247	# erase the current character
AYT    = 246	# are you there
AO     = 245	# abort output--but let prog finish
IP     = 244	# interrupt process--permanently
BREAK  = 243	# break
DM     = 242	# data mark--for connect. cleaning
NOP    = 241	# nop
SE     = 240	# end sub negotiation
EOR    = 239	# end of record (transparent mode)
ABORT  = 238	# Abort process
SUSP   = 237	# Suspend process
xEOF   = 236	# End of file: EOF is already used...

SYNCH  = 242    # for telfunc calls

def strip_options(buf):
    """Return a list of lines and dict of options from telnet data."""
    l = buf.split(chr(IAC))
    #print l
    b = []
    d = {}
    subopt = False
    for w in l:
        if not w:
            continue
        o = ord(w[0])
        if o > SB:
            #print 'WILL/WONT/DO/DONT/IAC', `w`
            w = w[2:]
        elif o == SE:
            #print 'SE', `w`
            w = w[1:]
            subopt = False
        elif o == SB:
            #print 'SB', `w`
            subopt = True
            for opt in ('USER', 'DISPLAY', 'TERM'):
                p = w.find(opt + '\x01')
                if p != -1:
                    d[opt] = w[p+len(opt)+1:].split('\x00', 1)[0]
            w = None
        elif subopt:
            w = None
        if w:
            w = w.replace('\x00', '\n').splitlines()
            if not w[-1]: w.pop()
            b.extend(w)
    return b, d

if __name__ == '__main__':
    import unittest

    class TelnetTestCase(unittest.TestCase):
        def test_telnet(self):
            l = []
            s = "\xff\xfb%\xff\xfa%\x00\x00\x00\xff\xf0\xff\xfd&\xff\xfa&\x05\xff\xf0\xff\xfa&\x01\x01\x02\xff\xf0\xff\xfb\x18\xff\xfb \xff\xfb#\xff\xfb'\xff\xfc$\xff\xfa \x0038400,38400\xff\xf0\xff\xfa#\x00doughboy.citi.umich.edu:0.0\xff\xf0\xff\xfa'\x00\x00DISPLAY\x01doughboy.citi.umich.edu:0.0\x00USER\x01dugsong\xff\xf0\xff\xfa\x18\x00XTERM\xff\xf0\xff\xfd\x03\xff\xfc\x01\xff\xfb\x1f\xff\xfa\x1f\x00P\x00(\xff\xf0\xff\xfd\x05\xff\xfb!\xff\xfd\x01fugly\r\x00yoda\r\x00bashtard\r\x00"
            l.append(s)
            s = '\xff\xfd\x01\xff\xfd\x03\xff\xfb\x18\xff\xfb\x1f\xff\xfa\x1f\x00X\x002\xff\xf0admin\r\x00\xff\xfa\x18\x00LINUX\xff\xf0foobar\r\x00enable\r\x00foobar\r\x00\r\x00show ip int Vlan 666\r\x00'
            l.append(s)
            s = '\xff\xfb%\xff\xfa%\x00\x00\x00\xff\xf0\xff\xfd&\xff\xfa&\x05\xff\xf0\xff\xfa&\x01\x01\x02\xff\xf0\xff\xfb&\xff\xfb\x18\xff\xfb \xff\xfb#\xff\xfb\'\xff\xfc$\xff\xfa \x0038400,38400\xff\xf0\xff\xfa#\x00doughboy.citi.umich.edu:0.0\xff\xf0\xff\xfa\'\x00\x00DISPLAY\x01doughboy.citi.umich.edu:0.0\x00USER\x01dugsong\xff\xf0\xff\xfa\x18\x00XTERM\xff\xf0\xff\xfd\x03\xff\xfc\x01\xff\xfb"\xff\xfa"\x03\x01\x03\x00\x03b\x03\x04\x02\x0f\x05\x00\xff\xff\x07b\x1c\x08\x02\x04\tB\x1a\n\x02\x7f\x0b\x02\x15\x0c\x02\x17\r\x02\x12\x0e\x02\x16\x0f\x02\x11\x10\x02\x13\x11\x00\xff\xff\x12\x00\xff\xff\xff\xf0\xff\xfb\x1f\xff\xfa\x1f\x00P\x00(\xff\xf0\xff\xfd\x05\xff\xfb!\xff\xfa"\x01\x0f\xff\xf0\xff\xfd\x01\xff\xfe\x01\xff\xfa"\x03\x01\x80\x00\xff\xf0\xff\xfd\x01werd\r\n\xff\xfe\x01yoda\r\n\xff\xfd\x01darthvader\r\n\xff\xfe\x01'
            l.append(s)
            exp = [ (['fugly', 'yoda', 'bashtard'], {'USER': 'dugsong', 'DISPLAY': 'doughboy.citi.umich.edu:0.0'}), (['admin', 'foobar', 'enable', 'foobar', '', 'show ip int Vlan 666'], {}), (['werd', 'yoda', 'darthvader'], {'USER': 'dugsong', 'DISPLAY': 'doughboy.citi.umich.edu:0.0'}) ]
            self.failUnless(map(strip_options, l) == exp)

    unittest.main()
