#pragma once
class WptTest
{
public:
  WptTest(void);
  ~WptTest(void);

  void  Reset(void);
  bool  Load(CString& test);

  CString _id;
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
};

