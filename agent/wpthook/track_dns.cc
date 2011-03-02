#include "StdAfx.h"
#include "track_dns.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
TrackDns::TrackDns(void){
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
TrackDns::~TrackDns(void){
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool TrackDns::LookupStart(CString & name, void *&context, 
                            CAtlArray<ADDRINFOA_ADDR> &addresses){
  bool override_dns = false;

  ATLTRACE2(_T("[wshook] (%d) DNS Lookup for '%s' started\n"), 
              GetCurrentThreadId(), (LPCTSTR)name);

  return override_dns;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackDns::LookupAddress(void * context, ADDRINFOA * address){
  if( address->ai_addrlen >= sizeof(struct sockaddr_in) && 
      address->ai_family == AF_INET )
  {
    struct sockaddr_in * ipName = (struct sockaddr_in *)address->ai_addr;
    ATLTRACE2(_T("[wshook] (%d) DNS Lookup address: %d.%d.%d.%d\n"), 
      GetCurrentThreadId(),
      ipName->sin_addr.S_un.S_un_b.s_b1
      ,ipName->sin_addr.S_un.S_un_b.s_b2
      ,ipName->sin_addr.S_un.S_un_b.s_b3
      ,ipName->sin_addr.S_un.S_un_b.s_b4);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackDns::LookupDone(void * context){
  ATLTRACE2(_T("[wshook] (%d) DNS Lookup complete\n"), GetCurrentThreadId());
}
