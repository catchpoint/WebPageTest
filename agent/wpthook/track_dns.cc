#include "StdAfx.h"
#include "track_dns.h"
#include "test_state.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
TrackDns::TrackDns(TestState& test_state):_test_state(test_state){
  _dns_lookups.InitHashTable(257);
  InitializeCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
TrackDns::~TrackDns(void){
  Reset();
  DeleteCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool TrackDns::LookupStart(CString & name, void *&context, 
                            CAtlArray<ADDRINFOA_ADDR> &addresses){
  bool override_dns = false;

  ATLTRACE2(_T("[wshook] (%d) DNS Lookup for '%s' started\n"), 
              GetCurrentThreadId(), (LPCTSTR)name);

  if (_test_state._active) {
    EnterCriticalSection(&cs);
    DnsInfo * info = new DnsInfo(name);
    _dns_lookups.SetAt(info, info);
    context = info;
    LeaveCriticalSection(&cs);
  }

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
void TrackDns::LookupDone(void * context, int result) {
  ATLTRACE2(_T("[wshook] (%d) DNS Lookup complete\n"), GetCurrentThreadId());

  if (_test_state._active) {
    EnterCriticalSection(&cs);
    DnsInfo * info = NULL;
    if (_dns_lookups.Lookup(context, info) && info) {
      QueryPerformanceCounter(&info->_end);
      if (!result)
        info->_success = true;
    }
    LeaveCriticalSection(&cs);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackDns::Reset() {
  EnterCriticalSection(&cs);
  POSITION pos = _dns_lookups.GetStartPosition();
  while (pos) {
    DnsInfo * info = NULL;
    void * key = NULL;
    _dns_lookups.GetNextAssoc(pos, key, info);
    if (info)
      delete info;
  }
  _dns_lookups.RemoveAll();
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool TrackDns::Claim(CString name, LONGLONG before, LONGLONG& start, 
                      LONGLONG& end) {
  bool claimed = false;
  start = 0;
  end = 0;
  EnterCriticalSection(&cs);
  POSITION pos = _dns_lookups.GetStartPosition();
  while (pos) {
    DnsInfo * info = NULL;
    void * key = NULL;
    _dns_lookups.GetNextAssoc(pos, key, info);
    if (info && !info->_accounted_for && 
        name == info->_name && info->_success && 
        info->_start.QuadPart <= before && info->_end.QuadPart <= before) {
        info->_accounted_for = true;
        if (info->_start.QuadPart > start && info->_end.QuadPart > end) {
          claimed = true;
          start = info->_start.QuadPart;
          end = info->_end.QuadPart;
        }
    }
  }
  LeaveCriticalSection(&cs);
  return claimed;
}
