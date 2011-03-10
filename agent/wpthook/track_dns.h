#pragma once

class TestState;

typedef struct {
  ADDRINFOA			info;
  struct sockaddr_in	addr; 
} ADDRINFOA_ADDR;

class DnsInfo {
public:
  DnsInfo(CString name):
    _success(false)
    , _accounted_for(false)
    ,_name(name) {
      QueryPerformanceCounter(&_start);
      _end.QuadPart = 0;
  }
  ~DnsInfo(){}

  CString       _name;
  LARGE_INTEGER _start;
  LARGE_INTEGER _end;
  bool          _success;
  bool          _accounted_for;
};

class TrackDns
{
public:
  TrackDns(TestState& test_state);
  ~TrackDns(void);

  bool LookupStart(CString& name, void *&context, 
                              CAtlArray<ADDRINFOA_ADDR> &addresses);
  void LookupAddress(void * context, ADDRINFOA * address);
  void LookupDone(void * context, int result);
  void Reset();
  bool Claim(CString name, LONGLONG before, LONGLONG& start, LONGLONG& end);

  CAtlMap<void *, DnsInfo *>  _dns_lookups;
  CRITICAL_SECTION            cs;
  TestState&                  _test_state;
};

