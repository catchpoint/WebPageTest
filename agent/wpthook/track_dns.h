#pragma once

typedef struct {
	ADDRINFOA			info;
	struct sockaddr_in	addr; 
} ADDRINFOA_ADDR;

class TrackDns
{
public:
  TrackDns(void);
  ~TrackDns(void);

  bool LookupStart(CString & name, void *&context, 
                              CAtlArray<ADDRINFOA_ADDR> &addresses);
  void LookupAddress(void * context, ADDRINFOA * address);
  void LookupDone(void * context);
};

