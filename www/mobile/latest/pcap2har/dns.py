import logging as log

class Packet:
    '''
    A DNS packet, wrapped for convenience and with the pcap timestamp

    For the most part, assumes that there is only one question in the packet.
    Any others are recorded but not taken into account in any calculations

    Members:
    ts = timestamp
    names = list of names asked about
    dns = dpkt.dns.DNS
    '''
    def __init__(self, ts, pkt):
        '''
        ts = pcap timestamp
        pkt = dpkt.dns.DNS
        '''
        self.ts = ts
        self.dns = pkt
        self.txid = pkt.id
        self.names = [q.name for q in pkt.qd]
        if len(self.names) > 1:
            log.warning('DNS packet with multiple questions')
    def name(self):
        return self.names[0]

class Query:
    '''
    A DNS question/answer conversation with a single ID

    Member:
    txid = id that all packets must match
    started_ts = time of first packet
    last_ts = time of last known packet
    name = domain name being discussed
    resolved = Bool, whether the question has been answered
    '''
    def __init__(self, initial_packet):
        '''
        initial_packet = dns.Packet, simply the first one on the wire with
        a given ID.
        '''
        self.txid = initial_packet.txid
        self.started_time = initial_packet.ts
        self.last_ts = initial_packet.ts
        self.resolved = False
        self.name = initial_packet.name()
    def add(self, pkt):
        '''
        pkt = dns.Packet
        '''
        assert(pkt.txid == self.txid)
        self.last_ts = max(pkt.ts, self.last_ts)
        # see if this resolves the query
        if len(pkt.dns.an) > 0:
            self.resolved = True
    def duration(self):
        return self.last_ts - self.started_time

class Processor:
    '''
    Processes and interprets DNS packets.

    Call its `add` method with each dns.Packet from the pcap.

    Members:
    queries = {txid: Query}
    by_hostname = {string: [Query]}
    '''
    def __init__(self):
        self.queries = {}
        self.by_hostname = {}
    def add(self, pkt):
        '''
        adds the packet to a Query object by id, and makes sure that Queryies
        are also index by hostname as well.

        pkt = dns.Packet
        '''
        if pkt.txid in self.queries:
            self.queries[pkt.txid].add(pkt)
        else:
            # if we're adding a new query, index it by name too
            new_query = Query(pkt)
            self.queries[pkt.txid] = new_query
            self.add_by_name(new_query)
    def add_by_name(self, query):
        name = query.name
        if name in self.by_hostname:
            self.by_hostname[name].append(query)
        else:
            self.by_hostname[name] = [query]
    def get_resolution_time(self, hostname):
        '''
        Returns the last time it took to resolve the hostname.

        Assumes that the lists in by_hostname are ordered by increasing time.
        Uses the figure from the last Query. If the hostname is not present,
        return None
        '''
        try:
            return self.by_hostname[hostname][-1].duration()
        except KeyError:
            return None
    def num_queries(self, hostname):
        '''
        Returns the number of DNS requests for that name
        '''
        try:
            return len(self.by_hostname[hostname])
        except KeyError:
            return 0
