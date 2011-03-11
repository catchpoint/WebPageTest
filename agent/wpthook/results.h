#pragma once

class Requests;
class Request;
class TestState;
class TrackSockets;

class Results
{
public:
  Results(TestState& test_state, Requests& requests, TrackSockets& sockets);
  ~Results(void);

  void Reset(void);
  void Save(void);

  // test information
  CString _url;

  // high-level metrics
  int _on_load_time;
  int _activity_time;

private:
  CString     _file_base;
  Requests&   _requests;
  TestState&  _test_state;
  TrackSockets& _sockets;

  void SavePageData(void);
  void SaveRequests(void);
  void SaveRequest(HANDLE file, Request * request, int index);
};

