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

static const BYTE JPEG_DEFAULT_QUALITY = 30;
static const DWORD MS_IN_SEC = 1000;
static const DWORD BROWSER_WIDTH = 1024;
static const DWORD BROWSER_HEIGHT = 768;

// Mobile emulation defaults (taken from a Nexus 5).
static const TCHAR * DEFAULT_MOBILE_SCALE_FACTOR = _T("3");
static const DWORD DEFAULT_MOBILE_WIDTH = 360;
static const DWORD DEFAULT_MOBILE_HEIGHT = 511;
static const DWORD CHROME_PADDING_HEIGHT = 108;
static const DWORD CHROME_PADDING_WIDTH = 6;
static const char * DEFAULT_MOBILE_USER_AGENT =
    "Mozilla/5.0 (Linux; Android 5.0; Nexus 5 Build/LRX21O) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/46.0.2490.76 Mobile Safari/537.36";

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptTest::WptTest(void):
  _version(0)
  ,_test_timeout(DEFAULT_TEST_TIMEOUT * SECONDS_TO_MS)
  ,_activity_timeout(DEFAULT_ACTIVITY_TIMEOUT)
  ,_measurement_timeout(DEFAULT_TEST_TIMEOUT)
  ,has_gpu_(false)
  ,lock_count_(0),
  _script_timeout_multiplier(2) {
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
  InitializeCriticalSection(&cs_);
  _tcp_port_override.InitHashTable(257);

  Reset();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptTest::~WptTest(void) {
  DeleteCriticalSection(&cs_);
}

/*-----------------------------------------------------------------------------
  Reset everything to their default values
-----------------------------------------------------------------------------*/
void WptTest::Reset(void) {
  _id.Empty();
  _url.Empty();
  _runs = 1;
  _discard = 0;
  _fv_only = false;
  _doc_complete = false;
  _ignore_ssl = false;
  _tcpdump = false;
  _timeline = false;
  _timelineStackDepth = 0;
  _trace = false;
  _netlog = false;
  _video = false;
  _spdy3 = false;
  _noscript = false;
  _clear_certs = false;
  _emulate_mobile = false;
  _force_software_render = false;
  _test_type.Empty();
  _block.Empty();
  _bwIn = 0;
  _bwOut = 0;
  _latency = 0;
  _plr = 0.0;
  _browser.Empty();
  _browser_url.Empty();
  _browser_md5.Empty();
  _basic_auth.Empty();
  _script.Empty();
  _run = 0;
  _specific_run = 0;
  _specific_index = 0;
  _discard_test = false;
  _index = 0;
  _clear_cache = true;
  _active = false;
  _dom_element_check = false;
  _log_data = true;
  _sleep_end.QuadPart = 0;
  _combine_steps = 0;
  _image_quality = JPEG_DEFAULT_QUALITY;
  _png_screen_shot = false;
  _full_size_video = false;
  _minimum_duration = 0;
  _user_agent.Empty();
  _add_headers.RemoveAll();
  _set_headers.RemoveAll();
  _override_hosts.RemoveAll();
  _dns_override.RemoveAll();
  _dns_name_override.RemoveAll();
  _block_requests.RemoveAll();
  _save_response_bodies = false;
  _save_html_body = false;
  _preserve_user_agent = false;
  _check_responsive = false;
  _browser_width = BROWSER_WIDTH;
  _browser_height = BROWSER_HEIGHT;
  _viewport_width = 0;
  _viewport_height = 0;
  _no_run = 0;
  _custom_rules.RemoveAll();
  _client.Empty();
  _continuous_video = false;
  _browser_command_line.Empty();
  _browser_additional_command_line.Empty();
  _run_error.Empty();
  _test_error.Empty();
  _custom_metrics.Empty();
  _has_test_timed_out = false;
  _user_agent_modifier = "PTST";
  _append_user_agent.Empty();
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
        if (!key.CompareNoCase(_T("Test ID"))) {
          _id = value.Trim();
        } else if (!key.CompareNoCase(_T("url"))) {
          _url = value.Trim();
        } else if (!key.CompareNoCase(_T("fvonly")) && _ttoi(value.Trim())) {
          _fv_only = true;
        } else if (!key.CompareNoCase(_T("run"))) {
          _specific_run = _ttoi(value.Trim());
        } else if (!key.CompareNoCase(_T("index"))) {
          _specific_index = _ttoi(value.Trim());
        } else if (!key.CompareNoCase(_T("discardTest")) && _ttoi(value.Trim())) {
          _discard_test = true;
        } else if (!key.CompareNoCase(_T("runs"))) {
          _runs = _ttoi(value.Trim());
        } else if (!key.CompareNoCase(_T("discard")) && !_specific_run) {
          _discard = _ttoi(value.Trim());
        } else if (!key.CompareNoCase(_T("web10")) && _ttoi(value.Trim())) {
          _doc_complete = true;
        } else if (!key.CompareNoCase(_T("ignoreSSL")) && _ttoi(value.Trim())) {
          _ignore_ssl = true;
        } else if (!key.CompareNoCase(_T("tcpdump")) && _ttoi(value.Trim())) {
          _tcpdump = true;
        } else if (!key.CompareNoCase(_T("timeline")) && _ttoi(value.Trim())) {
          _timeline = true;
        } else if (!key.CompareNoCase(_T("timelineStackDepth"))) {
          _timelineStackDepth = _ttoi(value.Trim());
        } else if (!key.CompareNoCase(_T("trace")) && _ttoi(value.Trim())) {
          _trace = true;
        } else if (!key.CompareNoCase(_T("traceCategories")) && value.GetLength()) {
          _traceCategories = value;
        } else if (!key.CompareNoCase(_T("netlog")) && _ttoi(value.Trim())) {
          _netlog = true;
        } else if (!key.CompareNoCase(_T("spdy3")) && _ttoi(value.Trim())) {
          _spdy3 = true;
        } else if (!key.CompareNoCase(_T("noscript")) && _ttoi(value.Trim())) {
          _noscript = true;
        } else if (!key.CompareNoCase(_T("Capture Video")) &&_ttoi(value.Trim())) {
          _video = true;
        } else if (!key.CompareNoCase(_T("clearcerts")) &&_ttoi(value.Trim())) {
          _clear_certs = true;
        } else if (!key.CompareNoCase(_T("mobile")) &&_ttoi(value.Trim())) {
          _emulate_mobile = true;
        } else if (!key.CompareNoCase(_T("swRender")) &&_ttoi(value.Trim())) {
          _force_software_render = true;
        } else if (!key.CompareNoCase(_T("type"))) {
          _test_type = value.Trim();
        } else if (!key.CompareNoCase(_T("block"))) {
          _block = value.Trim();
        } else if (!key.CompareNoCase(_T("bwIn"))) {
          _bwIn = _ttoi(value.Trim());
        } else if (!key.CompareNoCase(_T("bwOut"))) {
          _bwOut = _ttoi(value.Trim());
        } else if (!key.CompareNoCase(_T("latency"))) {
          _latency = _ttoi(value.Trim());
        } else if (!key.CompareNoCase(_T("plr"))) {
          _plr = _ttof(value.Trim());
        } else if (!key.CompareNoCase(_T("browser"))) {
          _browser = value.Trim();
        } else if (!key.CompareNoCase(_T("customBrowserUrl"))) {
          _browser_url = value.Trim();
        } else if (!key.CompareNoCase(_T("customBrowserMD5"))) {
          _browser_md5 = value.Trim();
        } else if (!key.CompareNoCase(_T("Basic Auth"))) {
          _basic_auth = value.Trim();
        } else if (!key.CompareNoCase(_T("imageQuality"))) {
          _image_quality = (BYTE)max(_image_quality, 
                                     min(100, _ttoi(value.Trim())));
        } else if (!key.CompareNoCase(_T("pngScreenShot")) &&_ttoi(value.Trim())) {
          _png_screen_shot = true;
        } else if (!key.CompareNoCase(_T("fullSizeVideo")) &&_ttoi(value.Trim())) {
          _full_size_video = true;
        } else if (!key.CompareNoCase(_T("time"))) {
          _minimum_duration = MS_IN_SEC * max(_minimum_duration, 
                               min(DEFAULT_TEST_TIMEOUT, _ttoi(value.Trim())));
        } else if (!key.CompareNoCase(_T("bodies")) && _ttoi(value.Trim())) {
          _save_response_bodies = true;
        } else if (!key.CompareNoCase(_T("htmlbody")) && _ttoi(value.Trim())) {
          _save_html_body = true;
        } else if (!key.CompareNoCase(_T("keepua")) && _ttoi(value.Trim())) {
          _preserve_user_agent = true;
        } else if (!key.CompareNoCase(_T("responsive")) && _ttoi(value.Trim())) {
          _check_responsive = true;
        } else if (!key.CompareNoCase(_T("client"))) {
          _client = value.Trim();
        } else if (!key.CompareNoCase(_T("customRule"))) {
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
        } else if (!key.CompareNoCase(_T("customMetric"))) {
          if (!_custom_metrics.IsEmpty())
            _custom_metrics += _T("\n");
          _custom_metrics += value;
        } else if (!key.CompareNoCase(_T("cmdLine"))) {
          _browser_command_line = value;
        } else if (!key.CompareNoCase(_T("addCmdLine"))) {
          _browser_additional_command_line = value;
        } else if (!key.CompareNoCase(_T("continuousVideo")) &&
                   _ttoi(value.Trim())) {
          _continuous_video = true;
        } else if (!key.CompareNoCase(_T("timeout"))) {
          _test_timeout = _ttoi(value.Trim()) * 1000;
          _script_timeout_multiplier = 1;
          if (_test_timeout < 0)
            _test_timeout = 0;
          else if (_test_timeout > 3600000)
            _test_timeout = 3600000;
        } else if (!key.CompareNoCase(_T("maxTestTime"))) {
          _max_test_time = min(max(_ttoi(value.Trim()), 0), 3600) * 1000;
        } else if (!key.CompareNoCase(_T("UAModifier"))) {
          _user_agent_modifier = value;
        } else if (!key.CompareNoCase(_T("UAString"))) {
          _user_agent = value.Trim();
        } else if (!key.CompareNoCase(_T("AppendUA"))) {
          _append_user_agent = value.Trim();
        } else if (!key.CompareNoCase(_T("dpr")) && _ttoi(value.Trim())) {
          _device_scale_factor = value.Trim();
        } else if (!key.CompareNoCase(_T("width")) && _ttoi(value.Trim())) {
          _viewport_width = _ttoi(value.Trim());
        } else if (!key.CompareNoCase(_T("height")) && _ttoi(value.Trim())) {
          _viewport_height = _ttoi(value.Trim());
        }
      }
    } else if (!line.Trim().CompareNoCase(_T("[Script]"))) {
      // grab the rest of the response as the script
      _script = test.Mid(linePos).Trim();
      done = true;
    }

    line = test.Tokenize(_T("\r\n"), linePos);
  }

  if (_measurement_timeout < _test_timeout)
    _measurement_timeout = _test_timeout;

  if (_specific_run) {
    _discard = 0;
  }

  if (_script.GetLength())
    _test_timeout *= _script_timeout_multiplier;

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

  EnterCriticalSection(&cs_);
  WptTrace(loglevel::kFunction, _T("[wpthook] - WptTest::GetNextTask\n"));
  if (!_active && !IsLocked()){
    Lock();
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
    Unlock();
  }
  LeaveCriticalSection(&cs_);

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
  if (_script_commands.IsEmpty() || _has_test_timed_out)
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
            if (!_no_run && command_pos > 0 && 
                script_command.target.GetLength()) {
              if (script_command.command == _T("block")) {
                ParseBlockCommand(script_command.target, false);
              }
              else {
                script_command.value =
                                  line.Tokenize(_T("\t"),command_pos).Trim();
              }
            }

            // Don't process the block commands again
            if (script_command.command != _T("block")) {
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

  if (_block.GetLength() ) {
    ParseBlockCommand(_block, true);
  }

  if (_timeline) {
    ScriptCommand command;
    command.command = _T("captureTimeline");
    command.target.Format(_T("%d"), _timelineStackDepth);
    command.record = false;
    _script_commands.AddHead(command);
  }

  if (_trace) {
    ScriptCommand command;
    command.command = _T("captureTrace");
    command.target = _traceCategories;
    command.record = false;
    _script_commands.AddHead(command);
  }

  if (_noscript) {
    ScriptCommand command;
    command.command = _T("noscript");
    command.record = false;
    _script_commands.AddHead(command);
  }

  CStringA append = GetAppendUA();
  if(!append.IsEmpty()) {
    ScriptCommand command;
    command.command = _T("appendUserAgent");
    command.target = append;
    command.record = false;
    _script_commands.AddHead(command);
  }

  if (_emulate_mobile) {
    if (_device_scale_factor.IsEmpty())
      _device_scale_factor = DEFAULT_MOBILE_SCALE_FACTOR;
    if (!_viewport_width && !_viewport_height) {
      _viewport_width = DEFAULT_MOBILE_WIDTH;
      _viewport_height = DEFAULT_MOBILE_HEIGHT;
    }
    _browser_width = _viewport_width + CHROME_PADDING_WIDTH;
    _browser_height = _viewport_height + CHROME_PADDING_HEIGHT;
    if (_user_agent.IsEmpty())
      _user_agent = DEFAULT_MOBILE_USER_AGENT;
    ScriptCommand command;
    command.command = _T("emulatemobile");
    command.target.Format(
        _T("{\"width\":%d,\"height\":%d,\"deviceScaleFactor\":%s,\"mobile\":true,\"fitWindow\":true}"),
          _viewport_width, _viewport_height, _device_scale_factor);
    command.record = false;
    _script_commands.AddHead(command);
    _viewport_width = 0;
    _viewport_height = 0;
  }

  if (!_user_agent.IsEmpty() &&
      !_preserve_user_agent &&
      _user_agent.Find(" " + _user_agent_modifier + "/") == -1) {
    _user_agent += " " + GetAppendUA();
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
  } else if (cmd == _T("navigate")) {
    _navigated_url = command.target;
    continue_processing = false;
    consumed = false;
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
  } else if (cmd == _T("setactivitytimeout")) {
    _activity_timeout = __min(__max(_ttoi(command.target), 0), 30000);
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
    continue_processing = false;
    consumed = false;
  } else if (cmd == _T("setheader")) {
    int pos = command.target.Find(_T(':'));
    if (pos > 0) {
      CStringA tag = CT2A(command.target.Left(pos).Trim());
      CStringA value = CT2A(command.target.Mid(pos + 1).Trim());
      CStringA filter = CT2A(command.value.Trim());
      bool repeat = false;
      if (!_set_headers.IsEmpty()) {
        POSITION pos = _set_headers.GetHeadPosition();
        while (pos && !repeat) {
          HttpHeaderValue &header = _set_headers.GetNext(pos);
          if (!header._tag.CompareNoCase(tag) &&
              header._filter == filter) {
            repeat = true;
            header._value = value;
          }
        }
      }
      if (!repeat) {
        HttpHeaderValue header(tag, value, filter);
        _set_headers.AddTail(header);
      }
    }
    continue_processing = false;
    consumed = false;
  } else if (cmd == _T("resetheaders")) {
    _add_headers.RemoveAll();
    _set_headers.RemoveAll();
    continue_processing = false;
    consumed = false;
  } else if (cmd == _T("overridehost")) {
    CStringA host = CT2A(command.target.Trim());
    CStringA new_host = CT2A(command.value.Trim());
    if (host.GetLength() && new_host.GetLength()) {
      POSITION pos = _override_hosts.GetHeadPosition();
      bool duplicate = false;
      while (pos && !duplicate) {
        HttpHeaderValue &existing = _override_hosts.GetNext(pos);
        if (!existing._tag.CompareNoCase(host)) {
          duplicate = true;
        }
      }
      if (!duplicate) {
        HttpHeaderValue host_override(host, new_host, "");
        _override_hosts.AddTail(host_override);
      }
    }
    // pass the host override command on to the browser extension as well
    // (needed for SSL override on Chrome)
    // include a bail-out if we have more than 3 hosts in the list
    // because we were causing aborts to Chrome's navigations with long lists
    if (_override_hosts.GetCount() <= 3) {
      continue_processing = false;
      consumed = false;
    }
  } else if (cmd == _T("block")) {
    _block_requests.AddTail(command.target);
    continue_processing = false;
    consumed = false;
  } else if (cmd == _T("setdomelement")) {
    if (command.target.Trim().GetLength()) {
      _dom_element_check = true;
      WptTrace(loglevel::kFrequentEvent, 
        _T("[wpthook] - WptTest::BuildScript() Setting dom element check."));
    }
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
  } else if(cmd == _T("reportdata")) {
    ReportData();
    continue_processing = false;
    consumed = false;
  } else if (cmd == _T("seteventname")) {
    _current_event_name = CT2A(command.target.Trim());
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
    } else if (cmd == _T("setport")) {
      USHORT original = (USHORT)_ttoi(command.target);
      USHORT replacement = (USHORT)_ttoi(command.value);
      if (original && replacement)
        _tcp_port_override.SetAt(original, replacement);
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
    } else if (cmd == _T("setdevicescalefactor")) {
      _device_scale_factor = _T("");
      for (int i = 0; i < command.target.GetLength(); i++) {
        TCHAR ch = command.target.GetAt(i);
        if (ch == _T('0') || ch == _T('1') || ch == _T('2') || ch == _T('3') ||
            ch == _T('4') || ch == _T('5') || ch == _T('6') || ch == _T('7') ||
            ch == _T('8') || ch == _T('9') || ch == _T('.'))
          _device_scale_factor += ch;
        else
          break;
      }
      if (!_device_scale_factor.GetLength())
        _device_scale_factor.Empty();
    } else if (cmd == _T("setuseragent")) {
      _user_agent = CT2A(command.target.Trim());
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
  See if we need to override the Port
-----------------------------------------------------------------------------*/
void WptTest::OverridePort(const struct sockaddr FAR * name, int namelen) {
  if (!_tcp_port_override.IsEmpty() &&
      name &&
      namelen >= sizeof(struct sockaddr_in) &&
      name->sa_family == AF_INET) {
    struct sockaddr_in* ip_name = (struct sockaddr_in *)name;
    USHORT current_port = htons(ip_name->sin_port);
    USHORT new_port = 0;
    if (_tcp_port_override.Lookup(current_port, new_port) && new_port) {
      new_port = htons(new_port);
      ip_name->sin_port = new_port;
    }
  }
}

/*-----------------------------------------------------------------------------
  Get the run-specific UA string that needs to be added the UA string
-----------------------------------------------------------------------------*/
CStringA WptTest::GetAppendUA() const {
  CStringA user_agent;

  // Add the default PTST/version part
  if (!_preserve_user_agent)
    user_agent.Format("%s/%d", _user_agent_modifier, _version);

  // See if they requested anything additional
  if (!_append_user_agent.IsEmpty()) {
    CStringA buff;
    CStringA append = _append_user_agent;
    append.Replace("%TESTID%", CT2A(_id));
    buff.Format("%d", _run);
    append.Replace("%RUN%", buff);
    append.Replace("%CACHED%", _clear_cache ? "0" : "1");
    buff.Format("%d", _version);
    append.Replace("%VERSION%", buff);
    user_agent += " " + append;
  }

  return user_agent;
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
    } else if(!_preserve_user_agent && value.Find(" " + _user_agent_modifier + "/") == -1) {
      header += " " + GetAppendUA();
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
      if (RegexMatch(value, new_header._filter)) {
        new_headers += CStringA("\r\n") + new_header._tag + CStringA(": ") + 
                        new_header._value;
        if (!new_header._tag.CompareNoCase("Host")) {
          header.Empty();
          new_headers.TrimLeft();
        }
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
        break;
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
  EnterCriticalSection(&cs_);
  CString request = host + object;
  POSITION pos = _block_requests.GetHeadPosition();
  while (!block && pos) {
    CString block_pattern = _block_requests.GetNext(pos);
    if (request.Find(block_pattern) >= 0)
      block = true;
  }
  LeaveCriticalSection(&cs_);
  return block;
}

/*-----------------------------------------------------------------------------
  See if the host for the outbound request needs to be modified
-----------------------------------------------------------------------------*/
bool WptTest::OverrideHost(CString host, CString &new_host) {
  bool override_host = false;
  if (host.GetLength()) {
    EnterCriticalSection(&cs_);
    POSITION pos = _override_hosts.GetHeadPosition();
    while (pos) {
      HttpHeaderValue host_override = _override_hosts.GetNext(pos);
      if (!host_override._tag.CompareNoCase(CT2A(host)) ||
          !host_override._tag.Compare("*")) {
        new_host = CA2T(host_override._value, CP_UTF8);
        override_host = true;
        break;
      }
    }
    LeaveCriticalSection(&cs_);
  }
  return override_host;
}

/*-----------------------------------------------------------------------------
  See if the host for the outbound request needs to be modified
-----------------------------------------------------------------------------*/
bool WptTest::GetHeadersToSet(CString host, CAtlList<CString> &headers) {
  if (!headers.IsEmpty())
    headers.RemoveAll();
  if (host.GetLength()) {
    EnterCriticalSection(&cs_);
    POSITION pos = _set_headers.GetHeadPosition();
    while (pos) {
      HttpHeaderValue new_header = _set_headers.GetNext(pos);
      if (RegexMatch((LPCSTR)CT2A(host), new_header._filter)) {
        CString header = new_header._tag + CStringA(": ") + new_header._value;
        headers.AddTail(header);
      }
    }
    LeaveCriticalSection(&cs_);
  }
  return !headers.IsEmpty();
}

/*-----------------------------------------------------------------------------
  See if the host for the outbound request needs to be modified
-----------------------------------------------------------------------------*/
bool WptTest::GetHeadersToAdd(CString host, CAtlList<CString> &headers) {
  if (!headers.IsEmpty())
    headers.RemoveAll();
  if (host.GetLength()) {
    EnterCriticalSection(&cs_);
    POSITION pos = _add_headers.GetHeadPosition();
    while (pos) {
      HttpHeaderValue new_header = _add_headers.GetNext(pos);
      if (RegexMatch((LPCSTR)CT2A(host), new_header._filter)) {
        CString header = new_header._tag + CStringA(": ") + new_header._value;
        headers.AddTail(header);
      }
    }
    LeaveCriticalSection(&cs_);
  }
  return !headers.IsEmpty();
}

/*-----------------------------------------------------------------------------
  See if the specified condition is a match
-----------------------------------------------------------------------------*/
bool WptTest::ConditionMatches(ScriptCommand& command) {
  bool match = false;
  int cached = 1;
  if (_clear_cache)
    cached = 0;

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

/*-----------------------------------------------------------------------------
  Parse the list of block strings into individual commands
-----------------------------------------------------------------------------*/
void WptTest::ParseBlockCommand(CString block_list, bool add_head) {
  int pattern_pos = 0;
  while (pattern_pos < block_list.GetLength()) {
    CString pattern = block_list.Tokenize(_T(" "), pattern_pos).Trim();
    if (pattern.GetLength()) {
      // For each pattern, add a new script command.
      ScriptCommand block_script_command;
      block_script_command.command = _T("block");
      block_script_command.target = pattern;
      if (add_head) {
        _script_commands.AddHead(block_script_command);
      } else {
        _script_commands.AddTail(block_script_command);
      }
    }
  }
}

/*-----------------------------------------------------------------------------
  The test is finished, insert the 2 dummy commands into the top of the
  script to collect data (these are added to the head so they are in reverse
  order from how they execute)
-----------------------------------------------------------------------------*/
void  WptTest::CollectData() {
  ScriptCommand cmd;

  // Add the command that lets us know we have collected all of the data and it
  // is time to report back
  cmd.command = _T("reportdata");
  _script_commands.AddHead(cmd);

  // If we are at the end of the script, run the responsive site check
  if (_check_responsive && _script_commands.GetCount() == 1) {
    cmd.command = _T("checkresponsive");
    _script_commands.AddHead(cmd);

    cmd.command = _T("resizeresponsive");
    _script_commands.AddHead(cmd);
  }

  // Add the command to trigger the browser to collect in-page stats
  // (before doing a responsive check where we resize the window)
  cmd.command = _T("collectstats");
  cmd.target = _custom_metrics;
  _script_commands.AddHead(cmd);
}

/*-----------------------------------------------------------------------------
  Overridden in the hook-version to actually report the test data
-----------------------------------------------------------------------------*/
void WptTest::ReportData() {
}

/*-----------------------------------------------------------------------------
  Remove any of our fake data collection commands if they are at the head of
  the script command queue;
-----------------------------------------------------------------------------*/
void WptTest::CollectDataDone() {
  bool removed = false;
  _current_event_name.Empty();
  do {
    removed = false;
    if (!_script_commands.IsEmpty()) {
      ScriptCommand &cmd = _script_commands.GetHead();
      if (cmd.command == _T("reportdata") ||
          cmd.command == _T("collectstats")) {
        _script_commands.RemoveHead();
        removed = true;
      }
    }
  } while(removed);
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptTest::Lock() {
  lock_count_++;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void WptTest::Unlock() {
  lock_count_--;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptTest::IsLocked() {
  return lock_count_ != 0;
}
