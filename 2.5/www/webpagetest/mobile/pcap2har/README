pcap2har: converts .pcap network capture files to HTTP Archive files.

mailing list: http://groups.google.com/group/pcap2har

The HAR format is still not completely supported, but the main parts are there
and features are being added.

To run the program, run main.py with two arguments: the name of the capture
file, and the HAR output filename. For example:

./main.py my.pcap my_pcap.har

The HTTP Archive (HAR) file format specification is here:
http://groups.google.com/group/http-archive-specification/web/har-1-1-spec?hl=en
It is a fairly straightforward JSON format.

pcap2har includes BeautifulSoup.py, by Leonard Richardson. It only uses the
class UnicodeDammit, for unicode encoding detection. Its capabilities will be
improved if the chardet library is also available. It can be gotten from here:
http://chardet.feedparser.org/

pcap2har is written in Python, and depends on the dpkt packet-parsing library
(http://code.google.com/p/dpkt/).
