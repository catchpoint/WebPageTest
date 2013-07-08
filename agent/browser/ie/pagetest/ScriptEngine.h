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
#include "PagetestBase.h"

const UINT_PTR TIMER_SCRIPT=88888;

class CScriptItem
{
public:
	CScriptItem(void){}
	CScriptItem(const CScriptItem &src){ *this = src; }
	~CScriptItem(void){}
	const CScriptItem & operator =(const CScriptItem &src)
	{
		command = src.command;
		target = src.target;
		value = src.value;
		
		return src;
	}
	
	CString	command;
	CString	target;
	CString	value;
};

class CScriptVariable
{
public:
	CScriptVariable(void){}
	CScriptVariable(const CScriptVariable &src){ *this = src; }
	~CScriptVariable(void){}
	const CScriptVariable & operator =(const CScriptVariable &src)
	{
		key = src.key;
		value = src.value;
		return src;
	}
	
	CString	key;
	CString	value;
};

class CDNSEntry
{
public:
	CDNSEntry(){addr.S_un.S_addr = 0;}
	CDNSEntry(CString nm, LPCTSTR address)
	{
		name = nm;
		addr.S_un.S_addr = inet_addr(CT2A(address));
	}
	CDNSEntry( const CDNSEntry& src){*this = src;}
	~CDNSEntry(void){}
	const CDNSEntry& operator =(const CDNSEntry& src)
	{
		name = src.name;
		addr.S_un.S_addr = src.addr.S_un.S_addr;

		return src;
	}

	CString			name;
	struct in_addr	addr;
};

class CDNSName
{
public:
	CDNSName(){}
	CDNSName(CString nm, CString rn):name(nm),realName(rn){}
	CDNSName( const CDNSName& src){*this = src;}
	~CDNSName(void){}
	const CDNSName& operator =(const CDNSName& src)
	{
		name = src.name;
		realName = src.realName;

		return src;
	}

	CString	name;
	CString	realName;
};

class CHostOverride
{
public:
  CHostOverride(){}
  CHostOverride(CString originalFQDN, CString newFQDN):originalHost(originalFQDN),newHost(newFQDN){}
  CHostOverride(const CHostOverride& src){*this = src;}
  ~CHostOverride(void){}
	const CHostOverride& operator =(const CHostOverride& src)
	{
		originalHost = src.originalHost;
		newHost = src.newHost;

		return src;
	}

  CString originalHost;
  CString newHost;
};

class CFilteredHeader
{
public:
  CFilteredHeader(){}
  CFilteredHeader(CString newHeader, CString hostFilter):header(newHeader),filter(hostFilter){}
  CFilteredHeader(const CFilteredHeader& src){*this = src;}
  ~CFilteredHeader(void){}
	const CFilteredHeader& operator =(const CFilteredHeader& src)
	{
		header = src.header;
		filter = src.filter;

		return src;
	}

  CString header;
  CString filter;
};

class CScriptEngine:
	public CPagetestBase
{
public:
	CScriptEngine(void);
	virtual ~CScriptEngine(void);
	bool LoadScript(CString file);
	virtual bool RunScript(CString file);
	virtual void Reset(void);
	BOOL WndEnumProc(HWND hwnd);
	void ThreadProc(void);

	int		scriptStep;
	CString	script_eventName;
	CString script_domElement;
	CString script_domRequest;
	MEASUREMENT_POINT	script_domRequestType;
	CString script_endRequest;
	bool	script_ignoreErrors;
	bool	script_logErrors;
	bool	script_modifyUserAgent;
	DWORD	script_result;
	CString	script_lastCommand;
	bool	script_error;
	bool	script_logData;
	CString	script_url;
	bool	fileOk;
	DWORD	script_timeout;
  DWORD script_activity_timeout;
	bool	script_active;
  bool  script_waitForJSDone;
  int   script_combineSteps;
	CString	script_basicAuth;
	CAtlList<CDNSEntry>			dnsOverride;		// List of DNS addresses to override
	CAtlList<CDNSName>			dnsNameOverride;	// List of DNS names to override
  CAtlList<CFilteredHeader> headersAdd;       // list of headers to add
  CAtlList<CFilteredHeader> headersSet;       // list of headers to set/override
  CAtlList<CHostOverride> hostOverride;     // host headers to override
  CAtlList<CHostOverride> overrideHostUrls; // override the given host, redirect it's DNS and add the header to the actual URL

protected:
	void ContinueScript(bool reset);
	void ScriptComplete(void);
	bool IncrementStep(bool waitForActivity = false);
	void VarReplace(CString& value);
  bool PreProcessScriptItem(CScriptItem &item);

	CAtlList<CScriptItem>	script;
	CAtlList<CScriptVariable>	variables;
	CString	newEventName;
	CString	scriptFile;
	CString	fileToLoad;
	HWND	hDlg;
	HANDLE	hIntervalMutex;
  int no_run; // 0 if commands should be executed, increased with each if block that fails (used for conditional execution)
	
	bool LoadFile(CString file, CString variable);
	bool LoadVariables(CString file);
	bool FileDialog(CString attribute, CString file);
	bool LocateFile(CString& file);
	bool MinInterval(CString key, long minutes);
	void SendKeyCommand(const OLECHAR * command, CScriptItem & item, bool & err, bool & done);
	void SendMouseCommand(const OLECHAR * command, CScriptItem & item, bool & err, bool & done);
	void SendCommand(CScriptItem & item, bool & err, bool & done);
	bool ExecuteScript(_bstr_t script);
  bool InvokeScript(LPOLESTR function, _variant_t &result);
  bool ConditionMatches(CString condition, CString value);
  void ExpireCache(DWORD seconds);
  void ExpireCacheEntry(INTERNET_CACHE_ENTRY_INFO * info, DWORD seconds);
};
