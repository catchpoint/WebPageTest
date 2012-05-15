/******************************************************************************
Copyright (c) 2010, Google Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without 
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, 
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of the <ORGANIZATION> nor the names of its contributors 
    may be used to endorse or promote products derived from this software 
    without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE 
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL 
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER 
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, 
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
******************************************************************************/

#include "StdAfx.h"
#include "track_dns.h"
#include "test_state.h"
#include "../wptdriver/wpt_test.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
TrackDns::TrackDns(TestState& test_state, WptTest& test):
  _test_state(test_state)
  , _test(test) {
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
void * TrackDns::LookupStart(CString& name) {
  WptTrace(loglevel::kFrequentEvent, 
            _T("[wshook] (%d) DNS Lookup for '%s' started\n"), 
              GetCurrentThreadId(), (LPCTSTR)name);

  // we need to check for overrides even if we aren't active
  DnsInfo * info = new DnsInfo(name);
  _test.OverrideDNSName(name);
  info->_override_addr.S_un.S_addr = _test.OverrideDNSAddress(name);

  if (_test_state._active) {
    EnterCriticalSection(&cs);
    info->_tracked = true;
    _dns_lookups.SetAt(info, info);
    LeaveCriticalSection(&cs);
  }

  return info;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackDns::LookupAddress(void * context, ULONG &addr) {
  if (context) {
    DnsInfo * info = (DnsInfo *)context;
    CString host;
    if (info->_tracked && !_dns_hosts.Lookup(addr, host) || host.IsEmpty()) {
      _dns_hosts.SetAt(addr, info->_name);
    }
    if( info->_override_addr.S_un.S_addr )
      addr = info->_override_addr.S_un.S_addr;
    IN_ADDR address;
    address.S_un.S_addr = addr;
    WptTrace(loglevel::kFrequentEvent, 
      _T("[wshook] (%d) DNS Lookup address: %s -> %d.%d.%d.%d\n"), 
      GetCurrentThreadId(),
      info->_name,
      address.S_un.S_un_b.s_b1
      ,address.S_un.S_un_b.s_b2
      ,address.S_un.S_un_b.s_b3
      ,address.S_un.S_un_b.s_b4);
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackDns::LookupDone(void * context, int result) {
  WptTrace(loglevel::kFrequentEvent, 
            _T("[wshook] (%d) DNS Lookup complete\n"), GetCurrentThreadId());

  if (context) {
    DnsInfo * info = (DnsInfo *)context;
    if (info->_tracked && _test_state._active) {
      EnterCriticalSection(&cs);
      DnsInfo * dns_info = NULL;
      if (_dns_lookups.Lookup(context, dns_info) && dns_info) {
        QueryPerformanceCounter(&dns_info->_end);
        if (!result)
          dns_info->_success = true;
      }
      LeaveCriticalSection(&cs);
    }
    if (!info->_tracked)
      delete info;
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
  _dns_hosts.RemoveAll();
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
  For undecoded SPDY sessions (all of them), claim with IP instead of host.
-----------------------------------------------------------------------------*/
bool TrackDns::Claim(CString name, ULONG addr, LARGE_INTEGER before,
                     LARGE_INTEGER& start, LARGE_INTEGER& end) {
  bool is_claimed = false;
  if (!name.GetLength())
    name = GetHost(addr);
  EnterCriticalSection(&cs);
  POSITION pos = _dns_lookups.GetStartPosition();
  while (pos) {
    DnsInfo * info = NULL;
    void * key = NULL;
    _dns_lookups.GetNextAssoc(pos, key, info);
    if (info && !info->_accounted_for && info->_success &&
        info->_start.QuadPart <= before.QuadPart &&
        info->_end.QuadPart <= before.QuadPart &&
        name == info->_name) {
      info->_accounted_for = true;
      is_claimed = true;
      start = info->_start;
      end = info->_end;
    }
  }
  LeaveCriticalSection(&cs);
  return is_claimed;
}

/*-----------------------------------------------------------------------------
  Find the earliest start time for a DNS lookup after the given time
-----------------------------------------------------------------------------*/
LONGLONG TrackDns::GetEarliest(LONGLONG& after) {
  LONGLONG earliest = 0;
  EnterCriticalSection(&cs);
  POSITION pos = _dns_lookups.GetStartPosition();
  while (pos) {
    DnsInfo * info = NULL;
    void * key = NULL;
    _dns_lookups.GetNextAssoc(pos, key, info);
    if (info && info->_start.QuadPart &&
        info->_start.QuadPart >= after && 
        (!earliest || info->_start.QuadPart <= earliest)) {
      earliest = info->_start.QuadPart;
    }
  }
  LeaveCriticalSection(&cs);
  return earliest;
}

/*-----------------------------------------------------------------------------
  For undecoded SPDY sessions (all of them), we get the host from the IP.
-----------------------------------------------------------------------------*/
CString TrackDns::GetHost(ULONG addr) {
  CString host;
  _dns_hosts.Lookup(addr, host);
  return host;
}
