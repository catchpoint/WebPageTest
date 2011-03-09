#include "StdAfx.h"
#include "request.h"
#include "test_state.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Request::Request(TestState& test_state, DWORD socket_id):
  _test_state(test_state)
  , _data_sent(false)
  ,_data_received(false)
  , _ms_start(0)
  , _ms_first_byte(0)
  , _ms_end(0)
  , _socket_id(socket_id) {
  QueryPerformanceCounter(&_start);
  _first_byte.QuadPart = 0;
  _end.QuadPart = 0;

  ATLTRACE(_T("[wpthook] - new request on socket %d\n"), socket_id);
}


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Request::~Request(void) {
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Request::DataIn(const char * data, unsigned long data_len) {
  ATLTRACE(_T("[wpthook] - Request::DataIn() - %d bytes\n"), data_len);

  _data_received = true;
  QueryPerformanceCounter(&_end);
  if (!_first_byte.QuadPart)
    _first_byte.QuadPart = _end.QuadPart;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Request::DataOut(const char * data, unsigned long data_len) {
  ATLTRACE(_T("[wpthook] - Request::DataOut() - %d bytes\n"), data_len);
  _data_sent = true;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Request::SocketClosed() {
  ATLTRACE(_T("[wpthook] - Request::SocketClosed()\n"));
  if (!_end.QuadPart)
    QueryPerformanceCounter(&_end);
  if (!_first_byte.QuadPart)
    _first_byte.QuadPart = _end.QuadPart;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool Request::Process() {
  bool ret = false;

  if (_start.QuadPart && _end.QuadPart) {
    if (_start.QuadPart > _test_state._start.QuadPart)
      _ms_start = (DWORD)((_start.QuadPart - _test_state._start.QuadPart)
                  / _test_state._ms_frequency.QuadPart);

    if (_first_byte.QuadPart > _test_state._start.QuadPart)
      _ms_first_byte = (DWORD)((_first_byte.QuadPart
                  - _test_state._start.QuadPart)
                  / _test_state._ms_frequency.QuadPart);

    if (_end.QuadPart > _test_state._start.QuadPart)
      _ms_end = (DWORD)((_end.QuadPart - _test_state._start.QuadPart)
                  / _test_state._ms_frequency.QuadPart);

    ret = true;
  }

  return ret;
}