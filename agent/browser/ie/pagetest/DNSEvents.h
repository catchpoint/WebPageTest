/*
Copyright (c) 2005-2007, AOL, LLC.

All rights reserved.

Redistribution and use in source and binary forms, with or without modification, 
are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, 
		this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice, 
		this list of conditions and the following disclaimer in the documentation 
		and/or other materials provided with the distribution.
    * Neither the name of the company nor the names of its contributors may be 
		used to endorse or promote products derived from this software without 
		specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

#pragma once
#include "PagetestReporting.h"

class DnsHostAddresses {
public:
  DnsHostAddresses(){}
  DnsHostAddresses(const DnsHostAddresses& src){*this = src;}
  ~DnsHostAddresses(void){}
  const DnsHostAddresses& operator =(const DnsHostAddresses& src){
    name_ = src.name_;
    addresses_.RemoveAll();
    POSITION pos = src.addresses_.GetHeadPosition();
    while (pos) {
      addresses_.AddTail(src.addresses_.GetNext(pos));
    }
    return src;
  }
  void AddAddress(DWORD address){
    bool found = false;
    POSITION pos = addresses_.GetHeadPosition();
    while (pos && !found) {
      if (address == addresses_.GetNext(pos)) {
        found = true;
      }
    }
    if (!found) {
      addresses_.AddTail(address);
    }
  }
  CString          name_;
  CAtlList<DWORD>  addresses_;
};

class CDNSEvents :
	public CPagetestReporting
{
public:
	CDNSEvents(void);
	virtual ~CDNSEvents(void);
  CAtlList<DnsHostAddresses>  _host_addresses;

	virtual bool DnsLookupStart(CString & name, void *&context, CAtlArray<DWORD> &addresses);
	virtual void DnsLookupAddress(void * context, struct in_addr& address);
  virtual void DnsLookupAlias(CString host, CString alias);
	virtual void DnsLookupDone(void * context);
	virtual void DnsLookup(CString & name, void *&context, CAtlArray<DWORD> &addresses);
  virtual void AddAddress(CString host, DWORD address);
  virtual int GetAddressCount(CString host);
  virtual void DnsCheckCDN(CString host, CString name);
};
