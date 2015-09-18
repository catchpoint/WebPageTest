set CYGWIN=nodosfilewarning

ipfw -q flush
ipfw -q pipe flush

ipfw pipe 1 config delay 0ms noerror
ipfw pipe 2 config delay 0ms noerror
ipfw queue 1 config pipe 1 queue 100 noerror mask dst-port 0xffff
ipfw queue 2 config pipe 2 queue 100 noerror mask src-port 0xffff

ipfw add skipto 60000 proto tcp src-port 80 out
ipfw add skipto 60000 proto tcp dst-port 80 in
ipfw add skipto 60000 proto tcp src-port 445 out
ipfw add skipto 60000 proto tcp dst-port 445 in
ipfw add skipto 60000 proto tcp src-port 3389 out
ipfw add skipto 60000 proto tcp dst-port 3389 in

ipfw add queue 1 ip from any to any in
ipfw add queue 2 ip from any to any out

ipfw add 60000 allow ip from any to any
