#include "StdAfx.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
WptTest::WptTest(void){
  // figure out what our working diriectory is
  TCHAR path[MAX_PATH];
  if( SUCCEEDED(SHGetFolderPath(NULL, CSIDL_COMMON_APPDATA | CSIDL_FLAG_CREATE,
                                NULL, SHGFP_TYPE_CURRENT, path)) ) {
    PathAppend(path, _T("webpagetest"));
    CreateDirectory(path, NULL);
    _directory = path;
  }

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

  if (_directory.GetLength() )
    DeleteDirectory(_directory, false);
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

  buff.Format(",\"test_type\":\"%s\"", (LPCSTR)JSONEscape(_test_type));
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
  We are starting a new run, build up the script for the browser to execute
-----------------------------------------------------------------------------*/
bool WptTest::Start(BrowserSettings * browser){
  bool ret = false;

  if( !_test_type.CompareNoCase(_T("traceroute")) )
  {
    _file_base.Format(_T("%s\\%d"), (LPCTSTR)_directory, _run);
    ret = true;
  }    
  else {
    // build up a new script
    _script_commands.RemoveAll();
    
    if (_directory.GetLength() ) {
      // set up the base file name for results files for this run
      _file_base.Format(_T("%s\\%d"), (LPCTSTR)_directory, _run);
      if (!_clear_cache)
        _file_base += _T("_Cached");
      SetResultsFileBase(_file_base);

      // pass settings on to the hook dll
      SetForceDocComplete(_doc_complete);
    SetClearedCache(_clear_cache);
    if (browser) {
      SetBrowserFrame(browser->_frame_window);
      SetBrowserWindow(browser->_browser_window);
    }

      // just support URL navigating right now
      if (_url.GetLength()){
        ScriptCommand command;
        command.command = _T("navigate");
        command.target = _url;
        command.record = true;

        _script_commands.AddTail(command);

        ret = true;
      }
    }
  }

  return ret;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
bool WptTest::GetNextTask(CStringA& task, bool& record){
  bool ret = true;

  if( !_script_commands.IsEmpty() ){
    ScriptCommand command = _script_commands.RemoveHead();
    task = EncodeTask(command.command, command.target, command.value);
    record = command.record;
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
