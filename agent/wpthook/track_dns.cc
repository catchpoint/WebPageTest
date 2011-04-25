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
bool TrackDns::LookupStart(CString& name, void *&context, 
                            CAtlArray<ADDRINFOA_ADDR> &addresses) {
  bool use_internal_dns = false;

  ATLTRACE2(_T("[wshook] (%d) DNS Lookup for '%s' started\n"), 
              GetCurrentThreadId(), (LPCTSTR)name);

  if (_test_state._active) {
    _test_state.ActivityDetected();
    EnterCriticalSection(&cs);
    DnsInfo * info = new DnsInfo(name);
    _dns_lookups.SetAt(info, info);
    context = info;
    LeaveCriticalSection(&cs);

    _test.OverrideDNSName(name);
    info->_override_addr.S_un.S_addr = _test.OverrideDNSAddress(name);
  }

  return use_internal_dns;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackDns::LookupAddress(void * context, ADDRINFOA * address) {
  if (address->ai_addrlen >= sizeof(struct sockaddr_in) && 
      address->ai_family == AF_INET)
  {
    struct sockaddr_in * ipName = (struct sockaddr_in *)address->ai_addr;
    if (context) {
      DnsInfo * info = (DnsInfo *)context;
		  if( info->_override_addr.S_un.S_addr )
        ipName->sin_addr.S_un.S_addr = info->_override_addr.S_un.S_addr;
    }
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
    _test_state.ActivityDetected();
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
