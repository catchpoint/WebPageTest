#pragma once

class Requests;
class TestState;

class SocketInfo
{
public:
  SocketInfo():
    _id(0)
    , _accounted_for(false)
    , _during_test(false) {
    memset(&_addr, 0, sizeof(_addr));
    _connect_start.QuadPart = 0;
    _connect_end.QuadPart = 0;
  }
  ~SocketInfo(void){}

  DWORD               _id;
  struct sockaddr_in  _addr;
  bool                _accounted_for;
  bool                _during_test;
  LARGE_INTEGER       _connect_start;
  LARGE_INTEGER       _connect_end;
};

class TrackSockets
{
public:
  TrackSockets(Requests& requests, TestState& test_state);
  ~TrackSockets(void);

  void Create(SOCKET s);
  void Close(SOCKET s);
  void Connect(SOCKET s, const struct sockaddr FAR * name, int namelen);
  void Connected(SOCKET s);
  void Bind(SOCKET s, const struct sockaddr FAR * name, int namelen);
  void DataIn(SOCKET s, const char * data, unsigned long data_len);
  void DataOut(SOCKET s, const char * data, unsigned long data_len);
  void Reset();
  bool ClaimConnect(DWORD socket_id, LONGLONG before, LONGLONG& start,
                      LONGLONG& end);

private:
  CRITICAL_SECTION cs;
  Requests&                   _requests;
  TestState&                  _test_state;
  DWORD	_nextSocketId;	// ID to assign to the next socket
  CAtlMap<SOCKET, DWORD>	    _openSockets;
  CAtlMap<DWORD, SocketInfo*>  _socketInfo;
};
