#include "StdAfx.h"
#include "requests.h"
#include "test_state.h"
#include "track_dns.h"
#include "track_sockets.h"

const char * HTTP_METHODS[] = {"GET ", "HEAD ", "POST ", "PUT ", "OPTIONS ",
                               "DELETE ", "TRACE ", "CONNECT ", "PATCH "};

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Requests::Requests(TestState& test_state, TrackSockets& sockets,
                    TrackDns& dns):
  _test_state(test_state)
  , _sockets(sockets)
  , _dns(dns) {
  _active_requests.InitHashTable(257);
  InitializeCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Requests::~Requests(void) {
  Reset();

  DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Requests::Reset() {
  EnterCriticalSection(&cs);
  while (!_requests.IsEmpty())
    delete _requests.RemoveHead();
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Requests::Lock() {
  EnterCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Requests::Unlock() {
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Requests::SocketClosed(DWORD socket_id) {
  EnterCriticalSection(&cs);
  Request * request = NULL;
  if (_active_requests.Lookup(socket_id, request) && request) {
    request->SocketClosed();
    _active_requests.RemoveKey(socket_id);
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Requests::DataIn(DWORD socket_id, const char * data, 
                                                      unsigned long data_len) {
  if (_test_state._active) {
    // see if it maps to a known request
    EnterCriticalSection(&cs);
    Request * request = NULL;
    if (_active_requests.Lookup(socket_id, request) && request) {
      request->DataIn(data, data_len);
    } else {
      ATLTRACE(_T("[wpthook] - Requests::DataIn() not associated with ")
               _T("a known request\n"));
    }
    LeaveCriticalSection(&cs);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void Requests::DataOut(DWORD socket_id, const char * data, 
                                                      unsigned long data_len) {
  if (_test_state._active) {
    // see if we are starting a new http request
    EnterCriticalSection(&cs);
    Request * request = NULL;
    if (_active_requests.Lookup(socket_id, request) && request) {
      // we have an existing request on this socket, if data has not been
      // received then this HAS to be a continuation of the existing request
      if (request->_data_received && IsHttpRequest(data, data_len))
        request = NewRequest(socket_id);
    } else if (IsHttpRequest(data, data_len)) {
        request = NewRequest(socket_id);
    }

    if (request) {
      request->DataOut(data, data_len);
    } else {
      ATLTRACE(_T("[wpthook] - Requests::DataOut() Non-HTTP traffic detected")
               _T(" on socket %d"), socket_id);
    }
    LeaveCriticalSection(&cs);
  }
}

/*-----------------------------------------------------------------------------
  See if the beginning of the bugger matches any known HTTP method
  TODO: See if there is a more reliable way to detect HTTP traffic
-----------------------------------------------------------------------------*/
bool Requests::IsHttpRequest(const char * data, unsigned long data_len) {
  bool ret = false;

  for (int i = 0; i < _countof(HTTP_METHODS) && !ret; i++) {
    const char * method = HTTP_METHODS[i];
    unsigned long method_len = strlen(method);
    if (data_len >= method_len && !memcmp(data, method, method_len))
      ret = true;
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
Request * Requests::NewRequest(DWORD socket_id) {
  Request * request = new Request(_test_state, socket_id, _sockets, _dns);
  _active_requests.SetAt(socket_id, request);
  _requests.AddTail(request);
  return request;
}
