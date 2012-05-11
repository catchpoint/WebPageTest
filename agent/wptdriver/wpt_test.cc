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
#include "wpt_test.h"
#include <ShlObj.h>
#include "util.h"
#include "../wpthook/shared_mem.h"
#include "wpt_settings.h"

static const DWORD AFT_EARLY_CUTOFF_SECS = 25;
static const DWORD AFT_MIN_CHANGES_THRESHOLD = 100;
static const DWORD AFT_TIMEOUT = 240000;
static const DWORD SCRIPT_TIMEOUT_MULTIPLIER = 2;
static const BYTE JPEG_DEFAULT_QUALITY = 30;
static const DWORD MS_IN_SEC = 1000;
static const DWORD BROWSER_WIDTH = 1024;
static const DWORD BROWSER_HEIGHT = 768;


/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptTest::WptTest(void):_version(0),
  _test_timeout(DEFAULT_TEST_TIMEOUT * SECONDS_TO_MS),
  _measurement_timeout(DEFAULT_TEST_TIMEOUT) {
  QueryPerformanceFrequency(&_perf_frequency);

  // figure out what our working diriectory is
  TCHAR path[MAX_PATH];
  if( SUCCEEDED(SHGetFolderPath(NULL, CSIDL_APPDATA | CSIDL_FLAG_CREATE,
                                NULL, SHGFP_TYPE_CURRENT, path)) ) {
    PathAppend(path, _T("webpagetest"));
    CreateDirectory(path, NULL);
    _directory = path;

    lstrcat(path, _T("_data"));
    CreateDirectory(path, NULL);
    _test_file = CString(path) + _T("\\test.dat");
  }

  Reset();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptTest::~WptTest(void) {
}

/*-----------------------------------------------------------------------------
  Reset everything to their default values
-----------------------------------------------------------------------------*/
void WptTest::Reset(void) {
  _id.Empty();
  _url.Empty();
  _runs = 1;
  _fv_only = false;
  _doc_complete = false;
  _ignore_ssl = false;
  _tcpdump = false;
  _timeline = false;
  _video = false;
  _aft = false;
  _aft_early_cutoff = AFT_EARLY_CUTOFF_SECS;
  _aft_min_changes = AFT_MIN_CHANGES_THRESHOLD;
  _test_type.Empty();
  _block.Empty();
  _bwIn = 0;
  _bwOut = 0;
  _latency = 0;
  _plr = 0.0;
  _browser.Empty();
  _basic_auth.Empty();
  _script.Empty();
  _run = 0;
  _clear_cache = true;
  _active = false;
  _dom_element_check = false;
  _log_data = true;
  _sleep_end.QuadPart = 0;
  _combine_steps = 0;
  _image_quality = JPEG_DEFAULT_QUALITY;
  _png_screen_shot = false;
  _minimum_duration = 0;
  _upload_incremental_results = true;
  _user_agent.Empty();
  _add_headers.RemoveAll();
  _set_headers.RemoveAll();
  _override_hosts.RemoveAll();
  _dns_override.RemoveAll();
  _dns_name_override.RemoveAll();
  _block_requests.RemoveAll();
  _save_response_bodies = false;
  _preserve_user_agent = false;
  _browser_width = BROWSER_WIDTH;
  _browser_height = BROWSER_HEIGHT;
  _viewport_width = 0;
  _viewport_height = 0;
  _no_run = 0;
  _custom_rules.RemoveAll();
}

/*-----------------------------------------------------------------------------
  Parse the test settings from a string
-----------------------------------------------------------------------------*/
bool WptTest::Load(CString& test) {
  bool ret = false;

  WptTrace(loglevel::kFunction, _T("WptTest::Load()\n"));

  Reset();

  bool done = false;
  int linePos = 0;
  CString line = test.Tokenize(_T("\r\n"), linePos);
  while (!done && linePos >= 0) {
    int keyEnd = line.Find('=');
    if (keyEnd > 0) {
      CString key = line.Left(keyEnd).Trim();
      CString value = line.Mid(keyEnd + 1);
      if (key.GetLength()) {
        // check against all of the known options
        if (!key.CompareNoCase(_T("Test ID")))
          _id = value.Trim();
        else if (!key.CompareNoCase(_T("url")))
          _url = value.Trim();
        else if (!key.CompareNoCase(_T("fvonly")) && _ttoi(value.Trim()))
          _fv_only = true;
        else if (!key.CompareNoCase(_T("runs")))
          _runs = _ttoi(value.Trim());
        else if (!key.CompareNoCase(_T("web10")) && _ttoi(value.Trim()))
          _doc_complete = true;
        else if (!key.CompareNoCase(_T("ignoreSSL")) && _ttoi(value.Trim()))
          _ignore_ssl = true;
        else if (!key.CompareNoCase(_T("tcpdump")) && _ttoi(value.Trim()))
          _tcpdump = true;
        else if (!key.CompareNoCase(_T("timeline")) && _ttoi(value.Trim()))
          _timeline = true;
        else if (!key.CompareNoCase(_T("Capture Video")) &&_ttoi(value.Trim()))
          _video = true;
        else if (!key.CompareNoCase(_T("aft")) && _ttoi(value.Trim())) {
          _test_timeout = AFT_TIMEOUT;
          _aft = true;
        } else if (!key.CompareNoCase(_T("aftEarlyCutoff")))
          _aft_early_cutoff = _ttoi(value.Trim());
        else if (!key.CompareNoCase(_T("aftMinChanges")))
          _aft_min_changes = _ttoi(value.Trim());
        else if (!key.CompareNoCase(_T("type")))
          _test_type = value.Trim();
        else if (!key.CompareNoCase(_T("block")))
          _block = value.Trim();
        else if (!key.CompareNoCase(_T("bwIn")))
          _bwIn = _ttoi(value.Trim());
        else if (!key.CompareNoCase(_T("bwOut")))
          _bwOut = _ttoi(value.Trim());
        else if (!key.CompareNoCase(_T("latency")))
          _latency = _ttoi(value.Trim());
        else if (!key.CompareNoCase(_T("plr")))
          _plr = _ttof(value.Trim());
        else if (!key.CompareNoCase(_T("browser")))
          _browser = value.Trim();
        else if (!key.CompareNoCase(_T("Basic Auth")))
          _basic_auth = value.Trim();
        else if (!key.CompareNoCase(_T("imageQuality")))
          _image_quality = (BYTE)max(_image_quality, 
                                     min(100, _ttoi(value.Trim())));
        else if (!key.CompareNoCase(_T("pngScreenShot")) &&_ttoi(value.Trim()))
          _png_screen_shot = true;
        else if (!key.CompareNoCase(_T("time")))
          _minimum_duration = MS_IN_SEC * max(_minimum_duration, 
                               min(DEFAULT_TEST_TIMEOUT, _ttoi(value.Trim())));
        else if (!key.CompareNoCase(_T("bodies")) && _ttoi(value.Trim()))
          _save_response_bodies = true;
        else if (!key.CompareNoCase(_T("keepua")) && _ttoi(value.Trim()))
          _preserve_user_agent = true;
        else if (!key.CompareNoCase(_T("customRule"))) {
          int separator = value.Find(_T('='));
          if (separator > 0) {
            CString name = value.Left(separator).Trim();
            CString rule = value.Mid(separator + 1).Trim();
            separator = rule.Find(_T('\t'));
            if (separator > 0) {
              CString mime = rule.Left(separator).Trim();
              rule = rule.Mid(separator + 1).Trim();
              if (name.GetLength() && mime.GetLength() && rule.GetLength()) {
                CustomRule new_rule;
                new_rule._name = name;
                new_rule._mime = mime;
                new_rule._regex = rule;
                _custom_rules.AddTail(new_rule);
              }
            }
          }
        }
      }
    } else if (!line.Trim().CompareNoCase(_T("[Script]"))) {
      // grab the rest of the response as the script
      _script = test.Mid(linePos).Trim();
      done = true;
    }

    line = test.Tokenize(_T("\r\n"), linePos);
  }

  if (_script.GetLength())
    _test_timeout *= SCRIPT_TIMEOUT_MULTIPLIER;

  WptTrace(loglevel::kFunction, _T("WptTest::Load() - Loaded test %s\n"), 
                                                                (LPCTSTR)_id);

  if( _id.GetLength() )
    ret = true;

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptTest::GetNextTask(CStringA& task, bool& record) {
  bool ret = false;

  WptTrace(loglevel::kFunction, _T("[wpthook] - WptTest::GetNextTask\n"));

  if (!_active){
    LARGE_INTEGER now;
    QueryPerformanceCounter(&now);
    if( !_sleep_end.QuadPart || now.QuadPart >= _sleep_end.QuadPart) {
      bool keep_processing = true;
      while (keep_processing && !_script_commands.IsEmpty()) {
        ScriptCommand command = _script_commands.RemoveHead();
        bool consumed = false;
        keep_processing = ProcessCommand(command, consumed);
        if (!consumed) {
          FixURL(command);
          task = EncodeTask(command);
          record = command.record;
          if (record) {
            _active = true;
            if (_combine_steps > 0)
              _combine_steps--;
          }
          ret = true;
        }
      }
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
  Create a JSON-encoded version of the task
-----------------------------------------------------------------------------*/
CStringA WptTest::EncodeTask(ScriptCommand& command) {
  CStringA json = "{";
  CStringA buff;

  if (command.command.GetLength()) {
    CString cmd(command.command);
    cmd.MakeLower();
    buff.Format("\"action\":\"%s\"", (LPCSTR)JSONEscape(cmd));
    json += buff;
  }

  if (command.target.GetLength()) {
    buff.Format(",\"target\":\"%s\"", (LPCSTR)JSONEscape(command.target));
    json += buff;
  }

  if (command.value.GetLength()) {
    buff.Format(",\"value\":\"%s\"", (LPCSTR)JSONEscape(command.value));
    json += buff;
  }

  if (command.record)
    json += ",\"record\":true";
  else
    json += ",\"record\":false";

  json += _T("}");
  return json;
}

/*-----------------------------------------------------------------------------
  The last measurement completed, is it time to exit?
-----------------------------------------------------------------------------*/
bool WptTest::Done() {
  WptTrace(loglevel::kFunction, _T("[wpthook] - WptTest::Done()\n"));
  bool ret = false;

  _active = false;
  if (_script_commands.IsEmpty())
    ret = true;

  return ret;
}

/*-----------------------------------------------------------------------------
  Parse the loaded script for commands (or create a default script if we
  are just loading an url)
-----------------------------------------------------------------------------*/
void WptTest::BuildScript() {
  _script_commands.RemoveAll();

  if (_script.GetLength()) {
    bool has_measurement = false;
    bool in_comment = false;
    int pos = 0;
    CString line = _script.Tokenize(_T("\r\n"), pos).Trim();
    while (pos >= 0) {
      if (in_comment) {
        if (line.Left(2) == _T("*/"))
          in_comment = false;
      } else {
        if (line.Left(2) == _T("/*"))
          in_comment = true;
        else if(line.GetAt(0) != _T('/')) {
          // break the command into it's component parts
          int command_pos = 0;
          CString command = line.Tokenize(_T("\t"), command_pos).Trim();
          if (command.GetLength()) {
            ScriptCommand script_command;
            script_command.record = NavigationCommand(command);
            script_command.command = command;
            script_command.target = line.Tokenize(_T("\t"),command_pos).Trim();
            if (!_no_run && 
                command_pos > 0 && 
                script_command.target.GetLength()) {
              // If command is "block" then parse all the space separated patterns
              // in target into separate "block" commands.
              if (script_command.command == _T("setdomelement")) {
                _dom_element_check = true;
                WptTrace(loglevel::kFrequentEvent, 
                  _T("[wpthook] - WptTest::BuildScript() Setting dom element check."));
              } else if (script_command.command == _T("block")) {
                CString patterns = script_command.target;
                int pattern_pos = 0;
                while (pattern_pos < patterns.GetLength()) {
                  CString pattern = patterns.Tokenize(_T(" "), pattern_pos).Trim();
                  // For each pattern, add a new script command.
                  ScriptCommand block_script_command;
                  block_script_command.command = script_command.command;
                  block_script_command.target = pattern;
                  // Block command don't need pre-processing and so add it directly.
                  _script_commands.AddTail(block_script_command);
                  WptTrace(loglevel::kFrequentEvent,_T("Block Script command: %s,%s,%s\n"), 
                            (LPCTSTR)block_script_command.command,
                            (LPCTSTR)block_script_command.target,
                            (LPCTSTR)block_script_command.value);
                }
              }
              else {
                script_command.value =line.Tokenize(_T("\t"),command_pos).Trim();
              }
            }

            // Don't process the block commands since they are processed already.
            if (script_command.command != _T("block")) {
              WptTrace(loglevel::kFrequentEvent,_T("Script command: %s,%s,%s\n"), 
                        (LPCTSTR)script_command.command,
                        (LPCTSTR)script_command.target,
                        (LPCTSTR)script_command.value);
              if (script_command.record)
                has_measurement = true;
              
              if (!PreProcessScriptCommand(script_command))
                _script_commands.AddTail(script_command);
            }
          }
        }
      }

      line = _script.Tokenize(_T("\r\n"), pos).Trim();
    }

    if (!has_measurement)
      _script_commands.RemoveAll();
  }
    
  if (_script_commands.IsEmpty() && _url.GetLength()) {
    ScriptCommand command;
    command.command = _T("navigate");
    command.target = _url;
    command.record = true;
    _script_commands.AddTail(command);
  }

  if (_clear_cache) {
      ScriptCommand command;
      command.command = _T("clearCache");
      command.record = false;
      _script_commands.AddHead(command);
  }

  if (_block.GetLength() ) {
    ScriptCommand command;
    command.command = _T("block");
    command.target = _block;
    command.record = false;
    _script_commands.AddHead(command);
  }

  if (_timeline) {
    ScriptCommand command;
    command.command = _T("captureTimeline");
    command.record = false;
    _script_commands.AddHead(command);
  }
}

/*-----------------------------------------------------------------------------
  See if the supplied command is one that initiates a measurement
  (even if that measurement needs to be ignored)
-----------------------------------------------------------------------------*/
bool WptTest::NavigationCommand(CString& command) {
  bool ret = false;
  command.MakeLower();

  if (command == _T("navigate") ||
      command == _T("startmeasurement") ||
      command == _T("waitforcomplete") ||
      command == _T("submitform")) {
    ret = true;
  } else {
    int index = command.Find(_T("andwait"));
    if (index > 0) {
      command = command.Left(index);
      ret = true;
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
  Make sure the URL has a protocol for navigation commands
-----------------------------------------------------------------------------*/
void  WptTest::FixURL(ScriptCommand& command) {
  if (!command.command.CompareNoCase(_T("navigate")) && 
      command.target.GetLength()) {
    if (!command.target.CompareNoCase(_T("about:blank"))) {
      command.target = _T("http://127.0.0.1:8888/blank.html");
    } else if (command.target.Left(4) != _T("http")) {
      command.target = CString(_T("http://")) + command.target;
    }
  }
}

/*-----------------------------------------------------------------------------
  Process the commands that we know about and that can be processed outside of
  the browser (setting state, etc)
-----------------------------------------------------------------------------*/
bool WptTest::ProcessCommand(ScriptCommand& command, bool &consumed) {
  bool continue_processing = true;
  consumed = true;

  WptTrace(loglevel::kFunction, _T("[wpthook] Processing Command '%s'\n"), 
                                                              command.command);
  CString cmd = command.command;
  cmd.MakeLower();

  if (cmd == _T("combinesteps")) {
    _combine_steps = -1;
    int count = _ttoi(command.target);
    if (count > 0)
      _combine_steps = count;
  } else if (cmd == _T("logdata")) {
    if (_ttoi(command.target))
      _log_data = true;
    else
      _log_data = false;
  } else if (cmd == _T("sleep")) {
    int seconds = _ttoi(command.target);
    if (seconds > 0) {
      QueryPerformanceCounter(&_sleep_end);
      _sleep_end.QuadPart += seconds * _perf_frequency.QuadPart;
      continue_processing = false;
    }
  } else if (cmd == _T("settimeout")) {
    int seconds = _ttoi(command.target);
    if (seconds > 0 && seconds < 600)
      _measurement_timeout = seconds * 1000;
  } else if (cmd == _T("setuseragent")) {
    _user_agent = CT2A(command.target);
  } else if (cmd == _T("addheader")) {
    int pos = command.target.Find(_T(':'));
    if (pos > 0) {
      CStringA tag = CT2A(command.target.Left(pos).Trim());
      CStringA value = CT2A(command.target.Mid(pos + 1).Trim());
      HttpHeaderValue header(tag, value, (LPCSTR)CT2A(command.value.Trim()));
      _add_headers.AddTail(header);
    }
  } else if (cmd == _T("setheader")) {
    int pos = command.target.Find(_T(':'));
    if (pos > 0) {
      CStringA tag = CT2A(command.target.Left(pos).Trim());
      CStringA value = CT2A(command.target.Mid(pos + 1).Trim());
      HttpHeaderValue header(tag, value, (LPCSTR)CT2A(command.value.Trim()));
      _set_headers.AddTail(header);
    }
  } else if (cmd == _T("resetheaders")) {
    _add_headers.RemoveAll();
    _set_headers.RemoveAll();
  } else if (cmd == _T("overridehost")) {
    CStringA host = CT2A(command.target.Trim());
    CStringA new_host = CT2A(command.value.Trim());
    if (host.GetLength() && new_host.GetLength()) {
      HttpHeaderValue host_override(host, new_host, "");
      _override_hosts.AddTail(host_override);
    }
    // pass the host override command on to the browser extension as well
    // (needed for SSL override on Chrome)
    continue_processing = false;
    consumed = false;
  } else if (cmd == _T("block")) {
    _block_requests.AddTail(command.target);
    continue_processing = false;
    consumed = false;
  } else if(cmd == _T("addcustomrule")) {
    int separator = command.target.Find(_T('='));
    if (separator > 0)  {
      CustomRule new_rule;
      new_rule._name = command.target.Left(separator).Trim();
      new_rule._mime = command.target.Mid(separator + 1).Trim();
      new_rule._regex = command.value.Trim();
      _custom_rules.AddTail(new_rule);
    }
  } else {
    continue_processing = false;
    consumed = false;
  }

  return continue_processing;
}

/*-----------------------------------------------------------------------------
  Process any commands that we need to handle right at startup
  This is primarily for DNS overrides because of Chrome's pre-fetching
-----------------------------------------------------------------------------*/
bool WptTest::PreProcessScriptCommand(ScriptCommand& command) {
  bool processed = true;

  CString cmd = command.command;
  cmd.MakeLower();

  if (_no_run > 0) {
    if (cmd == _T("if")) {
      _no_run++;
    } else if (cmd == _T("else")) {
      if (_no_run == 1) {
        _no_run = 0;
      }
    } else if (cmd == _T("endif")) {
      _no_run = max(0, _no_run - 1);
    }
  } else {
    if (cmd == _T("if")) {
      if (!ConditionMatches(command)) {
        _no_run = 1;
      }
    } else if (cmd == _T("else")) {
      _no_run = 1;
    } else if (cmd == _T("endif")) {
    } else if (cmd == _T("setdns")) {
      CDNSEntry entry(command.target, command.value);
      _dns_override.AddTail(entry);
    } else if (cmd == _T("setdnsname")) {
      CDNSName entry(command.target, command.value);
      if (entry.name.GetLength() && entry.realName.GetLength())
        _dns_name_override.AddTail(entry);
    } else if (cmd == _T("setbrowsersize")) {
      int width = _ttoi(command.target);
      int height = _ttoi(command.value);
      if (width > 0 && height > 0) {
        _browser_width = (DWORD)width;
        _browser_height = (DWORD)height;
      }
    } else if (cmd == _T("setviewportsize")) {
      int width = _ttoi(command.target);
      int height = _ttoi(command.value);
      if (width > 0 && height > 0) {
        _viewport_width = (DWORD)width;
        _viewport_height = (DWORD)height;
      }
    } else {
      processed = false;
    }
  }

  return processed;
}

/*-----------------------------------------------------------------------------
  See if we need to override the DNS name
-----------------------------------------------------------------------------*/
void  WptTest::OverrideDNSName(CString& name) {
  POSITION pos = _dns_name_override.GetHeadPosition();
  while (pos) {
    CDNSName entry = _dns_name_override.GetNext(pos);
    if (!name.CompareNoCase(entry.name))
      name = entry.realName;
    else if (entry.name.Left(1) == _T('*')) {
      CString sub_string = entry.name.Mid(1).Trim();
      if (!sub_string.GetLength() || 
          !name.Right(sub_string.GetLength()).CompareNoCase(sub_string))
        name = entry.realName;
    }
  }
}

/*-----------------------------------------------------------------------------
  See if we need to override the DNS address
-----------------------------------------------------------------------------*/
ULONG WptTest::OverrideDNSAddress(CString& name) {
  ULONG addr = 0;
  POSITION pos = _dns_override.GetHeadPosition();
  while (pos) {
    CDNSEntry entry = _dns_override.GetNext(pos);
    if (!name.CompareNoCase(entry.name))
      addr = entry.addr;
    else if (entry.name.Left(1) == _T('*')) {
      CString sub_string = entry.name.Mid(1).Trim();
      if (!sub_string.GetLength() || 
          !name.Right(sub_string.GetLength()).CompareNoCase(sub_string))
        addr = entry.addr;
    }
  }

  return addr;
}

/*-----------------------------------------------------------------------------
  Modify an outbound request header.  The modifications can include:
  - Including PTST in the user agent string
  - Adding new headers
  - Overriding existing headers
  - Overriding the host header for a specific host
-----------------------------------------------------------------------------*/
bool WptTest::ModifyRequestHeader(CStringA& header) const {
  bool modified = true;

  int pos = header.Find(':');
  CStringA tag = header.Left(pos);
  CStringA value = header.Mid(pos + 1).Trim();
  if( !tag.CompareNoCase("User-Agent") ) {
    if (_user_agent.GetLength()) {
      header = CStringA("User-Agent: ") + _user_agent;
    } else if(!_preserve_user_agent) {
      CStringA user_agent;
      user_agent.Format(" PTST/%d", _version);
      header += user_agent;
    }
  } else if (!tag.CompareNoCase("Host")) {
    CStringA new_headers;
    // Add new headers after the host header.
    POSITION pos = _add_headers.GetHeadPosition();
    while (pos) {
      HttpHeaderValue new_header = _add_headers.GetNext(pos);
      if (RegexMatch(value, new_header._filter)) {
        new_headers += CStringA("\r\n") + new_header._tag + CStringA(": ") + 
                        new_header._value;
      }
    }
    // Override existing headers (they are added here and the original
    // version is removed below when it is processed)
    pos = _set_headers.GetHeadPosition();
    while (pos) {
      HttpHeaderValue new_header = _set_headers.GetNext(pos);
      new_headers += CStringA("\r\n") + new_header._tag + CStringA(": ") + 
                      new_header._value;
      if (!new_header._tag.CompareNoCase("Host")) {
        header.Empty();
        new_headers.TrimLeft();
      }
    }
    // Override the Host header for specified hosts
    // The original value is added in a x-Host header.
    pos = _override_hosts.GetHeadPosition();
    while (pos) {
      HttpHeaderValue host_override = _override_hosts.GetNext(pos);
      if (!host_override._tag.CompareNoCase(value) ||
          !host_override._tag.Compare("*")) {
        header = CStringA("Host: ") + host_override._value;
        new_headers += CStringA("\r\nx-Host: ") + value;
      }
    }
    if (new_headers.GetLength()) {
      header += new_headers;
    } else {
      modified = false;
    }
  } else {
    modified = false;
    // Delete headers that were being overriden
    POSITION pos = _set_headers.GetHeadPosition();
    while (pos && !modified) {
      HttpHeaderValue new_header = _set_headers.GetNext(pos);
      if (!new_header._tag.CompareNoCase(tag)) {
        header.Empty();
        modified = true;
      }
    }
  }

  return modified;
}

/*-----------------------------------------------------------------------------
  See if the outbound request needs to be blocked
-----------------------------------------------------------------------------*/
bool WptTest::BlockRequest(CString host, CString object) {
  bool block = false;
  CString request = host + object;
  POSITION pos = _block_requests.GetHeadPosition();
  while (!block && pos) {
    CString block_pattern = _block_requests.GetNext(pos);
    if (request.Find(block_pattern) >= 0)
      block = true;
  }
  return block;
}

/*-----------------------------------------------------------------------------
  See if the specified condition is a match
-----------------------------------------------------------------------------*/
bool WptTest::ConditionMatches(ScriptCommand& command) {
  bool match = false;
  int cached = 1;
  if (_clear_cache) {
    cached = 0;
  }

  if (!command.target.CompareNoCase(_T("run"))) {
    if (_run == _ttoi(command.value)) {
      match = true;
    }
  } else if (!command.target.CompareNoCase(_T("cached"))) {
    if (cached == _ttoi(command.value)) {
      match = true;
    }
  }
  return match;
}
