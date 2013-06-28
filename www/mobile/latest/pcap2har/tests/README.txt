What we have in this director is a set of pcaps to be used as tests for
pcap2har. Many of them exhibited specific previous bugs in pcap2har.
Also included are HAR's that are expected from the pcaps. They thus 
serve as a primitive regression test suite.

To run the tests, just run the bash script run_tests.sh. This iterates
through all the pcaps in the directory, runs pcap2har on them, and diffs
the output with saved hars to check for errors. If either pcap2har or the diff
fails, the log is saved and the script continues to check files.

Here is a list of pcaps, their properties, and where they came from.

http.pcap
Previously http.cap. A simple http pageload. It has some awkward feature
I forgot.

fhs.pcap
A complete pageload of andrewfleenor.users.sourceforge.net/fhs/fhs.xml.
Streams are gzip compressed.

fhs_ncomp.pcap
Above, but not compressed.

empty.pcap
Empty file. dpkt doesn't like it, but we have to handle it.

out-of-order.pcap
From from Dekel Amrani. A big pcap, with out-of-order starting packet on
incoming stream of tcp port 59743.

github.pcap
A pageload of github.

pcapr.net.pcap
A pageload of pcapr.net, an online pcap repository. Includes a redirect
from pcapr.net to pcapr.net/home

