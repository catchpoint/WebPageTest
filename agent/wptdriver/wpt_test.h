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

class WptTest {
public:
  WptTest(void);
  virtual ~WptTest(void);

  void  Reset(void);
  virtual bool  Load(CString& test);
  CStringA ToJSON();

  bool  GetNextTask(CStringA& task, bool& record);

  // overall test settings
  CString _id;
  CString _file_base;
  CString _directory;
  CString _url;
  int     _runs;
  bool    _fv_only;
  bool    _doc_complete;
  bool    _ignore_ssl;
  bool    _tcpdump;
  bool    _video;
  bool    _aft;
  CString _test_type;
  CString _block;
  DWORD   _bwIn;
  DWORD   _bwOut;
  DWORD   _latency;
  double  _plr;
  CString _browser;
  CString _basic_auth;
  CString _script;
  CString _test_file;
  
  // current state
  int     _run;
  bool    _clear_cache;

protected:
  CStringA JSONEscape(CString src);
  CStringA EncodeTask(CString action, CString target, CString value);

  CAtlList<ScriptCommand> _script_commands;
};

