import seq

class Chunk:
    '''
    A chunk of data from a TCP stream in the process of being merged. Takes the
    place of the data tuples, ((begin, end), data, logger) in the old algorithm.
    Adds member functions that encapsulate the main merging logic.
    '''
    def __init__(self):
        '''
        Basic initialization on the chunk.
        '''
        self.data = ''
        self.seq_start = None
        self.seq_end = None

    def merge(self, new, new_seq_callback = None):
        '''
        Attempts to merge the packet or chunk with the existing data. Returns
        details of the operation's success or failure.

        Args:
        new = TCPPacket or TCPChunk
        new_seq_callback = callable(int) or None

        new_seq_callback is a function that will be called with sequence numbers
        of the start of data that has arrived for the first time.

        Returns:
        (overlapped, (added_front_data, added_back_data)): (bool, (bool, bool))

        Overlapped indicates whether the packet/chunk overlapped with the
        existing data. If so, you can stop trying to merge with other packets/
        chunks. The bools in the other tuple indicate whether data was added to
        the front or back of the existing data.

        Note that (True, (False, False)) is a valid value, which indicates that
        the new data was completely inside the existing data
        '''
        # if we have actual data yet (maybe false if there was no init packet)
        if new.data:
            # assume self.seq_* are also valid
            if self.data:
                return self.inner_merge((new.seq_start, new.seq_end),
                                        new.data, new_seq_callback)
            else:
                # if they have data and we don't, just steal theirs
                self.data = new.data
                self.seq_start = new.seq_start
                self.seq_end = new.seq_end
                if new_seq_callback:
                    new_seq_callback(new.seq_start)
                return (True, (True, True))
        # else, there is no data anywhere
        return (False, (False, False))

    def inner_merge(self, newseq, newdata, callback):
        '''
        Internal implementation function for merging, very similar in interface
        to merge_pkt, but concentrates on the nitty-gritty logic of merging, as
        opposed to the high-level logic of merge().

        Args:
        newseq = (seq_begin, seq_end)
        newdata = string, new data
        callback = see new_seq_callback in merge_pkt

        Returns:
        see merge_pkt
        '''
        # setup
        overlapped = False
        added_front_data = False
        added_back_data = False
        # front data?
        if (seq.lt(newseq[0], self.seq_start) and
            seq.lte(self.seq_start, newseq[1])):
            new_data_length = seq.subtract(self.seq_start, newseq[0])
            # slice out new data, stick it on the front
            self.data = newdata[:new_data_length] + self.data
            self.seq_start = newseq[0]
            # notifications
            overlapped = True
            added_front_data = True
            if callback:
                callback(newseq[0])
        # back data?
        if seq.lte(newseq[0], self.seq_end) and seq.lt(self.seq_end, newseq[1]):
            new_data_length = seq.subtract(newseq[1], self.seq_end)
            self.data += newdata[-new_data_length:]
            self.seq_end += new_data_length
            # notifications
            overlapped = True
            added_back_data = True
            if callback:
                # the first seq number of new data in the back
                back_seq_start = newseq[1] - new_data_length
                callback(back_seq_start)
        # completely inside?
        if (seq.lte(self.seq_start, newseq[0]) and
            seq.lte(newseq[1], self.seq_end)):
            overlapped = True
        # done
        return (overlapped, (added_front_data, added_back_data))
