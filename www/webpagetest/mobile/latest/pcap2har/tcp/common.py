import dpkt

# util functions

def detect_handshake(packets):
    '''
    Checks whether the passed list of tcp.Packet's represents a valid TCP
    handshake. Returns True or False.
    '''
    #from dpkt.tcp import * # get TH_* constants
    if len(packets) < 3:
        return False
    if len(packets) > 3:
        log.error('too many packets for detect_handshake')
        return False
    syn, synack, ack = packets
    fwd_seq = None
    rev_seq = None
    if syn.tcp.flags & dpkt.tcp.TH_SYN and not syn.tcp.flags & dpkt.tcp.TH_ACK:
        # have syn
        fwd_seq = syn.seq # start_seq is the seq field of the segment
        if (synack.flags & dpkt.tcp.TH_SYN and
            synack.flags & dpkt.tcp.TH_ACK and
            synack.ack == fwd_seq + 1):
            # have synack
            rev_seq = synack.seq
            if (ack.flags & dpkt.tcp.TH_ACK and
                ack.ack == rev_seq + 1 and
                ack.seq == fwd_seq + 1):
                # have ack
                return True
    return False
