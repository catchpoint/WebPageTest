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

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptTest::WptTest(void) {
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
  _video = false;
  _aft = false;
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
  _log_data = true;
}

/*-----------------------------------------------------------------------------
  Parse the test settings from a string
-----------------------------------------------------------------------------*/
bool WptTest::Load(CString& test) {
  bool ret = false;

  ATLTRACE(_T("WptTest::Load()\n"));

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
        else if (!key.CompareNoCase(_T("Capture Video")) && _ttoi(value.Trim()))
          _video = true;
        else if (!key.CompareNoCase(_T("aft")) && _ttoi(value.Trim()))
          _aft = true;
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
      }
    } else if (!line.Trim().CompareNoCase(_T("[Script]"))) {
      // grab the rest of the response as the script
      _script = test.Mid(linePos).Trim();
      done = true;
    }

    line = test.Tokenize(_T("\r\n"), linePos);
  }

  ATLTRACE(_T("WptTest::Load() - Loaded test %s\n"), (LPCTSTR)_id);

  if( _id.GetLength() )
    ret = true;

  return ret;
}

/*-----------------------------------------------------------------------------
  Escape the supplied string for JSON
-----------------------------------------------------------------------------*/
CStringA WptTest::JSONEscape(CString src) {
  CStringA dest = CT2A(src);
  dest.Replace("\\", "\\\\");
  dest.Replace("\"", "\\\"");
  dest.Replace("'", "\\'");
  dest.Replace("/", "\\/");
  dest.Replace("\b", "\\b");
  dest.Replace("\r", "\\r");
  dest.Replace("\n", "\\n");
  dest.Replace("\t", "\\t");
  dest.Replace("\v", "\\v");
  dest.Replace("\f", "\\f");
  return dest;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptTest::GetNextTask(CStringA& task, bool& record) {
  bool ret = false;

  ATLTRACE(_T("[wpthook] - WptTest::GetNextTask\n"));

  if (!_active){
    while (!ret && !_script_commands.IsEmpty()) {
      ScriptCommand command = _script_commands.RemoveHead();
      if (!ProcessCommand(command)) {
        FixURL(command);
        task = EncodeTask(command);
        record = command.record;
        if (record)
          _active = true;
        ret = true;
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
    buff.Format("\"action\":\"%s\"", (LPCSTR)JSONEscape(command.command));
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
  ATLTRACE(_T("[wpthook] - WptTest::Done()\n"));
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
            script_command.command = command;
            script_command.record = NavigationCommand(command);
            script_command.target = line.Tokenize(_T("\t"),command_pos).Trim();
            if (command_pos > 0 && script_command.target.GetLength()) {
              script_command.value =line.Tokenize(_T("\t"),command_pos).Trim();
            }

            ATLTRACE(_T("Script command: %s,%s,%s\n"), 
                      (LPCTSTR)script_command.command,
                      (LPCTSTR)script_command.target,
                      (LPCTSTR)script_command.value);

            if (script_command.record)
              has_measurement = true;

            _script_commands.AddTail(script_command);
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
}

/*-----------------------------------------------------------------------------
  See if the supplied command is one that initiates a measurement
  (even if that measurement needs to be ignored)
-----------------------------------------------------------------------------*/
bool WptTest::NavigationCommand(CString command) {
  bool ret = false;
  command.MakeLower();

  if (command == _T("navigate") ||
      command == _T("startmeasurement") ||
      command == _T("waitforcomplete") ||
      command == _T("submitform") ||
      command.Find(_T("andwait")) > 0)
    ret = true;

  return ret;
}

/*-----------------------------------------------------------------------------
  Make sure the URL has a protocol for navigation commands
-----------------------------------------------------------------------------*/
void  WptTest::FixURL(ScriptCommand& command) {
  if (!command.command.CompareNoCase(_T("navigate")) && 
      command.target.GetLength()) {
    if (command.target.Left(4) != _T("http"))
      command.target = CString(_T("http://")) + command.target;
  }
}

/*-----------------------------------------------------------------------------
  Process the commands that we know about and that can be processed outside of
  the browser (setting state, etc)
-----------------------------------------------------------------------------*/
bool WptTest::ProcessCommand(ScriptCommand& command) {
  bool processed = false;
  CString cmd = command.command;
  cmd.MakeLower();

  if (cmd == _T("logdata")) {
    if (_ttoi(command.target))
      _log_data = true;
    else
      _log_data = false;
    processed = true;
  }

  return processed;
}
