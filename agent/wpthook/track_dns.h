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

#pragma once

class TestState;
class WptTest;

typedef struct {
  ADDRINFOA			info;
  struct sockaddr_in	addr; 
} ADDRINFOA_ADDR;

class DnsInfo {
public:
  DnsInfo(CString name):
    _success(false)
    , _accounted_for(false)
    , _tracked(false)
    ,_name(name) {
      QueryPerformanceCounter(&_start);
      _end.QuadPart = 0;
      _override_addr.S_un.S_addr = 0;
  }
  ~DnsInfo(){}

  CString         _name;
  LARGE_INTEGER   _start;
  LARGE_INTEGER   _end;
  bool            _success;
  bool            _accounted_for;
  bool            _tracked;
  struct in_addr	_override_addr;
};

typedef CAtlList<DWORD> DNSAddressList;

class DnsHostAddresses {
public:
  DnsHostAddresses(){}
  DnsHostAddresses(const DnsHostAddresses& src){*this = src;}
  ~DnsHostAddresses(void){}
  const DnsHostAddresses& operator =(const DnsHostAddresses& src){
    name_ = src.name_;
    addresses_.RemoveAll();
    POSITION pos = src.addresses_.GetHeadPosition();
    while (pos)
      addresses_.AddTail(src.addresses_.GetNext(pos));
    return src;
  }
  void AddAddress(DWORD address){
    bool found = false;
    POSITION pos = addresses_.GetHeadPosition();
    while (pos && !found) {
      if (address == addresses_.GetNext(pos))
        found = true;
    }
    if (!found)
      addresses_.AddTail(address);
  }
  CString         name_;
  DNSAddressList  addresses_;
};

class CDNEntry {
public:
  CDNEntry(void){}
  CDNEntry(const CDNEntry& src){ *this = src; }
  ~CDNEntry(void){}
  const CDNEntry& operator =(const CDNEntry& src) {
    _name = src._name;
    _provider = src._provider;
    return src;
  }
  
  CStringA _name;
  CStringA _provider;
};

class TrackDns {
public:
  TrackDns(TestState& test_state, WptTest& test);
  ~TrackDns(void);

  bool BlockLookup(CString name);
  void * LookupStart(CString& name);
  void LookupAddress(void * context, ULONG &addr);
  void LookupAlias(CString name, CString alias);
  void LookupDone(void * context, int result);
  void Reset();
  bool Claim(CString name, ULONG addr, LARGE_INTEGER before,
             LARGE_INTEGER& start, LARGE_INTEGER& end);
  void ClaimAll();
  bool Find(CString name, DNSAddressList &addresses,
            LARGE_INTEGER& start, LARGE_INTEGER& end);
  LONGLONG  GetEarliest(LONGLONG& after);
  void AddAddress(CString host, DWORD address);
  size_t GetAddressCount(CString host);
  CStringA GetCDNProvider(CString host);

  CAtlMap<void *, DnsInfo *>  _dns_lookups;
  CAtlMap<ULONG, CString>     _dns_hosts;
  CRITICAL_SECTION            cs;
  TestState&                  _test_state;
  WptTest&                    _test;
  CAtlList<DnsHostAddresses>  _host_addresses;
  CAtlList<CDNEntry>          _cdn_hosts;

private:
  void CheckCDN(CString host, CString name);
  CString GetHost(ULONG addr);
};
