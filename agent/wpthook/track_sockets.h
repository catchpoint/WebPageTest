#pragma once

class SocketInfo
{
public:
  SocketInfo(void):_id(0){
    memset(&_addr, 0, sizeof(_addr));
  }
  SocketInfo(const SocketInfo& src){*this = src;}
  ~SocketInfo(void){}

  const SocketInfo& operator =(const SocketInfo& src){
    _id = src._id;
    memcpy(&_addr, &src._addr, sizeof(_addr));
    return src;
  }

  DWORD               _id;
  struct sockaddr_in  _addr;
};

class TrackSockets
{
public:
  TrackSockets(void);
  ~TrackSockets(void);

  void Create(SOCKET s);
  void Close(SOCKET s);
  void Connect(SOCKET s, const struct sockaddr FAR * name, int namelen);
  void Bind(SOCKET s, const struct sockaddr FAR * name, int namelen);

private:
  CRITICAL_SECTION cs;
	DWORD	_nextSocketId;	// ID to assign to the next socket
  CAtlMap<SOCKET, DWORD>	    _openSockets;
  CAtlMap<DWORD, SocketInfo>  _socketInfo;
};
