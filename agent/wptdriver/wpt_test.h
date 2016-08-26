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

class ScriptCommand{
public:
  ScriptCommand(void):record(false){}
  ScriptCommand(const ScriptCommand& src){*this = src;}
  ~ScriptCommand(void){}
  const ScriptCommand& operator =(const ScriptCommand& src){
    command = src.command;
    target = src.target;
    value = src.value;
    record = src.record;

    return src;
  }

  CString command;
  CString target;
  CString value;
  bool    record;
};

class CDNSEntry {
public:
  CDNSEntry():addr(0){}
  CDNSEntry(CString nm, LPCTSTR address) {
    name = nm;
    addr = inet_addr(CT2A(address));
  }
  CDNSEntry( const CDNSEntry& src){*this = src;}
  ~CDNSEntry(void){}
  const CDNSEntry& operator =(const CDNSEntry& src)	{
    name = src.name;
    addr = src.addr;
    return src;
  }
  CString	name;
  ULONG	  addr;
};

class CDNSName {
public:
  CDNSName(){}
  CDNSName(CString nm, CString rn):name(nm),realName(rn){}
  CDNSName( const CDNSName& src){*this = src;}
  ~CDNSName(void){}
  const CDNSName& operator =(const CDNSName& src)	{
    name = src.name;
    realName = src.realName;
    return src;
  }
  CString	name;
  CString	realName;
};

class HttpHeaderValue {
public:
  HttpHeaderValue(){}
  HttpHeaderValue(CStringA tag, CStringA value, CStringA filter):
    _tag(tag),_value(value),_filter(filter){}
  HttpHeaderValue(const HttpHeaderValue& src){*this = src;}
  ~HttpHeaderValue(void){}
  const HttpHeaderValue& operator =(const HttpHeaderValue& src){
    _tag = src._tag;
    _value = src._value;
    _filter = src._filter;
    return src;
  }
  CStringA  _tag;
  CStringA  _value;
  CStringA  _filter;
};

class CustomRule {
public:
  CustomRule(void){}
  CustomRule(const CustomRule& src){ *this = src; }
  ~CustomRule(void){}
  const CustomRule& operator =(const CustomRule& src) {
    _name = src._name;
    _mime = src._mime;
    _regex = src._regex;
    return src;
  }

  CString _name;
  CString _mime;
  CString _regex;
};

class WptTest {
public:
  WptTest(void);
  virtual ~WptTest(void);

  void  Reset(void);
  virtual bool  Load(CString& test);

  bool  GetNextTask(CStringA& task, bool& record);
  bool  Done();
  void  OverrideDNSName(CString& name);
  ULONG OverrideDNSAddress(CString& name);
  void  OverridePort(const struct sockaddr FAR * name, int namelen);
  bool  ModifyRequestHeader(CStringA& header) const;
  bool  BlockRequest(CString host, CString object);
  bool  OverrideHost(CString host, CString &new_host);
  bool  GetHeadersToSet(CString host, CAtlList<CString> &headers);
  bool  GetHeadersToAdd(CString host, CAtlList<CString> &headers);
  void  CollectData();
  void  CollectDataDone();
  virtual void  ReportData();
  void Lock();
  void Unlock();
  bool IsLocked();
  CStringA  GetAppendUA() const;
  bool HasCustomCommandLine() const {return _browser_command_line.GetLength() || _browser_additional_command_line.GetLength();}

  // overall test settings
  CString _id;
  CString _file_base;
  CString _directory;
  CString _url;
  int     _runs;
  int     _discard;
  bool    _fv_only;
  bool    _doc_complete;
  bool    _ignore_ssl;
  bool    _tcpdump;
  bool    _timeline;
  int     _timelineStackDepth;
  bool    _trace;
  CString _traceCategories;
  bool    _netlog;
  bool    _video;
  bool    _spdy3;
  bool    _noscript;
  bool    _clear_certs;
  bool    _emulate_mobile;
  bool    _force_software_render;
  CString _test_type;
  CString _block;
  DWORD   _bwIn;
  DWORD   _bwOut;
  DWORD   _latency;
  double  _plr;
  CString _browser;
  CString _browser_url;
  CString _browser_md5;
  CString _basic_auth;
  CString _script;
  CString _test_file;
  bool    _log_data;
  DWORD   _test_timeout;
  bool    _has_test_timed_out;
  DWORD   _measurement_timeout;
  BYTE    _image_quality;
  bool    _png_screen_shot;
  bool    _full_size_video;
  DWORD   _minimum_duration;
  bool    _save_response_bodies;
  bool    _save_html_body;
  bool    _preserve_user_agent;
  bool    _check_responsive;
  DWORD   _browser_width;
  DWORD   _browser_height;
  DWORD   _viewport_width;
  DWORD   _viewport_height;
  CAtlList<CustomRule> _custom_rules;
  DWORD   _activity_timeout;
  CString _client;
  CString _device_scale_factor;
  bool    _continuous_video;
  CString _browser_command_line;
  CString _browser_additional_command_line;
  CStringA  _user_agent;
  CString _navigated_url;
  CStringA _test_error;
  CStringA _run_error;
  CString _custom_metrics;
  DWORD   _script_timeout_multiplier;
  CStringA _user_agent_modifier;
  CStringA _append_user_agent;
  DWORD    _max_test_time;
  bool     _process_results;
  CAtlList<CString> _block_domains;
  CAtlList<CString> _block_domains_except;
  
  // current state
  int     _run;
  int     _specific_run;
  int     _specific_index;
  bool    _discard_test;
  int     _index;
  bool    _clear_cache;
  bool    _active;
  LARGE_INTEGER _sleep_end;
  LARGE_INTEGER _perf_frequency;
  int     _combine_steps;
  int     _version;
  // Whether we need to wait for DOM element.
  bool    _dom_element_check;
  int     _no_run;  // conditional block support - if/else/endif
  CStringA _current_event_name;
  bool    _is_chrome;
  bool    overrode_ua_string_;

  // system information
  bool      has_gpu_;

  void      BuildScript();
  CAtlList<ScriptCommand> _script_commands;

protected:
  CStringA  EncodeTask(ScriptCommand& command);
  bool      NavigationCommand(CString& command);
  void      FixURL(ScriptCommand& command);
  bool      PreProcessScriptCommand(ScriptCommand& command);
  bool      ConditionMatches(ScriptCommand& command);
  void      ParseBlockCommand(CString block_list, bool add_head);
  int       lock_count_;
  virtual bool ProcessCommand(ScriptCommand& command, bool &consumed);

  CRITICAL_SECTION cs_;

  // DNS overrides
  CAtlList<CDNSEntry>	_dns_override;
  CAtlList<CDNSName>  _dns_name_override;

  // requests to block
  CAtlList<CString> _block_requests;

  // header overrides
  CAtlList<HttpHeaderValue> _add_headers;
  CAtlList<HttpHeaderValue> _set_headers;
  CAtlList<HttpHeaderValue> _override_hosts;

  CAtlMap<USHORT, USHORT> _tcp_port_override;
};
