#pragma once

class TestState;

class Request
{
public:
  Request(TestState& test_state, DWORD socket_id);
  ~Request(void);

  void DataIn(const char * data, unsigned long data_len);
  void DataOut(const char * data, unsigned long data_len);
  void SocketClosed();
  bool Process();

  bool _data_sent;
  bool _data_received;
  DWORD _socket_id;

  // times (in ms from the test start)
  DWORD _ms_start;
  DWORD _ms_first_byte;
  DWORD _ms_end;

private:
  TestState&    _test_state;
  LARGE_INTEGER _start;
  LARGE_INTEGER _first_byte;
  LARGE_INTEGER _end;
};

