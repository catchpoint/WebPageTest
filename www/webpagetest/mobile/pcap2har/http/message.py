class Message:
  '''
  Contains a dpkt.http.Request/Response, as well as other data required to
  build a HAR, including (mostly) start and end time.

  * msg: underlying dpkt class
  * data_consumed: how many bytes of input were consumed
  * seq_start: first sequence number of the Message's data in the tcpdir
  * seq_end: first sequence number past Message's data (slice-style indices)
  * ts_start: when Message started arriving (dpkt timestamp)
  * ts_end: when Message had fully arrived (dpkt timestamp)
  * body_raw: body before compression is taken into account
  '''
  def __init__(self, tcpdir, pointer, msgclass):
    '''
    Args:
    tcpdir = tcp.Direction
    pointer = position within tcpdir.data to start parsing from. byte index
    msgclass = dpkt.http.Request/Response
    '''
    # attempt to parse as http. let exception fall out to caller
    self.msg = msgclass(tcpdir.data[pointer:])
    self.data = self.msg.data
    self.data_consumed = (len(tcpdir.data) - pointer) - len(self.data)
    # calculate sequence numbers of data
    self.seq_start = tcpdir.byte_to_seq(pointer)
    self.seq_end = tcpdir.byte_to_seq(pointer + self.data_consumed)
    # calculate arrival_times
    self.ts_start = tcpdir.seq_final_arrival(self.seq_start)
    self.ts_end = tcpdir.seq_final_arrival(self.seq_end - 1)
    # get raw body
    self.raw_body = self.msg.body
