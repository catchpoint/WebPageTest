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
#include "wpthook.h"
#include "../wptdriver/wpt_test.h"

static LPCTSTR blocked_domains[] = {
  _T(".pack.google.com"),     // Chrome crx update URL
  _T(".gvt1.com"),            // Chrome crx update URL
  _T("clients1.google.com"),  // Autofill update downloads
  _T("shavar.services.mozilla.com"), // Firefox tracking protection updates
  NULL
};

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
bool TrackDns::BlockLookup(CString name) {
  bool block = false;

  // Check the hard-coded block list
  LPCTSTR * domain = blocked_domains;
  name.MakeLower();
  while (*domain && !block) {
    if (name.Find(*domain) != -1)
      block = true;
    domain++;
  }

  // Check the list from the blockDomains script command
  if (!_test._block_domains.IsEmpty()) {
    POSITION pos = _test._block_domains.GetHeadPosition();
    while (!block && pos) {
      CString block_domain = _test._block_domains.GetNext(pos);
      if (!block_domain.CompareNoCase(name))
        block = true;
    }
  }

  // Check the list from the blockDomainsExcept script command
  if (!_test._block_domains_except.IsEmpty()) {
    block = true;
    POSITION pos = _test._block_domains_except.GetHeadPosition();
    while (block && pos) {
      CString allow_domain = _test._block_domains_except.GetNext(pos);
      if (!allow_domain.CompareNoCase(name))
        block = false;
    }
  }

  return block;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void * TrackDns::LookupStart(CString& name) {
  if (!name.GetLength() || name == _T("127.0.0.1"))
    return NULL;

  WptTrace(loglevel::kFrequentEvent, 
            _T("[wshook] (%d) DNS Lookup for '%s' started\n"), 
              GetCurrentThreadId(), (LPCTSTR)name);
  CheckCDN(name, name);

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
    EnterCriticalSection(&cs);
    AddAddress(info->_name, addr);
    CString host;
    if (info->_tracked && !_dns_hosts.Lookup(addr, host) || host.IsEmpty()) {
      _dns_hosts.SetAt(addr, info->_name);
    }
    if( info->_override_addr.S_un.S_addr )
      addr = info->_override_addr.S_un.S_addr;
    LeaveCriticalSection(&cs);
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
    _test_state.ActivityDetected();
  }
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackDns::LookupAlias(CString name, CString alias) {
  CheckCDN(name, alias);
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
    _test_state.ActivityDetected();
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
  Claim all matching DNS lookups but use the timing from the earliest
  completed one (multiple lookups will use cached results)
-----------------------------------------------------------------------------*/
bool TrackDns::Claim(CString name, ULONG addr, LARGE_INTEGER before,
                     LARGE_INTEGER& start, LARGE_INTEGER& end) {
  bool is_claimed = false;
  if (!name.GetLength())
    name = GetHost(addr);
  start.QuadPart = 0;
  end.QuadPart = 0;
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
      if (!start.QuadPart ||
          (info->_start.QuadPart < start.QuadPart && info->_end.QuadPart > 0)) {
        start = info->_start;
        end = info->_end;
      }
    }
  }
  LeaveCriticalSection(&cs);
  return is_claimed;
}

/*-----------------------------------------------------------------------------
  Mark all lookups as claimed
-----------------------------------------------------------------------------*/
void TrackDns::ClaimAll() {
  EnterCriticalSection(&cs);
  POSITION pos = _dns_lookups.GetStartPosition();
  while (pos) {
    DnsInfo * info = NULL;
    void * key = NULL;
    _dns_lookups.GetNextAssoc(pos, key, info);
    if (info)
      info->_accounted_for = true;
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
  See if we can find a DNS lookup for the given host
-----------------------------------------------------------------------------*/
bool TrackDns::Find(CString name, DNSAddressList &addresses,
                    LARGE_INTEGER& start, LARGE_INTEGER& end) {
  bool found = false;
  addresses.RemoveAll();
  EnterCriticalSection(&cs);
  POSITION pos = _dns_lookups.GetStartPosition();
  while (pos && !found) {
    DnsInfo * info = NULL;
    void * key = NULL;
    _dns_lookups.GetNextAssoc(pos, key, info);
    if (info && info->_success && name == info->_name) {
      found = true;
      start = info->_start;
      end = info->_end;
    }
  }
  if (found) {
    pos = _host_addresses.GetHeadPosition();
    bool done = false;
    while (pos && !done) {
      DnsHostAddresses& host_addresses = _host_addresses.GetNext(pos);
      if (host_addresses.name_ == name) {
        addresses.AddTailList(&host_addresses.addresses_);
        done = true;
      }
    }
  }
  LeaveCriticalSection(&cs);
  return found;
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
  EnterCriticalSection(&cs);
  _dns_hosts.Lookup(addr, host);
  LeaveCriticalSection(&cs);
  return host;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackDns::AddAddress(CString host, DWORD address) {
  bool found = false;
  EnterCriticalSection(&cs);
  POSITION pos = _host_addresses.GetHeadPosition();
  while (pos && !found) {
    DnsHostAddresses& host_addresses = _host_addresses.GetNext(pos);
    if (host_addresses.name_ == host) {
      host_addresses.AddAddress(address);
      found = true;
    }
  }
  if (!found) {
    DnsHostAddresses host_addresses;
    host_addresses.name_ = host;
    host_addresses.AddAddress(address);
    _host_addresses.AddTail(host_addresses);
  }
  LeaveCriticalSection(&cs);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
size_t TrackDns::GetAddressCount(CString host) {
  size_t count = 0;
  bool found = false;
  EnterCriticalSection(&cs);
  POSITION pos = _host_addresses.GetHeadPosition();
  while (pos && !found) {
    DnsHostAddresses& host_addresses = _host_addresses.GetNext(pos);
    if (host_addresses.name_ == host) {
      count = host_addresses.addresses_.GetCount();
      found = true;
    }
  }
  LeaveCriticalSection(&cs);
  return count;
}

// Use the globally defined CDN list from header file cdn.h
typedef struct {
  CStringA pattern;
  CStringA name;
} CDN_PROVIDER;
extern CDN_PROVIDER cdnList[];

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void TrackDns::CheckCDN(CString host, CString name) {
  CDN_PROVIDER * cdn = cdnList;
  CStringA provider;
  CStringA name_a = (LPCSTR)CT2A(name);
  CStringA host_a = (LPCSTR)CT2A(host);
  while (provider.IsEmpty() &&
         cdn->pattern && 
         cdn->pattern.CompareNoCase("END_MARKER"))  {
    if (name_a.Find(cdn->pattern) >= 0)
      provider = cdn->name;
    cdn++;
  }
  if (!provider.IsEmpty()) {
    // add an entry for the host name if we don't already have one
    bool found = false;
    EnterCriticalSection(&cs);
    POSITION pos = _cdn_hosts.GetHeadPosition();
    while (pos && !found) {
      CDNEntry &entry = _cdn_hosts.GetNext(pos);
      found = entry._name == host_a;
    }
    if (!found) {
      CDNEntry entry;
      entry._name = host_a;
      entry._provider = provider;
      _cdn_hosts.AddTail(entry);
    }
    LeaveCriticalSection(&cs);
  }
}

/*-----------------------------------------------------------------------------
  Return the CDN provider (if any) for the given host name
-----------------------------------------------------------------------------*/
CStringA TrackDns::GetCDNProvider(CString host) {
  CStringA provider;
  EnterCriticalSection(&cs);
  if (!_cdn_hosts.IsEmpty()) {
    POSITION pos = _cdn_hosts.GetHeadPosition();
    while (provider.IsEmpty() && pos) {
      CDNEntry &entry = _cdn_hosts.GetNext(pos);
      if (!host.CompareNoCase((LPCTSTR)CA2T(entry._name, CP_UTF8)))
        provider = entry._provider;
    }
  }
  LeaveCriticalSection(&cs);
  return provider;
}
