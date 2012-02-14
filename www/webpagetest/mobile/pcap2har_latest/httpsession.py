'''
Objects for parsing a list of HTTPFlows into data suitable for writing to a
HAR file.
'''

from datetime import datetime
from pcaputil import ms_from_timedelta, ms_from_dpkt_time
from pagetracker import PageTracker
import http
import logging as log
import settings

class Entry:
    '''
    represents an HTTP request/response in a form suitable for writing to a HAR
    file.
    Members:
    * request = http.Request
    * response = http.Response
    * page_ref = string
    * startedDateTime = python datetime
    * total_time = from sending of request to end of response, milliseconds
    * time_blocked
    * time_dnsing
    * time_connecting
    * time_sending
    * time_waiting
    * time_receiving
    '''
    def __init__(self, request, response):
        self.request = request
        self.response = response
        self.pageref = None
        self.ts_start = int(request.ts_connect*1000)
        self.startedDateTime = datetime.fromtimestamp(request.ts_connect)
        endedDateTime = datetime.fromtimestamp(response.ts_end)
        self.total_time = ms_from_timedelta(
            endedDateTime - self.startedDateTime # plus connection time, someday
        )
        # calculate other timings
        self.time_blocked = -1
        self.time_dnsing = -1
        self.time_connecting = ms_from_dpkt_time(request.ts_start -
                                                 request.ts_connect)
        self.time_sending = \
            ms_from_dpkt_time(request.ts_end - request.ts_start)
        self.time_waiting = \
            ms_from_dpkt_time(response.ts_start - request.ts_end)
        self.time_receiving = \
            ms_from_dpkt_time(response.ts_end - response.ts_start)
        # check if timing calculations are consistent
        if self.time_sending + self.time_waiting + self.time_receiving != self.total_time:
            pass
    def json_repr(self):
        '''
        return a JSON serializable python object representation of self.
        '''
        d = {
            'startedDateTime': self.startedDateTime.isoformat() + 'Z', # assume time is in UTC
            'time': self.total_time,
            'request': self.request,
            'response': self.response,
            'timings': {
                'blocked': self.time_blocked,
                'dns': self.time_dnsing,
                'connect': self.time_connecting,
                'send': self.time_sending,
                'wait': self.time_waiting,
                'receive': self.time_receiving
            },
            'cache': {},
        }
        if self.pageref:
            d['pageref'] = self.pageref
        return d
    def add_dns(self, dns_query):
        '''
        Adds the info from the dns.Query to this entry

        Assumes that the dns.Query represents the DNS query required to make
        the request. Or something like that.
        '''
        self.time_dnsing = ms_from_dpkt_time(dns_query.duration())

class UserAgentTracker(object):
    '''
    Keeps track of how many uses each user-agent header receives, and provides
    a function for finding the most-used one.
    '''
    def __init__(self):
        self.data = {} # {user-agent string: number of uses}
    def add(self, ua_string):
        '''
        Either increments the use-count for the user-agent string, or creates a
        new entry. Call this for each user-agent header encountered.
        '''
        if ua_string in self.data:
            self.data[ua_string] += 1
        else:
            self.data[ua_string] = 1
    def dominant_user_agent(self):
        '''
        Returns the agent string with the most uses.
        '''
        if not len(self.data):
            return None
        elif len(self.data) == 1:
            return self.data.keys()[0]
        else:
            # return the string from the key-value pair with the biggest value
            return max(self.data.iteritems(), key=lambda v: v[1])[0]

class HttpSession(object):
    '''
    Represents all http traffic from within a pcap.

    Members:
    * user_agents = UserAgentTracker
    * user_agent = most-used user-agent in the flow
    * flows = [http.Flow]
    * entries = [Entry], all http request/response pairs
    '''
    def __init__(self, packetdispatcher):
        '''
        parses http.flows from packetdispatcher, and parses those for HAR info
        '''
        # parse http flows
        self.flows= []
        for flow in packetdispatcher.tcp.flowdict.itervalues():
            try:
                self.flows.append(http.Flow(flow))
            except http.Error as error:
                log.warning(error)
            except dpkt.dpkt.Error as error:
                log.warning(error)
        # combine the messages into a list
        pairs = reduce(lambda p, f: p+f.pairs, self.flows, [])
        # set-up
        self.user_agents = UserAgentTracker()
        if settings.process_pages:
            self.page_tracker = PageTracker()
        else:
            self.page_tracker = None
        self.entries = []
        # sort pairs on request.ts_connect
        pairs.sort(
            key=lambda pair: pair.request.ts_connect
        )
        # iter through messages and do important stuff
        for msg in pairs:
            entry = Entry(msg.request, msg.response)
            # if msg.request has a user-agent, add it to our list
            if 'user-agent' in msg.request.msg.headers:
                self.user_agents.add(msg.request.msg.headers['user-agent'])
            # if msg.request has a referer, keep track of that, too
            if self.page_tracker:
                entry.pageref = self.page_tracker.getref(entry)
            # add it to the list
            self.entries.append(entry)
        self.user_agent = self.user_agents.dominant_user_agent()
        # handle DNS AFTER sorting
        # this algo depends on first appearance of a name
        # being the actual first mention
        names_mentioned = set()
        dns = packetdispatcher.udp.dns
        for entry in self.entries:
            name = entry.request.host
            # if this is the first time seeing the name
            if name not in names_mentioned:
                if name in dns.by_hostname:
                    # TODO: handle multiple DNS queries for now just use last one
                    entry.add_dns(dns.by_hostname[name][-1])
                names_mentioned.add(name)

    def json_repr(self):
        '''
        return a JSON serializable python object representation of self.
        '''
        d = {
            'log': {
                'version' : '1.1',
                'creator': {
                    'name': 'pcap2har',
                    'version': '0.1'
                },
                'browser': {
                    'name': self.user_agent,
                    'version': 'mumble'
                },
                'entries': sorted(self.entries, key=lambda x: x.ts_start)
            }
        }
        if self.page_tracker:
            d['log']['pages'] = self.page_tracker
        return d
