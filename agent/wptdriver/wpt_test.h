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

class WptTest
{
public:
  WptTest(void);
  ~WptTest(void);

  void  Reset(void);
  bool  Load(CString& test);
  CStringA ToJSON();

  bool  Start();
  bool  GetNextTask(CStringA& task, bool& record);

  // overall test settings
  CString _id;
  CString _file_base;
  CString _url;
  int     _runs;
  bool    _fv_only;
  bool    _doc_complete;
  bool    _ignore_ssl;
  bool    _tcpdump;
  bool    _video;
  bool    _aft;
  CString _type;
  CString _block;
  DWORD   _bwIn;
  DWORD   _bwOut;
  DWORD   _latency;
  double  _plr;
  CString _browser;
  CString _basic_auth;
  CString _script;

  // current state
  int     _run;
  bool    _clear_cache;

private:
  CStringA JSONEscape(CString src);
  CStringA EncodeTask(CString action, CString target, CString value);

  CAtlList<ScriptCommand> _script_commands;
};

