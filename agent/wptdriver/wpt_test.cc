#include "StdAfx.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptTest::WptTest(void){
  Reset();
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptTest::~WptTest(void){
}

/*-----------------------------------------------------------------------------
  Reset everything to their default values
-----------------------------------------------------------------------------*/
void WptTest::Reset(void){
  _id.Empty();
  _url.Empty();
  _runs = 1;
  _fv_only = false;
  _doc_complete = false;
  _ignore_ssl = false;
  _tcpdump = false;
  _video = false;
  _aft = false;
  _type.Empty();
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
}

/*-----------------------------------------------------------------------------
  Parse the test settings from a string
-----------------------------------------------------------------------------*/
bool WptTest::Load(CString& test){
  bool ret = false;

  Reset();

  int linePos = 0;
  CString line = test.Tokenize(_T("\r\n"), linePos);
  while (linePos >= 0) {
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
          _type = value.Trim();
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
    } else if (line.Trim().CompareNoCase(_T("[Script]"))) {
      // grab the rest of the response as the script
      _script = test.Mid(linePos).Trim();
      linePos = test.GetLength();
    }

    line = test.Tokenize(_T("\r\n"), linePos);
  }

  if( _id.GetLength() )
    ret = true;

  return ret;
}

/*-----------------------------------------------------------------------------
  Create a JSON Encoding of the test data
-----------------------------------------------------------------------------*/
CStringA WptTest::ToJSON(){
  CStringA buff;
  CStringA json = "{";

  buff.Format("\"id\":\"%s\"", (LPCSTR)JSONEscape(_id));
  json += buff;

  buff.Format(",\"url\":\"%s\"", (LPCSTR)JSONEscape(_url));
  json += buff;

  buff.Format(",\"runs\":%d", _runs);
  json += buff;

  buff.Format(",\"fv_only\":%s", _fv_only ? "true" : "false");
  json += buff;

  buff.Format(",\"end_at_doc_complete\":%s", _doc_complete ? "true" : "false");
  json += buff;

  buff.Format(",\"ignore_ssl_errors\":%s", _ignore_ssl ? "true" : "false");
  json += buff;

  buff.Format(",\"tcpdump\":%s", _tcpdump ? "true" : "false");
  json += buff;

  buff.Format(",\"video\":%s", _video ? "true" : "false");
  json += buff;

  buff.Format(",\"aft\":%s", _aft ? "true" : "false");
  json += buff;

  buff.Format(",\"test_type\":\"%s\"", (LPCSTR)JSONEscape(_type));
  json += buff;

  buff.Format(",\"block\":\"%s\"", (LPCSTR)JSONEscape(_block));
  json += buff;

  buff.Format(",\"bw_in\":%d", _bwIn);
  json += buff;

  buff.Format(",\"bw_out\":%d", _bwOut);
  json += buff;

  buff.Format(",\"latency\":%d", _latency);
  json += buff;

  buff.Format(",\"plr\":%0.3f", _plr);
  json += buff;

  buff.Format(",\"browser\":\"%s\"", (LPCSTR)JSONEscape(_browser));
  json += buff;

  buff.Format(",\"basic_auth\":\"%s\"", (LPCSTR)JSONEscape(_basic_auth));
  json += buff;

  buff.Format(",\"script\":\"%s\"", (LPCSTR)JSONEscape(_script));
  json += buff;

  // current state
  buff.Format(",\"run\":%d", _run);
  json += buff;

  buff.Format(",\"clear_cache\":%s", _clear_cache ? "true" : "false");
  json += buff;

  json += _T("}");
  return json;
}

/*-----------------------------------------------------------------------------
  Escape the supplied string for JSON
-----------------------------------------------------------------------------*/
CStringA WptTest::JSONEscape(CString src)
{
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
bool WptTest::GetNextTask(CStringA& task, bool& record){
  bool ret = true;

  if( _url.GetLength() ){
    task = EncodeTask(_T("navigate"), _url, _T(""));
    _url.Empty();
    record = true;
  } else {
    ret = false;
  }

  return ret;
}

/*-----------------------------------------------------------------------------
  Create a JSON-encoded version of the task
-----------------------------------------------------------------------------*/
CStringA WptTest::EncodeTask(CString action, CString target, CString value){
  CStringA json = "{";
  CStringA buff;

  if (action.GetLength()){
    buff.Format("\"action\":\"%s\"", (LPCSTR)JSONEscape(action));
    json += buff;
  }

  if (target.GetLength()){
    buff.Format(",\"target\":\"%s\"", (LPCSTR)JSONEscape(target));
    json += buff;
  }

  if (value.GetLength()){
    buff.Format(",\"value\":\"%s\"", (LPCSTR)JSONEscape(value));
    json += buff;
  }

  json += _T("}");
  return json;
}
