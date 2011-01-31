set CYGWIN=nodosfilewarning

ipfw -q flush
ipfw -q pipe flush

ipfw pipe 1 config delay 0ms
ipfw pipe 2 config delay 0ms

ipfw add skipto 60000 proto tcp src-port 80 out
ipfw add skipto 60000 proto tcp dst-port 80 in
ipfw add skipto 60000 proto tcp src-port 445 out
ipfw add skipto 60000 proto tcp dst-port 445 in
ipfw add skipto 60000 proto tcp src-port 3389 out
ipfw add skipto 60000 proto tcp dst-port 3389 in

ipfw add pipe 1 ip from any to any in
ipfw add pipe 2 ip from any to any out

ipfw add 60000 allow ip from any to any
