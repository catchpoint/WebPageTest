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

#include "StdAfx.h"
#include "DNSEvents.h"

#include <ares_setup.h>
#include <ares.h>


CDNSEvents::CDNSEvents(void)
{
	ares_library_init(ARES_LIB_INIT_ALL);
}

CDNSEvents::~CDNSEvents(void)
{
	ares_library_cleanup();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool CDNSEvents::DnsLookupStart(CString &name, void *&context, CAtlArray<DWORD> &addresses)
{
	bool overrideDNS = false;
	context = NULL;

  DnsCheckCDN(name, name);

	// make sure we are timing something
	if( active )
	{
		CheckStuff();

		EnterCriticalSection(&cs);

		// create a new DNS event and add it to our tracking lists
		CDnsLookup * d = new CDnsLookup(name, currentDoc);

		// see if we need to change the name
		POSITION pos = dnsNameOverride.GetHeadPosition();
		while( pos )
		{
			CDNSName entry = dnsNameOverride.GetNext(pos);
			if( !name.CompareNoCase(entry.name) )
				name = entry.realName;
      else if (entry.name.Left(1) == _T('*')) 
      {
        CString sub_string = entry.name.Mid(1).Trim();
        if (!sub_string.GetLength() || !name.Right(sub_string.GetLength()).CompareNoCase(sub_string))
          name = entry.realName;
      }
		}

		// see if we need to override the address
		pos = dnsOverride.GetHeadPosition();
		while( pos )
		{
			CDNSEntry entry = dnsOverride.GetNext(pos);
			if( !name.CompareNoCase(entry.name) )
				d->overrideAddr.S_un.S_addr = entry.addr.S_un.S_addr;
      else if (entry.name.Left(1) == _T('*')) 
      {
        CString sub_string = entry.name.Mid(1).Trim();
        if (!sub_string.GetLength() || !name.Right(sub_string.GetLength()).CompareNoCase(sub_string))
          d->overrideAddr.S_un.S_addr = entry.addr.S_un.S_addr;
      }
		}

		dns.AddHead(d);		// add it to the head of the DNS lookups to keep searching fast
		AddEvent(d);		// add it to the tail of the complete list to keep things in order
		
		context = (void *)d;

		// see if we need to override the DNS servers and actually do the lookup ourselves
		if( !dnsServers.IsEmpty() && (name.Find('.') != -1) )
		{
			overrideDNS = true;
			DnsLookup(name, context, addresses);
		}

		LeaveCriticalSection(&cs);
	}
	else
	{
        ATLTRACE(_T("[Pagetest] - CDNSEvents::DnsLookupStart - outside of active request\n"));
	}

	return overrideDNS;
}

/*-----------------------------------------------------------------------------
	We have an address for the name we were looking up
-----------------------------------------------------------------------------*/
void CDNSEvents::DnsLookupAddress(void * context, struct in_addr& address)
{
	if( active && context )
	{
		EnterCriticalSection(&cs);

		CDnsLookup * d = (CDnsLookup *)context;
    AddAddress(d->name, address.S_un.S_addr);

		// see if we need to override the address
		if( d->overrideAddr.S_un.S_addr )
			address.S_un.S_addr = d->overrideAddr.S_un.S_addr;
		
		d->AddAddress(address);

		LeaveCriticalSection(&cs);
	}
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CDNSEvents::DnsLookupDone(void * context)
{
	if( active && context )
	{
		CheckStuff();

		EnterCriticalSection(&cs);
		
		CDnsLookup * d = (CDnsLookup *)context;
		d->Done();

		LeaveCriticalSection(&cs);

		RepaintWaterfall();
	}
}

/*-----------------------------------------------------------------------------
	Callback from the async lookup
-----------------------------------------------------------------------------*/
void aresCallback(void *arg, int status,int timeouts, struct hostent *hostent)
{
	if( status == ARES_SUCCESS && hostent && arg )
	{
		// pull the addresses out of the response
		CAtlArray<DWORD> * addresses = (CAtlArray<DWORD> *)arg;
		char ** pos = hostent->h_addr_list;
		while( *pos )
		{
			struct in_addr addr;
			addr.S_un.S_addr = *((ULONG *)(*pos));
			ATLTRACE( _T("[Pagetest] - resolved %d.%d.%d.%d\n"), addr.S_un.S_un_b.s_b1, addr.S_un.S_un_b.s_b2, addr.S_un.S_un_b.s_b3, addr.S_un.S_un_b.s_b4 );
			addresses->Add(addr.S_un.S_addr);

			pos++;
		}
	}
}

/*-----------------------------------------------------------------------------
	Perform an actual lookup using the c-ares library using our custom servers
-----------------------------------------------------------------------------*/
void CDNSEvents::DnsLookup(CString & name, void *&context, CAtlArray<DWORD> &addresses)
{
	ATLTRACE(_T("[Pagetest] - CDNSEvents::DnsLookup - Performing custom lookup\n"));

	// initialize ares with the list of DNS servers
	DWORD count = dnsServers.GetCount();
	if( count )
	{
		// set up the options
		struct in_addr * servers = new struct in_addr[count];
		for( DWORD i = 0; i < count; i++ )
			servers[i].S_un.S_addr = dnsServers[i].S_un.S_addr;
		struct ares_options options;
		options.servers = servers;
		options.nservers = count;
		options.timeout = 2000;

		ares_channel channel;
		if( ARES_SUCCESS == ares_init_options(&channel, &options, ARES_OPT_TIMEOUTMS | ARES_OPT_SERVERS) )
		{
			// start the lookup
			ares_gethostbyname(channel, CT2A(name), AF_INET, aresCallback, &addresses);

			// wait for the lookup to finish
			bool done = false;
			struct timeval *tvp, tv;
			fd_set read_fds, write_fds;
			FD_ZERO(&read_fds);
			FD_ZERO(&write_fds);
			while( !done )
			{
				int nfds = ares_fds(channel, &read_fds, &write_fds);
				if(nfds)
				{
					tvp = ares_timeout(channel, NULL, &tv);
					select(nfds, &read_fds, &write_fds, NULL, tvp);
					ares_process(channel, &read_fds, &write_fds);
				}
				else
					done = true;
			}

			ares_destroy(channel);
		}

		delete [] servers;
	}
}
/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CDNSEvents::AddAddress(CString host, DWORD address) {
  bool found = false;
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
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
int CDNSEvents::GetAddressCount(CString host) {
  int count = 0;
  bool found = false;
  POSITION pos = _host_addresses.GetHeadPosition();
  while (pos && !found) {
    DnsHostAddresses& host_addresses = _host_addresses.GetNext(pos);
    if (host_addresses.name_ == host) {
      count = host_addresses.addresses_.GetCount();
      found = true;
    }
  }
  return count;
}

typedef struct {
	char * pattern;
	TCHAR * name;
} CDN_PROVIDER;
extern CDN_PROVIDER cdnList[];

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CDNSEvents::DnsLookupAlias(CString host, CString alias) {
  DnsCheckCDN(host, alias);
}

/*-----------------------------------------------------------------------------
  Check the given name to see if it is a known CDN and associate it with
  the given host (handles both host name and CNAME resolutions
-----------------------------------------------------------------------------*/
void CDNSEvents::DnsCheckCDN(CString host, CString name) {
  // see if it is a known CDN
  CString provider;
  CDN_PROVIDER * cdn = cdnList;
  while (provider.IsEmpty() && cdn->pattern) {
	  if (name.Find((LPCTSTR)CA2T(cdn->pattern)) > -1)
		  provider = cdn->name;
	  cdn++;
  }
  if (!provider.IsEmpty()) {
    // add an entry for the host name if we don't already have one
    bool found = false;
		EnterCriticalSection(&csCDN);
		POSITION pos = cdnLookups.GetHeadPosition();
		while (pos && !found) {
			CCDNEntry &entry = cdnLookups.GetNext(pos);
			found = entry.name == host;
		}
    if (!found) {
			CCDNEntry entry;
			entry.name = host;
			entry.isCDN = true;
			entry.provider = provider;
			cdnLookups.AddTail(entry);
    }
		LeaveCriticalSection(&csCDN);
  }
}
