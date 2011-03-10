#pragma once
#include "request.h"

class TestState;
class TrackSockets;
class TrackDns;

class Requests
{
public:
  Requests(TestState& test_state, TrackSockets& sockets, TrackDns& dns);
  ~Requests(void);

  void SocketClosed(DWORD socket_id);
  void DataIn(DWORD socket_id, const char * data, unsigned long data_len);
  void DataOut(DWORD socket_id, const char * data, unsigned long data_len);

  void Lock();
  void Unlock();
  void Reset();

  CAtlList<Request *>       _requests;        // all requests
  CAtlMap<DWORD, Request *> _active_requests; // requests indexed by socket

private:
  CRITICAL_SECTION  cs;
  TestState&        _test_state;
  TrackSockets&     _sockets;
  TrackDns&         _dns;

  bool IsHttpRequest(const char * data, unsigned long data_len);

  // internal only and must be protected with a critical section by the caller
  Request * NewRequest(DWORD socket_id);  
};

