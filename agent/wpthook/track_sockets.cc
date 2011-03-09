#include "StdAfx.h"
#include "track_sockets.h"
#include "requests.h"

const DWORD LOCALHOST = 0x0100007F; // 127.0.0.1

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
TrackSockets::TrackSockets(Requests& requests):
  _nextSocketId(1)
  , _requests(requests){
  InitializeCriticalSection(&cs);
  _openSockets.InitHashTable(257);
  _socketInfo.InitHashTable(257);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
TrackSockets::~TrackSockets(void){
  DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackSockets::Create(SOCKET s){
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackSockets::Close(SOCKET s){
  EnterCriticalSection(&cs);
  DWORD socket_id = 0;
  if (_openSockets.Lookup(s, socket_id) && socket_id)
    _requests.SocketClosed(socket_id);
  _openSockets.RemoveKey(s);
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackSockets::Connect(SOCKET s, const struct sockaddr FAR * name, 
                            int namelen){
  // we only care about IP sockets at this point
  if (namelen >= sizeof(struct sockaddr_in) && name->sa_family == AF_INET)
  {
    struct sockaddr_in * ipName = (struct sockaddr_in *)name;

    if (ipName->sin_addr.S_un.S_addr != LOCALHOST){
      ATLTRACE2(_T("[wpthook] (%d) Connecting Socket to %d.%d.%d.%d - 0x%08X\n"),
        GetCurrentThreadId(),
        ipName->sin_addr.S_un.S_un_b.s_b1, 
        ipName->sin_addr.S_un.S_un_b.s_b2, 
        ipName->sin_addr.S_un.S_un_b.s_b3, 
        ipName->sin_addr.S_un.S_un_b.s_b4, 
        ipName->sin_addr.S_un.S_addr);

      // only add it to the list if it's not connecting to localhost
      EnterCriticalSection(&cs);
      SocketInfo info;
      info._id = _nextSocketId;
      memcpy(&info._addr, ipName, sizeof(info._addr));
      _socketInfo.SetAt(info._id, info);
      _openSockets.SetAt(s, info._id);
      _nextSocketId++;
      LeaveCriticalSection(&cs);
    }
  }
}

/*-----------------------------------------------------------------------------
  Look up the socket ID (or create one if it doesn't already exist)
  and pass the data on to the request tracker
-----------------------------------------------------------------------------*/
void TrackSockets::DataIn(SOCKET s, const char * data, unsigned long data_len){
  ATLTRACE(_T("[wptdriver] - TrackSockets::DataIn() %d bytes on socket %d"),
            data_len, s);
  EnterCriticalSection(&cs);
  DWORD socket_id = 0;
  _openSockets.Lookup(s, socket_id);
  if (!socket_id) {
    socket_id = _nextSocketId;
    _openSockets.SetAt(s, socket_id);
    _nextSocketId++;
  }
  LeaveCriticalSection(&cs);

  _requests.DataIn(socket_id, data, data_len);
}

/*-----------------------------------------------------------------------------
  Look up the socket ID (or create one if it doesn't already exist)
  and pass the data on to the request tracker
-----------------------------------------------------------------------------*/
void TrackSockets::DataOut(SOCKET s, const char * data, unsigned long data_len){
  ATLTRACE(_T("[wptdriver] - TrackSockets::DataOut() %d bytes on socket %d"),
            data_len, s);
  EnterCriticalSection(&cs);
  DWORD socket_id = 0;
  _openSockets.Lookup(s, socket_id);
  if (!socket_id) {
    socket_id = _nextSocketId;
    _openSockets.SetAt(s, socket_id);
    _nextSocketId++;
  }
  LeaveCriticalSection(&cs);

  _requests.DataOut(socket_id, data, data_len);
}
