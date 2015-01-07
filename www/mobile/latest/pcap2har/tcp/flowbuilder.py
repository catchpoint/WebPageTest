import flow as tcp
import logging as log

class FlowBuilder:
    '''
    Builds and stores tcp.Flow's from packets.

    Takes a series of tcp.Packet's and sorts them into the correct tcp.Flow's
    based on their socket. Exposes them in a dictionary keyed by socket. Call
    .add(pkt) for each packet. This will find the right tcp.Flow in the dict and
    call .add() on it. This class should be renamed.

    Members:
    flowdict = {socket: tcp.Flow}
    '''
    def __init__(self):
        self.flowdict = {}
    def add(self, pkt):
        '''
        filters out unhandled packets, and sorts the remainder into the correct
        flow
        '''
        #shortcut vars
        src, dst = pkt.socket
        srcip, srcport = src
        dstip, dstport = dst
        # filter out weird packets, LSONG
        if(srcport == 5223 or dstport == 5223):
            log.warning('hpvirgtrp packets are ignored')
            return
        if(srcport == 5228 or dstport == 5228):
            log.warning('hpvroom packets are ignored')
            return
        if(srcport == 443 or dstport == 443):
            log.warning('https packets are ignored')
            return
        # sort it into a tcp.Flow in flowdict
        if (src, dst) in self.flowdict:
            self.flowdict[(src, dst)].add(pkt)
        elif (dst, src) in self.flowdict:
            self.flowdict[(dst, src)].add(pkt)
        else:
            newflow = tcp.Flow()
            newflow.add(pkt)
            self.flowdict[(src, dst)] = newflow
    def finish(self):
        map(tcp.Flow.finish, self.flowdict.itervalues())
