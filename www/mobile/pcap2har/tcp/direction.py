from sortedcollection import SortedCollection
import tcp

class Direction:
  '''
  Represents data moving in one direction in a TCP flow.

  Members:
  * chunks = [tcp.Chunk], sorted by seq_start
  * flow = tcp.Flow, the flow to which the direction belongs
  * seq_start = the sequence number at which the data starts, after finish()
  * arrival_data = [(seq_num, pkt)] or SortedCollection
  * final_arrival_data = SortedCollection, after calculate_final_arrivals()
  '''
  def __init__(self, flow):
    '''
    Sets things up for adding packets.

    Args:
    flow = tcp.Flow
    '''
    self.arrival_data = []
    self.final_arrival_data = None #
    self.closed_cleanly = False # until proven true
    self.chunks = []
    self.flow = flow
    # the seq number of the first byte of data,
    # valid after finish() if self.data is valid
    self.seq_start= None
  def add(self, pkt):
    '''
    Merge the packet into the first chunk it overlaps with. If data was
    added to the end of a chunk, attempts to merge the next chunk (if there
    is one). This way, it is ensured that everything is as fully merged as
    it can be with the current data.

    Args:
    pkt = tcp.Packet
    '''
    # discard packets with no payload. we don't care about them here
    if pkt.data == '':
      return
    # attempt to merge packet with existing chunks
    merged = False
    for i in range(len(self.chunks)):
      chunk = self.chunks[i]
      overlapped, result = chunk.merge(pkt, self.create_merge_callback(pkt))
      if overlapped: # if the data overlapped
        # if data was added on the back and there is a chunk after this
        if result[1] and i < (len(self.chunks)-1):
          # try to merge with the next chunk as well in case that packet
          # bridged the gap
          overlapped2, result2 = chunk.merge(self.chunks[i+1])
          if overlapped2: # if that merge worked
            # data should only be added to back
            assert( (not result2[0]) and (result2[1]))
            del self.chunks[i+1] # remove the now-redundant chunk
        merged = True
        break # skip further chunks
    if not merged:
      # Nothing is overlapped with the packet. We need a new chunk.
      self.new_chunk(pkt)

  def finish(self):
    '''
    Notifies the direction that there are no more packets coming. This means
    that self.data can be decided upon, and arrival_data can be converted to
    a SortedCollection for querying
    '''
    # set data to the data from the first chunk, if there is one
    if self.chunks:
      self.data = self.chunks[0].data
      self.seq_start = self.chunks[0].seq_start
    else:
      self.data = ''
    self.arrival_data = SortedCollection(self.arrival_data, key=lambda v: v[0])
  def calculate_final_arrivals(self):
    '''
    make self.final_arrival_data a SortedCollection. Final arrival
    for a sequence number is when that sequence number of data and all the
    data before it have arrived, that is, when the data is usable by the
    application. Must be called after self.finish().
    '''
    self.final_arrival_data = []
    peak_time = 0.0
    # final arrival vertex always coincides with an arrival vertex
    for vertex in self.arrival_data:
      if vertex[1].ts > peak_time:
        peak_time = vertex[1].ts
        self.final_arrival_data.append((vertex[0], vertex[1].ts))
    self.final_arrival_data = SortedCollection(self.final_arrival_data,
                                               key=lambda v: v[0])

  def new_chunk(self, pkt):
    '''
    creates a new tcp.Chunk for the pkt to live in. Only called if an
    attempt has been made to merge the packet with all existing chunks.
    '''
    chunk = tcp.Chunk()
    chunk.merge(pkt, self.create_merge_callback(pkt))
    self.chunks.append(chunk)
    self.sort_chunks() # it would be better to insert the packet sorted
  def sort_chunks(self):
    self.chunks.sort(key=lambda chunk: chunk.seq_start)
  def create_merge_callback(self, pkt):
    '''
    Returns a function that will serve as a callback for Chunk. It will
    add the passed sequence number and the packet to self.arrival_data.
    '''
    def callback(seq_num):
      self.arrival_data.append((seq_num, pkt))
    return callback
  def byte_to_seq(self, byte):
    '''
    Converts the passed byte index to a sequence number in the stream. byte
    is assumed to be zero-based.
    '''
    if self.seq_start:
      return byte + self.seq_start
    else:
      return byte + self.flow.first_packet.seq

  def seq_arrival(self, seq_num):
    '''
    returns the packet in which the specified sequence number first arrived.
    self.arrival_data must be a SortedCollection at this point;
    self.finish() must have been called.
    '''
    if self.arrival_data:
      return self.arrival_data.find_le(seq_num)[1]
  def seq_final_arrival(self, seq_num):
    '''
    Returns the time at which the seq number had fully arrived. Will
    calculate final_arrival_data if it has not been already. Only callable
    after self.finish()
    '''
    if not self.final_arrival_data:
      self.calculate_final_arrivals()
    return self.final_arrival_data.find_le(seq_num)[1]
